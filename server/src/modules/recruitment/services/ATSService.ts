import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { ResumeParserService } from './ResumeParserService';
import { GeminiATSService } from './GeminiATSService';

export interface ATSMatchResult {
  resumeBankId: number;
  candidateId: number | null;
  candidateName: string;
  email: string;
  phone: string | null;
  position: string;
  jobTitle: string;
  atsScore: number;
  skillScore: number;
  expScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  totalJdSkillsCount: number;
  matchedCount: number;
  yearsOfExperience: number;
  recommendation: 'Strong Match' | 'Good Match' | 'Fair Match' | 'Weak Match';
  source: string;
  resumeUrl: string | null;
  createdAt: string;
}

export class ATSService {
  private parserService: ResumeParserService;
  private geminiService: GeminiATSService;

  constructor() {
    this.parserService = new ResumeParserService();
    this.geminiService = new GeminiATSService();
  }

  /**
   * Run ATS scoring algorithm for a job opening & optional manual skills list with min match % threshold
   */
  async scoreResumesForJob(
    ctx: TenantContext,
    jobId: number,
    options: {
      manualSkills?: string[];
      topN?: number;
      sourceFilter?: string;
      minMatchPct?: number;
      useAI?: boolean;
    } = {}
  ): Promise<{ results: ATSMatchResult[]; totalScanned: number; jobDetails: any }> {
    const db = getKnex();

    // 1. Fetch Job opening details
    // NOTE: Knex postProcessResponse converts snake_case → camelCase for ALL query results
    const job = await db('jobs')
      .whereRaw('id = ? AND organization_id = ?', [jobId, ctx.organizationId])
      .first();

    if (!job) {
      throw new Error('Selected job opening not found');
    }

    // 2. Extract JD required skills STRICTLY from selected Job Opening (skills_required column + JD text bullet points)
    const rawJdSkills: string[] = [];

    // Parse skills directly from JD HTML sections (e.g. <h2>Required Skills</h2>, <h2>Preferred Skills</h2>)
    const jobDesc = job.jobDescription || job.job_description || '';
    if (jobDesc) {
      const htmlText = jobDesc;
      const cleanText = htmlText
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n###HEADER: $1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ');

      const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
      let inSkillSection = false;

      for (const line of lines) {
        if (line.startsWith('###HEADER:')) {
          const headerText = line.replace('###HEADER:', '').toLowerCase();
          if (headerText.includes('skill') || headerText.includes('requirement') || headerText.includes('qualif')) {
            inSkillSection = true;
          } else {
            inSkillSection = false;
          }
          continue;
        }

        if (inSkillSection) {
          const cleanLine = line.replace(/^-/, '').trim();
          const tokens = cleanLine.split(/[,;\/&]+/);
          for (let tok of tokens) {
            tok = tok.replace(/^(Strong knowledge of|Experience with|Understanding of|Knowledge of|Familiarity with|Basic understanding of)\s+/i, '').trim();
            tok = tok.replace(/\.$/, '').trim();
            
            const words = tok.split(/\s+/);
            if (words.length <= 3 && tok.length >= 2 && tok.length <= 25 && !tok.toLowerCase().includes('salary') && !tok.toLowerCase().includes('field') && !tok.toLowerCase().includes('plus') && !tok.toLowerCase().includes('degree')) {
              rawJdSkills.push(tok);
            }
          }
        }
      }

      // Also extract tech dictionary words found specifically inside the JD HTML text
      const techDict = [
        'php', 'laravel', 'codeigniter', 'symfony', 'wordpress',
        'python', 'django', 'flask', 'fastapi',
        'java', 'spring boot', 'hibernate',
        'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js',
        'mysql', 'postgresql', 'mongodb', 'oracle', 'sqlite', 'sql',
        'html', 'css', 'bootstrap', 'tailwind',
        'rest apis', 'rest api', 'git', 'github', 'docker', 'aws', 'linux'
      ];
      
      const plainLower = cleanText.toLowerCase();
      for (const kw of techDict) {
        if (plainLower.includes(kw)) {
          rawJdSkills.push(kw);
        }
      }
    }

    // Add extra manual skills typed by HR (supports string or array)
    if (options.manualSkills) {
      let manualList: string[] = [];
      if (Array.isArray(options.manualSkills)) {
        manualList = options.manualSkills;
      } else if (typeof options.manualSkills === 'string') {
        manualList = options.manualSkills.split(/[,;\n]+/);
      }
      for (const s of manualList) {
        const clean = String(s).trim();
        if (clean.length > 0) {
          rawJdSkills.push(clean);
        }
      }
    }

    // D. Extract core skill from Job Title if rawJdSkills is still sparse
    const jobTitle = job.jobTitle || job.job_title || '';
    if (rawJdSkills.length === 0 && jobTitle) {
      const titleTokens = jobTitle.split(/[\s\/-]+/);
      for (const tok of titleTokens) {
        const cleanTok = tok.trim();
        if (cleanTok.length >= 2 && !['and', 'for', 'the', 'with', 'sr', 'jr', 'lead', 'developer', 'engineer', 'copy'].includes(cleanTok.toLowerCase())) {
          rawJdSkills.push(cleanTok);
        }
      }
    }

    // Deduplicate & normalize target JD skills
    let targetSkills = Array.from(
      new Set(rawJdSkills.map(s => String(s).trim().toLowerCase()).filter(s => s.length > 1))
    );

    // Fallback: If selected job has no skills extracted from JD, infer based on job title
    if (targetSkills.length === 0) {
      const titleLower = (jobTitle).toLowerCase();
      if (titleLower.includes('php') || titleLower.includes('web')) {
        targetSkills = ['php', 'mysql', 'html', 'css', 'javascript', 'bootstrap', 'rest api', 'git', 'laravel'];
      } else if (titleLower.includes('python') || titleLower.includes('django')) {
        targetSkills = ['python', 'django', 'postgresql', 'rest api', 'git', 'fastapi', 'html', 'css'];
      } else if (titleLower.includes('java') || titleLower.includes('software')) {
        targetSkills = ['java', 'spring boot', 'mysql', 'git', 'rest api', 'sql', 'html', 'css'];
      } else {
        targetSkills = ['javascript', 'html', 'css', 'git', 'sql', 'rest api'];
      }
    }

    const reqExpYears = Number(job.minExperienceYears || job.min_experience_years || job.experienceYears || 0);

    // 3. Query ALL candidate resumes in organization for ATS matching
    let query = db('resume_bank as rb')
      .where('rb.organization_id', ctx.organizationId)
      .leftJoin('candidates as c', 'rb.candidate_id', 'c.id')
      .select([
        'rb.id as resume_bank_id',
        'rb.candidate_id',
        'rb.job_id',
        'rb.source',
        'rb.position',
        'rb.status',
        'rb.created_at',
        'rb.resume_file_url',
        'rb.resume_text',
        'c.first_name',
        'c.last_name',
        'c.email',
        'c.phone',
        'c.skills as candidate_skills',
        'c.years_of_experience',
        'c.current_company',
        'c.qualification',
        'c.resume_url as candidate_resume_url',
      ]);

    if (options.sourceFilter && options.sourceFilter !== 'all') {
      query = query.where('rb.source', options.sourceFilter);
    }

    const rows = await query;
    let scoredList: ATSMatchResult[] = [];

    // If Gemini AI mode is enabled, run batch AI scoring in 1 single-pass API call for all candidates
    let aiResultsMap: Map<number, any> = new Map();
    if (options.useAI && rows.length > 0) {
      const candidatesForAi = rows.map((r: any) => {
        const rBankId = r.resumeBankId ?? r.resume_bank_id ?? r.id;
        const fn = r.firstName ?? r.first_name ?? '';
        const ln = r.lastName ?? r.last_name ?? '';
        const name = [fn, ln].filter(Boolean).join(' ') || r.candidateName || `Candidate #${rBankId}`;
        return {
          id: Number(rBankId),
          name,
          resumeText: (r.resumeText || r.resume_text || '').trim(),
          candidateSkills: (r.candidateSkills || r.candidate_skills || '').trim(),
          candidateExperience: parseFloat(r.yearsOfExperience ?? r.years_of_experience ?? 0),
          candidateQualification: r.qualification || ''
        };
      });

      aiResultsMap = await this.geminiService.scoreAllCandidatesBatch(
        jobDesc,
        jobTitle,
        candidatesForAi,
        targetSkills
      );
    }

    for (const row of rows) {
      const firstName = row.firstName ?? row.first_name ?? '';
      const lastName = row.lastName ?? row.last_name ?? '';
      const resumeBankId = row.resumeBankId ?? row.resume_bank_id ?? row.id;
      const candidateId = row.candidateId ?? row.candidate_id ?? null;
      const email = row.email ?? row.candidateEmail ?? row.candidate_email ?? '-';
      const phone = row.phone ?? row.candidatePhone ?? row.candidate_phone ?? null;

      const rawCandidateName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const candidateName = rawCandidateName || row.candidateName || row.candidate_name || row.name || (resumeBankId ? `Candidate #${resumeBankId}` : 'Candidate');

      let rawText = (row.resumeText || row.resume_text || '').trim();
      let candSkills = (row.candidateSkills || row.candidate_skills || '').trim();

      // Combine all authentic text sources for candidate (resume text, skills, position, qualification)
      const candSkillsStr = [
        candSkills,
        rawText,
        row.qualification || '',
        row.position || '',
      ].join(' ');

      const candExp = parseFloat(row.yearsOfExperience ?? row.years_of_experience ?? 0);
      const resumeUrl = row.resumeFileUrl ?? row.resume_file_url ?? row.candidateResumeUrl ?? row.candidate_resume_url ?? null;

      // ── SCORING: AI Mode (Gemini) vs Regex Mode ──
      let matched: string[] = [];
      let missing: string[] = [];
      let skillScore = 0;
      let expScore = 0;
      let keywordScore = 0;
      let totalAtsScore = 0;
      let recommendation: ATSMatchResult['recommendation'] = 'Weak Match';

      if (options.useAI) {
        // ═══════ GEMINI AI MODE (from single-pass batch map) ═══════
        const aiResult = aiResultsMap.get(Number(resumeBankId)) || await this.geminiService.scoreCandidate(
          jobDesc,
          jobTitle,
          rawText,
          candSkills,
          candExp,
          row.qualification || ''
        );
        matched = aiResult.matchedSkills;
        missing = aiResult.missingSkills;
        skillScore = aiResult.skillScore;
        expScore = aiResult.experienceScore;
        keywordScore = aiResult.profileScore;
        totalAtsScore = aiResult.overallScore;
        recommendation = aiResult.recommendation;
      } else {
        // ═══════ REGEX MODE (existing logic) ═══════
        const fullTextLower = candSkillsStr.toLowerCase();

        for (const skill of targetSkills) {
          const skillLower = skill.toLowerCase();

          let isMatch = fullTextLower.includes(skillLower);

          if (!isMatch) {
            if (skillLower === 'html') isMatch = fullTextLower.includes('html5') || fullTextLower.includes('web');
            else if (skillLower === 'css') isMatch = fullTextLower.includes('css3') || fullTextLower.includes('style');
            else if (skillLower === 'javascript' || skillLower === 'js') isMatch = fullTextLower.includes('js') || fullTextLower.includes('javascript') || fullTextLower.includes('es6');
            else if (skillLower === 'rest api' || skillLower === 'rest apis') isMatch = fullTextLower.includes('rest') || fullTextLower.includes('api');
            else if (skillLower === 'git') isMatch = fullTextLower.includes('github') || fullTextLower.includes('gitlab') || fullTextLower.includes('git');
            else if (skillLower === 'php') isMatch = fullTextLower.includes('php') || fullTextLower.includes('laravel') || fullTextLower.includes('codeigniter');
            else if (skillLower === 'python') isMatch = fullTextLower.includes('django') || fullTextLower.includes('flask') || fullTextLower.includes('fastapi');
            else if (skillLower === 'mysql') isMatch = fullTextLower.includes('sql') || fullTextLower.includes('database') || fullTextLower.includes('sqlite') || fullTextLower.includes('postgres');
            else if (skillLower === 'bootstrap') isMatch = fullTextLower.includes('bootstrap') || fullTextLower.includes('ui') || fullTextLower.includes('frontend');
          }

          if (isMatch) {
            matched.push(skill.toUpperCase());
          } else {
            missing.push(skill.toUpperCase());
          }
        }

        // Calculate Skill Match Score dynamically (60% max weight)
        if (targetSkills.length > 0) {
          const ratio = matched.length / targetSkills.length;
          if (ratio >= 0.5) skillScore = 45 + Math.round((ratio - 0.5) * 30);
          else if (ratio >= 0.25) skillScore = 30 + Math.round((ratio - 0.25) * 60);
          else if (matched.length > 0) skillScore = 15 + Math.round(ratio * 60);
          else skillScore = 5;
        } else {
          skillScore = 40;
        }

        // Calculate Experience Score (25% max weight)
        expScore = 15;
        if (reqExpYears > 0) {
          if (candExp >= reqExpYears) expScore = 25;
          else expScore = Math.max(10, Math.round((candExp / reqExpYears) * 25));
        } else {
          expScore = Math.min(25, Math.round(candExp * 4) + 12);
        }

        // Keyword & Profile Completeness (15% max weight)
        keywordScore = 5;
        if (rawText.length > 20) keywordScore += 5;
        if (row.qualification) keywordScore += 5;

        totalAtsScore = Math.min(100, Math.max(15, skillScore + expScore + keywordScore));

        if (totalAtsScore >= 80) recommendation = 'Strong Match';
        else if (totalAtsScore >= 60) recommendation = 'Good Match';
        else if (totalAtsScore >= 40) recommendation = 'Fair Match';
      }

      // Persist ATS score & skills back to database for quick lookups
      if (resumeBankId) {
        await db('resume_bank')
          .where('id', resumeBankId)
          .update({
            ats_score: totalAtsScore,
            matched_skills: JSON.stringify(matched),
            missing_skills: JSON.stringify(missing),
            ats_scored_at: new Date(),
          })
          .catch(() => {});
      }

      scoredList.push({
        resumeBankId: Number(resumeBankId),
        candidateId: candidateId ? Number(candidateId) : null,
        candidateName,
        email,
        phone,
        position: row.position || jobTitle,
        jobTitle: jobTitle,
        atsScore: totalAtsScore,
        skillScore,
        expScore,
        matchedSkills: matched,
        missingSkills: missing,
        totalJdSkillsCount: matched.length + missing.length,
        matchedCount: matched.length,
        yearsOfExperience: candExp,
        recommendation,
        source: row.source || 'Career Portal',
        resumeUrl,
        createdAt: row.createdAt || row.created_at,
      });
    }

    // Filter by Min Match % setting if specified
    const minThreshold = options.minMatchPct !== undefined ? options.minMatchPct : 0;
    if (minThreshold > 0) {
      scoredList = scoredList.filter(item => item.atsScore >= minThreshold);
    }

    // Sort by Matched Skills Count DESC, then ATS Score DESC
    scoredList.sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) {
        return b.matchedCount - a.matchedCount;
      }
      return b.atsScore - a.atsScore;
    });

    // Deduplicate candidate applications by email (keep highest scoring application)
    const seenEmails = new Set<string>();
    const deduplicatedResults: ATSMatchResult[] = [];
    for (const item of scoredList) {
      const key = (item.email && item.email !== '-') ? item.email.toLowerCase() : `id_${item.resumeBankId}`;
      if (!seenEmails.has(key)) {
        seenEmails.add(key);
        deduplicatedResults.push(item);
      }
    }

    const limitN = options.topN || 10;
    const topResults = deduplicatedResults.slice(0, limitN);

    return {
      results: topResults,
      totalScanned: rows.length,
      jobDetails: {
        id: job.id,
        title: jobTitle,
        code: job.jobCode || job.job_code,
        targetSkills: targetSkills.map(s => s.toUpperCase()),
        minMatchPct: minThreshold,
      },
    };
  }
}

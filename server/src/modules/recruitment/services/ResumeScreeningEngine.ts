import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { skillMasterService } from './SkillMasterService';

export interface AtsBreakdown {
  atsScore: number;
  parsingScore: number;
  keywordScore: number;
  skillScore: number;
  experienceScore: number;
  structureScore: number;
  formatScore: number;
  educationScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  sections: {
    name: boolean;
    contact: boolean;
    summary: boolean;
    skills: boolean;
    experience: boolean;
    education: boolean;
    projects: boolean;
  };
}

export interface JdMatchBreakdown {
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  semanticScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchStatus: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
}

export interface ScreeningResult {
  candidateId: number;
  jobId: number;
  atsScore: number;
  jdMatchScore: number;
  finalScore: number;
  mandatoryRequirementsMet: boolean;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  statusLabel: 'AI Shortlisted' | 'Eligible' | 'Review Required' | 'Below Threshold';
  reasons: string[];
  atsBreakdown: AtsBreakdown;
  jdMatchBreakdown: JdMatchBreakdown;
  screeningMode: string;
}

export class ResumeScreeningEngine {
  /**
   * Screen a candidate against a job description, computing ATS Score, JD Match Score,
   * evaluating HR screening rules, and persisting results.
   */
  async screenCandidateForJob(
    ctx: TenantContext,
    candidateId: number,
    jobId: number,
    options: { persist?: boolean; autoShortlistIfEligible?: boolean } = { persist: true, autoShortlistIfEligible: true }
  ): Promise<ScreeningResult> {
    const db = getKnex();

    // 1. Fetch Candidate Record and related profile data
    const candidate = await db('candidates')
      .where({ id: candidateId, organization_id: ctx.organizationId })
      .first();

    if (!candidate) {
      throw new Error(`Candidate #${candidateId} not found`);
    }

    const candidateSkillsRows = await db('candidate_skills')
      .where({ candidate_id: candidateId, organization_id: ctx.organizationId })
      .catch(() => []);

    const candidateEduRows = await db('candidate_education')
      .where({ candidate_id: candidateId, organization_id: ctx.organizationId })
      .catch(() => []);

    const candidateExpRows = await db('candidate_experience')
      .where({ candidate_id: candidateId, organization_id: ctx.organizationId })
      .catch(() => []);

    const candidateDocs = await db('candidate_documents')
      .where({ candidate_id: candidateId, organization_id: ctx.organizationId })
      .catch(() => []);

    // 2. Fetch Job Record, Job Skills, and Job AI Settings
    const job = await db('jobs')
      .where({ id: jobId, organization_id: ctx.organizationId })
      .first();

    if (!job) {
      throw new Error(`Job #${jobId} not found`);
    }

    const jobSkillsRows = await db('job_skills')
      .where({ job_id: jobId })
      .catch(() => []);

    let aiSettings = await db('job_ai_settings')
      .where({ job_id: jobId, organization_id: ctx.organizationId })
      .first();

    const jobTitle = job.job_title || job.jobTitle || '';
    const jobDesc = job.job_description || job.jobDescription || '';
    const jobMinExp = job.min_experience_years ?? job.minExperienceYears ?? 0;
    const jobMaxExp = job.max_experience_years ?? job.maxExperienceYears ?? (jobMinExp > 0 ? jobMinExp + 4 : 20);

    if (!aiSettings) {
      // Default fallback settings: ATS >= 85, JD Match >= 80, ATS_AND_JD mode
      aiSettings = {
        ai_screening_enabled: true,
        ats_enabled: true,
        ats_threshold: 85,
        jd_match_enabled: true,
        jd_match_threshold: 80,
        shortlisting_mode: 'ATS_AND_JD',
        ats_weight: 40,
        jd_match_weight: 60,
        auto_shortlist_enabled: false,
        suggestion_limit: 50,
        mandatory_skills: null,
        min_experience: jobMinExp || null,
      };
    }

    // 3. Compile Candidate Skills & Resume Text
    const extractedCandidateSkills: string[] = [];
    if (candidate.skills) {
      extractedCandidateSkills.push(...String(candidate.skills).split(/[,|\n\r]+/));
    }
    for (const s of candidateSkillsRows) {
      const skName = s.skill_name || s.skillName;
      if (skName) extractedCandidateSkills.push(skName);
    }

    // 4. Compile Job Requirements
    const requiredSkills: string[] = [];
    const mandatorySkillsList: string[] = [];

    for (const js of jobSkillsRows) {
      const skName = js.skill_name || js.skillName;
      const isMand = js.is_mandatory ?? js.isMandatory;
      if (skName) {
        requiredSkills.push(skName);
        if (isMand) {
          mandatorySkillsList.push(skName);
        }
      }
    }

    // Extract skills from JD text if job_skills is empty
    if (requiredSkills.length === 0 && jobDesc) {
      const rawText = jobDesc.replace(/<[^>]*>?/gm, ' ');
      const candidateMatches = skillMasterService.normalizeSkillList(rawText);
      requiredSkills.push(...candidateMatches);
    }

    // Check configured mandatory skills in aiSettings
    const mandField = aiSettings.mandatory_skills ?? aiSettings.mandatorySkills;
    if (mandField) {
      const configuredMandatory = typeof mandField === 'string'
        ? JSON.parse(mandField)
        : mandField;
      if (Array.isArray(configuredMandatory)) {
        mandatorySkillsList.push(...configuredMandatory);
      }
    }

    // ──────────────────────────────────────────────────────────
    // 5. CALCULATE ATS SCORE (Multi-factor measurable formula)
    // ──────────────────────────────────────────────────────────
    const candFirstName = candidate.first_name || candidate.firstName || '';
    const candLastName = candidate.last_name || candidate.lastName || '';
    const candCompany = candidate.current_company || candidate.currentCompany || '';
    const candResumeUrl = candidate.resume_url || candidate.resumeUrl || '';
    const candQual = candidate.qualification || '';
    const candLocation = candidate.city || candidate.current_location || candidate.currentLocation || candidate.state || candidate.address_line1 || candidate.addressLine1;

    // Factor A: Resume Parsing (20%)
    let parsingScore = 0;
    const hasName = Boolean(candFirstName && candFirstName !== 'Applicant' && candFirstName !== 'Candidate');
    const hasEmail = Boolean(candidate.email && !candidate.email.includes('candidate_trk'));
    const hasPhone = Boolean(candidate.phone);
    const hasLocation = Boolean(candLocation);

    if (hasName) parsingScore += 30;
    if (hasEmail) parsingScore += 30;
    if (hasPhone) parsingScore += 20;
    if (hasLocation) parsingScore += 20;

    // Factor B: Required Skills (25%) & Factor C: JD Keyword Alignment (25%)
    const skillMatchResult = skillMasterService.matchSkills(requiredSkills, extractedCandidateSkills);
    const skillScore = skillMatchResult.matchPercentage;

    // JD Keyword Alignment includes technical keywords + position keywords
    const matchedKeywords = [...skillMatchResult.matched];
    const missingKeywords = [...skillMatchResult.missing];

    // Check position/job title keyword alignment
    if (jobTitle && candCompany) {
      matchedKeywords.push('Professional History');
    }

    let keywordScore = skillScore;
    if (candidateExpRows.length > 0) keywordScore = Math.min(100, keywordScore + 5);
    if (candidateEduRows.length > 0) keywordScore = Math.min(100, keywordScore + 5);

    // Factor D: Resume Structure & Sections (10%)
    const sections = {
      name: hasName,
      contact: hasEmail || hasPhone,
      summary: Boolean(candidate.comments || candidate.skills),
      skills: extractedCandidateSkills.length > 0,
      experience: candidateExpRows.length > 0 || Boolean(candCompany || candidate.years_of_experience || candidate.yearsOfExperience),
      education: candidateEduRows.length > 0 || Boolean(candQual),
      projects: candidateDocs.length > 0 || Boolean(candidate.github_url || candidate.githubUrl || candidate.portfolio_url || candidate.portfolioUrl || candidate.linkedin_url || candidate.linkedinUrl)
    };

    let structureScore = 0;
    if (sections.name) structureScore += 15;
    if (sections.contact) structureScore += 15;
    if (sections.summary) structureScore += 10;
    if (sections.skills) structureScore += 20;
    if (sections.experience) structureScore += 20;
    if (sections.education) structureScore += 10;
    if (sections.projects) structureScore += 10;

    // Factor E: Experience Alignment (10%)
    const rawExp = candidate.years_of_experience ?? candidate.yearsOfExperience;
    const candidateYears = rawExp !== null && rawExp !== undefined
      ? parseFloat(String(rawExp))
      : 0;
    const requiredMinYears = jobMinExp || (aiSettings.min_experience ?? aiSettings.minExperience ?? 0);
    const requiredMaxYears = jobMaxExp;

    let experienceScore = 70;
    if (candidateYears >= requiredMinYears && candidateYears <= requiredMaxYears) {
      experienceScore = 100;
    } else if (candidateYears > requiredMaxYears) {
      experienceScore = 90; // Slightly overqualified but good
    } else if (requiredMinYears > 0) {
      experienceScore = Math.max(20, Math.round((candidateYears / requiredMinYears) * 85));
    } else {
      experienceScore = 85;
    }

    // Factor F: Education Alignment (5%)
    let educationScore = 75;
    const qual = (candidate.qualification || '').toLowerCase();
    if (qual.includes('b.tech') || qual.includes('m.tech') || qual.includes('be') || qual.includes('mca') || qual.includes('degree') || qual.includes('master') || qual.includes('bachelor') || qual.includes('phd')) {
      educationScore = 100;
    } else if (candidateEduRows.length > 0) {
      educationScore = 95;
    } else if (qual) {
      educationScore = 85;
    }

    // Factor G: Formatting Quality & Readability (5%)
    let formatScore = 90;
    if (candidate.resume_url || candidateDocs.length > 0) formatScore += 10;
    if (!hasPhone && !hasEmail) formatScore -= 30;

    // Calculate Final ATS Score
    const rawAtsScore = (
      parsingScore * 0.20 +
      keywordScore * 0.25 +
      skillScore * 0.25 +
      structureScore * 0.10 +
      experienceScore * 0.10 +
      educationScore * 0.05 +
      formatScore * 0.05
    );
    const atsScore = Math.min(100, Math.max(10, Math.round(rawAtsScore)));

    const atsBreakdown: AtsBreakdown = {
      atsScore,
      parsingScore: Math.round(parsingScore),
      keywordScore: Math.round(keywordScore),
      skillScore: Math.round(skillScore),
      experienceScore: Math.round(experienceScore),
      structureScore: Math.round(structureScore),
      formatScore: Math.round(formatScore),
      educationScore: Math.round(educationScore),
      matchedKeywords,
      missingKeywords,
      sections
    };

    // ──────────────────────────────────────────────────────────
    // 6. CALCULATE JD MATCH SCORE (How well candidate matches job)
    // ──────────────────────────────────────────────────────────
    // Skill Match: 40%
    // Experience Match: 30%
    // Semantic & Role Match: 30%
    // ──────────────────────────────────────────────────────────
    let jdSkillScore = skillScore;
    let jdExpScore = experienceScore;
    
    // Semantic / Role Match
    let jdSemanticScore = 70;
    const lowerCompany = (candCompany || '').toLowerCase();
    const lowerJobTitle = (jobTitle || '').toLowerCase();
    if (lowerJobTitle.includes('developer') || lowerJobTitle.includes('engineer')) {
      if (extractedCandidateSkills.some(s => ['javascript', 'python', 'java', 'node', 'react', 'sql'].some(tech => s.toLowerCase().includes(tech)))) {
        jdSemanticScore += 20;
      }
    }
    if (lowerCompany) jdSemanticScore += 10;
    jdSemanticScore = Math.min(100, jdSemanticScore);

    const rawJdMatchScore = (jdSkillScore * 0.40) + (jdExpScore * 0.30) + (jdSemanticScore * 0.30);
    const jdMatchScore = Math.min(100, Math.max(10, Math.round(rawJdMatchScore)));

    let matchStatus: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' = 'POOR';
    if (jdMatchScore >= 85) matchStatus = 'EXCELLENT';
    else if (jdMatchScore >= 70) matchStatus = 'GOOD';
    else if (jdMatchScore >= 50) matchStatus = 'AVERAGE';

    const jdMatchBreakdown: JdMatchBreakdown = {
      overallScore: jdMatchScore,
      skillScore: Math.round(jdSkillScore),
      experienceScore: Math.round(jdExpScore),
      semanticScore: Math.round(jdSemanticScore),
      matchedSkills: skillMatchResult.matched,
      missingSkills: skillMatchResult.missing,
      matchStatus,
    };

    // ──────────────────────────────────────────────────────────
    // 7. HARD REQUIREMENT CHECKS & RECRUITMENT RULE EVALUATION
    // ──────────────────────────────────────────────────────────
    const reasons: string[] = [];
    let mandatoryRequirementsMet = true;

    // Check mandatory skills
    if (mandatorySkillsList.length > 0) {
      const mandCheck = skillMasterService.matchSkills(mandatorySkillsList, extractedCandidateSkills);
      if (mandCheck.missing.length > 0) {
        mandatoryRequirementsMet = false;
        reasons.push(`Missing mandatory skills: ${mandCheck.missing.join(', ')}`);
      } else {
        reasons.push(`All ${mandatorySkillsList.length} mandatory skills matched: [${mandatorySkillsList.join(', ')}]`);
      }
    }

    // Check minimum experience
    if (requiredMinYears > 0) {
      if (candidateYears < requiredMinYears) {
        mandatoryRequirementsMet = false;
        reasons.push(`Experience (${candidateYears} yrs) below minimum required (${requiredMinYears} yrs)`);
      } else {
        reasons.push(`Experience (${candidateYears} yrs) meets required ${requiredMinYears}+ yrs`);
      }
    }

    // Evaluate configured Shortlisting Mode
    const atsThreshold = aiSettings.ats_threshold || 85;
    const jdMatchThreshold = aiSettings.jd_match_threshold || 80;
    const shortlistingMode = aiSettings.shortlisting_mode || 'ATS_AND_JD';

    let isShortlistEligible = false;
    let isReviewRequired = false;

    const atsPassed = atsScore >= atsThreshold;
    const jdMatchPassed = jdMatchScore >= jdMatchThreshold;

    if (atsPassed) {
      reasons.push(`ATS score (${atsScore}%) is above threshold (${atsThreshold}%)`);
    } else {
      reasons.push(`ATS score (${atsScore}%) is below threshold (${atsThreshold}%)`);
    }

    if (jdMatchPassed) {
      reasons.push(`JD Match score (${jdMatchScore}%) is above threshold (${jdMatchThreshold}%)`);
    } else {
      reasons.push(`JD Match score (${jdMatchScore}%) is below threshold (${jdMatchThreshold}%)`);
    }

    let finalScore = jdMatchScore;

    if (shortlistingMode === 'ATS_ONLY') {
      isShortlistEligible = atsPassed && mandatoryRequirementsMet;
      finalScore = atsScore;
    } else if (shortlistingMode === 'JD_MATCH_ONLY') {
      isShortlistEligible = jdMatchPassed && mandatoryRequirementsMet;
      finalScore = jdMatchScore;
    } else if (shortlistingMode === 'WEIGHTED_SCORE') {
      const atsW = (aiSettings.ats_weight || 40) / 100;
      const jdW = (aiSettings.jd_match_weight || 60) / 100;
      finalScore = Math.round(atsScore * atsW + jdMatchScore * jdW);
      const combinedThreshold = Math.round(atsThreshold * atsW + jdMatchThreshold * jdW);
      isShortlistEligible = finalScore >= combinedThreshold && mandatoryRequirementsMet;
      reasons.push(`Weighted Score (${finalScore}%) evaluated against threshold (${combinedThreshold}%)`);
    } else if (shortlistingMode === 'AI_RECOMMENDED') {
      finalScore = Math.round((atsScore + jdMatchScore) / 2);
      isShortlistEligible = finalScore >= 80 && mandatoryRequirementsMet;
    } else {
      // Default: ATS_AND_JD
      isShortlistEligible = atsPassed && jdMatchPassed && mandatoryRequirementsMet;
      finalScore = Math.round((atsScore + jdMatchScore) / 2);
    }

    // Review logic if one passed or near cutoff
    if (!isShortlistEligible && (atsPassed || jdMatchPassed || finalScore >= (atsThreshold - 10))) {
      isReviewRequired = true;
    }

    let recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT' = 'REJECT';
    let statusLabel: 'AI Shortlisted' | 'Eligible' | 'Review Required' | 'Below Threshold' = 'Below Threshold';

    if (isShortlistEligible) {
      recommendation = 'SHORTLIST';
      statusLabel = aiSettings.auto_shortlist_enabled ? 'AI Shortlisted' : 'Eligible';
    } else if (isReviewRequired) {
      recommendation = 'REVIEW';
      statusLabel = 'Review Required';
    } else {
      recommendation = 'REJECT';
      statusLabel = 'Below Threshold';
    }

    const screeningResult: ScreeningResult = {
      candidateId,
      jobId,
      atsScore,
      jdMatchScore,
      finalScore,
      mandatoryRequirementsMet,
      recommendation,
      statusLabel,
      reasons,
      atsBreakdown,
      jdMatchBreakdown,
      screeningMode: shortlistingMode,
    };

    // ──────────────────────────────────────────────────────────
    // 8. PERSIST RESULTS TO DATABASE
    // ──────────────────────────────────────────────────────────
    if (options.persist) {
      try {
        const now = new Date();
        const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        // A. Upsert resume_ats_scores
        const existingAts = await db('resume_ats_scores')
          .where({ candidate_id: candidateId, job_id: jobId, organization_id: ctx.organizationId })
          .first();

        if (existingAts) {
          await db('resume_ats_scores')
            .where('id', existingAts.id)
            .update({
              ats_score: atsScore,
              keyword_score: atsBreakdown.keywordScore,
              skill_score: atsBreakdown.skillScore,
              experience_score: atsBreakdown.experienceScore,
              structure_score: atsBreakdown.structureScore,
              format_score: atsBreakdown.formatScore,
              education_score: atsBreakdown.educationScore,
              matched_keywords: JSON.stringify(matchedKeywords),
              missing_keywords: JSON.stringify(missingKeywords),
              section_details: JSON.stringify(sections),
              analysis_version: (existingAts.analysis_version || 1) + 1,
              updated_at: mysqlNow,
            });
        } else {
          await db('resume_ats_scores').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            candidate_id: candidateId,
            job_id: jobId,
            ats_score: atsScore,
            keyword_score: atsBreakdown.keywordScore,
            skill_score: atsBreakdown.skillScore,
            experience_score: atsBreakdown.experienceScore,
            structure_score: atsBreakdown.structureScore,
            format_score: atsBreakdown.formatScore,
            education_score: atsBreakdown.educationScore,
            matched_keywords: JSON.stringify(matchedKeywords),
            missing_keywords: JSON.stringify(missingKeywords),
            section_details: JSON.stringify(sections),
            analysis_version: 1,
            created_at: mysqlNow,
            updated_at: mysqlNow,
          });
        }

        // B. Upsert candidate_job_matches
        const existingMatch = await db('candidate_job_matches')
          .where({ candidate_id: candidateId, job_id: jobId, organization_id: ctx.organizationId })
          .first();

        if (existingMatch) {
          await db('candidate_job_matches')
            .where('id', existingMatch.id)
            .update({
              overall_score: jdMatchScore,
              skill_score: jdMatchBreakdown.skillScore,
              experience_score: jdMatchBreakdown.experienceScore,
              semantic_score: jdMatchBreakdown.semanticScore,
              matched_skills: JSON.stringify(skillMatchResult.matched),
              missing_skills: JSON.stringify(skillMatchResult.missing),
              match_status: matchStatus,
              updated_at: mysqlNow,
            });
        } else {
          await db('candidate_job_matches').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            job_id: jobId,
            candidate_id: candidateId,
            overall_score: jdMatchScore,
            skill_score: jdMatchBreakdown.skillScore,
            experience_score: jdMatchBreakdown.experienceScore,
            semantic_score: jdMatchBreakdown.semanticScore,
            matched_skills: JSON.stringify(skillMatchResult.matched),
            missing_skills: JSON.stringify(skillMatchResult.missing),
            match_status: matchStatus,
            created_at: mysqlNow,
            updated_at: mysqlNow,
          });
        }

        // C. Record Action in candidate_job_actions
        const actionType = isShortlistEligible 
          ? (aiSettings.auto_shortlist_enabled ? 'AI_SHORTLISTED' : 'AI_RECOMMENDED')
          : (isReviewRequired ? 'REVIEW' : 'AI_EVALUATED');

        await db('candidate_job_actions').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          job_id: jobId,
          candidate_id: candidateId,
          action: actionType,
          reason: reasons.join('; '),
          source: 'AI_SCREENING_ENGINE',
          created_at: mysqlNow,
        });

        // D. Auto-shortlist into Applications table if enabled and eligible
        if (isShortlistEligible && aiSettings.auto_shortlist_enabled && options.autoShortlistIfEligible) {
          const existingApp = await db('applications')
            .where({ candidate_id: candidateId, job_id: jobId, organization_id: ctx.organizationId })
            .first();

          if (!existingApp) {
            await db('applications').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              candidate_id: candidateId,
              job_id: jobId,
              mrf_request_id: job.mrf_request_id || null,
              application_status: 'screening',
              initial_screening_status: 'passed',
              applied_from_source: candidate.source || 'AI Screening Auto-Shortlist',
              created_by: ctx.userId || null,
              updated_by: ctx.userId || null,
              created_at: mysqlNow,
              updated_at: mysqlNow,
            });
          } else {
            await db('applications')
              .where('id', existingApp.id)
              .update({
                initial_screening_status: 'passed',
                updated_at: mysqlNow,
              });
          }
        }
      } catch (persistErr: any) {
        console.error('[ResumeScreeningEngine] Persistence error:', persistErr.message);
      }
    }

    return screeningResult;
  }

  /**
   * Screen all candidates in the organization against a specific job
   */
  async screenAllCandidatesForJob(
    ctx: TenantContext,
    jobId: number,
    limit?: number
  ): Promise<ScreeningResult[]> {
    const db = getKnex();
    let query = db('candidates')
      .where('organization_id', ctx.organizationId)
      .whereNot('first_name', 'Applicant')
      .whereNot('first_name', 'Candidate')
      .orderBy('id', 'desc');

    if (limit) {
      query = query.limit(limit);
    }

    const candidates = await query;
    const results: ScreeningResult[] = [];

    for (const c of candidates) {
      try {
        const res = await this.screenCandidateForJob(ctx, c.id, jobId, {
          persist: true,
          autoShortlistIfEligible: true,
        });
        results.push(res);
      } catch (err: any) {
        console.warn(`[ResumeScreeningEngine] Failed to screen candidate #${c.id}:`, err.message);
      }
    }

    return results;
  }
}

export const resumeScreeningEngine = new ResumeScreeningEngine();

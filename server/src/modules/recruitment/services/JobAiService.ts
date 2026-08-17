import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { resumeScreeningEngine, type ScreeningResult } from './ResumeScreeningEngine';

export interface SaveJobAiSettingsInput {
  aiScreeningEnabled?: boolean;
  atsEnabled?: boolean;
  atsThreshold?: number;
  jdMatchEnabled?: boolean;
  jdMatchThreshold?: number;
  shortlistingMode?: 'ATS_ONLY' | 'JD_MATCH_ONLY' | 'ATS_AND_JD' | 'WEIGHTED_SCORE' | 'AI_RECOMMENDED';
  atsWeight?: number;
  jdMatchWeight?: number;
  autoShortlistEnabled?: boolean;
  suggestionLimit?: number;
  mandatorySkills?: string[] | string | null;
  minExperience?: number | null;
}

export class JobAiService {
  /**
   * Get AI Screening Settings for a Job Opening
   */
  async getJobAiSettings(ctx: TenantContext, jobId: number): Promise<any> {
    const db = getKnex();
    const settings = await db('job_ai_settings')
      .where({ job_id: jobId, organization_id: ctx.organizationId })
      .first();

    const job = await db('jobs')
      .where({ id: jobId, organization_id: ctx.organizationId })
      .first();

    if (!settings) {
      return {
        jobId,
        aiScreeningEnabled: true,
        atsEnabled: true,
        atsThreshold: 85,
        jdMatchEnabled: true,
        jdMatchThreshold: 80,
        shortlistingMode: 'ATS_AND_JD',
        atsWeight: 40,
        jdMatchWeight: 60,
        autoShortlistEnabled: false,
        suggestionLimit: 50,
        mandatorySkills: [],
        minExperience: job?.min_experience_years || null,
        jobTitle: job?.job_title || '',
      };
    }

    let parsedMandatory: string[] = [];
    if (settings.mandatory_skills) {
      try {
        parsedMandatory = typeof settings.mandatory_skills === 'string'
          ? JSON.parse(settings.mandatory_skills)
          : settings.mandatory_skills;
      } catch (e) {
        parsedMandatory = [];
      }
    }

    return {
      id: settings.id,
      jobId: settings.job_id,
      aiScreeningEnabled: Boolean(settings.ai_screening_enabled),
      atsEnabled: Boolean(settings.ats_enabled),
      atsThreshold: settings.ats_threshold ?? 85,
      jdMatchEnabled: Boolean(settings.jd_match_enabled),
      jdMatchThreshold: settings.jd_match_threshold ?? 80,
      shortlistingMode: settings.shortlisting_mode || 'ATS_AND_JD',
      atsWeight: settings.ats_weight ?? 40,
      jdMatchWeight: settings.jd_match_weight ?? 60,
      autoShortlistEnabled: Boolean(settings.auto_shortlist_enabled),
      suggestionLimit: settings.suggestion_limit ?? 50,
      mandatorySkills: parsedMandatory,
      minExperience: settings.min_experience,
      jobTitle: job?.job_title || '',
    };
  }

  /**
   * Save or Update AI Screening Settings for a Job Opening
   */
  async saveJobAiSettings(ctx: TenantContext, jobId: number, input: SaveJobAiSettingsInput): Promise<any> {
    const db = getKnex();
    const existing = await db('job_ai_settings')
      .where({ job_id: jobId, organization_id: ctx.organizationId })
      .first();

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let mandatoryJson = null;
    if (input.mandatorySkills) {
      const arr = Array.isArray(input.mandatorySkills)
        ? input.mandatorySkills
        : String(input.mandatorySkills).split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
      mandatoryJson = JSON.stringify(arr);
    }

    const payload: any = {
      ai_screening_enabled: input.aiScreeningEnabled !== undefined ? input.aiScreeningEnabled : true,
      ats_enabled: input.atsEnabled !== undefined ? input.atsEnabled : true,
      ats_threshold: input.atsThreshold ?? 85,
      jd_match_enabled: input.jdMatchEnabled !== undefined ? input.jdMatchEnabled : true,
      jd_match_threshold: input.jdMatchThreshold ?? 80,
      shortlisting_mode: input.shortlistingMode || 'ATS_AND_JD',
      ats_weight: input.atsWeight ?? 40,
      jd_match_weight: input.jdMatchWeight ?? 60,
      auto_shortlist_enabled: input.autoShortlistEnabled !== undefined ? input.autoShortlistEnabled : false,
      suggestion_limit: input.suggestionLimit ?? 50,
      mandatory_skills: mandatoryJson,
      min_experience: input.minExperience !== undefined ? input.minExperience : null,
      updated_at: mysqlNow,
    };

    if (existing) {
      await db('job_ai_settings').where('id', existing.id).update(payload);
    } else {
      payload.uuid = uuidv4();
      payload.organization_id = ctx.organizationId;
      payload.job_id = jobId;
      payload.created_at = mysqlNow;
      await db('job_ai_settings').insert(payload);
    }

    return this.getJobAiSettings(ctx, jobId);
  }

  /**
   * Get Ranked AI Suggestions for a Job Opening
   */
  async getAiSuggestions(
    ctx: TenantContext,
    jobId: number,
    options: { limit?: number | string; statusFilter?: string; minAts?: number; minJd?: number } = {}
  ): Promise<any> {
    const db = getKnex();

    const job = await db('jobs')
      .where({ id: jobId, organization_id: ctx.organizationId })
      .first();

    if (!job) {
      throw new Error('Job not found');
    }

    const settings = await this.getJobAiSettings(ctx, jobId);

    // Fetch all real candidates in the organization
    const candidates = await db('candidates')
      .where('organization_id', ctx.organizationId)
      .whereNot('first_name', 'Applicant')
      .whereNot('first_name', 'Candidate')
      .whereNot('email', 'like', 'candidate_trk%')
      .select([
        'id', 'uuid', 'first_name', 'last_name', 'email', 'phone',
        'current_company', 'years_of_experience', 'qualification', 'skills',
        'resume_url', 'source', 'created_at'
      ]);

    // Check existing scores for this job
    const atsScores = await db('resume_ats_scores')
      .where({ job_id: jobId, organization_id: ctx.organizationId });

    const jdMatches = await db('candidate_job_matches')
      .where({ job_id: jobId, organization_id: ctx.organizationId });

    const applications = await db('applications')
      .where({ job_id: jobId, organization_id: ctx.organizationId })
      .select(['candidate_id', 'application_status', 'initial_screening_status']);

    const atsMap = new Map<number, any>();
    for (const a of atsScores) atsMap.set(a.candidate_id, a);

    const jdMap = new Map<number, any>();
    for (const j of jdMatches) jdMap.set(j.candidate_id, j);

    const appMap = new Map<number, any>();
    for (const app of applications) appMap.set(app.candidate_id, app);

    // Screen any unscreened candidate on the fly
    const scoredCandidates: any[] = [];

    for (const c of candidates) {
      let ats = atsMap.get(c.id);
      let jd = jdMap.get(c.id);

      if (!ats || !jd) {
        try {
          const screeningRes = await resumeScreeningEngine.screenCandidateForJob(ctx, c.id, jobId, {
            persist: true,
            autoShortlistIfEligible: settings.autoShortlistEnabled
          });
          ats = {
            ats_score: screeningRes.atsScore,
            keyword_score: screeningRes.atsBreakdown.keywordScore,
            skill_score: screeningRes.atsBreakdown.skillScore,
            experience_score: screeningRes.atsBreakdown.experienceScore,
            structure_score: screeningRes.atsBreakdown.structureScore,
            format_score: screeningRes.atsBreakdown.formatScore,
            education_score: screeningRes.atsBreakdown.educationScore,
            matched_keywords: JSON.stringify(screeningRes.atsBreakdown.matchedKeywords),
            missing_keywords: JSON.stringify(screeningRes.atsBreakdown.missingKeywords),
          };
          jd = {
            overall_score: screeningRes.jdMatchScore,
            skill_score: screeningRes.jdMatchBreakdown.skillScore,
            experience_score: screeningRes.jdMatchBreakdown.experienceScore,
            semantic_score: screeningRes.jdMatchBreakdown.semanticScore,
            matched_skills: JSON.stringify(screeningRes.jdMatchBreakdown.matchedSkills),
            missing_skills: JSON.stringify(screeningRes.jdMatchBreakdown.missingSkills),
            match_status: screeningRes.jdMatchBreakdown.matchStatus,
          };
        } catch (e) {
          continue;
        }
      }

      const atsScoreVal = Math.round(parseFloat(String(ats.ats_score || 0)));
      const jdScoreVal = Math.round(parseFloat(String(jd.overall_score || 0)));

      // Evaluate eligibility based on settings
      const atsPassed = atsScoreVal >= settings.atsThreshold;
      const jdMatchPassed = jdScoreVal >= settings.jdMatchThreshold;

      let isEligible = false;
      let finalScore = jdScoreVal;

      if (settings.shortlistingMode === 'ATS_ONLY') {
        isEligible = atsPassed;
        finalScore = atsScoreVal;
      } else if (settings.shortlistingMode === 'JD_MATCH_ONLY') {
        isEligible = jdMatchPassed;
        finalScore = jdScoreVal;
      } else if (settings.shortlistingMode === 'WEIGHTED_SCORE') {
        const atsW = (settings.atsWeight || 40) / 100;
        const jdW = (settings.jdMatchWeight || 60) / 100;
        finalScore = Math.round(atsScoreVal * atsW + jdScoreVal * jdW);
        const combinedThreshold = Math.round(settings.atsThreshold * atsW + settings.jdMatchThreshold * jdW);
        isEligible = finalScore >= combinedThreshold;
      } else {
        // ATS_AND_JD or AI_RECOMMENDED
        isEligible = atsPassed && jdMatchPassed;
        finalScore = Math.round((atsScoreVal + jdScoreVal) / 2);
      }

      const app = appMap.get(c.id);
      const isAlreadyShortlisted = app && (app.application_status === 'screening' || app.initial_screening_status === 'passed');

      let status = 'Below Threshold';
      if (isAlreadyShortlisted) {
        status = 'Shortlisted';
      } else if (isEligible) {
        status = 'Eligible';
      } else if (atsPassed || jdMatchPassed || finalScore >= (settings.atsThreshold - 10)) {
        status = 'Review';
      }

      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email?.split('@')[0] || 'Candidate';

      scoredCandidates.push({
        candidateId: c.id,
        candidateUuid: c.uuid,
        name: fullName,
        email: c.email,
        phone: c.phone || '-',
        currentCompany: c.current_company || '-',
        experience: c.years_of_experience ? `${c.years_of_experience} yrs` : 'Fresher',
        experienceYears: c.years_of_experience ? parseFloat(String(c.years_of_experience)) : 0,
        qualification: c.qualification || '-',
        skills: c.skills || '',
        resumeUrl: c.resume_url,
        atsScore: atsScoreVal,
        jdMatchScore: jdScoreVal,
        finalScore,
        atsPassed,
        jdMatchPassed,
        isEligible,
        isShortlisted: Boolean(isAlreadyShortlisted),
        status,
      });
    }

    // Sort by final score descending, then by ATS score descending
    scoredCandidates.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.jdMatchScore !== a.jdMatchScore) return b.jdMatchScore - a.jdMatchScore;
      return b.atsScore - a.atsScore;
    });

    // Add rank
    scoredCandidates.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Determine limit
    let limitNum = scoredCandidates.length;
    if (options.limit && options.limit !== 'all') {
      limitNum = parseInt(String(options.limit), 10) || scoredCandidates.length;
    } else if (!options.limit && settings.suggestionLimit) {
      limitNum = settings.suggestionLimit;
    }

    // Filter by status if requested
    let filteredList = scoredCandidates;
    if (options.statusFilter && options.statusFilter !== 'all') {
      filteredList = filteredList.filter(c => c.status.toLowerCase() === options.statusFilter?.toLowerCase());
    }

    const paginatedSuggestions = filteredList.slice(0, limitNum);

    // Summary Statistics
    const totalAnalyzed = scoredCandidates.length;
    const totalAtsPassed = scoredCandidates.filter(c => c.atsPassed).length;
    const totalJdMatchPassed = scoredCandidates.filter(c => c.jdMatchPassed).length;
    const totalEligible = scoredCandidates.filter(c => c.isEligible).length;
    const totalShortlisted = scoredCandidates.filter(c => c.isShortlisted).length;
    const totalReview = scoredCandidates.filter(c => c.status === 'Review').length;

    return {
      job: {
        id: job.id,
        jobCode: job.job_code,
        jobTitle: job.job_title,
        status: job.status,
      },
      settings,
      stats: {
        totalAnalyzed,
        atsThreshold: settings.atsThreshold,
        jdMatchThreshold: settings.jdMatchThreshold,
        totalAtsPassed,
        totalJdMatchPassed,
        totalEligible,
        totalShortlisted,
        totalReview,
      },
      suggestions: paginatedSuggestions,
    };
  }

  /**
   * Get Detailed Candidate AI Analysis breakdown for a candidate and job
   */
  async getCandidateAiAnalysis(ctx: TenantContext, candidateId: number, jobId: number): Promise<any> {
    const db = getKnex();

    const candidate = await db('candidates')
      .where({ id: candidateId, organization_id: ctx.organizationId })
      .first();

    if (!candidate) throw new Error('Candidate not found');

    const job = await db('jobs')
      .where({ id: jobId, organization_id: ctx.organizationId })
      .first();

    if (!job) throw new Error('Job not found');

    // Run complete screening calculation
    const screening = await resumeScreeningEngine.screenCandidateForJob(ctx, candidateId, jobId, {
      persist: true,
      autoShortlistIfEligible: false,
    });

    const settings = await this.getJobAiSettings(ctx, jobId);

    const app = await db('applications')
      .where({ candidate_id: candidateId, job_id: jobId, organization_id: ctx.organizationId })
      .first();

    return {
      candidate: {
        id: candidate.id,
        name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
        email: candidate.email,
        phone: candidate.phone,
        currentCompany: candidate.current_company,
        experience: candidate.years_of_experience,
        qualification: candidate.qualification,
        skills: candidate.skills,
        aiSummary: candidate.ai_summary,
        source: candidate.source,
        dob: candidate.dob,
        gender: candidate.gender,
        address: [candidate.address_line1, candidate.city, candidate.state, candidate.country].filter(Boolean).join(', '),
        resumeUrl: candidate.resume_url,
      },
      job: {
        id: job.id,
        jobCode: job.job_code,
        jobTitle: job.job_title,
      },
      settings,
      analysis: screening,
      application: app || null,
    };
  }

  /**
   * Bulk Shortlist Candidates to Pipeline
   */
  async bulkShortlistCandidates(ctx: TenantContext, jobId: number, candidateIds: number[]): Promise<any> {
    const db = getKnex();
    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const job = await db('jobs').where({ id: jobId, organization_id: ctx.organizationId }).first();
    if (!job) throw new Error('Job not found');

    let shortlistedCount = 0;

    for (const candId of candidateIds) {
      try {
        const candidate = await db('candidates').where({ id: candId, organization_id: ctx.organizationId }).first();
        if (!candidate) continue;

        let app = await db('applications')
          .where({ candidate_id: candId, job_id: jobId, organization_id: ctx.organizationId })
          .first();

        if (!app) {
          await db('applications').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            candidate_id: candId,
            job_id: jobId,
            mrf_request_id: job.mrf_request_id || null,
            application_status: 'screening',
            initial_screening_status: 'passed',
            applied_from_source: candidate.source || 'AI Screening',
            created_by: ctx.userId,
            updated_by: ctx.userId,
            created_at: mysqlNow,
            updated_at: mysqlNow,
          });
        } else {
          await db('applications')
            .where('id', app.id)
            .update({
              application_status: 'screening',
              initial_screening_status: 'passed',
              updated_at: mysqlNow,
            });
        }

        // Record action
        await db('candidate_job_actions').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          job_id: jobId,
          candidate_id: candId,
          action: 'HR_SHORTLISTED',
          reason: 'Shortlisted from AI Suggestions',
          performed_by: ctx.userId,
          source: 'AI_SUGGESTIONS_PAGE',
          created_at: mysqlNow,
        });

        // Update resume_bank status if linked
        await db('resume_bank')
          .where({ candidate_id: candId, organization_id: ctx.organizationId })
          .update({ status: 'Screening', job_id: jobId, updated_at: mysqlNow })
          .catch(() => {});

        shortlistedCount++;
      } catch (err: any) {
        console.error(`Error shortlisting candidate #${candId}:`, err.message);
      }
    }

    return {
      success: true,
      shortlistedCount,
      totalRequested: candidateIds.length,
    };
  }
}

export const jobAiService = new JobAiService();

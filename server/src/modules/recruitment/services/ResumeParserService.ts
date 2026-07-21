import { CandidateRepository } from '../repositories/CandidateRepository';
import {
  CandidateSkillRepository,
  CandidateEducationRepository,
  CandidateExperienceRepository,
} from '../repositories/CandidateProfileRepository';
import { CandidateResumeRepository } from '../repositories/CandidateDocumentRepository';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedResume {
  name: string;
  email: string;
  phone: string | null;
  skills: Array<{ name: string; proficiency?: string }>;
  experience: Array<{
    company: string;
    jobTitle: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    fieldOfStudy: string;
    institution: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
  }>;
  currentCTC: number | null;
  expectedCTC: number | null;
  noticePeriod: number | null;
}

export class ResumeParserService {
  private candidateRepo: CandidateRepository;
  private resumeRepo: CandidateResumeRepository;
  private skillRepo: CandidateSkillRepository;
  private educationRepo: CandidateEducationRepository;
  private experienceRepo: CandidateExperienceRepository;

  constructor() {
    this.candidateRepo = new CandidateRepository();
    this.resumeRepo = new CandidateResumeRepository();
    this.skillRepo = new CandidateSkillRepository();
    this.educationRepo = new CandidateEducationRepository();
    this.experienceRepo = new CandidateExperienceRepository();
  }

  async parseResume(ctx: TenantContext, fileUrl: string): Promise<ParsedResume> {
    // In a real implementation, this would call an AI service (Claude, etc.)
    // to parse the resume. For now, return a mock structure.
    return {
      name: 'Parsed Name',
      email: 'parsed@example.com',
      phone: null,
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      currentCTC: null,
      expectedCTC: null,
      noticePeriod: null,
    };
  }

  async generateCandidateSummary(ctx: TenantContext, candidateId: number): Promise<string> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const experience = await this.experienceRepo.getByCandidate(ctx, candidateId, { pageSize: 10000 });
    const skills = await this.skillRepo.getByCandidate(ctx, candidateId, { pageSize: 10000 });

    // Generate summary based on candidate data
    let summary = `${candidate.first_name} ${candidate.last_name} is a professional with ${candidate.years_of_experience || 0} years of experience`;

    if (candidate.current_company) {
      summary += `, currently working at ${candidate.current_company}`;
    }

    summary += '.';

    if (skills.items.length > 0) {
      const skillNames = skills.items.map((s) => s.skill_name).join(', ');
      summary += ` Key skills include: ${skillNames}.`;
    }

    if (experience.items.length > 0) {
      const mostRecent = experience.items[0];
      summary += ` Most recently worked as ${mostRecent.job_title} at ${mostRecent.company_name}.`;
    }

    return summary;
  }

  async generateSkillMatrix(ctx: TenantContext, candidateId: number): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const skills = await this.skillRepo.getByCandidate(ctx, candidateId, { pageSize: 10000 });

    const matrix = {
      candidateId,
      totalSkills: skills.items.length,
      expertSkills: skills.items.filter((s) => s.proficiency_level === 'expert').length,
      intermediateSkills: skills.items.filter((s) => s.proficiency_level === 'intermediate').length,
      beginnerSkills: skills.items.filter((s) => s.proficiency_level === 'beginner').length,
      skills: skills.items,
    };

    return matrix;
  }

  async calculateCandidateScore(ctx: TenantContext, candidateId: number, jobId: number): Promise<number> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    // Simple scoring algorithm (0-100)
    let score = 50; // Base score

    // Experience scoring
    if (candidate.years_of_experience) {
      score += Math.min(candidate.years_of_experience * 5, 20);
    }

    // Skill match scoring (would need job skills to do properly)
    const skills = await this.skillRepo.getByCandidate(ctx, candidateId);
    score += Math.min(skills.items.length * 2, 15);

    // Education scoring
    const education = await this.educationRepo.getByCandidate(ctx, candidateId);
    if (education.items.length > 0) {
      score += 10;
    }

    // Ensure score is within bounds
    return Math.min(score, 100);
  }

  async generateFitmentAnalysis(ctx: TenantContext, candidateId: number, jobId: number): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const score = await this.calculateCandidateScore(ctx, candidateId, jobId);
    const summary = await this.generateCandidateSummary(ctx, candidateId);
    const skillMatrix = await this.generateSkillMatrix(ctx, candidateId);

    let recommendation = 'poor_match';
    if (score >= 80) {
      recommendation = 'strong_match';
    } else if (score >= 60) {
      recommendation = 'good_match';
    } else if (score >= 40) {
      recommendation = 'fair_match';
    }

    return {
      candidateId,
      jobId,
      overallScore: score,
      recommendation,
      summary,
      skillMatching: skillMatrix,
      analysisDate: new Date().toISOString(),
    };
  }

  async storeParsedResume(
    ctx: TenantContext,
    candidateId: number,
    fileUrl: string,
    extractedText: string,
    fileSizeKb: number
  ): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    // Get current highest version
    const existing = await this.resumeRepo.getByCandidate(ctx, candidateId, { pageSize: 1 });
    const nextVersion = existing.items.length > 0 ? existing.items[0].resume_version + 1 : 1;

    // If this is the first resume, mark it as primary
    const isPrimary = nextVersion === 1;

    const resume = await this.resumeRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: candidateId,
      resume_file_url: fileUrl,
      resume_version: nextVersion,
      is_primary: isPrimary,
      file_size_kb: fileSizeKb,
      extracted_text: extractedText,
    } as any);

    return resume;
  }
}

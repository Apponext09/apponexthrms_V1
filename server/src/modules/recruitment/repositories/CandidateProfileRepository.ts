import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface CandidateSkill {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'expert';
  years_of_experience: number | null;
  created_at: string;
}

export class CandidateSkillRepository extends BaseRepository<CandidateSkill> {
  constructor() {
    super('candidate_skills');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
    });
  }
}

export interface CandidateEducation {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  degree: string;
  field_of_study: string;
  institution: string;
  graduation_year: number | null;
  cgpa: number | null;
  created_at: string;
}

export class CandidateEducationRepository extends BaseRepository<CandidateEducation> {
  constructor() {
    super('candidate_education');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
    });
  }
}

export interface CandidateExperience {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  company_name: string;
  job_title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  currently_working: boolean;
  created_at: string;
}

export class CandidateExperienceRepository extends BaseRepository<CandidateExperience> {
  constructor() {
    super('candidate_experience');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
      sortBy: 'start_date',
      sortOrder: 'desc',
    });
  }
}

export interface CandidateCertification {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  certification_name: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string | null;
  credential_url: string | null;
  created_at: string;
}

export class CandidateCertificationRepository extends BaseRepository<CandidateCertification> {
  constructor() {
    super('candidate_certifications');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
    });
  }
}

export interface CandidateNote {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  note_text: string;
  created_by: number;
  created_at: string;
}

export class CandidateNoteRepository extends BaseRepository<CandidateNote> {
  constructor() {
    super('candidate_notes');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }
}

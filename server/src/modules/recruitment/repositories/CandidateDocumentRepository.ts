import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface CandidateResume {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  resume_file_url: string;
  resume_version: number;
  is_primary: boolean;
  file_size_kb: number | null;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

export class CandidateResumeRepository extends BaseRepository<CandidateResume> {
  constructor() {
    super('candidate_resumes');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
      sortBy: 'resume_version',
      sortOrder: 'desc',
    });
  }

  async getPrimary(ctx: TenantContext, candidateId: number): Promise<CandidateResume | null> {
    return this.query(ctx)
      .where('candidate_id', candidateId)
      .where('is_primary', true)
      .first();
  }
}

export interface CandidateDocument {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  document_type: 'cover_letter' | 'certificate' | 'portfolio' | 'other';
  document_url: string;
  created_at: string;
}

export class CandidateDocumentRepository extends BaseRepository<CandidateDocument> {
  constructor() {
    super('candidate_documents');
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
    });
  }

  async getByType(
    ctx: TenantContext,
    candidateId: number,
    type: string,
    options?: ListQueryOptions
  ) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId, document_type: type },
    });
  }
}

/**
 * Status Mapping & Progression Configuration
 * 
 * Defines the canonical pipeline progression, mappings between
 * `applications.application_status`, `candidates.status`, and dynamic `pipeline_stages`.
 */

export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | 'on_hold';

export type CandidateStatus =
  | 'applied'
  | 'screening'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'dropped';

/**
 * Direct mapping from application_status to candidate_status
 */
export const APPLICATION_TO_CANDIDATE_STATUS_MAP: Record<string, CandidateStatus> = {
  applied: 'applied',
  screening: 'screening',
  assessment: 'assessment',
  interview: 'interview',
  offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
  withdrawn: 'dropped',
  dropped: 'dropped',
  on_hold: 'screening',
};

/**
 * Progression rank to determine the "most advanced / active" status
 * when a candidate has multiple job applications.
 */
export const STATUS_PROGRESSION_RANK: Record<string, number> = {
  hired: 100,
  offer: 80,
  interview: 60,
  assessment: 40,
  screening: 20,
  applied: 10,
  on_hold: 5,
  rejected: 1,
  withdrawn: 0,
  dropped: 0,
};

/**
 * Keywords to match organization-specific dynamic pipeline stages by name
 */
export const APPLICATION_STATUS_STAGE_KEYWORDS: Record<string, string[]> = {
  applied: ['apply', 'applied', 'new', 'sourcing', 'default', 'applicant'],
  screening: ['screen', 'screening', 'review', 'shortlist', 'shortlisted'],
  assessment: ['test', 'assessment', 'exam', 'quiz', 'evaluation'],
  interview: ['interview', 'round', 'tech', 'technical', 'managerial', 'panel', 'hr'],
  offer: ['offer', 'offered', 'selection', 'selected'],
  hired: ['hired', 'joined', 'onboarding', 'closed'],
  rejected: ['reject', 'rejected', 'declined', 'unsuccessful'],
  withdrawn: ['withdraw', 'withdrawn', 'dropped', 'opted out'],
};

/**
 * Deduce ApplicationStatus from a pipeline stage's name and rejection flag
 */
export function mapStageNameToApplicationStatus(
  stageName: string,
  isRejectionStage: boolean = false
): ApplicationStatus {
  if (isRejectionStage) return 'rejected';
  const name = (stageName || '').toLowerCase().trim();
  if (name.includes('reject')) return 'rejected';
  if (name.includes('hire') || name.includes('joined')) return 'hired';
  if (name.includes('offer') || name.includes('select')) return 'offer';
  if (name.includes('interview') || name.includes('round') || name.includes('panel')) return 'interview';
  if (name.includes('assess') || name.includes('test') || name.includes('exam')) return 'assessment';
  if (name.includes('screen') || name.includes('shortlist')) return 'screening';
  if (name.includes('apply') || name.includes('new') || name.includes('source') || name.includes('applicant')) return 'applied';
  return 'applied';
}

/**
 * Resolve the closest matching pipeline stage ID for an organization given an application_status
 */
export function matchStageForStatus(
  stages: Array<{ id: number; stage_name?: string; stageName?: string; is_rejection_stage?: boolean; isRejectionStage?: boolean; sequence_order?: number; sequenceOrder?: number; stage_order?: number; stageOrder?: number }>,
  status: ApplicationStatus
): number | null {
  if (!stages || stages.length === 0) return null;

  if (status === 'rejected') {
    const rejectionStage = stages.find(s => s.is_rejection_stage || s.isRejectionStage || (s.stage_name || s.stageName || '').toLowerCase().includes('reject'));
    if (rejectionStage) return rejectionStage.id;
  }

  const keywords = APPLICATION_STATUS_STAGE_KEYWORDS[status] || [status];

  for (const keyword of keywords) {
    const match = stages.find(s => {
      const name = (s.stage_name || s.stageName || '').toLowerCase();
      return name.includes(keyword);
    });
    if (match) return match.id;
  }

  // Fallback to first non-rejection stage
  const nonRejection = stages.find(s => !s.is_rejection_stage && !s.isRejectionStage);
  return nonRejection ? nonRejection.id : stages[0].id;
}

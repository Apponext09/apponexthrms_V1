import { approvalRepository } from '../repositories/ApprovalRepository';

export class ApprovalService {
  async getDashboardData(organizationId: number, options?: { approverRole?: string, approverId?: number }) {
    const [stats, roleBreakdown, recentApprovals] = await Promise.all([
      approvalRepository.getDashboardStats(organizationId, options),
      approvalRepository.getRoleBreakdown(organizationId),
      approvalRepository.getRecentApprovals(organizationId, 10)
    ]);

    // Format recent approvals for frontend
    const formattedRecentApprovals = recentApprovals.map((req: any) => {
      let parsedDetails = {};
      try {
        if (typeof req.details === 'string') {
          parsedDetails = JSON.parse(req.details);
        } else if (typeof req.details === 'object' && req.details !== null) {
          parsedDetails = req.details;
        }
      } catch (e) {
        // ignore
      }

      return {
        id: req.id,
        uuid: req.uuid,
        applicant: {
          name: req.firstName ? `${req.firstName} ${req.lastName}` : 'Unknown',
          avatarUrl: req.avatarUrl,
          email: req.email,
        },
        moduleType: req.moduleType,
        status: req.status,
        createdAt: req.createdAt,
        details: parsedDetails,
        referenceId: req.referenceId
      };
    });

    return {
      stats,
      roleBreakdown,
      recentApprovals: formattedRecentApprovals
    };
  }
}

export const approvalService = new ApprovalService();

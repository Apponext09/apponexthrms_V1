import { approvalRepository } from '../repositories/ApprovalRepository';

export class ApprovalService {
  async getDashboardData(organizationId: number, options?: { companyId?: number; approverRole?: string; approverId?: number }) {
    const [stats, roleBreakdown, recentApprovals] = await Promise.all([
      approvalRepository.getDashboardStats(organizationId, options),
      approvalRepository.getRoleBreakdown(organizationId, options),
      approvalRepository.getRecentApprovals(organizationId, 20, options)
    ]);

    // Format recent approvals for frontend
    const formattedRecentApprovals = recentApprovals.map((req: any) => {
      let parsedDetails: any = {};
      try {
        if (typeof req.details === 'string') {
          parsedDetails = JSON.parse(req.details);
        } else if (typeof req.details === 'object' && req.details !== null) {
          parsedDetails = req.details;
        }
      } catch (e) {
        // ignore
      }

      const fName = (req.firstName || req.first_name || '').trim();
      const lName = (req.lastName || req.last_name || '').trim();
      const fullCombined = `${fName} ${lName}`.trim();
      const applicantName = (parsedDetails.name && parsedDetails.name !== 'Unknown' && parsedDetails.name !== 'Employee')
        ? parsedDetails.name
        : (fullCombined || req.displayName || req.email?.split('@')[0] || 'Employee');

      const createdAtStr = req.createdAt || req.created_at || new Date().toISOString();

      return {
        id: req.id,
        uuid: req.uuid,
        applicant: {
          name: applicantName,
          avatarUrl: req.avatarUrl || req.avatar_url || null,
          email: req.email || null,
        },
        moduleType: req.moduleType || 'Leave',
        status: req.status || 'Pending',
        createdAt: createdAtStr,
        details: {
          ...parsedDetails,
          name: applicantName,
          department: parsedDetails.department || 'General',
          role: parsedDetails.role || 'Employee',
          type: parsedDetails.type || req.moduleType || 'Leave Application',
          time: parsedDetails.time || (createdAtStr ? new Date(createdAtStr).toLocaleDateString() : ''),
        },
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

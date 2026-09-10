// Shared payslip request queue — uses localStorage to persist across navigations
// Used by: Employee, Manager, Team Lead (to submit) and Admin (to approve)
// SECURITY: Keys are scoped per user ID to prevent cross-org data bleeding.

export interface PayslipRequest {
  id: string;
  requestedBy: string;       // employee name
  requestedById: number;     // employee id
  role: string;              // 'Employee' | 'Manager' | 'Team Lead'
  month: string;             // e.g. '2026-07'
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;       // ISO string
  approvedAt?: string;
}

const LEGACY_KEY = 'apponext_payslip_requests';

/** Returns a user-scoped localStorage key. Falls back to the legacy key only when no userId. */
function storageKey(userId?: number | string): string {
  if (userId) return `apponext_payslip_requests_${userId}`;
  return LEGACY_KEY;
}

/** One-time migration: clear the old global key so stale cross-user data is removed. */
function cleanLegacyKey(): void {
  try {
    if (localStorage.getItem(LEGACY_KEY) !== null) {
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {}
}

export function getPayslipRequests(userId?: number | string): PayslipRequest[] {
  cleanLegacyKey();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPayslipRequest(
  req: Omit<PayslipRequest, 'id' | 'requestedAt' | 'status'>,
  userId?: number | string,
  adminUserId?: number | string
): PayslipRequest {
  const requests = getPayslipRequests(userId);
  const newReq: PayslipRequest = {
    ...req,
    id: `PSR-${Date.now()}`,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  requests.unshift(newReq);
  localStorage.setItem(storageKey(userId), JSON.stringify(requests));

  // Dual-write to admin's queue key so admin can see pending requests
  if (adminUserId) {
    const adminRequests = getPayslipRequests(adminUserId);
    if (!adminRequests.find(r => r.id === newReq.id)) {
      adminRequests.unshift(newReq);
      localStorage.setItem(storageKey(adminUserId), JSON.stringify(adminRequests));
    }
  }

  return newReq;
}

export function updatePayslipRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  userId?: number | string
): void {
  const requests = getPayslipRequests(userId);
  const updated = requests.map(r =>
    r.id === id ? { ...r, status, approvedAt: new Date().toISOString() } : r
  );
  localStorage.setItem(storageKey(userId), JSON.stringify(updated));
}

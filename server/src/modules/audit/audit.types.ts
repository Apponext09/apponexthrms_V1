export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId: string | number;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}

export interface AuditLogRecord {
  id: number;
  organizationId: number;
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

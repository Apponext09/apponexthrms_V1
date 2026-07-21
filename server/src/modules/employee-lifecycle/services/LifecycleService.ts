import { Database } from '@/database';
import { AppError, ValidationError } from '@/lib/errors';
import { NotificationService } from '@/modules/notifications/NotificationService';
import { AuditService } from '@/modules/audit/AuditService';
import { LIFECYCLE_STATES, STATE_TRANSITIONS } from '../constants';

interface LifecycleState {
  currentState: string;
  previousState?: string;
  changedAt: Date;
  changedBy: string;
}

interface TransitionContext {
  employeeId: string;
  organizationId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export class LifecycleService {
  constructor(
    private db: Database,
    private notificationService: NotificationService,
    private auditService: AuditService
  ) {}

  /**
   * Get current lifecycle state of an employee
   */
  async getCurrentState(employeeId: string, organizationId: string): Promise<LifecycleState> {
    const result = await this.db.query(
      `SELECT
        current_state as "currentState",
        previous_state as "previousState",
        state_changed_at as "changedAt",
        state_changed_by as "changedBy"
      FROM lifecycle_state
      WHERE employee_id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [employeeId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Employee lifecycle state not found', 404);
    }

    return result.rows[0];
  }

  /**
   * Transition employee to new state with validation and notifications
   */
  async transitionState(context: TransitionContext, toState: string): Promise<LifecycleState> {
    const { employeeId, organizationId, userId, metadata } = context;

    const currentState = await this.getCurrentState(employeeId, organizationId);
    const validTransitions = STATE_TRANSITIONS[currentState.currentState];

    if (!validTransitions || !validTransitions.includes(toState)) {
      throw new ValidationError(
        `Invalid state transition from ${currentState.currentState} to ${toState}`
      );
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `UPDATE lifecycle_state
        SET
          current_state = $1,
          previous_state = $2,
          state_changed_at = CURRENT_TIMESTAMP,
          state_changed_by = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $4 AND organization_id = $5 AND deleted_at IS NULL
        RETURNING
          current_state as "currentState",
          previous_state as "previousState",
          state_changed_at as "changedAt",
          state_changed_by as "changedBy"`,
        [toState, currentState.currentState, userId, employeeId, organizationId]
      );

      const newState = updateResult.rows[0];

      await this.recordLifecycleEvent({
        employeeId,
        organizationId,
        eventType: `STATE_CHANGE_${toState}`,
        description: `Employee transitioned from ${currentState.currentState} to ${toState}`,
        relatedEntityType: 'lifecycle_state',
        triggeredBy: userId,
      });

      await this.auditService.logChange({
        entityType: 'lifecycle_state',
        entityId: employeeId,
        organizationId,
        action: 'update',
        changes: {
          currentState: { from: currentState.currentState, to: toState },
        },
        userId,
        metadata,
      });

      await this.notificationService.notifyStateChange({
        employeeId,
        organizationId,
        fromState: currentState.currentState,
        toState,
        metadata,
      });

      await client.query('COMMIT');
      return newState;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record lifecycle event for timeline/audit trail
   */
  async recordLifecycleEvent(event: {
    employeeId: string;
    organizationId: string;
    eventType: string;
    description: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    triggeredBy: string;
  }): Promise<any> {
    return await this.db.query(
      `INSERT INTO lifecycle_events (
        employee_id, organization_id, event_type, event_description,
        related_entity_type, related_entity_id, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        event.employeeId,
        event.organizationId,
        event.eventType,
        event.description,
        event.relatedEntityType,
        event.relatedEntityId,
        event.triggeredBy,
      ]
    );
  }

  /**
   * Get complete lifecycle timeline for an employee
   */
  async getLifecycleTimeline(employeeId: string, organizationId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT
        id,
        event_type as "eventType",
        event_description as "eventDescription",
        event_date as "eventDate",
        related_entity_type as "relatedEntityType",
        related_entity_id as "relatedEntityId",
        triggered_by as "triggeredBy"
      FROM lifecycle_events
      WHERE employee_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      ORDER BY event_date DESC`,
      [employeeId, organizationId]
    );

    return result.rows;
  }

  /**
   * Get employment history for an employee
   */
  async getEmploymentHistory(employeeId: string, organizationId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT
        id,
        event_type as "eventType",
        event_date as "eventDate",
        previous_position_id as "previousPositionId",
        new_position_id as "newPositionId",
        previous_ctc as "previousCtc",
        new_ctc as "newCtc",
        details
      FROM employment_history
      WHERE employee_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      ORDER BY event_date DESC`,
      [employeeId, organizationId]
    );

    return result.rows;
  }

  /**
   * Initialize lifecycle state for a new employee
   */
  async initializeLifecycleState(
    employeeId: string,
    organizationId: string,
    userId: string
  ): Promise<LifecycleState> {
    const result = await this.db.query(
      `INSERT INTO lifecycle_state (
        employee_id, organization_id, current_state, state_changed_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING
        current_state as "currentState",
        state_changed_at as "changedAt",
        state_changed_by as "changedBy"`,
      [employeeId, organizationId, LIFECYCLE_STATES.ACTIVE, userId]
    );

    return result.rows[0];
  }

  /**
   * Get employees by current state
   */
  async getEmployeesByState(
    organizationId: string,
    state: string,
    filters?: { departmentId?: string; branchId?: string; limit?: number; offset?: number }
  ): Promise<{ rows: any[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = `
      SELECT e.id, e.first_name, e.last_name, e.email,
        ls.current_state, ls.state_changed_at
      FROM employees e
      JOIN lifecycle_state ls ON e.id = ls.employee_id
      WHERE e.organization_id = $1 AND ls.current_state = $2 AND e.deleted_at IS NULL
    `;

    const params = [organizationId, state];

    if (filters?.departmentId) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(filters.departmentId);
    }

    if (filters?.branchId) {
      query += ` AND e.branch_id = $${params.length + 1}`;
      params.push(filters.branchId);
    }

    const countResult = await this.db.query(
      query.replace('SELECT e.id, e.first_name', 'SELECT COUNT(*) as count'),
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query(
      query + ` LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return { rows: result.rows, total };
  }

  /**
   * Get lifecycle summary dashboard data
   */
  async getLifecycleSummary(organizationId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT
        current_state,
        COUNT(*) as count
      FROM lifecycle_state ls
      JOIN employees e ON ls.employee_id = e.id
      WHERE e.organization_id = $1 AND e.deleted_at IS NULL
      GROUP BY current_state`,
      [organizationId]
    );

    const summary = {
      candidates: 0,
      preboarding: 0,
      onboarding: 0,
      probation: 0,
      confirmed: 0,
      active: 0,
      promoted: 0,
      transferred: 0,
      resigned: 0,
      exited: 0,
      alumni: 0,
    };

    result.rows.forEach((row: any) => {
      const stateKey = row.current_state.toLowerCase();
      if (stateKey in summary) {
        summary[stateKey as keyof typeof summary] = parseInt(row.count, 10);
      }
    });

    return summary;
  }
}

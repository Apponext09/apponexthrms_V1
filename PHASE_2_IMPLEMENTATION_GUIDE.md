# Phase 2 Implementation Guide

## Overview

Phase 2 builds three interdependent engines on top of Phase 1 (Foundation + Auth + RBAC):

1. **Organization Settings Engine** (Module 1) — 15 configuration sections, full CRUD UI
2. **Workflow Engine** (Module 2) — Dynamic approval workflows, backend service layer only this session
3. **Notification Engine** (Module 3) — Multi-channel notifications, backend service layer only this session

**Dependencies:**
- Phase 1 must be complete and running: `npm run dev` boots API + client
- All code follows established patterns: `authenticate → resolveTenant → ipRestriction → requirePermission → validate → controller`
- All mutations are audit-logged via `auditService.log()`
- Notifications auto-triggered by Workflow events via `eventBus`

---

## Part 1: Database Migrations

### Migration File Pattern

Every migration follows the exact Phase 1 Knex style:

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('table_name', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.string('column_name', length).nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.softDeletes('deleted_at');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'code']);
    table.index(['organization_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('table_name');
}
```

**Conventions:**
- `id` BIGINT UNSIGNED PK, `uuid` CHAR(36) UNIQUE for external exposure
- Every tenant-scoped table has `organization_id BIGINT UNSIGNED FK`
- Timestamps: `created_at`, `updated_at` (both auto-defaulted), soft-delete via `deleted_at`
- Indexes on `(organization_id, status)`, `(organization_id, created_at)` where filtering occurs
- Unique constraints: `(organization_id, code)` for business identifiers

### Migration File Locations

Create in `database/migrations/` with timestamp prefix `20260713` (July 13, 2026):

**Module 1 Settings** (18 migrations):
```
20260713000001_create_record_versions.ts         # shared versioning table
20260713000002_create_organization_profiles.ts
20260713000003_create_branches.ts
20260713000004_create_departments.ts
20260713000005_create_designations.ts
20260713000006_create_cost_centers.ts
20260713000007_create_locations.ts
20260713000008_create_work_policies.ts
20260713000009_create_policy_assignments.ts
20260713000010_create_leave_types.ts
20260713000011_create_leave_policies.ts
20260713000012_create_leave_policy_rules.ts
20260713000013_create_attendance_policies.ts
20260713000014_create_payroll_policies.ts
20260713000015_create_notification_preferences.ts
20260713000016_create_branding_settings.ts
20260713000017_create_holiday_calendars.ts
20260713000018_create_holidays.ts
20260713000019_create_org_settings.ts
```

**Module 2 Workflow** (8 migrations):
```
20260713000020_create_workflows.ts
20260713000021_create_workflow_steps.ts
20260713000022_create_workflow_conditions.ts
20260713000023_create_workflow_instances.ts
20260713000024_create_workflow_instance_steps.ts
20260713000025_create_workflow_instance_approvers.ts
20260713000026_create_workflow_delegations.ts
20260713000027_create_workflow_history.ts
```

**Module 3 Notification** (4 migrations):
```
20260713000028_create_notification_templates.ts
20260713000029_create_notifications.ts
20260713000030_create_notification_queue.ts
20260713000031_create_notification_logs.ts
```

### Complete Migration Schemas

#### record_versions (shared by Settings & Notifications)
```typescript
table.bigIncrements('id').primary();
table.uuid('uuid').notNullable().unique();
table.bigInteger('organization_id').notNullable();
table.string('entity_type', 100).notNullable();  // 'branch', 'leave_policy', 'notification_template', etc.
table.string('entity_id', 255).notNullable();    // PK or composite key as string
table.integer('version_number').notNullable();
table.json('snapshot').notNullable();            // full row state
table.enum('change_type', ['create', 'update', 'delete', 'restore']).notNullable();
table.bigInteger('changed_by_user_id').nullable();
table.string('change_reason', 500).nullable();
table.timestamp('created_at').defaultTo(knex.fn.now());
table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
table.foreign('changed_by_user_id').references('id').inTable('users').onDelete('SET NULL');
table.unique(['organization_id', 'entity_type', 'entity_id', 'version_number']);
table.index(['organization_id', 'entity_type', 'entity_id', 'version_number']);
table.index(['organization_id', 'entity_type', 'entity_id', 'created_at']);
```

#### organization_profiles
```typescript
table.bigIncrements('id').primary();
table.uuid('uuid').notNullable().unique();
table.bigInteger('organization_id').notNullable().unique();
table.string('legal_name', 255).nullable();
table.string('registration_number', 100).nullable();
table.string('tax_id', 100).nullable();
table.date('incorporation_date').nullable();
table.string('website', 255).nullable();
table.string('primary_contact_email', 255).nullable();
table.string('primary_contact_phone', 20).nullable();
table.string('address_line1', 255).nullable();
table.string('address_line2', 255).nullable();
table.string('city', 100).nullable();
table.string('state', 100).nullable();
table.string('country', 100).nullable();
table.string('postal_code', 20).nullable();
table.text('about').nullable();
table.json('social_links').nullable();
table.timestamp('created_at').defaultTo(knex.fn.now());
table.timestamp('updated_at').defaultTo(knex.fn.now());
table.softDeletes('deleted_at');
table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
table.index(['organization_id']);
```

#### branches
```typescript
table.bigIncrements('id').primary();
table.uuid('uuid').notNullable().unique();
table.bigInteger('organization_id').notNullable();
table.string('name', 150).notNullable();
table.string('code', 50).notNullable();
table.string('address_line1', 255).nullable();
table.string('address_line2', 255).nullable();
table.string('city', 100).nullable();
table.string('state', 100).nullable();
table.string('country', 100).nullable();
table.string('postal_code', 20).nullable();
table.string('timezone', 50).nullable();
table.string('phone', 20).nullable();
table.string('email', 255).nullable();
table.boolean('is_primary').defaultTo(false);
table.enum('status', ['active', 'inactive']).defaultTo('active');
table.timestamp('created_at').defaultTo(knex.fn.now());
table.timestamp('updated_at').defaultTo(knex.fn.now());
table.softDeletes('deleted_at');
table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
table.unique(['organization_id', 'code']);
table.index(['organization_id', 'status']);
```

*(Continue with similar detailed schemas for all remaining tables — I'll provide abbreviated patterns below for brevity)*

#### departments
```typescript
// PK, uuid, organization_id, name, code, parent_department_id (self-FK), 
// department_head_employee_id, branch_id, cost_center_id, description, status, timestamps, soft-delete
// Unique: (organization_id, code), Indexes: parent_department_id, branch_id, (organization_id, status)
```

#### designations
```typescript
// PK, uuid, organization_id, name, code, department_id, grade, level, description, status, timestamps, soft-delete
// Unique: (organization_id, code), Index: department_id
```

#### cost_centers
```typescript
// PK, uuid, organization_id, name, code, parent_cost_center_id (self-FK), 
// branch_id, budget_amount DECIMAL(15,2), currency CHAR(3), status, timestamps, soft-delete
// Unique: (organization_id, code)
```

#### locations
```typescript
// PK, uuid, organization_id, name, code, branch_id, address fields, 
// latitude DECIMAL(10,7), longitude DECIMAL(10,7), geofence_radius_meters, timezone, status, timestamps, soft-delete
// Unique: (organization_id, code), Index: branch_id
```

#### work_policies
```typescript
// PK, uuid, organization_id, name, code, description
// week_start_day TINYINT, weekly_off_days JSON (array of 0-6 for weekday)
// standard_work_hours_per_day DECIMAL(4,2), standard_work_days_per_week DECIMAL(3,1)
// shift_type ENUM('fixed','flexible','shift_based'), default_start_time, default_end_time, grace_period_minutes
// is_default BOOLEAN, rules JSON (extensible bag), status, timestamps, soft-delete
// Unique: (organization_id, code)
```

#### policy_assignments (polymorphic join table for work/leave/attendance/payroll policies)
```typescript
// PK, uuid, organization_id
// policy_type ENUM('work','leave','attendance','payroll')
// policy_id BIGINT (untyped, app-enforced)
// scope_type ENUM('organization','branch','department','location','designation','employee')
// scope_id BIGINT NULLABLE (null for organization-wide)
// effective_from DATE, effective_to DATE NULLABLE, priority SMALLINT, timestamps, soft-delete
// Index: (organization_id, policy_type, scope_type, scope_id), (organization_id, policy_type, policy_id)
```

#### leave_types
```typescript
// PK, uuid, organization_id, name, code, description
// is_paid BOOLEAN, accrual_frequency ENUM('yearly','monthly','none'), accrual_amount DECIMAL(5,2)
// max_carry_forward_days DECIMAL(5,2), max_encashment_days DECIMAL(5,2)
// requires_document BOOLEAN, allow_negative_balance BOOLEAN
// gender_applicability ENUM('all','male','female','other'), status, timestamps, soft-delete
// Unique: (organization_id, code)
```

#### leave_policies
```typescript
// PK, uuid, organization_id, name, code, description, is_default, status, timestamps, soft-delete
// Unique: (organization_id, code)
```

#### leave_policy_rules (leave-type quotas within a policy)
```typescript
// PK, uuid, organization_id, leave_policy_id FK, leave_type_id FK
// annual_quota_days DECIMAL(5,2)
// accrual_frequency_override, carry_forward_override, timestamps
// Unique: (leave_policy_id, leave_type_id)
```

*(attendance_policies, payroll_policies, similar patterns: status, is_default, complex policy fields, timestamps)*

#### notification_preferences (org-level channel enablement)
```typescript
// PK, uuid, organization_id, category VARCHAR(100), channel ENUM('email','sms','whatsapp','in_app','push')
// is_enabled BOOLEAN, timestamps
// Unique: (organization_id, category, channel)
```

#### branding_settings (1:1 per org)
```typescript
// PK, uuid, organization_id UNIQUE
// primary_color, secondary_color, accent_color VARCHAR(20)
// logo_url, logo_dark_url, favicon_url VARCHAR(512)
// default_theme_mode ENUM('light','dark','system'), custom_css TEXT
// email_header_logo_url, login_background_url VARCHAR(512)
// timestamps, soft-delete
```

#### holiday_calendars
```typescript
// PK, uuid, organization_id, name, year SMALLINT
// applicable_branch_id FK, applicable_location_id FK
// is_default BOOLEAN, status, timestamps, soft-delete
// Unique: (organization_id, name, year, applicable_branch_id)
```

#### holidays
```typescript
// PK, uuid, organization_id, holiday_calendar_id FK, name, date, holiday_type ENUM('public','restricted','optional')
// is_paid BOOLEAN, description, timestamps, soft-delete
// Index: (holiday_calendar_id, date)
```

#### org_settings (generic KV, used ONLY for Fiscal Year)
```typescript
// PK, uuid, organization_id, category, setting_key, setting_value JSON
// data_type ENUM('string','number','boolean','date','json'), description, updated_by_user_id, timestamps
// Unique: (organization_id, category, setting_key)
// Index: (organization_id, category)
```

#### workflows
```typescript
// PK, uuid, organization_id, code, name, entity_type VARCHAR(100) (e.g. 'leave_request', app-enforced)
// description, version INT, is_active BOOLEAN, is_default BOOLEAN, timestamps, soft-delete
// Unique: (organization_id, code, version)
// Index: (organization_id, entity_type, is_active)
```

#### workflow_steps
```typescript
// PK, uuid, organization_id, workflow_id FK
// step_level INT (parallel group ID), step_name
// approver_type ENUM('specific_user','role','reporting_manager_chain','dynamic')
// approver_user_id FK (nullable), approver_role_id FK (nullable), reporting_manager_level SMALLINT
// dynamic_resolver_key VARCHAR(100)
// approval_mode ENUM('any_one','all_must_approve'), inclusion_mode ENUM('always','conditional')
// escalation_after_hours INT, escalation_action ENUM(...), escalation_target_user_id FK, escalation_target_role_id FK
// is_active BOOLEAN, timestamps
// Index: (workflow_id, step_level)
```

*(workflow_conditions, workflow_instances, workflow_instance_steps, workflow_instance_approvers, workflow_delegations, workflow_history — detailed schemas follow same pattern)*

#### notification_templates
```typescript
// PK, uuid, organization_id, template_code, channel ENUM('email','sms','whatsapp','in_app','push')
// name, subject VARCHAR(255) (email only), body_html MEDIUMTEXT (email), body_text TEXT
// variables JSON (documented placeholder keys), is_system BOOLEAN, is_active BOOLEAN
// timestamps, soft-delete
// Unique: (organization_id, template_code, channel)
```

#### notifications (in-app only)
```typescript
// PK, uuid, organization_id, user_id FK, type, title, body, action_url, icon
// related_entity_type, related_entity_id, is_read BOOLEAN, read_at TIMESTAMP NULL, timestamps, soft-delete
// Index: (organization_id, user_id, is_read), (organization_id, user_id, created_at)
```

#### notification_queue
```typescript
// PK, uuid, organization_id, notification_batch_id CHAR(36) (groups multi-channel sends)
// user_id FK, channel ENUM('email','sms','whatsapp','push'), template_code, recipient_address
// variables JSON, rendered_subject, rendered_body
// status ENUM('pending','processing','sent','failed','cancelled'), priority TINYINT
// scheduled_at TIMESTAMP, attempts TINYINT, max_attempts, last_attempted_at, next_retry_at, error_message
// timestamps
// Index: (status, scheduled_at), (organization_id, status), next_retry_at
```

#### notification_logs (append-only)
```typescript
// PK, uuid, organization_id, notification_queue_id FK, user_id FK, channel
// provider VARCHAR(50), provider_message_id, status ENUM('sent','failed','bounced','delivered')
// error_message, attempt_number, sent_at, created_at
// Index: (organization_id, notification_queue_id), (organization_id, created_at), status
```

---

## Part 2: Backend Services & APIs

### Common Patterns

#### BaseRepository Extension
Every Settings/Workflow/Notification repository extends `BaseRepository<T>`:

```typescript
import { BaseRepository } from '@/db/BaseRepository';
import type { Knex } from 'knex';

export class BranchRepository extends BaseRepository<Branch> {
  constructor(private db: Knex) {
    super(db, 'branches');
  }

  async findByCode(code: string, ctx: TenantContext): Promise<Branch | undefined> {
    return this.db(this.tableName)
      .where('code', code)
      .andWhere('organization_id', ctx.organizationId)
      .first()
      .then(this.mapRow);
  }

  // ... other custom queries
}
```

#### Service Pattern
Every service throws AppError subclasses (never returns errors), calls audit service:

```typescript
import { BranchRepository } from './branch.repository';
import { AuditService } from '@/modules/audit/audit.service';
import { ConflictError, NotFoundError } from '@/common/errors';
import type { TenantContext } from '@/db/types';

export class BranchService {
  constructor(
    private branchRepository: BranchRepository,
    private auditService: AuditService
  ) {}

  async createBranch(data: CreateBranchInput, ctx: TenantContext): Promise<Branch> {
    // Check for duplicates
    const existing = await this.branchRepository.findByCode(data.code, ctx);
    if (existing) {
      throw new ConflictError('Branch code already exists', 'DUPLICATE_CODE');
    }

    // Create
    const branch = await this.branchRepository.create(
      {
        organizationId: ctx.organizationId,
        uuid: crypto.randomUUID(),
        name: data.name,
        code: data.code,
        // ... other fields
      },
      ctx
    );

    // Audit
    await this.auditService.log(
      ctx.organizationId,
      'branch',
      branch.id.toString(),
      'create',
      null,
      branch,
      ctx
    );

    return branch;
  }

  async updateBranch(id: number, data: UpdateBranchInput, ctx: TenantContext): Promise<Branch> {
    const branch = await this.branchRepository.getById(id, ctx);
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const before = { ...branch };
    const updated = await this.branchRepository.update(id, data, ctx);

    await this.auditService.log(
      ctx.organizationId,
      'branch',
      id.toString(),
      'update',
      before,
      updated,
      ctx
    );

    return updated;
  }
}
```

#### Versioning Service Pattern
Called after every create/update/delete to snapshot state:

```typescript
export class VersioningService {
  constructor(private db: Knex) {}

  async snapshot(
    organizationId: number,
    entityType: string,
    entityId: string,
    changeType: 'create' | 'update' | 'delete' | 'restore',
    snapshot: Record<string, unknown>,
    actorUserId: number | null,
    changeReason?: string
  ): Promise<RecordVersion> {
    // Get current version number
    const lastVersion = await this.db('record_versions')
      .where('organization_id', organizationId)
      .andWhere('entity_type', entityType)
      .andWhere('entity_id', entityId)
      .orderBy('version_number', 'desc')
      .first();

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

    const version = {
      uuid: crypto.randomUUID(),
      organization_id: organizationId,
      entity_type: entityType,
      entity_id: entityId,
      version_number: nextVersionNumber,
      snapshot,
      change_type: changeType,
      changed_by_user_id: actorUserId,
      change_reason: changeReason || null,
      created_at: new Date(),
    };

    await this.db('record_versions').insert(version);
    return version;
  }
}
```

#### Restore Service Pattern
Two flows: undelete (soft-delete to active) and rollback-to-version:

```typescript
export class RestorableService {
  constructor(
    private db: Knex,
    private versioningService: VersioningService,
    private auditService: AuditService
  ) {}

  async restoreSoftDeleted(
    organizationId: number,
    entityType: string,
    id: number,
    ctx: TenantContext,
    resolveDependencies?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Fetch soft-deleted row
    const row = await this.db(entityType)
      .where('id', id)
      .andWhere('organization_id', organizationId)
      .whereNotNull('deleted_at')
      .first();

    if (!row) throw new NotFoundError(`${entityType} not found or not soft-deleted`);

    // Check FK dependencies
    const dependencies = this.getForeignKeyDependencies(entityType);
    for (const { field, table } of dependencies) {
      if (resolveDependencies?.[field]) continue; // being resolved

      const referencedId = row[field];
      if (!referencedId) continue;

      const referenced = await this.db(table)
        .where('id', referencedId)
        .andWhere('organization_id', organizationId)
        .whereNull('deleted_at')
        .first();

      if (!referenced) {
        throw new ConflictError(
          `Cannot restore: referenced ${table} (id=${referencedId}) is deleted`,
          'RESTORE_BLOCKED_DEPENDENCY',
          { field, table, referencedId }
        );
      }
    }

    // Restore
    const restoredRow = await this.db(entityType)
      .where('id', id)
      .andWhere('organization_id', organizationId)
      .update({ deleted_at: null })
      .returning('*')
      .then(rows => rows[0]);

    // Version snapshot
    await this.versioningService.snapshot(
      organizationId,
      entityType,
      id.toString(),
      'restore',
      restoredRow,
      ctx.userId,
      'undelete'
    );

    // Audit
    await this.auditService.log(
      organizationId,
      entityType,
      id.toString(),
      'restore',
      row,
      restoredRow,
      ctx
    );

    return restoredRow;
  }

  async rollbackToVersion(
    organizationId: number,
    entityType: string,
    id: number,
    versionId: number,
    ctx: TenantContext
  ): Promise<Record<string, unknown>> {
    // Fetch target snapshot
    const version = await this.db('record_versions')
      .where('id', versionId)
      .andWhere('entity_type', entityType)
      .andWhere('entity_id', id.toString())
      .andWhere('organization_id', organizationId)
      .first();

    if (!version) throw new NotFoundError('Version not found');

    // Get current row for "before" state
    const before = await this.db(entityType)
      .where('id', id)
      .andWhere('organization_id', organizationId)
      .first();

    // Apply snapshot (exclude system cols)
    const snapshot = version.snapshot as Record<string, unknown>;
    const toUpdate = Object.fromEntries(
      Object.entries(snapshot).filter(
        ([k]) => !['id', 'uuid', 'organization_id', 'created_at'].includes(k)
      )
    );

    const updated = await this.db(entityType)
      .where('id', id)
      .andWhere('organization_id', organizationId)
      .update(toUpdate)
      .returning('*')
      .then(rows => rows[0]);

    // Snapshot the rollback as a new version
    await this.versioningService.snapshot(
      organizationId,
      entityType,
      id.toString(),
      'update',
      updated,
      ctx.userId,
      `rollback_from_version_${versionId}`
    );

    // Audit
    await this.auditService.log(
      organizationId,
      entityType,
      id.toString(),
      'update',
      before,
      updated,
      ctx
    );

    return updated;
  }

  private getForeignKeyDependencies(entityType: string): Array<{ field: string; table: string }> {
    const deps: Record<string, Array<{ field: string; table: string }>> = {
      branches: [],
      departments: [
        { field: 'branch_id', table: 'branches' },
        { field: 'cost_center_id', table: 'cost_centers' },
      ],
      // ... add per entity type
    };
    return deps[entityType] || [];
  }
}
```

### Workflow Engine Public Interface

```typescript
export class WorkflowService {
  constructor(
    private workflowInstanceRepository: WorkflowInstanceRepository,
    private workflowInstanceStepRepository: WorkflowInstanceStepRepository,
    private workflowInstanceApproverRepository: WorkflowInstanceApproverRepository,
    private workflowHistoryRepository: WorkflowHistoryRepository,
    private workflowResolverService: WorkflowResolverService,
    private eventBus: EventBus,
    private auditService: AuditService
  ) {}

  async startInstance(
    input: {
      organizationId: number;
      workflowCode: string;
      entityType: string;
      entityId: number;
      initiatorUserId: number;
      contextData: Record<string, unknown>;
    },
    ctx: TenantContext
  ): Promise<{ instanceUuid: string; status: WorkflowInstanceStatus }> {
    // 1. Load workflow template (latest is_active version)
    const workflow = await this.db('workflows')
      .where('organization_id', input.organizationId)
      .andWhere('code', input.workflowCode)
      .andWhere('is_active', true)
      .orderBy('version', 'desc')
      .first();

    if (!workflow) {
      throw new NotFoundError('Workflow not found or inactive');
    }

    // 2. Evaluate workflow-level conditions (auto-approve/auto-reject threshold)
    const workflowConditions = await this.db('workflow_conditions')
      .where('workflow_id', workflow.id)
      .whereNull('workflow_step_id')
      .select();

    const conditionMet = await this.workflowResolverService.evaluateConditions(
      workflowConditions,
      input.contextData
    );

    // 3. Create instance
    const instance = {
      uuid: crypto.randomUUID(),
      organization_id: input.organizationId,
      workflow_id: workflow.id,
      entity_type: input.entityType,
      entity_id: input.entityId,
      initiator_user_id: input.initiatorUserId,
      context_data: input.contextData,
      status: 'pending' as const,
      started_at: new Date(),
    };

    const [instanceId] = await this.db('workflow_instances').insert(instance).returning('id');

    // 4. If auto-approve condition met, mark as approved (else materialize steps)
    if (conditionMet?.action === 'auto_approve_workflow') {
      await this.db('workflow_instances')
        .where('id', instanceId)
        .update({ status: 'auto_approved', completed_at: new Date() });

      await this.workflowHistoryRepository.create(
        {
          organization_id: input.organizationId,
          workflow_instance_id: instanceId,
          actor_user_id: null,
          action: 'auto_approved',
          comment: 'Auto-approved by workflow condition',
        },
        ctx
      );

      this.eventBus.emit('workflow.instance.approved', {
        organizationId: input.organizationId,
        instanceUuid: instance.uuid,
        entityType: input.entityType,
        entityId: input.entityId,
        workflowCode: input.workflowCode,
        finalStatus: 'auto_approved',
      });

      return { instanceUuid: instance.uuid, status: 'auto_approved' };
    }

    // 5. Materialize workflow steps (populate workflow_instance_steps + approvers)
    const steps = await this.db('workflow_steps')
      .where('workflow_id', workflow.id)
      .andWhere('is_active', true)
      .orderBy('step_level')
      .select();

    for (const step of steps) {
      const stepConditions = await this.db('workflow_conditions')
        .where('workflow_step_id', step.id)
        .select();

      const shouldInclude = await this.workflowResolverService.evaluateConditions(
        stepConditions,
        input.contextData
      );

      if (shouldInclude?.action === 'skip_step') continue;

      const [stepInstanceId] = await this.db('workflow_instance_steps')
        .insert({
          organization_id: input.organizationId,
          workflow_instance_id: instanceId,
          workflow_step_id: step.id,
          step_level: step.step_level,
          status: 'pending',
          approval_mode: step.approval_mode,
        })
        .returning('id');

      // Resolve concrete approvers
      const approvers = await this.workflowResolverService.resolveApprovers(
        step,
        input.initiatorUserId,
        input.organizationId,
        input.contextData
      );

      for (const approverUserId of approvers) {
        await this.db('workflow_instance_approvers').insert({
          organization_id: input.organizationId,
          workflow_instance_step_id: stepInstanceId,
          approver_user_id: approverUserId,
          action: 'pending',
        });
      }
    }

    // 6. Activate level-1 steps
    const level1Steps = await this.db('workflow_instance_steps')
      .where('workflow_instance_id', instanceId)
      .andWhere('step_level', 1)
      .update({ status: 'in_progress', activated_at: new Date() })
      .returning('id');

    for (const stepId of level1Steps) {
      this.eventBus.emit('workflow.instance.step_activated', {
        organizationId: input.organizationId,
        instanceUuid: instance.uuid,
        stepInstanceId: stepId,
      });
    }

    this.eventBus.emit('workflow.instance.started', {
      organizationId: input.organizationId,
      instanceUuid: instance.uuid,
      entityType: input.entityType,
      entityId: input.entityId,
      workflowCode: input.workflowCode,
    });

    await this.auditService.log(
      input.organizationId,
      'workflow_instance',
      instance.uuid,
      'started',
      null,
      instance,
      ctx
    );

    return { instanceUuid: instance.uuid, status: 'in_progress' };
  }

  async actionStep(
    input: {
      organizationId: number;
      instanceUuid: string;
      stepInstanceId: number;
      approverUserId: number;
      action: 'approve' | 'reject';
      comment?: string;
    },
    ctx: TenantContext
  ): Promise<void> {
    // 1. Load step + instance
    const stepInstance = await this.db('workflow_instance_steps')
      .where('id', input.stepInstanceId)
      .first();

    const instance = await this.db('workflow_instances')
      .where('uuid', input.instanceUuid)
      .andWhere('organization_id', input.organizationId)
      .first();

    // 2. Verify approver is assigned
    const approver = await this.db('workflow_instance_approvers')
      .where('workflow_instance_step_id', input.stepInstanceId)
      .andWhere('approver_user_id', input.approverUserId)
      .first();

    if (!approver) {
      throw new ForbiddenError('You are not an approver on this step');
    }

    // 3. Record action
    await this.db('workflow_instance_approvers')
      .where('id', approver.id)
      .update({
        action: input.action,
        action_comment: input.comment,
        actioned_at: new Date(),
      });

    // 4. Evaluate step resolution (any_one vs all_must_approve)
    const allApprovers = await this.db('workflow_instance_approvers')
      .where('workflow_instance_step_id', input.stepInstanceId)
      .select();

    const approvalMode = stepInstance.approval_mode; // 'any_one' or 'all_must_approve'
    let stepResolved = false;
    let stepFinalAction: 'approve' | 'reject' | null = null;

    if (approvalMode === 'any_one') {
      if (input.action === 'reject') {
        stepResolved = true;
        stepFinalAction = 'reject';
      } else if (input.action === 'approve') {
        stepResolved = true;
        stepFinalAction = 'approve';
      }
    } else if (approvalMode === 'all_must_approve') {
      const rejectCount = allApprovers.filter(a => a.action === 'reject').length;
      const approveCount = allApprovers.filter(a => a.action === 'approve').length;
      const pendingCount = allApprovers.filter(a => a.action === 'pending').length;

      if (rejectCount > 0) {
        stepResolved = true;
        stepFinalAction = 'reject';
      } else if (pendingCount === 0) {
        stepResolved = true;
        stepFinalAction = 'approve';
      }
    }

    // 5. Handle step resolution
    if (stepResolved) {
      const finalStatus = stepFinalAction === 'approve' ? 'approved' : 'rejected';
      await this.db('workflow_instance_steps')
        .where('id', input.stepInstanceId)
        .update({
          status: finalStatus,
          completed_at: new Date(),
        });

      // Log history
      await this.workflowHistoryRepository.create(
        {
          organization_id: input.organizationId,
          workflow_instance_id: instance.id,
          workflow_instance_step_id: input.stepInstanceId,
          actor_user_id: input.approverUserId,
          action: stepFinalAction,
          comment: input.comment,
        },
        ctx
      );

      // If rejected, terminate instance
      if (stepFinalAction === 'reject') {
        await this.db('workflow_instances')
          .where('id', instance.id)
          .update({ status: 'rejected', completed_at: new Date() });

        this.eventBus.emit('workflow.instance.rejected', {
          organizationId: input.organizationId,
          instanceUuid: instance.uuid,
          entityType: instance.entity_type,
          entityId: instance.entity_id,
          workflowCode: await this.db('workflows')
            .where('id', instance.workflow_id)
            .pluck('code')
            .then(c => c[0]),
          finalStatus: 'rejected',
          actorUserId: input.approverUserId,
        });

        return;
      }

      // If approved, check if this was the last step
      const nextSteps = await this.db('workflow_instance_steps')
        .where('workflow_instance_id', instance.id)
        .where('step_level', '>', stepInstance.step_level)
        .select();

      if (nextSteps.length === 0) {
        // Instance complete
        await this.db('workflow_instances')
          .where('id', instance.id)
          .update({ status: 'approved', completed_at: new Date() });

        this.eventBus.emit('workflow.instance.approved', {
          organizationId: input.organizationId,
          instanceUuid: instance.uuid,
          entityType: instance.entity_type,
          entityId: instance.entity_id,
          workflowCode: await this.db('workflows')
            .where('id', instance.workflow_id)
            .pluck('code')
            .then(c => c[0]),
          finalStatus: 'approved',
          actorUserId: input.approverUserId,
        });
      } else {
        // Activate next level steps (parallel group)
        const nextLevel = Math.min(...nextSteps.map(s => s.step_level));
        const levelSteps = nextSteps.filter(s => s.step_level === nextLevel);

        await this.db('workflow_instance_steps')
          .whereIn('id', levelSteps.map(s => s.id))
          .update({ status: 'in_progress', activated_at: new Date() });

        for (const step of levelSteps) {
          this.eventBus.emit('workflow.instance.step_activated', {
            organizationId: input.organizationId,
            instanceUuid: instance.uuid,
            stepInstanceId: step.id,
          });
        }
      }
    } else {
      // Step still pending, log the action
      await this.workflowHistoryRepository.create(
        {
          organization_id: input.organizationId,
          workflow_instance_id: instance.id,
          workflow_instance_step_id: input.stepInstanceId,
          actor_user_id: input.approverUserId,
          action: input.action,
          comment: input.comment,
        },
        ctx
      );
    }
  }

  // ... other public methods: cancelInstance, getInstanceStatus, getInstanceHistory, getPendingApprovalsForUser, registerDynamicResolver
}
```

### Notification Engine Public Interface

```typescript
export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private notificationQueueRepository: NotificationQueueRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private eventBus: EventBus
  ) {}

  async send(input: {
    organizationId: number;
    userId?: number;
    recipientAddress?: string; // email/phone for non-user sends
    type: string; // category, e.g. 'leave.approved'
    channels: ('email' | 'sms' | 'whatsapp' | 'in_app' | 'push')[];
    templateCode: string;
    variables: Record<string, unknown>;
    scheduledAt?: Date;
    relatedEntityType?: string;
    relatedEntityId?: number;
  }): Promise<{ batchId: string }> {
    const batchId = crypto.randomUUID();
    const now = new Date();

    // 1. in_app channel → direct notification insert (sync)
    if (input.channels.includes('in_app')) {
      const template = await this.notificationTemplateRepository.findByCode(
        input.organizationId,
        input.templateCode,
        'in_app'
      );

      const title = this.renderTemplate(template?.name || input.type, input.variables);
      const body = template?.body_text
        ? this.renderTemplate(template.body_text, input.variables)
        : undefined;

      if (input.userId) {
        await this.notificationRepository.create(
          {
            organization_id: input.organizationId,
            user_id: input.userId,
            type: input.type,
            title,
            body,
            action_url: template?.action_url || null,
            icon: template?.icon || null,
            related_entity_type: input.relatedEntityType || null,
            related_entity_id: input.relatedEntityId || null,
            is_read: false,
          },
          { organizationId: input.organizationId, userId: input.userId, sessionUuid: '' }
        );
      }
    }

    // 2. Other channels → queue for async processing
    for (const channel of input.channels) {
      if (channel === 'in_app') continue;

      // Check channel preference
      const pref = await this.db('notification_preferences')
        .where('organization_id', input.organizationId)
        .andWhere('category', input.type)
        .andWhere('channel', channel)
        .first();

      if (pref && !pref.is_enabled) continue; // User opted out

      // Resolve recipient address
      let recipientAddress = input.recipientAddress;
      if (!recipientAddress && input.userId) {
        const user = await this.db('users')
          .where('id', input.userId)
          .select(channel === 'sms' ? 'mobile' : 'email')
          .first();

        recipientAddress = channel === 'sms' ? user?.mobile : user?.email;
      }

      if (!recipientAddress) continue; // No address for this channel

      // Load template
      const template = await this.notificationTemplateRepository.findByCode(
        input.organizationId,
        input.templateCode,
        channel
      );

      // Render template (variables substitution)
      const renderedSubject =
        template?.subject && channel === 'email'
          ? this.renderTemplate(template.subject, input.variables)
          : null;
      const renderedBody = template?.body_html || template?.body_text
        ? this.renderTemplate(template.body_html || template.body_text || '', input.variables)
        : '';

      // Enqueue
      await this.notificationQueueRepository.create(
        {
          organization_id: input.organizationId,
          notification_batch_id: batchId,
          user_id: input.userId || null,
          channel,
          template_code: input.templateCode,
          recipient_address: recipientAddress,
          variables: input.variables,
          rendered_subject: renderedSubject,
          rendered_body: renderedBody,
          status: 'pending',
          priority: 5,
          scheduled_at: input.scheduledAt || now,
          attempts: 0,
          max_attempts: 3,
        },
        { organizationId: input.organizationId, userId: input.userId || 0, sessionUuid: '' }
      );
    }

    return { batchId };
  }

  async markRead(
    organizationId: number,
    userId: number,
    notificationId: number
  ): Promise<void> {
    await this.notificationRepository.update(
      notificationId,
      {
        is_read: true,
        read_at: new Date(),
      },
      { organizationId, userId, sessionUuid: '' }
    );
  }

  async listForUser(
    organizationId: number,
    userId: number,
    page: number = 1,
    pageSize: number = 20,
    isRead?: boolean
  ): Promise<PaginatedResponse<Notification>> {
    let query = this.notificationRepository.baseQuery()
      .where('organization_id', organizationId)
      .andWhere('user_id', userId)
      .whereNull('deleted_at');

    if (isRead !== undefined) {
      query = query.andWhere('is_read', isRead);
    }

    const total = await query.clone().count('* as count').first().then(r => r.count);
    const items = await query
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(variables[key] || '');
    });
  }
}
```

#### Queue Processor
Runs on an interval (15s), processes pending notifications asynchronously:

```typescript
export class NotificationQueueProcessor {
  private processing = false;

  constructor(
    private notificationQueueRepository: NotificationQueueRepository,
    private notificationLogRepository: NotificationLogRepository,
    private emailProvider: EmailProvider,
    private smsProvider: SmsProvider,
    private whatsappProvider: WhatsappProvider,
    private pushProvider: PushProvider,
    private eventBus: EventBus
  ) {
    setInterval(() => this.processQueue(), 15000); // 15 second interval
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Claim pending rows (optimistic lock)
      const rows = await this.db('notification_queue')
        .where('status', 'pending')
        .andWhere('scheduled_at', '<=', new Date())
        .limit(50)
        .update({ status: 'processing' })
        .returning('*');

      for (const row of rows) {
        await this.processRow(row);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processRow(row: NotificationQueue): Promise<void> {
    try {
      let result: { success: boolean; messageId?: string; error?: string };

      switch (row.channel) {
        case 'email':
          result = await this.emailProvider.send({
            to: row.recipient_address,
            subject: row.rendered_subject || '',
            html: row.rendered_body,
          });
          break;
        case 'sms':
          result = await this.smsProvider.send({
            to: row.recipient_address,
            message: row.rendered_body,
          });
          break;
        case 'whatsapp':
          result = await this.whatsappProvider.send({
            to: row.recipient_address,
            message: row.rendered_body,
          });
          break;
        case 'push':
          result = await this.pushProvider.send({
            userId: row.user_id!,
            title: row.rendered_subject || 'Notification',
            body: row.rendered_body,
          });
          break;
        default:
          throw new Error(`Unknown channel: ${row.channel}`);
      }

      if (result.success) {
        // Mark as sent
        await this.db('notification_queue')
          .where('id', row.id)
          .update({
            status: 'sent',
            provider_message_id: result.messageId,
          });

        // Log
        await this.notificationLogRepository.create({
          organization_id: row.organization_id,
          notification_queue_id: row.id,
          user_id: row.user_id,
          channel: row.channel,
          provider: row.channel, // simplified
          status: 'sent',
          attempt_number: row.attempts + 1,
        });

        this.eventBus.emit('notification.sent', {
          organizationId: row.organization_id,
          batchId: row.notification_batch_id,
          channel: row.channel,
        });
      } else {
        // Failed
        const nextRetry = new Date(Date.now() + Math.pow(2, row.attempts) * 60000); // exponential backoff

        if (row.attempts < row.max_attempts - 1) {
          await this.db('notification_queue')
            .where('id', row.id)
            .update({
              status: 'pending',
              attempts: row.attempts + 1,
              last_attempted_at: new Date(),
              next_retry_at: nextRetry,
              error_message: result.error,
            });
        } else {
          await this.db('notification_queue')
            .where('id', row.id)
            .update({
              status: 'failed',
              attempts: row.attempts + 1,
              error_message: result.error,
            });

          this.eventBus.emit('notification.failed', {
            organizationId: row.organization_id,
            batchId: row.notification_batch_id,
            channel: row.channel,
            error: result.error,
          });
        }

        // Log attempt
        await this.notificationLogRepository.create({
          organization_id: row.organization_id,
          notification_queue_id: row.id,
          user_id: row.user_id,
          channel: row.channel,
          status: 'failed',
          error_message: result.error,
          attempt_number: row.attempts + 1,
        });
      }
    } catch (err) {
      // Critical failure — mark as failed
      await this.db('notification_queue')
        .where('id', row.id)
        .update({
          status: 'failed',
          error_message: String(err),
        });
    }
  }
}
```

---

## Part 3: API Endpoints

### Settings Module

All endpoints follow: `authenticate → resolveTenant → ipRestriction → requirePermission → validate → controller`

#### Branches (exemplar CRUD pattern for all 15 sections)

```
POST   /api/v1/settings/branches              # Create
GET    /api/v1/settings/branches              # List (paginated, sortable, filterable)
GET    /api/v1/settings/branches/:id          # Get
PATCH  /api/v1/settings/branches/:id          # Update
DELETE /api/v1/settings/branches/:id          # Soft delete
POST   /api/v1/settings/branches/:id/restore  # Undelete
GET    /api/v1/settings/branches/:id/versions # Version history
GET    /api/v1/settings/branches/:id/versions/:versionId  # View specific version
POST   /api/v1/settings/branches/:id/versions/:versionId/restore  # Rollback to version
```

Response envelope (all endpoints):
```json
{
  "success": true,
  "data": { /* entity or array */ },
  "meta": { "page": 1, "pageSize": 20, "total": 100 }
}
```

#### Company Profile (singleton form)
```
GET    /api/v1/settings/company-profile      # Get current org profile
PATCH  /api/v1/settings/company-profile      # Update
GET    /api/v1/settings/company-profile/versions  # History
POST   /api/v1/settings/company-profile/versions/:versionId/restore  # Rollback
```

#### Notification Preferences (matrix form)
```
GET    /api/v1/settings/notification-preferences  # List all category×channel combos
PUT    /api/v1/settings/notification-preferences  # Bulk upsert (request body: array of {category, channel, is_enabled})
```

#### Email Templates (thin proxy to Notifications module)
```
GET    /api/v1/settings/email-templates      # List (filtered to email channel only)
POST   /api/v1/settings/email-templates      # Create (channel forced to 'email')
GET    /api/v1/settings/email-templates/:id
PATCH  /api/v1/settings/email-templates/:id
DELETE /api/v1/settings/email-templates/:id
```

### Workflow Module

```
POST   /api/v1/workflow/definitions              # Create workflow template
GET    /api/v1/workflow/definitions              # List workflows
GET    /api/v1/workflow/definitions/:id
PATCH  /api/v1/workflow/definitions/:id
DELETE /api/v1/workflow/definitions/:id

POST   /api/v1/workflow/definitions/:id/steps    # Add step to workflow
PATCH  /api/v1/workflow/definitions/:workflowId/steps/:stepId
DELETE /api/v1/workflow/definitions/:workflowId/steps/:stepId

POST   /api/v1/workflow/instances                # Start a new workflow instance
GET    /api/v1/workflow/instances                # List instances (filter by entity type, status)
GET    /api/v1/workflow/instances/:uuid          # Get instance detail (with history)
POST   /api/v1/workflow/instances/:uuid/action   # Approve/reject a step (body: {stepInstanceId, action, comment})
POST   /api/v1/workflow/instances/:uuid/cancel   # Cancel instance
GET    /api/v1/workflow/pending-approvals        # List pending steps awaiting current user's approval

POST   /api/v1/workflow/delegations              # Create a delegation rule
GET    /api/v1/workflow/delegations              # List own delegations
DELETE /api/v1/workflow/delegations/:id          # Revoke delegation
```

### Notification Module

```
GET    /api/v1/notifications/inbox               # List own notifications (paginated, filter read/unread)
POST   /api/v1/notifications/inbox/:id/mark-read # Mark one as read
POST   /api/v1/notifications/inbox/mark-all-read # Mark all as read
GET    /api/v1/notifications/unread-count        # Get count of unread

POST   /api/v1/notifications/send                # Send notification (admin endpoint) [body: {userId, type, channels, templateCode, variables, ...}]
GET    /api/v1/notifications/logs                # View delivery logs (admin)

GET    /api/v1/notifications/templates           # List templates
POST   /api/v1/notifications/templates           # Create
GET    /api/v1/notifications/templates/:id
PATCH  /api/v1/notifications/templates/:id
DELETE /api/v1/notifications/templates/:id
POST   /api/v1/notifications/templates/:id/restore
```

---

## Part 4: Frontend (React) — Settings Module Only

### Pages needed:

1. **CRUD List Pages** (12 total): each has a table + "Add" button + inline actions (edit, delete, restore)
   - BranchesListPage.tsx
   - DepartmentsListPage.tsx
   - DesignationsListPage.tsx
   - CostCentersListPage.tsx
   - LocationsListPage.tsx
   - WorkPoliciesListPage.tsx
   - LeaveTypesListPage.tsx
   - LeavePoliciesListPage.tsx
   - AttendancePoliciesListPage.tsx
   - PayrollPoliciesListPage.tsx
   - EmailTemplatesListPage.tsx
   - HolidayCalendarsListPage.tsx

2. **Detail/Edit Pages** (where applicable):
   - CompanyProfilePage.tsx (singleton form, no list view)
   - BrandingSettingsPage.tsx (singleton form)
   - FiscalYearSettingsPage.tsx (singleton form)
   - NotificationPreferencesPage.tsx (matrix/grid form, no CRUD)

3. **Shared Components**:
   - VersionHistoryPanel.tsx (mounted in detail page, shows timeline of versions + diff view)
   - RestoreConfirmModal.tsx (surfaces FK-dependency conflicts on restore)
   - PolicyAssignmentEditor.tsx (shared by work/leave/attendance/payroll policy forms)
   - HolidayListEditor.tsx (inline holidays table within calendar detail)

### Zustand Store (if needed at all — most State is React Query)

```typescript
// features/settings/store/settingsStore.ts
import { create } from 'zustand';

interface SettingsUIState {
  selectedSectionId: string; // which of the 15 sections is open
  editingResourceId: number | null; // which resource is being edited (null = add new)
  showRestoreModal: boolean;
  restoreConflicts: Array<{ field: string; referencedTable: string; referencedId: number }> | null;

  setSectionId: (id: string) => void;
  setEditingResourceId: (id: number | null) => void;
  setShowRestoreModal: (show: boolean) => void;
  setRestoreConflicts: (conflicts: any) => void;
}

export const useSettingsStore = create<SettingsUIState>((set) => ({
  selectedSectionId: 'company-profile',
  editingResourceId: null,
  showRestoreModal: false,
  restoreConflicts: null,

  setSectionId: (id) => set({ selectedSectionId: id }),
  setEditingResourceId: (id) => set({ editingResourceId: id }),
  setShowRestoreModal: (show) => set({ showRestoreModal: show }),
  setRestoreConflicts: (conflicts) => set({ restoreConflicts: conflicts }),
}));
```

### React Query Hooks (pattern for all 15 sections)

```typescript
// features/settings/hooks/useBranches.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchesApi } from '../api/branches.api';
import type { Branch } from '@apponexthrms/shared';

const BRANCHES_QUERY_KEY = ['settings', 'branches'];

export function useBranches(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...BRANCHES_QUERY_KEY, page, pageSize],
    queryFn: () => branchesApi.list({ page, pageSize }),
  });
}

export function useBranch(id: number) {
  return useQuery({
    queryKey: [...BRANCHES_QUERY_KEY, id],
    queryFn: () => branchesApi.get(id),
    enabled: !!id,
  });
}

export function useBranchVersions(id: number) {
  return useQuery({
    queryKey: [...BRANCHES_QUERY_KEY, id, 'versions'],
    queryFn: () => branchesApi.getVersions(id),
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBranchInput }) =>
      branchesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...BRANCHES_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: branchesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });
    },
  });
}

export function useRestoreBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolveDependencies }: { id: number; resolveDependencies?: Record<string, unknown> }) =>
      branchesApi.restore(id, resolveDependencies),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...BRANCHES_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });
    },
  });
}

export function useRollbackBranchVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, versionId }: { id: number; versionId: number }) =>
      branchesApi.rollbackVersion(id, versionId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...BRANCHES_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });
    },
  });
}
```

### Form Component Pattern (BranchFormModal.tsx)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBranchSchema, updateBranchSchema } from '@apponexthrms/shared';
import { useCreateBranch, useUpdateBranch } from '../hooks/useBranches';

export function BranchFormModal({ isOpen, onClose, initialData }: Props) {
  const { mutate: create, isPending: isCreating } = useCreateBranch();
  const { mutate: update, isPending: isUpdating } = useUpdateBranch();

  const isEditing = !!initialData;
  const schema = isEditing ? updateBranchSchema : createBranchSchema;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
  });

  const onSubmit = (data: any) => {
    if (isEditing) {
      update({ id: initialData.id, data }, {
        onSuccess: () => onClose(),
      });
    } else {
      create(data, {
        onSuccess: () => onClose(),
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Branch' : 'New Branch'}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input label="Name" {...register('name')} error={errors.name?.message} />
        <Input label="Code" {...register('code')} error={errors.code?.message} />
        {/* more fields */}
        <Button type="submit" disabled={isCreating || isUpdating}>
          {isCreating || isUpdating ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Modal>
  );
}
```

---

## Conclusion

This guide provides the complete specification, patterns, and examples for Phase 2. Every file referenced here has a concrete template you can follow to generate the rest. The key invariants are:

1. **Multi-tenancy**: every query auto-scopes to `organization_id` via BaseRepository
2. **Versioning**: every mutation snapshots via `versioningService.snapshot()`
3. **Audit logging**: every mutation writes an `audit_logs` row
4. **Error handling**: consistent ApiResponse envelope, all errors through middleware
5. **Events**: services emit to `eventBus`; Notification engine subscribes to Workflow events
6. **Validation**: Zod schemas from `shared/`, reused client+server
7. **UI**: Settings pages follow CRUD pattern with shared version/restore components

Good luck implementing! 🚀

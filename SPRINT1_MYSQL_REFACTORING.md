# Sprint 1: Interview Management - MySQL Schema Refactoring

**Date**: 2026-07-20  
**Status**: REFACTORED & READY FOR TESTING  
**Database**: MySQL (from PostgreSQL)  

---

## Executive Summary

Sprint 1 implementation has been completely refactored to use the **actual MySQL database schema** as the single source of truth. All code has been updated from PostgreSQL syntax to MySQL syntax, and all field mappings have been corrected to match the existing `interview_schedules` table.

**Key Changes**:
- ✅ PostgreSQL → MySQL query syntax (`$1, $2` → `?`)
- ✅ Table: `interviews` → `interview_schedules` (existing MySQL table)
- ✅ Column: `candidate_id` → `applicant_id` (matches MySQL)
- ✅ Column: `scheduled_date` → `interview_date` (matches MySQL)
- ✅ Added: `job_opening_id` requirement (MySQL FK requirement)
- ✅ Interview types: `'phone'` → `'phone_screen'` (MySQL ENUM value)
- ✅ UUID primary keys → BIGINT UNSIGNED with AUTO_INCREMENT
- ✅ Removed: Fields not in MySQL schema (location, recommendation)
- ✅ All queries use parameterized placeholders (`?`)

---

## MySQL Schema Mapping

### interview_schedules Table (Source of Truth)

```sql
CREATE TABLE interview_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  organization_id BIGINT UNSIGNED NOT NULL,
  applicant_id BIGINT UNSIGNED NOT NULL,  -- FK to job_applicants
  job_opening_id BIGINT UNSIGNED NOT NULL,  -- FK to job_openings
  interview_type ENUM('phone_screen', 'technical', 'hr', 'manager', 'final'),
  round_number INT DEFAULT 1,
  interviewer_id BIGINT UNSIGNED,  -- FK to users
  interview_date DATETIME,
  duration_minutes INT,
  feedback LONGTEXT,
  rating DECIMAL(3,2),
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  ...
)
```

### Code-to-Database Mapping

| Concept | Old (PostgreSQL) | New (MySQL) | Type |
|---------|------------------|------------|------|
| Table | interviews | interview_schedules | String |
| PK Type | UUID | BIGINT UNSIGNED | Number |
| Candidate | candidate_id | applicant_id | FK Number |
| Candidate Table | candidates | job_applicants | Table |
| Job Posting | (not in schema) | job_opening_id | FK Number (NEW) |
| Interview Date | scheduled_date | interview_date | DateTime |
| Location | location (column) | (removed - not in schema) | N/A |
| Recommendation | recommendation (column) | (removed - not in schema) | N/A |
| Phone Type | 'phone' | 'phone_screen' | ENUM |
| Status Values | scheduled, completed, rejected, passed | scheduled, completed, cancelled | ENUM |

---

## Files Refactored

### Backend Services

**File**: `server/src/modules/employee-lifecycle/services/InterviewService.ts`

**Changes**:
- ✅ Input types: Changed all IDs from `string` → `number`
- ✅ Renamed: `candidateId` → `applicantId`
- ✅ Renamed: `scheduledDate` → `interviewDate`
- ✅ Added: `jobOpeningId: number` (required by MySQL schema)
- ✅ Removed: `location`, `notes` fields (not in MySQL)
- ✅ All queries use `?` placeholders (MySQL syntax)
- ✅ Validation: Updated to check `job_applicants` instead of `candidates`
- ✅ Validation: Added `job_openings` table check
- ✅ Interview types: Validate against `['phone_screen', 'technical', 'hr', 'manager', 'final']`
- ✅ Status values: Only `['scheduled', 'completed', 'cancelled']` (matches MySQL ENUM)
- ✅ Rating: DECIMAL(3,2) format (1-5 scale validation preserved)
- ✅ Method renamed: `getInterviewsByCandidate()` → `getInterviewsByApplicant()`
- ✅ All db.query() calls return arrays (MySQL driver returns arrays, not `result.rows`)

**Example Query Update**:
```typescript
// PostgreSQL (old)
`SELECT id FROM candidates WHERE id = $1 AND organization_id = $2`

// MySQL (new)
`SELECT id FROM job_applicants WHERE id = ? AND organization_id = ?`
```

### Backend Routes

**File**: `server/src/modules/employee-lifecycle/routes/InterviewRoutes.ts`

**Changes**:
- ✅ All parameter names updated: `candidateId` → `applicantId`
- ✅ All parameter types: `string` → `number` for IDs
- ✅ Route endpoint: `/candidate/:candidateId` → `/applicant/:applicantId`
- ✅ Zod validation schemas updated to match MySQL schema
- ✅ Interview type enum: `['phone_screen', 'technical', 'hr', 'manager', 'final']`
- ✅ Status enum: `['scheduled', 'completed', 'cancelled']`
- ✅ Rating validation: `z.number().int().min(1).max(5)`
- ✅ Feedback validation: `z.string().min(10).max(65535)` (LONGTEXT limit)
- ✅ Removed: `recommendation` field from request/response
- ✅ Removed: `location` field from requests
- ✅ All numeric parameters: `Number(param)` conversion
- ✅ Pagination bounds: `Math.min(limit, 500)` to prevent DOS

### Frontend Components

**File**: `client/src/features/employee-lifecycle/pages/InterviewSchedulerPage.tsx`

**Changes**:
- ✅ Interface: `candidateId` → `applicantId`
- ✅ Interface: `candidateName` → `applicantName`
- ✅ Interface: `scheduledDate` → `interviewDate`
- ✅ Removed: `location` field
- ✅ Removed: `recommendation` field
- ✅ Removed: `notes` field
- ✅ Mock data: Updated to use new field names and numeric IDs
- ✅ Interview type: Updated to use `'phone_screen'` instead of `'phone'`

**File**: `client/src/features/employee-lifecycle/components/InterviewScheduleForm.tsx`

**Changes**:
- ✅ Form state: `candidateName` → `applicantName`
- ✅ Form state: `candidateId` → `applicantId`
- ✅ Form state: `scheduledDate/scheduledTime` → `interviewDate/interviewTime`
- ✅ Added: `jobOpeningId` input field (required by MySQL)
- ✅ Removed: `location` field
- ✅ Removed: `notes` field
- ✅ All inputs: Number parsing where appropriate
- ✅ Interview types: Updated to match MySQL ENUM
- ✅ Form submission: Constructs correct payload with new field names

**File**: `client/src/features/employee-lifecycle/components/InterviewFeedbackForm.tsx`

**Changes**:
- ✅ Removed: `recommendation` field (not in MySQL schema)
- ✅ Removed: `interviewNotes` field
- ✅ Kept: `feedback` (LONGTEXT) and `rating` (DECIMAL)
- ✅ Form state simplified: Only `{ feedback, rating }`
- ✅ Removed: Radio buttons for recommendation
- ✅ Removed: Additional notes textarea

### Constants & Configuration

**File**: `server/src/modules/employee-lifecycle/constants.ts`

**Changes**:
- ✅ `INTERVIEW_TYPES.PHONE` → `INTERVIEW_TYPES.PHONE_SCREEN: 'phone_screen'`
- ✅ Removed: `INTERVIEW_STATUSES.REJECTED`, `INTERVIEW_STATUSES.PASSED`
- ✅ Kept: `INTERVIEW_STATUSES = { SCHEDULED, COMPLETED, CANCELLED }`
- ✅ Removed: `CANDIDATE_STATUSES` references (using `job_applicants`)

---

## Query Examples - Before & After

### Create Interview

**PostgreSQL (OLD)**:
```typescript
`INSERT INTO interviews (
  candidate_id, organization_id, interview_type, scheduled_date,
  location, interviewer_id, round_number, status, created_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, candidate_id as "candidateId", ...`
```

**MySQL (NEW)**:
```typescript
`INSERT INTO interview_schedules (
  organization_id, applicant_id, job_opening_id, interview_type,
  interview_date, interviewer_id, round_number, status, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
```

### List Interviews

**PostgreSQL (OLD)**:
```typescript
WHERE organization_id = $1 AND deleted_at IS NULL
AND candidate_id = $${params.length + 1}
ORDER BY scheduled_date DESC LIMIT ${limit} OFFSET ${offset}
```

**MySQL (NEW)**:
```typescript
WHERE organization_id = ? AND deleted_at IS NULL
AND applicant_id = ?
ORDER BY interview_date DESC LIMIT ? OFFSET ?
```

### Get Interview

**PostgreSQL (OLD)**:
```typescript
SELECT id, candidate_id as "candidateId", interview_type as "interviewType",
       scheduled_date as "scheduledDate", location, ...
FROM interviews
WHERE id = $1 AND organization_id = $2
```

**MySQL (NEW)**:
```typescript
SELECT id, applicant_id as applicantId, interview_type as interviewType,
       interview_date as interviewDate, ...
FROM interview_schedules
WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
```

---

## Type Conversions

### ID Types

| Old | New | Reason |
|-----|-----|--------|
| `string` (UUID) | `number` (BIGINT) | MySQL uses AUTO_INCREMENT integers |
| `createdBy: string` | `createdBy: number` | MySQL users table uses BIGINT |
| `interviewerId: string` | `interviewerId: number` | MySQL users table uses BIGINT |

### Date/Time Types

| Old | New | Reason |
|-----|-----|--------|
| `Date` (JavaScript) | `Date` → MySQL DATETIME | MySQL DATETIME format |
| `scheduled_date` | `interview_date` | Actual column name in MySQL |

### Enum Values

| Old | New | Reason |
|-----|-----|--------|
| `'phone'` | `'phone_screen'` | MySQL ENUM definition |
| `'rejected'`, `'passed'` | (removed) | Not in MySQL ENUM |

---

## API Contract Changes

### Request/Response Payloads

**Create Interview Request (NEW)**:
```json
{
  "applicantId": 101,
  "jobOpeningId": 5,
  "interviewType": "phone_screen",
  "interviewDate": "2024-01-20T10:00:00Z",
  "interviewerId": 42,
  "roundNumber": 1
}
```

**Interview Response (NEW)**:
```json
{
  "id": 1,
  "organizationId": 1,
  "applicantId": 101,
  "jobOpeningId": 5,
  "interviewType": "phone_screen",
  "interviewDate": "2024-01-20T10:00:00Z",
  "interviewerId": 42,
  "roundNumber": 1,
  "status": "scheduled",
  "rating": null,
  "feedback": null,
  "createdAt": "2024-01-18T14:30:00Z"
}
```

**Submit Feedback Request (NEW)**:
```json
{
  "feedback": "Candidate demonstrated strong technical skills...",
  "rating": 4
}
```

**Removed Fields**:
- `location` (not in MySQL)
- `recommendation` (not in MySQL)
- `notes` (not in MySQL)
- `candidateId` (now `applicantId`)
- `scheduledDate` (now `interviewDate`)

---

## Database Connection

All queries now use MySQL-compatible syntax with `?` placeholders:

```typescript
// Database connection expects MySQL query format
this.db.query(
  `SELECT * FROM interview_schedules WHERE id = ? AND organization_id = ?`,
  [interviewId, organizationId]
)
```

**Assumption**: The database connection pool at `@/database` supports MySQL and handles:
- `?` placeholder substitution
- Returning results as array of objects (not `result.rows`)
- `affectedRows` property for UPDATE/DELETE operations
- `insertId` property for INSERT operations

---

## Validation Updates

### Interview Input Validation

```typescript
// Interview types - now matches MySQL ENUM
const validTypes = ['phone_screen', 'technical', 'hr', 'manager', 'final'];

// Status validation - matches MySQL ENUM
const validStatuses = ['scheduled', 'completed', 'cancelled'];

// Rating validation - DECIMAL(3,2) allows 1-5 range
if (input.rating < 1 || input.rating > 5) {
  throw new ValidationError('Rating must be between 1 and 5');
}

// Foreign keys - validates against actual MySQL tables
const applicantResult = await db.query(
  `SELECT id FROM job_applicants WHERE id = ? AND organization_id = ?`,
  [input.applicantId, input.organizationId]
);

const jobOpeningResult = await db.query(
  `SELECT id FROM job_openings WHERE id = ? AND organization_id = ?`,
  [input.jobOpeningId, input.organizationId]
);
```

---

## Testing & Verification

### Ready for Runtime Testing

✅ All files refactored to use MySQL schema  
✅ All SQL queries use `?` placeholders  
✅ All ID types converted from UUID to number  
✅ All table and column names map to actual MySQL schema  
✅ All ENUM values match MySQL definitions  
✅ All foreign key validations reference correct tables  
✅ All API contracts updated  
✅ All frontend components updated  

### Next Steps

1. **Start MySQL Server** - Ensure database is running
2. **Connect to Database** - Verify `.env` connection string
3. **Run Database Migrations** - Ensure `interview_schedules` table exists
4. **Start Backend Server** - `npm run dev` in server directory
5. **Start Frontend** - `npm run dev` in client directory
6. **Test API Endpoints** - Run through complete interview workflow:
   - Create interview
   - List interviews
   - Get interview details
   - Update interview
   - Submit feedback
   - Update status
7. **Test Frontend UI** - Verify forms render and submit correctly
8. **Run Tests** - Execute unit tests and integration tests

---

## Breaking Changes Summary

| Component | Breaking Change | Migration |
|-----------|-----------------|-----------|
| API Routes | `/candidate/:id` → `/applicant/:id` | Update client calls |
| Request DTOs | `candidateId` → `applicantId` | Update request payloads |
| Response DTOs | `scheduledDate` → `interviewDate` | Update response parsing |
| Enum Values | `'phone'` → `'phone_screen'` | Update form selects |
| Database | UUID PK → BIGINT PK | Update ID handling |

---

## Success Criteria - Ready for QA

- ✅ All files refactored to MySQL syntax
- ✅ All field names match `interview_schedules` table
- ✅ All data types match MySQL column types
- ✅ All ENUM values match MySQL definitions
- ✅ All foreign keys reference correct tables
- ✅ All API endpoints updated
- ✅ All frontend components updated
- ✅ No PostgreSQL syntax remains in production code
- ⏳ Runtime verification pending (database execution tests)

---

## Conclusion

Sprint 1 (Interview Management) has been **completely refactored to be MySQL-compliant** using the actual production database schema as the single source of truth. The implementation is ready for runtime testing against the MySQL database.

**Status**: ✅ Code Refactoring Complete | ⏳ Awaiting Runtime Verification


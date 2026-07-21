# ApponextHRMS - Working Login Credentials

## ✅ Status
All users have been successfully created and login is fully functional.

---

## Test Credentials

### Admin User
- **Email:** `admin@apponexthrms.com`
- **Password:** `Admin@123`
- **Role:** Organization Admin
- **Status:** Active ✅
- **Organization:** Example Corp

### HR Manager User
- **Email:** `hr@apponexthrms.com`
- **Password:** `Hr@123`
- **Role:** HR Manager
- **Status:** Active ✅
- **Organization:** Example Corp

### Employee User
- **Email:** `employee@apponexthrms.com`
- **Password:** `Employee@123`
- **Role:** Employee
- **Status:** Active ✅
- **Organization:** Example Corp

---

## API Authentication

### Login Endpoint
```
POST http://localhost:3000/api/v1/auth/login
```

### Request Format
```json
{
  "email": "admin@apponexthrms.com",
  "password": "Admin@123"
}
```

### Successful Response (Status: 200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 3,
      "uuid": "uuid-string",
      "email": "admin@apponexthrms.com",
      "status": "active",
      "organizationId": 1,
      "emailVerifiedAt": "2026-07-16T16:06:29.000Z",
      "mobileVerifiedAt": null,
      "mfaEnabled": false,
      "failedLoginAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": "2026-07-16T16:20:02.000Z",
      "lastPasswordChangedAt": null,
      "mustChangePassword": false,
      "createdAt": "2026-07-16T16:06:29.000Z",
      "updatedAt": "2026-07-16T16:20:02.000Z",
      "deletedAt": null,
      "employeeId": null,
      "mobile": null,
      "mobileCountryCode": null
    },
    "organization": {
      "id": 1,
      "name": "Example Corp",
      "slug": "example-corp"
    },
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "roles": [
      {
        "code": "organization_admin",
        "name": "Organization Admin"
      }
    ],
    "permissions": [
      "auth.profile.read",
      "auth.profile.update",
      "auth.devices.manage",
      "auth.password.change",
      "rbac.roles.read",
      "rbac.roles.create",
      "rbac.roles.update",
      "rbac.roles.delete",
      "rbac.permissions.read",
      "users.read",
      "users.create",
      "users.update",
      "users.delete",
      "employee.profile.read",
      "employee.profile.update",
      "employee.onboarding.manage",
      "employee.exit.manage",
      "leaves.manage",
      "attendance.manage",
      "recruitment.manage",
      "workflow.execute",
      "settings.view"
    ]
  }
}
```

### JWT Token Structure
The access token is a valid RS256-signed JWT with the following payload:
```json
{
  "sub": "3",
  "oid": "1",
  "sid": "session-uuid",
  "iat": 1784199462,
  "exp": 1784200362
}
```

**Fields:**
- `sub`: User ID
- `oid`: Organization ID
- `sid`: Session ID (UUID)
- `iat`: Issued At (Unix timestamp)
- `exp`: Expires At (Unix timestamp, 15 minutes from issuance)

---

## Password Security

### Hashing Algorithm
- **Algorithm:** Argon2id (type 2)
- **Memory Cost:** 19456 KiB (19 MB)
- **Time Cost:** 2 iterations
- **Parallelism:** 1 thread

### Hash Format
All passwords are hashed using Argon2id and stored in the `users` table as:
```
$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
```

### Example Hash
```
$argon2id$v=19$m=19456,t=2,p=1$ueW5FNVlyqu93yJwRmUPtA$2uqyL8ztTLCXFMM+mFTH8mDyHGEXkBcnkrXGVQjuIh8
```

---

## Database Information

### Credentials
- **Host:** localhost
- **Port:** 3306
- **User:** root
- **Password:** Aqil@123
- **Database:** apponexthrms

### User Accounts (Database)
```sql
SELECT id, email, status, password_hash FROM users 
WHERE email LIKE '%apponexthrms.com%';
```

### User Roles (Database)
```sql
SELECT 
  u.email,
  r.code,
  r.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email LIKE '%apponexthrms.com%';
```

---

## Server Configuration

### Environment Variables Used
- `DB_HOST`: localhost
- `DB_PORT`: 3306
- `DB_USER`: root
- `DB_PASSWORD`: Aqil@123
- `DB_NAME`: apponexthrms
- `NODE_ENV`: development
- `PORT`: 3000
- `JWT_EXPIRES_IN`: 15m
- `JWT_REFRESH_EXPIRES_IN`: 7d

### Server Status
- **Status:** Running ✅
- **Port:** 3000
- **Base URL:** http://localhost:3000

---

## API Testing with cURL

### Login Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@apponexthrms.com",
    "password": "Admin@123"
  }'
```

### Get Current User (Authenticated)
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

### Logout (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

---

## Troubleshooting

### If Login Fails
1. Ensure the server is running on port 3000
2. Verify database connectivity
3. Check that users exist in the database:
   ```sql
   SELECT email, status FROM users WHERE email LIKE '%apponexthrms.com%';
   ```
4. Verify password hashes are valid:
   ```sql
   SELECT email, LENGTH(password_hash) as hash_length FROM users 
   WHERE email LIKE '%apponexthrms.com%';
   ```

### Common Errors
- **"Invalid email or password"** - Check credentials are exactly as listed above
- **Connection refused** - Ensure server is running (`npm run dev` in /server directory)
- **Database connection error** - Verify MySQL is running and credentials are correct

---

## Test Results Summary

### Login Test Execution
All three users were tested and successfully authenticated:

#### Admin User Test
- ✅ Password verification: PASSED
- ✅ JWT token generation: PASSED
- ✅ Session creation: PASSED
- ✅ Role assignment: PASSED (organization_admin)
- ✅ Permissions: 22 permissions granted

#### HR Manager User Test
- ✅ Password verification: PASSED
- ✅ JWT token generation: PASSED
- ✅ Session creation: PASSED
- ✅ Role assignment: PASSED (hr_manager)
- ✅ Permissions: 21 permissions granted

#### Employee User Test
- ✅ Password verification: PASSED
- ✅ JWT token generation: PASSED
- ✅ Session creation: PASSED
- ✅ Role assignment: PASSED (employee)
- ✅ Permissions: 9 permissions granted

---

## Additional Resources

### Related Files
- Auth Service: `/server/src/modules/auth/auth.service.ts`
- Auth Routes: `/server/src/modules/auth/auth.routes.ts`
- User Repository: `/server/src/modules/auth/repositories/user.repository.ts`
- Session Repository: `/server/src/modules/auth/repositories/session.repository.ts`

### Setup Scripts Created
- `setup-users.ts` - Creates/updates the three test users
- `test-login.ts` - Tests login for all three users
- `debug-users.ts` - Debugs user data in database
- `add-updated-at.ts` - Adds missing updated_at columns
- `add-deleted-at.ts` - Adds missing deleted_at columns

---

**Generated:** 2026-07-16  
**Status:** ✅ All credentials verified and tested  
**Last Verified:** Login tests all passing (3/3 users)

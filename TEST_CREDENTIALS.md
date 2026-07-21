# ApponextHRMS - Test Credentials & Runbook

## Test Login Credentials

All test users are created in the **Demo Organization** (`demo-org`) during seeding.

### Admin User
```
Email:    admin@apponexthrms.local
Password: Admin@2024!
Role:     organization_admin
Access:   All modules, all permissions
```

### HR Manager
```
Email:    hr@apponexthrms.local
Password: HR@2024!
Role:     hr_manager
Access:   HR modules, recruitment, payroll, compliance
```

### Department Head
```
Email:    depthead@apponexthrms.local
Password: Manager@2024!
Role:     department_head
Access:   Employee management, attendance, leave approval
```

### Team Manager
```
Email:    manager@apponexthrms.local
Password: Manager@2024!
Role:     manager
Access:   Team attendance, leave approval, performance reviews
```

### Employee
```
Email:    employee@apponexthrms.local
Password: Employee@2024!
Role:     employee
Access:   Own attendance, leave application, payslips
```

### Recruiter
```
Email:    recruiter@apponexthrms.local
Password: Recruiter@2024!
Role:     recruiter
Access:   Recruitment, job postings, candidates, interviews
```

---

## Database Credentials

```
Host:     localhost
Port:     3306
Database: apponexthrms
Username: apponexthrms
Password: ApponextHRMS@2024
```

### Test Database (for unit tests)
```
Database: apponexthrms_test
Username: apponexthrms
Password: ApponextHRMS@2024
```

---

## API Testing Credentials

### Register New Organization
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test Company",
    "slug": "test-company",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@testcompany.com",
    "password": "TestCompany@2024!"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@apponexthrms.local",
    "password": "Admin@2024!"
  }'
```

Response contains:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... },
  "organization": { ... },
  "permissions": [ ... ],
  "roles": [ ... ]
}
```

### Use Access Token
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Quick Start Runbook

### 1. Prerequisites Check
```bash
# Verify Node.js
node --version
# Expected: v18.0.0 or higher

# Verify npm
npm --version
# Expected: v9.0.0 or higher

# Verify MySQL
mysql --version
# Expected: mysql  Ver 8.0.x or higher
```

### 2. Setup & Installation (First Time Only)
```bash
# Clone or navigate to project
cd /path/to/ApponextHRMS

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Generate JWT keys
mkdir -p server/keys
openssl genrsa -out server/keys/private.key 2048
openssl rsa -in server/keys/private.key -pubout -out server/keys/public.key
```

### 3. Database Setup (First Time Only)
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE apponexthrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create test database
mysql -u root -p -e "CREATE DATABASE apponexthrms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create app user
mysql -u root -p -e "
CREATE USER 'apponexthrms'@'localhost' IDENTIFIED BY 'ApponextHRMS@2024';
GRANT ALL PRIVILEGES ON apponexthrms.* TO 'apponexthrms'@'localhost';
GRANT ALL PRIVILEGES ON apponexthrms_test.* TO 'apponexthrms'@'localhost';
FLUSH PRIVILEGES;
"
```

### 4. Run Migrations
```bash
# From project root
npm run db:migrate

# Verify tables were created
mysql -u apponexthrms -p -h localhost apponexthrms -e "SHOW TABLES LIMIT 10;"
```

### 5. Seed Test Data
```bash
npm run db:seed

# Verify data was seeded
mysql -u apponexthrms -p -h localhost apponexthrms -e "SELECT COUNT(*) FROM users;"
```

### 6. Start Backend
```bash
# From project root
npm run dev

# Expected output:
# [timestamp] INFO: Database connection initialized
# [timestamp] INFO: Server started on port 5000
```

### 7. Test API
```bash
# In another terminal, test health endpoint
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2024-..."}

# Test login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@apponexthrms.local",
    "password":"Admin@2024!"
  }'
```

### 8. Frontend Setup (When Ready)
```bash
# Install Vite
npm create vite@latest client -- --template react-ts

# Install dependencies
cd client
npm install

# Start frontend
npm run dev

# Frontend will be on http://localhost:5173
```

---

## Common Testing Scenarios

### Test Employee Creation
```bash
# Step 1: Get access token
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@apponexthrms.local","password":"Admin@2024!"}' \
  | jq -r '.accessToken')

# Step 2: Create employee
curl -X POST http://localhost:5000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@apponext.com",
    "dateOfJoining": "2024-01-15",
    "employmentType": "full_time"
  }'
```

### Test Leave Application
```bash
# Apply for leave
curl -X POST http://localhost:5000/api/v1/leaves/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveTypeId": 1,
    "startDate": "2024-12-20",
    "endDate": "2024-12-22",
    "reason": "Family vacation"
  }'
```

### Test Attendance Check-in
```bash
# Check in
curl -X POST http://localhost:5000/api/v1/attendance/check-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

### Test Job Creation (Recruitment)
```bash
# Create job posting
curl -X POST http://localhost:5000/api/v1/recruitment/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Senior Developer",
    "jobDescription": "Looking for experienced developer",
    "departmentId": 1,
    "experienceLevelId": 2,
    "noOfPositions": 2,
    "minSalary": 800000,
    "maxSalary": 1200000,
    "status": "published"
  }'
```

---

## Troubleshooting Common Issues

### Issue: "Connection refused on 3306"
**Solution:**
1. Ensure MySQL is running: `service mysql status` (Linux) or MySQL Workbench (Windows)
2. Check credentials in `.env` match your MySQL user
3. Verify database exists: `mysql -u apponexthrms -p apponexthrms -e "SELECT 1;"`

### Issue: "Port 5000 already in use"
**Solution:**
1. Kill existing process: `lsof -ti:5000 | xargs kill -9` (Linux/Mac)
2. On Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`
3. Or change port in `.env`: `SERVER_PORT=5001`

### Issue: "JWT key not found"
**Solution:**
1. Generate keys:
   ```bash
   mkdir -p server/keys
   openssl genrsa -out server/keys/private.key 2048
   openssl rsa -in server/keys/private.key -pubout -out server/keys/public.key
   ```
2. Verify paths in `.env` match your key locations

### Issue: "Migration not found" error
**Solution:**
1. Verify migrations exist: `ls -la database/migrations/`
2. Check .env database credentials
3. Clear migration lock:
   ```bash
   mysql -u apponexthrms -p apponexthrms -e "DELETE FROM knex_migrations_lock;"
   ```
4. Re-run migrations: `npm run db:migrate`

### Issue: "Unauthorized: Invalid token"
**Solution:**
1. Ensure token is being passed in Authorization header: `Authorization: Bearer <TOKEN>`
2. Token format should be: `Bearer eyJhbGc...`
3. Get a new token: Login again and copy the accessToken

### Issue: "CORS error in frontend"
**Solution:**
1. Ensure backend is running on correct port
2. Check CORS_ORIGIN in `.env` includes frontend URL
3. Frontend should be on `http://localhost:5173` (Vite default)
4. Restart backend after changing CORS settings

---

## Performance Testing

### Load Testing with Apache Bench
```bash
# Install Apache Bench (if not installed)
# Ubuntu: apt-get install apache2-utils
# Mac: brew install httpd

# Single request
ab -n 1 -c 1 http://localhost:5000/api/v1/health

# Load test: 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:5000/api/v1/health
```

### Database Performance
```bash
# Check slow queries
mysql -u apponexthrms -p apponexthrms -e "SHOW PROCESSLIST;"

# Check table sizes
mysql -u apponexthrms -p apponexthrms -e "
SELECT 
  TABLE_NAME,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size in MB'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'apponexthrms'
ORDER BY (data_length + index_length) DESC;
"
```

---

## Seeded Test Data Summary

**Organization:**
- Name: Demo Organization
- Slug: demo-org

**Users (6 total):**
- 1 Admin
- 1 HR Manager
- 1 Department Head
- 1 Manager
- 1 Employee
- 1 Recruiter

**Organizational Structure:**
- 3 Branches (Delhi, Bangalore, Mumbai)
- 4 Locations (3 offices + 1 WFH)
- 5 Departments (Engineering, HR, Sales, Finance, Operations)
- 8 Designations (ranging from Developer to Senior Manager)
- 5 Cost Centers (department-level budget allocations)

**Master Data:**
- Attendance Policies (with grace periods, overtime rules)
- Leave Policies & Types (Casual, Sick, Earned Leave)
- Holiday Calendar (2024-2025)
- Salary Structures (for different designations)
- Job Postings (20 sample jobs across departments)
- Candidates (50 sample candidates at various stages)

---

## Next Steps for Full Testing

1. ✅ Backend running and tested
2. ⏳ Create and start frontend (`npm create vite@latest client`)
3. ⏳ Connect frontend to API
4. ⏳ Test all modules end-to-end
5. ⏳ Performance testing under load
6. ⏳ Security testing (OWASP Top 10)
7. ⏳ Deployment preparation

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Ready for Testing

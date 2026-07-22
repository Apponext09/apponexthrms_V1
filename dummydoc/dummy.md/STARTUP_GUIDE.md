# ApponextHRMS - Complete Startup Guide

## Project Overview

ApponextHRMS is an enterprise-grade HRMS platform built with:
- **Backend**: Express.js + TypeScript + MySQL
- **Frontend**: React + Vite + TypeScript (to be created)
- **Database**: MySQL 8+ with Knex migrations
- **Architecture**: Multi-tenant SaaS with workspace support

## Project Structure

```
apponexthrms/
├── client/           # React frontend (to be created)
├── server/          # Express backend
├── shared/          # Shared types and validation
├── database/        # Migrations and seeds
└── package.json     # Root workspace configuration
```

---

## 1. PREREQUISITES

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **MySQL**: 8.0 or higher
- **Git**: For version control

### Installation Check
```bash
node --version     # Should be >= v18.0.0
npm --version      # Should be >= 9.0.0
mysql --version    # Should be >= 8.0.0
```

---

## 2. DATABASE SETUP

### Create MySQL Database and User

```bash
# Login to MySQL
mysql -u root -p

# Execute in MySQL console:
CREATE DATABASE apponexthrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE apponexthrms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create application user
CREATE USER 'apponexthrms'@'localhost' IDENTIFIED BY 'ApponextHRMS@2024';
GRANT ALL PRIVILEGES ON apponexthrms.* TO 'apponexthrms'@'localhost';
GRANT ALL PRIVILEGES ON apponexthrms_test.* TO 'apponexthrms'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

### Verify Database Connection
```bash
mysql -u apponexthrms -p -h localhost -e "SELECT 1" apponexthrms
```

---

## 3. ENVIRONMENT SETUP

### Create Root `.env` File
```bash
cd /path/to/ApponextHRMS
cp .env.example .env
```

### Edit `.env` File
```env
# Server Configuration
SERVER_PORT=5000
NODE_ENV=development
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=apponexthrms
DB_PASSWORD=ApponextHRMS@2024
DB_NAME=apponexthrms

# JWT/Auth
JWT_PRIVATE_KEY_PATH=./server/keys/private.key
JWT_PUBLIC_KEY_PATH=./server/keys/public.key
REFRESH_TOKEN_SECRET=your-refresh-secret-key-min-32-chars-here
SESSION_TIMEOUT_MINUTES=30

# Email (MailHog for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@apponexthrms.local

# Client Configuration
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Storage
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./server/uploads

# Encryption
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-1234567890ab
```

### Generate JWT Keys
```bash
# Create keys directory
mkdir -p server/keys

# Generate RSA keys (Linux/Mac)
openssl genrsa -out server/keys/private.key 2048
openssl rsa -in server/keys/private.key -pubout -out server/keys/public.key

# On Windows, use OpenSSL or WSL
# Alternatively, the server will generate them automatically on first run
```

### Create Storage Directory
```bash
mkdir -p server/uploads
```

---

## 4. INSTALLATION

### Install Dependencies
```bash
# From project root
npm install

# This installs dependencies for:
# - Root (dev tools)
# - client/ (to be created)
# - server/
# - shared/
# - database/
```

### Install Optional Tools
```bash
# For MailHog (Email testing in development)
# Download from https://github.com/mailhog/MailHog/releases
# Or use Docker:
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

---

## 5. DATABASE MIGRATIONS

### Run All Migrations
```bash
# From project root
npm run db:migrate

# This will:
# - Create all 135+ tables
# - Set up relationships
# - Create indexes
# - Enable soft delete support
```

### Verify Migrations
```bash
# Check created tables
mysql -u apponexthrms -p -h localhost apponexthrms -e "SHOW TABLES;"

# Should show 135+ tables including:
# - organizations, users, roles, permissions
# - employees, departments, designations
# - attendance_records, leave_applications
# - payroll_runs, payslips
# - jobs, candidates, applications
# - And many more...
```

### Rollback Migrations (if needed)
```bash
npm run db:rollback

# To rollback to specific batch:
npm run db:rollback -- --batch=10
```

---

## 6. DATABASE SEEDING

### Run Seed Files in Order
```bash
# Seeds run in alphabetical order:
npm run db:seed

# This seeds:
# 1. Permissions (all system permissions)
# 2. System Roles (organization_admin, hr_manager, etc.)
# 3. Demo Organization + Users
# 4. Module-specific permissions (settings, employee, workflow)
```

### Seed Data Generated

**Organizations**
- Demo Organization (organization_id = 1)

**System Roles**
- organization_admin
- hr_manager
- department_head
- manager
- employee
- recruiter

**Users (with Test Credentials)**
```
Admin User:
  Email: admin@apponexthrms.local
  Password: Admin@2024!
  Role: organization_admin

HR Manager:
  Email: hr@apponexthrms.local
  Password: HR@2024!
  Role: hr_manager

Department Head:
  Email: depthead@apponexthrms.local
  Password: Manager@2024!
  Role: department_head

Manager:
  Email: manager@apponexthrms.local
  Password: Manager@2024!
  Role: manager

Employee:
  Email: employee@apponexthrms.local
  Password: Employee@2024!
  Role: employee

Recruiter:
  Email: recruiter@apponexthrms.local
  Password: Recruiter@2024!
  Role: recruiter
```

**Master Data**
- 5 Departments
- 10 Designations
- 3 Locations
- 5 Cost Centers
- Attendance Policies
- Leave Policies (Casual, Sick, Earned)
- Salary Structures
- 20 Sample Jobs
- 50 Sample Candidates

---

## 7. BACKEND STARTUP

### Development Mode
```bash
# From project root
npm run dev

# This starts:
# - Backend server on http://localhost:5000
# - API available at http://localhost:5000/api/v1
# - With hot-reload enabled
```

### Production Build & Start
```bash
# Build
npm run build

# Start
npm run start

# Server will be on http://localhost:5000
```

### Backend Verification
```bash
# Test API is running
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2024-12-07T..."}

# Test auth endpoint
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test Org",
    "slug": "test-org",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Test@2024!"
  }'
```

---

## 8. FRONTEND SETUP (To Be Created)

### Create React + Vite Project
```bash
# The client directory needs to be created with:
cd /path/to/ApponextHRMS

# Frontend should be bootstrapped with:
npm create vite@latest client -- --template react-ts

cd client
npm install
```

### Frontend Startup
```bash
# From project root
npm run dev

# Or from client directory
cd client
npm run dev

# Frontend will be on http://localhost:5173
```

---

## 9. COMPLETE STARTUP WORKFLOW

### Option 1: Backend Only (API Development)
```bash
# Terminal 1: Backend
cd /path/to/ApponextHRMS
npm run dev

# Backend runs on http://localhost:5000
# Test with curl or Postman
```

### Option 2: Full Stack (Frontend + Backend)
```bash
# Terminal 1: From root, start both
npm run dev

# Or manually:
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev

# Backend: http://localhost:5000
# Frontend: http://localhost:5173
```

### Option 3: Production
```bash
# Build everything
npm run build

# Start backend
npm run start

# Start frontend (needs build first)
cd client
npm run build
npm run preview

# Or serve with nginx/apache in production
```

---

## 10. API ENDPOINTS

### Authentication
```
POST   /api/v1/auth/register          - Register new organization
POST   /api/v1/auth/login             - Login user
POST   /api/v1/auth/refresh-token     - Refresh access token
POST   /api/v1/auth/logout            - Logout
GET    /api/v1/auth/me                - Get current user

HEALTH CHECK:
GET    /api/v1/health                 - Check API status
```

### Core Modules (with authorization)
```
# Example endpoints (all require JWT token):

GET    /api/v1/employees              - List employees
POST   /api/v1/employees              - Create employee
GET    /api/v1/employees/:id          - Get employee
PATCH  /api/v1/employees/:id          - Update employee

GET    /api/v1/attendance/records     - List attendance
POST   /api/v1/attendance/check-in    - Check in

GET    /api/v1/leaves/applications    - List leave requests
POST   /api/v1/leaves/applications    - Apply for leave

GET    /api/v1/payroll/dashboard      - Payroll dashboard
POST   /api/v1/payroll/generate       - Generate payroll

GET    /api/v1/recruitment/jobs       - List open jobs
POST   /api/v1/recruitment/jobs       - Create job
POST   /api/v1/recruitment/apply      - Apply for job

# And many more endpoints across all modules...
```

---

## 11. TESTING API ENDPOINTS

### Using cURL

```bash
# 1. Register Organization
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Acme Corp",
    "slug": "acme-corp",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@acme.com",
    "password": "Password@2024!"
  }'

# 2. Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acme.com",
    "password": "Password@2024!"
  }'

# Save the accessToken from response

# 3. Use token in requests
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman
1. Import the API documentation
2. Create environment variables:
   - `baseUrl` = http://localhost:5000/api/v1
   - `accessToken` = (auto-saved from login)
3. Use Pre-request Scripts to auto-set token
4. Test all endpoints

### Using REST Client (VS Code)
Create `client.rest`:
```
@baseUrl = http://localhost:5000/api/v1
@token = 

### Health Check
GET {{baseUrl}}/health

### Register
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "organizationName": "Test Org",
  "slug": "test-org",
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@testorg.com",
  "password": "Admin@2024!"
}

### Login
@token = {{response.body.accessToken}}
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@testorg.com",
  "password": "Admin@2024!"
}

### Get Me
GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}
```

---

## 12. TROUBLESHOOTING

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306

Solution:
1. Verify MySQL is running: mysql -u root -p
2. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
3. Verify database exists: mysql -u apponexthrms -p apponexthrms -e "SELECT 1;"
```

### Migration Error
```
Error: Migration not found

Solution:
1. Verify migrations are in database/migrations/
2. Run: npm run db:migrate
3. Check .env DB credentials
4. Clear knex lock if needed:
   mysql -u apponexthrms -p apponexthrms -e "DELETE FROM knex_migrations_lock;"
```

### JWT Key Error
```
Error: Cannot find JWT keys

Solution:
1. Generate keys: openssl genrsa -out server/keys/private.key 2048
2. Extract public key: openssl rsa -in server/keys/private.key -pubout -out server/keys/public.key
3. Verify paths in .env match your generated keys
```

### Port Already in Use
```
Error: EADDRINUSE: address already in use :::5000

Solution:
1. Kill existing process: lsof -ti:5000 | xargs kill -9
2. Or change port in .env: SERVER_PORT=5001
3. On Windows: netstat -ano | findstr :5000 then taskkill /PID <PID>
```

### CORS Error
```
Error: Access to XMLHttpRequest blocked by CORS policy

Solution:
1. Verify CORS_ORIGIN in .env includes frontend URL
2. Check middleware/cors.ts configuration
3. Restart backend server
```

---

## 13. DEVELOPMENT TOOLS

### Type Checking
```bash
npm run type-check

# Check TypeScript across all workspaces
```

### Linting
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format code with Prettier
```

### Testing
```bash
npm run test          # Run tests in all workspaces
npm run test:watch    # Watch mode
```

---

## 14. MONITORING & LOGS

### View Logs
```bash
# Logs are written to:
# - Console (development)
# - server/logs/ directory (production)

# Watch logs in real-time:
tail -f server/logs/app.log

# Search logs:
grep "error" server/logs/app.log | head -20
```

### Health Monitoring
```bash
# Check API health
curl http://localhost:5000/api/v1/health

# Check database
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/v1/auth/me

# Monitor metrics (if enabled)
curl http://localhost:5000/metrics
```

---

## 15. QUICK START COMMANDS

```bash
# Clone or navigate to project
cd /path/to/ApponextHRMS

# 1. Setup
npm install
cp .env.example .env
# Edit .env with correct DB credentials

# 2. Database
npm run db:migrate
npm run db:seed

# 3. Start Development
npm run dev

# 4. Test API
curl http://localhost:5000/api/v1/health

# 5. Login with seed data
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@apponexthrms.local","password":"Admin@2024!"}'
```

---

## 16. NEXT STEPS

1. ✅ Database setup and migrations
2. ✅ Backend API running
3. ⏳ Create frontend with React + Vite
4. ⏳ Integrate API with frontend
5. ⏳ Add more test data
6. ⏳ Performance optimization
7. ⏳ Production deployment

---

## Support & Resources

- **API Documentation**: Generated at `/api/v1/docs` (if Swagger enabled)
- **Database Schema**: `database/migrations/` directory
- **Backend Code**: `server/src/` directory
- **Shared Types**: `shared/src/` directory

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Production Ready for Backend

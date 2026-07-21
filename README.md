# ApponextHRMS — Enterprise Multi-Tenant HRMS Platform

A next-generation AI-powered Human Resources Management System built for scale, security, and exceptional UX.

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker & Docker Compose (for local MySQL, Mailhog)

### Local Development Setup

1. **Clone and Install**
   ```bash
   cd C:\Projects\ApponextHRMS
   npm install
   ```

2. **Start Infrastructure**
   ```bash
   docker-compose up -d mysql adminer mailhog
   ```

3. **Database Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

   - API: http://localhost:5000/api/v1
   - Client: http://localhost:5173
   - Database Admin: http://localhost:8080 (Adminer)
   - Email Preview: http://localhost:8025 (Mailhog)

### Demo Account
After seeding, use these credentials:
- **Email:** admin@example.com
- **Password:** Demo@123456
- **Organization:** Example Corp

## Project Structure

```
ApponextHRMS/
├── docs/                  # Architecture documentation
├── database/              # Knex migrations, seeds, schema
├── server/                # Express backend (TypeScript)
├── client/                # React frontend (TypeScript + Vite)
└── shared/                # Shared types, validation schemas
```

## Architecture Highlights

- **Multi-Tenant**: Shared database with `organization_id` scoping
- **Enterprise Security**: JWT + RBAC, MFA, SSO (Google/Microsoft), audit logs
- **Modular Design**: 18 scalable feature modules (Employee, Recruitment, Payroll, etc.)
- **Type-Safe**: Full TypeScript across the stack
- **Dark/Light Theme**: Tailwind CSS with CSS variable tokens
- **Real-Time Ready**: Socket.io for instant updates

## Available Scripts

```bash
# Development
npm run dev              # Start dev servers (API + UI)
npm run dev -w server   # API only
npm run dev -w client   # UI only

# Production
npm run build           # Build all workspaces
npm start -w server     # Run production API

# Testing
npm run test            # Run all tests (Vitest)
npm run test:watch      # Watch mode

# Database
npm run db:migrate      # Run pending migrations
npm run db:seed         # Seed demo data
npm run db:rollback     # Rollback last batch

# Code Quality
npm run lint            # Check ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format with Prettier
npm run type-check      # TypeScript check
```

## Documentation

- [Architecture Overview](./docs/architecture/00-overview.md)
- [Multi-Tenancy Design](./docs/architecture/01-multi-tenancy.md)
- [Auth & RBAC](./docs/architecture/02-auth-rbac.md)
- [Database Conventions](./docs/architecture/03-database-conventions.md)
- [API Conventions](./docs/architecture/04-api-conventions.md)
- [Security Architecture](./docs/architecture/05-security.md)
- [Frontend Architecture](./docs/architecture/06-frontend-architecture.md)
- [Real-Time Architecture](./docs/architecture/07-realtime.md)
- [AI/RAG Readiness](./docs/architecture/08-ai-readiness.md)
- [Module Template (for Phases 2-18)](./docs/architecture/09-module-template.md)

## Current Status

**Phase 1: Foundation & Auth ✓**
- Multi-tenant architecture with shared database
- Complete authentication module (email, OTP, SSO, MFA)
- Dynamic RBAC with custom roles & permissions
- Audit logging
- Security middleware stack

**Upcoming Phases**
1. Employee Management
2. Recruitment ATS
3. Attendance Management
4. Leave Management
5. Payroll Processing
6. Performance Management
7. Learning Management System
8. Projects & Timesheets
9. Expense Management
10. Asset Management
11. Help Desk / IT Support
12. AI Copilot (HR Assistant)
13. Analytics & Dashboards
14. Client Portal
15. Mobile API (React Native ready)

## Security

- RS256 JWT with rotating refresh tokens
- Argon2id password hashing
- AES-256-GCM encryption for sensitive fields
- SQL injection prevention via parameterized queries
- CSRF protection with SameSite cookies
- Rate limiting on auth endpoints
- IP restriction support
- Password policies & history
- MFA (TOTP) support
- SSO (Google, Microsoft OAuth2)

## License

Proprietary — ApponextHRMS

## Support

For questions or issues, contact: support@apponexthrms.local

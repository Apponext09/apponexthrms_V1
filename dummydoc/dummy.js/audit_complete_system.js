const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const db_config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'apponexthrms',
};

const AUDIT_REPORT = {
  timestamp: new Date().toISOString(),
  database: {},
  modules: {},
  issues: [],
  summary: {},
};

const EXPECTED_TABLES = {
  core: ['users', 'organizations', 'roles', 'user_roles', 'permissions', 'role_permissions', 'auth_sessions'],
  employee: ['employees', 'employee_personal_info', 'employee_professional_info', 'employee_compensation', 'employee_lifecycle', 'employee_documents'],
  attendance: ['attendance_records', 'attendance_sessions', 'attendance_breaks', 'attendance_regularizations', 'attendance_locations', 'attendance_geofences'],
  leaves: ['leave_types', 'leave_policies', 'leave_applications', 'leave_approvals', 'leave_balances', 'leave_cancellations', 'comp_off_requests'],
  payroll: ['payroll_policies', 'salary_structure', 'payroll_processing', 'payslips', 'payroll_approvals'],
  performance: ['performance_reviews', 'goals', 'competencies', 'feedback', 'appraisals', 'ratings'],
  recruitment: ['job_openings', 'job_applicants', 'interview_schedules', 'offer_letters'],
  asset: ['assets', 'asset_types', 'employee_asset_allocations', 'asset_replacements'],
  workflow: ['workflows', 'workflow_instances', 'workflow_steps', 'workflow_actions', 'workflow_history'],
  notifications: ['notifications', 'notification_templates', 'notification_preferences', 'announcements'],
};

async function auditDatabase(connection) {
  console.log('\n📊 AUDITING DATABASE SCHEMA...\n');

  const [tables] = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
    [db_config.database]
  );

  const existingTables = new Set(tables.map(t => t.TABLE_NAME));
  const audit = {};

  for (const [category, tableList] of Object.entries(EXPECTED_TABLES)) {
    audit[category] = {
      total: tableList.length,
      found: 0,
      missing: [],
      tables: {}
    };

    for (const table of tableList) {
      if (existingTables.has(table)) {
        audit[category].found++;
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [db_config.database, table]
        );
        audit[category].tables[table] = {
          status: '✅',
          columns: columns.length,
          columnList: columns.map(c => c.COLUMN_NAME)
        };
      } else {
        audit[category].missing.push(table);
        audit[category].tables[table] = {
          status: '❌',
          columns: 0,
          columnList: []
        };
      }
    }

    const percent = Math.round((audit[category].found / audit[category].total) * 100);
    console.log(`${category.toUpperCase()}: ${audit[category].found}/${audit[category].total} (${percent}%) ✓`);
  }

  return audit;
}

async function auditApiRoutes() {
  console.log('\n🛣️ AUDITING API ROUTES...\n');

  const modules = [
    'auth', 'users', 'employees', 'attendance', 'leaves', 'payroll',
    'performance', 'recruitment', 'asset', 'workflow', 'notifications', 'settings'
  ];

  const routeFiles = {};

  for (const module of modules) {
    const routePath = `server/src/modules/${module}/${module}.routes.ts`;
    try {
      if (fs.existsSync(routePath)) {
        const content = fs.readFileSync(routePath, 'utf8');
        const routes = content.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]*)['"` ]/g) || [];
        routeFiles[module] = {
          status: '✅',
          file: routePath,
          endpoints: routes.length,
          routes: routes
        };
        console.log(`${module.toUpperCase()}: ${routes.length} endpoints ✓`);
      } else {
        routeFiles[module] = {
          status: '❌',
          file: routePath,
          endpoints: 0,
          routes: []
        };
        console.log(`${module.toUpperCase()}: FILE NOT FOUND ❌`);
      }
    } catch (err) {
      routeFiles[module] = {
        status: '⚠️',
        error: err.message
      };
    }
  }

  return routeFiles;
}

async function auditFrontendPages() {
  console.log('\n📱 AUDITING FRONTEND PAGES...\n');

  const modules = [
    'employee', 'attendance', 'leaves', 'payroll', 'performance',
    'recruitment', 'asset', 'workflow', 'notifications', 'settings'
  ];

  const pages = {};

  for (const module of modules) {
    const pagesPath = `client/src/features/${module}/pages`;
    try {
      if (fs.existsSync(pagesPath)) {
        const files = fs.readdirSync(pagesPath).filter(f => f.endsWith('.tsx'));
        pages[module] = {
          status: '✅',
          count: files.length,
          files: files
        };
        console.log(`${module.toUpperCase()}: ${files.length} pages ✓`);
      } else {
        pages[module] = {
          status: '❌',
          count: 0,
          files: []
        };
      }
    } catch (err) {
      pages[module] = {
        status: '⚠️',
        error: err.message
      };
    }
  }

  return pages;
}

async function main() {
  const connection = await mysql.createConnection(db_config);

  try {
    console.log('🏛️ APPONEXT HRMS - COMPLETE SYSTEM AUDIT');
    console.log('='.repeat(50));

    AUDIT_REPORT.database = await auditDatabase(connection);
    AUDIT_REPORT.modules.routes = await auditApiRoutes();
    AUDIT_REPORT.modules.pages = await auditFrontendPages();

    // Generate summary
    const dbCompletion = Object.values(AUDIT_REPORT.database).reduce((acc, cat) => {
      return acc + (cat.found / cat.total);
    }, 0) / Object.keys(AUDIT_REPORT.database).length;

    AUDIT_REPORT.summary = {
      database_completion: Math.round(dbCompletion * 100) + '%',
      total_tables: Object.values(AUDIT_REPORT.database).reduce((sum, cat) => sum + cat.total, 0),
      found_tables: Object.values(AUDIT_REPORT.database).reduce((sum, cat) => sum + cat.found, 0),
      missing_tables: Object.values(AUDIT_REPORT.database).reduce((sum, cat) => sum + cat.missing.length, 0),
    };

    // Save report
    fs.writeFileSync(
      'AUDIT_REPORT.json',
      JSON.stringify(AUDIT_REPORT, null, 2)
    );

    console.log('\n📋 SUMMARY:');
    console.log(`Database Completion: ${AUDIT_REPORT.summary.database_completion}`);
    console.log(`Total Tables: ${AUDIT_REPORT.summary.found_tables}/${AUDIT_REPORT.summary.total_tables}`);
    console.log(`\n✅ Audit report saved to: AUDIT_REPORT.json`);

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  } finally {
    await connection.end();
  }
}

main();

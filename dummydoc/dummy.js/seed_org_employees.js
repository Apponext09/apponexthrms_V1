const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('Seeding reference org structure employees...');

    // Get organization_id (default to 1)
    const [orgs] = await conn.execute('SELECT id FROM organizations LIMIT 1');
    const orgId = orgs[0]?.id || 1;

    // Get created_by user
    const [users] = await conn.execute('SELECT id FROM users LIMIT 1');
    const userId = users[0]?.id || 1;

    // 1. Create or get Level 1 Managers
    // Surinder Sharma (HR EXECUTIVE - Manager)
    // Sakshi Shukla (ACCOUNTANT - Manager)
    // Preeti Senapati (BACK OFFICE EXECUTIVE - Manager)
    // HR Admin (HR ADMIN)

    const employeesToInsert = [
      { code: 'EMP101', firstName: 'Surinder', lastName: 'Sharma', email: 'surinder.sharma@trialcompany.com', designation: 'HR EXECUTIVE', managerCode: null },
      { code: 'EMP102', firstName: 'Sakshi', lastName: 'Shukla', email: 'sakshi.shukla@trialcompany.com', designation: 'ACCOUNTANT', managerCode: null },
      { code: 'EMP103', firstName: 'Preeti', lastName: 'Senapati', email: 'preeti.senapati@trialcompany.com', designation: 'BACK OFFICE EXECUTIVE', managerCode: null },
      { code: 'EMP104', firstName: 'HR', lastName: 'Admin', email: 'hr.admin@trialcompany.com', designation: 'HR ADMIN', managerCode: null },

      // Subordinates of Surinder Sharma (EMP101)
      { code: 'EMP201', firstName: 'Ajitsingh', lastName: 'Patil', email: 'ajitsingh.patil@trialcompany.com', designation: 'ACCOUNTANT', managerCode: 'EMP101' },
      { code: 'EMP202', firstName: 'Akanksha', lastName: 'Nikam', email: 'akanksha.nikam@trialcompany.com', designation: 'BACK OFFICE EXECUTIVE', managerCode: 'EMP101' },
      { code: 'EMP203', firstName: 'Ankita', lastName: 'Rane', email: 'ankita.rane@trialcompany.com', designation: 'BACK OFFICE EXECUTIVE', managerCode: 'EMP101' },
      { code: 'EMP204', firstName: 'Ashwini', lastName: 'Lokhande', email: 'ashwini.lokhande@trialcompany.com', designation: 'BACK OFFICE EXECUTIVE', managerCode: 'EMP101' },
      { code: 'EMP205', firstName: 'Browny', lastName: 'Fonwell', email: 'browny.fonwell@trialcompany.com', designation: 'HR EXECUTIVE', managerCode: 'EMP101' },
      { code: 'EMP206', firstName: 'Chetan', lastName: 'Sune', email: 'chetan.sune@trialcompany.com', designation: 'HR EXECUTIVE', managerCode: 'EMP101' },
      { code: 'EMP207', firstName: 'Devendra', lastName: 'Mane', email: 'devendra.mane@trialcompany.com', designation: 'ACCOUNTANT', managerCode: 'EMP101' },

      // Subordinates of Sakshi Shukla (EMP102)
      { code: 'EMP301', firstName: 'Nirmal', lastName: 'Navghane', email: 'nirmal.navghane@trialcompany.com', designation: 'ACCOUNTANT', managerCode: 'EMP102' },
      { code: 'EMP302', firstName: 'Rajendra', lastName: 'Yelwande', email: 'rajendra.yelwande@trialcompany.com', designation: 'HR EXECUTIVE', managerCode: 'EMP102' },

      // Subordinate of Preeti Senapati (EMP103)
      { code: 'EMP401', firstName: 'Immanuel', lastName: 'Thoppas', email: 'immanuel.thoppas@trialcompany.com', designation: 'BACK OFFICE EXECUTIVE', managerCode: 'EMP103' },
    ];

    const codeToIdMap = {};

    // Get existing employees first
    const [existing] = await conn.execute('SELECT id, employee_code FROM employees');
    existing.forEach(e => {
      codeToIdMap[e.employee_code] = e.id;
    });

    for (const emp of employeesToInsert) {
      if (codeToIdMap[emp.code]) {
        console.log(`Employee ${emp.code} already exists (${codeToIdMap[emp.code]})`);
        continue;
      }

      const managerId = emp.managerCode ? codeToIdMap[emp.managerCode] || null : null;
      const uuid = uuidv4();
      const dateOfJoining = new Date().toISOString().split('T')[0];

      const [res] = await conn.execute(
        `INSERT INTO employees (
          uuid, organization_id, employee_code, first_name, last_name, email,
          reporting_manager_id, status, employment_type, date_of_joining,
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'full_time', ?, ?, ?)`,
        [uuid, orgId, emp.code, emp.firstName, emp.lastName, emp.email, managerId, dateOfJoining, userId, userId]
      );

      codeToIdMap[emp.code] = res.insertId;
      console.log(`Inserted employee ${emp.code} (${emp.firstName} ${emp.lastName}) with ID ${res.insertId}`);
    }

    console.log('✅ Seed completed successfully!');
    await conn.end();
  } catch (err) {
    console.error('Error seeding org employees:', err);
  }
})();

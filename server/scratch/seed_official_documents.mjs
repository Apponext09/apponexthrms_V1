import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('Database Connected!');

    // Fetch all employees
    const [employees] = await conn.execute('SELECT id, first_name, last_name, email, organization_id FROM employees');
    console.log(`Found ${employees.length} employees to seed official documents.`);

    const officialDocTemplates = [
      {
        type: 'offer_letter',
        name: 'Official_Offer_Letter_2026.pdf',
        number: 'OL-2026-904',
        issued_by: 'HR Talent Acquisition',
        size: 2450000, // 2.45 MB
        file_type: 'application/pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        issue_date: '2026-06-01'
      },
      {
        type: 'appointment_letter',
        name: 'Employment_Appointment_Letter.pdf',
        number: 'AL-2026-112',
        issued_by: 'HR Operations',
        size: 1850000, // 1.85 MB
        file_type: 'application/pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        issue_date: '2026-06-15'
      },
      {
        type: 'confirmation_letter',
        name: 'Service_Joining_&_Confirmation_Letter.pdf',
        number: 'CL-2026-008',
        issued_by: 'Chief People Officer',
        size: 1200000, // 1.2 MB
        file_type: 'application/pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        issue_date: '2026-07-01'
      },
      {
        type: 'certificate',
        name: 'June_2026_Official_Salary_Payslip.pdf',
        number: 'PS-2026-06',
        issued_by: 'Payroll & Finance Team',
        size: 450000, // 450 KB
        file_type: 'application/pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        issue_date: '2026-07-05'
      },
      {
        type: 'certificate',
        name: 'Annual_Tax_Form_16_FY26.pdf',
        number: 'F16-2026-789',
        issued_by: 'Finance & Taxation Dept',
        size: 3100000, // 3.1 MB
        file_type: 'application/pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        issue_date: '2026-07-10'
      }
    ];

    let inserted = 0;
    for (const emp of employees) {
      const empId = emp.id;
      const orgId = emp.organization_id || 3;

      for (const tpl of officialDocTemplates) {
        // Check if doc already exists for this employee
        const [existing] = await conn.execute(
          'SELECT id FROM employee_documents WHERE employee_id = ? AND file_url = ? AND document_type = ?',
          [empId, tpl.file_url, tpl.type]
        );

        if (existing.length === 0) {
          await conn.execute(
            `INSERT INTO employee_documents (
              uuid, organization_id, employee_id, document_type, document_number,
              issue_date, issued_by, file_url, file_size, file_type,
              verification_status, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(), orgId, empId, tpl.type, tpl.number,
              tpl.issue_date, tpl.issued_by, tpl.file_url, tpl.size, tpl.file_type,
              'verified', 1, 1
            ]
          );
          inserted++;
        }
      }
    }

    console.log(`Seeded ${inserted} official documents into database!`);
    await conn.end();
  } catch (err) {
    console.error('Error seeding documents:', err);
  }
})();

const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: '../.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    charset: 'utf8mb4',
  },
});

async function seedRecruitmentData() {
  console.log('\n======================================================');
  console.log('📋 SEEDING ADDITIONAL RECRUITMENT DATA');
  console.log('======================================================\n');

  try {
    const orgId = 8;
    const userId = 1;

    console.log('📦 Seeding Additional Candidates...\n');

    const additionalCandidates = [
      {
        first_name: 'Vikram',
        last_name: 'Singh',
        email: 'vikram.singh@example.com',
        phone: '+91 9855667788',
        current_company: 'InfoSys Limited',
        years_of_experience: 8.5,
        current_salary: 2000000.00,
        expected_salary: 2750000.00,
        notice_period_days: 45,
        source: 'job_board',
        status: 'screening',
        qualification: 'B.Tech CSE',
        skills: 'Java, Spring Boot, Microservices, AWS, Docker, Kubernetes',
      },
      {
        first_name: 'Priya',
        last_name: 'Sharma',
        email: 'priya.sharma@example.com',
        phone: '+91 9866778899',
        current_company: 'Capgemini',
        years_of_experience: 6.0,
        current_salary: 1700000.00,
        expected_salary: 2300000.00,
        notice_period_days: 30,
        source: 'employee_referral',
        status: 'assessment',
        qualification: 'B.Tech IT',
        skills: 'Python, Django, Flask, PostgreSQL, Redis, Machine Learning',
      },
      {
        first_name: 'Rajesh',
        last_name: 'Kumar',
        email: 'rajesh.kumar@example.com',
        phone: '+91 9877889900',
        current_company: 'TCS',
        years_of_experience: 5.0,
        current_salary: 1400000.00,
        expected_salary: 2000000.00,
        notice_period_days: 60,
        source: 'recruitment_agency',
        status: 'applied',
        qualification: 'B.E. CSE',
        skills: 'React, Angular, Node.js, MongoDB, GraphQL',
      },
      {
        first_name: 'Sneha',
        last_name: 'Patel',
        email: 'sneha.patel@example.com',
        phone: '+91 9888990011',
        current_company: 'Accenture',
        years_of_experience: 7.0,
        current_salary: 1800000.00,
        expected_salary: 2500000.00,
        notice_period_days: 30,
        source: 'job_board',
        status: 'interview',
        qualification: 'M.Tech CSE',
        skills: 'DevOps, CI/CD, Terraform, Jenkins, AWS, GCP',
      },
      {
        first_name: 'Arjun',
        last_name: 'Desai',
        email: 'arjun.desai@example.com',
        phone: '+91 9899001122',
        current_company: 'Wipro',
        years_of_experience: 4.5,
        current_salary: 1300000.00,
        expected_salary: 1900000.00,
        notice_period_days: 45,
        source: 'direct_apply',
        status: 'applied',
        qualification: 'B.Tech IT',
        skills: 'Go, Rust, Blockchain, Solidity, Web3',
      },
      {
        first_name: 'Divya',
        last_name: 'Gupta',
        email: 'divya.gupta@example.com',
        phone: '+91 9800112233',
        current_company: 'HCL Technologies',
        years_of_experience: 6.5,
        current_salary: 1600000.00,
        expected_salary: 2200000.00,
        notice_period_days: 30,
        source: 'employee_referral',
        status: 'screening',
        qualification: 'B.E. Mechanical',
        skills: 'Technical Writing, API Documentation, Confluence, Jira',
      },
      {
        first_name: 'Nikhil',
        last_name: 'Reddy',
        email: 'nikhil.reddy@example.com',
        phone: '+91 9811223344',
        current_company: 'Tech Mahindra',
        years_of_experience: 3.0,
        current_salary: 1000000.00,
        expected_salary: 1600000.00,
        notice_period_days: 15,
        source: 'job_board',
        status: 'applied',
        qualification: 'B.Tech CSE',
        skills: 'JavaScript, TypeScript, React, Vue.js, HTML, CSS',
      },
      {
        first_name: 'Pooja',
        last_name: 'Iyer',
        email: 'pooja.iyer@example.com',
        phone: '+91 9822334455',
        current_company: 'Cognizant',
        years_of_experience: 8.0,
        current_salary: 1900000.00,
        expected_salary: 2600000.00,
        notice_period_days: 60,
        source: 'recruitment_agency',
        status: 'interview',
        qualification: 'M.Des Product Design',
        skills: 'Figma, Adobe XD, User Research, Prototyping, Usability Testing',
      },
    ];

    const candidateIds = {};
    let candCount = 0;

    for (const cData of additionalCandidates) {
      const existing = await db('candidates')
        .where('organization_id', orgId)
        .where('email', cData.email)
        .first();

      if (!existing) {
        const [id] = await db('candidates').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          ...cData,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        candidateIds[cData.email] = id;
        candCount++;
        console.log(`  └─ ${cData.first_name} ${cData.last_name} (${cData.status})`);
      } else {
        candidateIds[cData.email] = existing.id;
      }
    }

    console.log(`\n✅ Created ${candCount} new candidates\n`);

    // Get existing jobs
    const jobs = await db('jobs').where('organization_id', orgId).select('id', 'job_code');
    console.log(`Found ${jobs.length} existing jobs\n`);

    console.log('📦 Creating Applications for New Candidates...\n');

    const appData = [
      { email: 'vikram.singh@example.com', jobCode: 'JOB-ENG-01', status: 'screening' },
      { email: 'priya.sharma@example.com', jobCode: 'JOB-ENG-01', status: 'screening' },
      { email: 'rajesh.kumar@example.com', jobCode: 'JOB-DES-02', status: 'applied' },
      { email: 'sneha.patel@example.com', jobCode: 'JOB-ENG-01', status: 'interview' },
      { email: 'arjun.desai@example.com', jobCode: 'JOB-DES-02', status: 'applied' },
      { email: 'divya.gupta@example.com', jobCode: 'JOB-HR-03', status: 'screening' },
      { email: 'nikhil.reddy@example.com', jobCode: 'JOB-DES-02', status: 'applied' },
      { email: 'pooja.iyer@example.com', jobCode: 'JOB-DES-02', status: 'interview' },
    ];

    const appIds = {};
    let appCount = 0;

    for (const aData of appData) {
      const candId = candidateIds[aData.email];
      const job = jobs.find(j => j.job_code === aData.jobCode);

      if (!candId || !job) continue;

      const existing = await db('applications')
        .where('candidate_id', candId)
        .where('job_id', job.id)
        .first();

      if (!existing) {
        const [appId] = await db('applications').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          candidate_id: candId,
          job_id: job.id,
          application_status: aData.status,
          applied_at: new Date('2026-08-20'),
          applied_from_source: 'Company Career Portal',
          initial_screening_status: 'passed',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        appIds[aData.email] = appId;
        appCount++;
        console.log(`  └─ ${aData.email} -> ${aData.jobCode}`);
      }
    }

    console.log(`\n✅ Created ${appCount} new applications\n`);

    console.log('📦 Creating Additional Interviews...\n');

    const interviewData = [
      { email: 'vikram.singh@example.com', type: 'video', round: 1, date: '2026-09-05 10:00:00', duration: 45, url: 'https://meet.google.com/vikram-screening', label: 'Screening Round' },
      { email: 'priya.sharma@example.com', type: 'in_person', round: 2, date: '2026-09-08 14:00:00', duration: 60, url: null, label: 'Technical Assessment' },
      { email: 'sneha.patel@example.com', type: 'video', round: 2, date: '2026-09-10 11:00:00', duration: 60, url: 'https://meet.google.com/sneha-tech-round', label: 'Tech Round' },
      { email: 'pooja.iyer@example.com', type: 'video', round: 1, date: '2026-09-06 16:00:00', duration: 45, url: 'https://meet.google.com/pooja-design-screen', label: 'Design Screening' },
    ];

    for (const intData of interviewData) {
      let appId = appIds[intData.email];
      if (!appId) {
        const app = await db('applications')
          .join('candidates', 'applications.candidate_id', '=', 'candidates.id')
          .where('candidates.email', intData.email)
          .where('applications.organization_id', orgId)
          .select('applications.id')
          .first();
        appId = app ? app.id : null;
      }

      if (!appId) continue;

      const existing = await db('interviews').where('application_id', appId).first();
      if (!existing) {
        await db('interviews').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: appId,
          interview_type: intData.type,
          interview_round: intData.round,
          scheduled_date: new Date(intData.date),
          interview_duration_minutes: intData.duration,
          meeting_url: intData.url,
          status: 'scheduled',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  └─ Interview for ${intData.email.split('@')[0]} (${intData.label})`);
      }
    }

    console.log('\n✅ Created interviews\n');

    console.log('📦 Creating Additional Offers...\n');

    // Get application IDs from database (in case they weren't created just now)
    let snehaAppId = appIds['sneha.patel@example.com'];
    if (!snehaAppId) {
      const snehaApp = await db('applications')
        .join('candidates', 'applications.candidate_id', '=', 'candidates.id')
        .where('candidates.email', 'sneha.patel@example.com')
        .where('applications.organization_id', orgId)
        .select('applications.id')
        .first();
      snehaAppId = snehaApp ? snehaApp.id : null;
    }

    if (snehaAppId) {
      const snehaOfferExists = await db('offers').where('application_id', snehaAppId).first();
      if (!snehaOfferExists) {
        await db('offers').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: snehaAppId,
          offer_code: 'OFF-2026-003',
          position_title: 'Senior DevOps Engineer',
          cost_to_company: 2400000.00,
          base_salary: 1950000.00,
          currency: 'INR',
          offer_start_date: '2026-10-01',
          offer_expiry_date: '2026-09-15',
          status: 'sent',
          sent_at: new Date(),
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  └─ Offer for Sneha Patel (DevOps) - Sent`);
      }
    }

    let poojaAppId = appIds['pooja.iyer@example.com'];
    if (!poojaAppId) {
      const poojaApp = await db('applications')
        .join('candidates', 'applications.candidate_id', '=', 'candidates.id')
        .where('candidates.email', 'pooja.iyer@example.com')
        .where('applications.organization_id', orgId)
        .select('applications.id')
        .first();
      poojaAppId = poojaApp ? poojaApp.id : null;
    }

    if (poojaAppId) {
      const poojaOfferExists = await db('offers').where('application_id', poojaAppId).first();
      if (!poojaOfferExists) {
        await db('offers').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: poojaAppId,
          offer_code: 'OFF-2026-004',
          position_title: 'Senior Product Designer',
          cost_to_company: 2200000.00,
          base_salary: 1800000.00,
          currency: 'INR',
          offer_start_date: '2026-10-15',
          offer_expiry_date: '2026-09-20',
          status: 'draft',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  └─ Offer for Pooja Iyer (Designer) - Draft`);
      }
    }

    console.log('\n✅ Created offers\n');

    console.log('======================================================');
    console.log('🎉 RECRUITMENT DATA SEEDING COMPLETED!');
    console.log('======================================================\n');

    console.log('📊 Summary:');
    console.log(`  • New Candidates: ${candCount}`);
    console.log(`  • New Applications: ${appCount}`);
    console.log(`  • New Interviews: 4`);
    console.log(`  • New Offers: 2`);
    console.log('');

    await db.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await db.destroy();
    process.exit(1);
  }
}

seedRecruitmentData();

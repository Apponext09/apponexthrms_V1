const { v4: uuidv4 } = require('uuid');
const knex = require('knex');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedRecruitmentData() {
  console.log('\n======================================================');
  console.log('🌱 STARTING RECRUITMENT MODULE SEED EXECUTION');
  console.log('======================================================\n');

  const dbName = process.env.DB_NAME || 'apponexthrms';

  const db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      charset: 'utf8mb4',
    },
  });

  try {
    // 1. Target Organization & User Context
    let org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    console.log(`🏢 Seeding Recruitment Data for Organization ID: ${orgId}`);

    let user = await db('users').where('organization_id', orgId).first();
    let userId = user ? user.id : 1;

    let emp = await db('employees').where('organization_id', orgId).first();
    let empId = emp ? emp.id : 1;

    // Helper to check existing columns
    const getCols = async (tableName) => {
      const has = await db.schema.hasTable(tableName);
      if (!has) return [];
      const info = await db(tableName).columnInfo();
      return Object.keys(info);
    };

    // ----------------------------------------------------------------------
    // 2. PIPELINE STAGES SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Pipeline Stages...');
    const stageCols = await getCols('pipeline_stages');
    const orderCol = stageCols.includes('sequence_order') ? 'sequence_order' : 'stage_order';

    const stagesSeed = [
      { name: 'Sourcing & Applied', order: 1, color: '#3B82F6', is_rejection: false },
      { name: 'Initial Screening', order: 2, color: '#8B5CF6', is_rejection: false },
      { name: 'Technical Assessment', order: 3, color: '#EAB308', is_rejection: false },
      { name: 'Technical Interview', order: 4, color: '#F97316', is_rejection: false },
      { name: 'HR & Management Round', order: 5, color: '#EC4899', is_rejection: false },
      { name: 'Offer Extended', order: 6, color: '#06B6D4', is_rejection: false },
      { name: 'Hired', order: 7, color: '#10B981', is_rejection: false },
    ];

    const stageMap = new Map();
    for (const st of stagesSeed) {
      let existingStage = await db('pipeline_stages')
        .where('organization_id', orgId)
        .where('stage_name', st.name)
        .first();

      if (!existingStage) {
        const payload = {
          uuid: uuidv4(),
          organization_id: orgId,
          stage_name: st.name,
          stage_color: st.color,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };
        payload[orderCol] = st.order;
        if (stageCols.includes('is_rejection_stage')) payload.is_rejection_stage = st.is_rejection;

        const [insertedId] = await db('pipeline_stages').insert(payload);
        stageMap.set(st.name, insertedId);
        console.log(`  └─ Created Stage: ${st.name} (Sequence: ${st.order})`);
      } else {
        stageMap.set(st.name, existingStage.id);
        console.log(`  └─ Stage Exists: ${st.name} (ID: ${existingStage.id})`);
      }
    }

    // ----------------------------------------------------------------------
    // 3. MANPOWER REQUISITION FORMS - MRF SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding MRF Requests...');
    const mrfSeedData = [
      {
        mr_number: 'MRF-2026-001',
        position_title: 'Senior Full Stack Engineer',
        number_of_positions: 2,
        employment_type: 'Full Time',
        qualification_required: 'B.Tech / B.E. in CS / IT or equivalent',
        experience_desired: '4 - 8 Years',
        pay_scale_for_position: '₹15,00,000 - ₹22,00,000 CTC',
        reason_for_requirement: 'Product Scaling & Next-Gen Feature Development',
        stage: 'Approved',
        status: 'Open',
        job_description: 'We are looking for an experienced Senior Full Stack Engineer to lead full-stack web applications development using React, Node.js, TypeScript, and MySQL.',
        skills: JSON.stringify(['React.js', 'Node.js', 'TypeScript', 'MySQL', 'REST API'])
      },
      {
        mr_number: 'MRF-2026-002',
        position_title: 'Lead UI/UX Product Designer',
        number_of_positions: 1,
        employment_type: 'Full Time',
        qualification_required: 'B.Des / M.Des or equivalent in Interaction Design',
        experience_desired: '5 - 9 Years',
        pay_scale_for_position: '₹18,00,000 - ₹25,00,000 CTC',
        reason_for_requirement: 'Design System & UI Revamp for Enterprise HRMS',
        stage: 'Approved',
        status: 'Open',
        job_description: 'Seeking a creative Lead Product Designer to own user experience end-to-end, design modern component libraries, and conduct user research.',
        skills: JSON.stringify(['Figma', 'UI/UX Design', 'Design Systems', 'Prototyping', 'User Research'])
      },
      {
        mr_number: 'MRF-2026-003',
        position_title: 'Talent Acquisition Specialist',
        number_of_positions: 1,
        employment_type: 'Full Time',
        qualification_required: 'MBA / BBA in Human Resources',
        experience_desired: '3 - 6 Years',
        pay_scale_for_position: '₹10,00,000 - ₹14,00,000 CTC',
        reason_for_requirement: 'Hiring expansion for Engineering & Product teams',
        stage: 'Pending Approval',
        status: 'Open',
        job_description: 'Looking for a dynamic Talent Acquisition Specialist to drive technical sourcing, candidate screening, and end-to-end recruitment lifecycle.',
        skills: JSON.stringify(['Technical Sourcing', 'Interviewing', 'ATS', 'LinkedIn Recruiter', 'Headhunting'])
      }
    ];

    const mrfMap = new Map();
    for (const mrf of mrfSeedData) {
      let existingMrf = await db('mrf_requests')
        .where('organization_id', orgId)
        .where('mr_number', mrf.mr_number)
        .first();

      if (!existingMrf) {
        const [insertedId] = await db('mrf_requests').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          mr_number: mrf.mr_number,
          position_title: mrf.position_title,
          number_of_positions: mrf.number_of_positions,
          recruitment_type: 'Both',
          employment_type: mrf.employment_type,
          qualification_required: mrf.qualification_required,
          experience_desired: mrf.experience_desired,
          pay_scale_for_position: mrf.pay_scale_for_position,
          reason_for_requirement: mrf.reason_for_requirement,
          list_in_job_page: 'Yes',
          skills: mrf.skills,
          job_description: mrf.job_description,
          stage: mrf.stage,
          status: mrf.status,
          requested_by: userId,
          approved_by: mrf.stage === 'Approved' ? userId : null,
          approved_at: mrf.stage === 'Approved' ? new Date() : null,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        mrfMap.set(mrf.mr_number, insertedId);
        console.log(`  └─ Created MRF: ${mrf.mr_number} - ${mrf.position_title}`);
      } else {
        mrfMap.set(mrf.mr_number, existingMrf.id);
        console.log(`  └─ MRF Exists: ${mrf.mr_number} (ID: ${existingMrf.id})`);
      }
    }

    // ----------------------------------------------------------------------
    // 4. JOBS & JOB SKILLS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Job Postings & Required Skills...');
    const jobSkillsCols = await getCols('job_skills');
    const profCol = jobSkillsCols.includes('proficiency_level') ? 'proficiency_level' : 'proficiency';

    const jobsSeedData = [
      {
        job_code: 'JOB-ENG-01',
        job_title: 'Senior Full Stack Engineer',
        mrf_code: 'MRF-2026-001',
        job_type: 'full_time',
        experience_level: 'senior',
        min_exp: 4,
        max_exp: 8,
        min_salary: 1500000.00,
        max_salary: 2200000.00,
        employment_type: 'hybrid',
        no_of_positions: 2,
        status: 'published',
        published_at: new Date('2026-08-10'),
        skills: [
          { name: 'React.js', proficiency: 'expert', is_mandatory: true },
          { name: 'Node.js', proficiency: 'expert', is_mandatory: true },
          { name: 'TypeScript', proficiency: 'intermediate', is_mandatory: false },
          { name: 'MySQL', proficiency: 'intermediate', is_mandatory: false }
        ]
      },
      {
        job_code: 'JOB-DES-02',
        job_title: 'Lead UI/UX Product Designer',
        mrf_code: 'MRF-2026-002',
        job_type: 'full_time',
        experience_level: 'lead',
        min_exp: 5,
        max_exp: 9,
        min_salary: 1800000.00,
        max_salary: 2500000.00,
        employment_type: 'onsite',
        no_of_positions: 1,
        status: 'published',
        published_at: new Date('2026-08-12'),
        skills: [
          { name: 'Figma', proficiency: 'expert', is_mandatory: true },
          { name: 'Design Systems', proficiency: 'expert', is_mandatory: true },
          { name: 'User Research', proficiency: 'intermediate', is_mandatory: false }
        ]
      },
      {
        job_code: 'JOB-HR-03',
        job_title: 'Talent Acquisition Specialist',
        mrf_code: 'MRF-2026-003',
        job_type: 'full_time',
        experience_level: 'mid',
        min_exp: 3,
        max_exp: 6,
        min_salary: 1000000.00,
        max_salary: 1400000.00,
        employment_type: 'onsite',
        no_of_positions: 1,
        status: 'draft',
        published_at: null,
        skills: [
          { name: 'Technical Sourcing', proficiency: 'expert', is_mandatory: true },
          { name: 'Candidate Screening', proficiency: 'intermediate', is_mandatory: false }
        ]
      }
    ];

    const jobMap = new Map();
    for (const j of jobsSeedData) {
      let existingJob = await db('jobs')
        .where('organization_id', orgId)
        .where('job_code', j.job_code)
        .first();

      let jobId;
      const mrfId = mrfMap.get(j.mrf_code) || null;

      if (!existingJob) {
        const [insertedId] = await db('jobs').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          mrf_request_id: mrfId,
          job_code: j.job_code,
          job_title: j.job_title,
          job_description: `${j.job_title} role at Apponext HRMS platform. Responsibilities include technical execution, cross-functional collaboration, and delivering high quality solutions.`,
          job_type: j.job_type,
          experience_level: j.experience_level,
          min_experience_years: j.min_exp,
          max_experience_years: j.max_exp,
          min_salary: j.min_salary,
          max_salary: j.max_salary,
          currency: 'INR',
          employment_type: j.employment_type,
          no_of_positions: j.no_of_positions,
          status: j.status,
          published_at: j.published_at,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        jobId = insertedId;
        jobMap.set(j.job_code, jobId);
        console.log(`  └─ Created Job: ${j.job_code} - ${j.job_title}`);
      } else {
        jobId = existingJob.id;
        jobMap.set(j.job_code, jobId);
        console.log(`  └─ Job Exists: ${j.job_code} (ID: ${jobId})`);
      }

      // Seed Skills
      const hasJobSkills = await db.schema.hasTable('job_skills');
      if (hasJobSkills) {
        for (const sk of j.skills) {
          const existingSk = await db('job_skills')
            .where('job_id', jobId)
            .where('skill_name', sk.name)
            .first();

          if (!existingSk) {
            const skPayload = {
              uuid: uuidv4(),
              organization_id: orgId,
              job_id: jobId,
              skill_name: sk.name,
              is_mandatory: sk.is_mandatory,
              created_at: new Date(),
            };
            skPayload[profCol] = sk.proficiency;
            await db('job_skills').insert(skPayload);
          }
        }
      }
    }

    // ----------------------------------------------------------------------
    // 5. CANDIDATES SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Candidates...');
    const candidateSeedData = [
      {
        first_name: 'Rohan',
        last_name: 'Verma',
        email: 'rohan.verma@example.com',
        phone: '+91 9811223344',
        current_company: 'TechCorp Systems',
        years_of_experience: 5.5,
        current_salary: 1400000.00,
        expected_salary: 1950000.00,
        notice_period_days: 30,
        source: 'job_board',
        status: 'interview',
        qualification: 'B.Tech CS',
        skills: 'React.js, Node.js, TypeScript, MySQL, GraphQL',
        resume_url: '/uploads/resumes/rohan_verma_resume.pdf'
      },
      {
        first_name: 'Ananya',
        last_name: 'Sen',
        email: 'ananya.sen@example.com',
        phone: '+91 9822334455',
        current_company: 'DesignStudio Labs',
        years_of_experience: 6.0,
        current_salary: 1600000.00,
        expected_salary: 2100000.00,
        notice_period_days: 15,
        source: 'direct_apply',
        status: 'offer',
        qualification: 'M.Des Interaction Design',
        skills: 'Figma, Design Systems, UX Prototyping, Wireframing',
        resume_url: '/uploads/resumes/ananya_sen_portfolio.pdf'
      },
      {
        first_name: 'Siddharth',
        last_name: 'Rao',
        email: 'siddharth.rao@example.com',
        phone: '+91 9833445566',
        current_company: 'InnoTech Solutions',
        years_of_experience: 4.0,
        current_salary: 1100000.00,
        expected_salary: 1600000.00,
        notice_period_days: 0,
        source: 'employee_referral',
        status: 'screening',
        qualification: 'B.E. IT',
        skills: 'React, Node.js, Express, MongoDB, Docker',
        resume_url: '/uploads/resumes/siddharth_rao_cv.pdf'
      },
      {
        first_name: 'Meera',
        last_name: 'Nair',
        email: 'meera.nair@example.com',
        phone: '+91 9844556677',
        current_company: 'CloudScale India',
        years_of_experience: 7.0,
        current_salary: 1800000.00,
        expected_salary: 2400000.00,
        notice_period_days: 60,
        source: 'recruitment_agency',
        status: 'hired',
        qualification: 'B.Tech ECE',
        skills: 'React, Node.js, AWS, Kubernetes, Microservices',
        resume_url: '/uploads/resumes/meera_nair_resume.pdf'
      }
    ];

    const candidateMap = new Map();
    for (const c of candidateSeedData) {
      let existingCand = await db('candidates')
        .where('organization_id', orgId)
        .where('email', c.email)
        .first();

      if (!existingCand) {
        const [insertedId] = await db('candidates').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          current_company: c.current_company,
          years_of_experience: c.years_of_experience,
          current_salary: c.current_salary,
          expected_salary: c.expected_salary,
          notice_period_days: c.notice_period_days,
          source: c.source,
          status: c.status,
          qualification: c.qualification,
          skills: c.skills,
          resume_url: c.resume_url,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        candidateMap.set(c.email, insertedId);
        console.log(`  └─ Created Candidate: ${c.first_name} ${c.last_name} (${c.email})`);
      } else {
        candidateMap.set(c.email, existingCand.id);
        console.log(`  └─ Candidate Exists: ${c.first_name} ${c.last_name} (ID: ${existingCand.id})`);
      }
    }

    // ----------------------------------------------------------------------
    // 6. APPLICATIONS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Job Applications...');
    const appSeedData = [
      {
        candidate_email: 'rohan.verma@example.com',
        job_code: 'JOB-ENG-01',
        mrf_code: 'MRF-2026-001',
        stage_name: 'Technical Interview',
        status: 'interview',
        screening: 'passed'
      },
      {
        candidate_email: 'ananya.sen@example.com',
        job_code: 'JOB-DES-02',
        mrf_code: 'MRF-2026-002',
        stage_name: 'Offer Extended',
        status: 'offer',
        screening: 'passed'
      },
      {
        candidate_email: 'siddharth.rao@example.com',
        job_code: 'JOB-ENG-01',
        mrf_code: 'MRF-2026-001',
        stage_name: 'Technical Assessment',
        status: 'screening',
        screening: 'passed'
      },
      {
        candidate_email: 'meera.nair@example.com',
        job_code: 'JOB-ENG-01',
        mrf_code: 'MRF-2026-001',
        stage_name: 'Hired',
        status: 'hired',
        screening: 'passed'
      }
    ];

    const appMap = new Map();
    for (const a of appSeedData) {
      const candId = candidateMap.get(a.candidate_email);
      const jobId = jobMap.get(a.job_code);
      const mrfId = mrfMap.get(a.mrf_code);
      const stageId = stageMap.get(a.stage_name);

      if (!candId || !jobId) continue;

      let existingApp = await db('applications')
        .where('organization_id', orgId)
        .where('candidate_id', candId)
        .where('job_id', jobId)
        .first();

      if (!existingApp) {
        const [insertedId] = await db('applications').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          candidate_id: candId,
          job_id: jobId,
          mrf_request_id: mrfId,
          application_status: a.status,
          applied_at: new Date('2026-08-15'),
          applied_from_source: 'Company Career Portal',
          initial_screening_status: a.screening,
          pipeline_stage_id: stageId,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        appMap.set(a.candidate_email, insertedId);
        console.log(`  └─ Created Application: ${a.candidate_email} -> ${a.job_code} (Status: ${a.status})`);
      } else {
        appMap.set(a.candidate_email, existingApp.id);
        console.log(`  └─ Application Exists: ID ${existingApp.id}`);
      }
    }

    // ----------------------------------------------------------------------
    // 7. INTERVIEWS & FEEDBACK SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Interviews & Feedback...');
    const intCols = await getCols('interviews');
    const durCol = intCols.includes('interview_duration_minutes') ? 'interview_duration_minutes' : 'duration_minutes';

    const rohanAppId = appMap.get('rohan.verma@example.com');
    if (rohanAppId) {
      let existingInt1 = await db('interviews').where('application_id', rohanAppId).first();
      let int1Id;
      if (!existingInt1) {
        const intPayload = {
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: rohanAppId,
          interview_type: 'video',
          interview_round: 2,
          scheduled_date: new Date('2026-08-25 14:00:00'),
          meeting_url: 'https://meet.google.com/xyz-recruitment-test',
          status: 'completed',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };
        intPayload[durCol] = 60;
        const [id1] = await db('interviews').insert(intPayload);
        int1Id = id1;
        console.log('  └─ Created Interview for Rohan Verma (Round 2)');
      } else {
        int1Id = existingInt1.id;
      }

      if (int1Id) {
        const existingFb1 = await db('interview_feedback').where('interview_id', int1Id).first();
        if (!existingFb1) {
          await db('interview_feedback').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            interview_id: int1Id,
            interviewer_id: userId,
            overall_rating: 5,
            technical_rating: 5,
            communication_rating: 4,
            cultural_fit_rating: 5,
            feedback_text: 'Strong problem solving, solid knowledge of React architecture and DB indexing. Highly recommended for Senior role.',
            would_recommend: true,
            created_at: new Date(),
          });
          console.log('  └─ Created Interview Feedback for Rohan Verma');
        }
      }
    }

    const ananyaAppId = appMap.get('ananya.sen@example.com');
    if (ananyaAppId) {
      let existingInt2 = await db('interviews').where('application_id', ananyaAppId).first();
      let int2Id;
      if (!existingInt2) {
        const intPayload = {
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: ananyaAppId,
          interview_type: 'video',
          interview_round: 3,
          scheduled_date: new Date('2026-08-27 16:30:00'),
          meeting_url: 'https://meet.google.com/abc-design-review',
          status: 'completed',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };
        intPayload[durCol] = 45;
        const [id2] = await db('interviews').insert(intPayload);
        int2Id = id2;
        console.log('  └─ Created Interview for Ananya Sen (Round 3)');
      } else {
        int2Id = existingInt2.id;
      }

      if (int2Id) {
        const existingFb2 = await db('interview_feedback').where('interview_id', int2Id).first();
        if (!existingFb2) {
          await db('interview_feedback').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            interview_id: int2Id,
            interviewer_id: userId,
            overall_rating: 5,
            technical_rating: 5,
            communication_rating: 5,
            cultural_fit_rating: 5,
            feedback_text: 'Outstanding design portfolio & proven design leadership capabilities. Exceptional fit.',
            would_recommend: true,
            created_at: new Date(),
          });
          console.log('  └─ Created Interview Feedback for Ananya Sen');
        }
      }
    }

    // ----------------------------------------------------------------------
    // 8. ASSESSMENTS & ATTEMPTS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Technical Assessments & Attempts...');
    let existingAss = await db('assessments')
      .where('organization_id', orgId)
      .where('assessment_name', 'Full-Stack Coding Challenge')
      .first();

    let assId;
    if (!existingAss) {
      const [insertedId] = await db('assessments').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        assessment_name: 'Full-Stack Coding Challenge',
        assessment_type: 'coding',
        duration_minutes: 90,
        passing_score: 70,
        description: 'Evaluates React state management, Node API design, SQL query optimizations, and algorithms.',
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      });
      assId = insertedId;
      console.log('  └─ Created Assessment: Full-Stack Coding Challenge');
    } else {
      assId = existingAss.id;
    }

    const sidAppId = appMap.get('siddharth.rao@example.com');
    if (assId && sidAppId) {
      const existingAtt = await db('assessment_attempts').where('application_id', sidAppId).first();
      if (!existingAtt) {
        await db('assessment_attempts').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: sidAppId,
          assessment_id: assId,
          attempt_number: 1,
          score: 85,
          status: 'completed',
          started_at: new Date('2026-08-20 10:00:00'),
          completed_at: new Date('2026-08-20 11:25:00'),
          answers_json: JSON.stringify({ score_breakdown: { coding: 45, mcq: 40, total: 85 } }),
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log('  └─ Created Assessment Attempt for Siddharth Rao (Score: 85/100)');
      }
    }

    // ----------------------------------------------------------------------
    // 9. OFFERS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Offer Letters...');
    if (ananyaAppId) {
      const existingOffer1 = await db('offers').where('application_id', ananyaAppId).first();
      if (!existingOffer1) {
        await db('offers').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: ananyaAppId,
          offer_code: 'OFF-2026-001',
          position_title: 'Lead UI/UX Product Designer',
          cost_to_company: 2200000.00,
          base_salary: 1800000.00,
          currency: 'INR',
          offer_start_date: '2026-09-15',
          offer_expiry_date: '2026-09-05',
          status: 'accepted',
          accepted_at: new Date('2026-08-29'),
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log('  └─ Created Offer for Ananya Sen (CTC: ₹22,00,000 - Accepted)');
      }
    }

    const meeraAppId = appMap.get('meera.nair@example.com');
    if (meeraAppId) {
      const existingOffer2 = await db('offers').where('application_id', meeraAppId).first();
      if (!existingOffer2) {
        await db('offers').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          application_id: meeraAppId,
          offer_code: 'OFF-2026-002',
          position_title: 'Senior Full Stack Engineer',
          cost_to_company: 2350000.00,
          base_salary: 1900000.00,
          currency: 'INR',
          offer_start_date: '2026-09-01',
          offer_expiry_date: '2026-08-25',
          status: 'accepted',
          accepted_at: new Date('2026-08-24'),
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log('  └─ Created Offer for Meera Nair (CTC: ₹23,50,000 - Accepted)');
      }
    }

    // ----------------------------------------------------------------------
    // 10. EMPLOYEE REFERRALS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Employee Referrals...');
    const sidId = candidateMap.get('siddharth.rao@example.com');
    const engMrfId = mrfMap.get('MRF-2026-001');

    if (sidId) {
      const refCols = await getCols('referrals');
      const existingRef = await db('referrals').where('candidate_id', sidId).first();
      if (!existingRef) {
        const refPayload = {
          uuid: uuidv4(),
          organization_id: orgId,
          mrf_request_id: engMrfId,
          candidate_id: sidId,
          referral_date: new Date(),
          referral_reward_amount: 25000.00,
          status: 'approved',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };

        if (refCols.includes('referrer_employee_id')) refPayload.referrer_employee_id = empId;
        if (refCols.includes('referring_employee_id')) refPayload.referring_employee_id = empId;
        if (refCols.includes('referral_status')) refPayload.referral_status = 'hired';
        if (refCols.includes('reward_status')) refPayload.reward_status = 'paid';

        await db('referrals').insert(refPayload);
        console.log('  └─ Created Employee Referral for Siddharth Rao (Reward: ₹25,000)');
      }
    }

    // ----------------------------------------------------------------------
    // 11. RESUME BANK SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Resume Bank Entries...');
    const bankSeed = [
      { tracker: 'RES-BANK-001', email: 'rohan.verma@example.com', position: 'Senior Full Stack Engineer', source: 'LinkedIn', status: 'Interview' },
      { tracker: 'RES-BANK-002', email: 'ananya.sen@example.com', position: 'Lead UI/UX Product Designer', source: 'Career Portal', status: 'Offered' },
      { tracker: 'RES-BANK-003', email: 'siddharth.rao@example.com', position: 'Senior Full Stack Engineer', source: 'Employee Referral', status: 'Screening' },
    ];

    for (const b of bankSeed) {
      const candId = candidateMap.get(b.email);
      const existingBank = await db('resume_bank')
        .where('organization_id', orgId)
        .where('tracker_id', b.tracker)
        .first();

      if (!existingBank) {
        await db('resume_bank').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          tracker_id: b.tracker,
          candidate_id: candId,
          source: b.source,
          position: b.position,
          status: b.status,
          uploaded_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  └─ Created Resume Bank Tracker: ${b.tracker} (${b.position})`);
      }
    }

    console.log('\n======================================================');
    console.log('🎉 RECRUITMENT MODULE SEED COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
    await db.destroy();
  } catch (error) {
    console.error('❌ Recruitment Seed Failed:', error);
    process.exit(1);
  }
}

seedRecruitmentData().then(() => process.exit(0));

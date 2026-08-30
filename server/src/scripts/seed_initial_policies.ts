import { getKnex } from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

async function seedPolicies() {
  const db = getKnex();
  console.log('Seeding initial organization policies...');

  try {
    const orgs = await db('organizations').select('id');
    const adminUser = await db('users').where('email', 'admin@apponexthrms.com').first();
    const fallbackUser = await db('users').first();
    const createdBy = adminUser?.id || fallbackUser?.id || 1;

    for (const org of orgs) {
      const orgId = org.id;

      const existingPolicies = await db('policy_documents').where('organization_id', orgId);
      if (existingPolicies.length > 0) {
        console.log(`Org ${orgId} already has ${existingPolicies.length} policies.`);
        continue;
      }

      const initialDocs = [
        {
          title: 'Code of Professional Conduct & Ethics',
          description: 'Official corporate code of conduct detailing integrity, workplace standards, non-discrimination, and ethical behavioral guidelines.',
          category: 'Code of Conduct',
          version: '1.0',
          file_url: 'data:text/plain;base64,Q29kZSBvZiBQcm9mZXNzaW9uYWwgQ29uZHVjdCAmIFdvcmtwbGFjZSBFdGhpY3MgTWFudWFs',
          fileName: 'Code_of_Conduct_2026.pdf',
          fileSize: 102400,
          fileType: 'application/pdf',
          roles: ['all'],
        },
        {
          title: 'Information Security & Acceptable IT Usage Policy',
          description: 'Security policies governing data classification, password standards, device security, cloud credentials, and AI tools usage.',
          category: 'Information Security',
          version: '1.0',
          file_url: 'data:text/plain;base64,SW5mb3JtYXRpb24gU2VjdXJpdHkgJiBBY2NlcHRhYmxlIElUIFVzYWdlIFBvbGljeQ==',
          fileName: 'Infosec_Policy_v1.0.pdf',
          fileSize: 154000,
          fileType: 'application/pdf',
          roles: ['all'],
        },
        {
          title: 'Managerial & Supervisory Code of Conduct',
          description: 'Guidelines for managers, department heads, and team leads regarding team appraisals, confidentiality, escalations, and 1-on-1s.',
          category: 'Compliance & POSH',
          version: '1.0',
          file_url: 'data:text/plain;base64,TWFuYWdlcmlhbCAmIFN1cGVydmlzb3J5IENvZGUgb2YgQ29uZHVjdA==',
          fileName: 'Managerial_Code_of_Conduct_v1.pdf',
          fileSize: 84000,
          fileType: 'application/pdf',
          roles: ['department_head', 'team_lead', 'hr_manager', 'hr_admin'],
        },
        {
          title: 'Prevention of Sexual Harassment (POSH) Manual',
          description: 'Comprehensive policy on preventing sexual harassment, internal complaints committee details, and employee rights.',
          category: 'Compliance & POSH',
          version: '1.0',
          file_url: 'data:text/plain;base64,UE9TSCAmIEFudGktSGFyYXNzbWVudCBDb21wbGlhbmNlIE1hbnVhbA==',
          fileName: 'POSH_Compliance_Manual.pdf',
          fileSize: 120000,
          fileType: 'application/pdf',
          roles: ['all'],
        },
      ];

      for (const doc of initialDocs) {
        const [policyId] = await db('policy_documents').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          version: doc.version,
          file_url: doc.file_url,
          file_name: doc.fileName,
          file_size: doc.fileSize,
          file_type: doc.fileType,
          is_active: true,
          created_by: createdBy,
          updated_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        });

        const mappings = doc.roles.map((roleCode) => ({
          uuid: uuidv4(),
          organization_id: orgId,
          policy_document_id: policyId,
          role_code: roleCode,
          is_mandatory: true,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        await db('policy_document_role_mappings').insert(mappings);
        console.log(`Org ${orgId}: Seeded policy "${doc.title}" (ID: ${policyId}) with ${mappings.length} role mappings`);
      }
    }

    console.log('✅ Policy seeding finished successfully.');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Policy seeding failed:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

seedPolicies();

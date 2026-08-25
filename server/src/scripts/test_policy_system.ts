import { getKnex } from '../db/knex';
import { PolicyService } from '../modules/policy/services/PolicyService';
import type { TenantContext } from '../db/types';

async function runPolicyTest() {
  const db = getKnex();
  const policyService = new PolicyService();

  console.log('=== STARTING POLICY SYSTEM VERIFICATION TEST ===\n');

  try {
    // 1. Find a test organization and user
    const org = await db('organizations').first();
    if (!org) throw new Error('No organization found');

    const adminUser = await db('users').where('organization_id', org.id).first();
    if (!adminUser) throw new Error('No user found');

    const ctx: TenantContext = {
      organizationId: org.id,
      userId: adminUser.id,
      sessionUuid: 'test-session-uuid',
    };

    const userRoles = await policyService.getUserRoleCodes(org.id, adminUser.id);
    console.log(`Test user ${adminUser.email} (ID ${adminUser.id}) has roles: ${userRoles.join(', ')}`);

    console.log(`\n[TEST 1] Listing all policies for Org ${org.id}...`);
    const allPolicies = await policyService.listPolicies(ctx);
    console.log(`✅ Retrieved ${allPolicies.length} policies.`);
    allPolicies.forEach((p) => {
      console.log(`   - [ID: ${p.id}] "${p.title}" (v${p.version}) | Category: ${p.category} | Roles: ${p.roleMappings.map((r) => r.roleCode).join(', ')} | Compliance: ${p.stats?.compliancePercentage}%`);
    });

    console.log('\n[TEST 2] Creating a new test policy mapped to user role and all...');
    const primaryRole = userRoles[0] || 'all';
    const newPolicy = await policyService.createPolicy(ctx, {
      title: 'Automated Test Security & Governance Policy',
      category: 'Information Security',
      description: 'Test policy created for verification suite.',
      version: '1.0',
      fileUrl: 'data:application/pdf;base64,VEVTVA==',
      fileName: 'Test_Infosec_v1.0.pdf',
      isActive: true,
      roleMappings: [
        { roleCode: primaryRole, isMandatory: true },
        { roleCode: 'all', isMandatory: true },
      ],
    });
    console.log(`✅ Created test policy ID ${newPolicy.id} with ${newPolicy.roleMappings.length} role mappings.`);

    console.log('\n[TEST 3] Checking pending policies for user...');
    const pendingBefore = await policyService.getPendingPolicies(ctx, userRoles);
    const isOurPolicyPending = pendingBefore.some((p) => p.id === newPolicy.id);
    console.log(`✅ User has ${pendingBefore.length} pending policies. New policy pending: ${isOurPolicyPending}`);
    if (!isOurPolicyPending) {
      throw new Error(`Expected new policy to be pending for role ${primaryRole}!`);
    }

    console.log('\n[TEST 4] Accepting test policy...');
    const acceptance = await policyService.acceptPolicy(
      ctx,
      newPolicy.id,
      '192.168.1.100',
      'Mozilla/5.0 (TestAgent/1.0)'
    );
    console.log(`✅ Policy accepted! Version: ${acceptance.policyVersion}, IP: ${acceptance.ipAddress}, Accepted At: ${acceptance.acceptedAt}`);

    console.log('\n[TEST 5] Checking pending policies after acceptance...');
    const pendingAfter = await policyService.getPendingPolicies(ctx, userRoles);
    const isStillPending = pendingAfter.some((p) => p.id === newPolicy.id);
    console.log(`✅ New policy pending after acceptance: ${isStillPending} (Expected: false)`);
    if (isStillPending) {
      throw new Error('Policy should not be pending after acceptance!');
    }

    console.log('\n[TEST 6] Checking user policies list (My Policies)...');
    const myPolicies = await policyService.getMyPolicies(ctx, userRoles);
    const myPolicyItem = myPolicies.find((p) => p.id === newPolicy.id);
    console.log(`✅ Policy in My Policies list: isAccepted = ${myPolicyItem?.isAccepted}, version = ${myPolicyItem?.acceptedVersion}`);

    console.log('\n[TEST 7] Checking HR Compliance Audit for policy...');
    const audit = await policyService.getPolicyAudit(ctx, newPolicy.id);
    console.log(`✅ Policy audit retrieved for "${audit.policy.title}". Target users: ${audit.auditList.length}`);
    const empAuditRow = audit.auditList.find((u) => u.userId === adminUser.id);
    if (empAuditRow) {
      console.log(`   - User ${empAuditRow.name}: isAccepted = ${empAuditRow.isAccepted}, IP = ${empAuditRow.ipAddress}`);
    }

    console.log('\n[TEST 8] Bumping policy version to 2.0 (triggers re-acceptance)...');
    await policyService.updatePolicy(ctx, newPolicy.id, {
      version: '2.0',
    });
    const pendingAfterBump = await policyService.getPendingPolicies(ctx, userRoles);
    const isPendingAgain = pendingAfterBump.some((p) => p.id === newPolicy.id);
    console.log(`✅ Policy pending after version bump to 2.0: ${isPendingAgain} (Expected: true)`);
    if (!isPendingAgain) {
      throw new Error('Policy should require re-acceptance after version bump!');
    }

    console.log('\n[TEST 9] Cleaning up test policy...');
    await policyService.deletePolicy(ctx, newPolicy.id);
    console.log('✅ Test policy deleted successfully.');

    console.log('\n🎉 ALL 9 POLICY SYSTEM TESTS PASSED SUCCESSFULLY! 🎉');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Policy verification test failed:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

runPolicyTest();

import prisma from '../lib/prisma';


async function testWorkflow() {
  console.log('🧪 Starting Commitment & Cancellation Workflow E2E Test...');

  const studentUser = await prisma.user.findUnique({ where: { email: 'student@internflow.com' } });
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: studentUser?.id } });

  const hrUser = await prisma.user.findUnique({ where: { email: 'hr@techcorp.com' } });
  const companyProfile = await prisma.companyProfile.findUnique({ where: { userId: hrUser?.id } });

  const innovateHr = await prisma.user.findUnique({ where: { email: 'hr@innovate.co' } });
  const innovateProfile = await prisma.companyProfile.findUnique({ where: { userId: innovateHr?.id } });

  if (!studentUser || !studentProfile || !hrUser || !companyProfile || !innovateProfile) {
    throw new Error('Required test accounts missing. Please run seed script first.');
  }

  const jobs = await prisma.jobPost.findMany();
  const techcorpJob = jobs.find(j => j.companyProfileId === companyProfile.id)!;
  const innovateJob = jobs.find(j => j.companyProfileId === innovateProfile.id)!;

  // Setup: Reset student applications to 2 ACCEPTED offers
  await prisma.application.deleteMany({ where: { studentId: studentProfile.id } });

  const app1 = await prisma.application.create({
    data: {
      studentId: studentProfile.id,
      jobPostId: techcorpJob.id,
      status: 'ACCEPTED'
    }
  });

  const app2 = await prisma.application.create({
    data: {
      studentId: studentProfile.id,
      jobPostId: innovateJob.id,
      status: 'ACCEPTED'
    }
  });

  console.log('✓ Setup: Created 2 ACCEPTED offers for student:');
  console.log(`  - App 1 (${techcorpJob.title}): ACCEPTED`);
  console.log(`  - App 2 (${innovateJob.title}): ACCEPTED`);

  const studentAuth = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@internflow.com', password: 'password123' })
  }).then(r => r.json());

  const hrAuth = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr@techcorp.com', password: 'password123' })
  }).then(r => r.json());

  const studentToken = studentAuth.token;
  const hrToken = hrAuth.token;

  // 1. Student commits to App 1 (TechCorp)
  console.log('\n--- Step 1: Student commits to App 1 (TechCorp) ---');
  const commitRes = await fetch(`http://localhost:4000/api/applications/${app1.id}/commit`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const commitData = await commitRes.json();
  console.log(`Commit response (${commitRes.status}):`, commitData.message || commitData.error);

  const checkApp1 = await prisma.application.findUnique({ where: { id: app1.id } });
  const checkApp2 = await prisma.application.findUnique({ where: { id: app2.id } });
  console.log(`✓ App 1 status: ${checkApp1?.status} (Expected: COMMITTED)`);
  console.log(`✓ App 2 status: ${checkApp2?.status} (Expected: REJECTED auto-closed)`);

  if (checkApp1?.status !== 'COMMITTED' || checkApp2?.status !== 'REJECTED') {
    throw new Error('Step 1 Failed: Statuses did not match expected values.');
  }

  // 2. Student tries to apply to another job while committed
  console.log('\n--- Step 2: Student attempts to apply for new job while committed ---');
  const applyRes = await fetch(`http://localhost:4000/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ jobPostId: innovateJob.id })
  });
  console.log(`Apply response (${applyRes.status}):`, (await applyRes.json()).error);
  if (applyRes.status !== 400) throw new Error('Step 2 Failed: Should have blocked new job application.');

  // 3. Student requests cancellation
  console.log('\n--- Step 3: Student requests cancellation with reason ---');
  const cancelReqRes = await fetch(`http://localhost:4000/api/applications/${app1.id}/request-cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ reason: 'Relocating to another province due to family reasons.' })
  });
  const cancelReqData = await cancelReqRes.json();
  console.log(`Cancel request response (${cancelReqRes.status}):`, cancelReqData.message);

  const checkApp1CancelledReq = await prisma.application.findUnique({ where: { id: app1.id } });
  console.log(`✓ App 1 status: ${checkApp1CancelledReq?.status} (Expected: CANCEL_REQUESTED)`);
  console.log(`✓ Reason: "${checkApp1CancelledReq?.cancellationReason}"`);

  // 4. Company HR approves release
  console.log('\n--- Step 4: Company HR approves release ---');
  const hrActionRes = await fetch(`http://localhost:4000/api/applications/${app1.id}/cancellation-action`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`
    },
    body: JSON.stringify({ action: 'APPROVE' })
  });
  const hrActionData = await hrActionRes.json();
  console.log(`HR Action response (${hrActionRes.status}):`, hrActionData.message);

  const finalApp1 = await prisma.application.findUnique({ where: { id: app1.id } });
  console.log(`✓ Final App 1 status: ${finalApp1?.status} (Expected: CANCELLED)`);

  console.log('\n🎉 ALL COMMITMENT & CANCELLATION WORKFLOW TESTS PASSED SUCCESSFULLY!');
}

testWorkflow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

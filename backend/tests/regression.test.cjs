// Runs HTTP regressions against an empty, disposable PostgreSQL database.
// Never resets or seeds the database configured for the application.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'internflow-upload-test-'));
const privateUploadRoot = path.join(uploadRoot, 'private');
fs.mkdirSync(privateUploadRoot);
process.env.UPLOAD_DIR=uploadRoot;process.env.PRIVATE_UPLOAD_DIR=privateUploadRoot;
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

const cwd = path.join(__dirname, '..');
const dbName = 'internflow_test_' + randomBytes(8).toString('hex');
const dbUrl = new URL(process.env.DATABASE_URL);
const admin = new Pool({ connectionString: dbUrl.href });
dbUrl.pathname = '/' + dbName;
let db, server, base, serverLog = '', password;
const tokens = {};

async function api(method, url, actor, body) {
  const response = await fetch(base + url, {
    method, headers: { ...(actor ? { Authorization: 'Bearer ' + tokens[actor] } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() };
}

async function user(id, role = 'STUDENT') {
  await db.query('INSERT INTO "User" (id,email,password,name,role,"updatedAt") VALUES ($1,$2,$3,$1,$4,NOW())', ['u-' + id, id + '@test.invalid', password, role]);
  if (role === 'STUDENT') {
    await db.query('INSERT INTO "StudentProfile" (id,"userId",skills,gpa) VALUES ($1,$2,$3,3.5)', [id, 'u-' + id, ['React']]);
  } else {
    await db.query('INSERT INTO "CompanyProfile" (id,"userId","companyName",industry) VALUES ($1,$2,$1,$3)', [id, 'u-' + id, 'Software']);
  }
  const login = await api('POST', '/api/auth/login', null, { email: id + '@test.invalid', password: 'password123' });
  assert.equal(login.status, 200);
  tokens[id] = login.body.token;
}

async function job(id, company, active = true) {
  await db.query('INSERT INTO "JobPost" (id,"companyProfileId",title,description,requirements,location,"updatedAt","isActive") VALUES ($1,$2,$1,$3,$3,$4,NOW(),$5)', [id, company, 'React TypeScript engineering', 'Bangkok', active]);
}
async function application(id, student, jobId, status) {
  await db.query('INSERT INTO "Application" (id,"studentId","jobPostId",status,"updatedAt") VALUES ($1,$2,$3,$4,NOW())', [id, student, jobId, status]);
}
async function log(id, student, applicationId, day, approved = false) {
  await db.query('INSERT INTO "DailyLog" (id,"studentId","applicationId","logDate","tasksDone",learnings,"mentorApproved","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', [id, student, applicationId, day, '["Original task"]', 'Testing', approved]);
}
const logBody = (id, day = '2026-10-01') => ({ id, logDate: day, weekNumber: 1, hoursWorked: 8, workModality: 'ON_SITE', tasksDone: '["Changed task"]', learnings: 'Learned something' });

before(async () => {
  assert.match(dbName, /^internflow_test_[a-f0-9]{16}$/);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname), 'Regression runner requires a local PostgreSQL server.');
  await admin.query('CREATE DATABASE "' + dbName + '"');
  db = new Pool({ connectionString: dbUrl.href });
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push'], { cwd, env: { ...process.env, DATABASE_URL: dbUrl.href }, stdio: 'pipe', timeout: 60000 });
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  base = 'http://127.0.0.1:' + port;
  server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'], { cwd, env: { ...process.env, DATABASE_URL: dbUrl.href, PORT: String(port), UPLOAD_DIR: uploadRoot, PRIVATE_UPLOAD_DIR: privateUploadRoot, STORAGE_MODE: 'local', READINESS_PROCESSOR_DISABLED: 'true', GEMINI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => serverLog += chunk);
  server.stderr.on('data', chunk => serverLog += chunk);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(base + '/api/health')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, serverLog);
  password = await bcrypt.hash('password123', 4);
  for (const id of ['hr-a', 'hr-b', 'hr-c']) await user(id, 'COMPANY_HR');
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) await user(id);
  await job('job-a', 'hr-a'); await job('job-a2', 'hr-a'); await job('job-b', 'hr-b'); await job('job-closed', 'hr-c', false);
  await application('app-a', 'a', 'job-a', 'COMMITTED');
  await application('app-old', 'a', 'job-b', 'CANCELLED');
  await application('app-b', 'b', 'job-b', 'COMMITTED');
  await application('app-c-a', 'c', 'job-a', 'ACCEPTED'); await application('app-c-b', 'c', 'job-b', 'ACCEPTED');
  await application('app-d', 'd', 'job-a', 'ACCEPTED');
  await application('app-f', 'f', 'job-a', 'PENDING');
  await application('app-g', 'g', 'job-a', 'COMMITTED');
  await log('log-a-approved', 'a', 'app-a', '2026-10-01', true);
  await log('log-a-pending', 'a', 'app-a', '2026-10-02');
  await log('log-a-old', 'a', 'app-old', '2026-09-01');
  await log('log-b', 'b', 'app-b', '2026-10-01T09:00:00Z');
  await log('log-g', 'g', 'app-g', '2026-10-01');
}, { timeout: 90000 });

after(async () => {
  if (server) {
    // tsx launches a child on Windows; terminate that process tree, not unrelated servers.
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
    } else server.kill('SIGTERM');
  }
  if (db) await db.end();
  if (/^internflow_test_[a-f0-9]{16}$/.test(dbName)) await admin.query('DROP DATABASE IF EXISTS "' + dbName + '" WITH (FORCE)');
  await admin.end();
  // The directory was created by mkdtemp for this test run only.
  fs.rmSync(uploadRoot, { recursive: true, force: true });
});

test('reports and logbooks enforce student and company ownership', async () => {
  assert.equal((await api('GET', '/api/evaluations/report/a')).status, 401);
  assert.equal((await api('GET', '/api/evaluations/report/a', 'b')).status, 403);
  assert.equal((await api('GET', '/api/evaluations/report/a?applicationId=app-a', 'hr-b')).status, 403);
  assert.equal((await api('GET', '/api/evaluations/report/a', 'hr-c')).status, 403);
  const historicalReport = await api('GET', '/api/evaluations/report/a', 'hr-b');
  assert.equal(historicalReport.status, 200);
  assert.equal(historicalReport.body.activeApp.id, 'app-old');
  assert.deepEqual(historicalReport.body.dailyLogs.map(log => log.id), ['log-a-old']);
  assert.equal((await api('GET', '/api/logbook/student/a', 'hr-b')).status, 403);
  const own = await api('GET', '/api/evaluations/report/a', 'a');
  assert.equal(own.status, 200); assert.equal(own.body.totalHours, 16); assert.equal(own.body.approvedHours, 8);
  assert.deepEqual(own.body.dailyLogs.map(log => log.applicationId), ['app-a', 'app-a']);
  const logs = await api('GET', '/api/logbook/student/a?applicationId=app-a', 'hr-a');
  assert.equal(logs.status, 200); assert.equal(logs.body.totalHours, 16);
  const masked = await api('GET', '/api/profile/student/a', 'hr-c');
  assert.equal(masked.body.gpa, undefined); assert.equal(masked.body.email, undefined); assert.equal(masked.body.studentId, undefined);
  assert.equal((await api('GET', '/api/profile/student/a', 'hr-a')).body.gpa, 3.5);
});

test('student totals do not include hours from a previous placement', async () => {
  const result = await api('GET', '/api/logbook/my', 'a');
  assert.equal(result.status, 200); assert.equal(result.body.totalHours, 16); assert.equal(result.body.logs.length, 2);
  assert.equal(result.body.student.user.name, 'u-a');
  const roster = await api('GET', '/api/evaluations/company', 'hr-a');
  assert.equal(roster.body.find(row => row.student.id === 'a').totalHours, 16);
  assert.ok(!roster.body.some(row => row.student.id === 'c'), 'Uncommitted offers are not active interns.');
});

test('HR cannot modify another company or overwrite committed/final states', async () => {
  assert.equal((await api('PATCH', '/api/applications/app-a/status', 'hr-b', { status: 'REJECTED' })).status, 404);
  assert.equal((await api('PATCH', '/api/applications/app-a/status', 'hr-a', { status: 'REJECTED' })).status, 409);
  assert.equal((await api('PATCH', '/api/applications/app-f/status', 'hr-a', { status: 'REVIEWING' })).status, 200);
  assert.equal((await api('PATCH', '/api/applications/app-f/status', 'hr-a', { status: 'INTERVIEW_SCHEDULED' })).status, 200);
  assert.equal((await api('PATCH', '/api/applications/app-f/status', 'hr-a', { status: 'REVIEWING' })).status, 409);
  assert.equal((await api('PATCH', '/api/applications/app-f/status', 'hr-a', { status: 'ACCEPTED' })).status, 200);
});

test('approved logs are immutable and students cannot edit another student log', async () => {
  assert.equal((await api('POST', '/api/logbook', 'a', logBody('log-b'))).status, 404);
  assert.equal((await api('POST', '/api/logbook', 'b', logBody(undefined))).status, 409, 'Legacy non-midnight records still reserve the calendar day.');
  assert.equal((await api('POST', '/api/logbook', 'a', logBody('log-a-approved'))).status, 409);
  assert.equal((await api('DELETE', '/api/logbook/log-a-approved', 'a')).status, 409);
  const row = (await db.query('SELECT "tasksDone","mentorApproved" FROM "DailyLog" WHERE id=$1', ['log-a-approved'])).rows[0];
  assert.equal(row.tasksDone, '["Original task"]'); assert.equal(row.mentorApproved, true);
  assert.equal((await api('POST', '/api/logbook', 'a', logBody('log-a-pending', '2026-10-02'))).status, 200);
});

test('single and batch approval cannot cross companies or placement history', async () => {
  assert.equal((await api('PUT', '/api/logbook/log-a-pending/approve', 'hr-b', { mentorRating: 5 })).status, 403);
  assert.equal((await api('POST', '/api/logbook/batch-approve', 'hr-b', { studentId: 'a', weekNumber: 1, mentorRating: 5 })).status, 403);
  assert.equal((await api('PUT', '/api/logbook/log-a-pending/approve', 'hr-a', { mentorRating: 6 })).status, 400);
  const approved = await api('POST', '/api/logbook/batch-approve', 'hr-a', { studentId: 'a', applicationId: 'app-a', weekNumber: 1, mentorRating: 4, mentorFeedback: 'Reviewed' });
  assert.equal(approved.status, 200); assert.equal(approved.body.logs.length, 2);
  assert.equal((await db.query('SELECT "mentorApproved" FROM "DailyLog" WHERE id=$1', ['log-a-old'])).rows[0].mentorApproved, false);
  assert.equal((await api('POST', '/api/logbook', 'a', logBody('log-a-pending', '2026-10-02'))).status, 409);
});

test('rubrics validate the placement, identity pair, and score range', async () => {
  const body = { studentId: 'a', applicationId: 'app-a', workQualityScore: 5, punctualityScore: 4, teamworkScore: 3, feedback: 'Good progress' };
  assert.equal((await api('POST', '/api/evaluations/submit', 'hr-b', body)).status, 403);
  assert.equal((await api('POST', '/api/evaluations/submit', 'hr-a', { ...body, studentId: 'b' })).status, 403);
  for (const score of [0, 6, 3.5]) assert.equal((await api('POST', '/api/evaluations/submit', 'hr-a', { ...body, workQualityScore: score })).status, 400);
  assert.equal((await api('POST', '/api/evaluations/submit', 'hr-a', body)).status, 200);
  assert.equal((await api('POST', '/api/evaluations/submit', 'hr-a', { ...body, feedback: 'Updated' })).status, 200);
  const rows = (await db.query('SELECT * FROM "InternshipEvaluation" WHERE "applicationId"=$1', ['app-a'])).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].companyId, 'hr-a'); assert.equal(rows[0].feedback, 'Updated');
});

test('concurrent offers cannot create two committed placements', async () => {
  const results = await Promise.all(['app-c-a', 'app-c-b'].map(id => api('PATCH', '/api/applications/' + id + '/commit', 'c', {})));
  assert.equal(results.filter(result => result.status === 200).length, 1);
  assert.ok(results.every(result => [200, 400, 409].includes(result.status)), JSON.stringify(results));
  const rows = (await db.query('SELECT status FROM "Application" WHERE "studentId"=$1', ['c'])).rows;
  assert.equal(rows.filter(row => row.status === 'COMMITTED').length, 1); assert.equal(rows.filter(row => row.status === 'REJECTED').length, 1);
});

test('applying concurrently with commitment cannot leave an active competing application', async () => {
  const results = await Promise.all([
    api('PATCH', '/api/applications/app-d/commit', 'd', {}),
    api('POST', '/api/applications', 'd', { jobPostId: 'job-b' })
  ]);
  assert.equal(results[0].status, 200);
  assert.ok([201, 400, 409].includes(results[1].status), JSON.stringify(results));
  const rows = (await db.query('SELECT status FROM "Application" WHERE "studentId"=$1', ['d'])).rows;
  assert.equal(rows.filter(row => row.status === 'COMMITTED').length, 1);
  assert.ok(rows.every(row => ['COMMITTED', 'REJECTED'].includes(row.status)));
  assert.equal((await api('POST', '/api/applications', 'd', { jobPostId: 'job-a2' })).status, 400);
});

test('concurrent applications enforce one active application per company', async () => {
  const results = await Promise.all(['job-a', 'job-a2'].map(jobPostId => api('POST', '/api/applications', 'e', { jobPostId })));
  assert.equal(results.filter(result => result.status === 201).length, 1);
  assert.ok(results.every(result => [201, 400, 409].includes(result.status)), JSON.stringify(results));
});

test('job deletion preserves committed placements and their records', async () => {
  assert.equal((await api('DELETE', '/api/jobs/job-a', 'hr-a')).status, 409);
  assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "Application" WHERE id=$1', ['app-a'])).rows[0].count, 1);
  assert.equal((await api('POST', '/api/applications', 'f', { jobPostId: 'job-closed' })).status, 404);
});

test('validation rejects malformed accounts, profiles, dates and hours', async () => {
  assert.equal((await api('POST', '/api/auth/register', null, { email: 'admin@test.invalid', name: 'Admin', password: 'password123', role: 'UNIVERSITY_ADMIN' })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', null, { email: 'short@test.invalid', name: 'Test', password: 'x', role: 'STUDENT' })).status, 400);
  assert.equal((await api('PUT', '/api/student/profile', 'a', { gpa: 8 })).status, 400);
  assert.equal((await api('PUT', '/api/student/profile', 'a', { year: 7 })).status, 400);
  for (const changes of [{ hoursWorked: -2 }, { hoursWorked: 13 }, { logDate: '2026-02-30' }, { logDate: '2999-01-01' }, { tasksDone: '{}' }]) {
    assert.equal((await api('POST', '/api/logbook', 'g', { ...logBody('log-g'), ...changes })).status, 400);
  }
  assert.equal((await api('GET', '/api/jobs')).status, 200, 'The existing public homepage can load real postings.');
});

test('editing and approval serialize: the final signed content cannot change', async () => {
  const results = await Promise.all([
    api('POST', '/api/logbook', 'g', logBody('log-g')),
    api('PUT', '/api/logbook/log-g/approve', 'hr-a', { mentorRating: 5 })
  ]);
  assert.ok([200, 409].includes(results[0].status), JSON.stringify(results)); assert.equal(results[1].status, 200);
  const signed = (await db.query('SELECT "tasksDone","mentorApproved" FROM "DailyLog" WHERE id=$1', ['log-g'])).rows[0];
  assert.equal(signed.mentorApproved, true);
  assert.equal((await api('POST', '/api/logbook', 'g', { ...logBody('log-g'), tasksDone: '["Tampered"]' })).status, 409);
  assert.equal((await db.query('SELECT "tasksDone" FROM "DailyLog" WHERE id=$1', ['log-g'])).rows[0].tasksDone, signed.tasksDone);
});

// Teerayut screening, account recovery and notifications - uses test DB only.
async function accountMessage(address, subject, previous = new Set()) {
  for (let i=0;i<40;i++) {
    const mailbox = await (await fetch('http://127.0.0.1:8025/api/v1/messages?limit=100')).json();
    const item = (mailbox.messages||[]).find(m => !previous.has(m.ID) && m.Subject.includes(subject) && (m.To||[]).some(to => to.Address===address));
    if (item) { const full=await (await fetch('http://127.0.0.1:8025/api/v1/message/'+item.ID)).json(); const token=full.Text.match(/#token=([a-f0-9]{64})/);assert.ok(token,'Email must contain a complete token');return {id:item.ID,token:token[1]}; }
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw Error('Expected account email not received by local test SMTP.');
}

test('notifications are owned by their recipient and workflow changes create them',async()=>{
  await user('screen');await job('job-screen','hr-a');await application('app-screen','screen','job-screen','PENDING');
  assert.equal((await api('PATCH','/api/applications/app-screen/status','hr-a',{status:'REVIEWING'})).status,200);
  const own=await api('GET','/api/notifications','screen');assert.equal(own.status,200);assert.ok(own.body.unreadCount>=1);
  const notice=own.body.items.find(n=>n.kind==='APPLICATION_STATUS');assert.ok(notice);
  await api('PATCH','/api/notifications/'+notice.id+'/read','b');
  assert.equal((await db.query('SELECT "readAt" FROM "Notification" WHERE id=$1',[notice.id])).rows[0].readAt,null);
  await api('PATCH','/api/notifications/'+notice.id+'/read','screen');
  assert.ok((await db.query('SELECT "readAt" FROM "Notification" WHERE id=$1',[notice.id])).rows[0].readAt);
});

test('portfolio versions preserve evidence history, private files and company boundaries',async()=>{
  const body={title:'Research and React prototype',summary:'Built an accessible prototype using research notes.',contribution:'Designed and implemented navigation; teammates collected surveys.',skills:['Research','React'],evidenceDate:'2026-01-05',linkUrl:'https://example.org/demo',aiConsent:false};
  assert.equal((await api('GET','/api/screening/app-screen','hr-b')).status,404);
  assert.equal((await api('GET','/api/screening/app-screen','b')).status,404);
  assert.equal((await api('POST','/api/screening/app-screen/evidence','hr-a',body)).status,403);
  assert.equal((await api('POST','/api/screening/app-screen/evidence','screen',{...body,linkUrl:'javascript:alert(1)'})).status,400);
  const first=await api('POST','/api/screening/app-screen/evidence','screen',body);assert.equal(first.status,201);
  const second=await api('POST','/api/screening/app-screen/evidence','screen',{...body,previousId:first.body.id,summary:'Improved keyboard interaction.'});assert.equal(second.status,201);assert.equal(second.body.version,2);assert.equal(second.body.projectKey,first.body.projectKey);
  assert.equal((await api('POST','/api/screening/app-screen/evidence','screen',{...body,previousId:first.body.id})).status,409);
  const history=(await api('GET','/api/screening/app-screen','hr-a')).body;assert.equal(history.evidence.length,2);assert.equal(history.evidence.find(e=>e.id===first.body.id).summary,body.summary);
  assert.equal((await api('POST','/api/screening/app-screen/portfolio-ai','hr-a',{evidenceIds:[first.body.id],consent:true})).status,403);
  assert.equal((await api('POST','/api/screening/app-screen/questions-ai','hr-a',{count:4})).status,503,'No real Gemini requests from regression tests');
  const manual={summary:'HR reviewed the prototype; interview to confirm individual contribution.',skills:[{skill:'React',status:'SUPPORTED',evidenceIds:[second.body.id],reason:'Navigation prototype is documented.',followUp:'Explain keyboard focus handling.'}],limitations:['Authorship is not independently proven.']};
  assert.equal((await api('POST','/api/screening/app-screen/portfolio-review','hr-a',{report:manual})).status,201);
  const published=(await api('GET','/api/screening/app-screen','screen')).body.reviews;assert.equal(published.length,1);assert.equal(published[0].source,'MANUAL');
  const form=new FormData();form.append('file',new Blob(['%PDF-1.4\nSynthetic portfolio fixture'],{type:'application/pdf'}),'portfolio-test.pdf');form.append('applicationId','app-screen');form.append('type','PORTFOLIO_EVIDENCE');
  const upload=await fetch(base+'/api/upload/evidence',{method:'POST',headers:{Authorization:'Bearer '+tokens.screen},body:form});assert.equal(upload.status,200);const file=await upload.json();assert.ok(file.fileUrl.startsWith('/private-uploads/'));
  assert.equal((await fetch(base+file.fileUrl)).status,404);
  assert.equal((await fetch(base+'/uploads/'+file.fileUrl.split('/').pop())).status,404);
  assert.equal((await fetch(base+'/api/screening/app-screen/files/'+file.documentId)).status,401);
  assert.equal((await fetch(base+'/api/screening/app-screen/files/'+file.documentId,{headers:{Authorization:'Bearer '+tokens['hr-b']}})).status,404);
  assert.equal((await fetch(base+'/api/screening/app-screen/files/'+file.documentId,{headers:{Authorization:'Bearer '+tokens['hr-a']}})).status,200);
  await require('node:fs/promises').unlink(path.join(privateUploadRoot,file.fileUrl.split('/').pop()));
});

test('HR templates are frozen at assignment, answer keys stay private and submission is single use',async()=>{
  const q=[{prompt:'Describe one accessibility issue you fixed.',skill:'Research',type:'TEXT',options:[],expectedAnswer:'Explain observation, change and validation.',points:10},{prompt:'Which HTTP verb usually retrieves a resource?',skill:'Web',type:'CHOICE',options:['GET','DELETE'],expectedAnswer:'GET',points:5}];
  assert.equal((await api('PUT','/api/screening/app-screen/template','hr-b',{title:'Skill sample',questions:q})).status,404);
  assert.equal((await api('PUT','/api/screening/app-screen/template','hr-a',{title:'Skill sample',questions:q})).status,200);
  assert.equal((await api('POST','/api/screening/app-screen/assign','hr-a',{dueAt:new Date(Date.now()-1000).toISOString()})).status,400);
  assert.equal((await api('POST','/api/screening/app-screen/assign','hr-a',{dueAt:new Date(Date.now()+86400000).toISOString()})).status,201);
  await api('PUT','/api/screening/app-screen/template','hr-a',{title:'Updated template',questions:[{...q[0],prompt:'Different future question'}]});
  const student=(await api('GET','/api/screening/app-screen','screen')).body;
  assert.equal(student.template,null);assert.equal(student.assessment.title,'Skill sample');assert.equal(student.assessment.questions.length,2);assert.ok(student.assessment.questions.every(item=>!('expectedAnswer' in item)));
  const a=student.assessment;const answers={[a.questions[0].id]:'I tested focus order, fixed navigation and retested.',[a.questions[1].id]:'GET'};
  assert.equal((await api('POST','/api/screening/app-screen/answers','b',{answers})).status,404);
  assert.equal((await api('POST','/api/screening/app-screen/answers','screen',{answers:{}})).status,400);
  const submitted=await Promise.all([api('POST','/api/screening/app-screen/answers','screen',{answers}),api('POST','/api/screening/app-screen/answers','screen',{answers})]);assert.deepEqual(submitted.map(r=>r.status).sort(),[200,409]);
  const scores={[a.questions[0].id]:8,[a.questions[1].id]:5};
  assert.equal((await api('POST','/api/screening/app-screen/assessment-review','hr-a',{scores:{...scores,[a.questions[0].id]:11},feedback:'Review'})).status,400);
  assert.equal((await api('POST','/api/screening/app-screen/assessment-review','hr-a',{scores,feedback:'Clear explanation; discuss the validation method in interview.'})).status,200);
  assert.equal((await api('POST','/api/screening/app-screen/assessment-review','hr-a',{scores,feedback:'Overwrite'})).status,409);
  const result=(await api('GET','/api/screening/app-screen','screen')).body;assert.equal(result.assessment.status,'REVIEWED');assert.equal(result.assessment.review.percentage,86.67);assert.equal(result.application.status,'REVIEWING');
  assert.ok((await api('GET','/api/notifications','screen')).body.items.some(n=>n.kind==='ASSESSMENT_REVIEWED'));
  assert.equal((await api('DELETE','/api/jobs/job-screen','hr-a')).status,409,'Evidence and assessment history must survive a job delete attempt');
});

test('email verification and password recovery use expiring single-use tokens and invalidate old sessions',async()=>{
  const address='verify-'+randomBytes(4).toString('hex')+'@test.invalid';const initial='initial-test-123';
  const registered=await api('POST','/api/auth/register',null,{email:address,password:initial,name:'Verification fixture',role:'STUDENT'});assert.equal(registered.status,201);assert.equal(registered.body.emailSent,true);
  assert.equal((await api('POST','/api/auth/login',null,{email:address,password:initial})).status,403);
  const old=await accountMessage(address,'Verify your email');
  await api('POST','/api/auth/resend-verification',null,{email:address});
  const newest=await accountMessage(address,'Verify your email',new Set([old.id]));
  assert.equal((await api('POST','/api/auth/verify-email',null,{token:old.token})).status,400);
  assert.equal((await api('POST','/api/auth/verify-email',null,{token:newest.token})).status,200);
  assert.equal((await api('POST','/api/auth/verify-email',null,{token:newest.token})).status,400);
  const logged=await api('POST','/api/auth/login',null,{email:address,password:initial});assert.equal(logged.status,200);tokens.recovery=logged.body.token;
  const known=await api('POST','/api/auth/forgot-password',null,{email:address});const unknown=await api('POST','/api/auth/forgot-password',null,{email:'not-registered@example.invalid'});assert.deepEqual(known.body,unknown.body);assert.equal(known.status,200);
  const expired=await accountMessage(address,'Reset your password');const hash=require('node:crypto').createHash('sha256').update(expired.token).digest('hex');
  const tokenRow=(await db.query('SELECT "tokenHash" FROM "AccountToken" WHERE "tokenHash"=$1',[hash])).rows[0];assert.ok(tokenRow);assert.notEqual(tokenRow.tokenHash,expired.token);
  await db.query('UPDATE "AccountToken" SET "expiresAt"=NOW()-interval \'1 minute\' WHERE "tokenHash"=$1',[hash]);
  assert.equal((await api('POST','/api/auth/reset-password',null,{token:expired.token,password:'new-test-password'})).status,400);
  await api('POST','/api/auth/forgot-password',null,{email:address});const reset=await accountMessage(address,'Reset your password',new Set([expired.id]));
  const results=await Promise.all([api('POST','/api/auth/reset-password',null,{token:reset.token,password:'new-test-password'}),api('POST','/api/auth/reset-password',null,{token:reset.token,password:'new-test-password'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  assert.equal((await api('GET','/api/notifications','recovery')).status,401);
  assert.equal((await api('POST','/api/auth/login',null,{email:address,password:initial})).status,401);
  assert.equal((await api('POST','/api/auth/login',null,{email:address,password:'new-test-password'})).status,200);
},{timeout:30000});

test('job questionnaires can be configured before applicants and hide answer keys',async()=>{
 await user('apply-flow');await user('apply-files');await user('apply-foreign');await job('flow-job','hr-a');await job('flow-files','hr-b');
 const questions=[{prompt:'Which method retrieves data?',skill:'Web',type:'CHOICE',options:['GET','DELETE'],expectedAnswer:'GET',points:5},{prompt:'Describe your own contribution.',skill:'Communication',type:'TEXT',options:[],expectedAnswer:'Specific responsibilities and limitations.',points:10}];
 assert.equal((await api('PUT','/api/screening/jobs/flow-job/questionnaire','hr-b',{title:'Role screening',questions,onApply:true})).status,404);
 assert.equal((await api('PUT','/api/screening/jobs/flow-job/questionnaire','apply-flow',{title:'Role screening',questions,onApply:true})).status,403);
 const saved=await api('PUT','/api/screening/jobs/flow-job/questionnaire','hr-a',{title:'Role screening',questions,onApply:true});assert.equal(saved.status,200);
 const config=await api('GET','/api/screening/jobs/flow-job/application-form','apply-flow');assert.equal(config.status,200);assert.equal(config.body.questionnaire.questions.length,2);assert.ok(config.body.questionnaire.questions.every(q=>!('expectedAnswer' in q)));
 assert.equal((await api('GET','/api/screening/jobs/flow-job/questionnaire','hr-b')).status,404);
 assert.equal((await api('GET','/api/screening/jobs/flow-files/application-form','apply-files')).body.questionnaire,null);
});

test('application submission requires current complete answers and stores a frozen assessment atomically',async()=>{
 const config=(await api('GET','/api/screening/jobs/flow-job/application-form','apply-flow')).body;
 assert.equal((await api('POST','/api/applications','apply-flow',{jobPostId:'flow-job'})).status,409);
 assert.equal((await api('POST','/api/applications','apply-flow',{jobPostId:'flow-job',questionnaire:{version:config.questionnaire.version,answers:{}}})).status,400);
 const answers=Object.fromEntries(config.questionnaire.questions.map(q=>[q.id,q.type==='CHOICE'?'GET':'I analysed the notes; my teammate collected the responses.']));
 assert.equal((await api('POST','/api/applications','apply-flow',{jobPostId:'flow-job',questionnaire:{version:999,answers}})).status,409);
 assert.equal((await db.query('SELECT count(*)::int as count FROM "Application" WHERE "studentId"=$1',['apply-flow'])).rows[0].count,0);
 const result=await api('POST','/api/applications','apply-flow',{jobPostId:'flow-job',questionnaire:{version:config.questionnaire.version,answers}});assert.equal(result.status,201);
 const appId=result.body.application.id;
 const assessment=(await api('GET','/api/screening/'+appId,'hr-a')).body.assessment;
 assert.equal(assessment.status,'SUBMITTED');assert.deepEqual(assessment.answers,answers);assert.equal(assessment.questions[0].expectedAnswer,'GET');
 const student=(await api('GET','/api/screening/'+appId,'apply-flow')).body;assert.ok(student.assessment.questions.every(q=>!('expectedAnswer' in q)));
 const summary=(await api('GET','/api/applications/company','hr-a')).body.find(a=>a.id===appId).screeningSummary;assert.equal(summary.assessmentStatus,'SUBMITTED');assert.equal(summary.needsReview,true);
 assert.ok(!(await api('GET','/api/applications/company','hr-b')).body.some(a=>a.id===appId));
 assert.equal((await api('PUT','/api/screening/jobs/flow-job/questionnaire','hr-a',{onApply:false,enabledOnly:true})).status,200);
 assert.equal((await api('GET','/api/screening/jobs/flow-job/application-form','apply-foreign')).body.questionnaire,null);
 assert.deepEqual((await api('GET','/api/screening/'+appId,'hr-a')).body.assessment.questions,assessment.questions);
});

test('pre-application files stay private and an owned, unchanged AI preview is attached to the final evidence',async()=>{
 const fs=require('node:fs/promises'),crypto=require('node:crypto');
 const bytes=Buffer.from('%PDF-1.4\nSynthetic application artifact');
 const form=new FormData();form.append('file',new Blob([bytes],{type:'application/pdf'}),'application-portfolio.pdf');
 const upload=await fetch(base+'/api/upload/application',{method:'POST',headers:{Authorization:'Bearer '+tokens['apply-files']},body:form});assert.equal(upload.status,200);const file=await upload.json();
 try{
  assert.ok(file.fileUrl.startsWith('/private-uploads/'));assert.equal((await fetch(base+file.fileUrl)).status,404);
  assert.equal((await api('POST','/api/applications','apply-foreign',{jobPostId:'flow-files',documentIds:[file.documentId]})).status,400);
  assert.equal((await api('POST','/api/screening/jobs/flow-files/portfolio-preview','apply-files',{documentIds:[file.documentId],consent:false})).status,400);
  assert.equal((await api('POST','/api/screening/jobs/flow-files/portfolio-preview','apply-files',{documentIds:[file.documentId],consent:true})).status,503,'No paid provider requests in regressions');
  const report={summary:'Review the synthetic research artifact.',skills:[{skill:'Research',status:'PARTIAL',evidenceIds:[file.documentId],reason:'Artifact exists; discuss methods.',followUp:'Explain your contribution.'}],limitations:['Authorship is not proven.']};
  await db.query('INSERT INTO "ApplicationPreparation" (id,"userId","jobPostId","documentIds",hashes,report,contribution,skills,model,"expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()+interval \'1 hour\')',['prep-flow','u-apply-files','flow-files',[file.documentId],JSON.stringify({[file.documentId]:crypto.createHash('sha256').update(bytes).digest('hex')}),JSON.stringify(report),'I designed the study.','Research','synthetic-test']);
  const body={jobPostId:'flow-files',documentIds:[file.documentId],preparationId:'prep-flow',contribution:'I designed the study.',skills:'Research',aiConsent:true};
  assert.equal((await api('POST','/api/applications','apply-files',{...body,contribution:'Changed claim'})).status,409);
  assert.equal((await api('POST','/api/applications','apply-files',{...body,aiConsent:false})).status,409);
  const result=await api('POST','/api/applications','apply-files',body);assert.equal(result.status,201);const id=result.body.application.id;
  const hr=(await api('GET','/api/screening/'+id,'hr-b')).body;assert.equal(hr.evidence.length,1);assert.equal(hr.reviews.length,1);assert.deepEqual(hr.reviews[0].report.skills[0].evidenceIds,[hr.evidence[0].id]);assert.equal(hr.evidence[0].documentId,file.documentId);
  assert.equal((await api('GET','/api/screening/'+id,'hr-a')).status,404);
  assert.equal((await fetch(base+'/api/screening/'+id+'/files/'+file.documentId,{headers:{Authorization:'Bearer '+tokens['hr-b']}})).status,200);
  assert.equal((await api('GET','/api/screening/'+id,'apply-files')).body.reviews.length,0,'AI draft is not masqueraded as published HR feedback');
  const summary=(await api('GET','/api/applications/company','hr-b')).body.find(a=>a.id===id).screeningSummary;assert.equal(summary.evidenceCount,1);assert.equal(summary.aiCurrent,false);assert.equal(summary.aiSummary,null,'Legacy evaluative AI reports are preserved but not shown as factual summaries');
  assert.equal((await db.query('SELECT COUNT(*)::int as count FROM "ApplicationPreparation" WHERE id=$1',['prep-flow'])).rows[0].count,0);
 }finally{await fs.unlink(path.join(privateUploadRoot,file.fileUrl.split('/').pop()));}
});

test('disabled questionnaires keep simple application flow and old unanswered forms cannot bypass a new requirement',async()=>{
 await job('flow-toggle','hr-a');await user('apply-toggle');
 const config=await api('GET','/api/screening/jobs/flow-toggle/application-form','apply-toggle');assert.equal(config.body.questionnaire,null);
 const questions=[{prompt:'Explain one research method.',skill:'Research',type:'TEXT',options:[],expectedAnswer:'Purpose, method and limitation.',points:10}];
 await api('PUT','/api/screening/jobs/flow-toggle/questionnaire','hr-a',{title:'Required questions',questions,onApply:true});
 assert.equal((await api('POST','/api/applications','apply-toggle',{jobPostId:'flow-toggle'})).status,409);
 await api('PUT','/api/screening/jobs/flow-toggle/questionnaire','hr-a',{onApply:false,enabledOnly:true});
 const submitted=await api('POST','/api/applications','apply-toggle',{jobPostId:'flow-toggle'});assert.equal(submitted.status,201);
 assert.equal((await api('GET','/api/screening/'+submitted.body.application.id,'hr-a')).body.assessment,null);
});


test('factual portfolio summaries preserve exact role requirements and reject invented evidence',()=>{
 const script=`const assert=require('node:assert/strict');const {criteria,validateSummary,validateAnchoredQuestions,questionContext}=require('./src/lib/portfolioSummary.ts');
 const job={title:'Marketing Intern',description:'Schedule social posts and report campaign results.',requirements:'Write social copy; Use Excel for campaign reports'};
 const required=criteria(job);assert.deepEqual(required,[{id:'R1',text:'Write social copy'},{id:'R2',text:'Use Excel for campaign reports'}]);
 const input={summary:'One sample social post is attached.',contents:[{title:'Social copy',detail:'One example caption.',evidenceIds:['file-a']}],requirements:[{id:'R1',status:'FOUND',detail:'A caption is present.',evidenceIds:['file-a']},{id:'R2',status:'NOT_FOUND',detail:'No spreadsheet report is present.',evidenceIds:[]}],limitations:[]};
 const good=validateSummary(input,new Set(['file-a']),required,job,'English');assert.equal(good.format,'PORTFOLIO_SUMMARY_V2');assert.ok(!('skills' in good));assert.ok(!('score' in good));assert.equal(good.requirements[1].text,required[1].text);
 assert.throws(()=>validateSummary({...input,requirements:[input.requirements[0]]},new Set(['file-a']),required,job,'English'));
 assert.throws(()=>validateSummary({...input,contents:[{...input.contents[0],evidenceIds:['someone-else-file']}]},new Set(['file-a']),required,job,'English'));
 assert.throws(()=>validateSummary({...input,requirements:[input.requirements[0],{...input.requirements[1],id:'invented-SQL'}]},new Set(['file-a']),required,job,'English'));
 const anchors=questionContext(job).anchors;const q={prompt:'Write a sample caption for this role.',skill:'Social copy',type:'TEXT',options:[],expectedAnswer:'Audience, concise message and call to action.',points:10,contextId:'R1',contextQuote:'Write social copy'};
 assert.equal(validateAnchoredQuestions([q],anchors,1)[0].contextQuote,'Write social copy');assert.throws(()=>validateAnchoredQuestions([{...q,contextQuote:'React development'}],anchors,1));assert.throws(()=>validateAnchoredQuestions([{...q,contextId:'fake'}],anchors,1));assert.throws(()=>questionContext({title:'Unspecified role',description:'',requirements:''}));
 console.log('PASS: summary structure, exact requirement coverage, evidence scope and question anchors.');`;
 const result=execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',script],{cwd,env:{...process.env,GEMINI_API_KEY:''},encoding:'utf8'});assert.match(result,/PASS:/);
});

test('modern automatic summaries are cached, scoped, mapped to final evidence, and HR comments stay optional',async()=>{
 await user('auto-summary');await job('job-auto-summary','hr-a');
 const bytes=Buffer.from('%PDF-1.4\nSynthetic coding artifact');const form=new FormData();form.append('file',new Blob([bytes],{type:'application/pdf'}),'auto-summary.pdf');
 const response=await fetch(base+'/api/upload/application',{method:'POST',headers:{Authorization:'Bearer '+tokens['auto-summary']},body:form});assert.equal(response.status,200);const file=await response.json();
 try{
  const crypto=require('node:crypto');const context=crypto.createHash('sha256').update(JSON.stringify(['job-auto-summary','React TypeScript engineering','React TypeScript engineering'])).digest('hex');
  const report={format:'PORTFOLIO_SUMMARY_V2',summary:'The file contains a synthetic coding artifact.',contents:[{title:'Prototype',detail:'An example artifact is present.',evidenceIds:[file.documentId]}],requirements:[{id:'R1',text:'React TypeScript engineering',status:'PARTIAL',detail:'A sample artifact is present; no implementation details were found.',evidenceIds:[file.documentId]}],limitations:['Synthetic fixture only.'],contextHash:context,language:'English'};
  await db.query('INSERT INTO "ApplicationPreparation" (id,"userId","jobPostId","documentIds",hashes,report,contribution,skills,model,"expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()+interval \'1 hour\')',['auto-prep','u-auto-summary','job-auto-summary',[file.documentId],JSON.stringify({[file.documentId]:crypto.createHash('sha256').update(bytes).digest('hex')}),JSON.stringify(report),'','','synthetic-test']);
  const submitted=await api('POST','/api/applications','auto-summary',{jobPostId:'job-auto-summary',documentIds:[file.documentId],preparationId:'auto-prep',aiConsent:true,contribution:'Changed optional claim after the file-only summary.',skills:'Research'});assert.equal(submitted.status,201,JSON.stringify(submitted.body));const id=submitted.body.application.id;
  const student=(await api('GET','/api/screening/'+id,'auto-summary')).body;assert.equal(student.automaticSummary.format,'PORTFOLIO_SUMMARY_V2');assert.deepEqual(student.automaticSummary.contents[0].evidenceIds,[student.evidence[0].id]);assert.equal(student.reviews.length,0);
  const before=(await db.query('SELECT COUNT(*)::int AS count FROM "PortfolioReview" WHERE "applicationId"=$1',[id])).rows[0].count;
  const cached=await api('POST','/api/screening/'+id+'/portfolio-summary','hr-a',{language:'en'});assert.equal(cached.status,200,JSON.stringify(cached.body));assert.equal(cached.body.report.summary,report.summary);
  assert.equal((await api('POST','/api/screening/'+id+'/portfolio-summary','hr-b',{language:'en'})).status,404);
  assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "PortfolioReview" WHERE "applicationId"=$1',[id])).rows[0].count,before,'Opening the same summary must not create another provider request or review record');
  const summary=(await api('GET','/api/applications/company','hr-a')).body.find(a=>a.id===id).screeningSummary;assert.equal(summary.aiCurrent,true);assert.equal(summary.aiMissingRequirements[0].text,'React TypeScript engineering');assert.ok(!('aiNeedsReview' in summary));
  assert.equal((await api('PATCH','/api/applications/'+id+'/status','hr-a',{status:'REVIEWING'})).status,200,'HR may advance an application without writing comments');
  const optional=(await api('GET','/api/applications/company','hr-a')).body.find(a=>a.id===id).screeningSummary;assert.equal(optional.manualCurrent,false);assert.equal(optional.needsReview,false,'Optional comments must not create a pending review requirement');
 }finally{await require('node:fs/promises').unlink(path.join(privateUploadRoot,file.fileUrl.split('/').pop()));}
});


test('Gemini UTF-8 decoding preserves Thai and emoji even when network chunks split every byte',()=>{
 const script=`const assert=require('node:assert/strict');const https=require('node:https');const {PassThrough}=require('node:stream');const {EventEmitter}=require('node:events');
 const expected={summary:'โครงการคำบรรยายโซเชียลมีเดียและปฏิทินเนื้อหา ภาษาไทยครบถ้วน',detail:'คำบรรยายเรื่องการรีฟิลและลดขยะ 🌿 เรียนรู้การสื่อสาร'};
 const encoded=Buffer.from(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(expected)}]}}]}),'utf8');
 const realRequest=https.request;
 https.request=(_url,_options,onResponse)=>{const req=new EventEmitter();req.setTimeout=()=>req;req.destroy=error=>req.emit('error',error);req.end=()=>{const stream=new PassThrough();stream.statusCode=200;onResponse(stream);for(let i=0;i<encoded.length;i++)stream.write(encoded.subarray(i,i+1));stream.end();};return req;};
 process.env.GEMINI_API_KEY='synthetic-test-key';
 const {geminiJson,hasBrokenText}=require('./src/lib/screening.ts');
 (async()=>{try{const actual=await geminiJson('Synthetic regression only.',{},{});assert.deepEqual(actual,expected);assert.equal(hasBrokenText(actual),false);assert.equal(hasBrokenText({summary:'เสีย\\uFFFD'}),true);console.log('PASS: split UTF-8 Thai and emoji survive the actual provider response reader.');}finally{https.request=realRequest;}})().catch(e=>{console.error(e);process.exitCode=1});`;
 const result=execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',script],{cwd,env:{...process.env,GEMINI_API_KEY:''},encoding:'utf8'});assert.match(result,/PASS:/);
});


test('question drafting repairs only rejected questions, retains accepted ones and reports partial drafts honestly',()=>{
 const script=`const assert=require('node:assert/strict');const {draftJobQuestionSet}=require('./src/lib/portfolioSummary.ts');const {HttpError}=require('./src/lib/workflow.ts');
 const job={title:'Digital Engineering',description:'Need a coding website',requirements:'Use React, JSON, Python'};
 const raw=[{prompt:'Explain how a React component receives JSON data.',skill:'React',type:'TEXT',options:[],expectedAnswer:'Describe props and rendering a small supplied data object.',points:10,contextId:'R1'},{prompt:'Build an unrelated marketing strategy.',skill:'JSON',type:'TASK',options:[],expectedAnswer:'An irrelevant initial draft.',points:10,contextId:'R2'}];
 async function run(mode){let calls=0,retainedId='';const ask=async(_system,data)=>{calls++;
 if(calls===1)return {questions:raw};
 if(calls===2){retainedId=data.questions[0].id;return {checks:data.questions.map((q,i)=>({id:q.id,relevant:mode==='none'?false:i===0,reason:i===0?'Relevant basic React work.':'The marketing task does not test JSON. Rewrite it as a JSON data-handling task.'}))};}
 if(calls===3){assert.ok(data.rejected.every(r=>r.replacesId!==retainedId)||mode==='none');assert.ok(data.rejected.some(r=>r.reason.includes('marketing')));return {questions:data.rejected.map(r=>({...raw[1],prompt:'Given a short JSON string, parse it and describe handling invalid JSON.',contextId:r.contextId,type:r.originalType,replacesId:r.replacesId,expectedAnswer:'Parse valid JSON and handle a malformed example without crashing.'}))};}
 if(calls===4)return {checks:data.questions.map(q=>({id:q.id,relevant:mode==='full',reason:mode==='full'?'This is a relevant intern JSON task.':'The revision still needs a clearer expected answer.'}))};
 throw Error('Unexpected extra generation');};
 if(mode==='none'){await assert.rejects(()=>draftJobQuestionSet(job,'English',2,ask),e=>e.status===502);return;}
 const result=await draftJobQuestionSet(job,'English',2,ask);assert.equal(calls,4);assert.equal(result.questions[0].id,retainedId);assert.equal(result.questions[0].prompt,raw[0].prompt);assert.equal(result.requestedCount,2);
 if(mode==='full'){assert.equal(result.questions.length,2);assert.equal(result.omittedCount,0);assert.equal(result.notice,null);assert.match(result.questions[1].prompt,/JSON string/);}
 else{assert.equal(result.questions.length,1);assert.equal(result.omittedCount,1);assert.match(result.notice,/1 checked questions out of 2/);assert.ok(result.questions.every(q=>!q.prompt.includes('marketing')));}
 }
 (async()=>{await run('full');await run('partial');await run('none');let calls=0;await assert.rejects(()=>draftJobQuestionSet(job,'English',2,async()=>{calls++;throw new HttpError(429,'Quota exhausted.');}),e=>e.status===429);assert.equal(calls,1);console.log('PASS: targeted repair, preserved passing questions, explicit partial results and unchanged provider-error handling.');})().catch(e=>{console.error(e);process.exitCode=1});`;
 const result=execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',script],{cwd,env:{...process.env,GEMINI_API_KEY:''},encoding:'utf8'});assert.match(result,/PASS:/);
});


test('optional HR prompt reaches drafting and audit, allows requested formats, and validates before provider calls',()=>{
 const script=`const assert=require('node:assert/strict');const {draftJobQuestionSet,validateAnchoredQuestions,questionContext}=require('./src/lib/portfolioSummary.ts');
 const job={title:'Digital Engineering',description:'Need a coding website',requirements:'Use React, JSON, Python'};const guidance='Focus on beginner React state and props. Multiple-choice questions only.';
 const raw=[{prompt:'Which value can a React component receive from its parent?',skill:'React',type:'CHOICE',options:['Props','An undeclared local variable'],expectedAnswer:'Props',points:5,contextId:'R1'},{prompt:'Which hook stores local state in a React function component?',skill:'React',type:'CHOICE',options:['useState','A plain constant with no setter'],expectedAnswer:'useState',points:5,contextId:'R1'}];
 (async()=>{let calls=0;const ask=async(_system,data)=>{calls++;assert.equal(data.hrGuidance,guidance);assert.equal(data.job.requirements,job.requirements);if(calls===1)return {questions:raw};return {checks:data.questions.map(q=>({id:q.id,relevant:true,reason:'Relevant basic React knowledge in the requested format.'}))};};const result=await draftJobQuestionSet(job,'English',2,ask,guidance);assert.equal(result.questions.length,2);assert.ok(result.questions.every(q=>q.type==='CHOICE'));assert.equal(calls,2);
 assert.throws(()=>validateAnchoredQuestions(raw,questionContext(job).anchors,2));
 let called=false;for(const invalid of [123,{},'x'.repeat(2001)])await assert.rejects(()=>draftJobQuestionSet(job,'English',2,async()=>{called=true;return {};},invalid),e=>e.status===400);assert.equal(called,false);
 console.log('PASS: optional HR guidance, requested format, unchanged role context and early validation.');})().catch(e=>{console.error(e);process.exitCode=1});`;
 const result=execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',script],{cwd,env:{...process.env,GEMINI_API_KEY:''},encoding:'utf8'});assert.match(result,/PASS:/);
});

test('requirement coverage scores partial evidence transparently and never scores absent or stale summaries',()=>{
 const script=`const assert=require('node:assert/strict');const {requirementCoverage}=require('../frontend/src/utils/requirementCoverage.ts');
 const report={format:'PORTFOLIO_SUMMARY_V2',contextHash:'current-job',summary:'Synthetic fixture',contents:[{title:'Prototype',detail:'Artifact',evidenceIds:['e1']}],requirements:[{id:'R1',text:'React',status:'FOUND',detail:'Component present.',evidenceIds:['e1']},{id:'R2',text:'JSON',status:'PARTIAL',detail:'Some structured data.',evidenceIds:['e1']},{id:'R3',text:'Python',status:'NOT_FOUND',detail:'Not documented.',evidenceIds:[]}],limitations:[]};
 assert.deepEqual(requirementCoverage(report,'current-job'),{percentage:50,score:1.5,maximum:3,found:1,partial:1,notFound:1});
 assert.equal(requirementCoverage({...report,requirements:report.requirements.map(q=>({...q,status:'FOUND'}))},'current-job').percentage,100);
 assert.equal(requirementCoverage({...report,requirements:report.requirements.map(q=>({...q,status:'NOT_FOUND'}))},'current-job').score,0);
 assert.equal(requirementCoverage(report,'changed-job'),null);assert.equal(requirementCoverage(null),null);assert.equal(requirementCoverage({...report,requirements:[]}),null);assert.equal(requirementCoverage({...report,contents:[]}),null);assert.equal(requirementCoverage({...report,requirements:[report.requirements[0],report.requirements[0]]}),null);
 console.log('PASS: partial evidence weights, clear score denominator, zero evidence versus unavailable, and stale-context protection.');`;
 const result=execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',script],{cwd,env:{...process.env,GEMINI_API_KEY:''},encoding:'utf8'});assert.match(result,/PASS:/);
});

test('HR guidance endpoints reject invalid prompt values without requiring configured AI',async()=>{
 for(const guidance of [{unexpected:true},'x'.repeat(2001)]){
  assert.equal((await api('POST','/api/screening/jobs/job-screen/questionnaire-ai','hr-a',{language:'en',guidance})).status,400);
  assert.equal((await api('POST','/api/screening/app-screen/questions-ai','hr-a',{count:4,language:'en',guidance})).status,400);
 }
 assert.equal((await api('POST','/api/screening/jobs/job-screen/questionnaire-ai','hr-b',{guidance:'Focus on practical tasks.'})).status,404);
});


test('cancelled placement logs remain read-only with or without a new active placement', async () => {
  await user('archive'); await job('job-archive', 'hr-c');
  await application('app-archive', 'archive', 'job-archive', 'CANCELLED');
  await log('log-archive', 'archive', 'app-archive', '2026-09-12');
  assert.equal((await api('DELETE', '/api/logbook/log-archive', 'archive')).status, 409);
  assert.equal((await api('DELETE', '/api/logbook/log-a-old', 'a')).status, 409);
  assert.equal((await api('POST', '/api/logbook', 'archive', logBody('log-archive','2026-09-12'))).status, 403);
  assert.equal((await api('GET', '/api/logbook/my', 'archive')).body.logs[0].id, 'log-archive');
  assert.equal((await db.query('SELECT id FROM "DailyLog" WHERE id IN ($1,$2)', ['log-archive','log-a-old'])).rowCount, 2);
});

test('concurrent sign-offs preserve the first rating and feedback; repeat batch is a no-op', async () => {
  await user('signoff'); await job('job-signoff', 'hr-a');
  await application('app-signoff', 'signoff', 'job-signoff', 'COMMITTED');
  await log('log-signoff', 'signoff', 'app-signoff', '2026-09-13');
  const reviews=[{mentorRating:2,mentorFeedback:'First review'},{mentorRating:5,mentorFeedback:'Other review'}];
  const replies=await Promise.all(reviews.map(review=>api('PUT','/api/logbook/log-signoff/approve','hr-a',review)));
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
  const winner=replies.findIndex(r=>r.status===200);
  const original=(await db.query('SELECT "mentorRating","mentorFeedback" FROM "DailyLog" WHERE id=$1',['log-signoff'])).rows[0];
  assert.deepEqual(original,reviews[winner]);
  const repeat=await api('POST','/api/logbook/batch-approve','hr-a',{studentId:'signoff',applicationId:'app-signoff',weekNumber:1,mentorRating:1,mentorFeedback:'Do not overwrite'});
  assert.equal(repeat.status,200);assert.equal(repeat.body.updatedCount,0);
  assert.deepEqual((await db.query('SELECT "mentorRating","mentorFeedback" FROM "DailyLog" WHERE id=$1',['log-signoff'])).rows[0],original);
});

test('weekly averages use all rated approved days without mislabelling a daily comment as a weekly review', async () => {
  await user('averages'); await job('job-averages','hr-a'); await application('app-averages','averages','job-averages','COMMITTED');
  for(const [id,day,approved,score,feedback] of [['log-average-a','2026-09-14',true,5,'Day one'],['log-average-b','2026-09-15',true,2,'Day two'],['log-average-c','2026-09-16',false,5,'Not approved']]) {
    await log(id,'averages','app-averages',day,approved);await db.query('UPDATE "DailyLog" SET "mentorRating"=$2,"mentorFeedback"=$3 WHERE id=$1',[id,score,feedback]);
  }
  for(const result of [await api('GET','/api/logbook/my','averages'),await api('GET','/api/logbook/student/averages?applicationId=app-averages','hr-a')]) {
    assert.equal(result.status,200);const week=result.body.groupedWeeks[0];assert.equal(week.mentorRating,3.5);assert.equal(week.ratedDays,2);assert.equal(week.mentorFeedback,null);assert.equal(week.approvedHours,16);
  }
});

test('evaluation rejects whitespace-only feedback and missing or blank scores without changing saved results', async () => {
  const body={studentId:'averages',applicationId:'app-averages',workQualityScore:3,punctualityScore:4,teamworkScore:2,feedback:'Specific observations'};
  assert.equal((await api('POST','/api/evaluations/submit','hr-a',body)).status,200);
  for(const patch of [{feedback:' \n\t '},{workQualityScore:''},{punctualityScore:null},{teamworkScore:undefined}]) assert.equal((await api('POST','/api/evaluations/submit','hr-a',{...body,...patch})).status,400);
  const row=(await db.query('SELECT feedback,"workQualityScore" FROM "InternshipEvaluation" WHERE "applicationId"=$1',['app-averages'])).rows[0];
  assert.deepEqual(row,{feedback:'Specific observations',workQualityScore:3});
});

test('unsafe attachment schemes cannot be saved into logbook', async () => {
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/secret','/private-uploads/no-file.pdf','/uploads/../secret','https://user:password@example.test/']) assert.equal((await api('POST','/api/logbook','averages',{...logBody(undefined,'2026-09-20'),attachmentUrl:JSON.stringify([{title:'Unsafe',url}])})).status,400,url);
});

test('logbook files require authentication and ownership; placement company can read and public images remain public', async () => {
  const form=new FormData();
  form.append('applicationId','app-averages');form.append('file',new Blob(['%PDF-1.4\nSynthetic private logbook attachment\n%%EOF'],{type:'application/pdf'}),'logbook-test.pdf');
  const uploaded=await fetch(base+'/api/upload/logbook',{method:'POST',headers:{Authorization:'Bearer '+tokens.averages},body:form});
  assert.equal(uploaded.status,200);const file=await uploaded.json();const url=file.url;
  assert.ok(url);
  assert.equal((await api('POST','/api/logbook','averages',{...logBody(undefined,'2026-09-21'),weekNumber:4,attachmentUrl:JSON.stringify([{title:'Private evidence',url}])})).status,201);
  assert.equal((await api('POST','/api/logbook','b',{...logBody(undefined,'2026-09-21'),attachmentUrl:JSON.stringify([{title:'Not my file',url}])})).status,400);
  assert.equal((await fetch(base+url)).status,404,'Anonymous direct file URL is private.');
  const content='/api/logbook-files/content?url='+encodeURIComponent(url);
  assert.equal((await fetch(base+content)).status,401);
  for(const actor of ['averages','hr-a']){
    const response=await fetch(base+content,{headers:{Authorization:'Bearer '+tokens[actor]}});assert.equal(response.status,200);assert.match(await response.text(),/Synthetic private logbook attachment/);assert.match(response.headers.get('cache-control'),/no-store/);
  }
  for(const actor of ['b','hr-b']) assert.equal((await fetch(base+content,{headers:{Authorization:'Bearer '+tokens[actor]}})).status,404);
  // Archived evidence remains readable to its owner and original company.
  await db.query('UPDATE "Application" SET status=$2 WHERE id=$1',['app-averages','CANCELLED']);
  assert.equal((await fetch(base+content,{headers:{Authorization:'Bearer '+tokens['hr-a']}})).status,200);
  const image=new FormData();image.append('purpose','profile-image');image.append('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'avatar.png');
  const publicUpload=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+tokens['hr-a']},body:image});assert.equal(publicUpload.status,200);const publicFile=await publicUpload.json();assert.equal((await fetch(base+publicFile.url)).status,200);
});

test('individual readiness is optional, company-scoped, validates schedule and rejects stale settings', async()=>{
  assert.equal((await api('GET','/api/readiness/applications/app-a/settings','hr-a')).body.readinessEnabled,false);
  assert.equal((await api('GET','/api/readiness/applications/app-a/settings','hr-b')).status,404);
  assert.equal((await api('PUT','/api/readiness/applications/app-a/settings','a',{enabled:true,version:0})).status,403);
  const config={enabled:true,version:0,startDate:'2026-12-10',deadline:'2026-12-08T17:00:00+07:00'};
  for(const patch of [{enabled:'yes'},{version:'0'},{startDate:'2026-02-30'},{deadline:'2026-12-11T12:00:00+07:00'},{deadline:'2026-12-08T17:00:00'}])assert.equal((await api('PUT','/api/readiness/applications/app-a/settings','hr-a',{...config,...patch})).status,400);
  const saved=await api('PUT','/api/readiness/applications/app-a/settings','hr-a',config);assert.equal(saved.status,200);assert.equal(saved.body.readinessVersion,1);
  assert.equal((await api('PUT','/api/readiness/applications/app-a/settings','hr-a',config)).status,409);
  const identical=await api('PUT','/api/readiness/applications/app-a/settings','hr-a',{...config,version:1});assert.equal(identical.body.readinessVersion,1);
  const student=await api('GET','/api/applications/my','a');assert.equal(student.body.find(a=>a.id==='app-a').readiness.status,'PENDING');
  const company=await api('GET','/api/applications/company','hr-a');assert.equal(company.body.find(a=>a.id==='app-a').readiness.version,1);
  assert.equal(student.body.find(a=>a.id==='app-old').readiness,null);
});

test('student web and HR email confirmations preserve their source and are idempotent, scoped and versioned',async()=>{
  assert.equal((await api('POST','/api/readiness/applications/app-a/confirm','b',{version:1})).status,404);
  assert.equal((await api('POST','/api/readiness/applications/app-a/confirm-email','hr-b',{version:1})).status,404);
  assert.equal((await api('POST','/api/readiness/applications/app-a/confirm','a',{version:0})).status,409);
  const first=await api('POST','/api/readiness/applications/app-a/confirm','a',{version:1});assert.equal(first.status,200);assert.equal(first.body.status,'CONFIRMED_WEB');
  const repeat=await api('POST','/api/readiness/applications/app-a/confirm-email','hr-a',{version:1});assert.equal(repeat.body.confirmation.source,'STUDENT_WEB');assert.equal(repeat.body.confirmation.confirmedAt,first.body.confirmation.confirmedAt);
  await api('PUT','/api/readiness/applications/app-a/settings','hr-a',{enabled:true,version:1,startDate:'2026-12-11',deadline:'2026-12-09T17:00:00+07:00'});
  const current=(await api('GET','/api/applications/my','a')).body.find(a=>a.id==='app-a').readiness;assert.equal(current.status,'PENDING');assert.equal(current.version,2);
  assert.equal((await api('POST','/api/readiness/applications/app-a/confirm','a',{version:1})).status,409);
  const email=await api('POST','/api/readiness/applications/app-a/confirm-email','hr-a',{version:2});assert.equal(email.body.status,'CONFIRMED_EMAIL');assert.equal(email.body.confirmation.recordedBy,'u-hr-a');
  assert.equal((await db.query('SELECT id FROM "ReadinessConfirmation" WHERE "applicationId"=$1',['app-a'])).rowCount,2);
  await api('PUT','/api/readiness/applications/app-a/settings','hr-a',{enabled:false,version:2});
  assert.equal((await api('GET','/api/applications/my','a')).body.find(a=>a.id==='app-a').readiness,null);
  assert.equal((await api('POST','/api/readiness/applications/app-a/confirm','a',{version:3})).status,409);
  await api('PUT','/api/readiness/applications/app-a/settings','hr-a',{enabled:true,version:3,startDate:'2026-12-11',deadline:'2026-12-09T17:00:00+07:00'});
  assert.equal((await api('GET','/api/applications/my','a')).body.find(a=>a.id==='app-a').readiness.status,'PENDING');
  await db.query('UPDATE "Application" SET status=$2 WHERE id=$1',['app-a','CANCEL_REQUESTED']);
  assert.equal((await api('GET','/api/applications/my','a')).body.find(a=>a.id==='app-a').readiness.status,'PAUSED');
  assert.equal((await api('POST','/api/readiness/applications/app-a/confirm-email','hr-a',{version:4})).status,409);
});

test('readiness reminders survive processor restarts without duplicate notifications or cancelling placements',async()=>{
  await user('readiness');await job('job-readiness','hr-c');await application('app-readiness','readiness','job-readiness','COMMITTED');
  await api('PUT','/api/readiness/applications/app-readiness/settings','hr-c',{enabled:true,version:0,startDate:'2026-12-20',deadline:'2026-12-18T17:00:00+07:00'});
  const run=(now)=>execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',`const {processReadinessNotices}=require('./src/lib/readiness.ts'); const p=require('./src/lib/prisma.ts').default; processReadinessNotices(new Date('${now}')).then(()=>p.$disconnect()).then(()=>process.exit(0)).catch(async e=>{console.error(e);await p.$disconnect();process.exit(1);});`],{cwd,env:{...process.env,DATABASE_URL:dbUrl.href,GEMINI_API_KEY:''},stdio:'pipe',timeout:15000});
  run('2026-12-14T00:00:00Z');assert.equal((await db.query('SELECT id FROM "ReadinessNotice" WHERE "applicationId"=$1',['app-readiness'])).rowCount,0);
  run('2026-12-16T00:00:00Z');run('2026-12-16T00:00:00Z');
  assert.equal((await db.query('SELECT id FROM "Notification" WHERE "userId"=$1 AND kind=$2',['u-readiness','READINESS_REQUESTED'])).rowCount,1);
  run('2026-12-19T00:00:00Z');run('2026-12-19T00:00:00Z');
  assert.equal((await db.query('SELECT id FROM "Notification" WHERE "userId"=$1 AND kind=$2',['u-readiness','READINESS_OVERDUE'])).rowCount,1);
  assert.equal((await db.query('SELECT status FROM "Application" WHERE id=$1',['app-readiness'])).rows[0].status,'COMMITTED');
  const confirmations=await Promise.all([api('POST','/api/readiness/applications/app-readiness/confirm','readiness',{version:1}),api('POST','/api/readiness/applications/app-readiness/confirm-email','hr-c',{version:1})]);
  assert.ok(confirmations.every(r=>r.status===200));assert.equal(confirmations[0].body.confirmation.source,confirmations[1].body.confirmation.source);
  assert.equal((await db.query('SELECT id FROM "ReadinessConfirmation" WHERE "applicationId"=$1',['app-readiness'])).rowCount,1);
});


test('legacy public logbook URLs are protected without moving files or exposing them to a new company', async()=>{
  const filename='legacy-'+randomBytes(12).toString('hex')+'.pdf';fs.writeFileSync(path.join(uploadRoot,filename),'%PDF-1.4 Legacy synthetic evidence');
  const url='/uploads/'+filename;
  await db.query('UPDATE "DailyLog" SET "attachmentUrl"=$2 WHERE id=$1',['log-archive',JSON.stringify([{title:'Legacy evidence',url}])]);
  assert.equal((await fetch(base+url)).status,404);
  for(const actor of ['archive','hr-c']) {const response=await fetch(base+'/api/logbook-files/content?url='+encodeURIComponent(url),{headers:{Authorization:'Bearer '+tokens[actor]}});assert.equal(response.status,200);assert.match(await response.text(),/Legacy synthetic evidence/);}
  assert.equal((await fetch(base+'/api/logbook-files/content?url='+encodeURIComponent(url),{headers:{Authorization:'Bearer '+tokens['hr-a']}})).status,404);
  await db.query('UPDATE "DailyLog" SET "attachmentUrl"=$2 WHERE id=$1',['log-archive',JSON.stringify([{title:'Legacy absolute',url:'http://localhost:4000'+url}])]);
  assert.equal((await fetch(base+url)).status,404);
  assert.ok(fs.existsSync(path.join(uploadRoot,filename)),'Original evidence bytes are retained.');
});


test('removing or deleting a pending legacy log never republishes its attachment',async()=>{
  await user('legacy-active');await job('job-legacy-active','hr-c');await application('app-legacy-active','legacy-active','job-legacy-active','COMMITTED');
  for(const action of ['edit','delete']) {
    const filename='retained-'+randomBytes(12).toString('hex')+'.pdf', url='/uploads/'+filename, id='legacy-'+action;
    fs.writeFileSync(path.join(uploadRoot,filename),'%PDF-1.4 Retained private evidence');
    const day=action==='edit'?'2026-09-25':'2026-09-26';await log(id,'legacy-active','app-legacy-active',day);
    await db.query('UPDATE "DailyLog" SET "attachmentUrl"=$2 WHERE id=$1',[id,JSON.stringify([{title:'Private legacy',url}])]);
    // Do not request the legacy file first: the mutation itself must retain privacy.
    if(action==='edit')assert.equal((await api('POST','/api/logbook','legacy-active',{...logBody(id,day),attachmentUrl:null})).status,200);
    else assert.equal((await api('DELETE','/api/logbook/'+id,'legacy-active')).status,200);
    assert.equal((await fetch(base+url)).status,404);
    const content='/api/logbook-files/content?url='+encodeURIComponent(url);
    assert.equal((await fetch(base+content,{headers:{Authorization:'Bearer '+tokens['legacy-active']}})).status,200);
    assert.equal((await fetch(base+content,{headers:{Authorization:'Bearer '+tokens['hr-c']}})).status,200);
    assert.equal((await fetch(base+content,{headers:{Authorization:'Bearer '+tokens['hr-b']}})).status,404);
  }
});


test('publishing saves a required questionnaire atomically and protects the first application',async()=>{
 const title='Atomic questionnaire publishing';
 const listing={title,description:'Build and explain a small React interface.',requirements:'React; Communication',location:'Demo',isActive:true};
 const qs=[{id:'publish-q1',type:'TEXT',skill:'Communication',prompt:'Explain how you would describe your React component to a teammate.',expectedAnswer:'A clear explanation of inputs, output and limitations.',points:10,options:[]}];
 const before=await db.query('SELECT id FROM "JobPost" WHERE title=$1',[title]);
 assert.equal((await api('POST','/api/jobs','hr-a',{...listing,questionnaire:{title:'Required',onApply:true,questions:[]}})).status,400);
 assert.equal((await db.query('SELECT id FROM "JobPost" WHERE title=$1',[title])).rowCount,before.rowCount,'Invalid questions must not leave an already published job');
 assert.equal((await api('POST','/api/jobs','hr-a',{...listing,questionnaire:{title:'Required',onApply:false,questions:qs}})).status,400);
 const published=await api('POST','/api/jobs','hr-a',{...listing,questionnaire:{title:'Required React questions',onApply:true,questions:qs}});assert.equal(published.status,201);
 await user('publish-new');
 const form=await api('GET',`/api/screening/jobs/${published.body.id}/application-form`,'publish-new');assert.equal(form.status,200);assert.equal(form.body.questionnaire.questions.length,1);assert.ok(!('expectedAnswer' in form.body.questionnaire.questions[0]));
 assert.equal((await api('POST','/api/applications','publish-new',{jobPostId:published.body.id})).status,409);
 const answers={[form.body.questionnaire.questions[0].id]:'I would explain the props, rendering behaviour and a concrete example.'};
 assert.equal((await api('POST','/api/applications','publish-new',{jobPostId:published.body.id,questionnaire:{version:form.body.questionnaire.version,answers}})).status,201);
 assert.equal((await api('GET','/api/screening/jobs/questionnaire-draft/config','hr-a')).status,200);
 assert.equal((await api('GET','/api/screening/jobs/questionnaire-draft/config','publish-new')).status,403);
 assert.equal((await api('POST','/api/screening/jobs/questionnaire-draft','hr-a',{job:{title:'',description:'',requirements:''}})).status,400);
});

test('two interns in the same job have independent schedules, versions and confirmations',async()=>{
 await user('schedule-one');await user('schedule-two');await job('job-schedule-pair','hr-c');
 await application('app-schedule-one','schedule-one','job-schedule-pair','COMMITTED');await application('app-schedule-two','schedule-two','job-schedule-pair','COMMITTED');
 const one={enabled:true,version:0,startDate:'2026-12-10',deadline:'2026-12-08T17:00:00+07:00'};
 const two={enabled:true,version:0,startDate:'2026-12-20',deadline:'2026-12-18T17:00:00+07:00'};
 assert.equal((await api('PUT','/api/readiness/applications/app-schedule-one/settings','hr-c',one)).status,200);
 assert.equal((await api('PUT','/api/readiness/applications/app-schedule-two/settings','hr-c',two)).status,200);
 assert.equal((await api('POST','/api/readiness/applications/app-schedule-one/confirm','schedule-one',{version:1})).body.status,'CONFIRMED_WEB');
 const own=(await api('GET','/api/applications/my','schedule-two')).body.find(a=>a.id==='app-schedule-two');assert.equal(own.readiness.status,'PENDING');assert.match(own.readiness.startDate,/2026-12-19T17:00/);
 await api('PUT','/api/readiness/applications/app-schedule-one/settings','hr-c',{...one,version:1,startDate:'2026-12-11'});
 const unchanged=await api('GET','/api/readiness/applications/app-schedule-two/settings','hr-c');assert.equal(unchanged.body.readinessVersion,1);assert.equal(unchanged.body.readinessStartDate,own.readiness.startDate);
 assert.equal((await api('GET','/api/readiness/applications/app-schedule-two/settings','hr-a')).status,404);
 assert.equal((await api('PUT','/api/readiness/applications/app-old/settings','hr-b',one)).status,409);
 assert.equal((await api('PUT','/api/readiness/jobs/job-schedule-pair','hr-c',one)).status,410);
});

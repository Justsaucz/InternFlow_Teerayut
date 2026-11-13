const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.API_PUBLIC_URL='https://internflow-teerayut-api-lrov.onrender.com';
process.env.DATABASE_URL ||= 'postgresql://build:build@localhost:5432/build';
const {browserFileUrl,browserAttachments}=require('../dist/lib/logbook-urls');
const {storagePath}=require('../dist/routes/logbook-private.routes');
const {validateAttachments}=require('../dist/lib/logbook-attachments');
const key='/private-uploads/work-evidence.pdf';
const absolute=process.env.API_PUBLIC_URL+'/uploads'+key;
test('uploaded attachment is an absolute URL acceptable to a URL field',()=>{
  assert.equal(browserFileUrl(key),absolute);
  assert.equal(new URL(browserFileUrl(key)).protocol,'https:');
});
test('stored attachment reopens with an absolute URL and its original label',()=>{
  assert.deepEqual(JSON.parse(browserAttachments(JSON.stringify([{title:'Evidence',url:key}]))),[{title:'Evidence',url:absolute}]);
});
test('legacy string attachments and public upload paths remain supported',()=>{
  assert.deepEqual(JSON.parse(browserAttachments(JSON.stringify([key]))),[absolute]);
  assert.equal(browserFileUrl('/uploads/legacy.pdf'),process.env.API_PUBLIC_URL+'/uploads/legacy.pdf');
});
test('external links are preserved and traversal is never rewritten as an upload',()=>{
  assert.equal(browserFileUrl('https://example.com/report'), 'https://example.com/report');
  assert.equal(browserFileUrl('/private-uploads/../secret'),'/private-uploads/../secret');
  assert.equal(storagePath('https://untrusted.example/private-uploads/work-evidence.pdf'),null);
});
test('authenticated file lookup accepts both relative and same-origin absolute keys',()=>{
  assert.equal(storagePath(key),key);
  assert.equal(storagePath(absolute),key);
  assert.equal(storagePath(process.env.API_PUBLIC_URL+key),key);
  assert.equal(storagePath('/uploads'+key),key);
});
function tx(own){return {document:{findFirst:async({where})=>own&&where.userId==='student-a'&&where.applicationId==='placement-a'&&where.OR.some(v=>v.fileUrl===key)?{id:'own-file'}:null},dailyLog:{findMany:async()=>[]}};}
test('saving a newly uploaded absolute URL checks ownership then stores its private key',async()=>{
  const result=await validateAttachments(tx(true),JSON.stringify([{title:'Evidence',url:absolute}]),'student-a','placement-a');
  assert.equal(JSON.parse(result)[0].url,key);
});
test('another student cannot attach a same-origin private file',async()=>{
  await assert.rejects(validateAttachments(tx(false),JSON.stringify([{title:'Evidence',url:absolute}]),'student-b','placement-a'),/own logbook file/);
});
test('external HTTP links retain their original URL after validation',async()=>{
  const result=await validateAttachments(tx(false),JSON.stringify([{title:'External',url:'https://example.com/report'}]),'student-a','placement-a');
  assert.equal(JSON.parse(result)[0].url,'https://example.com/report');
});

test('the deployed file opener recognizes the returned URL and requests the protected endpoint',()=>{
  const url = new URL(browserFileUrl(key));
  assert.equal(url.origin, new URL(process.env.API_PUBLIC_URL).origin);
  assert.equal(url.pathname.startsWith('/uploads/'), true);
  const endpoint = new URL('/api/logbook-files/content', url.origin);
  endpoint.searchParams.set('url', url.pathname);
  assert.equal(storagePath(endpoint.searchParams.get('url')), key);
});
test('private preview aliases never grant access across origins or traverse paths',()=>{
  assert.equal(storagePath('https://untrusted.example/uploads'+key),null);
  assert.equal(storagePath('/uploads/private-uploads/../secret'),null);
});
test('legacy full private URLs in existing saved records are converted for the deployed opener',()=>{
  const full=process.env.API_PUBLIC_URL+key;
  assert.equal(storagePath(full),key);
});

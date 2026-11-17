// 질문함 답장 첨부 · 개인 리테스트 (2026-11-17, 리포트 070) E2E
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/qa-files-retest-e2e.js [캡처 폴더]
// 가짜 수파베이스(표·저장소·함수)로 돈다 — 선생님 질문함(첨부 올리기·리테스트 내기·지우기) · 학생 H WORK(첨부 보기·리테스트 풀기).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SHOT = process.argv[2] || '', PORT = 8774, U = 'http://localhost:' + PORT + '/';
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : (f.endsWith('.css') ? 'text/css' : 'application/javascript') }); r.end(b); }); }).listen(PORT);
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const SUB = { id: 77, teacher: '이현지', code: '[테스트] 문장 1회', name: '김철수', school: '화정고', grade: '고1', ts: '2026-11-17 15:00',
  detail: { '1': { type: 'choice5', mine: '2', ok: false }, '2': { type: 'choice5', mine: '3', ok: true }, '3': { type: 'essay', mine: '글', ok: null }, '4': { type: 'ox', mine: 'O', ok: false } }, review: {} };
const KEY = 'a1'.repeat(16);
const DB = { qa: [{ id: 1, sub_id: 77, q: '1', who: '학생', name: '김철수', body: '왜 틀렸어요?', mine: '2', at: '2026-11-17T06:00:00Z', read_at: null, files: [], s: SUB }],
  files: [], up: [], retests: [], rtPosts: [], rtDel: [], stu: [{ code: 'tok-kim', name: '김철수', school: '화정고등학교', grade: '2026 고등 1학년', enrolled: '재원' }, { code: 'x', name: '이영희', school: '화정고', grade: '고1', enrolled: '재원' }],
  rt: { id: 5, teacher: '이현지', code: '[테스트] 문장 1회', name: '김철수', qs: ['1', '4'], submitted: false }, rtSubmit: null, fileUrl: [] };
function fake(rt, u, method, body) {
  if (/teacher-gate|activity\.js|me-back|oh\.js/.test(u) && !u.startsWith(U)) return rt.fulfill({ body: '', contentType: 'text/javascript' });
  if (u.includes('teacher-name.js')) return rt.fulfill({ body: 'window.shuegukTeacherName=()=>Promise.resolve("이현지");', contentType: 'text/javascript' });
  if (u.includes('/auth/v1/token')) return rt.fulfill({ json: { access_token: 'T', expires_in: 3600 } });
  if (u.includes('fonts.g')) return rt.fulfill({ body: '' });
  const st = u.split('/storage/v1')[1];
  if (st) {
    if (method === 'POST') { DB.up.push({ path: st.replace('/object/hwork-reply-files/', ''), auth: rt.request().headers()['authorization'] }); return rt.fulfill({ json: { Key: 'x' } }); }
    return rt.fulfill({ body: PNG, contentType: 'image/png' });
  }
  const rest = u.split('/rest/v1')[1] || '';
  if (rest.startsWith('/hwork_qa')) {
    if (method === 'GET') return rt.fulfill({ json: DB.qa.map(m => Object.assign({}, m, { files: DB.files.filter(f => f.qa_id === m.id) })) });
    if (method === 'POST') { const r = JSON.parse(body); const row = Object.assign({ id: 100 + DB.qa.length, at: new Date().toISOString(), read_at: null, mine: '', s: SUB }, r); DB.qa.push(row); return rt.fulfill({ status: 201, json: [row] }); }
    return rt.fulfill({ status: 204, body: '' });
  }
  if (rest.startsWith('/hwork_reply_files')) { JSON.parse(body).forEach((x, i) => DB.files.push(Object.assign({ id: 300 + DB.files.length }, x))); return rt.fulfill({ status: 201, body: '' }); }
  if (rest.startsWith('/hwork_retests')) {
    if (method === 'GET') return rt.fulfill({ json: DB.retests });
    if (method === 'POST') { const r = JSON.parse(body); DB.rtPosts.push({ rest, r }); r.forEach(x => DB.retests.push(Object.assign({ id: 9, submitted_at: null, created_at: '2026-11-17' }, x))); return rt.fulfill({ status: 201, body: '' }); }
    if (method === 'DELETE') { DB.rtDel.push(rest); DB.retests = []; return rt.fulfill({ status: 204, body: '' }); }
  }
  if (rest.startsWith('/students')) return rt.fulfill({ json: rest.includes('offset=0') ? DB.stu : [] });
  if (rest.startsWith('/hwork_homeworks')) return rt.fulfill({ json: [{ data: { count: 4 } }] });
  if (rest.startsWith('/hwork_src_items')) return rt.fulfill({ json: [] });
  const fn = (u.match(/\/rpc\/([a-z_]+)/) || [])[1];
  if (fn) { const p = (JSON.parse(body || '{}').p) || {}; return rt.fulfill({ json: rpc(fn, p) }); }
  return rt.fulfill({ status: 404, body: '' });
}
function rpc(fn, p) {
  if (fn === 'hwork_retest_open') { if (p.key !== 'tok-kim' || p.id !== 5) return { ok: false, error: '리테스트를 찾을 수 없습니다.' };
    return { ok: true, id: 5, teacher: DB.rt.teacher, code: DB.rt.code, name: DB.rt.name, qs: DB.rt.qs, items: { '1': { type: 'choice5' }, '4': { type: 'ox' } }, submitted: DB.rt.submitted, got: 1, total: 2, detail: { '1': { type: 'choice5', mine: '4', ok: true, ans: '4' }, '4': { type: 'ox', mine: 'O', ok: false } } }; }
  if (fn === 'hwork_qs') return { ok: true, style: 'real', items: { '1': { html: '<div class="stem">리테스트 문제 하나</div>', pid: 'P', src: '' }, '4': { html: '<div class="stem">리테스트 문제 넷</div>', pid: '', src: '' } }, passages: { P: '<div class="psg">함께 보는 지문</div>' } };
  if (fn === 'hwork_retest_submit') { DB.rtSubmit = p; DB.rt.submitted = true; return { ok: true, got: 1, total: 2, submitted_at: '2026-11-17 16:00', detail: { '1': { type: 'choice5', mine: p.answers['1'], ok: true, ans: '4' }, '4': { type: 'ox', mine: p.answers['4'] || '', ok: false } } }; }
  if (fn === 'hwork_retry_state') return p.key === KEY ? { ok: true, stage: 'fix', teacher: SUB.teacher, code: SUB.code, name: SUB.name, got: 1, total: 3, detail: SUB.detail, review: {}, answers: {} } : { ok: false, error: '없음' };
  if (fn === 'hwork_qa_list') return { ok: true, msgs: [{ id: 1, q: '1', who: '학생', name: '김철수', body: '왜 틀렸어요?', mine: '2', at: '2026-11-17 15:00', files: [] },
    { id: 2, q: '1', who: '선생님', name: '이현지', body: '(첨부 파일)', at: '2026-11-17 15:30', read: false, files: [{ id: 300, name: '풀이.png', size: 2048, mime: 'image/png' }, { id: 301, name: '정리.pdf', size: 4096, mime: 'application/pdf' }] }] };
  if (fn === 'hwork_reply_file_url') { DB.fileUrl.push(p); return p.key === KEY ? { ok: true, bucket: 'hwork-reply-files', path: 'r/77/x.png', name: p.file == 300 ? '풀이.png' : '정리.pdf', mime: 'image/png' } : { ok: false, error: 'not_mine' }; }
  if (fn === 'hwork_qa_mine') return { ok: true, list: [] };
  if (fn === 'hwork_meta' || fn === 'hwork_list') return { ok: true, list: [], meta: {} };
  return { ok: false };
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  ctx.on('page', pg => pg.on('dialog', d => d.accept()));
  // ── 1. 선생님 질문함 — 첨부 ──
  const t = await ctx.newPage(); const terr = []; t.on('pageerror', e => terr.push(e.message));
  await t.goto(U + 'hwork_qa.html'); await t.waitForSelector('.th'); await t.click('.th'); await t.waitForSelector('#att');
  ok(await t.locator('#attB').isVisible(), '질문함 — 첨부 버튼');
  await t.locator('#attF').setInputFiles([{ name: '풀이.png', mimeType: 'image/png', buffer: PNG }, { name: '정리.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') }]);
  ok(await t.locator('#att .pf').count() === 2 && await t.locator('#att .pf img').count() === 1, '붙인 파일 칩 2개 · 사진 미리보기');
  await t.locator('#att .pf button').nth(1).click(); ok(await t.locator('#att .pf').count() === 1, '× 로 빼기');
  await t.click('#rIn'); await t.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([1, 2])], 'image.png', { type: 'image/png' }));
    document.getElementById('rIn').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); });
  ok(await t.locator('#att .pf').count() === 2 && (await t.locator('#att').textContent()).includes('캡처_'), 'Ctrl+V 캡처 붙여넣기 — 캡처_ 이름');
  await t.click('#rSend'); await t.waitForFunction(() => document.getElementById('toast').textContent.includes('답장'));
  ok(DB.up.length === 2 && DB.up.every(x => /^r\/77\/[0-9a-f]{24}\.png$/.test(x.path)) && DB.up[0].auth === 'Bearer T', '저장소에 r/제출/무작위 경로로 교사 신분 올림');
  const sent = DB.qa[DB.qa.length - 1];
  ok(sent.who === '선생님' && sent.body === '(첨부 파일)', '글 없이 파일만 — 답장 글은 (첨부 파일)');
  ok(DB.files.length === 2 && DB.files.every(f => f.qa_id === sent.id && f.sub_id === 77 && f.q === '1' && f.created_by === '이현지'), 'hwork_reply_files 에 qa_id·제출·문항·보낸 사람');
  await t.waitForSelector('#det .fs .fimg img');
  ok(await t.locator('#det .bub.tc .fs').count() === 1 && !(await t.locator('#det .bub.tc').last().textContent()).includes('(첨부 파일)'), '대화에 첨부가 보이고 (첨부 파일) 글은 숨김');
  ok(await t.locator('#att .pf').count() === 0, '보낸 뒤 칩 비움');
  // ── 2. 선생님 질문함 — 개인 리테스트 ──
  await t.waitForSelector('#rtMake');
  ok((await t.locator('#rtbox').textContent()).includes('틀린 2문항(1, 4번)'), '리테스트 — 틀린 문항만(서술형 빼고) 1, 4번');
  await t.click('#rtMake'); await t.waitForSelector('#rtDel');
  const rp = DB.rtPosts[0];
  ok(rp && rp.rest.includes('on_conflict=src_id') && rp.r[0].src_id === 77 && rp.r[0].stu_code === 'tok-kim' && JSON.stringify(rp.r[0].qs) === '["1","4"]' && rp.r[0].created_by === '이현지', '리테스트 POST — 원 제출·접근코드·문항·낸 사람');
  ok((await t.locator('#rtbox').textContent()).includes('아직 안 풂'), '낸 뒤 상태 — 아직 안 풂');
  await t.click('#rtDel'); await t.waitForSelector('#rtMake');
  ok(DB.rtDel[0] && DB.rtDel[0].includes('submitted_at=is.null'), '지우기는 안 푼 것만');
  DB.retests = [{ id: 9, qs: ['1', '4'], submitted_at: '2026-11-17 16:00', got: 1, total: 2, detail: { '1': { ok: true }, '4': { ok: false } } }];
  await t.click('#seg [data-m=all]'); await t.click('.th'); await t.waitForFunction(() => document.getElementById('rtbox').textContent.includes('리테스트 1 / 2'));
  ok((await t.locator('#rtbox').textContent()).includes('또 틀림 4번'), '푼 뒤 — 점수·또 틀린 번호');
  if (SHOT) await t.screenshot({ path: path.join(SHOT, 'qa-teacher-files-retest.png') });
  ok(!terr.length, '질문함 오류 없음 ' + terr.join(' | '));
  // 동명이인 — 리테스트 막기
  DB.retests = []; DB.stu.push({ code: 'y', name: '김철수', school: '화정고', grade: '고1', enrolled: '재원' });
  const t2 = await ctx.newPage();
  await t2.goto(U + 'hwork_qa.html'); await t2.click('#seg [data-m=all]'); await t2.waitForSelector('.th'); await t2.click('.th'); await t2.waitForSelector('#rtMake');
  const before = DB.rtPosts.length; await t2.click('#rtMake'); await t2.waitForFunction(() => document.getElementById('toast').textContent.includes('여럿'));
  ok(DB.rtPosts.length === before, '같은 이름 학생이 둘이면 리테스트를 내지 않음');
  // ── 3. 학생 — 첨부 보기 ──
  const s = await ctx.newPage(); const serr = []; s.on('pageerror', e => serr.push(e.message));
  await s.goto(U + 'hwork.html'); await s.evaluate(k => localStorage.setItem('hw_retry_v1', JSON.stringify([{ id: 77, key: k, code: '[테스트] 문장 1회', name: '김철수', at: Date.now() }])), KEY);
  await s.goto(U + 'hwork.html'); await s.waitForSelector('#resumeBox button, #resume button', { timeout: 5000 }).catch(() => {});
  const rb = s.locator('#resumeBox button, #resume button').first();
  if (await rb.count()) await rb.click();
  await s.waitForSelector('#report .qa-btn'); await s.locator('#report tr:has(td.qn:text-is("1")) .qa-btn').click();
  await s.waitForSelector('#qv .rfs .rfimg img');
  ok(await s.locator('#qv .rfs .rfimg').count() === 1 && await s.locator('#qv .rfs .rfb').count() === 1, '학생 — 답장 사진 미리보기·파일 내려받기 버튼');
  ok(!(await s.locator('#qv .bub.tc').textContent()).includes('(첨부 파일)'), '학생 — (첨부 파일) 글 숨김');
  ok(DB.fileUrl.some(x => x.via === 'retry' && x.id === 77 && x.key === KEY && x.file == 300), '학생 — 제출 열쇠로 내려받기 창 열기');
  ok(!serr.length, '학생 첨부 화면 오류 없음 ' + serr.join(' | '));
  // ── 4. 학생 — 리테스트 풀기 ──
  const r = await ctx.newPage(); const rerr = []; r.on('pageerror', e => rerr.push(e.message));
  await r.goto(U + 'hwork.html?rt=5&k=tok-kim'); await r.waitForSelector('#rtGo');
  ok(await r.locator('#report .rtq').count() === 2 && (await r.locator('#report').textContent()).includes('리테스트 문제 하나'), '리테스트 — 2문항 · 문제 원문');
  ok(await r.locator('#report .rtq .gqp, #report .rtq .rq .psg').count() >= 1, '리테스트 — 지문');
  ok(await r.locator('#main').isHidden(), '리테스트 — 보통 화면 숨김');
  await r.locator('.rtq').first().locator('.choices button:nth-child(4)').click();
  await r.click('#rtGo'); await r.waitForSelector('table.detail');
  ok(DB.rtSubmit && DB.rtSubmit.id === 5 && DB.rtSubmit.key === 'tok-kim' && DB.rtSubmit.answers['1'] === '4' && !('4' in DB.rtSubmit.answers), '리테스트 제출 본문(빈 답 확인 뒤)');
  ok((await r.locator('#report').textContent()).includes('1 / 2') && (await r.locator('#report').textContent()).includes('수업 시간에 확인해요'), '결과 — 점수·틀린 정답 감춤');
  if (SHOT) await r.screenshot({ path: path.join(SHOT, 'retest-student.png'), fullPage: true });
  await r.goto(U + 'hwork.html?rt=5&k=bad'); await r.waitForSelector('#report .guide');
  ok((await r.locator('#report').textContent()).includes('찾을 수 없습니다'), '다른 학생 열쇠 — 못 엶');
  ok(!rerr.length, '리테스트 화면 오류 없음 ' + rerr.join(' | '));
  await b.close(); srv.close();
  console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });

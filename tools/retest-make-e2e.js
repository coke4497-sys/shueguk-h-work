// 오답 리테스트 만들기(retest_make.html) · 여러 과제 리테스트 풀기(hwork.html?rt=) E2E — 리포트 071
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/retest-make-e2e.js [캡처 폴더]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SHOT = process.argv[2] || '', PORT = 8776, U = 'http://localhost:' + PORT + '/';
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : (f.endsWith('.css') ? 'text/css' : 'application/javascript') }); r.end(b); }); }).listen(PORT);
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };
const A = 'SHUEGUK REAL 내신 기출 문장 1권(기본·실력) 01 문장 성분 · 기본', B = 'SHUEGUK REAL 내신 기출 문장 1권(기본·실력) 02 서술어 자릿수 · 기본', G = '[모의고사 문법] 음운 1회';
const ch = '<div class="ch">' + [1, 2, 3, 4, 5].map(n => `<div class="c"><span class="cn" data-d="${n}">${'①②③④⑤'[n - 1]}</span> 선지</div>`).join('') + '</div>';
const RQ = n => `<div class="qh"><div class="stem">교재 문항 ${n}</div></div><div class="qb">` + [1, 2, 3, 4, 5].map(k => `<div class="ch"><span class="cn">${'①②③④⑤'[k - 1]}</span> 선지</div>`).join('') + '</div>';
const HW = {
  [A]: { count: 3, items: { '1': { type: 'choice5', ans: 2 }, '2': { type: 'choice5', ans: '3,4' }, '3': { type: 'essay', ans: '예시' } } },
  [B]: { count: 2, items: { '1': { type: 'text', ans: '주어' }, '2': { type: 'choice5', ans: 5 } } },
  [G]: { count: 1, items: { '1': { type: 'choice5', ans: 4 } }, bank: { '1': 101 } } };
const d = (o) => o;
const SUBS = [
  { id: 1, code: A, name: '김철수', school: '화정고', grade: '고1', ts: '11-15', detail: { '1': { type: 'choice5', ok: false }, '2': { type: 'choice5', ok: false }, '3': { type: 'essay', ok: null } }, review: { '2': { cleared_at: 'x' } } },
  { id: 2, code: B, name: '김철수', school: '화정고', grade: '고1', ts: '11-15', detail: { '1': { type: 'text', ok: false }, '2': { type: 'choice5', ok: true } }, review: {} },
  { id: 3, code: A, name: '이영희', school: '능곡고', grade: '고1', ts: '11-15', detail: { '1': { type: 'choice5', ok: true }, '2': { type: 'choice5', ok: true } }, review: {} },
  { id: 4, code: G, name: '김철수', school: '화정고', grade: '고1', ts: '11-16', detail: { '1': { type: 'choice5', ok: false } }, review: {} },
  { id: 5, code: A, name: '박민수', school: '화정고', grade: '고1', ts: '11-15', detail: { '1': { type: 'choice5', ok: false } }, review: {} }];
const DB = { posts: [], made: [], del: [] };
function fake(rt, u, method, body) {
  if (/teacher-gate|activity\.js|me-back/.test(u) && !u.startsWith(U)) return rt.fulfill({ body: '', contentType: 'text/javascript' });
  if (u.includes('teacher-name.js')) return rt.fulfill({ body: 'window.shuegukTeacherName=()=>Promise.resolve("이현지");', contentType: 'text/javascript' });
  if (u.includes('/auth/v1/token')) return rt.fulfill({ json: { access_token: 'T', expires_in: 3600 } });
  if (u.includes('fonts.g')) return rt.fulfill({ body: '' });
  const rest = decodeURIComponent(u.split('/rest/v1')[1] || '');
  const off0 = !/offset=[1-9]/.test(rest);
  if (rest.startsWith('/hwork_homeworks')) {
    if (rest.includes('select=teacher,code')) return rt.fulfill({ json: off0 ? [...Object.keys(HW).map(c => ({ teacher: '이현지', code: c })), { teacher: '다른', code: '다른 과제' }] : [] });
    const c = (rest.match(/code=eq\.(.+?)(&|$)/) || [])[1]; return rt.fulfill({ json: HW[c] ? [{ data: HW[c] }] : [] });
  }
  if (rest.startsWith('/hwork_submissions')) return rt.fulfill({ json: off0 ? SUBS : [] });
  if (rest.startsWith('/hwork_src_items')) { const c = (rest.match(/code=eq\.(.+?)(&|$)/) || [])[1];
    return rt.fulfill({ json: c === A ? [{ no: 1, html: RQ('A1'), pid: 'P1' }, { no: 2, html: RQ('A2'), pid: 'P1' }] : [] }); }
  if (rest.startsWith('/hwork_src_passages')) return rt.fulfill({ json: [{ pid: 'P1', html: '<div class="psg">함께 보는 지문 글</div>' }] });
  if (rest.startsWith('/gbank_items')) return rt.fulfill({ json: [{ id: 101, html: '<div class="qh"><div class="stem">은행 문항</div></div>' + ch, pid: '', ans: 4, src: '' }] });
  if (rest.startsWith('/students')) return rt.fulfill({ json: off0 ? [{ code: 'tok-kim', name: '김철수', school: '화정고등학교', grade: '2026 고등 1학년', enrolled: '재원' }, { code: 'p1', name: '박민수', school: '화정고', grade: '고1', enrolled: '재원' }, { code: 'p2', name: '박민수', school: '화정고', grade: '고1', enrolled: '재원' }] : [] });
  if (rest.startsWith('/hwork_retests')) {
    if (method === 'POST') { const r = JSON.parse(body); DB.posts.push(r); r.forEach((x, i) => DB.made.unshift(Object.assign({ id: 50 + DB.made.length, created_at: '2026-11-17T12:00:00', submitted_at: null }, x))); return rt.fulfill({ status: 201, body: '' }); }
    if (method === 'DELETE') { DB.del.push(rest); return rt.fulfill({ status: 204, body: '' }); }
    return rt.fulfill({ json: DB.made });
  }
  const fn = (u.match(/\/rpc\/([a-z_]+)/) || [])[1];
  if (fn) { const p = (JSON.parse(body || '{}').p) || {}; return rt.fulfill({ json: rpc(fn, p) }); }
  return rt.fulfill({ status: 404, body: '' });
}
let SUBMIT = null;
function rpc(fn, p) {
  if (fn === 'hwork_retest_open') return { ok: true, id: 50, teacher: '이현지', code: '오답 모음', name: '김철수', qs: ['1', '2', '3'],
    items: { '1': { type: 'choice5' }, '2': { type: 'text' }, '3': { type: 'choice5' } },
    parts: [{ teacher: '이현지', code: A, q: '1' }, { teacher: '이현지', code: B, q: '1' }, { teacher: '이현지', code: G, q: '1' }], submitted: false };
  if (fn === 'hwork_qs') { if (p.code === A) return { ok: true, style: 'real', items: { '1': { html: RQ('A1'), pid: 'P1' } }, passages: { P1: '<div class="psg">함께 보는 지문 글</div>' } };
    if (p.code === G) return { ok: true, style: 'gbank', items: { '1': { html: '<div class="qh"><div class="stem">은행 문항</div></div>' + ch, pid: '' } }, passages: {} };
    return { ok: false, reason: 'not_bank' }; }
  if (fn === 'hwork_retest_submit') { SUBMIT = p; return { ok: true, got: 2, total: 3, submitted_at: '2026-11-17 21:00', detail: { '1': { type: 'choice5', mine: '2', ok: true, ans: '2' }, '2': { type: 'text', mine: '주어', ok: true, ans: '주어' }, '3': { type: 'choice5', mine: '1', ok: false } } }; }
  return { ok: false };
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  await ctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  ctx.on('page', pg => pg.on('dialog', dd => dd.accept()));
  const t = await ctx.newPage(); const terr = []; t.on('pageerror', e => terr.push(e.message));
  await t.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await t.goto(U + 'retest_make.html'); await t.waitForSelector('[data-hw]');
  ok((await t.locator('#tSel').inputValue()) === '이현지', '로그인한 선생님으로 강사 자동 선택');
  ok(await t.locator('[data-hw]').count() === 3, '제출이 있는 과제 3개(교재 순)');
  ok((await t.locator('#hList').textContent()).includes('문장 1권(기본·실력) 01 문장 성분'), '과제 이름은 짧게');
  await t.check(`[data-hw="${A}"]`); await t.check(`[data-hw="${B}"]`);
  await t.waitForSelector('[data-st]');
  const rows = await t.locator('#sList .it').allTextContents();
  ok(rows.length === 3 && rows.some(x => /김철수.*오답 2/.test(x)) && rows.some(x => /이영희.*오답 0/.test(x)), '학생별 오답 수 — 클리어·서술형 빼고(김철수 2) ' + rows.join(' | '));
  await t.check('#incClr'); await t.waitForTimeout(100);
  ok((await t.locator('#sList .it', { hasText: '김철수' }).textContent()).includes('오답 3'), '클리어한 것도 넣기 → 3');
  await t.uncheck('#incClr');
  await t.selectOption('#fSch', '화정고'); ok(await t.locator('#sList .it').count() === 2, '학교 거르기');
  await t.click('#sAll'); await t.waitForTimeout(100);
  ok((await t.locator('#sum').textContent()).includes('2명') && (await t.locator('#sum').textContent()).includes('문항 3개'), '요약 — 2명 · 3문항');
  ok((await t.locator('#title').inputValue()) === '오답 모음 · 문장 1권(기본·실력) 01 문장 성분 · 기본 외 1개', '제목 자동');
  ok((await t.locator('#pv').textContent()).includes('김철수 2문항'), '미리보기 줄');
  // 인쇄
  await t.click('#prS'); await t.waitForFunction(() => window.__printed === 1);
  const sh = await t.locator('#print .sheet').count();
  const ps = await t.locator('#print').innerHTML();
  ok(sh === 2 && ps.includes('교재 문항 A1') && ps.includes('함께 보는 지문 글') && ps.includes('김철수'), '학생용 인쇄 — 학생마다 한 장 · 문제·지문');
  ok(ps.includes('class="noq"') && ps.includes('02 서술어 자릿수') , '원문 없는 과제는 교재 n번 칸');
  ok(!ps.includes('cn ok') && !ps.includes('빠른 정답'), '학생용엔 정답 없음');
  await t.click('#prT'); await t.waitForFunction(() => window.__printed === 2);
  const pt = await t.locator('#print').innerHTML();
  ok(pt.includes('빠른 정답') && pt.includes('<span class="cn ok">②</span>') && pt.includes('정답 주어'), '교사용 — 정답 동그라미·빠른 정답·단답 정답');
  if (SHOT) { await t.emulateMedia({ media: 'print' }); await t.pdf({ path: path.join(SHOT, 'retest-print-teacher.pdf') }).catch(() => {}); await t.emulateMedia({ media: 'screen' }); }
  // 온라인
  await t.click('#goOn'); await t.waitForFunction(() => document.getElementById('msg').textContent.length > 0);
  const post = DB.posts[0] || [];
  const kim = post.find(x => x.name === '김철수');
  ok(post.length === 1 && kim && kim.stu_code === 'tok-kim' && JSON.stringify(kim.qs) === '["1","2"]' && kim.parts.length === 2 && kim.parts[0].code === A && kim.parts[0].q === '1' && kim.parts[1].code === B && kim.created_by === '이현지' && kim.src_id === null, '온라인 — 학생마다 parts·qs·접근코드');
  ok((await t.locator('#msg').textContent()).includes('박민수(같은 이름 여럿)'), '같은 이름 학생은 내지 않고 알림');
  await t.waitForSelector('#made .m1'); ok((await t.locator('#made').textContent()).includes('김철수'), '최근에 낸 리테스트 목록');
  await t.click('#made [data-del]'); ok(DB.del[0] && DB.del[0].includes('submitted_at=is.null'), '지우기는 안 푼 것만');
  // 문항 은행 과제 인쇄
  await t.click('#hNone'); await t.check(`[data-hw="${G}"]`); await t.waitForSelector('[data-st]'); await t.click('#sAll'); await t.click('#prT'); await t.waitForFunction(() => window.__printed === 3);
  ok((await t.locator('#print').innerHTML()).includes('<span class="cn ok" data-d="4">'), '문항 은행 과제 — 교사용 정답 동그라미');
  if (SHOT) await t.screenshot({ path: path.join(SHOT, 'retest-make.png') });
  ok(!terr.length, '만들기 화면 오류 없음 ' + terr.join(' | '));
  // 학생 — 여러 과제 리테스트
  const s = await ctx.newPage(); const serr = []; s.on('pageerror', e => serr.push(e.message));
  await s.setViewportSize({ width: 390, height: 900 });
  await s.goto(U + 'hwork.html?rt=50&k=tok-kim'); await s.waitForSelector('#rtGo');
  const tx = await s.locator('#report').textContent();
  ok(await s.locator('.rtq').count() === 3 && tx.includes('교재 문항 A1') && tx.includes('은행 문항') && tx.includes('함께 보는 지문'), '학생 — 과제마다 문제 원문·지문');
  ok(tx.includes('02 서술어 자릿수 · 기본 · 1번') && tx.includes('문항을 보고 풀어 주세요'), '원문 없는 과제는 출처 안내');
  await s.locator('.rtq').nth(0).locator('.choices button:nth-child(2)').click();
  await s.locator('.rtq').nth(1).locator('input.tans').fill('주어');
  await s.locator('.rtq').nth(2).locator('.choices button:nth-child(1)').click();
  await s.click('#rtGo'); await s.waitForSelector('table.detail');
  ok(SUBMIT && SUBMIT.answers['1'] === '2' && SUBMIT.answers['2'] === '주어' && SUBMIT.answers['3'] === '1', '제출 본문 — 리테스트 번호로');
  if (SHOT) await s.screenshot({ path: path.join(SHOT, 'retest-multi-student.png'), fullPage: true });
  ok(!serr.length, '학생 화면 오류 없음 ' + serr.join(' | '));
  await b.close(); srv.close();
  console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });

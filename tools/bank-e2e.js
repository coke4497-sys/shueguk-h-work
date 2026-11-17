// 모의고사 문법 문항 은행 — 출제·인쇄(bank_make.html) · 학생 문제 화면과 질문 대화(hwork.html) · 질문함(hwork_qa.html) E2E
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/bank-e2e.js [캡처 폴더]
// 가짜 수파베이스(표·함수)로 돈다. 실제 문항(저작권 자료)은 저장소에 없으므로 기본은 가짜 문항 4개,
// GBANK_JSON=<tools/gbank_load.py build 결과> 를 주면 그 문항으로 출제 화면을 그려 캡처한다.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SHOT = process.argv[2] || '';
const PORT = 8772;
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : (f.endsWith('.css') ? 'text/css' : 'application/octet-stream') }); r.end(b); });
}).listen(PORT);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };
const U = 'http://localhost:' + PORT + '/';

const ch = (ans) => '<div class="ch">' + [1, 2, 3, 4, 5].map(n => `<div class="c"><span class="cn" data-d="${n}">${'①②③④⑤'[n - 1]}</span><span class="ct">선지 ${n}</span></div>`).join('') + '</div>';
let ITEMS = [
  { id: 101, area: '음운', lvl: '심화', src: '2026 사설 1회 · 고3', kind: '사설', year: '2026', pid: 'p7', ord: 1, html: '<div class="qh"><div class="stem">지문 세트 첫 문항 반모음</div></div>' + ch(), ans: 2, good: '해설 일', bad: ['① 오답 일'], plain: '지문 세트 첫 문항 반모음' },
  { id: 102, area: '음운', lvl: '심화', src: '2026 사설 1회 · 고3', kind: '사설', year: '2026', pid: 'p7', ord: 2, html: '<div class="qh"><div class="stem">지문 세트 둘째 문항</div></div>' + ch(), ans: 4, good: '해설 이', bad: [], plain: '지문 세트 둘째 문항' },
  { id: 103, area: '음운', lvl: '기본', src: '2026학년도 3월 교육청 · 고1', kind: '교육청', year: '2026', pid: '', ord: 3, html: '<div class="qh"><div class="stem">혼자 문항 셋</div></div>' + ch(), ans: 1, good: '해설 삼', bad: [], plain: '혼자 문항 셋' },
  { id: 104, area: '품사', lvl: '실력', src: '2026학년도 6월 평가원 · 고3', kind: '평가원', year: '2026', pid: '', ord: 4, html: '<div class="qh"><div class="stem">품사 문항 넷</div></div>' + ch(), ans: 5, good: '해설 사', bad: [], plain: '품사 문항 넷' },
];
let PAS = [{ pid: 'p7', html: '<p class="pp">지문 본문 글입니다.</p>' }];
if (process.env.GBANK_JSON) { const d = JSON.parse(fs.readFileSync(process.env.GBANK_JSON, 'utf8')); ITEMS = d.items; PAS = d.passages; }
const REAL = !!process.env.GBANK_JSON;

let RS_MODE = false;   // 068 — 이미 낸 교재 과제(SHUEGUK REAL) 원문 잇기
const RQ = n => `<div class="qh"><div class="stem">교재 문항 ${n}</div></div><div class="qb"><div class="bogi"><div class="bl">보기</div><div class="cp">㉠ 보기 글</div></div>` + [1, 2, 3, 4, 5].map(k => `<div class="ch"><span class="cn">${'①②③④⑤'[k - 1]}</span> 선지</div>`).join('') + '</div>';
const DB = { hws: [{ teacher: '이현지', code: '일반 과제', data: { count: 2, items: {} } }], posts: [], saved: null, qa: [], patches: [], deletes: [], calls: [] };

function fake(rt, u, method, body) {
  if (u.includes('teacher-gate.js') || u.includes('activity.js') || u.includes('me-back.js')) return rt.fulfill({ body: '', contentType: 'text/javascript' });
  if (u.includes('teacher-name.js')) return rt.fulfill({ body: 'window.shuegukTeacherName=()=>Promise.resolve("이현지");', contentType: 'text/javascript' });
  if (u.includes('/auth/v1/token')) return rt.fulfill({ json: { access_token: 'T', expires_in: 3600 } });
  if (u.includes('fonts.g')) return rt.fulfill({ body: '' });
  if (u.includes('script.google.com')) { DB.posts.push(JSON.parse(body || '{}')); return rt.fulfill({ json: { ok: true, msg: '저장되었습니다' } }); }
  const rest = u.split('/rest/v1')[1] || '';
  if (rest.startsWith('/gbank_items')) {
    const m = rest.match(/id=eq\.(\d+)/); return rt.fulfill({ json: m ? ITEMS.filter(x => x.id == m[1]) : (rest.includes('offset=0') ? ITEMS : []) });
  }
  if (rest.startsWith('/gbank_passages')) { const m = rest.match(/pid=eq\.([^&]+)/); return rt.fulfill({ json: m ? PAS.filter(p => p.pid === decodeURIComponent(m[1])) : (rest.includes('offset=0') ? PAS : []) }); }
  if (rest.startsWith('/hwork_homeworks')) {
    if (method === 'POST') { DB.saved = JSON.parse(body)[0]; return rt.fulfill({ status: 201, body: '' }); }
    if (rest.includes('teacher=eq') && RS_MODE) return rt.fulfill({ json: [{ data: { count: 3 } }] });
    if (rest.includes('teacher=eq')) return rt.fulfill({ json: [{ data: { bank: { '1': 101, '2': 102, '3': 103 } } }] });
    return rt.fulfill({ json: rest.includes('offset=0') ? DB.hws : [] });
  }
  if (rest.startsWith('/hwork_src_items')) { DB.calls.push({ fn: 'src', rest }); return rt.fulfill({ json: [{ html: RQ(2), pid: 'wb-P1', type: '5지', ans: '③', essay: '', src: '건대부고3 24 1 중간', err: false, book: '문장 1권(기본·실력)' }] }); }
  if (rest.startsWith('/hwork_src_passages')) return rt.fulfill({ json: [{ html: '<div class="psg">교재 지문 글 나랏 말ᄊᆞ미</div>' }] });
  if (rest.startsWith('/students')) return rt.fulfill({ json: rest.includes('offset=0') ? [{ school: '화정고', enrolled: '재원' }, { school: '능곡고', enrolled: '재원' }, { school: '옛학교', enrolled: '퇴원' }] : [] });
  if (rest.startsWith('/hwork_submissions')) return rt.fulfill({ json: [] });
  if (rest.startsWith('/hwork_qa')) {
    if (method === 'GET') return rt.fulfill({ json: DB.qa });
    if (method === 'POST') { const r = JSON.parse(body); DB.qa.push(Object.assign({ id: 900 + DB.qa.length, at: new Date().toISOString(), read_at: null, mine: '', s: DB.qa[0].s }, r)); DB.calls.push({ fn: 'qa-post', r }); return rt.fulfill({ status: 201, body: '' }); }
    if (method === 'PATCH') { DB.patches.push(rest); return rt.fulfill({ status: 204, body: '' }); }
    if (method === 'DELETE') { DB.deletes.push(rest); return rt.fulfill({ status: 204, body: '' }); }
  }
  // 학생 함수
  const fn = (u.match(/\/rpc\/([a-z_]+)/) || [])[1];
  if (fn) { const p = (JSON.parse(body || '{}').p) || {}; DB.calls.push({ fn, p }); return rt.fulfill({ json: rpc(fn, p) }); }
  return rt.fulfill({ status: 404, body: '' });
}

const BANK = { '1': 101, '2': 102, '3': 103 };
const KEY = { '1': 2, '2': 4, '3': 1 };
const S = { id: 55, key: 'ffffffffffffffffffffffffffffffff', review: {}, msgs: [] };
function rpc(fn, p) {
  if (fn === 'hwork_list') return { ok: true, list: [{ teacher: '이현지', code: '[모의고사 문법] 음운 1회', due: '', closed: false }] };
  if (fn === 'hwork_meta') return { ok: true, meta: { teacher: '이현지', code: '[모의고사 문법] 음운 1회', count: 3, schools: ['화정고'], items: { '1': { type: 'choice5' }, '2': { type: 'choice5' }, '3': { type: 'choice5' } }, due: '', closed: false, bank: true } };
  if (fn === 'hwork_qs' && RS_MODE) return { ok: true, style: 'real', items: { '1': { html: RQ(1), pid: 'wb-P1', src: 'A고' }, '2': { html: RQ(2), pid: 'wb-P1', src: 'B고' }, '3': { html: RQ(3), pid: '', src: 'C고' } }, passages: { 'wb-P1': '<div class="psg">교재 지문 글 나랏 말ᄊᆞ미</div>' } };
  if (fn === 'hwork_qs') { const it = {}, ps = {}; for (const k in BANK) { const g = ITEMS.find(x => x.id === BANK[k]); it[k] = { html: g.html, pid: g.pid, src: g.src }; if (g.pid) ps[g.pid] = PAS.find(x => x.pid === g.pid).html; } return { ok: true, items: it, passages: ps }; }
  if (fn === 'hwork_submit') {
    const d = {}; let got = 0; for (const q in KEY) { const okv = String(p.answers[q]) === String(KEY[q]); if (okv) got++; d[q] = { type: 'choice5', mine: String(p.answers[q] || ''), ok: okv }; if (okv) d[q].ans = String(KEY[q]); }
    S.detail = d; S.teacher = p.teacher; S.code = p.code; S.name = p.name;
    return { ok: true, id: S.id, key: S.key, result: { got, total: 3, count: 3, detail: d }, student: { teacher: p.teacher, code: p.code, school: p.school, grade: p.grade, name: p.name } };
  }
  if (fn === 'hwork_qa_mine') return p.key === 'tok-kim' ? { ok: true, list: [{ id: S.id, key: S.key, teacher: '이현지', code: S.code, ts: '2026-11-17 15:00', unread: 1, msgs: 2, done: false }] } : { ok: false, error: 'no_student' };
  if (p.id !== S.id || p.key !== S.key) return { ok: false, error: '제출 기록을 찾을 수 없습니다.' };
  const msgs = () => S.msgs.map(m => Object.assign({}, m));
  if (fn === 'hwork_qa_list') { const r = msgs(); S.msgs.forEach(m => { if (m.who === '선생님') m.read = true; }); return { ok: true, msgs: r }; }
  if (fn === 'hwork_qa_post') { if (!p.text) return { ok: false, error: '질문을 적어 주세요.' }; S.msgs.push({ id: S.msgs.length + 1, q: p.q, who: '학생', name: S.name, body: p.text, mine: S.detail[p.q].mine, at: '2026-11-17 15:10', read: false }); return { ok: true, msgs: msgs() }; }
  if (fn === 'hwork_flag') { (S.review[p.q] = S.review[p.q] || { tries: [] })[p.kind] = { at: '15:10', text: p.text }; return { ok: true, q: p.q, kind: p.kind, at: '15:10' }; }
  if (fn === 'hwork_expl' && RS_MODE) { if (!S.detail[p.q].ok && !(S.review[p.q] || {}).cleared_at) return { ok: false, reason: 'locked', error: '잠김' }; return { ok: true, q: p.q, kind: 'src', type: '5지', ans_text: '②', essay: '', err: false }; }
  if (fn === 'hwork_expl') { if (!S.detail[p.q].ok && !(S.review[p.q] || {}).cleared_at) return { ok: false, reason: 'locked', error: '잠김' }; const g = ITEMS.find(x => x.id === BANK[p.q]); return { ok: true, ans: g.ans, good: g.good, bad: g.bad }; }
  if (fn === 'hwork_retry_state') return { ok: true, stage: 'fix', teacher: S.teacher, code: S.code, name: S.name, got: 1, total: 3, detail: S.detail, review: S.review, answers: {} };
  return { ok: false };
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  ctx.on('page', pg => pg.on('dialog', d => d.accept()));
  // ── 1. 출제·인쇄 ──
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + 'bank_make.html'); await p.waitForSelector('.it');
  ok(await p.locator('#fArea .chip').count() >= 2, '영역 칩');
  if (!REAL) {
    ok((await p.locator('#fInfo').textContent()).includes('문항 4개 · 지문 세트 1개'), '문항·세트 수: ' + await p.locator('#fInfo').textContent());
    ok(await p.locator('.it').count() === 3, '묶음 3개(세트는 한 묶음)');
    ok((await p.locator('.it').first().textContent()).includes('세트 2문항 담기'), '세트 담기 버튼');
    ok(await p.locator('.it').first().locator('.pas').count() === 1, '지문 보기');
    await p.click('.chip[data-k=area][data-v="품사"]'); ok(await p.locator('.it').count() === 1, '영역 거르기');
    await p.click('.chip[data-k=area][data-v=""]');
    await p.fill('#fq', '반모음'); await p.waitForTimeout(400);
    ok(await p.locator('.it').count() === 1 && (await p.locator('.it').textContent()).includes('둘째'), '찾기 — 세트 하나 걸려도 세트 전체');
    await p.fill('#fq', ''); await p.waitForTimeout(400);
    await p.check('#fAns');
    ok(await p.locator('#list.teacher .cn.ok').count() === 4, '정답·해설 보기 — 정답 표시');
    ok(await p.locator('.exb').first().isVisible(), '해설 보임');
    await p.uncheck('#fAns');
    await p.click('[data-add="101"]');
    ok((await p.locator('#selN').textContent()) === '2문항', '세트 담기 → 2문항');
    ok((await p.locator('#sel .sg .n').first().textContent()) === '1~2', '고른 목록 번호 1~2');
    await p.click('[data-add="104"]');
    await p.click('#sel [data-mv="1"][data-d="-1"]');
    ok((await p.locator('#sel .sg .n').first().textContent()) === '1', '순서 바꾸기 — 세트가 통째로 내려감');
    await p.click('[data-add="101"]'); ok((await p.locator('#selN').textContent()) === '1문항', '세트 빼기 — 두 문항 함께');
    await p.click('#autoBtn'); ok((await p.locator('#selN').textContent()) === '4문항', '10문항 채우기 — 남은 문항 다');
    // 인쇄
    await p.fill('#pTitle', '음운 연습');
    await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    await p.click('#prS'); await p.waitForFunction(() => window.__printed === 1);
    const pr = await p.locator('#print').innerHTML();
    ok(pr.includes('음운 연습') && !pr.includes('교사용'), '학생용 제목');
    ok((await p.locator('#print .prng').first().textContent()) === '[02~03]', '지문 범위 [02~03] (품사 문항이 1번)');
    ok(await p.locator('#print .qn').count() === 4, '문항 번호 4개');
    ok(await p.locator('#print .xbox').count() === 0 && !pr.includes('cn ok'), '학생용에 정답·해설 없음');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.wrap')).display) !== 'none', '화면에서는 인쇄본 숨김');
    await p.click('#prT'); await p.waitForFunction(() => window.__printed === 2);
    ok(await p.locator('#print .xbox').count() === 4 && await p.locator('#print .quick').count() === 1, '교사용 해설 4개 + 빠른 정답');
    ok(await p.locator('#print.teacher .cn.ok').count() === 4, '교사용 정답 동그라미');
    await p.emulateMedia({ media: 'print' });
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.wrap')).display) === 'none' && await p.evaluate(() => getComputedStyle(document.getElementById('print')).display) === 'block', '인쇄 때는 시험지만');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'bank-print-teacher.png'), fullPage: true });
    await p.emulateMedia({ media: 'screen' });
    // 저장
    ok((await p.locator('#hTeacher').inputValue()) === '이현지', '담당 강사 = 로그인 이름');
    await p.fill('#hCode', '일반 과제'); await p.click('#saveBtn');
    ok((await p.locator('#saveMsg').textContent()).includes('일반 H WORK 과제가 이미'), '같은 이름 일반 과제는 막음');
    await p.fill('#hCode', '[모의고사 문법] 음운 연습'); await p.click('#saveBtn');
    await p.waitForFunction(() => document.getElementById('saveMsg').textContent.includes('저장했습니다'));
    const post = DB.posts.find(x => x.action === 'saveHomework');
    ok(post && post.data.count === 4 && post.data.items['1'].type === 'choice5' && post.data.items['1'].ans === 5, '시트 저장 — 5지선다 정답');
    ok(post && JSON.stringify(post.data.bank) === '{"1":104,"2":101,"3":102,"4":103}', '저장 — bank 번호표 ' + JSON.stringify(post && post.data.bank));
    ok(post && post.data.schools.join() === '능곡고,화정고', '학교 목록 = 재원생 학교(퇴원 제외)');
    ok(DB.saved && DB.saved.data.bank['2'] === 101, '수파베이스 과제 표에도 저장');
    ok((await p.locator('.tg.used').count()) >= 1, '저장 뒤 낸 적 있음 표시');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'bank-make.png') });
  } else {
    if (SHOT) { await p.check('#fAns'); await p.screenshot({ path: path.join(SHOT, 'bank-make-real.png') });
      await p.click('#autoBtn'); await p.evaluate(() => { window.print = () => {}; }); await p.click('#prT');
      await p.emulateMedia({ media: 'print' }); await p.screenshot({ path: path.join(SHOT, 'bank-print-real.png'), fullPage: true }); }
    ok(true, '실제 문항 ' + ITEMS.length + '개 그림');
  }
  ok(!errs.length, '출제 화면 오류 없음 ' + errs.join(' | '));
  if (REAL) { await b.close(); srv.close(); console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0); }

  // ── 2. 학생 문제 화면 · 질문 ──
  const sctx = await b.newContext({ viewport: { width: 400, height: 860 } });
  await sctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  const s = await sctx.newPage(); s.on('dialog', d => d.accept());
  const serr = []; s.on('pageerror', e => serr.push(e.message));
  await s.goto(U + 'hwork.html?c=' + encodeURIComponent('[모의고사 문법] 음운 1회') + '&t=' + encodeURIComponent('이현지') + '&nm=' + encodeURIComponent('김철수') + '&sc=' + encodeURIComponent('화정고') + '&gr=' + encodeURIComponent('고1'));
  await s.waitForSelector('#dndBox'); await s.click('.dnd-go');
  ok(await s.locator('#qwrap .gqp').count() === 1, '지문 한 번');
  ok((await s.locator('#qwrap .gqp .prng').textContent()) === '[1~2]', '지문 범위 [1~2]');
  ok(await s.locator('#q1 .gq .stem').isVisible(), '문항 1 문제 글이 보임');
  ok(await s.locator('#q1.bank .qtype').isHidden(), '은행 과제는 종류 글 숨김');
  ok(await s.locator('#q1 .gq .cn.ok').count() === 0, '학생 화면에 정답 표시 없음');
  await s.click('#q1 .choices button:nth-child(2)'); await s.click('#q2 .choices button:nth-child(1)'); await s.click('#q3 .choices button:nth-child(3)');
  await s.click('#submit'); await s.waitForSelector('#report table.detail');
  ok(await s.locator('#report th:has-text("질문")').count() === 1, '결과표에 질문 칸');
  ok(await s.locator('#report .rv details.pasd').count() === 2, '오답하기 카드에 문제 다시 보기');
  if (SHOT) await s.screenshot({ path: path.join(SHOT, 'bank-student-report.png'), fullPage: true });
  await s.click('#rv2 .flags .sbtn:has-text("선생님께 질문하기")');
  ok(await s.locator('#qv.on').isVisible(), '질문 창 열림');
  ok(await s.locator('#qv .gq .stem').textContent() === '지문 세트 둘째 문항', '질문 창에 문제');
  ok((await s.locator('#qv .myans').textContent()).includes('처음 고른 답 1'), '내 답 표시');
  ok((await s.locator('#qv .lockn').textContent()).includes('클리어하면'), '틀린 문항 해설 잠김 안내');
  await s.click('#qvSend'); ok(await s.locator('#qv.on').isVisible(), '빈 질문은 안 보냄');
  await s.fill('#qvIn', 'ㄴ이 왜 틀렸는지 모르겠어요'); await s.click('#qvSend');
  await s.waitForSelector('#qv .bub.me');
  const post2 = DB.calls.find(c => c.fn === 'hwork_qa_post');
  ok(post2 && post2.p.q === '2' && post2.p.text.includes('ㄴ이'), '질문 보냄 — 문항 번호');
  ok(DB.calls.some(c => c.fn === 'hwork_flag' && c.p.kind === 'help' && c.p.q === '2'), '오답하기 선생님께 넘김(help)도 함께');
  ok((await s.locator('#qv .bub.me .bm').textContent()).includes('내 답 1'), '말풍선에 그때 답');
  if (SHOT) await s.screenshot({ path: path.join(SHOT, 'bank-student-qa.png') });
  await s.click('#qv .x');
  // 선생님 답장 → 다시 열면 새 답장
  S.msgs.push({ id: 9, q: '2', who: '선생님', name: '이현지', body: '보기의 ㄴ을 다시 읽어 보세요', at: '2026-11-17 16:00', read: false });
  await s.goto(U + 'hwork.html?sid=55&k=tok-kim&q=2');
  await s.waitForSelector('#qv.on');
  ok((await s.locator('#qv .bub.tc').textContent()).includes('ㄴ을 다시'), '주소 sid·k(접근코드)로 열면 그 문항 대화가 바로 — 선생님 답장');
  await s.click('#qv .x');
  ok(await s.locator('#report .qa-btn').count() === 3, '문항마다 질문 버튼');
  await s.locator('#report tr:has(td.qn:text-is("1")) .qa-btn').click();
  ok(await s.locator('#qvExpl button').count() === 1, '맞힌 문항은 해설 보기 버튼');
  await s.click('#qvExpl button'); await s.waitForSelector('#qv .expl');
  ok((await s.locator('#qv .expl').textContent()).includes('정답 ②') && (await s.locator('#qv .expl').textContent()).includes('해설 일'), '해설 보임');
  ok(!s.url().includes(S.key), '주소에 제출 열쇠 없음');
  ok(!serr.length, '학생 화면 오류 없음 ' + serr.join(' | '));

  // ── 3. 질문함 ──
  const sub = { id: 55, teacher: '이현지', code: '[모의고사 문법] 음운 1회', name: '김철수', school: '화정고', grade: '고1', ts: '2026-11-17 15:00',
    detail: { '2': { mine: '1', ok: false } }, review: { '2': { tries: [{ wrong: '1', why_wrong: '느낌으로', pick: '3', why_right: '비교', ok: false }], help: { at: '15:10' } } } };
  DB.qa = [
    { id: 1, sub_id: 55, q: '2', who: '학생', name: '김철수', body: 'ㄴ이 왜 틀렸는지 모르겠어요', mine: '3', at: '2026-11-17T06:10:00Z', read_at: null, s: sub },
    { id: 2, sub_id: 56, q: '1', who: '학생', name: '이영희', body: '이미 답한 질문', mine: '2', at: '2026-11-17T05:00:00Z', read_at: '2026-11-17T05:10:00Z', s: Object.assign({}, sub, { id: 56, name: '이영희', teacher: '남주혜' }) },
    { id: 3, sub_id: 56, q: '1', who: '선생님', name: '남주혜', body: '답장함', mine: '', at: '2026-11-17T05:20:00Z', read_at: null, s: Object.assign({}, sub, { id: 56, name: '이영희', teacher: '남주혜' }) },
  ];
  const t = await ctx.newPage(); const terr = []; t.on('pageerror', e => terr.push(e.message));
  await t.goto(U + 'hwork_qa.html'); await t.waitForSelector('.th');
  ok(await t.locator('.th').count() === 1 && (await t.locator('#nWait').textContent()) === '1', '답장 기다림 1개 (로그인 강사 거르기)');
  ok((await t.locator('#tSel').inputValue()) === '이현지', '처음엔 내 과제');
  await t.click('#seg [data-m=all]'); await t.selectOption('#tSel', ''); ok(await t.locator('.th').count() === 2, '전체 보기 2개');
  await t.click('.th:has-text("김철수")'); await t.waitForSelector('#det .bub');
  ok((await t.locator('#det .gq .stem').textContent()) === '지문 세트 둘째 문항', '질문함 — 문제');
  ok(await t.locator('body.teacher #det .cn.ok').count() === 1, '질문함 — 정답 동그라미');
  ok((await t.locator('#det .tries').textContent()).includes('느낌으로'), '오답하기 기록(이유) 보임');
  ok(DB.patches.some(x => x.includes('id=in.(1)')), '열면 학생 글 읽음 처리');
  await t.fill('#rIn', '보기 ㄴ의 둘째 문장을 다시 보세요'); await t.click('#rSend');
  await t.waitForFunction(() => document.getElementById('toast').textContent.includes('답장'));
  const r = DB.calls.find(c => c.fn === 'qa-post');
  ok(r && r.r.who === '선생님' && r.r.name === '이현지' && r.r.sub_id === 55 && r.r.q === '2', '답장 POST — 선생님·이름·제출·문항');
  if (SHOT) await t.screenshot({ path: path.join(SHOT, 'bank-teacher-qa.png') });
  ok(!terr.length, '질문함 오류 없음 ' + terr.join(' | '));

  // ── 4. 이미 낸 교재 과제(SHUEGUK REAL, 068) — 같은 화면이 교재 모양(.rq)으로 ──
  RS_MODE = true; S.review = {}; S.msgs = [];
  const rctx = await b.newContext({ viewport: { width: 400, height: 860 } });
  await rctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  const rs = await rctx.newPage(); rs.on('dialog', d => d.accept()); const rerr = []; rs.on('pageerror', e => rerr.push(e.message));
  await rs.goto(U + 'hwork.html?c=' + encodeURIComponent('[모의고사 문법] 음운 1회') + '&t=' + encodeURIComponent('이현지') + '&nm=' + encodeURIComponent('김철수') + '&sc=' + encodeURIComponent('화정고') + '&gr=' + encodeURIComponent('고1'));
  await rs.waitForSelector('#dndBox'); await rs.click('.dnd-go');
  ok(await rs.locator('#qwrap .gqp .rq').count() === 1 && (await rs.locator('#qwrap .gqp .prng').textContent()) === '[1~2]', '교재 — 지문 한 번 [1~2]');
  ok(await rs.locator('#q1 .rq .stem').isVisible() && await rs.locator('#q1 .gq').count() === 0, '교재 — 문제가 교재 모양(.rq)');
  ok(await rs.locator('#q1 .rq .bogi .bl').isVisible(), '교재 — 〈보기〉 상자');
  ok((await rs.locator('#qwrap .gqp .oh').textContent()) === '말ᄊᆞ미' && (await rs.locator('#qwrap .gqp .oh').evaluate(e => getComputedStyle(e).fontFamily)).includes('Noto Sans CJK KR'), '옛한글 낱말만 기기 글꼴(.oh)로');
  await rs.click('#q1 .choices button:nth-child(2)'); await rs.click('#q2 .choices button:nth-child(1)'); await rs.click('#q3 .choices button:nth-child(3)');
  await rs.click('#submit'); await rs.waitForSelector('#report table.detail');
  await rs.locator('#report tr:has(td.qn:text-is("2")) .qa-btn').click();
  ok((await rs.locator('#qv .lockn').textContent()).includes('정답은 오답하기로 클리어하면'), '교재 — 틀린 문항 정답 잠김');
  await rs.click('#qv .x');
  await rs.locator('#report tr:has(td.qn:text-is("1")) .qa-btn').click();
  ok((await rs.locator('#qvExpl button').textContent()) === '정답 보기', '교재 — 맞힌 문항 정답 보기 버튼');
  await rs.click('#qvExpl button'); await rs.waitForSelector('#qv .expl');
  const ex = await rs.locator('#qv .expl').textContent();
  ok(ex.includes('정답 ②') && ex.includes('해설은 없어요'), '교재 — 정답만, 해설 없음 안내');
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-qa.png') });
  ok(!rerr.length, '교재 학생 화면 오류 없음 ' + rerr.join(' | '));
  DB.qa = [{ id: 11, sub_id: 77, q: '2', who: '학생', name: '김철수', body: '교재 질문', mine: '1', at: '2026-11-17T06:10:00Z', read_at: null,
    s: Object.assign({}, sub, { id: 77, code: 'SHUEGUK REAL 내신 기출 문장 1권(기본·실력) 01 문장 성분 · 기본' }) }];
  const rt2 = await ctx.newPage(); const rterr = []; rt2.on('pageerror', e => rterr.push(e.message));
  await rt2.goto(U + 'hwork_qa.html'); await rt2.waitForSelector('.th'); await rt2.click('.th'); await rt2.waitForSelector('#det .bub');
  ok((await rt2.locator('#det .rq .stem').textContent()) === '교재 문항 2', '질문함 — 교재 문제');
  ok(await rt2.locator('body.teacher #det .rq .cn.ok').count() === 1 && (await rt2.locator('#det .rq .cn.ok').textContent()) === '③', '질문함 — 교재 정답 ③ 표시');
  ok(DB.calls.some(c => c.fn === 'src' && c.rest.includes('no=eq.2') && c.rest.includes(encodeURIComponent('문장 1권'))), '질문함 — 과제 이름·번호로 원문 찾음');
  ok(await rt2.locator('#det .pasd .rq').count() === 1, '질문함 — 교재 지문');
  if (SHOT) await rt2.screenshot({ path: path.join(SHOT, 'real-teacher-qa.png') });
  ok(!rterr.length, '교재 질문함 오류 없음 ' + rterr.join(' | '));
  await b.close(); srv.close();
  console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });

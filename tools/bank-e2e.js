// 문항 은행(슈핏 문법) 과제 — 학생 문제 화면과 질문 대화(hwork.html) · 선생님 채점 결과 화면(hwork_result.html) E2E. 출제·인쇄는 허브 tools/shufit-e2e.js
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
  if (u.includes('script.google.com') && u.includes('alimConfig')) return rt.fulfill({ json: { result: 'success', ready: true, templates: { hwork_reply: { ready: true }, hwork_todo: { ready: true } } } });
  if (u.includes('script.google.com')) { const b = JSON.parse(body || '{}'); DB.posts.push(b); if (b.action === 'alimSend') return rt.fulfill({ json: { result: 'success', sent: [{ ok: true }] } }); return rt.fulfill({ json: { ok: true, msg: '저장되었습니다' } }); }
  const rest = u.split('/rest/v1')[1] || '';
  if (rest.startsWith('/gbank_items')) {
    const m = rest.match(/id=eq\.(\d+)/), mi = rest.match(/id=in\.\(([\d,]+)\)/);
    if (mi) return rt.fulfill({ json: ITEMS.filter(x => mi[1].split(',').includes(String(x.id))) });
    return rt.fulfill({ json: m ? ITEMS.filter(x => x.id == m[1]) : (rest.includes('offset=0') ? ITEMS : []) });
  }
  if (rest.startsWith('/gbank_passages') && rest.includes('pid=in.')) return rt.fulfill({ json: PAS });
  if (rest.startsWith('/gbank_passages')) { const m = rest.match(/pid=eq\.([^&]+)/); return rt.fulfill({ json: m ? PAS.filter(p => p.pid === decodeURIComponent(m[1])) : (rest.includes('offset=0') ? PAS : []) }); }
  if (rest.startsWith('/hwork_homeworks')) {
    if (method === 'POST') { DB.saved = JSON.parse(body)[0]; return rt.fulfill({ status: 201, body: '' }); }
    if (rest.includes('select=code,data')) return rt.fulfill({ json: [{ code: '[모의고사 문법] 음운 1회', data: { bank: { '1': 101, '2': 102, '3': 103 } } }, { code: '다른 과제', data: { bank: { '5': 102 } } }] });
    if (rest.includes('teacher=eq') && RS_MODE) return rt.fulfill({ json: [{ data: { count: 3 } }] });
    if (rest.includes('teacher=eq')) return rt.fulfill({ json: [{ data: { bank: { '1': 101, '2': 102, '3': 103 } } }] });
    return rt.fulfill({ json: rest.includes('offset=0') ? DB.hws : [] });
  }
  if (rest.startsWith('/hwork_src_items')) { DB.calls.push({ fn: 'src', rest }); return rt.fulfill({ json: [{ no: '2', html: RQ(2), pid: 'wb-P1', type: '5지', ans: '③', essay: '', src: '건대부고3 24 1 중간', err: false, book: '문장 1권(기본·실력)', expl: '교사 해설 글', wrong: '① 첫 오답 ② 둘째 오답' }] }); }
  if (rest.startsWith('/hwork_src_passages')) return rt.fulfill({ json: [{ pid: 'wb-P1', html: '<div class="psg">교재 지문 글 나랏 말ᄊᆞ미</div>' }] });
  if (rest.startsWith('/students')) return rt.fulfill({ json: rest.includes('offset=0') ? [{ code: 'tok-kim', name: '김철수', school: '화정고', grade: '고1', enrolled: '재원', phone_student: '010-1234-5678' }, { school: '화정고', enrolled: '재원' }, { school: '능곡고', enrolled: '재원' }, { school: '옛학교', enrolled: '퇴원' }] : [] });
  if (rest.startsWith('/hwork_submissions') && method === 'PATCH') { const b = JSON.parse(body); DB.subPatch = (DB.subPatch || []).concat([b]); Object.assign(DB.sub, b); return rt.fulfill({ status: 204, body: '' }); }
  if (rest.startsWith('/hwork_submissions')) { const m = rest.match(/id=eq\.(\d+)/); return rt.fulfill({ json: m && DB.sub && DB.sub.id == m[1] ? [DB.sub] : [] }); }
  if (rest.startsWith('/hwork_retests')) return rt.fulfill({ json: [] });
  if (rest.startsWith('/hwork_reply_files')) { DB.files = (DB.files || []).concat(JSON.parse(body)); return rt.fulfill({ status: 201, body: '' }); }
  if (rest.startsWith('/hwork_qa_drafts')) {   // 클로슈 답장 초안(리포트 092)
    if (method === 'PATCH') { DB.draftPatch = (DB.draftPatch || []).concat([{ rest, b: JSON.parse(body) }]); return rt.fulfill({ status: 204, body: '' }); }
    const m = rest.match(/sub_id=eq\.(\d+)/); const L = (DB.drafts || []).filter(d => !d.used_at && !d.dismissed_at);
    return rt.fulfill({ json: m ? L.filter(d => d.sub_id == m[1]) : L });
  }
  if (rest.startsWith('/hwork_qa')) {
    if (method === 'GET') { const m = rest.match(/sub_id=eq\.(\d+)/); return rt.fulfill({ json: m ? DB.qa.filter(x => x.sub_id == m[1]) : DB.qa.slice().sort((a, b) => b.id - a.id) }); }
    if (method === 'POST') { const r = JSON.parse(body); const row = Object.assign({ id: 900 + DB.qa.length, at: new Date().toISOString(), read_at: null, mine: '', s: DB.qa[0].s }, r); DB.qa.push(row); DB.calls.push({ fn: 'qa-post', r }); return rt.fulfill({ status: 201, json: [row] }); }
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
  if (fn === 'hwork_qs' && RS_MODE) return { ok: true, style: 'real', items: { '1': { html: RQ(1), pid: 'wb-P1', src: 'A고' }, '2': { html: RQ(2), pid: 'wb-P1', src: 'B고' }, '3': { html: RQ(3).replace('<div class="qb">', '<div class="qb"><div class="errq">※ 오류 문항입니다. 풀지 말고 넘어가세요.</div>'), pid: '', src: 'C고' } }, passages: { 'wb-P1': '<div class="psg">교재 지문 글 나랏 말ᄊᆞ미</div>' } };
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
  if (fn === 'hwork_expl' && RS_MODE) { if (!S.detail[p.q].ok && !(S.review[p.q] || {}).cleared_at) return { ok: false, reason: 'locked', error: '잠김' }; return Object.assign({ ok: true, q: p.q, kind: 'src', type: '5지', ans_text: '②', essay: '', err: false }, globalThis.SRC_EXPL ? { expl: '교재 해설 문장', wrong: '① 오답 하나 ③ 오답 둘' } : {}); }
  if (fn === 'hwork_expl') { if (!S.detail[p.q].ok && !(S.review[p.q] || {}).cleared_at) return { ok: false, reason: 'locked', error: '잠김' }; const g = ITEMS.find(x => x.id === BANK[p.q]); return { ok: true, ans: g.ans, good: g.good, bad: g.bad }; }
  if (fn === 'hwork_qa_clear') { if (!S.msgs.some(m => m.q === p.q && m.who === '선생님')) return { ok: false, error: '선생님 답장이 온 뒤에 누를 수 있어요.' };
    const r = S.review[p.q] = Object.assign({ tries: [] }, S.review[p.q] || {}, { understood_at: '2026-11-17 16:05' }); let cl = false;
    if (S.detail[p.q].ok === false && !r.cleared_at) { r.cleared_at = '2026-11-17 16:05'; r.via = 'qa'; cl = true; }
    return { ok: true, q: p.q, cleared: cl, at: '2026-11-17 16:05', review: r, ans: r.cleared_at ? String(KEY[p.q]) : null, done: false }; }
  if (fn === 'hwork_check_seen') { S.seen = '2026-11-17 21:10'; return { ok: true, at: S.seen }; }
  if (fn === 'hwork_retry_state') return { ok: true, stage: 'fix', teacher: S.teacher, code: S.code, name: S.name, got: 1, total: 3, detail: S.detail, review: S.review, answers: {},
    checked: S.checked || {}, check_done: S.done || null, check_seen_at: S.seen || null };
  return { ok: false };
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  ctx.on('page', pg => pg.on('dialog', d => d.accept()));
  // ── 1. 출제·인쇄 — 슈핏 문법으로 옮김(허브 tools/shufit-e2e.js) ──

  // ── 2. 학생 문제 화면 · 질문 ──
  const sctx = await b.newContext({ viewport: { width: 400, height: 860 } });
  await sctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  const s = await sctx.newPage(); s.on('dialog', d => d.accept());
  const serr = []; s.on('pageerror', e => serr.push(e.message));
  await s.goto(U + 'hwork.html?c=' + encodeURIComponent('[모의고사 문법] 음운 1회') + '&t=' + encodeURIComponent('이현지') + '&nm=' + encodeURIComponent('김철수') + '&sc=' + encodeURIComponent('화정고') + '&gr=' + encodeURIComponent('고1'));
  await s.waitForSelector('#dndBox'); await s.click('.dnd-go');
  // 빠른 제출이 기본 — 문제·지문은 숨고 답 칸만 (2026-11-21)
  ok(await s.locator('#qmode button.on').getAttribute('data-qm') === 'fast', '처음엔 빠른 제출');
  ok(await s.locator('#q1 .gq .stem').isHidden() && await s.locator('#qwrap .gqp').isHidden() && await s.locator('#q1 .choices').isVisible(), '빠른 제출 — 문제·지문 숨김, 답 칸은 보임');
  ok(!(await s.locator('#q1').getAttribute('class')).includes('bank'), '빠른 제출 — 카드는 답안표 모양');
  await s.click('#q1 .choices button:nth-child(4)');
  await s.click('#qmode [data-qm="paper"]');
  ok(await s.locator('#q1 .choices button:nth-child(4)').evaluate(e => e.classList.contains('sel')), '문제지 입력으로 바꿔도 고른 답 그대로');
  await s.click('#q1 .choices button:nth-child(4)');
  ok(await s.evaluate(() => localStorage.getItem('hw_qmode')) === 'paper', '고른 방식을 이 기기에 기억');
  ok(await s.locator('#qwrap .gqp').count() === 1, '지문 한 번');
  ok((await s.locator('#qwrap .gqp .prng').textContent()) === '[1~2]', '지문 범위 [1~2]');
  ok(await s.locator('#q1 .gq .stem').isVisible(), '문항 1 문제 글이 보임');
  ok(await s.locator('#q1.bank .qtype').isHidden(), '은행 과제는 종류 글 숨김');
  ok(await s.locator('#q1 .gq .cn.ok').count() === 0, '학생 화면에 정답 표시 없음');
  await s.click('#q1 .choices button:nth-child(2)'); await s.click('#q2 .choices button:nth-child(1)'); await s.click('#q3 .choices button:nth-child(3)');
  await s.click('#submit'); await s.waitForSelector('#rvq1');
  ok(await s.locator('#report .rvbar [data-rv-bar]').count() === 3, '결과 — 번호 막대 3칸');
  ok(await s.locator('#rvq2 .qbox').count() === 1, '틀린 문항 카드 열림 · 문제 보기');
  ok((await s.locator('#rvq2 .hid').textContent()).includes('클리어'), '틀린 문항 정답은 클리어하면 보임');
  if (SHOT) await s.screenshot({ path: path.join(SHOT, 'bank-student-report.png'), fullPage: true });
  await s.click('#qaGo2'); ok(!DB.calls.some(c => c.fn === 'hwork_qa_post'), '빈 질문은 안 보냄');
  await s.fill('#qaIn2', 'ㄴ이 왜 틀렸는지 모르겠어요'); await s.click('#qaGo2');
  await s.waitForSelector('#rvq2 .rvthr .msg.st');
  const post2 = DB.calls.find(c => c.fn === 'hwork_qa_post');
  ok(post2 && post2.p.q === '2' && post2.p.text.includes('ㄴ이'), '카드 안에서 질문 보냄 — 문항 번호');
  ok(DB.calls.some(c => c.fn === 'hwork_flag' && c.p.kind === 'help' && c.p.q === '2'), '오답하기 선생님께 넘김(help)도 함께');
  ok((await s.locator('#rvq2 .rvthr .msg.st').textContent()).includes('그때 답 1'), '말풍선에 그때 답');
  // 선생님 답장 → 주소로 다시 열면 그 문항 카드가 열려 있음
  S.msgs.push({ id: 9, q: '2', who: '선생님', name: '이현지', body: '보기의 ㄴ을 다시 읽어 보세요', at: '2026-11-17 16:00', read: false });
  await s.goto(U + 'hwork.html?sid=55&k=tok-kim&q=2');
  await s.waitForSelector('#rvq2 .rvthr .msg.tc');
  ok((await s.locator('#rvq2 .msg.tc').textContent()).includes('ㄴ을 다시'), '주소 sid·k(접근코드)로 열면 그 문항 대화가 바로 — 선생님 답장');
  // 답장을 받은 뒤 — 이해했어요 · 클리어 / 다시 질문하기 (2026-11-17 원장님)
  ok((await s.textContent('#rvq2 .ack2')).includes('이해했어요 · 클리어') && await s.locator('#qaIn2').count() === 0, '답장 뒤 — 질문 칸 대신 [이해했어요 · 클리어][다시 질문하기]');
  await s.click('#rvq2 .ack2 .no'); await s.waitForSelector('#qaIn2');
  ok((await s.textContent('#rvq2 .cmp .lab')).includes('다시 질문하기'), '[다시 질문하기] → 질문 칸');
  await s.reload(); await s.waitForSelector('#qaOk2');
  await s.click('#qaOk2'); await s.waitForSelector('#rvq2 .und');
  ok(DB.calls.some(c => c.fn === 'hwork_qa_clear' && c.p.q === '2' && c.p.key === S.key), '클리어 — 제출 열쇠로 hwork_qa_clear');
  ok((await s.textContent('#rvq2 .qh2')).includes('클리어 · 답장 보고 이해') && (await s.textContent('#rvq2 .qh2')).includes('정답 4'), '클리어 표시 · 정답이 열림');
  ok(await s.locator('#rvq2 .reask').count() === 1 && await s.locator('#rvq2 .ack2').count() === 0, '이해한 뒤 — [아직 궁금한 게 있어요 · 다시 질문하기]만');
  if (SHOT) await s.locator('#rvq2').screenshot({ path: path.join(SHOT, 'qa-clear.png') });
  if (!(await s.locator('#rvq1 .cmp').count())) await s.click('#rvq1 [data-rv-tog]');
  ok(await s.locator('#rvq1 #ex1 button').count() === 1, '맞힌 문항은 해설 보기 버튼');
  await s.click('#ex1 button'); await s.waitForSelector('#ex1 .expl');
  ok((await s.locator('#ex1 .expl').textContent()).includes('정답 ②') && (await s.locator('#ex1 .expl').textContent()).includes('해설 일'), '해설 보임');
  ok(!s.url().includes(S.key), '주소에 제출 열쇠 없음');
  ok(!serr.length, '학생 화면 오류 없음 ' + serr.join(' | '));

  // ── 3. 선생님 채점 결과 화면(같은 화면 · 문항 카드 안 답장) ──
  const sub = { id: 55, teacher: '이현지', code: '[모의고사 문법] 음운 1회', name: '김철수', school: '화정고', grade: '고1', ts: '2026-11-17 15:00', got: 1, total: 3,
    detail: { '1': { type: 'choice5', mine: '2', ok: true }, '2': { type: 'choice5', mine: '1', ok: false }, '3': { type: 'choice5', mine: '3', ok: false } },
    review: { '2': { tries: [{ wrong: '1', why_wrong: '느낌으로', pick: '3', why_right: '비교', ok: false }], help: { at: '15:10' } },
      '3': { tries: [{ wrong: '3', why_wrong: '헷갈림', pick: '1', why_right: '지문', ok: true }], cleared_at: '2026-11-17 15:20' } } };
  sub.checked = {}; sub.check_done = null; sub.check_seen_at = null;
  DB.sub = sub;
  DB.qa = [{ id: 1, sub_id: 55, q: '2', who: '학생', name: '김철수', body: 'ㄴ이 왜 틀렸는지 모르겠어요', mine: '3', at: '2026-11-17T06:10:00Z', read_at: null, s: sub }];
  DB.qa.push({ id: 3, sub_id: 55, q: '1', who: '학생', name: '김철수', body: '맞혔는데 ㄴ의 성분이 궁금해요', mine: '2', at: '2026-11-17T06:00:00Z', read_at: null, s: sub });
  DB.qa.push({ id: 50, sub_id: 70, q: '5', who: '선생님', name: '남주혜', body: '지난 설명 — 보기의 ㄴ은 반모음입니다', mine: '', at: '2026-11-10T06:10:00Z', read_at: null,
    files: [{ name: '풀이.png', size: 10, mime: 'image/png', path: 'r/70/abc.png' }], s: { code: '다른 과제', name: '박영희' } });
  DB.qa.push({ id: 51, sub_id: 71, q: '1', who: '선생님', name: '남주혜', body: '다른 문항 설명', mine: '', at: '2026-11-10T06:10:00Z', read_at: null, s: { code: '다른 과제', name: '박영희' } });
  const t = await ctx.newPage(); const terr = []; t.on('pageerror', e => terr.push(e.message));
  await t.goto(U + 'hwork_result.html?sid=55&q=2'); await t.waitForSelector('#rvq2 .rvthr');
  const cs = await t.evaluate(() => { const e = document.querySelector('#rvq2 .cn.ok'); const st = getComputedStyle(e); const r = e.getBoundingClientRect(); return { txt: e.textContent, bg: st.backgroundColor, col: st.color, w: Math.round(r.width), h: Math.round(r.height), after: getComputedStyle(e, '::after').content, before: getComputedStyle(e, '::before').content }; });
  ok(cs.txt === '4' && cs.bg === 'rgb(95, 148, 136)' && cs.col === 'rgb(255, 255, 255)' && cs.w === cs.h && cs.after === 'none' && cs.before === 'none', '정답 번호 — 원 글자를 숫자로 바꿔 그 칸을 동그라미로 칠함(덧칠 없음) ' + JSON.stringify(cs));
  ok((await t.textContent('#rvq2 .prev summary')).includes('같은 문제에 남긴 답장 1개'), '같은 문항 id(다른 과제 5번)의 지난 답장 1개 — 다른 문항 답장은 빠짐');
  await t.click('#rvq2 .prev summary'); await t.click('[data-pv="2|0"]');
  ok((await t.inputValue('textarea[data-rin="2"]')).includes('지난 설명'), '불러오기 → 답장 칸에 글');
  ok((await t.textContent('[data-reuse="2"]')).includes('풀이.png'), '지난 첨부도 다시 보낼 목록에');
  ok((await t.locator('#rvq2 .gq .stem').textContent()) === '지문 세트 둘째 문항', '결과 화면 — 문제');
  ok((await t.locator('#rvq2 details.expl summary').textContent()) === '해설 보기' && (await t.locator('#rvq2 details.expl').textContent()).length > 6, '문항 은행 과제 — 선생님 화면 해설 보기(gbank good·bad)');
  ok(await t.locator('[data-rv-bar="1"] .qd.w').count() === 1 && await t.locator('[data-rv-bar="3"] .qd').count() === 0, '맞힌 문항(1번)에 걸린 질문 — 번호 막대에 빨간 점');
  ok((await t.textContent('.rv2 .lg')).includes('답장 필요한 질문 1번·2번'), '범례에 답장 필요한 질문 번호');
  ok((await t.locator('#rvq1 .pill.wt').textContent()) === '답장 필요' && await t.locator('#rvq1 .rvthr, #rvq1 textarea').count() > 0, '1번 카드 — 답장 필요 알약 · 처음부터 열림');
  ok(await t.locator('#rvq2 .cn.ok').count() === 1, '선생님 화면 — 정답 동그라미');
  ok((await t.getAttribute('#backList', 'href')).endsWith('hwork_teacher.html?t=' + encodeURIComponent('이현지')), '돌아가기 = 로그인 이름이 골라진 제출 목록');
  ok((await t.locator('#rvq2').textContent()).includes('느낌으로'), '오답하기 기록(이유) 보임');
  await t.waitForTimeout(300);
  ok(DB.patches.some(x => x.includes('id=in.(1)')), '열면 학생 글 읽음 처리');
  await t.fill('textarea[data-rin="2"]', '보기 ㄴ의 둘째 문장을 다시 보세요'); await t.click('[data-send="2"]');
  await t.waitForFunction(() => document.getElementById('toast').textContent.includes('답장을 보냈어요'));
  ok((DB.files || []).some(f => f.path === 'r/70/abc.png' && f.sub_id === 55 && f.q === '2'), '지난 첨부를 같은 파일로 다시 이음(올리지 않음) ');
  const r = DB.calls.find(c => c.fn === 'qa-post');
  ok(r && r.r.who === '선생님' && r.r.name === '이현지' && r.r.sub_id === 55 && r.r.q === '2', '답장 POST — 선생님·이름·제출·문항');
  await t.waitForSelector('#rvq2 .msg.tc');
  // 답장 수정·지우기 (2026-11-20)
  ok(await t.locator('#rvq2 .msg.tc [data-edit]').count() >= 1 && await t.locator('#rvq2 .msg.st [data-edit]').count() === 0, '선생님 답장에만 [수정][지우기]');
  const eid = await t.getAttribute('#rvq2 .msg.tc [data-edit] >> nth=-1', 'data-edit');
  await t.click('[data-edit="' + eid + '"]'); await t.waitForSelector('textarea[data-edt="' + eid + '"]');
  ok((await t.inputValue('textarea[data-edt="' + eid + '"]')).includes('둘째 문장'), '[수정] → 지금 글이 든 고치기 칸');
  await t.fill('textarea[data-edt="' + eid + '"]', '고친 답장입니다'); await t.click('[data-edsave="' + eid + '"]');
  await t.waitForFunction(() => document.getElementById('toast').textContent.includes('답장을 고쳤어요'));
  const ep = DB.patches.find(x => x.includes('id=eq.' + eid));
  ok(!!ep, '수정 PATCH — 그 답장 id');
  const before = DB.deletes.length;
  await t.click('[data-qdel="' + eid + '"]');
  await t.waitForFunction(() => document.getElementById('toast').textContent.includes('답장을 지웠어요'));
  ok(DB.deletes.length === before + 1 && DB.deletes[before].includes('id=eq.' + eid), '지우기 — 확인 뒤 DELETE');
  // 답장 필요한 질문만 보기 — 다 답해야 답장 알림톡이 열린다
  ok(await t.locator('#alimBtn[disabled]').count() === 1 && (await t.textContent('.chc')).includes('답장 필요한 질문 1개에 답장하거나'), '1번 질문이 남아 있으면 답장 알림톡 잠김');
  ok((await t.textContent('[data-rv-flt="답장 필요"]')).includes('1'), '거르기 [답장 필요 1]');
  await t.click('#waitBtn');
  ok(await t.locator('.rv2 .qs > [id^="rvq"]').count() === 1 && await t.locator('#rvq1 textarea[data-rin="1"]').count() === 1, '[답장 필요한 질문만 보기] → 1번 카드만 · 열려 있음');
  await t.click('#rvq1 .qchk button'); await t.waitForSelector('#rvq1 .qchk .on, .rv2 .empty');   // 답장 없이 [잘 고쳤습니다]만 눌러도 처리 (2026-11-19)
  DB.subPatch = [];
  await t.waitForSelector('.rv2 .empty');
  ok((await t.textContent('.rv2 .empty')).includes('모두 처리했습니다') && await t.locator('#waitBtn').count() === 0, '[잘 고쳤습니다]만 눌러도 처리 — 빈 안내 · 보기 버튼 사라짐');
  await t.click('[data-rv-flt="전체"]'); await t.click('[data-rv-tog="2"]').catch(() => {}); if (!(await t.locator('textarea[data-rin="2"]').count())) await t.click('[data-rv-tog="2"]');
  // 답장 알림톡 — 과제마다 한 번
  await t.waitForSelector('#alimBtn:not([disabled])');
  await t.click('#alimBtn'); await t.waitForFunction(() => document.getElementById('toast').textContent.includes('알림톡을 보냈어요'));
  const al = DB.posts.find(x => x.action === 'alimSend' && x.kind === 'hwork_reply');
  ok(al && al.items[0].to === '01012345678' && al.items[0].who === '학생' && /^H:55\|\d+$/.test(al.items[0].date) && al.items[0].vars.과제 === '음운 1회' && al.items[0].vars.접근코드 === 'tok-kim' && al.items[0].vars.학생명 === '김철수', '답장 알림톡 — 학생 번호·과제·접근코드·중복 키 H:제출|마지막 답장 ' + JSON.stringify(al && al.items[0]));
  // 클리어한 문항 모두 잘 고쳤습니다
  ok((await t.textContent('.chc .soft')).includes('클리어한 3번 모두 잘 고쳤습니다'), '[클리어한 n번 모두 잘 고쳤습니다] 버튼');
  await t.click('.chc .soft'); await t.waitForFunction(() => !document.querySelector('.chc .soft'));
  ok(DB.subPatch && DB.subPatch[0].checked['3'] && !DB.subPatch[0].checked['2'], '한꺼번에 — 클리어한 3번만 확인');
  DB.subPatch = [];
  // 선생님 확인 · 과제 검사 완료 (리포트 074)
  ok(await t.evaluate(() => getComputedStyle(document.querySelector('textarea[data-rin="2"]')).minHeight) === '150px' && (await t.getAttribute('textarea[data-rin="2"]', 'maxlength')) === '5000', '답장 칸 — 높이 150px · 5000자');
  await t.click('#rvq2 .qchk button'); await t.waitForSelector('#rvq2 .qchk .on');
  ok(DB.subPatch && DB.subPatch[0].checked['2'] && DB.subPatch[0].checked['2'].by === '이현지', '문항 [확인했어요] — checked[2] 이현지');
  // 과제 미완료 알림톡 — 오답하기 안 한 문항이 있을 때
  ok(await t.locator('#todoBtn').count() === 0, '남은 오답하기가 없으면(클리어·도움 요청) 미완료 알림톡 버튼 없음');
  ok((await t.textContent('#rvq2 .qh2')).includes('♥ 선생님 확인'), '카드 머리에 ♥ 선생님 확인');
  await t.fill('#chkNote', '오답 이유를 잘 적었어요'); await t.click('.chc button'); await t.waitForSelector('.chc .done');
  const last = DB.subPatch[DB.subPatch.length - 1];
  ok(last.check_done && last.check_done.note === '오답 이유를 잘 적었어요' && last.check_done.by === '이현지' && Object.keys(last.checked).length === 3, '과제 검사 완료 — 한마디·모든 문항 확인');
  if (SHOT) await t.screenshot({ path: path.join(SHOT, 'bank-teacher-result.png'), fullPage: true });
  ok(!terr.length, '선생님 결과 화면 오류 없음 ' + terr.join(' | '));
  // 휴대폰(390px) — 선생님 결과 화면
  const tm = await ctx.newPage(); await tm.setViewportSize({ width: 390, height: 844 });
  await tm.goto(U + 'hwork_result.html?sid=55&q=2'); await tm.waitForSelector('#rvq2 .rvthr');
  ok(await tm.evaluate(() => document.documentElement.scrollWidth <= 391), '휴대폰 — 가로로 밀리지 않음 (' + await tm.evaluate(() => document.documentElement.scrollWidth) + ')');
  if (SHOT) { await tm.screenshot({ path: path.join(SHOT, 'teacher-mobile-top.png') }); await tm.screenshot({ path: path.join(SHOT, 'teacher-mobile-full.png'), fullPage: true }); }
  await tm.close();
  // 미완료 알림톡 — 3번을 오답하기 전으로 되돌린 제출
  delete DB.sub.review['3']; DB.sub.review_at = null;
  const tt = await ctx.newPage(); await tt.goto(U + 'hwork_result.html?sid=55'); await tt.waitForSelector('#todoBtn:not([disabled])');
  ok((await tt.textContent('.chc')).includes('아직 오답하기 안 한 문항 3번'), '미완료 알림톡 — 남은 문항 안내');
  await tt.click('#todoBtn'); await tt.waitForFunction(() => document.getElementById('toast').textContent.includes('알림톡을 보냈어요'));
  const td = DB.posts.find(x => x.action === 'alimSend' && x.kind === 'hwork_todo');
  ok(td && /^T:55\|\d{4}-\d{2}-\d{2}$/.test(td.items[0].date) && td.items[0].to === '01012345678', '미완료 알림톡 — 하루 한 번 키 T:제출|날짜');
  await tt.close();
  // 학생이 다시 들어오면 하트 팝업 한 번
  S.checked = { '2': { at: '2026-11-17 21:00', by: '이현지' } }; S.done = { at: '2026-11-17 21:01', by: '이현지', note: '오답 이유를 잘 적었어요' }; S.seen = null;
  const sp = await ctx.newPage(); await sp.goto(U + 'hwork.html?sid=55&k=tok-kim'); await sp.waitForSelector('.hpop');
  ok((await sp.textContent('.hpop')).includes('이현지 선생님이 이 과제의 검사를 마쳤습니다') && (await sp.textContent('.hpop')).includes('오답 이유를 잘 적었어요'), '학생 — 하트 팝업(선생님 이름·한마디)');
  { const t = await sp.textContent('.hpop');
    ok(t.includes('과제 검사 완료') && t.includes('남은 오답이 1문항 있습니다') && t.includes('응원할게요') && !t.includes('고마워요') && (await sp.textContent('.hok')) === '확인했습니다', '학생 — 하트 팝업: 검사 완료·남은 오답·응원 문장·[확인했습니다] (' + t.replace(/\s+/g, ' ').slice(0, 160) + ')'); }
  ok(await sp.locator('.hpop .hb').count() >= 10, '하트가 팡팡');
  if (SHOT) { await sp.waitForTimeout(700); await sp.screenshot({ path: path.join(SHOT, 'heart-popup.png') }); }
  await sp.click('.hok');
  ok(DB.calls.some(c => c.fn === 'hwork_check_seen') && await sp.locator('.hpop').count() === 0, '닫으면 본 때를 적음');
  ok((await sp.textContent('#rvq2 .qh2')).includes('♥ 선생님 확인'), '학생 카드에도 ♥ 선생님 확인');
  await sp.reload(); await sp.waitForSelector('#rvq2'); await sp.waitForTimeout(600);
  ok(await sp.locator('.hpop').count() === 0, '한 번 본 팝업은 다시 안 뜸');
  await sp.close();
  // 주소 없이 — 답장 기다리는 질문 목록
  DB.qa = DB.qa.filter(m => m.id !== 3);
  DB.qa.push({ id: 2, sub_id: 56, q: '1', who: '학생', name: '이영희', body: '대기 질문', mine: '2', at: '2026-11-17T05:00:00Z', read_at: null, s: Object.assign({}, sub, { id: 56, name: '이영희' }) });
  const tl = await ctx.newPage(); await tl.goto(U + 'hwork_result.html'); await tl.waitForSelector('.wl');
  ok(await tl.locator('.wl .wrow').count() === 1 && (await tl.locator('.wl .wrow .row').getAttribute('data-wopen')) === '56|1', '목록 — 마지막 글이 학생인 질문만');
  // 수업에서 처리 · 완료 (2026-11-21) — 목록에서 바로: 1차 오답이면 클리어(via class)·선생님 확인·답장
  const keepSub = DB.sub; DB.sub = { id: 56, name: '이영희', code: '음운 1회', detail: { '1': { ok: false, type: 'choice5', mine: '2', ans: '1' }, '2': { ok: false, type: 'choice5', mine: '3', ans: '4' } }, review: {}, review_at: null, checked: {} };
  DB.subPatch = []; const qaBefore = DB.calls.filter(c => c.fn === 'qa-post').length;
  await tl.click('.wl .wrow .cls'); await tl.waitForFunction(() => !document.querySelector('.wl .wrow'));
  const cp = DB.subPatch[0], qp = DB.calls.filter(c => c.fn === 'qa-post').slice(qaBefore);
  ok(cp && cp.review['1'].cleared_at && cp.review['1'].via === 'class' && cp.review['1'].class_by === '이현지' && cp.checked['1'].by === '이현지' && !cp.review['2'] && !cp.review_at, '목록 [수업에서 처리 · 완료] — 1번만 클리어(via class)·확인, 2번이 남아 review_at 없음');
  ok(qp.length === 1 && qp[0].r[0].q === '1' && qp[0].r[0].who === '선생님' && qp[0].r[0].body.includes('수업 시간에'), '목록 [수업에서 처리 · 완료] — 「수업 시간에 직접 설명했어요.」 답장');
  ok((await tl.textContent('.wl')).includes('답장을 기다리는 질문이 없습니다'), '처리한 줄은 목록에서 빠짐');
  // 결과 화면 카드에서 — 남은 2번도 처리하면 오답하기 끝냄(review_at)
  DB.subPatch = [];
  const tc = await ctx.newPage(); await tc.goto(U + 'hwork_result.html?sid=56&q=2'); await tc.waitForSelector('#rvq2 .qchk .cls');
  await tc.click('#rvq2 .qchk .cls'); await tc.waitForFunction(() => !document.querySelector('#rvq2 .qchk .cls'));
  const cp2 = DB.subPatch[0];
  ok(cp2 && cp2.review['2'].via === 'class' && cp2.review['1'].via === 'class' && cp2.review_at && (await tc.textContent('#rvq2')).includes('수업에서 확인'), '결과 화면 카드 [수업에서 처리 · 완료] — 남은 오답이 없으면 review_at · 카드에 「클리어 · 수업에서 확인」');
  await tc.close(); DB.sub = keepSub;
  // 클로슈 답장 초안(2026-11-24, 리포트 092) — 답장 칸에 미리 채우고, 보내면 쓴 것으로 표시
  DB.sub = { id: 57, name: '박초안', code: '음운 1회', teacher: '이현지', detail: { '1': { ok: true, type: 'choice5', mine: '2', ans: '2' }, '2': { ok: false, type: 'choice5', mine: '3', ans: '4' } }, review: {}, review_at: null, checked: {} };
  DB.qa.push({ id: 70, sub_id: 57, q: '2', who: '학생', name: '박초안', body: '2번 왜 틀렸어요?', mine: '3', at: '2026-11-24T05:00:00Z', read_at: null, s: Object.assign({}, sub, { id: 57, name: '박초안' }) });
  DB.drafts = [{ id: 1, sub_id: 57, q: '2', after_id: 70, kind: '초안', body: '클로슈가 쓴 답장 초안입니다.', note: '' }, { id: 2, sub_id: 57, q: '2', after_id: 60, kind: '초안', body: '옛 질문 초안', note: '' }];
  const tw = await ctx.newPage(); await tw.goto(U + 'hwork_result.html'); await tw.waitForSelector('.wl');
  ok((await tw.textContent('.wl')).includes('클로슈 초안 있음'), '질문 목록 — 초안이 있는 질문에 「클로슈 초안 있음」');
  // 목록에서 줄을 누르면 초안이 든 고치기 칸 → 고쳐 개별 발송
  await tw.click('.wl [data-wopen="57|2"]'); await tw.waitForSelector('.wl textarea[data-wk="57|2"]');
  ok(await tw.inputValue('.wl textarea[data-wk="57|2"]') === '클로슈가 쓴 답장 초안입니다.', '목록 — 줄을 누르면 클로슈 초안이 든 칸이 열림');
  // 펼친 질문에 문제·지문·정답 (2026-11-25 원장님 "문항에 해당하는 지문이 있을 때는 화면에서 확인할 수 있어야")
  await tw.waitForSelector('.wl details.wq[data-wq="57|2"] .wpas');
  ok((await tw.textContent('.wl details.wq[data-wq="57|2"] .wpas')).includes('지문 본문 글입니다') && (await tw.textContent('.wl details.wq[data-wq="57|2"] .gq .stem')) === '지문 세트 둘째 문항' && (await tw.textContent('.wl details.wq[data-wq="57|2"] summary')).includes('정답 4'), '목록 — 펼친 질문에 지문·문제·정답');
  ok(await tw.inputValue('.wl textarea[data-wk="57|2"]') === '클로슈가 쓴 답장 초안입니다.', '문제를 불러온 뒤에도 답장 칸 그대로');
  await tw.fill('.wl textarea[data-wk="57|2"]', '목록에서 고친 답장'); const qb = DB.calls.filter(c => c.fn === 'qa-post').length;
  await tw.click('.wl [data-wsend="57|2"]'); await tw.waitForFunction(() => !document.querySelector('.wl [data-wopen="57|2"]'));
  const lp = DB.calls.filter(c => c.fn === 'qa-post').slice(qb);
  ok(lp.length === 1 && lp[0].r.body === '목록에서 고친 답장' && lp[0].r.sub_id === 57 && (DB.draftPatch || []).some(x => x.rest.includes('id=eq.1') && x.b.used_at), '목록 — 개별 보내기: 고친 글이 가고 초안은 쓴 것으로, 줄이 빠짐');
  await tw.close();
  // 전체 발송 · 전체 답변 생성하기
  DB.qa.push({ id: 71, sub_id: 58, q: '1', who: '학생', name: '최하나', body: '1번?', mine: '1', at: '2026-11-24T06:00:00Z', read_at: null, s: Object.assign({}, sub, { id: 58, name: '최하나' }) });
  DB.qa.push({ id: 72, sub_id: 59, q: '3', who: '학생', name: '정두리', body: '3번?', mine: '1', at: '2026-11-24T06:01:00Z', read_at: null, s: Object.assign({}, sub, { id: 59, name: '정두리' }) });
  DB.drafts = [{ id: 3, sub_id: 58, q: '1', after_id: 71, kind: '초안', body: '하나 답장', note: '' }, { id: 4, sub_id: 59, q: '3', after_id: 72, kind: '확인 필요', body: '참고', note: '정답 의심' }];
  DB.draftPatch = []; DB.posts = [];
  const ta = await ctx.newPage(); await ta.goto(U + 'hwork_result.html'); await ta.waitForSelector('#sendAll');
  ok((await ta.textContent('#sendAll')).includes('초안 1개'), '전체 발송 버튼 — 정답 확인 필요는 세지 않음');
  const qb2 = DB.calls.filter(c => c.fn === 'qa-post').length;
  await ta.click('#sendAll'); await ta.waitForFunction(() => !document.querySelector('.wl [data-wopen="58|1"]'));
  const ap = DB.calls.filter(c => c.fn === 'qa-post').slice(qb2);
  ok(ap.length === 1 && ap[0].r.body === '하나 답장' && await ta.locator('.wl [data-wopen="59|3"]').count() === 1, '전체 발송 — 초안만 보내고 정답 확인 필요는 남김');
  await ta.click('#genAll'); await ta.waitForFunction(() => (document.getElementById('wmsg') || {}).textContent.includes('요청했어요'));
  const gp = DB.posts.find(x => x.action === 'editReqAdd');
  ok(gp && gp.screen === 'H WORK 답장 초안' && gp.writer === '이현지', '전체 답변 생성하기 — 수정 요청함에 「H WORK 답장 초안」 요청');
  await ta.close();
  DB.qa = DB.qa.filter(m => !(m.who === '선생님' && m.sub_id === 57)); DB.draftPatch = [];
  DB.drafts = [{ id: 1, sub_id: 57, q: '2', after_id: 70, kind: '초안', body: '클로슈가 쓴 답장 초안입니다.', note: '' }];
  const tdr = await ctx.newPage(); await tdr.goto(U + 'hwork_result.html?sid=57&q=2'); await tdr.waitForSelector('#rvq2 textarea[data-rin]');
  ok(await tdr.inputValue('#rvq2 textarea[data-rin="2"]') === '클로슈가 쓴 답장 초안입니다.' && (await tdr.textContent('#rvq2 .dft')).includes('클로슈 초안'), '결과 화면 — 마지막 학생 글에 맞는 초안만 답장 칸에 미리 채움 · 안내 줄');
  // 카드를 접었다 펴면(화면 안에서 다시 그림) 초안이 그대로 — 2026-11-25 원장님 캡처: 초안 안내 줄만 있고 칸이 비어 있었다
  await tdr.click('#rvq2 [data-rv-tog]'); await tdr.waitForFunction(() => !document.querySelector('#rvq2 textarea[data-rin]'));
  await tdr.click('#rvq2 [data-rv-tog]'); await tdr.waitForSelector('#rvq2 textarea[data-rin]');
  ok(await tdr.inputValue('#rvq2 textarea[data-rin="2"]') === '클로슈가 쓴 답장 초안입니다.', '결과 화면 — 카드를 접었다 펴도 초안이 답장 칸에 그대로');
  await tdr.fill('#rvq2 textarea[data-rin="2"]', '고치는 중');
  await tdr.click('#rvq2 [data-rv-tog]'); await tdr.click('#rvq2 [data-rv-tog]'); await tdr.waitForSelector('#rvq2 textarea[data-rin]');
  ok(await tdr.inputValue('#rvq2 textarea[data-rin="2"]') === '고치는 중', '결과 화면 — 고치던 글도 접었다 펴면 그대로');
  await tdr.fill('#rvq2 textarea[data-rin="2"]', '선생님이 고친 답장'); await tdr.click('#rvq2 [data-send="2"]');
  await tdr.waitForFunction(() => !document.querySelector('#rvq2 .dft'));
  const dp = (DB.draftPatch || []).find(x => x.b.used_at);
  ok(dp && dp.rest.includes('id=eq.1') && dp.b.used_by === '이현지' && DB.calls.filter(c => c.fn === 'qa-post').pop().r.body === '선생님이 고친 답장', '보내면 고친 글이 답장으로 가고 초안은 쓴 것으로(used_at·used_by)');
  await tdr.close(); DB.sub = keepSub; DB.drafts = [];

  // ── 4. 이미 낸 교재 과제(SHUEGUK REAL, 068) — 같은 화면이 교재 모양(.rq)으로 ──
  RS_MODE = true; S.review = {}; S.msgs = [];
  const rctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await rctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  const rs = await rctx.newPage(); const rdlg = []; rs.on('dialog', d => { rdlg.push(d.message()); d.accept(); }); const rerr = []; rs.on('pageerror', e => rerr.push(e.message));
  await rs.goto(U + 'hwork.html?c=' + encodeURIComponent('[모의고사 문법] 음운 1회') + '&t=' + encodeURIComponent('이현지') + '&nm=' + encodeURIComponent('김철수') + '&sc=' + encodeURIComponent('화정고') + '&gr=' + encodeURIComponent('고1'));
  await rs.waitForSelector('#dndBox'); await rs.click('.dnd-go');
  if (await rs.locator('#qmode [data-qm="paper"]').count()) await rs.click('#qmode [data-qm="paper"]');
  ok(await rs.locator('#qwrap .gqp .rq').count() === 1 && (await rs.locator('#qwrap .gqp .prng').textContent()) === '[1~2]', '교재 — 지문 한 번 [1~2]');
  ok(await rs.locator('#q1 .rq .stem').isVisible() && await rs.locator('#q1 .gq').count() === 0, '교재 — 문제가 교재 모양(.rq)');
  ok(await rs.locator('#q1 .rq .bogi .bl').isVisible(), '교재 — 〈보기〉 상자');
  ok((await rs.locator('#qwrap .gqp .oh').textContent()) === '말ᄊᆞ미' && (await rs.locator('#qwrap .gqp .oh').evaluate(e => getComputedStyle(e).fontFamily)).includes('Noto Sans CJK KR'), '옛한글 낱말만 기기 글꼴(.oh)로');
  await rs.click('#q1 .choices button:nth-child(2)'); await rs.click('#q2 .choices button:nth-child(1)'); await rs.click('#q3 .choices button:nth-child(3)');
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-solve.png'), fullPage: true });
  ok(await rs.evaluate(() => document.documentElement.scrollWidth <= 391), '교재 학생 풀이 화면 — 휴대폰 가로 넘침 없음 (' + await rs.evaluate(() => document.documentElement.scrollWidth) + ')');
  await rs.click('#submit'); await rs.waitForSelector('#rvq2');
  ok(rdlg.some(m => m.includes('3번은 오류 문항이라 어떤 답이든 정답으로 처리됩니다')), '교재 — 제출할 때 오류 문항(3번) 안내');
  ok(await rs.evaluate(() => document.documentElement.scrollWidth <= 391), '교재 학생 결과 화면 — 휴대폰 가로 넘침 없음');
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-result.png'), fullPage: true });
  ok((await rs.locator('#rvq2 .hid').textContent()).includes('클리어'), '교재 — 틀린 문항 정답 잠김');
  if (!(await rs.locator('#rvq1 .cmp').count())) await rs.click('#rvq1 [data-rv-tog]');
  ok((await rs.locator('#ex1 button').textContent()) === '정답 보기', '교재 — 맞힌 문항 정답 보기 버튼');
  await rs.click('#ex1 button'); await rs.waitForSelector('#ex1 .expl');
  const ex = await rs.locator('#ex1 .expl').textContent();
  ok(ex.includes('정답 ②') && ex.includes('해설은 없어요'), '교재 — 정답만, 해설 없음 안내');
  globalThis.SRC_EXPL = true;
  await rs.evaluate(() => qaExpl(1)); await rs.waitForFunction(() => (document.querySelector('#ex1 .expl') || {}).textContent && document.querySelector('#ex1 .expl').textContent.includes('교재 해설 문장'));
  const ex2 = await rs.locator('#ex1 .expl').textContent();
  ok(ex2.includes('교재 해설 문장') && await rs.locator('#ex1 .expl div').filter({ hasText: '① 오답 하나' }).count() === 1 && !ex2.includes('해설은 없어요'), '교재 해설 있음 — 해설·오답 해설 줄 나눔 (075)');
  globalThis.SRC_EXPL = false;
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-qa.png') });
  ok(!rerr.length, '교재 학생 화면 오류 없음 ' + rerr.join(' | '));
  DB.sub = Object.assign({}, sub, { id: 77, code: 'SHUEGUK REAL 내신 기출 문장 1권(기본·실력) 01 문장 성분 · 기본' });
  DB.qa = [{ id: 11, sub_id: 77, q: '2', who: '학생', name: '김철수', body: '교재 질문', mine: '1', at: '2026-11-17T06:10:00Z', read_at: null, s: DB.sub }];
  const rt2 = await ctx.newPage(); const rterr = []; rt2.on('pageerror', e => rterr.push(e.message));
  await rt2.goto(U + 'hwork_result.html?sid=77&q=2'); await rt2.waitForSelector('#rvq2 .rvthr');
  ok((await rt2.locator('#rvq2 .rq .stem').textContent()) === '교재 문항 2', '결과 화면 — 교재 문제');
  ok(await rt2.locator('#rvq2 .rq .cn.ok').count() === 1 && (await rt2.locator('#rvq2 .rq .cn.ok').textContent()) === '3', '결과 화면 — 교재 정답 ③ 표시');
  ok(DB.calls.some(c => c.fn === 'src' && c.rest.includes(encodeURIComponent('문장 1권'))), '결과 화면 — 과제 이름으로 원문 찾음');
  ok(await rt2.locator('#rvq2 .rq .psg').count() === 1, '결과 화면 — 교재 지문');
  ok(await rt2.locator('#rvq2 details.expl').count() === 1 && (await rt2.locator('#rvq2 details.expl').textContent()).includes('교사 해설 글') && await rt2.locator('#rvq2 details.expl div').count() === 3, '결과 화면 — 교재 해설 보기(해설 + 오답 해설 두 줄, 075)');
  ok(DB.calls.some(c => c.fn === 'src' && c.rest.includes('expl,wrong')), '결과 화면 — 해설 칸까지 읽음');
  if (SHOT) await rt2.screenshot({ path: path.join(SHOT, 'real-teacher-result.png') });
  ok(!rterr.length, '교재 결과 화면 오류 없음 ' + rterr.join(' | '));
  await b.close(); srv.close();
  console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });

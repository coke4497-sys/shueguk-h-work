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
  if (u.includes('script.google.com')) { DB.posts.push(JSON.parse(body || '{}')); return rt.fulfill({ json: { ok: true, msg: '저장되었습니다' } }); }
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
  if (rest.startsWith('/hwork_src_items')) { DB.calls.push({ fn: 'src', rest }); return rt.fulfill({ json: [{ no: '2', html: RQ(2), pid: 'wb-P1', type: '5지', ans: '③', essay: '', src: '건대부고3 24 1 중간', err: false, book: '문장 1권(기본·실력)' }] }); }
  if (rest.startsWith('/hwork_src_passages')) return rt.fulfill({ json: [{ pid: 'wb-P1', html: '<div class="psg">교재 지문 글 나랏 말ᄊᆞ미</div>' }] });
  if (rest.startsWith('/students')) return rt.fulfill({ json: rest.includes('offset=0') ? [{ school: '화정고', enrolled: '재원' }, { school: '능곡고', enrolled: '재원' }, { school: '옛학교', enrolled: '퇴원' }] : [] });
  if (rest.startsWith('/hwork_submissions')) { const m = rest.match(/id=eq\.(\d+)/); return rt.fulfill({ json: m && DB.sub && DB.sub.id == m[1] ? [DB.sub] : [] }); }
  if (rest.startsWith('/hwork_retests')) return rt.fulfill({ json: [] });
  if (rest.startsWith('/hwork_reply_files')) { DB.files = (DB.files || []).concat(JSON.parse(body)); return rt.fulfill({ status: 201, body: '' }); }
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
  if (fn === 'hwork_qa_clear') { if (!S.msgs.some(m => m.q === p.q && m.who === '선생님')) return { ok: false, error: '선생님 답장이 온 뒤에 누를 수 있어요.' };
    const r = S.review[p.q] = Object.assign({ tries: [] }, S.review[p.q] || {}, { understood_at: '2026-11-17 16:05' }); let cl = false;
    if (S.detail[p.q].ok === false && !r.cleared_at) { r.cleared_at = '2026-11-17 16:05'; r.via = 'qa'; cl = true; }
    return { ok: true, q: p.q, cleared: cl, at: '2026-11-17 16:05', review: r, ans: r.cleared_at ? String(KEY[p.q]) : null, done: false }; }
  if (fn === 'hwork_retry_state') return { ok: true, stage: 'fix', teacher: S.teacher, code: S.code, name: S.name, got: 1, total: 3, detail: S.detail, review: S.review, answers: {} };
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
    review: { '2': { tries: [{ wrong: '1', why_wrong: '느낌으로', pick: '3', why_right: '비교', ok: false }], help: { at: '15:10' } } } };
  DB.sub = sub;
  DB.qa = [{ id: 1, sub_id: 55, q: '2', who: '학생', name: '김철수', body: 'ㄴ이 왜 틀렸는지 모르겠어요', mine: '3', at: '2026-11-17T06:10:00Z', read_at: null, s: sub }];
  DB.qa.push({ id: 50, sub_id: 70, q: '5', who: '선생님', name: '남주혜', body: '지난 설명 — 보기의 ㄴ은 반모음입니다', mine: '', at: '2026-11-10T06:10:00Z', read_at: null,
    files: [{ name: '풀이.png', size: 10, mime: 'image/png', path: 'r/70/abc.png' }], s: { code: '다른 과제', name: '박영희' } });
  DB.qa.push({ id: 51, sub_id: 71, q: '1', who: '선생님', name: '남주혜', body: '다른 문항 설명', mine: '', at: '2026-11-10T06:10:00Z', read_at: null, s: { code: '다른 과제', name: '박영희' } });
  const t = await ctx.newPage(); const terr = []; t.on('pageerror', e => terr.push(e.message));
  await t.goto(U + 'hwork_result.html?sid=55&q=2'); await t.waitForSelector('#rvq2 .rvthr');
  const cs = await t.evaluate(() => { const e = document.querySelector('#rvq2 .cn.ok'); return { bg: getComputedStyle(e).backgroundColor, before: getComputedStyle(e, '::before').content }; });
  ok(cs.bg === 'rgb(95, 148, 136)' && (cs.before === 'none' || cs.before === 'normal'), '정답 번호를 칠함(덧씌운 동그라미 없음) ' + JSON.stringify(cs));
  ok((await t.textContent('#rvq2 .prev summary')).includes('같은 문제에 남긴 답장 1개'), '같은 문항 id(다른 과제 5번)의 지난 답장 1개 — 다른 문항 답장은 빠짐');
  await t.click('#rvq2 .prev summary'); await t.click('[data-pv="2|0"]');
  ok((await t.inputValue('textarea[data-rin="2"]')).includes('지난 설명'), '불러오기 → 답장 칸에 글');
  ok((await t.textContent('[data-reuse="2"]')).includes('풀이.png'), '지난 첨부도 다시 보낼 목록에');
  ok((await t.locator('#rvq2 .gq .stem').textContent()) === '지문 세트 둘째 문항', '결과 화면 — 문제');
  ok(await t.locator('#rvq2 .cn.ok').count() === 1, '선생님 화면 — 정답 동그라미');
  ok((await t.locator('#rvq2').textContent()).includes('느낌으로'), '오답하기 기록(이유) 보임');
  await t.waitForTimeout(300);
  ok(DB.patches.some(x => x.includes('id=in.(1)')), '열면 학생 글 읽음 처리');
  await t.fill('textarea[data-rin="2"]', '보기 ㄴ의 둘째 문장을 다시 보세요'); await t.click('[data-send="2"]');
  await t.waitForFunction(() => document.getElementById('toast').textContent.includes('답장을 보냈어요'));
  ok((DB.files || []).some(f => f.path === 'r/70/abc.png' && f.sub_id === 55 && f.q === '2'), '지난 첨부를 같은 파일로 다시 이음(올리지 않음) ');
  const r = DB.calls.find(c => c.fn === 'qa-post');
  ok(r && r.r.who === '선생님' && r.r.name === '이현지' && r.r.sub_id === 55 && r.r.q === '2', '답장 POST — 선생님·이름·제출·문항');
  await t.waitForSelector('#rvq2 .msg.tc');
  if (SHOT) await t.screenshot({ path: path.join(SHOT, 'bank-teacher-result.png'), fullPage: true });
  ok(!terr.length, '선생님 결과 화면 오류 없음 ' + terr.join(' | '));
  // 휴대폰(390px) — 선생님 결과 화면
  const tm = await ctx.newPage(); await tm.setViewportSize({ width: 390, height: 844 });
  await tm.goto(U + 'hwork_result.html?sid=55&q=2'); await tm.waitForSelector('#rvq2 .rvthr');
  ok(await tm.evaluate(() => document.documentElement.scrollWidth <= 391), '휴대폰 — 가로로 밀리지 않음 (' + await tm.evaluate(() => document.documentElement.scrollWidth) + ')');
  if (SHOT) { await tm.screenshot({ path: path.join(SHOT, 'teacher-mobile-top.png') }); await tm.screenshot({ path: path.join(SHOT, 'teacher-mobile-full.png'), fullPage: true }); }
  await tm.close();
  // 주소 없이 — 답장 기다리는 질문 목록
  DB.qa.push({ id: 2, sub_id: 56, q: '1', who: '학생', name: '이영희', body: '대기 질문', mine: '2', at: '2026-11-17T05:00:00Z', read_at: null, s: Object.assign({}, sub, { id: 56, name: '이영희' }) });
  const tl = await ctx.newPage(); await tl.goto(U + 'hwork_result.html'); await tl.waitForSelector('.wl');
  ok(await tl.locator('.wl a.row').count() === 1 && (await tl.locator('.wl a.row').getAttribute('href')) === '?sid=56&q=1', '목록 — 마지막 글이 학생인 질문만');

  // ── 4. 이미 낸 교재 과제(SHUEGUK REAL, 068) — 같은 화면이 교재 모양(.rq)으로 ──
  RS_MODE = true; S.review = {}; S.msgs = [];
  const rctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await rctx.route('**/*', rt => { const r = rt.request(), u = r.url(); if (u.startsWith(U)) return rt.continue(); return fake(rt, u, r.method(), r.postData()); });
  const rs = await rctx.newPage(); rs.on('dialog', d => d.accept()); const rerr = []; rs.on('pageerror', e => rerr.push(e.message));
  await rs.goto(U + 'hwork.html?c=' + encodeURIComponent('[모의고사 문법] 음운 1회') + '&t=' + encodeURIComponent('이현지') + '&nm=' + encodeURIComponent('김철수') + '&sc=' + encodeURIComponent('화정고') + '&gr=' + encodeURIComponent('고1'));
  await rs.waitForSelector('#dndBox'); await rs.click('.dnd-go');
  ok(await rs.locator('#qwrap .gqp .rq').count() === 1 && (await rs.locator('#qwrap .gqp .prng').textContent()) === '[1~2]', '교재 — 지문 한 번 [1~2]');
  ok(await rs.locator('#q1 .rq .stem').isVisible() && await rs.locator('#q1 .gq').count() === 0, '교재 — 문제가 교재 모양(.rq)');
  ok(await rs.locator('#q1 .rq .bogi .bl').isVisible(), '교재 — 〈보기〉 상자');
  ok((await rs.locator('#qwrap .gqp .oh').textContent()) === '말ᄊᆞ미' && (await rs.locator('#qwrap .gqp .oh').evaluate(e => getComputedStyle(e).fontFamily)).includes('Noto Sans CJK KR'), '옛한글 낱말만 기기 글꼴(.oh)로');
  await rs.click('#q1 .choices button:nth-child(2)'); await rs.click('#q2 .choices button:nth-child(1)'); await rs.click('#q3 .choices button:nth-child(3)');
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-solve.png'), fullPage: true });
  ok(await rs.evaluate(() => document.documentElement.scrollWidth <= 391), '교재 학생 풀이 화면 — 휴대폰 가로 넘침 없음 (' + await rs.evaluate(() => document.documentElement.scrollWidth) + ')');
  await rs.click('#submit'); await rs.waitForSelector('#rvq2');
  ok(await rs.evaluate(() => document.documentElement.scrollWidth <= 391), '교재 학생 결과 화면 — 휴대폰 가로 넘침 없음');
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-result.png'), fullPage: true });
  ok((await rs.locator('#rvq2 .hid').textContent()).includes('클리어'), '교재 — 틀린 문항 정답 잠김');
  if (!(await rs.locator('#rvq1 .cmp').count())) await rs.click('#rvq1 [data-rv-tog]');
  ok((await rs.locator('#ex1 button').textContent()) === '정답 보기', '교재 — 맞힌 문항 정답 보기 버튼');
  await rs.click('#ex1 button'); await rs.waitForSelector('#ex1 .expl');
  const ex = await rs.locator('#ex1 .expl').textContent();
  ok(ex.includes('정답 ②') && ex.includes('해설은 없어요'), '교재 — 정답만, 해설 없음 안내');
  if (SHOT) await rs.screenshot({ path: path.join(SHOT, 'real-student-qa.png') });
  ok(!rerr.length, '교재 학생 화면 오류 없음 ' + rerr.join(' | '));
  DB.sub = Object.assign({}, sub, { id: 77, code: 'SHUEGUK REAL 내신 기출 문장 1권(기본·실력) 01 문장 성분 · 기본' });
  DB.qa = [{ id: 11, sub_id: 77, q: '2', who: '학생', name: '김철수', body: '교재 질문', mine: '1', at: '2026-11-17T06:10:00Z', read_at: null, s: DB.sub }];
  const rt2 = await ctx.newPage(); const rterr = []; rt2.on('pageerror', e => rterr.push(e.message));
  await rt2.goto(U + 'hwork_result.html?sid=77&q=2'); await rt2.waitForSelector('#rvq2 .rvthr');
  ok((await rt2.locator('#rvq2 .rq .stem').textContent()) === '교재 문항 2', '결과 화면 — 교재 문제');
  ok(await rt2.locator('#rvq2 .rq .cn.ok').count() === 1 && (await rt2.locator('#rvq2 .rq .cn.ok').textContent()) === '③', '결과 화면 — 교재 정답 ③ 표시');
  ok(DB.calls.some(c => c.fn === 'src' && c.rest.includes(encodeURIComponent('문장 1권'))), '결과 화면 — 과제 이름으로 원문 찾음');
  ok(await rt2.locator('#rvq2 .rq .psg').count() === 1, '결과 화면 — 교재 지문');
  if (SHOT) await rt2.screenshot({ path: path.join(SHOT, 'real-teacher-result.png') });
  ok(!rterr.length, '교재 결과 화면 오류 없음 ' + rterr.join(' | '));
  await b.close(); srv.close();
  console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });

// H WORK 풀이 시간 기록(2026-11-18) — 잠시 멈추기·이어 풀기·화면 밖·10분 넘김·제출 본문·결과 화면 E2E
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/hwork-time-e2e.js [캡처 폴더]
// 가짜 수파베이스: hwork_submit 은 틀린 문항 정답을 감춰 돌려주고, hwork_fix/flag/retry_state 는 065 규칙을 흉내 낸다.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SHOT = process.argv[2] || '';
const PORT = 8774;
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(b); });
}).listen(PORT);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };

const KEY = { '1': { type: 'choice5', ans: '3' }, '2': { type: 'essay', ans: '예시 답입니다.' }, '3': { type: 'text', ans: '나' },
  '4': { type: 'ox', ans: 'O' }, '5': { type: 'choice5', ans: '2' } };
const DB = { row: null, calls: [] }; const REP = [];
function grade(ans) {
  const d = {}; let got = 0, total = 0;
  for (const q of Object.keys(KEY)) { const k = KEY[q], mine = ans[q] == null ? '' : String(ans[q]);
    const okv = k.type === 'essay' ? null : mine === k.ans; if (okv !== null) total++; if (okv) got++;
    d[q] = { type: k.type, mine, ans: k.ans, ok: okv }; }
  return { got, total, count: 5, detail: d };
}
const hide = d => { const o = {}; for (const k in d) { o[k] = Object.assign({}, d[k]); if (d[k].ok === false) delete o[k].ans; } return o; };
const wrongAns = d => { const o = {}; for (const k in d) if (d[k].ok === false) o[k] = d[k].ans; return o; };
function rpc(fn, p) {
  DB.calls.push({ fn, p });
  if (fn === 'hwork_submit') {
    DB.lastSubmit = p;
    const r = grade(p.answers || {});
    DB.row = { id: 41, key: 'abcdef0123456789abcdef0123456789', detail: r.detail, got: r.got, total: r.total, retry: null, review: null,
      teacher: p.teacher, code: p.code, name: p.name, time: p.time || null, away_n: (p.away||{}).n||0, away_sec: (p.away||{}).sec||0 };
    return { ok: true, id: 41, key: DB.row.key, result: Object.assign({}, r, { detail: hide(r.detail) }),
      student: { teacher: p.teacher, code: p.code, school: p.school, grade: p.grade, name: p.name } };
  }
  const s = DB.row;
  if (!s || p.id !== s.id || p.key !== s.key) return { ok: false, error: '제출 기록을 찾을 수 없습니다.' };
  s.review = s.review || {};
  const wq = Object.keys(s.detail).filter(k => s.detail[k].ok === false);
  const done = () => wq.every(q => { const v = s.review[q] || {}; return v.cleared_at || v.help || v.error; });
  if (fn === 'hwork_fix') {
    const q = p.q; if (!wq.includes(q)) return { ok: false, reason: 'not_wrong' };
    const cur = s.review[q] = s.review[q] || { tries: [] };
    if (cur.cleared_at) return { ok: false, reason: 'cleared' };
    if (!(p.why_wrong || '').trim() || !p.pick || !(p.why_right || '').trim()) return { ok: false, error: '빈 칸' };
    const wrong = cur.tries.length ? cur.tries[cur.tries.length - 1].pick : s.detail[q].mine;
    const okv = p.pick === KEY[q].ans;
    cur.tries.push({ wrong, why_wrong: p.why_wrong, pick: p.pick, why_right: p.why_right, ok: okv, at: '15:05' });
    if (okv) cur.cleared_at = '15:06';
    return { ok: true, q, correct: okv, tries: cur.tries.length, cleared: wq.filter(k => (s.review[k] || {}).cleared_at).length, total: wq.length, done: done(), ans: okv ? KEY[q].ans : null };
  }
  if (fn === 'hwork_flag') {
    const q = p.q; if (!wq.includes(q)) return { ok: false, reason: 'not_wrong' };
    if (p.kind === 'error' && !(p.text || '').trim()) return { ok: false, reason: 'text', error: '내용' };
    const cur = s.review[q] = s.review[q] || { tries: [] };
    if (cur[p.kind]) return { ok: false, reason: 'done' };
    cur[p.kind] = { at: '15:07', text: p.text || '' };
    return { ok: true, q, kind: p.kind, at: '15:07', done: done() };
  }
  if (fn === 'hwork_qa_post') { s.qa = s.qa || []; s.qa.push({ id: s.qa.length + 1, q: p.q, who: '학생', body: p.text, mine: '', at: '2026-11-17 15:08', read: false }); return { ok: true, msgs: s.qa }; }
  if (fn === 'hwork_qa_list') return { ok: true, msgs: s.qa || [] };
  if (fn === 'hwork_retry_state') {
    const ans = {}; wq.forEach(q => { if ((s.review[q] || {}).cleared_at) ans[q] = KEY[q].ans; });
    return { ok: true, stage: done() ? 'done' : 'fix', teacher: s.teacher, code: s.code, name: s.name, got: s.got, total: s.total,
      detail: hide(s.detail), review: s.review, answers: ans, time: s.time, away_n: s.away_n, away_sec: s.away_sec };
  }
  return { ok: false };
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await ctx.route('**/*', async rt => {
    const u = rt.request().url();
    if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    if (u.includes('/rpc/hwork_list')) return rt.fulfill({ json: { ok: true, list: [{ teacher: '이수경', code: 'T세트', due: '', closed: false }] } });
    if (u.includes('/rpc/hwork_meta')) return rt.fulfill({ json: { ok: true, meta: { teacher: '이수경', code: 'T세트', count: 5, schools: ['무원고등학교'],
      items: { '1': { type: 'choice5' }, '2': { type: 'essay' }, '3': { type: 'text' }, '4': { type: 'ox' }, '5': { type: 'choice5' } }, due: '', closed: false } } });
    const m = u.match(/\/rpc\/(hwork_[a-z_]+)/);
    if (m) { const body = JSON.parse(rt.request().postData() || '{}'); return rt.fulfill({ json: rpc(m[1], body.p || {}) }); }
    if (u.includes('script.google.com')) return rt.fulfill({ json: { ok: true } });
    return rt.fulfill({ body: '' });
  });
  p.on('dialog', d => d.accept());
  const vis = async v => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);
  const open = async () => { await p.goto('http://localhost:' + PORT + '/hwork.html'); await p.waitForTimeout(600);
    await p.selectOption('#teacherSel', '이수경'); await p.waitForTimeout(250); await p.selectOption('#codeSel', 'T세트'); await p.waitForTimeout(600); };
  const draft = () => p.evaluate(() => JSON.parse(localStorage.getItem('hw_draft_v1') || '{}')['이수경|T세트'] || null);

  await open();
  ok((await p.textContent('#dndBox')).includes('풀이 시간 기록 안내'), '시작 안내에 시간 기록 안내 링크');
  ok(!(await p.textContent('#dndBox')).includes('풀던 기록'), '처음엔 이어 풀기 안내 없음');
  ok(!(await p.locator('#pauseBtn').isVisible()), '시작 전엔 [잠시 멈추기] 없음');
  await p.fill('#name', '박보검');
  await p.click('.dnd-go'); await p.waitForTimeout(150);
  ok(await p.locator('#pauseBtn').isVisible(), '풀기 시작 → [잠시 멈추기] 보임');
  await p.click('#q1 .choices button:nth-child(1)'); await p.fill('#q3 input', '가');
  await vis('hidden'); await p.waitForTimeout(1100); await vis('visible');
  let d = await draft();
  ok(d && d.picks['1'] === 1 && d.picks['3'] === '가' && d.sessions.length === 1 && d.sessions[0].an === 1, '답·화면 밖 1회가 이 기기에 저장됨');
  await p.click('#pauseBtn'); await p.waitForTimeout(150);
  ok(await p.locator('#pausedBox').isVisible() && !(await p.locator('#qwrap').isVisible()), '[잠시 멈추기] → 문항 닫히고 멈춤 안내');
  ok((await p.textContent('#pausedBox')).includes('답 2개'), '멈춤 안내에 저장한 답 수');
  d = await draft(); ok(d.sessions[0].end === 'pause', '구간 끝 = 잠시 멈춤');
  await p.click('#submit'); await p.waitForTimeout(200);
  ok(!DB.lastSubmit, '멈춘 채로는 제출 안 됨');

  // 창을 닫았다 다시 열기 → 이어 풀기
  await open();
  ok((await p.textContent('#dndBox')).includes('풀던 기록') && (await p.textContent('#dndBox')).includes('답 2개'), '다시 열면 이어 풀기 안내');
  if (SHOT) await p.locator('#dndBox').screenshot({ path: SHOT + '/time-resume.png' });
  await p.click('.dnd-go'); await p.waitForTimeout(200);
  ok(await p.locator('#q1 .choices button.sel').count() === 1 && (await p.inputValue('#q3 input')) === '가' && (await p.inputValue('#name')) === '박보검', '답·이름이 다시 채워짐');
  ok(await p.evaluate(() => TL.sessions.length) === 2, '새 구간 시작(2번째)');
  // 10분 넘게 화면 밖 → 그 구간 멈춤, 새 구간
  await vis('hidden');
  await p.evaluate(() => { TL.cur.h = Date.now() - 11 * 60 * 1000; });
  await vis('visible'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => TL.sessions.length === 3 && TL.sessions[1].end === 'idle' && TL.sessions[1].an === 0), '10분 넘게 밖 → 멈춤(idle)·새 구간, 그 나감은 횟수에 안 셈');
  await vis('hidden'); await p.waitForTimeout(800); await vis('visible');
  await p.fill('#q2 textarea', '내 서술'); await p.click('#q4 .ox button:nth-child(1)'); await p.click('#q5 .choices button:nth-child(2)');
  await p.selectOption('#schoolSel', '무원고등학교'); await p.selectOption('#gradeSel', '고2');
  await p.click('#submit'); await p.waitForTimeout(700);
  const t = DB.lastSubmit && DB.lastSubmit.time;
  ok(t && t.sessions.length === 3 && t.sessions.map(x => x.end).join(',') === 'pause,idle,submit', '제출 본문 time — 구간 셋, 끝 까닭 ' + (t && t.sessions.map(x => x.end)));
  ok(t && t.an === 2 && t.breaks === 2 && DB.lastSubmit.away.n === 2 && t.as >= 1 && t.as <= 3, '화면 밖 합계 2회 · away 와 같음 ' + JSON.stringify(DB.lastSubmit.away));
  ok(t && t.act >= 0 && t.span >= t.act && t.first <= t.sessions[0].s, '푼 시간·전체 시간 ' + (t && t.act + '/' + t.span));
  ok(!(await draft()), '제출하면 이 기기 풀던 기록 지움');
  ok(await p.locator('#report .bx.tm').count() === 1 && (await p.textContent('#report .bx.tm')).includes('3번에 나눠 풂'), '결과 화면 풀이 시간 상자');
  ok(await p.locator('#report .tml .tmr').count() === 3, '구간 세 줄');
  const tl = await p.textContent('#report .tml');
  ok(tl.includes('잠시 멈춤') && tl.includes('10분 넘게 화면 밖') && tl.includes('제출') && tl.includes('다시 시작') && tl.includes('쉬고 다시 시작'), '멈춘 시각·다시 시작한 시각·까닭');
  ok(await p.locator('#report .bx.away').count() === 0, '옛 이탈 상자는 시간 기록이 있으면 안 그림');
  await p.click('#report .tml summary'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), '휴대폰 가로 넘침 없음');
  if (SHOT) await p.locator('#report .rvcard').first().screenshot({ path: SHOT + '/time-report.png' }).catch(() => {});
  if (SHOT) await p.screenshot({ path: SHOT + '/time-report-full.png', fullPage: true });

  // 다시 열어 이어 하기(retry_state) → 시간 기록 그대로
  await p.goto('http://localhost:' + PORT + '/hwork.html'); await p.waitForTimeout(700);
  await p.click('#resume button'); await p.waitForTimeout(600);
  ok(await p.locator('#report .tml .tmr').count() === 3, '다시 열어도 시간 기록(서버 time)');

  // 처음부터 다시 풀기 — 남은 기록을 지운다
  await open(); await p.click('.dnd-go'); await p.click('#q1 .choices button:nth-child(2)'); await p.click('#pauseBtn');
  await open(); await p.click('.dnd-new'); await p.waitForTimeout(200);
  ok(await p.locator('#q1 .choices button.sel').count() === 0 && await p.evaluate(() => TL.sessions.length) === 1, '처음부터 다시 풀기 → 답 비우고 구간 하나');

  await b.close(); srv.close();
  console.log('통과 ' + pass + ' 실패 ' + fail); process.exit(fail ? 1 : 0);
})();

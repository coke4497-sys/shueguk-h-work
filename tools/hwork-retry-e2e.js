// H WORK 다시 풀기 · 오답 정리 — 학생 화면(hwork.html)·교사 화면(hwork_teacher.html) E2E
// NODE_PATH=$(npm root -g) node tools/hwork-retry-e2e.js [캡처 폴더]
// 가짜 수파베이스: hwork_submit 은 틀린 문항 정답을 감춰 돌려주고, hwork_retry/review/retry_state 는 064 규칙을 흉내 낸다.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SHOT = process.argv[2] || '';
const PORT = 8771;
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(b); });
}).listen(PORT);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };

const KEY = { '1': { type: 'choice5', ans: '3' }, '2': { type: 'essay', ans: '예시 답입니다.' }, '3': { type: 'text', ans: '나' },
  '4': { type: 'ox', ans: 'O' }, '5': { type: 'choice5', ans: '2' } };
const DB = { row: null, calls: [] };
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
    const r = grade(p.answers || {});
    DB.row = { id: 41, key: 'abcdef0123456789abcdef0123456789', detail: r.detail, got: r.got, total: r.total, retry: null, review: null,
      teacher: p.teacher, code: p.code, name: p.name };
    return { ok: true, id: 41, key: DB.row.key, result: Object.assign({}, r, { detail: hide(r.detail) }),
      student: { teacher: p.teacher, code: p.code, school: p.school, grade: p.grade, name: p.name } };
  }
  const s = DB.row;
  if (!s || p.id !== s.id || p.key !== s.key) return { ok: false, error: '제출 기록을 찾을 수 없습니다.' };
  if (fn === 'hwork_retry') {
    if (s.retry) return { ok: false, reason: 'done', error: '이미 다시 풀었습니다.' };
    const rd = {}, still = []; let g = 0;
    for (const q in s.detail) if (s.detail[q].ok === false) { const m = (p.answers || {})[q] || '', o = m === KEY[q].ans;
      rd[q] = { mine: m, ok: o }; if (o) g++; else still.push(q); }
    s.retry = rd; s.retry_got = g;
    return { ok: true, retry: rd, retry_got: g, still };
  }
  if (fn === 'hwork_review') {
    if (!s.retry) return { ok: false, reason: 'no_retry' };
    if (s.review) return { ok: false, reason: 'done' };
    const out = {};
    for (const q in s.retry) if (!s.retry[q].ok) { const n = (p.notes || {})[q] || {};
      if (!n.why) return { ok: false, reason: 'why', error: q + '번: 왜 틀렸는지 골라 주세요.' };
      if (!(n.fix || '').trim()) return { ok: false, reason: 'fix', error: q + '번: 풀이' };
      out[q] = { why: n.why, fix: n.fix.trim() }; }
    s.review = out;
    return { ok: true, answers: wrongAns(s.detail) };
  }
  if (fn === 'hwork_retry_state') {
    const wq = Object.keys(s.detail).filter(k => s.detail[k].ok === false);
    return { ok: true, stage: s.review ? 'done' : s.retry ? 'review' : wq.length ? 'retry' : 'done', teacher: s.teacher, code: s.code,
      name: s.name, got: s.got, total: s.total, detail: hide(s.detail), retry: s.retry, retry_got: s.retry_got, review: s.review,
      answers: s.review ? wrongAns(s.detail) : null };
  }
  return { ok: false };
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
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
  await p.goto('http://localhost:' + PORT + '/hwork.html'); await p.waitForTimeout(700);
  ok(!(await p.locator('#resume').isVisible()), '처음엔 이어 하기 상자 없음');
  await p.selectOption('#teacherSel', '이수경'); await p.waitForTimeout(300);
  await p.selectOption('#codeSel', 'T세트'); await p.waitForTimeout(700);
  // 1:1(틀림) 2:서술 3:가(틀림) 4:O(맞음) 5:2(맞음)
  await p.click('#q1 .choices button:nth-child(1)'); await p.fill('#q2 textarea', '내 서술'); await p.fill('#q3 input', '가');
  await p.click('#q4 .ox button:nth-child(1)'); await p.click('#q5 .choices button:nth-child(2)');
  await p.selectOption('#schoolSel', '무원고등학교'); await p.selectOption('#gradeSel', '고2'); await p.fill('#name', '박보검');
  await p.click('#submit'); await p.waitForTimeout(700);

  let rep = await p.textContent('#report');
  ok(rep.includes('2 / 4'), '1차 점수 2/4');
  ok(await p.locator('#report .hide').count() === 2, '틀린 2문항 정답 가림');
  ok(await p.locator('#retryBox').count() === 1, '다시 풀기 상자');
  ok(await p.locator('#retryBox .rq').count() === 2, '다시 풀 문항 2개(1·3번)');
  ok(await p.locator('#rq1 .choices button').count() === 5, '1번 5지 버튼');
  ok(await p.locator('#rq3 input.tans').count() === 1, '3번 단답 입력');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('hw_retry_v1')).length) === 1, '이 기기에 이어 하기 기록');
  ok((await p.textContent('#report .ess')).includes('내 서술'), '서술형 비교 그대로');
  if (SHOT) await p.screenshot({ path: SHOT + '/retry-1.png', fullPage: true });

  // 다시 풀기: 1번 3(맞음), 3번 다(틀림)
  await p.click('#rq1 .choices button:nth-child(3)'); await p.fill('#rq3 input', '다');
  await p.click('#retryBtn'); await p.waitForTimeout(600);
  const rc = DB.calls.find(c => c.fn === 'hwork_retry');
  ok(rc && rc.p.id === 41 && rc.p.key.length === 32 && rc.p.answers['1'] === '3' && rc.p.answers['3'] === '다', 'hwork_retry 본문(id·key·답)');
  rep = await p.textContent('#report');
  ok(rep.includes('틀린 2문항 중 1문항을 맞혔습니다'), '2차 결과 문구');
  ok(await p.locator('#report table.detail th').allTextContents().then(a => a.includes('2차')), '표에 2차 열');
  ok(await p.locator('#reviewBox .rv').count() === 1, '오답 정리는 2차에도 틀린 3번만');
  ok((await p.textContent('#rv3 .rvh')).includes('가') && (await p.textContent('#rv3 .rvh')).includes('다'), '1차·2차 답 표시');
  ok(await p.locator('#rv3 .why').count() === 4, '이유 알약 4개');
  ok(await p.locator('#report .hide').count() === 2, '정리 전엔 여전히 정답 가림');
  // 빈 채로 제출 → 막힘
  await p.click('#reviewBtn'); await p.waitForTimeout(300);
  ok(!DB.calls.some(c => c.fn === 'hwork_review'), '이유 안 고르면 보내지 않음');
  await p.click('#rv3 .why[data-w="헷갈려서"]');
  ok(await p.locator('#rv3 .why.on').count() === 1, '이유 고름');
  await p.click('#reviewBtn'); await p.waitForTimeout(300);
  ok(!DB.calls.some(c => c.fn === 'hwork_review'), '풀이 비면 보내지 않음');
  if (SHOT) await p.screenshot({ path: SHOT + '/retry-2.png', fullPage: true });

  // 새로고침 → 이어 하기(오답 정리 단계)
  await p.reload(); await p.waitForTimeout(600);
  ok(await p.locator('#resume').isVisible(), '새로고침 뒤 이어 하기 상자');
  await p.click('#resume .rsrow button'); await p.waitForTimeout(600);
  ok(await p.locator('#reviewBox .rv').count() === 1, '이어 하기 → 오답 정리 단계');
  await p.click('#rv3 .why[data-w="헷갈려서"]'); await p.fill('#rv3 textarea.fix', '나가 맞다. 앞 문장을 다시 읽어야 했다.');
  await p.click('#reviewBtn'); await p.waitForTimeout(600);
  const rv = DB.calls.find(c => c.fn === 'hwork_review');
  ok(rv && rv.p.notes['3'].why === '헷갈려서' && rv.p.notes['3'].fix.startsWith('나가 맞다'), 'hwork_review 본문');
  ok(await p.locator('#report .hide').count() === 0, '정리 뒤 정답 공개');
  ok(await p.locator('#report .reveal').count() === 2, '공개 정답 2개');
  rep = await p.textContent('#report');
  ok(rep.includes('다시 풀기 · 오답 정리 끝'), '끝 상자');
  ok(rep.includes('내 오답 정리') && rep.includes('나가 맞다'), '내 오답 정리 보임');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('hw_retry_v1') || '[]').length) === 0, '끝나면 이어 하기 기록 지움');
  if (SHOT) await p.screenshot({ path: SHOT + '/retry-3.png', fullPage: true });

  const FIRST = JSON.parse(JSON.stringify(DB.row));
  // 다 맞히면 다시 풀기 없음
  const p2 = await ctx.newPage(); p2.on('dialog', d => d.accept());
  await p2.goto('http://localhost:' + PORT + '/hwork.html'); await p2.waitForTimeout(600);
  await p2.selectOption('#teacherSel', '이수경'); await p2.waitForTimeout(300);
  await p2.selectOption('#codeSel', 'T세트'); await p2.waitForTimeout(600);
  await p2.click('#q1 .choices button:nth-child(3)'); await p2.fill('#q3 input', '나');
  await p2.click('#q4 .ox button:nth-child(1)'); await p2.click('#q5 .choices button:nth-child(2)');
  await p2.selectOption('#schoolSel', '무원고등학교'); await p2.selectOption('#gradeSel', '고2'); await p2.fill('#name', '정해인');
  await p2.click('#submit'); await p2.waitForTimeout(600);
  ok(await p2.locator('#retryBox').count() === 0 && (await p2.textContent('#report')).includes('4 / 4'), '다 맞히면 다시 풀기 없음');

  // ── 교사 화면 ──
  const tp = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const R = FIRST;
  const sub = [
    { id: 41, ts: '2026-11-11 15:00', teacher: '이수경', code: 'T세트', school: '무원고등학교', grade: '고2', name: '박보검', got: 2, total: 4, questions: {},
      retry_got: 1, retry_at: '2026-11-11 15:05', review_at: '2026-11-11 15:09', detail: R.detail, retry_detail: R.retry, review: R.review },
    { id: 42, ts: '2026-11-11 15:10', teacher: '이수경', code: 'T세트', school: '무원고등학교', grade: '고2', name: '정해인', got: 1, total: 4, questions: {},
      retry_got: null, retry_at: null, review_at: null, detail: grade({ '1': '1', '3': '가', '4': 'O' }).detail, retry_detail: null, review: null } ];
  let oldDb = false;
  await tp.route('**/*', async rt => {
    const u = rt.request().url();
    if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    if (u.includes('/auth/v1/token')) return rt.fulfill({ json: { access_token: 'tok', expires_in: 3600 } });
    if (u.includes('/rest/v1/hwork_submissions')) {
      const q = new URL(u).searchParams; const cols = (q.get('select') || '').split(',');
      if (oldDb && cols.some(c => c.startsWith('retry') || c.startsWith('review'))) return rt.fulfill({ status: 400, json: { message: 'column does not exist' } });
      let rows = sub; const id = q.get('id'); if (id) rows = rows.filter(r => 'eq.' + r.id === id);
      if (q.get('offset') && q.get('offset') !== '0') rows = [];
      return rt.fulfill({ json: rows.map(r => { const o = {}; cols.forEach(c => o[c] = r[c] === undefined ? null : r[c]); return o; }) });
    }
    if (u.endsWith('.js')) return rt.fulfill({ body: '', contentType: 'text/javascript' });
    return rt.fulfill({ json: { ok: true, list: [] } });
  });
  await tp.goto('http://localhost:' + PORT + '/hwork_teacher.html'); await tp.waitForTimeout(700);
  await tp.selectOption('#fTeacher', '이수경'); await tp.waitForTimeout(200);
  ok((await tp.textContent('#listBody')).includes('다시 +1 · 정리 ✓'), '교사 목록: 다시 +1 · 정리 ✓');
  ok((await tp.locator('#listBody .rtag').count()) === 1, '다시 안 푼 학생은 표시 없음');
  await tp.click('#listBody tr:has-text("박보검")'); await tp.waitForTimeout(500);
  let tr = await tp.textContent('#report'); 
  ok(tr.includes('틀린 2문항 중 1문항을 맞혔습니다') && tr.includes('오답 정리 완료'), '교사 성적표: 다시 풀기 줄');
  ok((await tp.locator('#report table.detail th').allTextContents()).includes('다시 풀기'), '교사 성적표: 다시 풀기 열');
  ok(tr.includes('헷갈려서') && tr.includes('나가 맞다'), '교사 성적표: 오답 정리 표');
  if (SHOT) await tp.screenshot({ path: SHOT + '/teacher-report.png', fullPage: true });
  await tp.click('#report .back button'); await tp.click('#listBody tr:has-text("정해인")'); await tp.waitForTimeout(500);
  ok((await tp.textContent('#report')).includes('아직 틀린 문항 3개를 다시 풀지 않았습니다'), '교사 성적표: 아직 안 품');
  await tp.click('#report .back button');
  await tp.selectOption('#fCode', 'T세트'); await tp.waitForTimeout(200);
  await tp.click('#qbtn button'); await tp.waitForTimeout(600);
  const heads = await tp.locator('table.qrank th').allTextContents();
  ok(heads.includes('개념을 몰라서') && heads.includes('다시 풀어도 틀림'), '문항 분석: 두 열');
  const row3 = await tp.locator('table.qrank tr', { hasText: '나' }).first().textContent();
  ok(/2 \/ 2\s*1/.test(row3.replace(/\s+/g, ' ')), '문항 분석: 3번 두 명 틀림 · 다시도 틀림 1');
  // 064 전 DB — 옛 열로 다시 읽는다
  oldDb = true;
  await tp.goto('http://localhost:' + PORT + '/hwork_teacher.html'); await tp.waitForTimeout(700);
  await tp.selectOption('#fTeacher', '이수경'); await tp.waitForTimeout(200);
  ok((await tp.locator('#listBody tr').count()) === 2 && (await tp.locator('#listBody .rtag').count()) === 0, '064 전 DB: 목록 그대로');
  await tp.click('#listBody tr:has-text("박보검")'); await tp.waitForTimeout(500);
  ok(!(await tp.textContent('#report')).includes('다시 풀기'), '064 전 DB: 성적표 옛 모양');

  console.log('통과', pass, '실패', fail); await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})();

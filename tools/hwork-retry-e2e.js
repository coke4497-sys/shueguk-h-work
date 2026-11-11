// H WORK 오답하기 — 학생 화면(hwork.html)·교사 화면(hwork_teacher.html) E2E
// NODE_PATH=$(npm root -g) node tools/hwork-retry-e2e.js [캡처 폴더]
// 가짜 수파베이스: hwork_submit 은 틀린 문항 정답을 감춰 돌려주고, hwork_fix/flag/retry_state 는 065 규칙을 흉내 낸다.
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
    const r = grade(p.answers || {});
    DB.row = { id: 41, key: 'abcdef0123456789abcdef0123456789', detail: r.detail, got: r.got, total: r.total, retry: null, review: null,
      teacher: p.teacher, code: p.code, name: p.name };
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
  if (fn === 'hwork_retry_state') {
    const ans = {}; wq.forEach(q => { if ((s.review[q] || {}).cleared_at) ans[q] = KEY[q].ans; });
    return { ok: true, stage: done() ? 'done' : 'fix', teacher: s.teacher, code: s.code, name: s.name, got: s.got, total: s.total,
      detail: hide(s.detail), review: s.review, answers: ans };
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
    if (u.includes('script.google.com')) { try { const b = JSON.parse(rt.request().postData() || '{}'); if (b.action === 'hworkReport') REP.push(b); } catch (e) {} return rt.fulfill({ json: { ok: true } }); }
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
  ok(await p.locator('#fixBox').count() === 1, '오답하기 상자');
  ok(await p.locator('#fixBox .rv').count() === 2, '오답하기 문항 2개(1·3번)');
  ok(await p.locator('#rv1 .choices button').count() === 5, '1번 5지 버튼');
  ok(await p.locator('#rv3 input.tans').count() === 1, '3번 단답 입력');
  ok(await p.locator('#rv1 textarea[data-f=ww]').count() === 1 && await p.locator('#rv1 textarea[data-f=wr]').count() === 1, '이유 칸 두 개');
  ok((await p.textContent('#rv1')).includes('내가 틀린 답(1)을 고른 이유'), '① 칸 이름에 틀린 답');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('hw_retry_v1')).length) === 1, '이 기기에 이어 하기 기록');
  ok((await p.textContent('#report .ess')).includes('내 서술'), '서술형 비교 그대로');
  if (SHOT) await p.screenshot({ path: SHOT + '/retry-1.png', fullPage: true });

  // 빈 칸이면 보내지 않음
  await p.click('#fixBtn1'); await p.waitForTimeout(200);
  ok(!DB.calls.some(c => c.fn === 'hwork_fix'), '빈 칸이면 재채점 안 보냄');
  // 1번: 4(틀림) → 회귀
  await p.fill('#rv1 textarea[data-f=ww]', '그냥 찍었다'); await p.click('#rv1 .choices button:nth-child(4)'); await p.fill('#rv1 textarea[data-f=wr]', '4번이 맞아 보였다');
  await p.click('#fixBtn1'); await p.waitForTimeout(500);
  const f1 = DB.calls.find(c => c.fn === 'hwork_fix');
  ok(f1 && f1.p.q === '1' && f1.p.pick === '4' && f1.p.why_wrong === '그냥 찍었다' && f1.p.why_right === '4번이 맞아 보였다' && f1.p.key.length === 32, 'hwork_fix 본문');
  ok((await p.textContent('#rv1 .rvh')).includes('지금 틀린 답 4'), '틀리면 새 틀린 답으로 회귀');
  ok((await p.inputValue('#rv1 textarea[data-f=ww]')) === '', '회귀하면 ① 칸 비움');
  ok((await p.textContent('#rv1')).includes('내가 틀린 답(4)을 고른 이유'), '① 칸 이름도 새 틀린 답');
  ok(await p.locator('#report .hide').count() === 2, '클리어 전엔 정답 가림');
  // 1번: 3(맞음) → 클리어
  await p.fill('#rv1 textarea[data-f=ww]', '4번 보기를 잘못 읽었다'); await p.click('#rv1 .choices button:nth-child(3)'); await p.fill('#rv1 textarea[data-f=wr]', '3번이 지문과 맞는다');
  await p.click('#fixBtn1'); await p.waitForTimeout(500);
  ok((await p.textContent('#rv1')).includes('클리어') && (await p.textContent('#rv1')).includes('정답 3'), '1번 클리어 · 정답 공개');
  ok(await p.locator('#report .hide').count() === 1 && await p.locator('#report .reveal').count() === 1, '표에 1번 정답만 공개');
  ok((await p.textContent('#fixBox h2')).includes('클리어 1 / 2'), '클리어 수');
  // 3번: 오류 신고 — 내용 없으면 안 보냄
  await p.click('#rv3 .flags button:has-text("문항 오류 신고")');
  ok(await p.isVisible('#rv3 .errbox'), '오류 신고 칸 열림');
  await p.click('#rv3 .errbox .sbtn'); await p.waitForTimeout(200);
  ok(!DB.calls.some(c => c.fn === 'hwork_flag'), '오류 내용 없으면 안 보냄');
  await p.fill('#rv3 textarea[data-f=err]', '보기 표현이 이상해요'); await p.click('#rv3 .errbox .sbtn'); await p.waitForTimeout(400);
  const fl = DB.calls.find(c => c.fn === 'hwork_flag');
  await p.waitForTimeout(300);
  const hr = REP.find(b => b.action === 'hworkReport');
  ok(hr && hr.code === 'T세트' && hr.qno === '3' && hr.text === '보기 표현이 이상해요' && hr.name === '박보검' && hr.school === '무원고등학교' && hr.mine === '가', '수정 요청함으로 hworkReport 보냄');
  ok(fl && fl.p.kind === 'error' && fl.p.text === '보기 표현이 이상해요' && fl.p.q === '3', 'hwork_flag 오류 신고 본문');
  ok((await p.textContent('#rv3')).includes('문항 오류 신고함') && (await p.textContent('#rv3')).includes('신고 내용: 보기 표현이 이상해요'), '신고 표시');
  if (SHOT) await p.screenshot({ path: SHOT + '/retry-2.png', fullPage: true });

  // 새로고침 → 이어 하기 (3번은 넘겨서 이미 끝 → 이어 하기 기록 없음)
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('hw_retry_v1') || '[]').length) === 0, '모두 클리어·넘김이면 이어 하기 기록 지움');
  ok((await p.textContent('#fixBox')).includes('오답하기를 마쳤습니다'), '끝 안내');
  ok(await p.locator('#rv3 textarea[data-f=ww]').count() === 1, '넘긴 뒤에도 계속 오답하기 가능');
  // 도움 요청
  await p.click('#rv3 .flags button:has-text("선생님 도와주세요")'); await p.waitForTimeout(400);
  ok(DB.calls.some(c => c.fn === 'hwork_flag' && c.p.kind === 'help' && c.p.q === '3'), '도움 요청 본문');
  ok(REP.length === 1, '도움 요청은 수정 요청함으로 안 보냄');
  ok((await p.textContent('#rv3')).includes('선생님 도움 요청함') && (await p.locator('#rv3 .flags button').count()) === 0, '도움 요청 표시·버튼 사라짐');
  // 이어 하기 — 저장 기록 강제로 넣고 다시 열기
  await p.evaluate(() => localStorage.setItem('hw_retry_v1', JSON.stringify([{ id: 41, key: 'abcdef0123456789abcdef0123456789', code: 'T세트', name: '박보검' }])));
  await p.reload(); await p.waitForTimeout(600);
  ok(await p.locator('#resume').isVisible(), '이어 하기 상자');
  await p.click('#resume .rsrow button'); await p.waitForTimeout(600);
  ok((await p.textContent('#rv1')).includes('클리어') && (await p.textContent('#rv3')).includes('도움 요청함'), '이어 하기 상태 복원');
  // 3번 계속 → 나 (맞음)
  await p.fill('#rv3 textarea[data-f=ww]', '앞 문장만 보고 골랐다.'); await p.fill('#rv3 input.tans', '나'); await p.fill('#rv3 textarea[data-f=wr]', '나가 맞다. 뒤 문장이 근거다.');
  await p.click('#fixBtn3'); await p.waitForTimeout(500);
  ok((await p.textContent('#rv3')).includes('클리어') && await p.locator('#report .hide').count() === 0, '3번 클리어 · 모든 정답 공개');
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
      retry_got: 1, retry_at: '2026-11-11 15:05', review_at: '2026-11-11 15:09', detail: R.detail, review: R.review },
    { id: 42, ts: '2026-11-11 15:10', teacher: '이수경', code: 'T세트', school: '무원고등학교', grade: '고2', name: '정해인', got: 1, total: 4, questions: {},
      retry_got: null, retry_at: null, review_at: null, detail: grade({ '1': '1', '3': '가', '4': 'O' }).detail, review: null } ];
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
  ok((await tp.textContent('#listBody')).includes('오답 2/2 ✓') && (await tp.textContent('#listBody')).includes('도움 1') && (await tp.textContent('#listBody')).includes('신고 1'), '교사 목록: 오답 2/2 ✓ · 도움 · 신고');
  ok((await tp.locator('#listBody tr:has-text("정해인") .rtag').count()) === 0, '오답하기 안 한 학생은 표시 없음');
  await tp.click('#listBody tr:has-text("박보검")'); await tp.waitForTimeout(500);
  let tr = await tp.textContent('#report');
  ok(tr.includes('틀린 2문항 중 2문항 클리어') && tr.includes('도움 요청 1') && tr.includes('오류 신고 1'), '교사 성적표: 요약 줄');
  ok((await tp.locator('#report table.detail th').allTextContents()).includes('오답하기'), '교사 성적표: 오답하기 열');
  ok(tr.includes('오답하기 기록') && tr.includes('그냥 찍었다') && tr.includes('4번 보기를 잘못 읽었다') && tr.includes('3번이 지문과 맞는다'), '교사 성적표: 시도 기록');
  ok(tr.includes('보기 표현이 이상해요') && tr.includes('선생님 도와주세요'), '교사 성적표: 신고·도움 내용');
  if (SHOT) await tp.screenshot({ path: SHOT + '/teacher-report.png', fullPage: true });
  await tp.click('#report .back button'); await tp.click('#listBody tr:has-text("정해인")'); await tp.waitForTimeout(500);
  ok((await tp.textContent('#report')).includes('아직 틀린 문항 3개를 오답하기 하지 않았습니다'), '교사 성적표: 아직 안 함');
  await tp.click('#report .back button');
  await tp.selectOption('#fCode', 'T세트'); await tp.waitForTimeout(200);
  await tp.click('#qbtn button'); await tp.waitForTimeout(600);
  const heads = await tp.locator('table.qrank th').allTextContents();
  ok(heads.includes('도움 요청') && heads.includes('오류 신고'), '문항 분석: 두 열');
  // 064 전 DB — 옛 열로 다시 읽는다
  oldDb = true;
  await tp.goto('http://localhost:' + PORT + '/hwork_teacher.html'); await tp.waitForTimeout(700);
  await tp.selectOption('#fTeacher', '이수경'); await tp.waitForTimeout(200);
  ok((await tp.locator('#listBody tr').count()) === 2 && (await tp.locator('#listBody .rtag').count()) === 0, '064 전 DB: 목록 그대로');
  await tp.click('#listBody tr:has-text("박보검")'); await tp.waitForTimeout(500);
  ok(!(await tp.textContent('#report')).includes('오답하기'), '064 전 DB: 성적표 옛 모양');

  console.log('통과', pass, '실패', fail); await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})();

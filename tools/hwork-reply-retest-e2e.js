// H WORK 도움 요청 답장 · 개인 리테스트 (2026-11-16, 리포트 마이그레이션 067) — 학생 화면(hwork.html)·교사 화면(hwork_teacher.html) E2E
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/hwork-reply-retest-e2e.js [캡처 폴더]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SHOT = process.argv[2] || '';
const PORT = 8772;
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(b); });
}).listen(PORT);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };
const json = (rt, o, st) => rt.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

/* ── 가짜 DB ── */
const KEY = { '1': { type: 'choice5', ans: '3' }, '2': { type: 'essay', ans: '예시' }, '3': { type: 'text', ans: '나' }, '4': { type: 'ox', ans: 'O' }, '5': { type: 'choice5', ans: '2' } };
const SUB = { id: 41, key: 'abcdef0123456789abcdef0123456789', teacher: '이수경', code: 'T세트', name: '박보검', school: '무원고등학교', grade: '고2', ts: '2026-11-15 20:00', got: 1, total: 4,
  detail: { '1': { type: 'choice5', mine: '1', ans: '3', ok: false }, '2': { type: 'essay', mine: 'x', ans: '예시', ok: null }, '3': { type: 'text', mine: '나', ans: '나', ok: true },
            '4': { type: 'ox', mine: 'X', ans: 'O', ok: false }, '5': { type: 'choice5', mine: '4', ans: '2', ok: false } },
  review: { '1': { tries: [], help: { at: '2026-11-15 20:05', text: '왜 3번인지 모르겠어요' } }, '4': { tries: [{ wrong: 'X', pick: 'O', ok: true }], cleared_at: '2026-11-15 20:06' } },
  reply: null, questions: {}, retry_at: null, review_at: null, away_n: 0, away_sec: 0 };
const SUB2 = { id: 42, teacher: '이수경', code: 'T세트', name: '박보검', school: '무원고등학교', grade: '고2', ts: '2026-11-16 09:00', got: 4, total: 4,
  detail: { '1': { ok: true }, '3': { ok: true }, '4': { ok: true }, '5': { ok: true } }, review: null, reply: null, questions: {} };
const SUB3 = { id: 43, teacher: '이수경', code: 'T세트', name: '정해인', school: '무원고등학교', grade: '고2', ts: '2026-11-15 21:00', got: 4, total: 4,
  detail: { '1': { ok: true }, '3': { ok: true }, '4': { ok: true }, '5': { ok: true } }, review: null, reply: null, questions: {} };
const SUB4 = { id: 44, teacher: '이수경', code: 'T세트', name: '김미등록', school: '무원고등학교', grade: '고2', ts: '2026-11-15 22:00', got: 3, total: 4,
  detail: { '1': { ok: false }, '3': { ok: true }, '4': { ok: true }, '5': { ok: true } }, review: null, reply: null, questions: {} };
const SUBS = [SUB, SUB2, SUB3, SUB4];
const STUS = [{ code: 'K1', name: '박보검', school: '무원고', grade: '2026 고등 2학년', enrolled: '재원', phone_student: '01011112222', phone_parent1: '010-3333-4444', phone_parent2: '01011112222' },
              { code: 'K2', name: '정해인', school: '무원고', grade: '2026 고등 2학년', enrolled: '재원', phone_student: '', phone_parent1: '01055556666', phone_parent2: '' }];
let RETESTS = [], POSTS = [], ALIM = [], CFG_READY = false, RT = null;
const hide = d => { const o = {}; for (const k in d) { o[k] = Object.assign({}, d[k]); if (d[k].ok === false) delete o[k].ans; } return o; };

function rpc(fn, p) {
  if (fn === 'hwork_reply') {
    if (!(SUB.review[p.q] || {}).help) return { ok: false, reason: 'no_help', error: '도움 요청 아님' };
    SUB.reply = SUB.reply || {};
    if (!p.text) { delete SUB.reply[p.q]; return { ok: true, q: p.q, removed: true }; }
    SUB.reply[p.q] = { text: p.text, by: p.by, at: '2026-11-16 15:10' };
    POSTS.push({ fn, p });
    return { ok: true, q: p.q, reply: SUB.reply[p.q], removed: false };
  }
  if (fn === 'hwork_retry_state') {
    if (p.id !== SUB.id || p.key !== SUB.key) return { ok: false, error: '제출 기록을 찾을 수 없습니다.' };
    return { ok: true, stage: 'done', teacher: SUB.teacher, code: SUB.code, name: SUB.name, got: SUB.got, total: SUB.total,
      detail: hide(SUB.detail), review: SUB.review, answers: { '4': 'O' }, reply: SUB.reply || {} };
  }
  if (fn === 'hwork_open_mine') { POSTS.push({ fn, p }); return p.key === 'K1' ? { ok: true, id: SUB.id, key: SUB.key } : { ok: false, reason: 'none' }; }
  if (fn === 'hwork_retest_open') {
    if (!RT || p.key !== 'K1' || p.id !== RT.id) return { ok: false, error: '리테스트를 찾을 수 없습니다.' };
    const items = {}; RT.qs.forEach(q => items[q] = { type: KEY[q].type });
    return { ok: true, id: RT.id, teacher: RT.teacher, code: RT.code, name: RT.name, qs: RT.qs, items, submitted: !!RT.submitted_at,
      submitted_at: RT.submitted_at, got: RT.got, total: RT.total, detail: RT.detail ? hide(RT.detail) : null };
  }
  if (fn === 'hwork_retest_submit') {
    POSTS.push({ fn, p });
    if (RT.submitted_at) return { ok: false, reason: 'done', got: RT.got, total: RT.total, detail: hide(RT.detail) };
    const d = {}; let got = 0;
    RT.qs.forEach(q => { const mine = String((p.answers || {})[q] || ''); const okv = mine === KEY[q].ans; if (okv) got++; d[q] = { type: KEY[q].type, mine, ans: KEY[q].ans, ok: okv }; });
    Object.assign(RT, { detail: d, got, total: RT.qs.length, submitted_at: '2026-11-16 16:00' });
    return { ok: true, got, total: RT.qs.length, submitted_at: RT.submitted_at, detail: hide(d) };
  }
  if (fn === 'hwork_list') return { ok: true, list: [{ teacher: '이수경', code: 'T세트', due: '', closed: false }] };
  return { ok: false };
}
function pick(o, sel) { if (!sel) return o; const cols = sel.split(','); const r = {}; cols.forEach(c => r[c] = o[c] === undefined ? null : o[c]); return r; }

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('**/*', async rt => {
    const req = rt.request(), u = req.url();
    if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    const m = /\/rest\/v1\/rpc\/(\w+)/.exec(u);
    if (m) { const body = JSON.parse(req.postData() || '{}'); return json(rt, rpc(m[1], body.p || {})); }
    if (u.includes('/auth/v1/token')) return json(rt, { access_token: 'tok', expires_in: 3600 });
    const U = new URL(u), sel = U.searchParams.get('select');
    if (u.includes('/rest/v1/hwork_submissions')) {
      let rows = SUBS.slice();
      const id = U.searchParams.get('id'), code = U.searchParams.get('code');
      if (id) rows = rows.filter(r => 'eq.' + r.id === id);
      if (code) rows = rows.filter(r => 'eq.' + r.code === code);
      if (U.searchParams.get('order') === 'id.desc') rows.reverse();
      if (U.searchParams.get('offset') && +U.searchParams.get('offset') > 0) rows = [];
      return json(rt, rows.map(r => pick(r, sel)));
    }
    if (u.includes('/rest/v1/students')) return json(rt, U.searchParams.get('offset') > 0 ? [] : STUS);
    if (u.includes('/rest/v1/hwork_retests')) {
      if (req.method() === 'POST') { const rows = JSON.parse(req.postData()); POSTS.push({ fn: 'retests', rows, url: u, prefer: req.headers()['prefer'] });
        rows.forEach((r, i) => RETESTS.push(Object.assign({ id: 90 + RETESTS.length, submitted_at: null, created_at: 'x' }, r))); return rt.fulfill({ status: 201, body: '' }); }
      if (req.method() === 'DELETE') { POSTS.push({ fn: 'del', url: u }); const id = +(/id=eq\.(\d+)/.exec(u) || [])[1]; RETESTS = RETESTS.filter(r => r.id !== id); return rt.fulfill({ status: 204, body: '' }); }
      return json(rt, RETESTS);
    }
    if (u.includes('script.google.com')) {
      if (req.method() === 'POST') { const bd = JSON.parse(req.postData() || '{}'); ALIM.push(bd);
        return json(rt, { result: 'success', okCount: bd.items.length, sent: bd.items.map(it => ({ student: it.student, who: it.who, ok: true })) }); }
      if (u.includes('alimConfig')) return json(rt, { result: 'success', templates: { notice_hwreply: { ready: CFG_READY } } });
      return json(rt, { ok: true });
    }
    if (u.endsWith('teacher-name.js')) return rt.fulfill({ body: 'window.shuegukTeacherName=function(){return Promise.resolve("김현지")};', contentType: 'text/javascript' });
    if (u.endsWith('.js')) return rt.fulfill({ body: '', contentType: 'text/javascript' });
    return json(rt, { ok: true, list: [] });
  });

  /* ── ① 교사: 도움 요청 답장 ── */
  const tp = await ctx.newPage(); let terr = 0; tp.on('pageerror', e => { terr++; console.log('pageerror', e.message); });
  const dlg = []; tp.on('dialog', d => { dlg.push(d.message()); d.accept(); });
  await tp.goto('http://localhost:' + PORT + '/hwork_teacher.html'); await tp.waitForTimeout(700);
  await tp.selectOption('#fTeacher', '이수경'); await tp.waitForTimeout(200);
  let row = await tp.textContent('#listBody tr:last-child');
  ok(/도움 1/.test(row) && !/답장함/.test(row), '목록: 도움 1 (답장 전)');
  await tp.check('#fHelp'); await tp.waitForTimeout(150);
  ok(await tp.locator('#listBody tr').count() === 1, '답장 안 한 도움 요청만 = 1건');
  await tp.click('#listBody tr'); await tp.waitForTimeout(600);
  ok(await tp.locator('#rpT1').count() === 1 && await tp.locator('#rpT4').count() === 0, '도움 요청 문항(1번)에만 답장 칸');
  ok(await tp.isDisabled('#rpA1'), '저장 전 알림톡 잠김');
  await tp.click('#rpS1'); await tp.waitForTimeout(200);
  ok(!POSTS.some(x => x.fn === 'hwork_reply'), '빈 답장은 보내지 않음');
  await tp.fill('#rpT1', '지문 둘째 문단의 근거를 다시 찾아보세요.'); await tp.click('#rpS1'); await tp.waitForTimeout(500);
  const rp = POSTS.find(x => x.fn === 'hwork_reply');
  ok(rp && rp.p.id === 41 && rp.p.q === '1' && rp.p.by === '김현지' && /둘째 문단/.test(rp.p.text), 'hwork_reply 본문(id·q·by)');
  ok(/김현지 · 2026-11-16 15:10 저장/.test(await tp.textContent('#rpM1')), '저장 표시');
  ok(await tp.isDisabled('#rpA1'), '템플릿 준비 전이면 알림톡 잠김');
  if (SHOT) await tp.screenshot({ path: SHOT + '/reply-teacher.png', fullPage: true });
  // 템플릿 준비됨 → 알림톡
  CFG_READY = true;
  await tp.reload(); await tp.waitForTimeout(700);
  await tp.selectOption('#fTeacher', '이수경'); await tp.waitForTimeout(200);
  row = await tp.textContent('#listBody tr:last-child');
  ok(/도움 1 · 답장함/.test(row), '목록: 답장함');
  await tp.check('#fHelp'); await tp.waitForTimeout(150);
  ok(await tp.locator('#listBody tr').count() === 0 || /조건에 맞는/.test(await tp.textContent('#empty')), '답장하면 거르기에서 빠짐');
  await tp.uncheck('#fHelp'); await tp.waitForTimeout(150);
  await tp.click('#listBody tr:last-child'); await tp.waitForTimeout(900);
  ok(!(await tp.isDisabled('#rpA1')), '준비되면 알림톡 버튼 열림');
  await tp.click('#rpA1'); await tp.waitForTimeout(700);
  const al = ALIM[0];
  ok(dlg.some(m => /H WORK 질문 답변 안내/.test(m) && /학생 010-1111-2222/.test(m) && /학부모님1 010-3333-4444/.test(m)), '확인 창: 받는 분');
  ok(al && al.action === 'alimSend' && al.kind === 'notice_hwreply' && al.pw === 'sh' && al.by === '김현지', 'alimSend 종류·pw·by');
  ok(al && al.items.length === 2 && al.items.every(i => i.vars['제목'] === 'T세트' && i.vars['접근코드'] === 'K1' && /^N:\d{4}-\d\d-\d\d\|T세트$/.test(i.date)), '같은 번호는 한 통 · 변수·중복 키');
  ok(/알림톡 2건 보냄/.test(await tp.textContent('#rpM1')), '보낸 결과 표시');
  // 지우기
  await tp.fill('#rpT1', ''); await tp.click('#rpS1'); await tp.waitForTimeout(500);
  ok(!SUB.reply || !SUB.reply['1'], '빈 글로 저장 = 답장 지움(확인 창 뒤)');
  await tp.fill('#rpT1', '지문 둘째 문단의 근거를 다시 찾아보세요.'); await tp.click('#rpS1'); await tp.waitForTimeout(500);

  /* ── ② 교사: 리테스트 만들기 ── */
  await tp.click('#report .back button'); await tp.waitForTimeout(200);
  await tp.selectOption('#fCode', 'T세트'); await tp.waitForTimeout(200);
  ok(await tp.isVisible('#rtbtn'), '제목을 고르면 리테스트 버튼');
  await tp.click('#rtbtn button'); await tp.waitForTimeout(700);
  let rtt = await tp.textContent('#rtbody');
  ok(/박보검[\s\S]*3문항 · 1, 4, 5번/.test(rtt), '박보검: 처음 제출(id 41)의 틀린 문항 1·4·5 (서술 제외, 두 번째 제출 무시)');
  ok(/처음부터 모두 맞힘/.test(rtt) && /재원 명단·접근코드 없음/.test(rtt), '모두 맞힘·명단 없음은 만들지 않음');
  ok((await tp.textContent('#rtGo')).includes('1명'), '만들 학생 1명');
  if (SHOT) await tp.screenshot({ path: SHOT + '/retest-teacher.png', fullPage: true });
  await tp.click('#rtGo'); await tp.waitForTimeout(700);
  const mk = POSTS.find(x => x.fn === 'retests');
  ok(mk && mk.rows.length === 1 && mk.rows[0].src_id === 41 && mk.rows[0].stu_code === 'K1' && JSON.stringify(mk.rows[0].qs) === '["1","4","5"]' && mk.rows[0].created_by === '김현지', 'hwork_retests 넣기 본문');
  ok(mk && /on_conflict=src_id/.test(mk.url) && /ignore-duplicates/.test(mk.prefer), '두 번 눌러도 하나(on_conflict)');
  rtt = await tp.textContent('#rtbody');
  ok(/아직 안 풂/.test(rtt) && /이미 만든 리테스트 1명/.test(rtt), '만든 뒤 상태');
  RT = RETESTS[0];
  ok(terr === 0, '교사 화면 오류 없음');

  /* ── ③ 학생: 오답하기 화면의 선생님 답장 · 다른 기기에서 이어 하기 ── */
  const p = await ctx.newPage(); let perr = 0; p.on('pageerror', e => { perr++; console.log('pageerror', e.message); });
  p.on('dialog', d => d.accept());
  await p.goto('http://localhost:' + PORT + '/hwork.html?c=T%EC%84%B8%ED%8A%B8&t=%EC%9D%B4%EC%88%98%EA%B2%BD&nm=%EB%B0%95%EB%B3%B4%EA%B2%80&sc=%EB%AC%B4%EC%9B%90%EA%B3%A0&gr=%EA%B3%A02&done=1&k=K1');
  await p.waitForTimeout(900);
  const om = POSTS.find(x => x.fn === 'hwork_open_mine');
  ok(om && om.p.key === 'K1' && om.p.code === 'T세트' && om.p.teacher === '이수경', '이 기기 기록 없음 → 접근코드로 hwork_open_mine');
  ok(await p.isVisible('#report'), '오답하기 화면으로 이어 열림');
  const rv1 = await p.textContent('#rv1');
  ok(/선생님 답장 · 김현지 선생님/.test(rv1) && /둘째 문단/.test(rv1), '1번 카드에 선생님 답장');
  ok(!/선생님 답장/.test(await p.textContent('#rv5')), '답장 없는 문항엔 없음');
  if (SHOT) await p.screenshot({ path: SHOT + '/reply-student.png', fullPage: true });
  // 접근코드가 없거나 남의 것이면 종전 안내
  const p3 = await ctx.newPage();
  await p3.goto('http://localhost:' + PORT + '/hwork.html?c=T%EC%84%B8%ED%8A%B8&t=%EC%9D%B4%EC%88%98%EA%B2%BD&nm=x&done=1&k=ZZ'); await p3.waitForTimeout(800);
  ok(/이미 제출한 과제입니다/.test(await p3.textContent('#topErr')), '못 찾으면 종전 안내');

  /* ── ④ 학생: 리테스트 ── */
  const q = await ctx.newPage(); q.on('pageerror', e => { perr++; console.log('pageerror', e.message); }); q.on('dialog', d => d.accept());
  await q.goto('http://localhost:' + PORT + '/hwork.html?rt=' + RT.id + '&k=K1'); await q.waitForTimeout(700);
  ok(!(await q.isVisible('#main')) && await q.isVisible('#report'), '리테스트 화면만');
  ok(await q.locator('.rtq').count() === 3, '문항 3개(1·4·5)');
  const types = await q.$$eval('.rtq .qt', a => a.map(e => e.textContent));
  ok(types[0] === '1번 · 5지선다' && types[1] === '4번 · OX', '문항 번호·종류');
  await q.click('.rtq:nth-child(3) .choices button:nth-child(3)');
  await q.click('.rtq:nth-child(4) .ox button:nth-child(1)');
  await q.click('.rtq:nth-child(5) .choices button:nth-child(4)');
  if (SHOT) await q.screenshot({ path: SHOT + '/retest-student.png', fullPage: true });
  await q.click('#rtGo'); await q.waitForTimeout(600);
  const sb = POSTS.find(x => x.fn === 'hwork_retest_submit');
  ok(sb && sb.p.key === 'K1' && JSON.stringify(sb.p.answers) === '{"1":"3","4":"O","5":"4"}', 'hwork_retest_submit 본문');
  const res = await q.textContent('#report');
  ok(/2 \/ 3/.test(res) && /또 틀린 1문항\(5번\)/.test(res), '결과 2/3 · 또 틀린 문항');
  ok(/수업 시간에 확인해요/.test(res) && !/>2</.test(await q.innerHTML('#report table.detail tr:last-child')), '또 틀린 문항 정답은 감춤');
  if (SHOT) await q.screenshot({ path: SHOT + '/retest-result.png', fullPage: true });
  await q.reload(); await q.waitForTimeout(700);
  ok(/2 \/ 3/.test(await q.textContent('#report')) && await q.locator('#rtGo').count() === 0, '다시 열면 결과(다시 못 냄)');
  const q2 = await ctx.newPage(); await q2.goto('http://localhost:' + PORT + '/hwork.html?rt=' + RT.id + '&k=K2'); await q2.waitForTimeout(600);
  ok(/리테스트를 찾을 수 없습니다/.test(await q2.textContent('#report')), '남의 리테스트는 안 열림');
  const q3 = await ctx.newPage(); await q3.goto('http://localhost:' + PORT + '/hwork.html?rt=' + RT.id); await q3.waitForTimeout(400);
  ok(/학생 페이지의 H WORK 메뉴에서/.test(await q3.textContent('#report')), '접근코드 없으면 안내');
  ok(perr === 0, '학생 화면 오류 없음');

  /* ── ⑤ 교사: 푼 리테스트 결과 ── */
  await tp.click('#rtbtn button'); await tp.waitForTimeout(700);
  rtt = await tp.textContent('#rtbody');
  ok(/리테스트 2 \/ 3/.test(rtt) && /또 틀림 5번/.test(rtt) && /푼 학생 1명/.test(rtt), '교사 화면에 리테스트 결과');

  console.log('통과 ' + pass + ' 실패 ' + fail);
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})();

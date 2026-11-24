// 채점·질문 확인 — 과제가 남은 친구에게 독려 알림톡 (hw-remind.js) E2E
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/hw-remind-e2e.js [캡처 폴더]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SHOT = process.argv[2] || '', PORT = 8779;
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); r.end(b); });
}).listen(PORT);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };

const ASG = [
  { seq: 1, item: '이수경 / 단어 형성 1권(기본·실력) 01 형태소 · 기본', type: '학년', target: '고2', due: '' },
  { seq: 2, item: '이수경 / 단어 형성 1권(기본·실력) 02 파생어 · 기본', type: '일부', target: '박보검|무원고|2026고등2학년, 정해인', due: '' },
  { seq: 3, item: '이수경 / 지난 과제', type: '전체', target: '', due: '2026-01-01' },        // 마감 지남 → 빼기
  { seq: 4, item: '김지원 / 다른 선생님 과제', type: '전체', target: '', due: '' } ];        // 다른 선생님 → 빼기
const STU = [
  { name: '박보검', school: '무원고', grade: '2026 고등 2학년', enrolled: '재원', code: 'K1', phone_student: '01011112222', phone_parent1: '01099990000' },
  { name: '정해인', school: '무원고', grade: '2026 고등 2학년', enrolled: '', code: 'K2', phone_student: '01033334444', phone_parent1: '01099990000' },
  { name: '김하늘', school: '화정고', grade: '2026 고등 2학년', enrolled: '', code: 'K3', phone_student: '', phone_parent1: '01055556666' },
  { name: '이퇴원', school: '화정고', grade: '2026 고등 2학년', enrolled: '퇴원', code: 'K4', phone_student: '01077778888' } ];
const SUB = [   // 박보검: 01 냄(오답하기 끝) · 02 냄(오답 2 중 1 클리어 → 1 남음) / 정해인: 01 냄(만점) · 02 안 냄 / 김하늘: 01 안 냄
  { id: 1, ts: '2026-11-20 15:00', teacher: '이수경', code: '단어 형성 1권(기본·실력) 01 형태소 · 기본', school: '무원고등학교', grade: '고2', name: '박보검', got: 3, total: 5, review: { '2': { cleared_at: 'x' }, '4': { help: {} } }, review_at: '2026-11-20 16:00', check_done: null, questions: {} },
  { id: 2, ts: '2026-11-21 15:00', teacher: '이수경', code: '단어 형성 1권(기본·실력) 02 파생어 · 기본', school: '무원고등학교', grade: '고2', name: '박보검', got: 3, total: 5, review: { '1': { cleared_at: 'x' } }, review_at: null, check_done: null, questions: {} },
  { id: 3, ts: '2026-11-21 15:00', teacher: '이수경', code: '단어 형성 1권(기본·실력) 01 형태소 · 기본', school: '무원고', grade: '고2', name: '정해인', got: 5, total: 5, review: null, review_at: null, check_done: null, questions: {} } ];
const POSTS = [];
let ready = true;

(async () => {
  const b = await chromium.launch();
  const tp = await b.newPage({ viewport: { width: 1100, height: 900 } });
  let perr = 0; tp.on('pageerror', e => { perr++; console.log('pageerror', e.message); });
  await tp.addInitScript(() => { try { localStorage.setItem('shueguk_teacher_session_v2', JSON.stringify({ access_token: 'T', refresh_token: 'R', expires_at: Math.floor(Date.now() / 1000) + 3600 })); } catch (e) {} });
  await tp.route('**/*', async rt => {
    const u = rt.request().url(), m = rt.request().method();
    if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    const q = new URL(u).searchParams, first = !q.get('offset') || q.get('offset') === '0';
    const pick = rows => { const cols = (q.get('select') || '').split(','); return rows.map(r => { const o = {}; cols.forEach(c => o[c] = r[c] === undefined ? null : r[c]); return o; }); };
    if (u.includes('/rest/v1/assignments')) return rt.fulfill({ json: first ? ASG : [] });
    if (u.includes('/rest/v1/students')) return rt.fulfill({ json: first ? STU : [] });
    if (u.includes('/rest/v1/hwork_submissions')) return rt.fulfill({ json: first ? pick(SUB) : [] });
    if (u.includes('/rest/v1/teacher_accounts')) return rt.fulfill({ json: [{ display_name: '이수경' }] });
    if (u.includes('/rest/v1/')) return rt.fulfill({ json: [] });
    if (u.includes('script.google.com')) {
      if (m === 'GET') return rt.fulfill({ json: { result: 'success', ready: true, templates: { hwork_todo: { ready } } } });
      const body = JSON.parse(rt.request().postData() || '{}'); POSTS.push(body);
      return rt.fulfill({ json: { result: 'success', sent: (body.items || []).map(() => ({ ok: true })) } });
    }
    if (u.endsWith('.js')) return rt.fulfill({ body: 'window.shuegukTeacherName=function(){return Promise.resolve("이수경")};', contentType: 'text/javascript' });
    return rt.fulfill({ json: { ok: true, list: [] } });
  });
  tp.on('dialog', d => d.accept());
  await tp.goto('http://localhost:' + PORT + '/hwork_teacher.html?t=' + encodeURIComponent('이수경')); await tp.waitForTimeout(800);
  ok(await tp.locator('.hrmbtn').count() === 1, '목록 위에 [과제가 남은 친구에게 알림톡] 버튼');
  await tp.click('.hrmbtn'); await tp.waitForTimeout(800);
  const names = await tp.$$eval('#hrmBg .it .nm', a => a.map(x => x.textContent));
  ok(names.join(',') === '박보검,정해인,김하늘', '남은 과제가 있는 재원생만 (퇴원·다 한 친구 빠짐): ' + names.join(','));
  const txt = await tp.textContent('#hrmBg .lst');
  ok(/박보검[\s\S]*오답하기 남음[\s\S]*02 파생어 · 기본 \(1문항\)/.test(txt), '박보검 = 02 오답하기 1문항 남음 (클리어·질문 넘김 뺌)');
  ok(!/01 형태소 · 기본 \(/.test(txt.split('정해인')[0].split('박보검')[1] || ''), '오답하기를 끝낸 과제는 남은 과제가 아님');
  ok(/정해인[\s\S]*안 냄 1[\s\S]*02 파생어/.test(txt), '정해인 = 02 안 냄');
  ok(!/지난 과제|다른 선생님/.test(txt), '마감 지난 과제·다른 선생님 과제는 빠짐');
  ok((await tp.textContent('#hrmSum')).includes('친구 3명 · 알림톡 2건'), '김하늘은 학생 연락처가 없어 2건');
  ok((await tp.textContent('#hrmBg .note')).includes('연락처가 없어 못 보내는 친구 1명: 김하늘'), '연락처 없음 안내');
  ok((await tp.textContent('#hrmBg .pv')).includes('▶ 단어 형성 1권(기본·실력) 02 파생어 · 기본'), '미리보기 = 승인 문구 + 과제');
  // 받는 분에 학부모님1 → 같은 번호(박보검·정해인 학부모) 한 통만
  await tp.click('#hrmBg [data-w="학부모1"]'); await tp.waitForTimeout(150);
  ok((await tp.textContent('#hrmSum')).includes('알림톡 4건') && (await tp.textContent('#hrmBg .note')).includes('같은 번호라 한 통만'), '학부모님1 더하면 같은 번호는 한 통');
  await tp.click('#hrmBg [data-w="학부모1"]'); await tp.waitForTimeout(150);
  // 종류: 오답하기만 → 박보검 한 명
  await tp.click('#hrmBg [data-k="todo"]'); await tp.waitForTimeout(150);
  ok((await tp.$$eval('#hrmBg .it .nm', a => a.map(x => x.textContent))).join(',') === '박보검', '[오답하기가 남은 과제]만 고르면 박보검만');
  await tp.click('#hrmBg [data-k="todo"]'); await tp.waitForTimeout(150);
  // 한 명 빼기
  await tp.click('#hrmBg .it[data-s^="김하늘"]'); await tp.waitForTimeout(150);
  ok((await tp.textContent('#hrmSum')).includes('친구 2명'), '줄을 누르면 그 친구를 뺌');
  if (SHOT) await tp.screenshot({ path: path.join(SHOT, 'hw-remind.png'), fullPage: true });
  await tp.click('#hrmSend'); await tp.waitForTimeout(800);
  const pst = POSTS.find(x => x.action === 'alimSend');
  ok(pst && pst.kind === 'hwork_todo' && pst.by === '이수경' && pst.items.length === 2, 'alimSend 본문 — 종류 hwork_todo · 보낸 사람 · 2건');
  const ib = pst && pst.items.find(i => i.student === '박보검');
  ok(ib && ib.to === '01011112222' && ib.who === '학생' && /^R:이수경\|\d{4}-\d{2}-\d{2}$/.test(ib.date) && ib.vars['과제'] === '단어 형성 1권(기본·실력) 02 파생어 · 기본' && ib.vars['접근코드'] === 'K1' && ib.vars['학생명'] === '박보검', '항목 — 번호·받는 분·하루 한 번 키·과제·접근코드');
  const ij = pst && pst.items.find(i => i.student === '정해인');
  ok(ij && ij.vars['과제'] === '단어 형성 1권(기본·실력) 02 파생어 · 기본', '정해인 과제 변수');
  // 템플릿 준비 전이면 보내기 잠김
  ready = false;
  await tp.reload(); await tp.waitForTimeout(800); await tp.click('.hrmbtn'); await tp.waitForTimeout(900);
  ok(await tp.isDisabled('#hrmSend') && (await tp.textContent('#hrmBg .note')).includes('준비되지 않아'), '템플릿 준비 전이면 잠금 + 안내');
  ok(perr === 0, '페이지 오류 없음');
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})();

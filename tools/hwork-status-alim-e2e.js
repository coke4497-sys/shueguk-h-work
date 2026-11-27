// H WORK 제출 현황(hwork_status.html) — 미제출·오답하기 중 한꺼번에 알림톡 (2026-11-25) E2E
// LC_ALL=C.UTF-8 NODE_PATH=$(npm root -g) node tools/hwork-status-alim-e2e.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = 8791;
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(b); }); }).listen(PORT);
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'OK ' : 'FAIL ') + m); };
const ASG = [
  { seq: 2, date: '2026-11-19', item: '이수경 / A세트', type: '일부', target: '가나, 다라, 마바', due: '2026-11-27', memo: '' },
  { seq: 3, date: '2026-11-19', item: '이수경 / B세트', type: '일부', target: '가나, 다라', due: '2026-11-27', memo: '' },
  { seq: 4, date: '2026-11-19', item: '김현지 / C세트', type: '일부', target: '사아, 자차', due: '2026-11-27', memo: '' }];
const SUBS = [
  { id: 1, teacher: '이수경', code: 'A세트', name: '가나', school: '화정고', grade: '고2', got: 3, total: 5, ts: '2026-11-20', review_at: null },
  { id: 2, teacher: '이수경', code: 'A세트', name: '다라', school: '화정고', grade: '고2', got: 5, total: 5, ts: '2026-11-20', review_at: null },
  { id: 3, teacher: '이수경', code: 'B세트', name: '가나', school: '화정고', grade: '고2', got: 2, total: 5, ts: '2026-11-21', review_at: '2026-11-21 10:00' },
  // 답장 필요만 남은 학생 — 틀린 2문항 중 1문항 클리어, 남은 1문항은 질문 뒤 답장 기다림 → 알림톡에서 빼기
  { id: 4, teacher: '김현지', code: 'C세트', name: '자차', school: '서정고', grade: '고1', got: 3, total: 5, ts: '2026-11-22', review_at: null, review: { 2: { cleared_at: '2026-11-22 10:00' } } }];
const QA = [{ id: 1, sub_id: 4, q: 4, who: '학생', at: '2026-11-22T02:00:00Z' }];
const STU = [
  { name: '가나', school: '화정고', grade: '2026 고등 2학년', enrolled: '재원', code: 'K1', phone_student: '010-1000-0001', phone_parent1: '010-2000-0001' },
  { name: '다라', school: '화정고', grade: '2026 고등 2학년', enrolled: '재원', code: 'K2', phone_student: '010-1000-0002', phone_parent1: '010-2000-0002' },
  { name: '마바', school: '화정고', grade: '2026 고등 2학년', enrolled: '재원', code: 'K3', phone_student: '', phone_parent1: '010-2000-0003' },
  { name: '사아', school: '서정고', grade: '2026 고등 1학년', enrolled: '재원', code: 'K4', phone_student: '010-1000-0004', phone_parent1: '' },
  { name: '자차', school: '서정고', grade: '2026 고등 1학년', enrolled: '재원', code: 'K5', phone_student: '010-1000-0005', phone_parent1: '' }];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('ERR', e.message); });
  await p.addInitScript(() => { try { localStorage.setItem('shueguk_teacher_session_v2', JSON.stringify({ access_token: 'T', refresh_token: 'R', expires_at: Math.floor(Date.now() / 1000) + 3600 })); } catch (e) {} });
  const POST = [];
  await p.route('**/*', rt => {
    const u = rt.request().url();
    if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    const off = (new URL(u).searchParams.get('offset') || '0') !== '0';
    if (u.includes('/rest/v1/assignments')) return rt.fulfill({ json: off ? [] : ASG });
    if (u.includes('/rest/v1/hwork_submissions')) return rt.fulfill({ json: off ? [] : SUBS });
    if (u.includes('/rest/v1/hwork_qa')) return rt.fulfill({ json: off ? [] : QA });
    if (u.includes('/rest/v1/students')) return rt.fulfill({ json: off ? [] : STU });
    if (u.includes('alimConfig')) return rt.fulfill({ json: { result: 'success', ready: true, templates: { hwork_todo: { ready: true, text: '#{학생명} 학생\n▶ #{과제}' } } } });
    if (u.includes('script.google.com') && rt.request().method() === 'POST') { const bd = JSON.parse(rt.request().postData()); POST.push(bd); return rt.fulfill({ json: { result: 'success', sent: bd.items.map(x => ({ ok: true, student: x.student, dup: x.student === '다라' })) } }); }
    if (u.includes('teacher-name.js')) return rt.fulfill({ body: 'window.shuegukTeacherName=()=>Promise.resolve("이수경");', contentType: 'text/javascript' });
    if (u.endsWith('.js') || u.includes('.js?')) return rt.fulfill({ body: '', contentType: 'text/javascript' });
    return rt.fulfill({ json: [] });
  });
  await p.goto('http://localhost:' + PORT + '/hwork_status.html'); await p.waitForSelector('#list .row'); await p.waitForTimeout(200);
  ok(await p.locator('#alimAll').count() === 1, '위 줄에 [미제출·오답 중 알림톡]');
  ok((await p.textContent('#list .row .wkp')) === '3주차' && (await p.$$eval('#fWeek option', o => o.map(x => x.textContent))).join().replace(/,이번 주\(\d+주차\) 빼고/,'') === '모든 주차,3주차', '과제 이름 앞 3주차 · 주차 거르기 (2026-11-26)');
  await p.click('#alimAll'); await p.waitForSelector('#hwa .go'); await p.waitForTimeout(100);
  let t = await p.textContent('#hwa');
  // A세트: 가나 오답 중, 다라 만점(제외), 마바 미제출 / B세트: 가나 오답 끝냄(제외), 다라 미제출 / C세트: 사아 미제출
  ok(t.includes('미제출 3명') && t.includes('오답하기 중 1명'), '전체 — 미제출 3명(마바·다라·사아) · 오답하기 중 1명(가나) ' + t.slice(0, 0));
  ok(t.includes('고른 받는 분의 연락처가 없어요') && (await p.textContent('#hwa .sum')).includes('학생 3명'), '학생 번호 없는 마바는 잠김 · 3명');
  await p.click('#hwa label.ck:has-text("학부모님1") input'); await p.waitForTimeout(80);
  ok((await p.textContent('#hwa .sum')).includes('학생 4명') && (await p.textContent('#hwa .sum')).includes('6통'), '학부모님1을 더하면 마바도 · 4명 6통(사아는 학부모님 번호 없음)');
  // 체크를 풀어도 목록 스크롤이 맨 위로 가지 않음 (2026-11-27 원장님)
  await p.addStyleTag({ content: '#hwa .list{max-height:60px!important;overflow:auto!important}' });
  await p.evaluate(() => { document.querySelector('#hwa .list').scrollTop = 40; });
  const sc0 = await p.evaluate(() => document.querySelector('#hwa .list').scrollTop);
  await p.evaluate(() => { const c = [...document.querySelectorAll('#hwa .list input[data-i]:not([disabled])')].pop(); c.click(); });
  await p.waitForTimeout(80);
  const sc1 = await p.evaluate(() => document.querySelector('#hwa .list').scrollTop);
  ok(sc0 > 0 && sc1 === sc0, '체크를 풀어도 목록 스크롤 자리 그대로 (' + sc0 + ' → ' + sc1 + ')');
  await p.evaluate(() => { const c = [...document.querySelectorAll('#hwa .list input[data-i]:not([disabled])')].pop(); c.click(); });
  await p.waitForTimeout(80);
  await p.click('#hwa .pill[data-kind="ing"]'); await p.waitForTimeout(80);
  ok((await p.textContent('#hwa .sum')).includes('학생 3명'), '오답하기 중을 끄면 가나가 빠짐 → 3명');
  await p.click('#hwa .pill[data-kind="ing"]'); await p.waitForTimeout(80);
  p.once('dialog', d => d.accept());
  await p.click('#hwa .go'); await p.waitForTimeout(500);
  const its = POST[0] && POST[0].items || [];
  const gana = its.find(x => x.student === '가나' && x.who === '학생');
  ok(POST[0] && POST[0].kind === 'hwork_todo' && POST[0].by === '이수경' && its.length === 6, 'hwork_todo · 보낸 사람 · 6통');
  ok(gana && gana.vars.과제 === 'A세트', '가나 — 오답 중 A세트 하나 ' + JSON.stringify(gana && gana.vars));
  const dara = its.find(x => x.student === '다라' && x.who === '학생');
  ok(dara && dara.vars.과제 === 'B세트', '다라 — 만점 A세트는 빼고 미제출 B세트만');
  ok((await p.textContent('#hwaMsg')).includes('오늘 이미 보낸'), '오늘 이미 보낸 통은 건너뛰었다고 알림');
  await p.click('#hwa [data-x]');
  // 한 과제만
  await p.click('#list .rhead >> nth=0'); await p.waitForTimeout(100);
  ok(await p.locator('[data-aw]').count() === 1, '과제를 펼치면 [이 과제 미제출·오답 중 학생에게 알림톡]');
  await p.click('[data-aw]'); await p.waitForSelector('#hwa .go');
  t = await p.textContent('#hwa');
  ok(t.includes('A세트') && t.includes('미제출 1명') && t.includes('오답하기 중 1명') && !t.includes('사아'), '한 과제 창 — A세트의 마바(미제출)·가나(오답 중)만');
  // 학년 거르기
  await p.click('#hwa [data-x]');
  await p.selectOption('#fGrade', '고1'); await p.waitForTimeout(100);
  await p.click('#alimAll'); await p.waitForSelector('#hwa .go');
  t = await p.textContent('#hwa');
  ok(t.includes('사아') && !t.includes('가나'), '학년 거르기(고1) — 사아만');
  ok(!t.includes('자차'), '답장 기다리는 질문만 남은 자차는 빠짐');
  // 학생별 · 수행률 낮은 순 (2026-11-27 원장님)
  await p.click('#hwa [data-x]');
  await p.selectOption('#fGrade', ''); await p.click('#views [data-v="stu"]'); await p.waitForTimeout(100);
  ok(await p.isVisible('#fSort'), '학생별 보기에 순서 고르기');
  await p.selectOption('#fSort', 'rate'); await p.waitForTimeout(100);
  const names = await p.$$eval('#list .rhead .rt b', x => x.map(e => e.textContent));
  // 마바·사아 0/1(제출 0) · 자차 0/1(제출 1) · 다라 1/2(제출 1/2) · 가나 1/2(제출 2/2)
  ok(names.join() === '마바,사아,자차,다라,가나', '수행률 낮은 순 — 끝낸 과제 비율 → 제출률 → 이름 ' + names.join());
  ok((await p.textContent('#list .rhead >> nth=0')).includes('수행률 0%') && (await p.textContent('#list .rhead >> nth=3')).includes('수행률 50%'), '줄마다 수행률 %');
  await p.check('#fTodo'); await p.waitForTimeout(100);
  ok((await p.$$eval('#list .rhead', x => x.length)) === 5, '다 내지 않은 것만 — 수행을 다 못 한 학생');
  await p.reload(); await p.waitForSelector('#list .row'); await p.waitForTimeout(200);
  ok((await p.inputValue('#fSort')) === 'rate', '새로고침해도 순서 기억');
  await p.click('#views [data-v="work"]'); await p.waitForTimeout(80);
  ok(!(await p.isVisible('#fSort')), '과제별 보기에서는 순서 고르기 숨김');
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
  console.log(`통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });

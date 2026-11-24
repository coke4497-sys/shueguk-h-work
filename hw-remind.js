/* H WORK 과제가 남은 친구에게 독려 알림톡 (2026-11-24 원장님 "H work 과제물이 남아있는 친구에게 학업을 독려하는
 * 알림톡 발송 버튼을 질문 답변 확인 페이지에 만들어줘") — hwork_teacher.html 전용.
 * 남은 과제 = ① 배정됐는데 아직 안 낸 과제(마감이 지난 과제는 뺌 — 제출을 받지 않으므로)
 *            ② 냈지만 오답하기가 남은 과제(1차 오답 중 클리어·질문으로 넘김·오류 신고가 아닌 문항이 남음, 검사 완료·review_at 이면 끝)
 * 배정·제출 판정은 hwork_status.html(= 학생 페이지 s.html) 과 같은 규칙 — 고치면 함께.
 * 알림톡 = 리포트 백엔드 alimSend 종류 hwork_todo('H WORK 과제 미완료 안내', 승인본 — 문구는 바꾸지 않는다).
 * #{과제} = 과제 하나면 그 이름, 여럿이면 '첫 과제 외 n개'. 중복 키 'R:<강사>|<날짜>' — 같은 받는 분에게 하루 한 번.
 * 페이지의 sbAllRows·toast·escapeHtml 을 쓴다. */
(function(){
  var REPORT_API = 'https://script.google.com/macros/s/AKfycbzhCncBwn-JlqXARC3wfrWUCuNHzlNK2df0bdhx-w78Xr8mzYUcIYZOJdRi9N4bHtsb/exec', REPORT_KEY = 'sh';
  var LEFT_RE = /^(퇴원|n|no|off|x|중단|비재원|졸업)$/i, BATCH = 50;
  var WHO = [['학생','phone_student','학생'],['학부모1','phone_parent1','학부모님1'],['학부모2','phone_parent2','학부모님2']];
  var R = { list: null, kinds: { todo: true, fix: true }, who: { '학생': true }, g: '', s: '', off: {}, busy: false, ready: null, teacher: '' };
  function tr(v){ return String(v == null ? '' : v).trim(); }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function baseName(s){ return tr(s).replace(/[A-Za-z]$/, ''); }
  function schoolMatch(a, b){
    a = String(a || '').replace(/\s+/g, ''); b = String(b || '').replace(/\s+/g, '');
    if (!a || !b) return false; if (a === b) return true;
    var na = a.replace(/(등학교|고등학교|중학교|학교|고|중)$/, ''), nb = b.replace(/(등학교|고등학교|중학교|학교|고|중)$/, '');
    if (na && nb && na === nb) return true;
    return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
  }
  function gradeDigit(s){ s = String(s || '').replace(/\s+/g, ''); var m = s.match(/([1-3])학년/) || s.match(/고([1-3])/); if (m) return m[1]; var a = s.match(/[1-3]/g); return a ? a[a.length - 1] : ''; }
  function normGrade(s){ s = tr(s); if (!s) return ''; var lv = /고/.test(s) ? '고' : (/중/.test(s) ? '중' : (/초/.test(s) ? '초' : '')); if (!lv) return ''; var m = s.match(/([1-6])\s*학년/) || s.match(/(?:고|중|초)\s*([1-6])/); return m ? lv + m[1] : ''; }
  function noticeMatches(type, target, stu){
    type = tr(type); target = tr(target);
    if (type.indexOf('전체') >= 0) return true;
    if (type === '' && target === '') return true;
    var tokens = target.split(/[,\n;\/·\s]+/).map(tr).filter(Boolean);
    if (!tokens.length) return false;
    if (type.indexOf('학년') >= 0){
      var g = stu.grade.replace(/\s+/g, ''), sg = (stu.school + stu.grade).replace(/\s+/g, ''), gd = gradeDigit(stu.grade), ng = normGrade(stu.grade);
      var lvS = /중/.test(g) ? '중' : (/고/.test(g) ? '고' : '');
      return target.split(/[,\n;\/·]+/).map(tr).filter(Boolean).some(function(t){
        var tt = t.replace(/\s+/g, ''); if (!tt) return false;
        var td = gradeDigit(tt); if (td && gd && td !== gd) return false;
        var lvT = /중/.test(tt) ? '중' : (/고/.test(tt) ? '고' : ''); if (lvT && lvS && lvT !== lvS) return false;
        if (ng && normGrade(tt) === ng) return true;
        return tt === g || sg.indexOf(tt) >= 0 || g.indexOf(tt) >= 0;
      });
    }
    return tokens.some(function(t){
      if (t.indexOf('|') >= 0){
        var p = t.split('|'), tn = tr(p[0]), ts = tr(p[1]), tg = tr(p[2]);
        if (!tn || tn !== stu.name) return false;
        if (ts && stu.school && !schoolMatch(ts, stu.school)) return false;
        if (tg && stu.grade && tg.replace(/\s+/g, '') !== stu.grade.replace(/\s+/g, '')) return false;
        return true;
      }
      return t === stu.name;
    });
  }
  function todayKst(){ return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  function ymdOf(s){ var m = String(s || '').match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/); return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : ''; }
  function shortCode(c){ return tr(c).replace(/^SHUEGUK REAL 내신 기출\s*/, '').replace(/^\[[^\]]*\]\s*/, ''); }
  function mineT(teacher, want){
    if (window.HWT && HWT.t) return HWT.mine(teacher);
    return teacher === want || (!teacher && want === '이수경');
  }
  /* 오답하기가 남은 문항 수 — 1차 오답(채점 문항) 중 클리어·질문 넘김·오류 신고가 아닌 것 */
  function fixLeft(r){
    if (r.review_at || r.check_done) return 0;
    var wrong = (Number(r.total) || 0) - (Number(r.got) || 0); if (wrong <= 0) return 0;
    var rv = r.review || {}, passed = 0;
    Object.keys(rv).forEach(function(q){ var x = rv[q] || {}; if (x.cleared_at || x.help || x.error) passed++; });
    return Math.max(0, wrong - passed);
  }

  window.hwRemindOpen = async function(){
    var t = document.getElementById('fTeacher').value;
    if (!t){ toast('위에서 담당 강사를 먼저 고르십시오.'); return; }
    R.teacher = t; R.list = null; R.off = {}; R.g = ''; R.s = '';
    shell(); draw('<div class="hrm-empty">남은 과제를 확인하는 중입니다…</div>');
    try {
      var cols = 'id,teacher,code,name,school,grade,got,total,review,review_at,check_done';
      var rs = await Promise.all([
        sbAllRows('/assignments?tool=eq.' + encodeURIComponent('H WORK') + '&select=seq,item,type,target,due&order=seq'),
        sbAllRows('/hwork_submissions?select=' + cols + '&order=id').catch(function(){ return sbAllRows('/hwork_submissions?select=id,teacher,code,name,school,grade,got,total,review,review_at&order=id'); }),
        sbAllRows('/students?select=name,school,grade,enrolled,code,phone_student,phone_parent1,phone_parent2&order=name')
      ]);
      build(rs[0], rs[1], rs[2], t);
      readyCheck();
      render();
    } catch(e){ draw('<div class="hrm-empty err">불러오지 못했습니다. 잠시 뒤 다시 눌러 주세요.<br><small>' + esc(e && e.message || '') + '</small></div>'); }
  };

  function build(asg, subs, stus, t){
    var today = todayKst();
    var roster = stus.filter(function(s){ return !LEFT_RE.test(tr(s.enrolled)) && tr(s.name); })
      .map(function(s){ return { name: tr(s.name), school: tr(s.school), grade: tr(s.grade), code: tr(s.code), ph: { phone_student: s.phone_student, phone_parent1: s.phone_parent1, phone_parent2: s.phone_parent2 } }; });
    var byItem = {}, order = [];
    asg.forEach(function(a){
      var item = tr(a.item); if (!item) return;
      var i = item.indexOf(' / '), teacher = i >= 0 ? tr(item.slice(0, i)) : '';
      if (!mineT(teacher, t)) return;
      if (!byItem[item]){ byItem[item] = []; order.push(item); }
      byItem[item].push(a);
    });
    var per = {};
    function rec(s){ var k = s.name + '|' + s.school + '|' + s.grade; return per[k] || (per[k] = { stu: s, todo: [], fix: [] }); }
    order.forEach(function(item){
      var i = item.indexOf(' / '), teacher = i >= 0 ? tr(item.slice(0, i)) : '', code = i >= 0 ? tr(item.slice(i + 3)) : item;
      var rows = byItem[item];
      var dues = rows.map(function(a){ return ymdOf(a.due); }).filter(Boolean).sort();
      var closed = dues.length === rows.length && dues.length && dues[dues.length - 1] < today;   // 모든 배정 줄의 마감이 지남
      var mine = subs.filter(function(r){ return tr(r.code) === code && (!teacher || tr(r.teacher) === teacher); });
      roster.forEach(function(s){
        if (!rows.some(function(a){ return noticeMatches(a.type, a.target, s); })) return;
        var gd = gradeDigit(s.grade), base = baseName(s.name), hit = null;
        mine.forEach(function(r){
          var rn = tr(r.name); if (rn !== s.name && rn !== base) return;
          var rg = gradeDigit(r.grade); if (gd && rg && rg !== gd) return;
          if (s.school && tr(r.school) && !schoolMatch(r.school, s.school)) return;
          if (!hit || (rn === s.name && tr(hit.name) !== s.name) || (r.review_at && !hit.review_at) || (Number(r.id) > Number(hit.id) && !hit.review_at)) hit = r;
        });
        if (!hit){ if (!closed) rec(s).todo.push(code); return; }
        var left = fixLeft(hit); if (left) rec(s).fix.push({ code: code, n: left });
      });
    });
    R.list = Object.keys(per).map(function(k){ return per[k]; }).filter(function(x){ return x.todo.length || x.fix.length; })
      .sort(function(a, b){ var ga = normGrade(a.stu.grade), gb = normGrade(b.stu.grade); return ga.localeCompare(gb) || a.stu.school.localeCompare(b.stu.school, 'ko') || a.stu.name.localeCompare(b.stu.name, 'ko'); });
  }

  async function readyCheck(){
    if (R.ready !== null) return;
    try { var d = await (await fetch(REPORT_API + '?' + new URLSearchParams({ action: 'alimConfig', pw: REPORT_KEY, t: Date.now() }))).json();
      var T = (d && d.templates) || {}; R.ready = !!(d && d.result === 'success' && d.ready !== false && T.hwork_todo && T.hwork_todo.ready); }
    catch(e){ R.ready = false; }
    render();
  }

  /* 고른 종류의 남은 과제 이름 목록 */
  function itemsOf(x){
    var a = [];
    if (R.kinds.todo) x.todo.forEach(function(c){ a.push(shortCode(c)); });
    if (R.kinds.fix) x.fix.forEach(function(f){ a.push(shortCode(f.code)); });
    return a;
  }
  function taskVar(a){ if (!a.length) return ''; var s = a[0] + (a.length > 1 ? ' 외 ' + (a.length - 1) + '개' : ''); return s.length > 60 ? s.slice(0, 57) + '…' : s; }
  function visible(){
    return (R.list || []).filter(function(x){
      if (R.g && normGrade(x.stu.grade) !== R.g) return false;
      if (R.s && x.stu.school !== R.s) return false;
      return itemsOf(x).length > 0;
    });
  }
  function keyOf(x){ return x.stu.name + '|' + x.stu.school + '|' + x.stu.grade; }
  /* 보낼 줄 — 받는 분마다 한 건, 같은 번호는 한 통만 */
  function plan(){
    var rows = visible().filter(function(x){ return !R.off[keyOf(x)]; }), items = [], noPh = [], noCode = [], same = [], seen = {};
    rows.forEach(function(x){
      if (!x.stu.code){ noCode.push(x.stu.name); return; }
      var any = false;
      WHO.forEach(function(w){
        if (!R.who[w[0]]) return;
        var to = String(x.stu.ph[w[1]] || '').replace(/\D/g, ''); if (!to) return; any = true;
        if (seen[to]){ same.push(x.stu.name + ' ' + w[2]); return; } seen[to] = 1;
        items.push({ student: x.stu.name, to: to, who: w[0], cls: 'H WORK', date: 'R:' + R.teacher + '|' + todayKst(),
          vars: { '학생명': baseName(x.stu.name), '과제': taskVar(itemsOf(x)), '접근코드': x.stu.code } });
      });
      if (!any) noPh.push(x.stu.name);
    });
    return { rows: rows, items: items, noPh: noPh, noCode: noCode, same: same };
  }

  function shell(){
    var bg = document.getElementById('hrmBg');
    if (!bg){
      var st = document.createElement('style');
      st.textContent = '.hrmbtn{border:0;background:#EDE4F4;color:#5A4A6A;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;}'
        + '#hrmBg{position:fixed;inset:0;background:rgba(30,40,35,.35);z-index:80;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;}'
        + '#hrmBg .p{background:#fff;border-radius:20px;max-width:620px;width:100%;padding:20px 20px 16px;box-shadow:0 10px 40px rgba(0,0,0,.18);}'
        + '#hrmBg h3{margin:0 0 4px;font-family:"Gowun Batang",serif;font-size:20px;color:#2A332F;}'
        + '#hrmBg .sub{margin:0 0 12px;font-size:13px;color:#5C6A64;line-height:1.55;}'
        + '#hrmBg .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px;font-size:13px;color:#4F5C56;}'
        + '#hrmBg .row b.l{min-width:58px;color:#4F5C56;}'
        + '#hrmBg .pill{border:0;background:#F2F5F3;color:#54655c;border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer;}'
        + '#hrmBg .pill.on{background:#EDE4F4;color:#5A4A6A;font-weight:700;}'
        + '#hrmBg select{height:34px;border:1px solid #dfe5e1;border-radius:10px;padding:0 8px;font:inherit;font-size:13px;background:#fff;}'
        + '#hrmBg .lst{max-height:44vh;overflow:auto;border:1px solid #E5EDE8;border-radius:14px;margin:0 0 10px;}'
        + '#hrmBg .it{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-bottom:1px solid #EEF2EF;font-size:13.5px;cursor:pointer;}'
        + '#hrmBg .it:last-child{border-bottom:0;} #hrmBg .it.off{opacity:.45;}'
        + '#hrmBg .it input{margin-top:3px;} #hrmBg .it .nm{font-weight:700;color:#2A332F;} #hrmBg .it .mt{color:#7A867F;font-size:12px;margin-left:4px;}'
        + '#hrmBg .it .tk{display:block;color:#4F5C56;font-size:12.5px;margin-top:2px;line-height:1.5;} #hrmBg .it .tk em{font-style:normal;color:#A33A5E;}'
        + '#hrmBg .pv{background:#FBF7EE;border-radius:12px;padding:10px 12px;font-size:12.5px;white-space:pre-wrap;color:#3F4A44;margin:0 0 10px;line-height:1.55;}'
        + '#hrmBg .note{font-size:12.5px;color:#7A5A2E;background:#FBF3E2;border-radius:10px;padding:8px 10px;margin:0 0 10px;line-height:1.5;}'
        + '#hrmBg .go{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;}'
        + '#hrmBg .go .sum{margin-right:auto;font-size:13px;color:#4F5C56;}'
        + '#hrmBg .go button{border:0;border-radius:999px;padding:9px 16px;font:inherit;font-size:14px;cursor:pointer;background:#F2F5F3;color:#54655c;}'
        + '#hrmBg .go button.send{background:#4a4266;color:#fff;font-weight:700;} #hrmBg .go button:disabled{opacity:.45;cursor:default;}'
        + '.hrm-empty{padding:18px;text-align:center;color:#5C6A64;font-size:14px;} .hrm-empty.err{color:#B0525D;}';
      document.head.appendChild(st);
      bg = document.createElement('div'); bg.id = 'hrmBg';
      bg.innerHTML = '<div class="p"><h3>과제가 남은 친구에게 알림톡</h3><p class="sub" id="hrmSub"></p><div id="hrmBody"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener('click', function(e){
        if (e.target === bg && !R.busy){ bg.style.display = 'none'; return; }
        var b = e.target.closest('[data-k]'); if (b && !R.busy){ var k = b.getAttribute('data-k'); R.kinds[k] = !R.kinds[k]; render(); return; }
        var w = e.target.closest('[data-w]'); if (w && !R.busy){ var x = w.getAttribute('data-w'); R.who[x] = !R.who[x]; render(); return; }
        var it = e.target.closest('.it[data-s]'); if (it && !R.busy){ var s = it.getAttribute('data-s'); R.off[s] = !R.off[s]; render(); return; }
        if (e.target.closest('#hrmAll') && !R.busy){ var vis = visible(), allOn = vis.every(function(x){ return !R.off[keyOf(x)]; }); vis.forEach(function(x){ R.off[keyOf(x)] = allOn; }); render(); return; }
        if (e.target.closest('#hrmClose') && !R.busy){ bg.style.display = 'none'; return; }
        if (e.target.closest('#hrmSend')) send();
      });
      bg.addEventListener('change', function(e){ var sel = e.target.closest('select[data-f]'); if (sel){ R[sel.getAttribute('data-f')] = sel.value; render(); } });
    }
    bg.style.display = 'flex';
    document.getElementById('hrmSub').textContent = R.teacher + ' 선생님이 배정한 H WORK 중 아직 내지 않았거나 오답하기가 남은 친구입니다. 마감이 지난 과제는 넣지 않았어요.';
  }
  function draw(h){ document.getElementById('hrmBody').innerHTML = h; }

  function render(){
    if (!R.list) return;
    var all = R.list, gs = {}, ss = {};
    all.forEach(function(x){ var g = normGrade(x.stu.grade); if (g) gs[g] = 1; if (x.stu.school) ss[x.stu.school] = 1; });
    var gl = ['초5','초6','중1','중2','중3','고1','고2','고3'].filter(function(g){ return gs[g]; }), sl = Object.keys(ss).sort(function(a, b){ return a.localeCompare(b, 'ko'); });
    if (!all.length){ draw('<div class="hrm-empty">남은 과제가 있는 친구가 없습니다. 모두 잘하고 있어요!</div><div class="go"><button type="button" id="hrmClose">닫기</button></div>'); return; }
    var vis = visible(), p = plan();
    var h = '<div class="row"><b class="l">남은 과제</b>'
      + '<button type="button" class="pill' + (R.kinds.todo ? ' on' : '') + '" data-k="todo">아직 안 낸 과제</button>'
      + '<button type="button" class="pill' + (R.kinds.fix ? ' on' : '') + '" data-k="fix">오답하기가 남은 과제</button></div>'
      + '<div class="row"><b class="l">받는 분</b>' + WHO.map(function(w){ return '<button type="button" class="pill' + (R.who[w[0]] ? ' on' : '') + '" data-w="' + w[0] + '">' + w[2] + '</button>'; }).join('') + '</div>'
      + '<div class="row"><b class="l">거르기</b><select data-f="g"><option value="">모든 학년</option>' + gl.map(function(g){ return '<option' + (R.g === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select>'
      + '<select data-f="s"><option value="">모든 학교</option>' + sl.map(function(s){ return '<option' + (R.s === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>'
      + (vis.length ? '<button type="button" class="pill" id="hrmAll">모두 고르기·풀기</button>' : '') + '</div>';
    h += '<div class="lst">' + (vis.length ? vis.map(function(x){
      var k = keyOf(x), on = !R.off[k], parts = [];
      if (R.kinds.todo && x.todo.length) parts.push('<em>안 냄 ' + x.todo.length + '</em> ' + esc(x.todo.map(shortCode).join(' · ')));
      if (R.kinds.fix && x.fix.length) parts.push('<em>오답하기 남음</em> ' + esc(x.fix.map(function(f){ return shortCode(f.code) + ' (' + f.n + '문항)'; }).join(' · ')));
      return '<div class="it' + (on ? '' : ' off') + '" data-s="' + esc(k) + '"><input type="checkbox"' + (on ? ' checked' : '') + ' tabindex="-1"><div><span class="nm">' + esc(x.stu.name) + '</span><span class="mt">' + esc([x.stu.school, normGrade(x.stu.grade)].filter(Boolean).join(' ')) + '</span><span class="tk">' + parts.join('<br>') + '</span></div></div>';
    }).join('') : '<div class="hrm-empty">고른 조건에 맞는 친구가 없습니다.</div>') + '</div>';
    var ex = p.items[0];
    if (ex) h += '<div class="pv">[이수경국어학원] H WORK 과제 미완료 안내\n' + esc(ex.vars['학생명']) + ' 학생의 H WORK 과제가 아직 완료되지 않았습니다.\n선생님이 기다리고 있어요.\n\n▶ ' + esc(ex.vars['과제']) + '\n\n슈퍼스타 페이지의 H WORK 메뉴에서 과제를 마무리해 주세요.\n[슈퍼스타 페이지]</div>';
    var notes = [];
    if (p.noPh.length) notes.push('연락처가 없어 못 보내는 친구 ' + p.noPh.length + '명: ' + p.noPh.slice(0, 8).join(', ') + (p.noPh.length > 8 ? ' 외' : ''));
    if (p.noCode.length) notes.push('접근코드가 없어 못 보내는 친구 ' + p.noCode.length + '명: ' + p.noCode.slice(0, 8).join(', '));
    if (p.same.length) notes.push('같은 번호라 한 통만 보냅니다: ' + p.same.slice(0, 6).join(', ') + (p.same.length > 6 ? ' 외' : ''));
    if (R.ready === false) notes.push('알림톡 템플릿(H WORK 과제 미완료 안내)이 준비되지 않아 지금은 보낼 수 없습니다.');
    if (notes.length) h += '<div class="note">' + notes.map(esc).join('<br>') + '</div>';
    var can = p.items.length && R.ready === true && !R.busy;
    h += '<div class="go"><span class="sum" id="hrmSum">친구 ' + p.rows.length + '명 · 알림톡 ' + p.items.length + '건' + (R.ready === null ? ' · 템플릿 확인 중' : '') + '</span><button type="button" id="hrmClose">닫기</button><button type="button" class="send" id="hrmSend"' + (can ? '' : ' disabled') + '>' + (R.busy ? '보내는 중…' : '알림톡 보내기') + '</button></div>';
    draw(h);
  }

  async function sendChunk(body){   // 답이 이상하면 4초 뒤 두 번까지 다시 (허브 alimtalk.html 과 같은 방식 — 서버가 받은 분은 dup 으로 건너뜀)
    for (var i = 0; i < 3; i++){
      try { var j = await (await fetch(REPORT_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })).json();
        if (j && Array.isArray(j.sent)) return { j: j, retried: i > 0 }; }
      catch(e){}
      if (i < 2) await new Promise(function(r){ setTimeout(r, 4000); });
    }
    return null;
  }

  async function send(){
    var p = plan(); if (!p.items.length || R.busy || R.ready !== true) return;
    var by = ''; try { by = window.shuegukTeacherName ? ((await shuegukTeacherName()) || '') : ''; } catch(e){}
    if (!by){ toast('허브에 로그인한 선생님 이름을 찾지 못했어요. 다시 로그인해 주세요.'); return; }
    if (!confirm('친구 ' + p.rows.length + '명에게 H WORK 과제 미완료 알림톡 ' + p.items.length + '건을 보낼까요?\n'
      + p.rows.slice(0, 8).map(function(x){ return '· ' + x.stu.name + ' — ' + taskVar(itemsOf(x)); }).join('\n') + (p.rows.length > 8 ? '\n· 그 밖에 ' + (p.rows.length - 8) + '명' : '')
      + '\n\n같은 분에게는 하루 한 번만 갑니다. (' + by + ' 선생님 이름으로)')) return;
    R.busy = true; render();
    var ok = 0, dup = 0, fail = 0, failNm = [];
    for (var i = 0; i < p.items.length; i += BATCH){
      var chunk = p.items.slice(i, i + BATCH);
      document.getElementById('hrmSum').textContent = '보내는 중… (' + Math.min(i + BATCH, p.items.length) + '/' + p.items.length + ')';
      var res = await sendChunk({ pw: REPORT_KEY, action: 'alimSend', kind: 'hwork_todo', by: by, items: chunk });
      if (!res){ fail += chunk.length; chunk.forEach(function(c){ failNm.push(c.student); }); continue; }
      res.j.sent.forEach(function(x, k){
        if (x && x.ok){ if (x.dup && !res.retried) dup++; else ok++; }
        else { fail++; failNm.push((chunk[k] || {}).student || ''); }
      });
    }
    R.busy = false;
    if (window.shuegukActivity) shuegukActivity('H WORK', '과제 독려 알림톡', R.teacher + ' 선생님 과제', '친구 ' + p.rows.length + '명 · ' + ok + '건', false);
    render();
    var msg = '알림톡 ' + ok + '건을 보냈습니다.' + (dup ? ' 오늘 이미 받은 ' + dup + '건은 건너뛰었어요.' : '') + (fail ? ' 보내지 못한 ' + fail + '건: ' + failNm.slice(0, 6).join(', ') : '');
    if (fail) alert(msg); else toast(msg);
  }
})();

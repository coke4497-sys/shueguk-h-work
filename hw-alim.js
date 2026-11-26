/* H WORK — 배정한 과제의 미제출·오답하기 중 학생 가리기 + 한꺼번에 알림톡 (2026-11-25 원장님
 * "제출 현황, 채점 결과 조회에서 배정된 과제중 미제출 학생도 확인하고 싶어요. 오답중, 미제출 친구에게 한꺼번에 알림톡 기능 필요")
 * 쓰는 곳: hwork_status.html(제출 현황) · hwork_teacher.html(채점·질문 확인).
 *  HWA.build(asg, subs, stus, keepItem) → [{ item, teacher, code, due, assigned:[stu], done:{stuKey: sub} }]
 *  HWA.state(sub) → 'none'(미제출) · 'ing'(오답하기 중) · 'ok'
 *  HWA.open([{ stu, code, kind:'none'|'ing' }]) → 알림톡 창(종류 'H WORK 과제 미완료 안내' hwork_todo — 승인된 템플릿)
 * 배정 판정은 학생 페이지 s.html noticeMatches 와 같은 규칙(hwork_status.html 에도 같은 사본 — 고치면 함께).
 * 학생 한 명에게 하루 한 통 — 과제가 여럿이면 '첫 과제 외 n개'로 묶는다. 같은 번호는 한 통만. */
(function(){
  var API = 'https://script.google.com/macros/s/AKfycbzhCncBwn-JlqXARC3wfrWUCuNHzlNK2df0bdhx-w78Xr8mzYUcIYZOJdRi9N4bHtsb/exec', KEY = 'sh';
  var LEFT_RE = /^(퇴원|n|no|off|x|중단|비재원|졸업)$/i;
  function tr(v){ return String(v == null ? '' : v).trim(); }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function baseName(s){ return tr(s).replace(/[A-Za-z]$/, ''); }
  function schoolMatch(a, b){
    a = String(a || '').replace(/\s+/g, ''); b = String(b || '').replace(/\s+/g, '');
    if (!a || !b) return false;
    if (a === b) return true;
    var na = a.replace(/(등학교|고등학교|중학교|학교|고|중)$/, ''), nb = b.replace(/(등학교|고등학교|중학교|학교|고|중)$/, '');
    if (na && nb && na === nb) return true;
    return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
  }
  function gradeDigit(s){
    s = String(s || '').replace(/\s+/g, '');
    var m = s.match(/([1-3])학년/) || s.match(/고([1-3])/);
    if (m) return m[1];
    var a = s.match(/[1-3]/g);
    return a ? a[a.length - 1] : '';
  }
  function normGrade(s){
    s = tr(s); if (!s) return '';
    var lv = /고/.test(s) ? '고' : (/중/.test(s) ? '중' : (/초/.test(s) ? '초' : ''));
    if (!lv) return '';
    var m = s.match(/([1-6])\s*학년/) || s.match(/(?:고|중|초)\s*([1-6])/);
    return m ? lv + m[1] : '';
  }
  function noticeMatches(type, target, stu){
    type = tr(type); target = tr(target);
    if (type.indexOf('전체') >= 0) return true;
    if (type === '' && target === '') return true;
    var tokens = target.split(/[,\n;\/·\s]+/).map(tr).filter(Boolean);
    if (!tokens.length) return false;
    if (type.indexOf('학년') >= 0) {
      var g = stu.grade.replace(/\s+/g, ''), sg = (stu.school + stu.grade).replace(/\s+/g, '');
      var gd = gradeDigit(stu.grade), ng = normGrade(stu.grade), lvS = /중/.test(g) ? '중' : (/고/.test(g) ? '고' : '');
      return target.split(/[,\n;\/·]+/).map(tr).filter(Boolean).some(function(t){
        var tt = t.replace(/\s+/g, ''); if (!tt) return false;
        var td = gradeDigit(tt); if (td && gd && td !== gd) return false;
        var lvT = /중/.test(tt) ? '중' : (/고/.test(tt) ? '고' : ''); if (lvT && lvS && lvT !== lvS) return false;
        if (ng && normGrade(tt) === ng) return true;
        return tt === g || sg.indexOf(tt) >= 0 || g.indexOf(tt) >= 0;
      });
    }
    return tokens.some(function(t){
      if (t.indexOf('|') >= 0) {
        var p = t.split('|'), tn = tr(p[0]), ts = tr(p[1]), tg = tr(p[2]);
        if (!tn || tn !== stu.name) return false;
        if (ts && stu.school && !schoolMatch(ts, stu.school)) return false;
        if (tg && stu.grade && tg.replace(/\s+/g, '') !== stu.grade.replace(/\s+/g, '')) return false;
        return true;
      }
      return t === stu.name;
    });
  }
  function stuKey(s){ return s.name + '|' + s.school + '|' + s.grade; }
  /* 제출이 이 학생 것인가 — 이름(끝 알파벳 뗌)·학년 숫자·학교(느슨히). 학교가 다르면 잇지 않는다 */
  function subOf(s, mine){
    var gd = gradeDigit(s.grade), base = baseName(s.name), hit = null;
    mine.forEach(function(r){
      var rn = tr(r.name);
      if (rn !== s.name && rn !== base) return;
      var rg = gradeDigit(r.grade); if (gd && rg && rg !== gd) return;
      if (s.school && tr(r.school) && !schoolMatch(r.school, s.school)) return;
      if (!hit || (rn === s.name && tr(hit.name) !== s.name) || (r.review_at && !hit.review_at)) hit = r;
    });
    return hit;
  }
  function build(asg, subs, stus, keepItem){
    var roster = (stus || []).filter(function(s){ return !LEFT_RE.test(tr(s.enrolled)); })
      .map(function(s){ return { name: tr(s.name), school: tr(s.school), grade: tr(s.grade), code: tr(s.code),
        phone_student: tr(s.phone_student), phone_parent1: tr(s.phone_parent1), phone_parent2: tr(s.phone_parent2) }; })
      .filter(function(s){ return s.name; });
    var byItem = {}, order = [];
    (asg || []).forEach(function(a){
      var item = tr(a.item); if (!item) return;
      if (keepItem && !keepItem(item)) return;
      if (!byItem[item]) { byItem[item] = []; order.push(item); }
      byItem[item].push(a);
    });
    return order.map(function(item){
      var teacher = '', code = item, i = item.indexOf(' / ');
      if (i >= 0) { teacher = tr(item.slice(0, i)); code = tr(item.slice(i + 3)); }
      var rows = byItem[item];
      var assigned = roster.filter(function(s){ return rows.some(function(a){ return noticeMatches(a.type, a.target, s); }); });
      var mine = (subs || []).filter(function(r){ return tr(r.code) === code && (!teacher || tr(r.teacher) === teacher); });
      var done = {};
      assigned.forEach(function(s){ var h = subOf(s, mine); if (h) done[stuKey(s)] = h; });
      var dates = rows.map(function(a){ return tr(a.date); }).filter(Boolean).sort();
      var dues = rows.map(function(a){ return tr(a.due); }).filter(Boolean).sort();
      return { item: item, teacher: teacher, code: code, rows: rows, assigned: assigned, done: done,
               date: dates.length ? dates[dates.length - 1] : '', first: dates.length ? dates[0] : '', due: dues.length ? dues[dues.length - 1] : '' };
    });
  }
  /* 오답하기 중 = 틀린 문항이 있고 오답하기를 끝내지 않음(review_at 없음).
   * 'reply' = 남은 오답이 모두 선생님 답장을 기다리는 질문뿐 — 알림톡 대상에서 뺀다 (2026-11-25 원장님 "답장 필요만 남은 학생은 빼주세요")
   * sub.qaNeed = 답장 기다리는 질문 수, sub.handled = 클리어·넘김한 문항 수(review 가 있으면 여기서 셈) */
  function handledOf(sub){
    if (sub.handled != null) return Number(sub.handled) || 0;
    var n = 0; Object.keys(sub.review || {}).forEach(function(k){ var v = sub.review[k] || {}; if (v.cleared_at || v.help || v.error) n++; });
    return n;
  }
  function state(sub){
    if (!sub) return 'none';
    var tot = Number(sub.total) || 0, got = Number(sub.got) || 0;
    if (sub.review_at || sub.reviewed) return 'ok';
    if (tot <= got) return 'ok';
    var need = Number(sub.qaNeed) || 0;
    if (need > 0 && tot - got - handledOf(sub) <= need) return 'reply';
    return 'ing';
  }
  /* 답장 기다리는 질문 수 — 문항마다 마지막 글이 학생이고, 그 뒤 [잘 고쳤습니다]를 누르지 않았으면 (hwork_teacher.html 과 같은 규칙) */
  function qaNeed(subs, qa){
    var by = {}, ck = {}, kst = function(iso){ var d = new Date(new Date(iso).getTime() + 9 * 3600e3); if (isNaN(d)) return ''; var p = function(n){ return String(n).padStart(2, '0'); };
      return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
    (subs || []).forEach(function(r){ if (r.id) ck[r.id] = r.checked || {}; });
    (qa || []).forEach(function(m){ var k = m.sub_id + '|' + m.q; by[k] = m.who;
      if (m.who === '학생'){ var c = (ck[m.sub_id] || {})[m.q]; if (c && String(c.at || '') >= kst(m.at)) by[k] = '선생님'; } });
    var n = {}; Object.keys(by).forEach(function(k){ if (by[k] === '학생'){ var id = k.split('|')[0]; n[id] = (n[id] || 0) + 1; } });
    (subs || []).forEach(function(r){ if (r.id) r.qaNeed = n[r.id] || 0; });
  }
  /* 주차 = 처음 배정한 날로 센다 — 4주차가 11/24(화)부터, 7일마다 한 주 (2026-11-26 원장님 "2주차, 3주차, 4주차(11/24-)").
   * 리포트 s.html hwWeekOf 와 같은 규칙 — 고치면 함께 */
  var WEEK_BASE = Date.UTC(2026, 10, 24), WEEK_NO = 4;
  function weekOf(ymd){
    var m = String(ymd || '').match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return 0;
    var n = WEEK_NO + Math.floor((Date.UTC(+m[1], +m[2] - 1, +m[3]) - WEEK_BASE) / (7 * 864e5));
    return n >= 1 ? n : 0;
  }
  function weekLabel(ymd){ var n = weekOf(ymd); return n ? n + '주차' : ''; }
  function shortTitle(code){ return tr(code).replace(/^SHUEGUK REAL 내신 기출\s*/, '').replace(/^\[[^\]]*\]\s*/, ''); }
  function digits(p){ return String(p || '').replace(/\D/g, ''); }
  function todayKst(){ var d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 10); }

  /* ── 알림톡 창 ── */
  var CFG = null, CUR = null;
  function css(){
    if (document.getElementById('hwaCss')) return;
    var s = document.createElement('style'); s.id = 'hwaCss';
    s.textContent = '#hwa{position:fixed;inset:0;background:rgba(30,40,35,.42);z-index:300;display:flex;align-items:flex-start;justify-content:center;padding:28px 14px;overflow:auto}'
      + '#hwa .p{background:#fff;border-radius:22px;max-width:640px;width:100%;padding:22px 22px 18px;font-family:"Gowun Dodum",sans-serif;color:#2b3a33;box-shadow:0 18px 50px rgba(0,0,0,.18)}'
      + '#hwa h3{margin:0 0 4px;font-family:"Gowun Batang",serif;font-size:20px}#hwa .sub{font-size:13px;color:#5c6a64;margin-bottom:12px;line-height:1.55}'
      + '#hwa .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}#hwa .lb{font-size:13px;color:#4f5c56;min-width:58px}'
      + '#hwa .pill{border:0;border-radius:999px;padding:7px 13px;font:inherit;font-size:14px;background:#f2f5f3;color:#4f5c56;cursor:pointer}#hwa .pill.on{background:#e6e2f2;color:#4a4266;font-weight:700}'
      + '#hwa label.ck{display:inline-flex;gap:5px;align-items:center;font-size:14px;background:#f6f7f4;border-radius:999px;padding:6px 12px;cursor:pointer}'
      + '#hwa .list{max-height:300px;overflow:auto;border:1px solid #e5ede8;border-radius:14px;margin:8px 0}'
      + '#hwa .it{display:flex;gap:9px;align-items:flex-start;padding:9px 12px;border-bottom:1px solid #f0f3f1;font-size:14px}#hwa .it:last-child{border-bottom:0}'
      + '#hwa .it.off{opacity:.55}#hwa .it .nm{font-weight:700}#hwa .it small{display:block;color:#6a7871;font-size:12.5px;margin-top:2px;line-height:1.45}'
      + '#hwa .k{display:inline-block;font-size:11.5px;border-radius:999px;padding:1px 7px;margin-left:4px;vertical-align:1px}#hwa .k.none{background:#fbe6e9;color:#a23a4c}#hwa .k.ing{background:#fdf1d8;color:#8a6a1f}'
      + '#hwa .pv{background:#fdf9ef;border-radius:14px;padding:12px 14px;font-size:13px;white-space:pre-wrap;line-height:1.6;color:#4b4433}'
      + '#hwa .ft{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:14px}#hwa .ft .sum{margin-right:auto;font-size:14px;color:#4f5c56}'
      + '#hwa .go{border:0;border-radius:14px;padding:11px 18px;font:inherit;font-size:15px;font-weight:700;background:#4a4266;color:#fff;cursor:pointer}#hwa .go:disabled{background:#c9c6d3;cursor:default}'
      + '#hwa .cx{border:0;border-radius:14px;padding:11px 16px;font:inherit;font-size:15px;background:#f2f5f3;color:#4f5c56;cursor:pointer}'
      + '#hwa .msg{font-size:13.5px;margin-top:8px;color:#4a4266;line-height:1.55}#hwa .msg.err{color:#b0414f}'
      + '@media(max-width:520px){#hwa{padding:10px}#hwa .p{padding:18px 14px 14px;border-radius:18px}}';
    document.head.appendChild(s);
  }
  function group(list){
    var by = {}, order = [];
    (list || []).forEach(function(x){
      var k = stuKey(x.stu);
      if (!by[k]) { by[k] = { stu: x.stu, works: [], kinds: {}, on: true }; order.push(k); }
      var g = by[k];
      if (!g.works.some(function(w){ return w.code === x.code; })) g.works.push({ code: x.code, kind: x.kind });
      g.kinds[x.kind] = (g.kinds[x.kind] || 0) + 1;
    });
    return order.map(function(k){ return by[k]; });
  }
  function worksOf(g){ return g.works.filter(function(w){ return CUR.kinds[w.kind]; }); }
  function taskText(g){
    var ws = worksOf(g); if (!ws.length) return '';
    var t = shortTitle(ws[0].code), more = ws.length > 1 ? ' 외 ' + (ws.length - 1) + '개' : '';
    if ((t + more).length > 60) t = t.slice(0, 60 - more.length - 1) + '…';
    return t + more;
  }
  function phonesOf(g){
    var out = [], s = g.stu;
    if (CUR.who['학생'] && digits(s.phone_student)) out.push({ who: '학생', to: digits(s.phone_student) });
    if (CUR.who['학부모1'] && digits(s.phone_parent1)) out.push({ who: '학부모1', to: digits(s.phone_parent1) });
    if (CUR.who['학부모2'] && digits(s.phone_parent2)) out.push({ who: '학부모2', to: digits(s.phone_parent2) });
    return out;
  }
  function why(g){
    if (!worksOf(g).length) return '고른 종류에 해당하는 과제 없음';
    if (!g.stu.code) return '접근코드가 없어 보낼 수 없어요';
    if (!phonesOf(g).length) return '고른 받는 분의 연락처가 없어요';
    return '';
  }
  function draw(){
    var box = document.getElementById('hwa'); if (!box) return;
    var gs = CUR.groups, nNone = 0, nIng = 0;
    gs.forEach(function(g){ if (g.kinds.none) nNone++; if (g.kinds.ing) nIng++; });
    var send = gs.filter(function(g){ return g.on && !why(g); });
    var msgs = 0, seen = {};
    send.forEach(function(g){ phonesOf(g).forEach(function(p){ if (!seen[p.to]) { seen[p.to] = 1; msgs++; } }); });
    var first = send[0];
    var tpl = CFG && CFG.text || '';
    var pv = first ? tpl.replace('#{학생명}', baseName(first.stu.name)).replace('#{과제}', taskText(first)) : '';
    box.querySelector('.p').innerHTML =
      '<h3>H WORK 알림톡 보내기</h3>'
      + '<div class="sub">'+esc(CUR.title)+'<br>알림톡 종류는 ‘H WORK 과제 미완료 안내’입니다. 학생 한 명에게 하루 한 통만 가고, 과제가 여럿이면 ‘첫 과제 외 n개’로 묶어 보내요.</div>'
      + '<div class="row"><span class="lb">보낼 학생</span>'
      +   '<button type="button" class="pill'+(CUR.kinds.none?' on':'')+'" data-kind="none">미제출 '+nNone+'명</button>'
      +   '<button type="button" class="pill'+(CUR.kinds.ing?' on':'')+'" data-kind="ing">오답하기 중 '+nIng+'명</button></div>'
      + '<div class="row"><span class="lb">받는 분</span>'
      +   ['학생','학부모1','학부모2'].map(function(w){ return '<label class="ck"><input type="checkbox" data-who="'+w+'"'+(CUR.who[w]?' checked':'')+'> '+(w==='학생'?'학생':w.replace('학부모','학부모님'))+'</label>'; }).join('') + '</div>'
      + '<div class="list">' + (gs.length ? gs.map(function(g, i){
          var w = why(g), ws = g.works.map(function(x){ return '<span class="k '+x.kind+'">'+(x.kind==='none'?'미제출':'오답 중')+'</span> '+esc(shortTitle(x.code)); });
          return '<label class="it'+(w?' off':'')+'"><input type="checkbox" data-i="'+i+'"'+(g.on&&!w?' checked':'')+(w?' disabled':'')+'><span><span class="nm">'+esc(g.stu.name)+'</span> <small style="display:inline">'+esc([g.stu.school, normGrade(g.stu.grade)].filter(Boolean).join(' '))+'</small>'
            + '<small>'+ws.slice(0, 3).join('<br>')+(ws.length>3?'<br>그 밖에 '+(ws.length-3)+'개':'')+(w?'<br>· '+esc(w):'')+'</small></span></label>';
        }).join('') : '<div class="it">미제출·오답하기 중인 학생이 없어요.</div>') + '</div>'
      + (pv ? '<div class="lb" style="margin:6px 0 4px">미리보기 · '+esc(first.stu.name)+'</div><div class="pv">'+esc(pv)+'</div>' : '')
      + '<div class="msg'+(CUR.err?' err':'')+'" id="hwaMsg">'+esc(CUR.msg || (CFG === false ? '알림톡 설정을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.' : (CFG && !CFG.ready ? '‘H WORK 과제 미완료 안내’ 템플릿이 아직 준비 전이에요.' : '')))+'</div>'
      + '<div class="ft"><span class="sum">학생 '+send.length+'명 · 알림톡 '+msgs+'통</span><button type="button" class="cx" data-x="1">닫기</button>'
      + '<button type="button" class="go" data-go="1"'+(!send.length||!msgs||!CFG||!CFG.ready||CUR.busy?' disabled':'')+'>'+(CUR.busy?'보내는 중…':'알림톡 보내기')+'</button></div>';
  }
  function loadCfg(){
    if (CFG) return Promise.resolve(CFG);
    return fetch(API + '?' + new URLSearchParams({ action: 'alimConfig', pw: KEY, t: Date.now() })).then(function(r){ return r.json(); }).then(function(d){
      var T = (d && d.templates) || {}, t = T.hwork_todo || {};
      CFG = { ready: !!(d && d.result === 'success' && d.ready !== false && t.ready), text: t.text || '' };
      return CFG;
    }).catch(function(){ CFG = false; return CFG; });
  }
  function myName(){ try { return window.shuegukTeacherName ? shuegukTeacherName().then(function(x){ return x || ''; }) : Promise.resolve(''); } catch (e) { return Promise.resolve(''); } }
  function post(items, by){
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ pw: KEY, action: 'alimSend', kind: 'hwork_todo', by: by, items: items }) }).then(function(r){ return r.json(); });
  }
  function sendAll(){
    var send = CUR.groups.filter(function(g){ return g.on && !why(g); });
    if (!send.length) return;
    var today = todayKst(), items = [], seen = {};
    send.forEach(function(g){
      phonesOf(g).forEach(function(p){
        if (seen[p.to]) return; seen[p.to] = 1;
        items.push({ student: g.stu.name, to: p.to, who: p.who, cls: 'H WORK',
          date: 'TA:' + g.stu.school + '|' + today,
          vars: { 학생명: baseName(g.stu.name), 과제: taskText(g), 접근코드: g.stu.code } });
      });
    });
    if (!confirm('학생 ' + send.length + '명에게 알림톡 ' + items.length + '통을 보낼까요?\n\n' + send.slice(0, 8).map(function(g){ return '· ' + g.stu.name + ' — ' + taskText(g); }).join('\n') + (send.length > 8 ? '\n· 그 밖에 ' + (send.length - 8) + '명' : ''))) return;
    CUR.busy = true; CUR.msg = ''; CUR.err = false; draw();
    myName().then(function(by){
      var ok = 0, dup = 0, fail = [], i = 0;
      function next(){
        if (i >= items.length) return Promise.resolve();
        var chunk = items.slice(i, i + 50); i += 50;
        return post(chunk, by).then(function(j){
          var sent = (j && j.sent) || [];
          if (!sent.length) chunk.forEach(function(x){ fail.push(x.student + '(' + ((j && j.message) || '응답 없음') + ')'); });
          sent.forEach(function(x){ if (x.ok) { if (x.dup) dup++; else ok++; } else fail.push((x.student || '') + '(' + (x.message || '실패') + ')'); });
        }).catch(function(){ chunk.forEach(function(x){ fail.push(x.student + '(연결 끊김)'); }); }).then(next);
      }
      return next().then(function(){
        CUR.busy = false;
        CUR.msg = '보냄 ' + ok + '통' + (dup ? ' · 오늘 이미 보낸 ' + dup + '통은 건너뜀' : '') + (fail.length ? ' · 못 보냄 ' + fail.length + '통: ' + fail.slice(0, 6).join(', ') : '');
        CUR.err = !!fail.length; draw();
        if (ok && window.shuegukActivity) shuegukActivity('H WORK', '미완료 알림톡 한꺼번에', ok + '통', CUR.title, false);
      });
    });
  }
  function open(list, title){
    css();
    var old = document.getElementById('hwa'); if (old) old.remove();
    CUR = { groups: group(list), kinds: { none: true, ing: true }, who: { '학생': true, '학부모1': false, '학부모2': false }, title: title || '', msg: '', err: false, busy: false };
    var box = document.createElement('div'); box.id = 'hwa'; box.innerHTML = '<div class="p"><div class="sub">알림톡 설정을 불러오는 중…</div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function(e){
      if (e.target === box || e.target.closest('[data-x]')) { if (!CUR.busy) box.remove(); return; }
      var k = e.target.closest('[data-kind]'); if (k) { CUR.kinds[k.dataset.kind] = !CUR.kinds[k.dataset.kind]; draw(); return; }
      if (e.target.closest('[data-go]')) { sendAll(); return; }
    });
    box.addEventListener('change', function(e){
      var t = e.target;
      if (t.dataset.who) { CUR.who[t.dataset.who] = t.checked; draw(); return; }
      if (t.dataset.i != null) { CUR.groups[+t.dataset.i].on = t.checked; draw(); }
    });
    loadCfg().then(draw);
  }
  window.HWA = { build: build, state: state, qaNeed: qaNeed, open: open, normGrade: normGrade, stuKey: stuKey, shortTitle: shortTitle, LEFT_RE: LEFT_RE, weekOf: weekOf, weekLabel: weekLabel };
})();

/* 수업에서 처리 · 완료 (2026-11-21 원장님 "교사가 질문답변 리스트를 들고 다니며 학생과 수업 시간 질문 처리를 했을 때
 * 오답을 따로 하지 않고 해당 문항 완료처리하는 기능") — hwork_result.html(문항 카드·답장 기다리는 질문 목록)·hwork_teacher.html 공용.
 * 문항마다: ① 1차 오답이고 아직 클리어 전이면 review[q] 에 cleared_at·via 'class'·class_by(학생 오답하기 없이 클리어 — 정답이 열림)
 *          ② 선생님 확인 checked[q](♥) ③ 마지막 글이 학생 질문이면 '수업 시간에 직접 설명했어요.' 답장(072 트리거가 슈톡 할 일 완료)
 * 남은 오답이 모두 클리어·넘김이면 review_at(오답하기 끝냄)도 채운다. 시각은 다른 기록처럼 한국 'YYYY-MM-DD HH:MM'.
 * req(path, opts) = 교사 신분으로 수파베이스 REST 를 부르고 JSON(또는 null)을 돌려주는 함수(페이지마다 다름). */
(function(){
  var TXT = '수업 시간에 직접 설명했어요.';
  function nowKst(){ var d = new Date(Date.now() + 9*3600e3), p = function(n){ return String(n).padStart(2,'0'); };
    return d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate())+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes()); }
  async function run(req, sid, qs, by){
    qs = (qs || []).map(String);
    var sub = ((await req('/hwork_submissions?select=id,detail,review,review_at,checked&id=eq.'+sid)) || [])[0];
    if(!sub) throw new Error('no_sub');
    var qa = (await req('/hwork_qa?select=q,who&sub_id=eq.'+sid+'&order=id')) || [], last = {};
    qa.forEach(function(m){ last[String(m.q)] = m.who; });
    var at = nowKst(), det = sub.detail || {}, rv = JSON.parse(JSON.stringify(sub.review || {})), ck = Object.assign({}, sub.checked || {});
    var cleared = [];
    qs.forEach(function(q){
      var d = det[q] || {};
      if(d.ok === false && d.type !== 'essay' && !(rv[q] && rv[q].cleared_at)){
        rv[q] = Object.assign({ tries: [] }, rv[q] || {}, { cleared_at: at, via: 'class', class_by: by }); cleared.push(q);
      }
      if(!ck[q]) ck[q] = { at: at, by: by };
    });
    var patch = { review: rv, checked: ck };
    if(!sub.review_at){
      var left = Object.keys(det).filter(function(q){ var d = det[q] || {}, r = rv[q] || {};
        return d.ok === false && d.type !== 'essay' && !(r.cleared_at || r.help || r.error); });
      if(!left.length && Object.keys(rv).length) patch.review_at = at;
    }
    await req('/hwork_submissions?id=eq.'+sid, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body: JSON.stringify(patch) });
    var ask = qs.filter(function(q){ return last[q] === '학생'; });
    if(ask.length) await req('/hwork_qa', { method:'POST', headers:{ Prefer:'return=minimal' },
      body: JSON.stringify(ask.map(function(q){ return { sub_id: Number(sid), q: q, who:'선생님', name: by, body: TXT }; })) });
    return { cleared: cleared, replied: ask, patch: patch };
  }
  window.HWCLASS = { run: run, TXT: TXT };
})();

/* H WORK 선생님별 화면 (2026-11-21 원장님 "H work 를 강사별로 분리해서 보고 싶어요 … 본인의 카드를 누르고 들어가면 각자의 h work 기능이 시작되게")
 * 허브 H WORK 메뉴에서 선생님 카드를 누르면 각 화면 주소에 ?t=선생님 이 붙는다.
 * 이 조각은 ① 그 선생님으로 강사 칸을 고정(HWT.lock)하고 ② 화면 사이 링크에 ?t= 를 이어 붙인다.
 * ?t= 가 없으면(옛 주소·즐겨찾기) 아무것도 하지 않는다 — 예전처럼 강사를 고른다. */
(function(){
  var t = '';
  try { t = (new URLSearchParams(location.search).get('t') || '').trim().slice(0, 40); } catch(e){}
  var tn = /(선생님|대표님)$/.test(t) ? t : t + ' 선생님';   // '박언호대표님'에는 '선생님'을 붙이지 않는다
  var HUB = 'https://coke4497-sys.github.io/shueguk-hub/hwork.html';
  function withT(url){
    if (!t || !url) return url;
    try {
      var u = new URL(url, location.href);
      if (!/\/(shueguk-hub\/hwork|shueguk-h-work\/(homework_key|hwork_assign|hwork_status|hwork_teacher|hwork_result|retest_make))\.html$/.test(u.pathname)) return url;
      u.searchParams.set('t', t);
      return u.href;
    } catch(e){ return url; }
  }
  function badge(el){
    if (!el || !el.parentNode || el.parentNode.querySelector('.hwt-badge')) return;
    var b = document.createElement('div');
    b.className = 'hwt-badge';
    b.style.cssText = 'margin-top:6px;font-size:.8rem;color:#6B5B7B;';
    b.innerHTML = '';
    b.appendChild(document.createTextNode(tn + '의 H WORK입니다. 다른 선생님은 '));
    var a = document.createElement('a'); a.href = HUB; a.textContent = 'H WORK 메뉴'; a.style.color = '#6B5B7B';
    b.appendChild(a); b.appendChild(document.createTextNode('에서 고르세요.'));
    el.parentNode.insertBefore(b, el.nextSibling);
  }
  /* 강사 칸(select·input)을 그 선생님으로 고정한다. 바꿨으면 true. */
  function lock(el){
    if (!t || !el) return false;
    if (el.tagName === 'SELECT'){
      var has = false;
      for (var i = 0; i < el.options.length; i++) if (el.options[i].value === t) has = true;
      if (!has){ var o = document.createElement('option'); o.value = t; o.textContent = t; el.appendChild(o); }
      el.value = t;
    } else {
      el.value = t; el.readOnly = true;
    }
    el.disabled = el.tagName === 'SELECT';
    el.title = tn + '의 H WORK — 다른 선생님은 H WORK 메뉴에서 고르세요';
    badge(el);
    return true;
  }
  /* 담당 강사가 이 선생님인가 — 강사 칸이 빈 옛 배정·과제는 이수경 선생님 것으로 본다(교사 화면들과 같은 규칙) */
  function mine(teacher){
    if (!t) return true;
    var x = String(teacher || '').trim() || '이수경';
    return x === t;
  }
  function fixLinks(){
    if (!t) return;
    var tg = document.querySelector('.tagline');   // 머리 제목 옆 '이수경 선생님' 알약
    if (tg && !tg.querySelector('.hwt-pill')){
      var p = document.createElement('span'); p.className = 'hwt-pill';
      p.style.cssText = 'display:inline-block;margin-left:8px;padding:2px 10px;border-radius:999px;background:#EDE4F4;color:#6B5B7B;font:600 .78rem "Gowun Dodum",sans-serif;vertical-align:middle;';
      p.textContent = tn; tg.appendChild(p);
    }
    var as = document.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++){ var h = as[i].getAttribute('href'); var n = withT(h); if (n !== h) as[i].setAttribute('href', n); }
  }
  window.HWT = { t: t, lock: lock, mine: mine, url: withT, menu: function(){ return withT(HUB); }, fixLinks: fixLinks };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixLinks); else fixLinks();
})();

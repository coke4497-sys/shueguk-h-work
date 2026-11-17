/* 옛한글(중세 국어 — 아래아·반치음·옛이응·방점 등 조합형 자모)을 바르게 보이게 한다 (2026-11-17).
   고운 글꼴·구글 웹 글꼴은 조합형 자모를 한 글자로 모으지 못해 'ᄆᆞᆯ'처럼 풀려 보인다.
   옛한글이 든 낱말을 <span class="oh"> 로 감싸 기기 글꼴(애플 SD 고딕 Neo·Noto Sans CJK·맑은 고딕)로 그린다.
   화면이 innerHTML 로 새로 그릴 때마다 MutationObserver 가 다시 감싼다. */
(function(){
  var OH='[ᄀ-ᇿꥠ-꥿ힰ-퟿〮〯]';
  var TEST=new RegExp(OH), RUN=new RegExp('(?:[가-힣]|'+OH+')*'+OH+'(?:[가-힣]|'+OH+')*','g');
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1,SELECT:1,TITLE:1};
  var st=document.createElement('style');
  st.textContent='.oh{font-family:"Apple SD Gothic Neo","Noto Sans CJK KR","Noto Serif CJK KR","Source Han Sans K","Malgun Gothic","맑은 고딕",sans-serif;}';
  (document.head||document.documentElement).appendChild(st);
  function fixText(t){
    var s=t.nodeValue, p=t.parentNode;
    if(!p||SKIP[p.nodeName]||(p.classList&&p.classList.contains('oh'))||!TEST.test(s)) return;
    var f=document.createDocumentFragment(), last=0, m; RUN.lastIndex=0;
    while((m=RUN.exec(s))){
      if(m.index>last) f.appendChild(document.createTextNode(s.slice(last,m.index)));
      var sp=document.createElement('span'); sp.className='oh'; sp.textContent=m[0]; f.appendChild(sp);
      last=m.index+m[0].length;
    }
    if(last<s.length) f.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(f,t);
  }
  function walk(n){
    if(n.nodeType===3){ fixText(n); return; }
    if(n.nodeType!==1||SKIP[n.nodeName]||(n.classList&&n.classList.contains('oh'))) return;
    if(!TEST.test(n.textContent||'')) return;
    var w=document.createTreeWalker(n,4,null), a=[], x;
    while((x=w.nextNode())) if(TEST.test(x.nodeValue)) a.push(x);
    a.forEach(fixText);
  }
  window.shuegukOH=walk;
  function start(){
    walk(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='characterData') fixText(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.body) start(); else document.addEventListener('DOMContentLoaded',start);
})();

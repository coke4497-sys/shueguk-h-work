/* H WORK 채점 결과 화면 — 학생(hwork.html)과 선생님(hwork_result.html)이 같은 화면을 쓴다 (2026-11-17 원장님 디자인
 * design_handoff_hwork_result — "학생에게도 동일한 화면이 보이고 여기서 교사와 학생이 질문 답변이 가능했으면").
 * 색·서체·간격은 디자인 README 값 그대로. 문항 카드 안에 문제 · 오답하기 기록 · 도움 요청 · 질문·답장 대화 · (학생) 오답하기 칸.
 * RV.draw(el, ctx) — ctx 는 화면마다 만든다:
 *   mode 'student'|'teacher', st {name,school,grade,teacher,code,ts}, got, total, n, detail, review, answers(학생: 클리어한 정답),
 *   away {n,sec}|null, time {first,last,span,act,an,as,breaks,sessions:[{s,e,act,an,as,end}]}|null(2026-11-18 풀이 시간 기록), reviewAt, qa [{id,q,who,name,body,mine,at,files,read}],
 *   hooks: qhtml(q)→{pas,html}|null · fixForm(q)→html(학생) · composer(q)→html · expl(q)→html · files(files)→html · after()
 *   ui {filter, open:Set} 는 RV 가 지킨다. 문항 번호 막대를 누르면 그 카드로 가서 연다. */
(function(){
  const CSS = `
  .rv2{max-width:780px;margin:0 auto;padding:24px 18px 64px;display:flex;flex-direction:column;gap:16px;color:#33443c;font-family:'Gowun Dodum',sans-serif;text-align:left}
  .rv2 .hd{display:flex;flex-direction:column;gap:8px;padding:8px 4px 0}
  .rv2 .hd .ey{font-size:12px;letter-spacing:3px;color:#4b6157}
  .rv2 .hd h1{margin:0;font-family:'Gowun Batang',serif;font-weight:700;font-size:24px;line-height:1.45;color:#2b3a33}
  .rv2 .rvcard{background:#fff;border-radius:24px;padding:24px 22px;display:flex;flex-direction:column;gap:18px}
  .rv2 .rvcard.info{padding:18px 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px 20px}
  .rv2 .rvcard.info span{display:block}
  .rv2 .rvcard.info .k{font-size:12px;color:#8a978f;margin-bottom:4px}
  .rv2 .rvcard.info .v{font-size:15px;color:#2b3a33}
  .rv2 h2{margin:0;display:flex;align-items:baseline;gap:10px;font-family:'Gowun Batang',serif;font-weight:700;font-size:20px;color:#2b3a33}
  .rv2 h2 .no{font-family:'Do Hyeon';font-weight:400;color:#7f9e8e}
  .rv2 .sc{display:flex;flex-wrap:wrap;align-items:center;gap:20px 28px}
  .rv2 .sc .num{display:flex;align-items:baseline;gap:6px}
  .rv2 .sc .g{font-family:'Do Hyeon';font-size:56px;line-height:1;color:#4a3f63}
  .rv2 .sc .t{font-family:'Do Hyeon';font-size:28px;color:#a99fbb}
  .rv2 .sc .p{font-size:14px;color:#8a978f;padding-left:4px}
  .rv2 .strip{flex:1;min-width:240px;display:flex;flex-direction:column;gap:8px}
  .rv2 .rvbar{display:flex;gap:4px}
  .rv2 .rvbar button{flex:1;min-width:0;height:34px;border:0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Do Hyeon';font-size:15px;cursor:pointer;padding:0;position:relative}
  .rv2 .rvbar .qd{position:absolute;top:-4px;right:-3px;width:11px;height:11px;border-radius:50%;background:#8d83a8;box-shadow:0 0 0 2px #fff}
  .rv2 .rvbar .qd.w{background:#d9485f}
  .rv2 .lg i.dot{border-radius:50%;width:9px;height:9px}
  .rv2 .pill.wt{background:#fbe3e6;color:#b03348}
  .rv2 .lg{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#54655c}
  .rv2 .lg span{display:flex;align-items:center;gap:5px}
  .rv2 .lg i{width:10px;height:10px;border-radius:3px;display:inline-block}
  .rv2 .boxes{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
  .rv2 .bx{border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:4px}
  .rv2 .bx .a{font-size:12px}
  .rv2 .bx .b{font-size:14px;color:#2b3a33}
  .rv2 .bx.fix{background:#f1f4f1}.rv2 .bx.fix .a{color:#4b6157}
  .rv2 .bx.away{background:#f7f0dc}.rv2 .bx.away .a{color:#7a6630}
  .rv2 .bx .s{font-size:12px;color:#8a978f}
  .rv2 .bx.tm{background:#eef3f7}.rv2 .bx.tm .a{color:#4f6478}
  .rv2 .tml{border:1px solid #e3e8e4;border-radius:14px;padding:0}
  .rv2 .tml summary{cursor:pointer;list-style:none;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px;color:#2b3a33}
  .rv2 .tml summary::-webkit-details-marker{display:none}
  .rv2 .tml summary .r{font-size:12px;color:#4a3f63;white-space:nowrap}
  .rv2 .tml[open] summary .r::after{content:' 접기'} .rv2 .tml:not([open]) summary .r::after{content:' 펼치기'}
  .rv2 .tmg{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;padding:0 14px 12px}
  .rv2 .tmg div{background:#f6f7f4;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
  .rv2 .tmg .k{font-size:12px;color:#8a978f}.rv2 .tmg .v{font-family:'Do Hyeon';font-size:20px;color:#2b3a33}
  .rv2 .tmrows{display:flex;flex-direction:column;gap:6px;padding:0 14px 14px}
  .rv2 .tmr{display:grid;grid-template-columns:62px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border-radius:12px;background:#fafbf9}
  .rv2 .tmr .no{font-family:'Do Hyeon';font-size:15px;color:#4f6478}
  .rv2 .tmr .w{font-size:14px;color:#2b3a33;line-height:1.55}
  .rv2 .tmr .m{font-size:12.5px;color:#6b776f;line-height:1.5}
  .rv2 .tmr .gap{grid-column:1/-1;font-size:12px;color:#8a978f;padding:2px 0 0}
  .rv2 .tmn{font-size:12px;color:#8a978f;padding:0 14px 12px;line-height:1.55}
  .rv2 .h2row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
  .rv2 .flt{display:flex;gap:4px;background:#f1f4f1;border-radius:999px;padding:4px}
  .rv2 .flt button{border:0;cursor:pointer;padding:7px 12px;border-radius:999px;font-size:13px;background:transparent;color:#54655c;font-family:inherit}
  .rv2 .flt button.on{background:#fff;color:#4a3f63}
  .rv2 .qs{display:flex;flex-direction:column;gap:8px}
  .rv2 .qc{border:1px solid #e3e8e4;border-radius:16px;overflow:hidden;scroll-margin-top:12px}
  .rv2 .qc.un{border-color:#ecd9dd}
  .rv2 .qh2{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px}
  .rv2 .qh2.tg{cursor:pointer}
  .rv2 .bd{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Do Hyeon';font-size:17px}
  .rv2 .an{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;font-size:14px;color:#54655c;min-width:0}
  .rv2 .an>span{min-width:0;overflow-wrap:anywhere}
  .rv2 .an .nwl{flex-basis:100%;color:#a8434f;font-size:13.5px;font-weight:700}
  .rv2 .an b{font-family:'Do Hyeon';font-weight:400;font-size:17px;color:#2b3a33}
  .rv2 .an b.ng{color:#a8434f}
  .rv2 .an .hid{font-size:12.5px;color:#8a978f}
  .rv2 .mk{font-family:'Do Hyeon';font-size:17px}
  .rv2 .ok{color:#4b6157}.rv2 .ng{color:#a8434f}
  .rv2 .stt{display:flex;align-items:center;gap:8px}
  .rv2 .an .hk{color:#d65a86;font-size:12.5px;white-space:nowrap}
  .rv2 .pill{font-size:13px;padding:5px 11px;border-radius:999px;white-space:nowrap}
  /* 좁은 화면 — 상태 알약이 두 줄로 접혀 답 줄('정답 클리어하면 보여요')을 덮지 않게 (2026-11-17) */
  @media (max-width:640px){ .rv2 .pill{white-space:normal;max-width:7.5em;text-align:center;line-height:1.35;border-radius:12px;word-break:keep-all} }
  .rv2 .an .hid{white-space:normal}
  .rv2 .chev{width:16px;font-size:12px;color:#8a978f}
  .rv2 .in{margin:0 14px 14px 66px;display:flex;flex-direction:column;gap:6px}
  .rv2 .an>span{white-space:nowrap}
  @media (max-width:520px){   /* 휴대폰 (2026-11-17 원장님 "선생님 화면도 휴대폰에서 보기 좋게") — 여백을 줄이고 문항 머리는 두 줄로 */
    .rv2{padding:16px 10px 56px;gap:12px}
    .rv2 .hd{padding:4px 6px 0}.rv2 .hd .ey{letter-spacing:1.5px;font-size:11px}.rv2 .hd h1{font-size:21px}
    .rv2 .rvcard{padding:18px 14px;border-radius:20px;gap:14px}
    .rv2 .rvcard.info{padding:14px 16px;grid-template-columns:1fr 1fr;gap:10px 14px}
    .rv2 .sc{gap:12px;flex-direction:column;align-items:stretch}.rv2 .sc .g{font-size:46px}.rv2 .strip{min-width:0;width:100%}
    .rv2 .h2row{gap:8px}.rv2 .flt{width:100%}.rv2 .flt button{flex:1;padding:8px 6px}
    .rv2 .qh2{grid-template-columns:34px minmax(0,1fr);gap:6px 10px;padding:11px 12px}
    .rv2 .qh2 .stt{grid-column:2;flex-wrap:wrap;gap:6px}
    .rv2 .qh2 .chev{margin-left:auto}
    .rv2 .an{gap:4px 12px}
    .rv2 .in{margin:0 10px 12px 10px}
    .rv2 .pill{font-size:12.5px;padding:4px 10px}
  }
  .rv2 .lgc{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;padding:10px 12px;border-radius:12px;background:#fafbf9;border:1px solid #e3e8e4;font-size:14px;line-height:1.5}
  .rv2 .lgc .r{font-family:'Do Hyeon';font-size:14px;color:#7f9e8e}
  .rv2 .lgc .c{display:flex;flex-direction:column;gap:4px;color:#2b3a33;min-width:0;word-break:break-word}
  .rv2 .lab{color:#8a978f;font-size:12px}
  .rv2 .lgc b{font-family:'Do Hyeon';font-weight:400;font-size:16px}
  .rv2 .help{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:#f3eff8;font-size:14px;color:#4a3f63}
  .rv2 .help .at{font-size:12px;color:#8a978f}
  .rv2 .err{padding:10px 12px;border-radius:12px;background:#fbeeea;font-size:14px;color:#8a3f35}
  .rv2 .qbox{border:1px solid #e3e8e4;border-radius:12px;padding:10px 12px;background:#fff}
  .rv2 .qbox summary{cursor:pointer;color:#3d675d;font-size:14px}
  .rv2 .qbox .qbd{margin-top:8px}
  .rv2 .qbox .pas{background:#f4f9f7;border-radius:10px;padding:8px 10px;margin-bottom:8px;max-height:40vh;overflow:auto}
  .rv2 .rvthr{display:flex;flex-direction:column;gap:6px}
  .rv2 .msg{max-width:88%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
  .rv2 .msg.st{align-self:flex-start;background:#f1f4f1;color:#2b3a33}
  .rv2 .msg.tc{align-self:flex-end;background:#f3eff8;color:#2b3a33}
  .rv2 .msg .w{display:block;font-size:12px;color:#4b6157;padding-bottom:2px}
  .rv2 .msg.tc .w{color:#4a3f63}
  .rv2 .msg .w .nw{display:inline-block;background:#a8434f;color:#fff;border-radius:999px;font-size:10.5px;padding:0 6px;margin-left:4px}
  .rv2 .cmp{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;background:#fafbf9;border:1px solid #e3e8e4}
  .rv2 .cmp .lab{font-size:12.5px;color:#4b6157}
  .rv2 .cmp textarea{width:100%;min-height:64px;border:1px solid #dfe5e1;border-radius:10px;padding:9px 11px;font-family:inherit;font-size:14px;background:#fff;resize:vertical;box-sizing:border-box}
  .rv2 .cmp .go{align-self:flex-end;border:0;border-radius:999px;background:#4a3f63;color:#fff;padding:9px 18px;font-size:14px;cursor:pointer;font-family:inherit}
  .rv2 .cmp .go:disabled{opacity:.5}
  .rv2 .cmp .tip{font-size:12px;color:#8a978f}
  /* 정답 번호 — gbank.css 의 덧씌운 동그라미(:before)는 글꼴에 따라 옆으로 밀려 보여서, 이 화면에서는 번호 자체를 칠한다 (2026-11-17 원장님 "정답 선지 색칠이 어긋나 있어요") */
  .rv2 .gq .cn.ok:before,.rv2 .gq .c.ok .cn:before{content:none!important}
  /* 정답 번호 — 원 글자(①~⑤)는 기기마다 글꼴·폭이 달라 어떤 덧칠도 어긋났다(아이폰). 그려 넣은 뒤 ringFix 가 글자를 숫자로 바꾸고 이 동그라미로 그린다 */
  .rv2 .cn.okn{display:inline-flex!important;align-items:center;justify-content:center;flex:none;width:1.2em;height:1.2em;margin-top:.25em;margin-top:calc((1lh - 1.2em) / 2);padding:0;border-radius:50%;background:#5f9488!important;color:#fff!important;font-style:normal;-webkit-text-stroke:0;text-indent:0;line-height:inherit;vertical-align:-.12em;box-sizing:border-box}
  .rv2 .cn.okn b{font-family:'Gowun Dodum',sans-serif;font-size:.74em;font-weight:700;color:#fff}
  .rv2 .cn.okn:before,.rv2 .cn.okn:after{content:none!important;display:none!important}
  .rv2 .pill.hrt{background:#fbe4ea;color:#b0476a}
  .rv2 .und{align-self:flex-start;font-size:12.5px;color:#3d675d;background:#eaf3ee;border-radius:999px;padding:5px 12px}
  /* 답장을 받은 뒤 — 이해했어요 · 다시 질문하기 */
  .rv2 .ack2{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;background:#f6f4fa;border:1px solid #e6e2f2}
  .rv2 .ack2 .q2{font-size:14px;color:#4a3f63}
  .rv2 .ack2 .bb{display:flex;gap:8px;flex-wrap:wrap}
  .rv2 .ack2 button{flex:1;min-width:140px;border:0;border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit;cursor:pointer}
  .rv2 .ack2 .yes{background:#5f9488;color:#fff}
  .rv2 .ack2 .no{background:#fff;color:#4a3f63;box-shadow:inset 0 0 0 1.5px #cfc7e3}
  .rv2 .reask{align-self:flex-start;border:0;background:transparent;color:#4a3f63;text-decoration:underline;text-underline-offset:3px;font-size:13px;cursor:pointer;font-family:inherit;padding:2px 0}
  /* 지난 답장 불러오기 */
  .rv2 .prev{border:1px dashed #cfd8d2;border-radius:10px;background:#fff}
  .rv2 .prev summary{cursor:pointer;padding:8px 11px;font-size:13px;color:#3d675d}
  .rv2 .prev .pl{display:flex;flex-direction:column;gap:6px;padding:0 10px 10px}
  .rv2 .prev .pi{display:flex;gap:8px;align-items:flex-start;background:#f6f8f6;border-radius:9px;padding:8px 10px;font-size:13px}
  .rv2 .prev .pi .tx{flex:1;min-width:0;white-space:pre-line;color:#33443c}
  .rv2 .prev .pi .tx small{display:block;color:#8a978f;font-size:11.5px;margin-bottom:2px}
  .rv2 .prev .pi button{flex:none;border:0;border-radius:999px;background:#e6e2f2;color:#4a3f63;padding:5px 11px;font-size:12.5px;cursor:pointer;font-family:inherit}
  .rv2 .reuse{display:flex;flex-wrap:wrap;gap:6px}
  .rv2 .reuse span{font-size:12.5px;background:#eef5f1;color:#3d675d;border-radius:999px;padding:4px 6px 4px 10px}
  .rv2 .reuse button{border:0;background:#fff;border-radius:50%;width:20px;height:20px;cursor:pointer;color:#a8434f;margin-left:4px}
  .rv2 .sub{border:0;border-radius:999px;background:#f3eff8;color:#4a3f63;padding:8px 14px;font-size:13.5px;cursor:pointer;font-family:inherit;align-self:flex-start}
  .rv2 .expl{font-size:14px;background:#eef6f3;border-radius:12px;padding:10px 12px;color:#24443d}
  .rv2 .expl div{margin-top:3px}
  .rv2 .lock{font-size:13px;color:#8a978f}
  .rv2 .ess .box{background:#f1f4f1;border-radius:12px;padding:10px 12px;font-size:14px;white-space:pre-wrap}
  .rv2 .empty{color:#8a978f;text-align:center;padding:18px 6px;font-size:14px}
  `;
  function css(){ if(document.getElementById('rv2css')) return; const s=document.createElement('style'); s.id='rv2css'; s.textContent=CSS; document.head.appendChild(s); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  const CH='①②③④⑤';
  function show(a, type){ a=String(a==null?'':a); if(a==='') return '무응답'; if(a==='*') return '모두 정답'; return a; }
  function stateOf(c, q){
    const d=c.detail[q]||{}, r=(c.review||{})[q]||{}, tries=r.tries||[];
    if(d.type==='essay') return { k:'essay', label:'서술형 · 예시 답과 비교', bg:'#f1f4f1', fg:'#54655c', nb:'#f1f4f1', nf:'#54655c', bd:'#e3e8e4', tip:'서술형' };
    if(d.ok===true) return { k:'ok', label:'1차 정답', bg:'#dcebe3', fg:'#4b6157', nb:'#8fb3a0', nf:'#fff', bd:'#e3e8e4', tip:'1차 정답' };
    if(r.cleared_at) return { k:'clr', label:r.via==='qa'?'클리어 · 답장 보고 이해':'클리어 · '+Math.max(1,tries.length)+'번째', bg:'#dcebe3', fg:'#4b6157', nb:'#dcebe3', nf:'#4b6157', bd:'#e3e8e4', tip:'오답하기 클리어' };
    if(r.help||(c.qa||[]).some(m=>String(m.q)===String(q)&&m.who==='학생')) return { k:'help', label:'아직 · 질문함', bg:'#e6def0', fg:'#4a3f63', nb:'#f6e6e9', nf:'#a8434f', bd:'#ecd9dd', tip:'질문함', bar:'#e6def0', barf:'#4a3f63' };
    return { k:'todo', label:c.mode==='student'?'오답하기':'아직 · 오답하기', bg:'#f6e6e9', fg:'#a8434f', nb:'#f6e6e9', nf:'#a8434f', bd:'#ecd9dd', tip:'오답하기 전', bar:'#f6e6e9', barf:'#a8434f' };
  }
  function keyOf(c, q){   // 정답 — 선생님은 늘, 학생은 맞았거나 클리어한 문항만
    const d=c.detail[q]||{}, r=(c.review||{})[q]||{};
    if(c.mode==='teacher' || d.ok===true){ const a=d.ans!=null&&d.ans!==''?d.ans:(c.mode==='teacher'&&c.answers?c.answers[q]:null); return a!=null&&a!==''?esc(show(a)):''; }
    if(r.cleared_at && c.answers && c.answers[q]!=null) return esc(show(c.answers[q]));
    return null;
  }
  function filterHit(c, q, f){
    const d=c.detail[q]||{}, r=(c.review||{})[q]||{};
    if(f==='틀린 문항') return d.ok===false;
    if(f==='질문함') return (d.ok===false && !r.cleared_at) || !!qaFlag(c,q);
    return true;
  }
  function msgsOf(c, q){ return (c.qa||[]).filter(m=>String(m.q)===String(q)); }
  // 질문 표시 — 맞힌 문항에 걸린 질문도 번호 막대에서 보이게 (2026-11-19 원장님). 'wait' = 마지막 글이 학생(답장 필요)
  function qaFlag(c, q){ const m=msgsOf(c,q); if(!m.some(x=>x.who==='학생')) return ''; return m[m.length-1].who==='학생'?'wait':'done'; }
  function card(c, q){
    const d=c.detail[q]||{}, r=(c.review||{})[q]||{}, s=stateOf(c,q), tries=r.tries||[], h=c.hooks||{};
    const canOpen=true, open=c.ui.open.has(String(q));
    const mine=d.type==='essay'?'서술형':(d.mine!=null&&String(d.mine)!==''?esc(d.mine):'무응답');
    const key=keyOf(c,q);
    const msgs=msgsOf(c,q), last=msgs[msgs.length-1];
    const newN=c.mode==='student'?msgs.filter(m=>m.who==='선생님'&&!m.read).length:msgs.filter(m=>m.who==='학생'&&!m.read).length;
    const chk=(c.checked||{})[q]||(c.checkDone&&d.type!=='essay'?c.checkDone:null);
    const hk=chk?`<span class="hk" title="${esc((chk.by||'선생님')+' 선생님 확인 · '+String(chk.at||'').slice(5,16))}">♥ 선생님 확인</span>`:'';
    // 새 답장 알림은 답 줄 아래 한 줄로 — 오른쪽 알약에 두면 좁은 화면에서 '정답 클리어하면 보여요'를 덮었다 (2026-11-17 원장님)
    const nw=newN?`<span class="nwl">${c.mode==='student'?'질문에 답장이 왔습니다':'새 질문이 왔습니다'}${newN>1?' · '+newN+'개':''}</span>`:'';
    const qf=qaFlag(c,q);
    const pills=(qf==='wait'?`<span class="pill wt">${c.mode==='student'?'답장 기다림':'답장 필요'}</span>`:'')+`<span class="pill" style="background:${s.bg};color:${s.fg}">${esc(s.label)}</span>`;
    const head=`<div class="qh2 tg" data-rv-tog="${q}"><span class="bd" style="background:${s.nb};color:${s.nf}">${q}</span>
      <div class="an">${d.type==='essay'?'<span>서술형 문항</span>':`<span>${c.mode==='student'?'내 답':'학생 답'} <b class="${d.ok===false?'ng':''}">${mine}</b></span>
        <span>정답 ${key!=null?`<b>${key}</b>`:'<span class="hid">클리어하면 보여요</span>'}</span>
        ${d.ok===true||d.ok===false?`<span class="mk ${d.ok?'ok':'ng'}">${d.ok?'○':'×'}</span>`:''}`}${hk}${nw}</div>
      <div class="stt">${pills}<span class="chev">${open?'▲':'▼'}</span></div></div>`;
    // 학생 질문(마지막 대화 한 줄) — 접혀 있어도 보인다(디자인)
    const peek=(!open && last)?`<div class="in"><div class="msg ${last.who==='선생님'?'tc':'st'}"><span class="w">${last.who==='선생님'?esc(last.name||'선생님')+' 선생님 답장':'학생 질문'}${msgs.length>1?' · 대화 '+msgs.length+'개':''}</span>${esc(last.body==='(첨부 파일)'?'첨부 파일':last.body)}</div></div>`:'';
    let body='';
    if(open){
      const parts=[];
      const qh=h.qhtml?h.qhtml(q):null;
      if(qh&&qh.html) parts.push(`<details class="qbox"${c.mode==='teacher'||d.ok===false?' open':''}><summary>${q}번 문제 보기</summary><div class="qbd">${qh.pas?`<div class="pas">${qh.pas}</div>`:''}${qh.html}</div></details>`);
      if(d.type==='essay') parts.push(`<div class="ess"><div class="lab">${c.mode==='student'?'내 답안':'학생 답안'}</div><div class="box">${esc(d.mine||'')||'—'}</div><div class="lab" style="margin-top:6px">예시 답</div><div class="box">${esc(d.ans||'')}</div></div>`);
      tries.forEach((t,i)=>parts.push(`<div class="lgc"><span class="r">${i+1}차</span><div class="c">
        <span><span class="lab">틀린 답 ${esc(show(t.wrong))} · 고른 이유</span><br>${esc(t.why_wrong||'')}</span>
        <span><span class="lab">다시 고른 답</span> <b class="${t.ok?'ok':'ng'}">${esc(t.pick)} ${t.ok?'○':'×'}</b></span>
        <span><span class="lab">이 답이 정답인 이유</span><br>${esc(t.why_right||'')}</span></div></div>`));
      if(r.error) parts.push(`<div class="err">문항 오류 신고 · ${esc(r.error.text||'')}</div>`);
      if(h.fixForm) { const f=h.fixForm(q); if(f) parts.push(f); }
      if(h.expl) { const x=h.expl(q); if(x) parts.push(x); }
      // 학생이 답장을 보고 '이해했어요'를 누른 때 — 그 뒤에 다시 질문이 없으면 대화 끝에 한 줄
      const und=(c.review||{})[q]&&c.review[q].understood_at;
      const undHtml=und && (!last || String(last.at||'').slice(0,16)<=String(und)) ? `<div class="und">✓ ${c.mode==='student'?'답장을 보고':'학생이 답장을 보고'} '이해했어요'를 눌렀습니다 · ${esc(String(und).slice(5,16))}</div>` : '';
      if(msgs.length) parts.push(`<div class="rvthr">${msgs.map(m=>`<div class="msg ${m.who==='선생님'?'tc':'st'}"><span class="w">${m.who==='선생님'?esc(m.name||'선생님')+' 선생님':(c.mode==='student'?'내 질문':'학생 질문')} · ${esc(String(m.at||'').slice(5,16))}${m.who==='학생'&&m.mine?' · 그때 답 '+esc(m.mine):''}${(c.mode==='student'?m.who==='선생님':m.who==='학생')&&!m.read?'<span class="nw">새</span>':''}</span>${m.body==='(첨부 파일)'&&(m.files||[]).length?'':esc(m.body)}${h.files?h.files(m.files||[], m):''}</div>`).join('')}</div>`);
      if(undHtml) parts.push(undHtml);
      if(h.composer) { const x=h.composer(q); if(x) parts.push(x); }
      body=`<div class="in">${parts.join('')}</div>`;
    }
    return `<div class="qc${s.k==='help'||s.k==='todo'?' un':''}" id="rvq${q}">${head}${peek}${body}</div>`;
  }
  function fmtDur(sec){ sec=Math.max(0,Math.round(Number(sec)||0)); if(sec<60) return sec+'초'; const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60); return (h?h+'시간 ':'')+(m?m+'분':(h?'':'0분')); }
  function fmtT(ms){ const d=new Date(Number(ms)); if(isNaN(d)) return ''; const h=d.getHours(); return (h<12?'오전 ':'오후 ')+((h%12)||12)+':'+String(d.getMinutes()).padStart(2,'0'); }
  function fmtD(ms){ const d=new Date(Number(ms)); if(isNaN(d)) return ''; return (d.getMonth()+1)+'/'+d.getDate()+' ('+'일월화수목금토'[d.getDay()]+')'; }
  const TM_END={ pause:'잠시 멈춤', close:'창을 닫음', idle:'10분 넘게 화면 밖', submit:'제출' };
  /* 풀이 시간 기록 (2026-11-18 원장님) — 구간마다 시작·끝(멈춤/다시 시작)·푼 시간·화면 밖 횟수와 시간 */
  function timeHtml(c){
    const t=c.time; if(!t || !(t.sessions||[]).length) return '';
    const ss=t.sessions, me=c.mode==='student';
    const rows=ss.map((x,i)=>{
      const sameDay=fmtD(x.s)===fmtD(x.e);
      const gap=i? Math.round((x.s-ss[i-1].e)/1000) : 0;
      return `${i?`<div class="gap">↳ ${fmtDur(gap)} 쉬고 다시 시작</div>`:''}<div class="tmr"><span class="no">${ss.length>1?(i+1)+'번째':'한 번에'}</span>
        <div><div class="w">${esc(fmtD(x.s))} ${esc(fmtT(x.s))} ${i?'다시 시작':'시작'} → ${sameDay?'':esc(fmtD(x.e))+' '}${esc(fmtT(x.e))} ${esc(TM_END[x.end]||'멈춤')}</div>
        <div class="m">화면을 보며 푼 시간 ${fmtDur(x.act)}${x.an?` · 화면 밖 ${x.an}회 · ${fmtDur(x.as)}`:' · 화면 밖으로 나가지 않음'}</div></div></div>`; }).join('');
    return `<details class="tml"${me?'':' open'}><summary><span><b>풀이 시간 기록</b> · ${ss.length>1?ss.length+'번에 나눠 풀었어요':'한 번에 풀었어요'}</span><span class="r">자세히</span></summary>
      <div class="tmg"><div><span class="k">화면을 보며 푼 시간</span><span class="v">${fmtDur(t.act)}</span></div>
        <div><span class="k">처음 시작 → 제출</span><span class="v">${fmtDur(t.span)}</span></div>
        <div><span class="k">화면 밖으로 나간 횟수</span><span class="v">${t.an||0}회</span></div>
        <div><span class="k">화면 밖에 있던 시간</span><span class="v">${fmtDur(t.as)}</span></div></div>
      <div class="tmrows">${rows}</div>
      <div class="tmn">'화면 밖'은 푸는 중에 다른 앱으로 넘어가거나 화면을 끈 때입니다. 10분 넘게 나가 있거나 창을 닫으면 그때 멈춘 것으로 보고, 다시 열면 새 구간으로 셉니다.${me?' <a href="https://coke4497-sys.github.io/shueguk-h-work/hwork_time_guide.html" target="_blank" rel="noopener">안내 보기</a>':''}</div></details>`;
  }
  function fmtAway(sec){ sec=Number(sec)||0; const m=Math.floor(sec/60), s=sec%60; return (m?m+'분 ':'')+s+'초'; }
  function ringFix(el){
    el.querySelectorAll('.cn.ok').forEach(n=>{ const t=(n.textContent||'').trim(); const k='①②③④⑤⑥⑦⑧⑨'.indexOf(t); const d=n.getAttribute('data-d')||(k>=0?String(k+1):t.replace(/[^0-9]/g,'')); if(!d) return; n.innerHTML='<b>'+d+'</b>'; n.classList.add('okn'); n.setAttribute('aria-label','정답 '+d+'번'); });
  }
  function draw(el, c){
    css(); el._rv=c;
    c.ui=c.ui||{ filter:'전체', open:new Set() };
    const n=c.n||Object.keys(c.detail||{}).length, qs=[]; for(let q=1;q<=n;q++) qs.push(q);
    const st=c.st||{};
    const wrong=qs.filter(q=>(c.detail[q]||{}).ok===false), clr=wrong.filter(q=>((c.review||{})[q]||{}).cleared_at);
    const help=wrong.filter(q=>stateOf(c,q).k==='help');
    const pct=c.total?Math.round(c.got/c.total*100):0;
    const info=[['이름',st.name],['학교',st.school],['학년',st.grade],['담당 강사',st.teacher],['제출일',st.ts]].filter(x=>x[1]);
    const bar=qs.map(q=>{ const s=stateOf(c,q); const bg=s.k==='ok'?'#8fb3a0':s.k==='clr'?'#dcebe3':s.k==='essay'?'#f1f4f1':(s.bar||'#e6def0'); const fg=s.k==='ok'?'#fff':s.k==='clr'?'#4b6157':s.k==='essay'?'#8a978f':(s.barf||'#4a3f63');
      const qf=qaFlag(c,q), qt=qf==='wait'?(c.mode==='student'?' · 질문 답장 기다림':' · 질문 답장 필요'):qf==='done'?' · 질문 답장함':'';
      return `<button type="button" data-rv-bar="${q}" class="${qf?'hasq':''}" title="${q}번 · ${esc(s.tip)}${qt} — 누르면 그 문항으로" style="background:${bg};color:${fg}">${q}${qf?`<i class="qd${qf==='wait'?' w':''}"></i>`:''}</button>`; }).join('');
    const qWait=qs.filter(q=>qaFlag(c,q)==='wait'), qDone=qs.filter(q=>qaFlag(c,q)==='done');
    const boxes=[];
    if(wrong.length) boxes.push(`<div class="bx fix"><span class="a">오답하기${c.reviewAt?' · 마침 '+esc(c.reviewAt):''}</span><span class="b">틀린 ${wrong.length}문항 중 <b>${clr.length}문항</b> 클리어${help.length?' · 질문함 '+help.length:''}</span></div>`);
    if(c.time && (c.time.sessions||[]).length) boxes.push(`<div class="bx tm"><span class="a">풀이 시간</span><span class="b"><b>${fmtDur(c.time.act)}</b>${c.time.breaks?` · ${c.time.breaks+1}번에 나눠 풂`:''}${c.time.an?` · 화면 밖 ${c.time.an}회`:''}</span></div>`);
    else if(c.away && c.away.n>0) boxes.push(`<div class="bx away"><span class="a">푸는 동안 화면을 벗어난 기록</span><span class="b"><b>${c.away.n}회</b> · 모두 ${fmtAway(c.away.sec)} <span class="s">(다른 앱으로 넘어가거나 화면을 끈 경우)</span></span></div>`);
    const list=qs.filter(q=>filterHit(c,q,c.ui.filter));
    el.innerHTML=`<div class="rv2">
      <header class="hd"><span class="ey">이수경국어 · SHUEGUK · H WORK${c.mode==='teacher'?' · 선생님 화면':''}</span><h1>${esc(st.code||'')}</h1></header>
      ${info.length?`<section class="rvcard info">${info.map(x=>`<div><span class="k">${x[0]}</span><span class="v">${esc(x[1])}</span></div>`).join('')}</section>`:''}
      <section class="rvcard"><h2><span class="no">1</span>채점 결과</h2>
        <div class="sc"><div class="num">${c.total?`<span class="g">${c.got}</span><span class="t">/ ${c.total}</span><span class="p">${pct}점</span>`:'<span class="p">채점하는 문항이 없습니다.</span>'}</div>
          <div class="strip"><div class="rvbar">${bar}</div>
            <div class="lg"><span><i style="background:#8fb3a0"></i>1차 정답</span><span><i style="background:#dcebe3"></i>오답하기 클리어</span><span><i style="background:#e6def0"></i>질문함</span>${wrong.some(q=>stateOf(c,q).k==='todo')?'<span><i style="background:#f6e6e9"></i>오답하기 전</span>':''}${qWait.length?`<span><i class="dot" style="background:#d9485f"></i>${c.mode==='student'?'답장 기다리는 질문':'답장 필요한 질문'} ${qWait.map(q=>q+'번').join('·')}</span>`:''}${qDone.length?'<span><i class="dot" style="background:#8d83a8"></i>답장한 질문</span>':''}<span style="color:#8a978f">번호를 누르면 그 문항으로 가요</span></div></div></div>
        ${boxes.length?`<div class="boxes">${boxes.join('')}</div>`:''}
        ${timeHtml(c)}
        ${c.note?`<div class="lock">${c.note}</div>`:''}
      </section>
      ${c.extra||''}
      <section class="rvcard" style="gap:14px"><div class="h2row"><h2><span class="no">2</span>문항별 채점</h2>
        <div class="flt">${['전체','틀린 문항','질문함'].map(f=>`<button type="button" data-rv-flt="${f}" class="${c.ui.filter===f?'on':''}">${f}</button>`).join('')}</div></div>
        <div class="qs">${list.length?list.map(q=>card(c,q)).join(''):'<div class="empty">여기에 해당하는 문항이 없습니다.</div>'}</div>
      </section></div>`;
    ringFix(el);
    if(!el._rvBound){ el._rvBound=true;
      el.addEventListener('click', e=>{
        const cx=el._rv; if(!cx) return;
        const f=e.target.closest('[data-rv-flt]'); if(f){ cx.ui.filter=f.dataset.rvFlt; draw(el,cx); return; }
        const b=e.target.closest('[data-rv-bar]'); if(b){ const q=b.dataset.rvBar; cx.ui.filter='전체'; cx.ui.open.add(q); draw(el,cx); const t=document.getElementById('rvq'+q); if(t) t.scrollIntoView({ behavior:'smooth', block:'start' }); if(cx.hooks&&cx.hooks.opened) cx.hooks.opened(q); return; }
        const g=e.target.closest('[data-rv-tog]'); if(g && !e.target.closest('button,textarea,input,a,summary,select')){ const q=g.dataset.rvTog;
          const top=g.getBoundingClientRect().top;
          if(cx.ui.open.has(q)) cx.ui.open.delete(q); else { cx.ui.open.add(q); if(cx.hooks&&cx.hooks.opened) cx.hooks.opened(q); }
          draw(el,cx); const g2=document.getElementById('rvq'+q); if(g2) window.scrollBy(0, g2.getBoundingClientRect().top-top);
        }
      });
    }
    if(c.hooks&&c.hooks.after) c.hooks.after();
  }
  function openDefault(c){   // 처음 열린 문항 — 아직 클리어하지 못한 오답(학생) / 오답하기 기록·질문이 있는 오답(선생님)
    const n=c.n||Object.keys(c.detail||{}).length, set=new Set();
    for(let q=1;q<=n;q++){ const d=c.detail[q]||{}, r=(c.review||{})[q]||{}, has=(r.tries||[]).length||r.help||msgsOf(c,q).length;
      if(d.ok===false && (c.mode==='student' ? !r.cleared_at : has)) set.add(String(q));
      else if(c.mode==='teacher' && qaFlag(c,q)==='wait') set.add(String(q)); }
    return set;
  }
  window.RV={ draw, openDefault, stateOf, esc, fmtDur };
})();

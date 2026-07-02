/**
 * 이수경국어 · H WORK 자동 채점 시스템 — 채점·저장 서버 (백엔드)
 * Google Apps Script · 새 구글 스프레드시트에 연결해서 사용합니다.
 *
 * [시트 2개 — 코드가 자동으로 만들어 줍니다]
 *  · HWORK목록 : A=강사, B=제목, C=데이터(JSON)   ← 출제 도구가 저장
 *  · 제출기록   : 학생 제출이 자동으로 한 줄씩 쌓임
 *
 * [딱 하나 직접 할 일]
 *  · 아래 SS_ID 의 따옴표 안에 "스프레드시트 ID" 를 붙여넣으세요.
 *    (스프레드시트 주소에서  /d/  와  /edit  사이의 긴 문자열)
 */

const SS_ID = '1nFZ2HVAnCyCv_NOoAPXhA1VC_T7BBqwUWNWBta4-qFE';
function SS(){ return SpreadsheetApp.openById(SS_ID); }

const SHEET_HW  = 'HWORK목록';
const SHEET_SUB = '제출기록';

function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ───────── 읽기 요청 (학생·교사 화면이 GET으로 호출) ─────────
function doGet(e){
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  try{
    if(action === 'ping')      return jsonOut({ ok:true, msg:'H WORK 서버 정상 작동 중' });
    if(action === 'list')      return jsonOut({ ok:true, list: listHomeworks() });
    if(action === 'meta')      return jsonOut({ ok:true, meta: getMeta(e.parameter.teacher, e.parameter.code) });
    if(action === 'responses') return jsonOut({ ok:true, list: getResponses() });
    if(action === 'report')    return jsonOut({ ok:true, report: getReport(Number(e.parameter.row)) });
    return jsonOut({ ok:false, error:'알 수 없는 요청: ' + action });
  }catch(err){
    return jsonOut({ ok:false, error:String(err) });
  }
}

// ───────── 쓰기 요청 (저장·제출, POST) ─────────
function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents);
    if(body.action === 'saveHomework') return jsonOut(saveHomework(body.data));
    if(body.action === 'submit')       return jsonOut(submit(body.data));
    return jsonOut({ ok:false, error:'알 수 없는 요청: ' + body.action });
  }catch(err){
    return jsonOut({ ok:false, error:String(err) });
  }
}

// ───────── HWORK목록 시트 ─────────
function hwSheet(){
  const ss = SS();
  let sh = ss.getSheetByName(SHEET_HW);
  if(!sh){ sh = ss.insertSheet(SHEET_HW); sh.appendRow(['강사','제목','데이터']); }
  return sh;
}
function listHomeworks(){
  const v = hwSheet().getDataRange().getValues();
  const out = [];
  for(let i=1;i<v.length;i++){ if(v[i][0] && v[i][1]) out.push({ teacher:String(v[i][0]), code:String(v[i][1]) }); }
  return out;
}
function findHomeworkRow(teacher, code){
  const v = hwSheet().getDataRange().getValues();
  for(let i=1;i<v.length;i++){
    if(String(v[i][0])===String(teacher) && String(v[i][1])===String(code)) return { row:i+1, data:v[i][2] };
  }
  return null;
}
function loadHomework(teacher, code){
  const f = findHomeworkRow(teacher, code);
  if(!f) throw new Error('H WORK을 찾을 수 없습니다: ' + teacher + ' / ' + code);
  if(!f.data) throw new Error('정답 데이터(C칸)가 비어 있습니다.');
  return JSON.parse(f.data);
}

// 출제 도구 → 저장 (같은 강사+제목이 있으면 덮어쓰기)
function saveHomework(data){
  if(!data || !data.teacher || !data.code) return { ok:false, error:'강사와 제목이 필요합니다.' };
  const sh = hwSheet();
  const json = JSON.stringify(data);
  const f = findHomeworkRow(data.teacher, data.code);
  if(f){ sh.getRange(f.row,1,1,3).setValues([[ data.teacher, data.code, json ]]); }
  else { sh.appendRow([ data.teacher, data.code, json ]); }
  return { ok:true, msg:'저장되었습니다: ' + data.teacher + ' / ' + data.code };
}

// 학생 화면용 메타 (정답은 절대 보내지 않음)
function getMeta(teacher, code){
  const hw = loadHomework(teacher, code);
  const items = {};
  Object.keys(hw.items || {}).forEach(function(q){ items[q] = { type: hw.items[q].type }; });
  return { teacher: hw.teacher || teacher, code: hw.code || code,
           count: Number(hw.count) || 0, schools: hw.schools || [], items: items };
}

// ───────── 채점 ─────────
function norm(s){ return String(s==null?'':s).replace(/\s+/g,'').toLowerCase(); }
function isTextCorrect(studentAns, modelAns){
  if(modelAns == null || String(modelAns).trim() === '') return false;
  const full  = norm(studentAns);                                          // 공백 제거한 학생 답 전체
  const parts = String(studentAns).split(/[,，]/).map(norm).filter(function(x){ return x !== ''; });  // 쉼표로 나눈 조각
  const groups = String(modelAns).split(/[,，]/).map(function(g){ return g.trim(); }).filter(function(g){ return g !== ''; });
  if(!groups.length) return false;
  // 쉼표로 구분된 키워드를 "모두" 포함해야 정답(순서 무관). 각 키워드의 빗금(/)은 "대체 표현(택일)".
  return groups.every(function(g){
    const alts = g.split('/').map(norm).filter(function(a){ return a !== ''; });
    return alts.some(function(a){ return parts.indexOf(a) !== -1 || (a.length >= 2 && full.indexOf(a) !== -1); });
  });
}
function gradeOne(item, studentAns){
  if(!item) return false;
  if(item.type === 'text') return isTextCorrect(studentAns, item.ans);
  return String(studentAns) === String(item.ans);   // choice5 · ox 공통
}

function submit(data){
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const hw = loadHomework(data.teacher, data.code);
    const count = Number(hw.count) || 0;
    const detail = {};
    let got = 0;
    for(let q=1;q<=count;q++){
      const item = (hw.items && hw.items[q]) ? hw.items[q] : {};
      const mine = (data.answers && data.answers[q] != null) ? data.answers[q] : '';
      const ok = gradeOne(item, mine);
      if(ok) got++;
      detail[q] = { type:item.type, mine:String(mine), ans:String(item.ans==null?'':item.ans), ok:ok };
    }
    saveSubmission(data, got, count, detail);
    return { ok:true,
      result: { got:got, total:count, detail:detail },
      student: { teacher:data.teacher, code:data.code, school:data.school, grade:data.grade, name:data.name } };
  } finally {
    lock.releaseLock();
  }
}

// ───────── 제출기록 시트 ─────────
function subSheet(){
  const ss = SS();
  let sh = ss.getSheetByName(SHEET_SUB);
  if(!sh) sh = ss.insertSheet(SHEET_SUB);
  if(sh.getLastRow() === 0){
    sh.appendRow(['제출시각','강사','제목','학교','학년','이름','맞은개수','총문항','답안(JSON)','정오(JSON)','질문(JSON)']);
  } else if(sh.getLastColumn() < 11){
    sh.getRange(1, 11).setValue('질문(JSON)');   // 기존 시트에 질문 칸 헤더 보강
  }
  return sh;
}
function saveSubmission(data, got, total, detail){
  subSheet().appendRow([
    new Date(), data.teacher, data.code, data.school, data.grade, data.name,
    got, total, JSON.stringify(data.answers || {}), JSON.stringify(detail),
    JSON.stringify(data.questions || {})
  ]);
}

// ───────── 교사 확인용 ─────────
function getResponses(){
  const sh = SS().getSheetByName(SHEET_SUB);
  if(!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues();
  const out = [];
  for(let i=1;i<v.length;i++){
    const r = v[i];
    let qc = 0; try{ qc = Object.keys(JSON.parse(r[10] || '{}')).length; }catch(e){}
    out.push({ row:i+1, submittedAt:''+r[0], teacher:''+r[1], code:''+r[2],
      school:''+r[3], grade:''+r[4], name:''+r[5], got:''+r[6], total:''+r[7], qCount:qc });
  }
  out.reverse();
  return out;
}
function getReport(rowNum){
  const sh = SS().getSheetByName(SHEET_SUB);
  const v = sh.getDataRange().getValues();
  const r = v[rowNum-1];
  if(!r) throw new Error('해당 행을 찾을 수 없습니다: ' + rowNum);
  let detail = {};
  try{ detail = JSON.parse(r[9] || '{}'); }catch(e){}
  let questions = {};
  try{ questions = JSON.parse(r[10] || '{}'); }catch(e){}
  return {
    student: { teacher:''+r[1], code:''+r[2], school:''+r[3], grade:''+r[4], name:''+r[5] },
    result:  { got:Number(r[6]), total:Number(r[7]), detail:detail },
    questions: questions,
    submittedAt: '' + r[0]
  };
}

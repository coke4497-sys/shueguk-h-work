# AGENTS.md — 슈국 H WORK (shueguk-h-work)

학생 과제 제출·자동 채점 시스템입니다. 학생 제출 `hwork.html`, 출제 `homework_key.html`, 과제 관리 `hwork_assign.html`, 교사 확인 `hwork_teacher.html`,
안내 `hwork_guide.html`·`hwork_student_guide.html`, 백엔드 `apps-script/Code.gs`. 자세한 이력은 리포트 저장소 `shueguk-report/CLAUDE.md`의 'H WORK' 절에 있습니다.

## Review guidelines

- 리뷰 댓글은 **한국어**로, 비개발자(학원 원장)도 읽을 수 있게 쉬운 말로 씁니다.
- 제출이 사라지거나 중복되는 문제, 마감이 지난 제출이 들어가는 문제를 최우선으로 봅니다.

## Code Review Rules

- **학생 제출의 원본은 수파베이스**(`hwork_list`/`hwork_meta`/`hwork_submit` RPC, 채점 포함). 성공 시 옛 백엔드에 시트 사본 제출을 뒤에서 보내고, RPC 호출 실패 시에만 옛 경로 폴백. **마감 등 판정으로 거절된 제출은 폴백하지 않습니다.** 거절을 폴백으로 넣는 변경은 지적하세요.
- 과제(출제·마감·삭제)의 원본은 여전히 시트·백엔드입니다(`hwork_homeworks`는 미러).
- **마감은 서버가 판정**합니다(HWORK목록 D열, yyyy-MM-dd 텍스트, 마감일 밤 11:59까지 허용, 다음 날부터 거절). 화면에서만 막고 서버 판정을 빼는 변경은 지적하세요. 빈 값 = 기한 없음.
- 재제출 제한이 없으므로 시상·판정은 **학생별 첫 제출** 기준입니다.
- 결과·목록 API 응답 형식(`list`·`meta`·`responses`·`report`)을 바꾸면 어휘 출제 페이지(`saveHomework` 연동)와 학생 페이지가 깨질 수 있습니다. PR 설명에 "재배포 필요"와 영향 범위가 있어야 합니다.
- 구글시트에 날짜·문구를 쓸 때는 텍스트 강제(`setNumberFormat('@')`), 읽을 때는 Date 객체도 허용.
- 학생 선택은 공용 위젯(리포트 저장소 `student-picker.js/.css`)을 씁니다. 복사본을 만들거나 공용 CSS를 고치지 않습니다.
- Apps Script 재배포는 기존 배포 ID를 새 버전으로 올립니다. 새 배포(주소 변경) 금지.
- 폰트는 고운 바탕·고운 돋움·도현체만. UI에 컬러 이모지 아이콘 금지. 상자 왼쪽 색 띠 금지.

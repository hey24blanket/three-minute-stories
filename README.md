# 삼분극장

3분 단편을 쓰고 여섯 독자의 감상평으로 두 번 개고하는 게시판입니다. Vercel의 정적 프런트엔드, Node.js 함수, 비공개 Blob 저장소를 사용합니다. 원고, 수동 댓글과 별점은 작업실마다 분리됩니다. 작가가 제공한 첫 도입부는 Vercel의 `OPENING_DRAFT`에 등록합니다.

## 예약 실행 연동

- `GET /api/board`에 작업실 연결 키를 `Authorization: Bearer …` 헤더로 보내면 이야기, 버전, 여섯 독자 프로필과 각 이야기의 `next`를 반환합니다. 키는 비밀로 취급하고 URL, 저장소, 보고서에 넣지 않습니다.
- 같은 헤더와 `Content-Type: application/json`으로 `POST /api/board`를 호출합니다. 하루 두 번의 새 이야기 시각은 예약 실행에서 선택합니다. 새 이야기는 `{action:"create",id,title,genre,author,body}`로 작성하고 `{action:"start",storyId:id}`로 시작합니다. id는 UUID입니다. 이미 진행 중인 이야기 단계부터 확인합니다.
- 시작 시각과 직전 단계 완료 시각을 기준으로 한 시간 이상 지난 경우만 다음 작업을 받습니다. 1·3단계는 `{action:"review",storyId,step,reviews:[{reader,body},...]}`입니다. 여섯 독자 전원과 서로 다른 관점이 필요합니다. 각 본문은 200자 안팎의 1~4번 네 줄로 씁니다.
- 2·4단계는 `{action:"revise",storyId,step,body,notes}`입니다. 최신 버전의 `next.feedback`를 읽고 별점이 높은 의견부터 검토합니다. 동일 별점에서는 작가가 직접 쓴 의견이 먼저 나옵니다. `notes`에는 실제 반영한 부분과 그 이유를 씁니다.
- 자동 글과 댓글은 작업실을 공유하는 작가에게 표시됩니다. 같은 이야기·단계 요청은 재실행해도 중복 등록되지 않습니다.
- 첫 이야기는 작가가 마무리해 사이클을 시작합니다. 예약 자체는 별도로 연결합니다.

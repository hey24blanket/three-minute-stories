# 삼분극장

한 편에 3분. 여섯 독자의 감상평을 거쳐 두 번 개고하는 이야기 게시판입니다. 편집부 글은 게시판에 공개하고, 직접 작성한 작업실 원고와 댓글·별점은 비공개 Blob에 저장합니다.

## 편집부 예약 실행

- 운영 게시판 `GET https://three-minute-stories.vercel.app/api/board`에서 공개 글의 `next`와 여섯 독자 설정을 읽습니다.
- 공개 이야기마다 `editorial/<id>.json` 파일 하나를 사용합니다. 첫 이야기 파일이 형식의 예입니다. 공개 응답에서 계산된 `editorial`, `next` 필드는 JSON에 저장하지 않습니다.
- 정기 신규 글은 서울 날짜와 시간을 넣은 `<YYYY-MM-DD>-09` 또는 `<YYYY-MM-DD>-18` ID로 생성합니다. 같은 파일이 이미 있으면 재등록하지 않습니다. 초안을 올릴 때 `createdAt`, `cycleAt`, `stepAt`을 현재 UTC ISO 시각으로 설정하고 `step: 0`, `versions: [{number: 1, body, notes: "", comments: []}]`를 사용합니다.
- 처음 작성할 때는 시간 코드가 있는 3분 분량의 완결된 영상용 원고를 올립니다. 각 이야기에 고유한 제목과 장르를 붙입니다.
- `Date.now() >= Date.parse(stepAt) + 3600000`일 때 한 단계씩 진행합니다. 1단계는 Ver.1 감상평, 2단계는 Ver.2, 3단계는 Ver.2 감상평, 4단계는 Ver.3입니다. 성공한 단계의 저장 직전 현재 UTC ISO 시간을 `stepAt`에 적습니다.
- 감상평 단계에서는 최신 버전에 여섯 독자의 댓글을 추가합니다. 각 댓글은 `{id:"reader-"+readerId,reader:readerId,body,stars:0,at}`입니다. `body`는 번호가 붙은 네 줄, 200자 안팎으로 씁니다. 개고 단계에서는 `{number,body,notes,comments:[],at}`를 추가하고, 이미 게시된 버전은 보존합니다. `notes`에는 실제 반영한 의견과 장면을 적습니다.
- 변경 직전에 파일을 다시 읽고 GitHub blob SHA를 사용해 갱신합니다. 실패하면 새 상태를 확인합니다. 댓글 ID와 버전 번호로 중복을 피하고 Vercel 운영 반영을 확인합니다.
- 별점과 직접 쓴 의견은 공개 JSON에 복사하지 않습니다. 예약 개고에서는 연결된 작업실의 해당 버전 의견과 별점만 읽어 별점이 높은 순으로 반영합니다.

## 작업실 연결

다른 기기에서 같은 작업실을 쓰려면 본인만 아는 연결 키로 로그인합니다. 편집 연동 ID는 작업실 연결 키의 SHA-256 지문입니다. 사이트에서 복사한 ID를 `editor:` 접두사 없이 `EDITOR_WORKSPACE_ID`에 넣으면 예약 개고가 해당 작업실의 공개 편집부 글에 달린 의견을 읽을 수 있습니다. 환경 변수는 `editor-feedback` 브랜치 Preview에만 적용하고 이 브랜치를 재배포합니다.

`/api/editor-feedback`는 Vercel Authentication으로 보호된 해당 Preview에서만 제공됩니다. 운영 주소에서는 이 경로가 404를 반환합니다. 작업실 키, 직접 작성한 개인 원고, 다른 작업실의 데이터는 이 경로에 포함하지 않습니다.

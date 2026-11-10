export const hour = 3600000;
export const genres = ['판타지', '드라마', 'SF', '미스터리', '코미디', '기타'];

export const readers = [
  {id:'haeon',name:'윤해온',role:'단편 편집자',mark:'01',tone:'첫 문장에서 마지막 문장까지 무엇이 남는지 본다.',focus:'도입의 약속, 마지막 이미지, 설명을 덜어낼 자리. 날카롭고 문장이 짧다.'},
  {id:'yujin',name:'문유진',role:'촬영감독',mark:'02',tone:'카메라가 어디에 서야 하는지 먼저 떠올린다.',focus:'구도, 카메라 이동, 스케일 변화와 시각적 연결. 화면에 보이는 것을 구체적으로 말한다.'},
  {id:'taeo',name:'강태오',role:'판타지 세계 설계자',mark:'03',tone:'낯선 세계가 스스로 굴러가는 법을 묻는다.',focus:'세계의 규칙과 대가, 소품과 행동을 통한 세계관 전달. 원인과 결과를 따진다.'},
  {id:'mira',name:'백미라',role:'인물 연출가',mark:'04',tone:'인물이 무엇을 잃을까 두려워하는지 읽는다.',focus:'욕망, 관계, 행동으로 드러나는 선택. 표정 하나나 망설임 하나를 짚는다.'},
  {id:'sumin',name:'오수민',role:'사운드 디자이너',mark:'05',tone:'숨, 침묵, 나레이션 사이의 간격을 듣는다.',focus:'나레이션, 소리와 무음, 리듬, 시점별 청각. 듣는 순간을 묘사한다.'},
  {id:'dabin',name:'정다빈',role:'첫 관객',mark:'06',tone:'세 분 동안 어디서 궁금했고 어디서 멀어졌는지 말한다.',focus:'첫 관람의 직관, 감정과 이해, 3분 호흡. 전문용어 없이 솔직하게 쓴다.'},
  {id:'art',name:'서정원',role:'아트 디렉터',mark:'07',tone:'장면의 정서에 어울리는 재료와 색, 인물 실루엣을 찾는다.',focus:'매체와 질감, 빛과 색, 인물의 시각적 연속성. 최근 작품과 구분되는 시각 방향을 구체적으로 제안한다.'}
];

export function starter(body) {
  return {stories: body ? [{
    id:'opening',title:'상자 아래의 세계',genre:'판타지',author:'나',
    createdAt:'2026-11-10T03:00:00.000Z',cycleAt:null,stepAt:null,step:0,
    versions:[{number:1,body,notes:'',comments:[]}]
  }] : []};
}

function fail(status, message) {
  throw Object.assign(new Error(message), {status});
}
function required(value, min, max, label) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    fail(400, label+' 길이를 확인해 주세요.');
  }
  return value.trim();
}
function itemId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
    fail(400,'항목 번호를 확인해 주세요.');
  }
  return value;
}
function draft(input) {
  if (!genres.includes(input.genre)) fail(400,'장르를 골라 주세요.');
  return {title:required(input.title,1,100,'제목'),genre:input.genre,body:required(input.body,1,10000,'본문')};
}
function readerReviews(reviews, at) {
  if (!Array.isArray(reviews)||reviews.length!==readers.length) fail(400,'일곱 평론가의 감상평이 모두 필요합니다.');
  return readers.map(reader=>{
    const matches=reviews.filter(review=>review?.reader===reader.id);
    if (matches.length!==1) fail(400,'독자마다 감상평 하나를 작성해 주세요.');
    const body=required(matches[0].body,130,270,'감상평');
    const lines=body.split('\n');
    if (lines.length!==4 || !lines.every((line,i)=>new RegExp('^'+(i+1)+'[.)]\\s+\\S').test(line))) {
      fail(400,'감상평은 1번부터 4번까지 네 줄로 작성해 주세요.');
    }
    const visual=matches[0].visual;
    if (!Array.isArray(visual)||visual.length!==3) fail(400,'이미지 의견은 세 줄이 필요합니다.');
    const visualLines=visual.map(line=>required(line,1,180,'이미지 의견'));
    if (visualLines.some(line=>/[\r\n]/.test(line))) fail(400,'이미지 의견은 항목당 한 줄로 작성해 주세요.');
    return {id:'reader-'+reader.id,reader:reader.id,body,visual:visualLines,stars:0,at};
  });
}

export function apply(board, input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400,'요청 형식이 올바르지 않습니다.');
  const at=new Date(now).toISOString();
  if (input.action==='create') {
    const id=itemId(input.id);
    if (board.stories.some(story=>story.id===id)) return false;
    if (board.stories.length>=250) fail(409,'이 작업실의 이야기 보관 한도에 도달했습니다.');
    const {title,genre,body}=draft(input);
    board.stories.unshift({id,title,genre,author:required(input.author,1,25,'작성자'),createdAt:at,cycleAt:null,
      stepAt:null,step:0,versions:[{number:1,body,notes:'',comments:[]}]});
    return true;
  }

  const story=board.stories.find(item=>item.id===input.storyId);
  if (!story) fail(404,'이야기를 찾을 수 없습니다.');
  if (input.action==='edit') {
    if (story.cycleAt) fail(409,'사이클이 시작된 초안은 보존됩니다.');
    const {title,genre,body}=draft(input);
    story.title=title;
    story.genre=genre;
    story.versions[0].body=body;
    return true;
  }
  if (input.action==='start') {
    if (story.cycleAt) return false;
    story.cycleAt=at;
    story.stepAt=at;
    return true;
  }

  if (input.action==='comment' || input.action==='rate') {
    const version=story.versions.find(item=>item.number===input.version);
    if (!version) fail(404,'해당 버전이 아직 없습니다.');
    if (input.action==='comment') {
      const id=itemId(input.id);
      if (version.comments.some(comment=>comment.id===id)) return false;
      if (version.comments.length>=200) fail(409,'이 버전의 댓글 보관 한도에 도달했습니다.');
      version.comments.push({id,reader:null,body:required(input.body,1,2000,'댓글'),stars:0,at});
      return true;
    }
    if (!Number.isInteger(input.stars)||input.stars<0||input.stars>5) fail(400,'별점은 0부터 5까지입니다.');
    const comment=version.comments.find(item=>item.id===input.commentId);
    if (!comment) fail(404,'댓글을 찾을 수 없습니다.');
    if (comment.stars===input.stars) return false;
    comment.stars=input.stars;
    return true;
  }

  if (!['review','revise'].includes(input.action)) fail(400,'지원하지 않는 작업입니다.');
  if (!Number.isInteger(input.step) || input.step<1 || input.step>4) fail(400,'사이클 단계를 확인해 주세요.');
  const reviewing=input.step%2===1;
  if (input.action!==(reviewing?'review':'revise')) fail(409,'이 단계와 작업이 맞지 않습니다.');
  if (input.step<=story.step) return false;
  if (!story.cycleAt || input.step!==story.step+1) fail(409,'앞 단계가 먼저 완료되어야 합니다.');
  if (now < Date.parse(story.stepAt)+hour) fail(409,'이전 단계 완료 후 한 시간이 지나야 합니다.');

  if (reviewing) story.versions.at(-1).comments.push(...readerReviews(input.reviews,at));
  else story.versions.push({number:story.versions.length+1,body:required(input.body,1,10000,'개고 본문'),
    notes:required(input.notes,1,2000,'피드백 반영 기록'),comments:[],at});
  story.step=input.step;
  story.stepAt=at;
  return true;
}

const editorialBoostStart = Date.parse('2026-11-10T08:03:35Z');
const editorialBoostEnd = Date.parse('2026-11-11T04:03:35Z');

export function nextEditorialStep(story, now = Date.now()) {
  const completed = Date.parse(story.stepAt);
  const acceleratedDue = Math.max(completed + hour / 2, editorialBoostStart);
  const accelerated = story.editorial && now >= editorialBoostStart && now < editorialBoostEnd &&
    acceleratedDue < editorialBoostEnd;
  return {dueAt: new Date(accelerated ? acceleratedDue : completed + hour).toISOString(),
    intervalMinutes: accelerated ? 30 : 60};
}

export function reviewQueue(story) {
  const version=story.versions.at(-1);
  const next=story.cycleAt&&story.step<4?{
    step:story.step+1,
    action:story.step%2===0?'review':'revise',
    ...nextEditorialStep(story),
    feedback:[...version.comments].sort((a,b)=>b.stars-a.stars || Number(Boolean(a.reader))-Number(Boolean(b.reader)))
  }:null;
  return {...story,next};
}


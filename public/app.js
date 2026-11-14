import {renderEtymology} from './etymology.js';
import {splitScenes, validIllustrationSource} from './illustrations.js';

const panel=document.querySelector('#main-panel');
const sidebar=document.querySelector('#sidebar');
const modal=document.querySelector('#modal');
const notice=document.querySelector('#status');
const storageKey='three-minute-stories/workspace';
const genres=['판타지','드라마','SF','미스터리','코미디','기타'];
const steps=['초안 공개','초안 감상평','Ver.2 개고·삽화','Ver.2 감상평','Ver.3 완성'];
const descriptions=['3분 분량의 이야기를 올리고 사이클을 시작합니다.','일곱 평론가가 각자의 관점으로 감상평 네 줄과 이미지 제안 세 줄을 남깁니다.','별점이 높은 댓글과 직접 남긴 의견을 먼저 읽고 개고한 뒤 인물과 씬별 대표 삽화를 붙입니다.','일곱 평론가가 삽화가 들어간 두 번째 버전을 읽고 글과 이미지에 의견을 남깁니다.','두 번째 감상평을 참고해 최종 원고를 다듬고 씬마다 삽화 두 장에서 네 장을 붙입니다.'];
const keyPattern=/^[a-f0-9]{64}$/;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let key=localStorage.getItem(storageKey)||'';
let data={stories:[],readers:[]};
let filter='all';
let search='';
let busy=false;

function stamp(iso, clock=false) {
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',...(clock?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(iso));
}
function route() {
  const [page,id,version]=(location.hash.slice(1)||'list').split('/');
  return {page,id,version:Number(version)||1};
}
function go(path) {
  if (location.hash==='#'+path) render();
  else location.hash=path;
}
function timeline(full=false) {
  return '<ol class="timeline">'+steps.map((title,i)=>'<li><time>'+ (i===0?'시작':'+'+i+'시간') +'</time><span><strong>'+title+'</strong>'+(full?'<br>'+descriptions[i]:'')+'</span></li>').join('')+'</ol>';
}
function avatar(reader) {
  return '<span class="avatar" aria-hidden="true">'+esc(reader?.mark||'나')+'</span>';
}
function count(story) {
  return story.versions.reduce((total,version)=>total+version.comments.length,0);
}
function state(story) {
  return !story.cycleAt?'작성 중':story.step===4?'완성':'개고 중';
}
function listItems() {
  const rows=data.stories.filter(story=>(filter==='all'||(filter==='done'?story.step===4:Boolean(story.cycleAt)&&story.step<4))&&
    (story.title+' '+story.genre+' '+story.author).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return rows.length?'<ul class="story-list">'+rows.map(story=>'<li><button class="story-row" data-action="story" data-id="'+esc(story.id)+'" data-version="'+story.versions.at(-1).number+'"><span class="story-line"><strong>'+esc(story.title)+'</strong><span class="comment-count" aria-label="댓글 '+count(story)+'개">['+count(story)+']</span></span><span class="story-meta"><span class="genre">◈ '+esc(story.genre)+'</span><span>·</span><span>'+esc(story.author)+'</span><span>·</span><span>'+stamp(story.createdAt)+'</span><span>·</span><span>Ver.'+story.versions.length+'</span><span class="badge '+(story.step===4?'accent':'')+'">'+state(story)+'</span></span></button></li>').join('')+'</ul>':'<p class="empty muted">조건에 맞는 이야기가 없습니다.</p>';
}
function list() {
  return '<header class="panel-head"><h2>이야기 게시판 <span>'+data.stories.length+'</span></h2><input id="search" type="search" placeholder="이야기 검색" aria-label="이야기 검색" value="'+esc(search)+'"></header><div class="filters" aria-label="이야기 상태">'+[['all','전체'],['active','개고 중'],['done','완성']].map(([id,label])=>'<button class="filter" data-action="filter" data-id="'+id+'" aria-pressed="'+(id===filter)+'">'+label+'</button>').join('')+'</div><div id="list-items">'+listItems()+'</div>';
}
function storyParagraph(body, opening=false) {
  return '<p class="story-body'+(opening?' opening':'')+'">'+esc(body)+'</p>';
}
function storyMarkup(story, version) {
  const art=version.illustrations;
  const opening=story.id==='opening';
  if (!art) return storyParagraph(version.body, opening&&version.number===1);
  const {intro,scenes}=splitScenes(version.body);
  if (!scenes.length) return storyParagraph(version.body);
  const image=item=>validIllustrationSource(item?.src,story.id,version.number)
    ? '<img src="'+esc(item.src)+'" alt="'+esc(item.alt)+'" loading="lazy" decoding="async">'
    : '';
  const portraits=(art.characters??[]).map(item=>{
    const portrait=image(item);
    return portrait?'<figure>'+portrait+'<figcaption>'+esc(item.name)+'</figcaption></figure>':'';
  }).join('');
  const style=[art.style?.medium,art.style?.palette,art.style?.composition].filter(Boolean);
  return '<div class="illustrated-story">'+(intro?storyParagraph(intro,opening):'')+
    (portraits?'<section class="cast"><h3>등장인물</h3>'+(style.length?'<p class="art-style">'+esc(style.join(' · '))+'</p>':'')+'<div class="cast-grid">'+portraits+'</div></section>':'')+
    scenes.map(scene=>{
      const frames=(art.scenes??[]).filter(item=>item.scene===scene.number).map(image).filter(Boolean);
      const figures=frames.map(frame=>'<figure>'+frame+'</figure>').join('');
      return '<section class="story-scene"><h3><span>'+esc(scene.time)+'</span> '+esc(scene.title)+'</h3>'+
        (frames.length>1?'<div class="scene-frames">'+figures+'</div>':figures)+storyParagraph(scene.body)+'</section>';
    }).join('')+'</div>';
}
function commentMarkup(comment) {
  const reader=data.readers.find(item=>item.id===comment.reader);
  const name=reader?.name||'나';
  const visual=Array.isArray(comment.visual)&&comment.visual.length===3
    ? '<div class="visual-review"><strong>이미지 의견</strong><ol start="5">'+comment.visual.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ol></div>'
    : '';
  return '<article class="comment"><div class="comment-head"><div class="comment-author">'+avatar(reader)+'<strong>'+esc(name)+'</strong><small>'+esc(reader?.role||'직접 작성')+'</small></div><div class="star-set" role="group" aria-label="'+esc(name)+' 댓글 중요도">'+[1,2,3,4,5].map(i=>'<button class="star '+(i<=comment.stars?'active':'')+'" data-action="rate" data-id="'+esc(comment.id)+'" data-stars="'+i+'" aria-label="'+i+'점" aria-pressed="'+(i===comment.stars)+'">'+(i<=comment.stars?'★':'☆')+'</button>').join('')+(comment.stars?'<button class="text-button star-clear" data-action="rate" data-id="'+esc(comment.id)+'" data-stars="0" aria-label="별점 지우기">지우기</button>':'')+'</div></div><p>'+esc(comment.body)+'</p>'+visual+'</article>';
}
function detail(story,number) {
  const version=story.versions.find(item=>item.number===number)||story.versions.at(-1);
  const summary=!story.cycleAt?'초안을 완성한 뒤 사이클을 시작하세요.':story.next?steps[story.next.step]+' · '+stamp(story.next.dueAt,true)+'부터':'세 번째 버전까지 완성했습니다.';
  return '<div class="detail"><button class="mini-link" data-action="list">← 이야기 게시판</button><header><h2>'+esc(story.title)+'</h2><div class="detail-meta"><span class="badge accent">'+esc(story.genre)+'</span><span>'+esc(story.author)+'</span><span>·</span><span>3분 단편</span><span class="badge">'+state(story)+'</span></div></header>'+
    '<div class="version-bar" aria-label="이야기 버전">'+[1,2,3].map(n=>'<button class="button quiet version" data-action="version" data-version="'+n+'" '+(n===version.number?'aria-current="true" ':'')+(n>story.versions.length?'disabled':'')+'>Ver.'+n+'</button>').join('')+'</div>'+
    storyMarkup(story,version)+
    (version.notes?'<div class="notes"><strong>개고에서 반영한 피드백</strong><p>'+esc(version.notes)+'</p></div>':'')+
    '<div class="cycle-strip"><div><strong>'+summary+'</strong>'+(story.next?'<small>이전 단계가 끝난 뒤 '+(story.next.intervalMinutes===30?'최소 30분':'최소 한 시간')+' 간격으로 진행합니다.</small>':'')+'</div>'+
    (!story.cycleAt?'<span><button class="button quiet" data-action="edit">초안 편집</button> <button class="button primary" data-action="start">사이클 시작</button></span>':'')+'</div>'+
    '<div class="comments-title"><h3>Ver.'+version.number+' 댓글 <span>'+version.comments.length+'</span></h3><span class="comment-help">'+(story.editorial?'작업실을 편집부에 연결하면 개고에 반영':'별점이 높을수록 개고에 우선 반영')+'</span></div>'+
    (version.comments.length?[...version.comments].sort((a,b)=>b.stars-a.stars).map(commentMarkup).join(''):'<p class="comment-help">아직 댓글이 없습니다.</p>')+
    '<form class="comment-form" id="comment-form"><label>직접 댓글 달기<textarea name="body" placeholder="이 버전에 남길 의견을 적어주세요." maxlength="2000" required></textarea></label><button class="button primary" type="submit">댓글 등록</button></form></div>';
}
function render() {
  const {page,id,version}=route();
  const story=data.stories.find(item=>item.id===id);
  document.querySelectorAll('.tab').forEach(button=>{
    const current=button.dataset.action===(page==='story'?'list':page);
    if(current) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  if (page==='etymology') {
    renderEtymology(panel,sidebar,id);
    return;
  } else if (page==='readers') {
    panel.innerHTML='<header class="panel-head"><h2>일곱 평론가</h2></header><ul class="reader-grid">'+data.readers.map(reader=>'<li><h3>'+avatar(reader)+esc(reader.name)+'</h3><strong>'+esc(reader.role)+'</strong><p>'+esc(reader.tone)+'</p><p>'+esc(reader.focus)+'</p></li>').join('')+'</ul>';
  } else if (page==='cycle') {
    panel.innerHTML='<header class="panel-head"><h2>작업 사이클</h2></header><div class="info">'+timeline(true)+'<p class="flow-note">평소에는 이전 단계가 끝난 뒤 한 시간이 지나면 다음 단계가 열립니다. 직접 쓴 댓글과 별점은 해당 버전에 기록됩니다.</p><p>편집부는 평소 하루 두 편의 새 단편을 올립니다. 작업실을 편집부에 연결하면 내가 남긴 댓글과 별점이 예약 개고에 전달됩니다.</p></div>';
  } else if (page==='story'&&story) panel.innerHTML=detail(story,version);
  else panel.innerHTML=list();

  sidebar.innerHTML='<section class="side-card"><div class="side-head"><h2 class="side-title">한 편의 작업 순서</h2><button class="mini-link" data-action="cycle">자세히</button></div>'+timeline()+'</section><section class="side-card"><div class="side-head"><h2 class="side-title">일곱 평론가</h2><button class="mini-link" data-action="readers">인물 소개</button></div><ul class="people-mini">'+data.readers.map(reader=>'<li>'+avatar(reader)+'<strong>'+esc(reader.name)+'</strong><span>'+esc(reader.role)+'</span></li>').join('')+'</ul></section>';
}
function showNotice(message='',error=false) {
  notice.hidden=!message;
  notice.textContent=message;
  notice.classList.toggle('error',error);
}
async function request(operation,workspace=key) {
  const headers={};
  if (workspace) headers.Authorization='Bearer '+workspace;
  if (operation) headers['Content-Type']='application/json';
  const response=await fetch('/api/board',{method:operation?'POST':'GET',headers,...(operation?{body:JSON.stringify(operation)}:{})});
  const result=await response.json();
  if (!response.ok) throw new Error(result.error||'저장에 실패했습니다.');
  return result;
}
function ensureKey() {
  if (!keyPattern.test(key)) {
    key=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(storageKey,key);
  }
  return key;
}
async function write(operation,control) {
  if(busy) return false;
  busy=true;
  if(control) control.disabled=true;
  try {
    data=await request(operation,ensureKey());
    showNotice('');
    return true;
  } finally {
    busy=false;
    if(control) control.disabled=false;
  }
}
function showDialog(markup) {
  modal.innerHTML=markup;
  modal.showModal();
}
function editDialog(story) {
  showDialog('<h2 id="modal-title">'+(story?'초안 편집':'새 이야기')+'</h2><form id="edit-form"><label>제목<input name="title" required maxlength="100" value="'+esc(story?.title)+'"></label><label>장르<select name="genre">'+genres.map(genre=>'<option '+(genre===story?.genre?'selected':'')+'>'+genre+'</option>').join('')+'</select></label>'+
    (!story?'<label>작성자<input name="author" required maxlength="25" value="나"></label>':'')+
    '<label>3분 이야기<textarea class="body-input" name="body" required maxlength="10000" placeholder="나레이션, 화면, 대사를 자유롭게 적어주세요.">'+esc(story?.versions[0].body)+'</textarea></label><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button class="button quiet" type="button" data-action="close">취소</button><button class="button primary" type="submit">초안 저장</button></div></form>');
}
function workspaceDialog() {
  showDialog('<h2 id="modal-title">작업실 연결</h2><form id="workspace-form"><p class="workspace-copy">이야기와 댓글·별점은 작업실별로 저장됩니다. 다른 기기에서 같은 작업실을 열려면 내 연결 키를 보관한 뒤 그 기기에서 입력하세요. 키를 가진 사람은 내용을 편집할 수 있습니다.</p>'+
    '<div class="key-row"><label>내 연결 키<input name="current" type="password" readonly value="'+esc(key)+'" placeholder="아직 연결 키가 없습니다."></label><button class="button quiet" data-action="copy" type="button">키 복사</button></div>'+
    '<p class="workspace-copy">댓글과 별점을 예약 개고에 전달하려면 편집 연동 ID를 복사해 편집부에 알려주세요. 연결 키는 본인만 보관하세요.</p><button class="button quiet" data-action="editor-id" type="button">편집 연동 ID 복사</button>'+
    '<label>기존 작업실 연결 키<input name="restore" type="password" autocomplete="off" spellcheck="false" maxlength="64" pattern="[a-f0-9]{64}" placeholder="64자리 연결 키"></label><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><p class="status-text" role="status"></p><button class="button quiet" type="button" data-action="close">닫기</button><button class="button primary" type="submit">연결</button></div></form>');
}
function dialogError(error) {
  const errorBox=modal.querySelector('.form-error');
  errorBox.textContent=error.message;
  errorBox.hidden=false;
}
function current() {
  const {id,version}=route();
  const story=data.stories.find(item=>item.id===id);
  return {story,version:story?.versions.some(item=>item.number===version)?version:story?.versions.at(-1).number};
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if (!button) return;
  const {action,id,version,stars}=button.dataset;
  const view=current();
  try {
    if(['list','readers','cycle','etymology'].includes(action)) go(action);
    if(action==='story') go('story/'+id+'/'+version);
    if(action==='version') go('story/'+view.story.id+'/'+version);
    if(action==='filter') {
      filter=id;
      panel.querySelectorAll('.filter').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      panel.querySelector('#list-items').innerHTML=listItems();
    }
    if(action==='new'||action==='edit') editDialog(action==='edit'?view.story:null);
    if(action==='workspace') workspaceDialog();
    if(action==='close') modal.close();
    if(action==='copy') {
      const connectionKey=ensureKey();
      modal.querySelector('[name=current]').value=connectionKey;
      await navigator.clipboard.writeText(connectionKey);
      modal.querySelector('.status-text').textContent='연결 키를 복사했습니다.';
    }
    if(action==='editor-id') {
      const connectionKey=ensureKey();
      modal.querySelector('[name=current]').value=connectionKey;
      const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(connectionKey));
      const editorId=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
      await navigator.clipboard.writeText('editor:'+editorId);
      modal.querySelector('.status-text').textContent='편집 연동 ID를 복사했습니다.';
    }
    if(action==='start') showDialog('<h2 id="modal-title">이야기 사이클 시작</h2><form id="start-form"><p class="workspace-copy">시작하면 현재 초안이 Ver.1으로 보존됩니다. 첫 감상평은 한 시간 뒤부터 등록할 수 있습니다.</p><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button class="button quiet" data-action="close" type="button">취소</button><button class="button primary" type="submit">시작하기</button></div></form>');
    if(action==='rate'&&await write({action:'rate',storyId:view.story.id,version:view.version,commentId:id,stars:Number(stars)},button)) {
      render();
      const group=[...panel.querySelectorAll('[data-action=rate]')].filter(item=>item.dataset.id===id);
      (group.find(item=>item.dataset.stars===stars)||group[0])?.focus({preventScroll:true});
    }
  } catch(error) {
    if(modal.open) dialogError(error); else showNotice(error.message,true);
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='search') {
    search=event.target.value;
    panel.querySelector('#list-items').innerHTML=listItems();
  }
});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!['comment-form','edit-form','workspace-form','start-form'].includes(form.id)) return;
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  const {story,version}=current();
  try {
    if(form.id==='workspace-form') {
      const restore=values.restore.trim();
      if(!keyPattern.test(restore)) throw new Error('64자리 연결 키를 입력해 주세요.');
      data=await request(null,restore);
      key=restore;
      localStorage.setItem(storageKey,key);
      modal.close();
      showNotice('작업실이 연결되었습니다.');
      go('list');
    }
    if(form.id==='comment-form'&&await write({action:'comment',storyId:story.id,version,id:crypto.randomUUID(),body:values.body},event.submitter)) {
      render();
      panel.querySelector('#comment-form textarea')?.focus({preventScroll:true});
    }
    if(form.id==='start-form'&&await write({action:'start',storyId:story.id},event.submitter)) {
      modal.close();
      render();
    }
    if(form.id==='edit-form') {
      const editing=!('author' in values);
      const id=editing?story.id:crypto.randomUUID();
      if (await write({...values,action:editing?'edit':'create',storyId:id,id},event.submitter)) {
        modal.close();
        go('story/'+id+'/1');
      }
    }
  } catch(error) {
    if(modal.open) dialogError(error); else showNotice(error.message,true);
  }
});
window.addEventListener('hashchange',render);
request().then(result=>{data=result;render();}).catch(async error=>{
  if (key) {
    try {data=await request(null,'');render();} catch {}
  }
  showNotice(error.message,true);
  if (!data.stories.length) panel.innerHTML='<p class="empty muted">게시판을 불러오지 못했습니다.</p>';
});


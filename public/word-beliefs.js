const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let articles, pending;
const paragraphs=t=>t.split('\n\n').map(p=>'<p class="story-body">'+esc(p)+'</p>').join('');
export async function renderWordBeliefs(panel,sidebar,id) {
 const hash=location.hash;
 panel.innerHTML='<p class="loading">말과 믿음을 불러오는 중입니다.</p>';
 sidebar.innerHTML='<section class="side-card"><h2 class="side-title">말과 믿음</h2><p>말의 역사와 토착신앙이 만나는 자리에서, 우리가 무심코 쓰는 표현을 다시 읽습니다.</p><p>총 100편 · 연재 완료</p><p>확인된 어원, 학술적 가설, 민간어원, 오늘의 해석을 구분합니다. 소리가 비슷하다는 이유만으로 같은 뿌리라 단정하지 않습니다.</p></section>';
 try {
 if(!articles){pending ||= fetch('/word-beliefs.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{pending=null;throw e;});articles=await pending;}
 if(location.hash!==hash)return;
 const ordered=[...articles].sort((a,b)=>a.number-b.number), a=ordered.find(a=>a.id===id);
 if(id&&!a){panel.innerHTML='<p class="empty">글을 찾을 수 없습니다. <a href="#word-beliefs">연재 목록</a></p>';return;}
 if(!a){panel.innerHTML='<header class="panel-head"><h2>말과 믿음 <span>'+articles.length+' / 100편</span></h2></header><div class="info"><p>액은 무엇일까요? 몸의 ‘애’와 ‘애쓰다’는 어떻게 이어질까요? 하늘을 뜻한다는 옛말의 흔적은 어디까지 확인될까요?</p><p>사전과 옛 문헌, 언어 연구와 민속 자료를 함께 읽는 100편의 연재입니다. 질문 속 전제부터 검토하고, 알 수 있는 것과 아직 모르는 것을 함께 설명합니다.</p></div>'+(!articles.length?'<p class="empty muted">첫 10편을 준비하고 있습니다. 게시가 완료되면 이곳에서 읽을 수 있습니다.</p>':'')+'<ul class="story-list">'+ordered.map(a=>'<li><a class="story-row" href="#word-beliefs/'+encodeURIComponent(a.id)+'"><span class="story-line"><strong>'+a.number+'화 · '+esc(a.title)+'</strong></span><p>'+esc(a.summary)+'</p><span class="story-meta">'+esc(a.category)+' · '+esc(a.publishedAt)+'</span></a></li>').join('')+'</ul>';return;}
 const i=ordered.indexOf(a), prev=ordered[i-1],next=ordered[i+1];
 panel.innerHTML='<article class="detail"><a href="#word-beliefs" class="mini-link">← 연재 목록</a><header><p class="detail-meta">'+a.number+'화 · '+esc(a.category)+' · '+esc(a.publishedAt)+'</p><h2>'+esc(a.title)+'</h2><p>'+esc(a.summary)+'</p><p class="muted">'+esc(a.scope)+'</p></header><h3>자료로 읽는 말의 역사와 믿음</h3>'+paragraphs(a.evidence)+'<section class="notes"><h3>오늘의 해석 · 편집부의 철학적 독해</h3>'+paragraphs(a.interpretation)+'</section><h3>함께 생각할 질문</h3><ul>'+a.questions.map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul><h3>출처와 더 읽기</h3><p class="muted">본문 [번호]와 아래 자료가 대응합니다. 자료의 확인 범위는 각 출처에 표시하며, 최초 기록과 실제 기원은 구분합니다.</p><ol>'+a.sources.map(s=>'<li><a href="'+esc(/^https?:\/\//.test(s.url)?s.url:'#')+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ol><nav aria-label="연재 앞뒤 글" style="display:flex;flex-wrap:wrap;gap:20px;margin-top:32px">'+(prev?'<a href="#word-beliefs/'+prev.id+'">← '+prev.number+'화</a>':'')+(next?'<a href="#word-beliefs/'+next.id+'">다음 · '+next.number+'화 →</a>':'<a href="#word-beliefs">연재 목록으로</a>')+'</nav></article>';
 panel.setAttribute('tabindex','-1');panel.focus({preventScroll:true});panel.scrollIntoView({block:'start'});
 }catch(e){if(location.hash===hash)panel.innerHTML='<p class="empty">'+esc(e.message)+' <a href="#word-beliefs">다시 목록으로</a></p>';}
}

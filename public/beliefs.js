const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let articles, pending;
const paragraphs=t=>t.split('\n\n').map(p=>'<p class="story-body">'+esc(p)+'</p>').join('');
export async function renderBeliefs(panel,sidebar,id) {
 const hash=location.hash;
 panel.innerHTML='<p class="loading">삶의 종교를 불러오는 중입니다.</p>';
 sidebar.innerHTML='<section class="side-card"><h2 class="side-title">삶의 종교</h2><p>한반도의 민간신앙을 역사와 생활의 맥락에서 읽고, 오늘의 철학적 질문으로 이어갑니다.</p><p>읽는 순서: 태어남 → 집과 일상 → 자연과 생계 → 불행과 운명 → 죽음 → 공동체</p><p>전승 자료와 현대적 해석을 구분합니다. 지역별 전통을 하나의 교리로 단정하지 않습니다.</p></section>';
 try {
 if(!articles){pending ||= fetch('/beliefs.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{pending=null;throw e;});articles=await pending;}
 if(location.hash!==hash)return;
 const ordered=[...articles].sort((a,b)=>a.number-b.number), a=ordered.find(a=>a.id===id);
 if(id&&!a){panel.innerHTML='<p class="empty">글을 찾을 수 없습니다. <a href="#beliefs">연재 목록</a></p>';return;}
 if(!a){panel.innerHTML='<header class="panel-head"><h2>삶의 종교 <span>'+articles.length+'편</span></h2></header><div class="info"><p>우리의 일상에 남아 있는 신앙에서 인간의 삶을 다시 읽습니다.</p><p>신의 이름과 의례의 유래를 배우고, 돌봄·가족·자연·죽음에 대한 질문을 함께 생각하는 연재입니다. 첫 편부터 순서대로 읽어 보세요.</p></div><ul class="story-list">'+ordered.map(a=>'<li><a class="story-row" href="#beliefs/'+encodeURIComponent(a.id)+'"><span class="story-line"><strong>'+a.number+'화 · '+esc(a.title)+'</strong></span><p>'+esc(a.summary)+'</p><span class="story-meta">'+esc(a.category)+' · '+esc(a.publishedAt)+'</span></a></li>').join('')+'</ul>';return;}
 const i=ordered.indexOf(a), prev=ordered[i-1],next=ordered[i+1];
 panel.innerHTML='<article class="detail"><a href="#beliefs" class="mini-link">← 연재 목록</a><header><p class="detail-meta">'+a.number+'화 · '+esc(a.category)+' · '+esc(a.publishedAt)+'</p><h2>'+esc(a.title)+'</h2><p>'+esc(a.summary)+'</p></header><h3>자료로 읽는 역사와 신앙</h3>'+paragraphs(a.evidence)+'<section class="notes"><h3>오늘의 해석 · 편집부의 철학적 독해</h3>'+paragraphs(a.interpretation)+'</section><h3>함께 생각할 질문</h3><ul>'+a.questions.map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul><h3>출처와 더 읽기</h3><p class="muted">본문 [번호]와 아래 자료가 대응합니다. 자료의 확인 범위는 각 출처에 표시하며, 최초 기록과 실제 기원은 구분합니다.</p><ol>'+a.sources.map(s=>'<li><a href="'+esc(/^https?:\/\//.test(s.url)?s.url:'#')+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ol><nav aria-label="연재 앞뒤 글" style="display:flex;flex-wrap:wrap;gap:20px;margin-top:32px">'+(prev?'<a href="#beliefs/'+prev.id+'">← '+prev.number+'화</a>':'')+(next?'<a href="#beliefs/'+next.id+'">다음 · '+next.number+'화 →</a>':'<a href="#beliefs">연재 목록으로</a>')+'</nav></article>';
 panel.setAttribute('tabindex','-1');panel.focus({preventScroll:true});panel.scrollIntoView({block:'start'});
 }catch(e){if(location.hash===hash)panel.innerHTML='<p class="empty">'+esc(e.message)+' <a href="#beliefs">다시 목록으로</a></p>';}
}

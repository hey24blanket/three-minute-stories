const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let articles;
let request;
let sortMode='latest';
const dependence=a=>a.sourceDependence||{level:'미평가',reason:'출처 의존도 미평가'};
const rank=a=>({'높음':3,'중간':2,'낮음':1}[dependence(a).level]||0);
const ordered=a=>a.map((v,i)=>({v,i})).sort((a,b)=>(sortMode==='high'?rank(b.v)-rank(a.v):sortMode==='low'?((rank(a.v)||4)-(rank(b.v)||4)):0)||String(b.v.publishedAt).localeCompare(String(a.v.publishedAt))||b.i-a.i).map(x=>x.v);
const paragraphs=text=>text.split('\n\n').map(p=>'<p class="story-body">'+esc(p)+'</p>').join('');
export async function renderEtymology(panel,sidebar,id) {
  panel.innerHTML='<p class="loading">말의 뿌리를 불러오는 중입니다.</p>';
  sidebar.innerHTML='<section class="side-card"><h2 class="side-title">근거 70 · 탐색 30</h2><p>자료로 확인한 설명을 중심으로, 가설과 작가의 상상을 별도로 읽습니다. 비율은 이야기 구성의 목표이며 사실의 확률이 아닙니다.</p><p>고유어 · 한자어 · 관용 표현</p><p>사전, 옛 문헌, 학술 논문과 전문 연구자의 해설을 대조합니다. 최초 기록과 최초 발생은 구분합니다.</p></section>';
  try {
    if(!articles) {
      request ||= fetch('/etymology.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{request=null;throw e;});
      articles=await request;
    }
    if(!location.hash.startsWith('#etymology')) return;
    if((location.hash.split('/')[1]||undefined)!==id) return;
    const a=articles.find(a=>a.id===id);
    if(id&&!a){panel.innerHTML='<p class="empty">해당 글을 찾지 못했습니다. <a href="#etymology">목록으로</a></p>';return;}
    if(a) {
      panel.innerHTML='<article class="detail"><a class="mini-link" href="#etymology">← 말의 뿌리</a><header><h2>'+esc(a.title)+'</h2><p class="detail-meta">'+esc(a.category)+' · '+esc(a.publishedAt)+'</p><span class="badge accent">'+esc(a.status)+'</span><p class="info">출처 의존도: '+esc(dependence(a).level)+' · '+esc(dependence(a).reason)+'</p></header><h3>자료로 확인한 이야기</h3>'+paragraphs(a.evidence)+'<div class="notes"><h3>가설·상상으로 넓혀 보기</h3>'+paragraphs(a.speculation)+'</div>'+(a.conclusion?'<section class="notes"><h3>질문에 대한 결론</h3>'+paragraphs(a.conclusion)+'</section>':'')+'<h3>참고 자료</h3><ul>'+a.sources.map(s=>'<li><a href="'+esc(/^https?:\/\//.test(s.url)?s.url:'#')+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ul><p class="muted">해설에서 확인한 범위만 서술합니다. 학술적 가설, 민간어원, 연출용 상상은 확정된 어원과 다릅니다.</p></article>';
    } else {
      panel.innerHTML='<header class="panel-head"><h2>말의 뿌리 <span>'+articles.length+'</span></h2></header><div class="info"><p>매일 쓰는 말에서 시작하는 한국어 어원 이야기. 근거 있는 설명 약 70%, 명확히 표시한 가설·상상 약 30%로 구성합니다.</p></div><ul class="story-list">'+ordered(articles).map(a=>'<li><a class="story-row" href="#etymology/'+encodeURIComponent(a.id)+'"><span class="story-line"><strong>'+esc(a.title)+'</strong></span><span class="story-meta"><span class="genre">'+esc(a.category)+'</span><span>'+esc(a.word)+'</span><span>'+esc(a.publishedAt)+'</span><span class="badge">'+esc(a.status)+'</span><span class="badge">출처 의존도 '+esc(dependence(a).level)+'</span></span></a></li>').join('')+'</ul>';
    }
    if(!id){
      const controls=document.createElement('div');
      controls.innerHTML='<label>정렬 <select aria-label="어원 이야기 정렬"><option value="latest">최신순</option><option value="high">출처 의존도 높은순</option><option value="low">출처 의존도 낮은순</option></select></label><p class="muted">의존도는 원문 충실도·표절률·이용허락 여부가 아닙니다. 기존 글은 출처 수에 따른 예비 분류이며, 복수 출처는 독립성 검토 전까지 미평가로 둡니다.</p>';
      panel.prepend(controls);
      controls.querySelector('select').value=sortMode;
      controls.querySelector('select').onchange=e=>{sortMode=e.target.value;renderEtymology(panel,sidebar);};
    } else {
      panel.setAttribute('tabindex','-1');
      panel.focus({preventScroll:true});
      panel.scrollIntoView({block:'start',behavior:'instant'});
    }
  } catch(e) {if(location.hash.startsWith('#etymology'))panel.innerHTML='<p class="empty">'+esc(e.message)+'</p>';}
}

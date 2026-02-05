const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>Array.from(e.querySelectorAll(s));const APP=$("#app");$("#year").textContent=new Date().getFullYear();
function setActiveNav(){const h=location.hash||"#/";$$(".nav a").forEach(a=>a.classList.remove("active"));(h.startsWith("#/how")?$(".nav a[href='#/how']"):$(".nav a[href='#/']")).classList.add("active")}window.addEventListener("hashchange",router);
async function fetchJSON(p){const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(`Failed to load ${p}: ${r.status}`);return await r.json()}
const esc=s=>(s??"").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const sk=id=>`aji_crossword_progress_v2__${id}`;
const blank=(R,C)=>Array.from({length:R},()=>Array.from({length:C},()=> ""));
const isBlock=(p,r,c)=>p.grid.blocks.some(b=>b[0]===r&&b[1]===c);
const load=p=>{const raw=localStorage.getItem(sk(p.id));if(!raw)return null;try{return JSON.parse(raw)}catch{return null}};
const save=(p,s)=>localStorage.setItem(sk(p.id),JSON.stringify(s));
const norm=ch=>(!ch?"":ch.toString().trim().slice(0,2));
function numberGrid(p){const {rows:R,cols:C}=p.grid;const n=blank(R,C).map(r=>r.map(()=>0));let k=0;
const sa=(r,c)=>!isBlock(p,r,c)&&(c===0||isBlock(p,r,c-1))&&(c+1<C&&!isBlock(p,r,c+1));
const sd=(r,c)=>!isBlock(p,r,c)&&(r===0||isBlock(p,r-1,c))&&(r+1<R&&!isBlock(p,r+1,c));
for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(sa(r,c)||sd(r,c))n[r][c]=++k;return n}
function buildSolution(p){const {rows:R,cols:C}=p.grid;const sol=blank(R,C),occ=blank(R,C).map(row=>row.map(()=>[]));
for(const e of p.entries){const dr=e.dir==="down"?1:0,dc=e.dir==="across"?1:0;
for(let i=0;i<e.answerCells.length;i++){const rr=e.row+dr*i,cc=e.col+dc*i;sol[rr][cc]=e.answerCells[i];occ[rr][cc].push(e.id)}}
return {sol,occ}}
function setToast(m,kind=""){const t=$("#toast");t.className="toast"+(kind?" "+kind:"");t.innerHTML=m}
function renderHow(){APP.innerHTML=`<section class="card"><div class="card-head"><div><span class="badge">How it works</span><div class="h2">Clues first. Answers hidden.</div><p class="p">Each puzzle is a JSON file with a grid (blocks) and a list of entries (Across/Down). Answers are stored as <code>answerCells</code> so boxes always match the answer length.</p></div></div><div class="card-body"><ol class="small" style="line-height:1.7;max-width:82ch;"><li><b>Add a puzzle:</b> copy an existing file in <code>/puzzles</code>.</li><li><b>Update the list:</b> add it to <code>puzzles/index.json</code>.</li><li><b>Deploy anywhere:</b> Netlify / GitHub Pages / Cloudflare Pages.</li><li><b>Reveal section:</b> answers are behind a toggle.</li></ol></div></section>`}
async function renderHome(){APP.innerHTML=`<section class="card"><div class="card-head"><div><span class="badge">Puzzles</span><div class="h2">Choose a crossword</div><p class="p">Click a puzzle to play. Progress saves automatically.</p></div></div><div class="card-body"><div class="toast" id="homeStatus">Loading puzzle list…</div><div class="list" id="list" style="margin-top:12px;"></div></div></section>`;
try{const idx=await fetchJSON("puzzles/index.json");$("#homeStatus").remove();const list=$("#list");idx.puzzles.forEach(p=>{const a=document.createElement("a");a.className="item";a.href=`#/puzzle/${encodeURIComponent(p.id)}`;a.innerHTML=`<div><h3>${esc(p.title)}</h3><p>${esc(p.subtitle||"")}</p></div><div class="meta"><span>${esc(p.size||"")}</span><span>•</span><span>${esc(p.language||"EN")}</span><span>•</span><span>${esc(p.clues!=null?(p.clues+" clues"):"")}</span></div>`;list.appendChild(a)})}catch(err){$("#homeStatus").classList.add("bad");$("#homeStatus").textContent=err.message}}
function buildGridUI(p,state,nums,onFocus){const {rows:R,cols:C}=p.grid;const g=$("#grid");g.style.gridTemplateColumns=`repeat(${C}, 38px)`;g.innerHTML="";const inputs=[];
for(let r=0;r<R;r++)for(let c=0;c<C;c++){const cell=document.createElement("div");cell.className="cell"+(isBlock(p,r,c)?" block":"");cell.dataset.r=r;cell.dataset.c=c;
if(!isBlock(p,r,c)){if(nums[r][c]){const n=document.createElement("div");n.className="num";n.textContent=nums[r][c];cell.appendChild(n)}
const inp=document.createElement("input");inp.value=state[r][c]||"";inp.dataset.r=r;inp.dataset.c=c;
inp.addEventListener("focus",()=>onFocus(r,c));
inp.addEventListener("input",()=>{inp.value=norm(inp.value).toUpperCase();state[r][c]=inp.value;save(p,state)});
inp.addEventListener("keydown",e=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault()});
cell.addEventListener("mousedown",()=>inp.focus());cell.appendChild(inp);inputs.push(inp)}
g.appendChild(cell)}return inputs}
const cellsFor=e=>{const dr=e.dir==="down"?1:0,dc=e.dir==="across"?1:0;return e.answerCells.map((_,i)=>[e.row+dr*i,e.col+dc*i])};
function highlight(e){$$(".cell").forEach(c=>c.classList.remove("highlight","active"));cellsFor(e).forEach(([r,c])=>{const el=document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);if(el)el.classList.add("highlight")})}
function setActiveCell(r,c){$$(".cell").forEach(x=>x.classList.remove("active"));const el=document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);if(el)el.classList.add("active")}
const focus=(r,c)=>{const i=document.querySelector(`input[data-r='${r}'][data-c='${c}']`);if(i)i.focus()};
const nextIn=(e,r,c,dir=1)=>{const coords=cellsFor(e);const i=coords.findIndex(([rr,cc])=>rr===r&&cc===c);const n=coords[i+dir];return n?{r:n[0],c:n[1]}:null};
function check(p,sol,state){let total=0,correct=0,filled=0;for(let r=0;r<p.grid.rows;r++)for(let c=0;c<p.grid.cols;c++){if(isBlock(p,r,c))continue;total++;const v=(state[r][c]||"").trim();if(v)filled++;if(v&&v===sol[r][c].toUpperCase())correct++}
if(correct===total)setToast(`Perfect! ✅ ${correct}/${total} correct.`,"good");else setToast(`Checked: ${correct}/${total} correct • ${filled}/${total} filled.`,filled===total?"bad":"")}
function revealOne(p,sol,state){const cand=[];for(let r=0;r<p.grid.rows;r++)for(let c=0;c<p.grid.cols;c++){if(isBlock(p,r,c))continue;const want=sol[r][c].toUpperCase(),have=(state[r][c]||"").toUpperCase();if(have!==want)cand.push([r,c])}
if(!cand.length){setToast("Nothing to reveal — already complete ✅","good");return}const [r,c]=cand[Math.floor(Math.random()*cand.length)];state[r][c]=sol[r][c].toUpperCase();save(p,state);const inp=document.querySelector(`input[data-r='${r}'][data-c='${c}']`);if(inp){inp.value=state[r][c];inp.focus()}setToast("Revealed one cell ✨")}
async function renderPuzzle(id){APP.innerHTML=`<section class="card"><div class="card-head"><div><a href="#/" class="badge">← Back</a><div class="h2">Loading puzzle…</div><p class="p">Fetching JSON…</p></div></div><div class="card-body"><div class="toast">Loading…</div></div></section>`;
try{const p=await fetchJSON(`puzzles/${id}.json`);const nums=numberGrid(p);p.entries=p.entries.map((e,i)=>({...e,number:nums[e.row]?.[e.col]||0,id:e.id||`e${i+1}`}));const {sol,occ}=buildSolution(p);
let state=load(p);if(!state)state=blank(p.grid.rows,p.grid.cols);
const across=p.entries.filter(e=>e.dir==="across").sort((a,b)=>a.number-b.number);
const down=p.entries.filter(e=>e.dir==="down").sort((a,b)=>a.number-b.number);
APP.innerHTML=`<section class="card"><div class="card-head"><div><a href="#/" class="badge">← Back</a><div class="h2">${esc(p.title)}</div><p class="p">${esc(p.subtitle||"")}</p></div><div class="badge">${p.grid.rows}×${p.grid.cols}</div></div><div class="card-body"><div class="layout"><div><div id="grid" class="grid"></div><div class="controls"><button class="primary" id="btnCheck">Check</button><button id="btnRevealCell">Reveal 1 cell</button><button class="danger" id="btnReset">Reset</button></div><div id="toast" class="toast">Click a clue, then type. Press <b>Tab</b> to switch direction.</div><details style="margin-top:12px;"><summary>Reveal answers (toggle)</summary><div class="reveal"><div class="small" style="margin-bottom:10px;">Answers are hidden by default.</div><div class="answers" id="answers"></div></div></details></div><div><div class="clues"><div class="cluebox"><div class="head">Across</div><div class="body" id="cluesAcross"></div></div><div class="cluebox"><div class="head">Down</div><div class="body" id="cluesDown"></div></div></div></div></div></div></section>`;
const ans=$("#answers");p.entries.slice().sort((a,b)=>a.dir===b.dir?a.number-b.number:(a.dir==="across"?-1:1)).forEach(e=>{const s=document.createElement("span");s.className="answer-chip";s.textContent=`${e.number}${e.dir==="across"?"A":"D"}: ${e.answerCells.join("")}`;ans.appendChild(s)});
const clueHTML=e=>`<div class="clue" data-eid="${esc(e.id)}"><div class="n">${e.number}</div><div class="t">${esc(e.clue)}</div></div>`;
$("#cluesAcross").innerHTML=across.map(clueHTML).join("");$("#cluesDown").innerHTML=down.map(clueHTML).join("");
let activeEntry=across[0]||down[0],activeDir=activeEntry?.dir||"across",activeCell=activeEntry?{r:activeEntry.row,c:activeEntry.col}:{r:0,c:0};
const onFocus=(r,c)=>{activeCell={r,c};const occIds=occ[r][c]||[];const prefer=p.entries.find(en=>en.dir===activeDir&&occIds.includes(en.id));activeEntry=prefer||p.entries.find(en=>occIds.includes(en.id))||activeEntry;if(activeEntry)activeDir=activeEntry.dir;refresh()};
const inputs=buildGridUI(p,state,nums,onFocus);
function refresh(){if(!activeEntry)return;$$(".clue").forEach(c=>c.classList.remove("active"));const ce=document.querySelector(`.clue[data-eid='${activeEntry.id}']`);if(ce)ce.classList.add("active");highlight(activeEntry);setActiveCell(activeCell.r,activeCell.c)}
function setActiveEntry(e){activeEntry=e;activeDir=e.dir;activeCell={r:e.row,c:e.col};refresh();focus(activeCell.r,activeCell.c)}
$$(".clue").forEach(el=>el.addEventListener("click",()=>{const id=el.getAttribute("data-eid");const e=p.entries.find(x=>x.id===id);if(e)setActiveEntry(e)}));
document.addEventListener("keydown",(e)=>{if(!location.hash.startsWith("#/puzzle/"))return;const a=document.activeElement;if(!(a&&a.tagName==="INPUT"))return;const r=+a.dataset.r,c=+a.dataset.c;
if(e.key==="Tab"){e.preventDefault();const occIds=occ[r][c]||[];const other=p.entries.find(en=>en.dir!==activeDir&&occIds.includes(en.id));if(other){activeEntry=other;activeDir=other.dir;activeCell={r,c};refresh()}return}
if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();const want=(e.key==="ArrowUp"||e.key==="ArrowDown")?"down":"across";if(activeEntry&&activeEntry.dir!==want){const occIds=occ[r][c]||[];const t=p.entries.find(en=>en.dir===want&&occIds.includes(en.id));if(t){activeEntry=t;activeDir=t.dir;refresh()}}
const step=(e.key==="ArrowUp"||e.key==="ArrowLeft")?-1:1;if(activeEntry){const n=nextIn(activeEntry,r,c,step);if(n){activeCell=n;refresh();focus(n.r,n.c)}}return}
if(e.key.length===1){queueMicrotask(()=>{const cur=document.activeElement;if(!(cur&&cur.tagName==="INPUT"))return;if(!activeEntry)return;const rr=+cur.dataset.r,cc=+cur.dataset.c;const n=nextIn(activeEntry,rr,cc,1);if(n){activeCell=n;refresh();focus(n.r,n.c)}})}
if(e.key==="Backspace"){queueMicrotask(()=>{const cur=document.activeElement;if(!(cur&&cur.tagName==="INPUT"))return;if(cur.value!=="")return;if(!activeEntry)return;const rr=+cur.dataset.r,cc=+cur.dataset.c;const p0=nextIn(activeEntry,rr,cc,-1);if(p0){activeCell=p0;refresh();focus(p0.r,p0.c)}})}
},{capture:true});
$("#btnCheck").addEventListener("click",()=>check(p,sol,state));
$("#btnRevealCell").addEventListener("click",()=>revealOne(p,sol,state));
$("#btnReset").addEventListener("click",()=>{if(confirm("Reset this puzzle?")){localStorage.removeItem(sk(p.id));state=blank(p.grid.rows,p.grid.cols);save(p,state);inputs.forEach(i=>i.value="");setToast("Reset complete.");if(activeEntry)setActiveEntry(activeEntry)}});
if(activeEntry)setActiveEntry(activeEntry);setToast(load(p)?"Loaded your saved progress ✅":"Click a clue, then type. Press <b>Tab</b> to switch direction.",load(p)?"good":"")
}catch(err){APP.innerHTML=`<section class="card"><div class="card-head"><div><a href="#/" class="badge">← Back</a><div class="h2">Couldn’t load puzzle</div><p class="p">${esc(err.message)}</p></div></div><div class="card-body"><div class="toast bad">Make sure <code>puzzles/${esc(id)}.json</code> exists.</div></div></section>`}}
async function router(){setActiveNav();const h=location.hash||"#/";if(h.startsWith("#/puzzle/")){await renderPuzzle(decodeURIComponent(h.split("/")[2]||""));return}if(h.startsWith("#/how")){renderHow();return}await renderHome()}router();

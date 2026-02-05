/* Aji’s Crossword — simple static app
   - Loads puzzles/index.json
   - Loads individual puzzle JSON files
   - Saves progress in localStorage
*/

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const APP = $("#app");
$("#year").textContent = new Date().getFullYear();

function setActiveNav(){
  const hash = location.hash || "#/";
  $$(".nav a").forEach(a => a.classList.remove("active"));
  if(hash.startsWith("#/about")) $(".nav a[href='#/about']").classList.add("active");
  else $(".nav a[href='#/']").classList.add("active");
}

window.addEventListener("hashchange", router);

async function router(){
  setActiveNav();
  const hash = location.hash || "#/";
  if(hash.startsWith("#/puzzle/")){
    const id = decodeURIComponent(hash.split("/")[2] || "");
    await renderPuzzle(id);
    return;
  }
  if(hash.startsWith("#/about")){
    renderAbout();
    return;
  }
  await renderHome();
}

async function fetchJSON(path){
  const res = await fetch(path, {cache: "no-store"});
  if(!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return await res.json();
}

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderAbout(){
  APP.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <span class="badge">About</span>
          <h2 style="margin:10px 0 0;">Aji’s Crossword</h2>
          <p class="muted" style="margin:6px 0 0; max-width:70ch;">
            This is a static (no-backend) crossword site. Puzzles live as JSON files.
            You can host it anywhere that serves files (GitHub Pages, Netlify, or your own PC).
          </p>
        </div>
      </div>
      <div class="panel-body">
        <div class="kv" style="max-width:72ch;">
          <div>How to add puzzles</div>
          <div>Drop <code>puzzles/NNN.json</code> and add an entry to <code>puzzles/index.json</code>.</div>
          <div>Progress</div>
          <div>Saved automatically in your browser (localStorage).</div>
          <div>Tip</div>
          <div>If you want “word-bank drag & drop” later, we can add it—this demo starts with reliable typing + checking.</div>
        </div>
      </div>
    </section>
  `;
}

async function renderHome(){
  APP.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <span class="badge">Puzzles</span>
          <h2 style="margin:10px 0 0;">Choose a crossword</h2>
          <p class="muted" style="margin:6px 0 0;">Tap a puzzle to play. Your progress saves automatically.</p>
        </div>
      </div>
      <div class="panel-body">
        <div class="toast" id="homeStatus">Loading puzzle index…</div>
        <div class="list" id="puzzleList" style="margin-top:12px;"></div>
      </div>
    </section>
  `;

  try{
    const idx = await fetchJSON("puzzles/index.json");
    const list = $("#puzzleList");
    $("#homeStatus").remove();

    idx.puzzles.forEach(p => {
      const el = document.createElement("a");
      el.className = "item";
      el.href = `#/puzzle/${encodeURIComponent(p.id)}`;
      el.innerHTML = `
        <div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.subtitle || "")}</p>
        </div>
        <div class="meta">
          <span>${escapeHtml(p.size || "")}</span>
          <span>•</span>
          <span>${escapeHtml(p.words != null ? (p.words + " words") : "")}</span>
        </div>
      `;
      list.appendChild(el);
    });

  }catch(err){
    $("#homeStatus").classList.add("bad");
    $("#homeStatus").textContent = err.message;
  }
}

function storageKey(puzzleId){ return `aji_crossword_progress__${puzzleId}`; }

function normalizeChar(ch){
  // Keep Devanagari chars, digits, and Latin letters; strip spaces.
  if(!ch) return "";
  return ch.toString().trim().slice(0, 2); // allow matra combos; simple cap
}

function buildGrid(container, puzzle, state){
  const {rows, cols} = puzzle.grid;
  container.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

  const inputs = [];
  let cellNum = 0;

  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const isBlock = puzzle.grid.blocks?.some(b => b[0]===r && b[1]===c) || false;

      const cell = document.createElement("div");
      cell.className = "cell" + (isBlock ? " block" : "");
      cell.dataset.r = r;
      cell.dataset.c = c;

      if(!isBlock){
        cellNum++;
        const mini = document.createElement("div");
        mini.className = "mini";
        mini.textContent = cellNum;
        cell.appendChild(mini);

        const input = document.createElement("input");
        input.inputMode = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.maxLength = 2; // helps Devanagari combos
        input.value = state?.[r]?.[c] ?? "";
        input.dataset.r = r;
        input.dataset.c = c;
        input.addEventListener("input", (e) => {
          input.value = normalizeChar(input.value);
          saveCell(puzzle.id, puzzle, r, c, input.value);
          // auto-advance to next cell
          focusNext(inputs, r, c, rows, cols, puzzle);
        });
        input.addEventListener("keydown", (e) => {
          if(e.key === "Backspace" && input.value === ""){
            focusPrev(inputs, r, c, rows, cols, puzzle);
          }
          if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
            e.preventDefault();
            const dr = e.key==="ArrowUp" ? -1 : e.key==="ArrowDown" ? 1 : 0;
            const dc = e.key==="ArrowLeft" ? -1 : e.key==="ArrowRight" ? 1 : 0;
            focusAt(inputs, r+dr, c+dc);
          }
        });

        cell.appendChild(input);
        inputs.push(input);
      }

      container.appendChild(cell);
    }
  }

  // Focus first cell
  if(inputs[0]) inputs[0].focus();

  return inputs;
}

function isBlock(puzzle, r, c){
  return puzzle.grid.blocks?.some(b => b[0]===r && b[1]===c) || false;
}

function focusAt(inputs, r, c){
  const tgt = inputs.find(i => +i.dataset.r===r && +i.dataset.c===c);
  if(tgt) tgt.focus();
}

function focusNext(inputs, r, c, rows, cols, puzzle){
  // simple reading order advance
  for(let cc=c+1; cc<cols; cc++){
    if(!isBlock(puzzle, r, cc)) return focusAt(inputs, r, cc);
  }
  for(let rr=r+1; rr<rows; rr++){
    for(let cc=0; cc<cols; cc++){
      if(!isBlock(puzzle, rr, cc)) return focusAt(inputs, rr, cc);
    }
  }
}

function focusPrev(inputs, r, c, rows, cols, puzzle){
  for(let cc=c-1; cc>=0; cc--){
    if(!isBlock(puzzle, r, cc)) return focusAt(inputs, r, cc);
  }
  for(let rr=r-1; rr>=0; rr--){
    for(let cc=cols-1; cc>=0; cc--){
      if(!isBlock(puzzle, rr, cc)) return focusAt(inputs, rr, cc);
    }
  }
}

function loadProgress(puzzle){
  const raw = localStorage.getItem(storageKey(puzzle.id));
  if(!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function blankState(puzzle){
  const {rows, cols} = puzzle.grid;
  const s = [];
  for(let r=0; r<rows; r++){
    const row = [];
    for(let c=0; c<cols; c++){
      row.push("");
    }
    s.push(row);
  }
  return s;
}

function saveCell(puzzleId, puzzle, r, c, val){
  const cur = loadProgress(puzzle) || blankState(puzzle);
  cur[r][c] = val;
  localStorage.setItem(storageKey(puzzleId), JSON.stringify(cur));
}

function setToast(msg, kind=""){
  const t = $("#toast");
  t.className = "toast" + (kind ? " " + kind : "");
  t.textContent = msg;
}

function checkPuzzle(puzzle){
  const state = loadProgress(puzzle) || blankState(puzzle);
  const sol = puzzle.solution; // array of strings, '.' = block
  let total = 0, correct = 0, filled = 0;

  for(let r=0; r<puzzle.grid.rows; r++){
    for(let c=0; c<puzzle.grid.cols; c++){
      const s = sol[r][c];
      if(s === ".") continue;
      total++;
      const v = (state[r][c] || "").trim();
      if(v) filled++;
      if(v && v === s) correct++;
    }
  }

  const done = (correct === total);
  if(done){
    setToast(`Perfect! ✅ ${correct}/${total} correct.`, "ok");
  }else{
    setToast(`Checked: ${correct}/${total} correct • ${filled}/${total} filled.`, filled===total ? "bad" : "");
  }

  return {total, correct, filled, done};
}

function revealOne(puzzle){
  const state = loadProgress(puzzle) || blankState(puzzle);
  const sol = puzzle.solution;
  const candidates = [];
  for(let r=0; r<puzzle.grid.rows; r++){
    for(let c=0; c<puzzle.grid.cols; c++){
      if(sol[r][c]===".") continue;
      if((state[r][c]||"").trim() !== sol[r][c]) candidates.push([r,c]);
    }
  }
  if(!candidates.length){
    setToast("Nothing to reveal — looks complete!", "ok");
    return;
  }
  const [r,c] = candidates[Math.floor(Math.random()*candidates.length)];
  state[r][c] = sol[r][c];
  localStorage.setItem(storageKey(puzzle.id), JSON.stringify(state));
  // Update UI input
  const inp = document.querySelector(`input[data-r='${r}'][data-c='${c}']`);
  if(inp){ inp.value = sol[r][c]; inp.focus(); }
  setToast("Revealed one cell ✨", "");
}

function resetPuzzle(puzzle){
  localStorage.removeItem(storageKey(puzzle.id));
}

async function renderPuzzle(id){
  APP.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <a href="#/" class="badge">← Back</a>
          <h2 style="margin:10px 0 0;">Loading puzzle…</h2>
          <p class="muted" style="margin:6px 0 0;">Please wait</p>
        </div>
      </div>
      <div class="panel-body">
        <div class="toast">Fetching puzzle data…</div>
      </div>
    </section>
  `;

  try{
    const puzzle = await fetchJSON(`puzzles/${id}.json`);
    const saved = loadProgress(puzzle);

    APP.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <a href="#/" class="badge">← Back</a>
            <h2 style="margin:10px 0 0;">${escapeHtml(puzzle.title)}</h2>
            <p class="muted" style="margin:6px 0 0;">${escapeHtml(puzzle.subtitle || "")}</p>
          </div>
          <div class="badge">${escapeHtml(puzzle.grid.rows)}×${escapeHtml(puzzle.grid.cols)}</div>
        </div>

        <div class="panel-body">
          <div class="grid-wrap">
            <div>
              <div id="grid" class="crossword" role="grid" aria-label="Crossword grid"></div>
              <div class="controls">
                <button class="primary" id="btnCheck">Check</button>
                <button id="btnReveal">Reveal 1 cell</button>
                <button class="danger" id="btnReset">Reset</button>
              </div>
              <div id="toast" class="toast muted">Type letters into the grid. Use arrow keys to move.</div>
            </div>

            <aside class="side">
              <div class="panel" style="border-radius:14px;">
                <div class="panel-head">
                  <div>
                    <span class="badge">Word bank</span>
                    <p class="muted" style="margin:8px 0 0;">All answers are from this set.</p>
                  </div>
                </div>
                <div class="panel-body">
                  <div class="wordbank" id="wordbank"></div>
                </div>
              </div>

              <div class="panel" style="border-radius:14px;">
                <div class="panel-head">
                  <div>
                    <span class="badge">Status</span>
                    <p class="muted" style="margin:8px 0 0;">Saved locally in your browser.</p>
                  </div>
                </div>
                <div class="panel-body">
                  <div class="kv">
                    <div>Puzzle ID</div><div><code>${escapeHtml(puzzle.id)}</code></div>
                    <div>Words</div><div>${escapeHtml(puzzle.wordBank.length)}</div>
                    <div>Updated</div><div>${escapeHtml(puzzle.updated || "")}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;

    // Build word bank
    const wb = $("#wordbank");
    puzzle.wordBank.forEach(w => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = w;
      wb.appendChild(chip);
    });

    // Build grid
    const gridEl = $("#grid");
    const inputs = buildGrid(gridEl, puzzle, saved);

    // Hook up buttons
    $("#btnCheck").addEventListener("click", () => checkPuzzle(puzzle));
    $("#btnReveal").addEventListener("click", () => { revealOne(puzzle); });
    $("#btnReset").addEventListener("click", () => {
      if(confirm("Reset this puzzle? Your saved progress will be cleared.")){
        resetPuzzle(puzzle);
        // Clear inputs
        inputs.forEach(i => i.value = "");
        setToast("Reset complete.", "");
        if(inputs[0]) inputs[0].focus();
      }
    });

    // Initial toast
    if(saved){
      setToast("Loaded your saved progress ✅", "ok");
    }else{
      setToast("Tip: Hit “Check” anytime. Progress saves automatically.", "");
    }

  }catch(err){
    APP.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <a href="#/" class="badge">← Back</a>
            <h2 style="margin:10px 0 0;">Couldn’t load puzzle</h2>
            <p class="muted" style="margin:6px 0 0;">${escapeHtml(err.message)}</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="toast bad">Make sure <code>puzzles/${escapeHtml(id)}.json</code> exists and is valid JSON.</div>
        </div>
      </section>
    `;
  }
}

router();


(() => {
  const all = window.GRAMMAR_QUESTIONS || [];
  const $ = s => document.querySelector(s);
  const els = {
    progress: $("#progress"), meta: $("#meta"), questionId: $("#questionId"),
    question: $("#question"), answerCard: $("#answerCard"), answer: $("#answer"),
    explanation: $("#explanation"), answerBtn: $("#answerBtn"), prevBtn: $("#prevBtn"),
    nextBtn: $("#nextBtn"), clearBtn: $("#clearBtn"), pad: $("#pad"),
    settings: $("#settings"), settingsBtn: $("#settingsBtn"), major: $("#majorFilter"),
    difficulty: $("#difficultyFilter"), priority: $("#priorityFilter"),
    shuffle: $("#shuffleToggle"), apply: $("#applyBtn"), reset: $("#resetProgressBtn")
  };

  const STORAGE = "kokugoGrammarAppV1";
  let state = loadState();
  let filtered = [];
  let index = 0;
  let ctx, drawing = false, lastX = 0, lastY = 0;

  function loadState() {
    try {
      return Object.assign({
        major:"", difficulty:"", priority:"", shuffle:false,
        currentId:"GQ00001", seen:{}
      }, JSON.parse(localStorage.getItem(STORAGE) || "{}"));
    } catch(e) {
      return {major:"",difficulty:"",priority:"",shuffle:false,currentId:"GQ00001",seen:{}};
    }
  }
  function saveState() { localStorage.setItem(STORAGE, JSON.stringify(state)); }

  function uniqueMajor() {
    return [...new Set(all.map(q => q.major))];
  }
  function buildMajorOptions() {
    uniqueMajor().forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v; els.major.appendChild(o);
    });
    els.major.value = state.major;
    els.difficulty.value = state.difficulty;
    els.priority.value = state.priority;
    els.shuffle.checked = !!state.shuffle;
  }

  function seededShuffle(arr) {
    // 設定適用ごとに素直なランダム
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function applyFilters(preserveCurrent=true) {
    const currentId = preserveCurrent && filtered[index] ? filtered[index].id : state.currentId;
    filtered = all.filter(q =>
      (!state.major || q.major === state.major) &&
      (!state.difficulty || q.difficulty === state.difficulty) &&
      (!state.priority || q.kyotoPriority === state.priority)
    );
    if (state.shuffle) filtered = seededShuffle(filtered);
    let found = filtered.findIndex(q => q.id === currentId);
    index = found >= 0 ? found : 0;
    render();
  }

  function render() {
    if (!filtered.length) {
      els.progress.textContent = "0 / 0";
      els.meta.textContent = "該当問題なし";
      els.questionId.textContent = "";
      els.question.textContent = "条件に合う問題がありません。出題設定を変更してください。";
      els.answerCard.classList.add("hidden");
      els.prevBtn.disabled = els.nextBtn.disabled = els.answerBtn.disabled = true;
      clearPad();
      return;
    }
    const q = filtered[index];
    state.currentId = q.id;
    saveState();
    els.progress.textContent = `${index + 1} / ${filtered.length}`;
    els.meta.textContent = `${q.difficulty} ・ ${q.major} ・ 京都${q.kyotoPriority}`;
    els.questionId.textContent = `${q.id}  /  ${q.grammarId}`;
    els.question.textContent = q.question;
    els.answer.textContent = q.answer;
    els.explanation.textContent = q.explanation;
    els.answerCard.classList.add("hidden");
    els.answerBtn.textContent = "答えを見る";
    els.prevBtn.disabled = index === 0;
    els.nextBtn.disabled = index === filtered.length - 1;
    els.answerBtn.disabled = false;
    clearPad();
  }

  function showAnswer() {
    if (!filtered.length) return;
    const q = filtered[index];
    els.answerCard.classList.remove("hidden");
    els.answerBtn.textContent = "答え表示中";
    state.seen[q.id] = true;
    saveState();
    // 答えが見えたときに少しだけ下へ。全画面を崩さない程度。
    requestAnimationFrame(() => els.answerCard.scrollIntoView({behavior:"smooth", block:"nearest"}));
  }

  function go(delta) {
    const ni = index + delta;
    if (ni < 0 || ni >= filtered.length) return;
    index = ni; render();
  }

  // Canvas handwriting
  function setupCanvas() {
    const c = els.pad;
    ctx = c.getContext("2d", {alpha:true});
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    c.addEventListener("pointerdown", startDraw);
    c.addEventListener("pointermove", draw);
    c.addEventListener("pointerup", endDraw);
    c.addEventListener("pointercancel", endDraw);
    c.addEventListener("pointerleave", e => { if (drawing && e.pointerType === "mouse") endDraw(e); });
  }
  function resizeCanvas() {
    if (!ctx) return;
    const c = els.pad;
    const rect = c.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const temp = document.createElement("canvas");
    temp.width = c.width; temp.height = c.height;
    temp.getContext("2d").drawImage(c,0,0);
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    ctx = c.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2d2932";
    ctx.lineWidth = 3.2;
    if (temp.width && temp.height) ctx.drawImage(temp,0,0,rect.width,rect.height);
  }
  function point(e) {
    const r = els.pad.getBoundingClientRect();
    return [e.clientX-r.left, e.clientY-r.top];
  }
  function startDraw(e) {
    e.preventDefault();
    els.pad.setPointerCapture?.(e.pointerId);
    drawing = true;
    [lastX,lastY] = point(e);
  }
  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const [x,y] = point(e);
    ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke();
    lastX=x; lastY=y;
  }
  function endDraw(e) { drawing = false; }
  function clearPad() {
    if (!ctx) return;
    const r = els.pad.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
  }

  els.answerBtn.addEventListener("click", showAnswer);
  els.prevBtn.addEventListener("click", () => go(-1));
  els.nextBtn.addEventListener("click", () => go(1));
  els.clearBtn.addEventListener("click", clearPad);
  els.settingsBtn.addEventListener("click", () => els.settings.showModal());
  els.apply.addEventListener("click", () => {
    state.major = els.major.value;
    state.difficulty = els.difficulty.value;
    state.priority = els.priority.value;
    state.shuffle = els.shuffle.checked;
    saveState();
    applyFilters(false);
  });
  els.reset.addEventListener("click", () => {
    if (!confirm("進捗と出題設定をリセットしますか？")) return;
    localStorage.removeItem(STORAGE);
    state = loadState();
    els.major.value = ""; els.difficulty.value = ""; els.priority.value = ""; els.shuffle.checked = false;
    applyFilters(false);
  });

  buildMajorOptions();
  setupCanvas();
  applyFilters(true);
})();

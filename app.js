
(() => {
  const all = window.GRAMMAR_QUESTIONS || [];
  const $ = s => document.querySelector(s);

  const CATEGORY_MAP = {
    "言葉の単位":"文・文節・単語",
    "文の成分":"文・文節・単語",
    "品詞総論":"品詞の基本",
    "名詞":"自立語の品詞",
    "副詞":"自立語の品詞",
    "連体詞":"自立語の品詞",
    "接続詞":"自立語の品詞",
    "感動詞":"自立語の品詞",
    "用言・活用":"用言・活用",
    "助詞":"助詞",
    "助動詞":"助動詞・識別",
    "入試識別・総合":"助動詞・識別",
    "敬語":"敬語"
  };
  const CATEGORY_ORDER = [
    "文・文節・単語","品詞の基本","自立語の品詞",
    "用言・活用","助詞","助動詞・識別","敬語"
  ];
  all.forEach(q => q.category = CATEGORY_MAP[q.major] || q.major);

  const els = {
    progress: $("#progress"), meta: $("#meta"), doneCount: $("#doneCount"),
    wrongCount: $("#wrongCount"), unansweredCount: $("#unansweredCount"),
    questionId: $("#questionId"), question: $("#question"), answerCard: $("#answerCard"),
    answer: $("#answer"), explanation: $("#explanation"), answerBtn: $("#answerBtn"),
    prevBtn: $("#prevBtn"), nextBtn: $("#nextBtn"), clearBtn: $("#clearBtn"), pad: $("#pad"),
    correctBtn: $("#correctBtn"), wrongBtn: $("#wrongBtn"), judgeState: $("#judgeState"),
    settings: $("#settings"), settingsBtn: $("#settingsBtn"),
    category: $("#categoryFilter"), major: $("#majorFilter"),
    difficulty: $("#difficultyFilter"), result: $("#resultFilter"),
    priority: $("#priorityFilter"), shuffle: $("#shuffleToggle"),
    apply: $("#applyBtn"), reset: $("#resetProgressBtn"),
    categoryProgress: $("#categoryProgress")
  };

  const STORAGE = "kokugoGrammarAppV2";
  const LEGACY = "kokugoGrammarAppV1";
  let state = loadState();
  let filtered = [];
  let index = 0;
  let ctx, drawing = false, lastX = 0, lastY = 0;

  function loadState() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      let legacy = {};
      try { legacy = JSON.parse(localStorage.getItem(LEGACY) || "{}"); } catch(e) {}
      return Object.assign({
        category:"", major:"", difficulty:"", result:"", priority:"",
        shuffle:false, currentId:"GQ00001", results:{}
      }, legacy, current);
    } catch(e) {
      return {category:"",major:"",difficulty:"",result:"",priority:"",shuffle:false,currentId:"GQ00001",results:{}};
    }
  }
  function saveState() { localStorage.setItem(STORAGE, JSON.stringify(state)); }

  function statusOf(id) { return state.results[id] || ""; }

  function buildCategoryOptions() {
    CATEGORY_ORDER.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v; els.category.appendChild(o);
    });
    els.category.value = state.category || "";
    refreshMajorOptions();
    els.difficulty.value = state.difficulty || "";
    els.result.value = state.result || "";
    els.priority.value = state.priority || "";
    els.shuffle.checked = !!state.shuffle;
  }

  function refreshMajorOptions() {
    const selected = state.major || els.major.value || "";
    els.major.innerHTML = '<option value="">すべて</option>';
    const majors = [...new Set(all
      .filter(q => !els.category.value || q.category === els.category.value)
      .map(q => q.major))];
    majors.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v; els.major.appendChild(o);
    });
    if (majors.includes(selected)) els.major.value = selected;
  }

  function seededShuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resultMatch(q) {
    const s = statusOf(q.id);
    if (!state.result) return true;
    if (state.result === "unanswered") return !s;
    return s === state.result;
  }

  function applyFilters(preserveCurrent=true) {
    const currentId = preserveCurrent && filtered[index] ? filtered[index].id : state.currentId;
    filtered = all.filter(q =>
      (!state.category || q.category === state.category) &&
      (!state.major || q.major === state.major) &&
      (!state.difficulty || q.difficulty === state.difficulty) &&
      (!state.priority || q.kyotoPriority === state.priority) &&
      resultMatch(q)
    );
    if (state.shuffle) filtered = seededShuffle(filtered);
    let found = filtered.findIndex(q => q.id === currentId);
    index = found >= 0 ? found : 0;
    render();
    renderCategoryProgress();
  }

  function updateGlobalCounts() {
    let correct=0, wrong=0;
    all.forEach(q => {
      const s = statusOf(q.id);
      if (s === "correct") correct++;
      if (s === "wrong") wrong++;
    });
    const unanswered = all.length - correct - wrong;
    els.doneCount.textContent = `できた ${correct}`;
    els.wrongCount.textContent = `できなかった ${wrong}`;
    els.unansweredCount.textContent = `未回答 ${unanswered}`;
  }

  function renderCategoryProgress() {
    els.categoryProgress.innerHTML = "";
    CATEGORY_ORDER.forEach(cat => {
      const arr = all.filter(q => q.category === cat);
      let correct=0, wrong=0;
      arr.forEach(q => {
        const s = statusOf(q.id);
        if (s === "correct") correct++;
        if (s === "wrong") wrong++;
      });
      const answered = correct + wrong;
      const pct = arr.length ? Math.round(answered / arr.length * 100) : 0;
      const row = document.createElement("div");
      row.className = "progress-row";
      row.innerHTML = `
        <div class="progress-name">${cat}</div>
        <div class="progress-numbers">完了 ${answered}/${arr.length}・✕ ${wrong}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      `;
      els.categoryProgress.appendChild(row);
    });
    updateGlobalCounts();
  }

  function renderJudge(q) {
    const s = statusOf(q.id);
    els.correctBtn.classList.toggle("selected", s === "correct");
    els.wrongBtn.classList.toggle("selected", s === "wrong");
    if (s === "correct") els.judgeState.textContent = "記録：できた";
    else if (s === "wrong") els.judgeState.textContent = "記録：できなかった";
    else els.judgeState.textContent = "";
  }

  function render() {
    updateGlobalCounts();
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
    els.meta.textContent = `${q.category} ・ ${q.difficulty} ・ 京都${q.kyotoPriority}`;
    els.questionId.textContent = `${q.id}  /  ${q.grammarId}  /  ${q.major}`;
    els.question.textContent = q.question;
    els.answer.textContent = q.answer;
    els.explanation.textContent = q.explanation;
    els.answerCard.classList.add("hidden");
    els.answerBtn.textContent = "答えを見る";
    els.prevBtn.disabled = index === 0;
    els.nextBtn.disabled = index === filtered.length - 1;
    els.answerBtn.disabled = false;
    renderJudge(q);
    clearPad();
  }

  function showAnswer() {
    if (!filtered.length) return;
    els.answerCard.classList.remove("hidden");
    els.answerBtn.textContent = "答え表示中";
    const q = filtered[index];
    renderJudge(q);
    requestAnimationFrame(() => els.answerCard.scrollIntoView({behavior:"smooth", block:"nearest"}));
  }

  function judge(result) {
    if (!filtered.length) return;
    const q = filtered[index];
    state.results[q.id] = result;
    saveState();
    renderJudge(q);
    renderCategoryProgress();
    // 「未回答だけ」「できた/できなかっただけ」表示中は、採点後に自動で一覧から外さず
    // 次へを押すまで現在の問題を保持する。
  }

  function go(delta) {
    const ni = index + delta;
    if (ni < 0 || ni >= filtered.length) return;
    index = ni; render();
  }

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
    if (c.width && c.height) temp.getContext("2d").drawImage(c,0,0);
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    ctx = c.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#2d2932"; ctx.lineWidth = 3.2;
    if (temp.width && temp.height) ctx.drawImage(temp,0,0,rect.width,rect.height);
  }
  function point(e) {
    const r = els.pad.getBoundingClientRect();
    return [e.clientX-r.left, e.clientY-r.top];
  }
  function startDraw(e) {
    e.preventDefault();
    els.pad.setPointerCapture?.(e.pointerId);
    drawing = true; [lastX,lastY] = point(e);
  }
  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const [x,y] = point(e);
    ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke();
    lastX=x; lastY=y;
  }
  function endDraw() { drawing = false; }
  function clearPad() {
    if (!ctx) return;
    const r = els.pad.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
  }

  els.answerBtn.addEventListener("click", showAnswer);
  els.prevBtn.addEventListener("click", () => go(-1));
  els.nextBtn.addEventListener("click", () => go(1));
  els.clearBtn.addEventListener("click", clearPad);
  els.correctBtn.addEventListener("click", () => judge("correct"));
  els.wrongBtn.addEventListener("click", () => judge("wrong"));

  els.settingsBtn.addEventListener("click", () => {
    renderCategoryProgress();
    els.settings.showModal();
  });
  els.category.addEventListener("change", refreshMajorOptions);

  els.apply.addEventListener("click", () => {
    state.category = els.category.value;
    state.major = els.major.value;
    state.difficulty = els.difficulty.value;
    state.result = els.result.value;
    state.priority = els.priority.value;
    state.shuffle = els.shuffle.checked;
    saveState();
    applyFilters(false);
  });

  els.reset.addEventListener("click", () => {
    if (!confirm("「できた／できなかった」の学習記録をすべて消しますか？")) return;
    state.results = {};
    state.result = "";
    els.result.value = "";
    saveState();
    applyFilters(true);
  });

  buildCategoryOptions();
  setupCanvas();
  applyFilters(true);
})();

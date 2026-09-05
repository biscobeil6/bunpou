
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
    writeLabel: $("#writeLabel"),
    correctBtn: $("#correctBtn"), wrongBtn: $("#wrongBtn"), judgeState: $("#judgeState"),
    settings: $("#settings"), settingsBtn: $("#settingsBtn"),
    category: $("#categoryFilter"), major: $("#majorFilter"),
    difficulty: $("#difficultyFilter"), result: $("#resultFilter"),
    priority: $("#priorityFilter"), shuffle: $("#shuffleToggle"),
    apply: $("#applyBtn"), reset: $("#resetProgressBtn"),
    categoryProgress: $("#categoryProgress"),
    categoryButtons: $("#categoryButtons"),
    topResult: $("#topResultFilter"),
    topDifficulty: $("#topDifficultyFilter")
  };

  const STORAGE = "kokugoGrammarAppV3";
  const LEGACY_V2 = "kokugoGrammarAppV2";
  const LEGACY_V1 = "kokugoGrammarAppV1";
  let state = loadState();
  let filtered = [];
  let index = 0;
  let ctx, drawing = false, lastX = 0, lastY = 0;
  let templateText = "";

  function loadState() {
    try {
      let old = {};
      try { old = JSON.parse(localStorage.getItem(LEGACY_V2) || "{}"); } catch(e) {}
      if (!Object.keys(old).length) {
        try { old = JSON.parse(localStorage.getItem(LEGACY_V1) || "{}"); } catch(e) {}
      }
      const current = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      return Object.assign({
        category:"", major:"", difficulty:"", result:"", priority:"",
        shuffle:false, currentId:"GQ00001", results:{}
      }, old, current);
    } catch(e) {
      return {category:"",major:"",difficulty:"",result:"",priority:"",shuffle:false,currentId:"GQ00001",results:{}};
    }
  }
  function saveState() { localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function statusOf(id) { return state.results[id] || ""; }

  function buildControls() {
    // トップ分類ボタン
    const allBtn = document.createElement("button");
    allBtn.className = "catbtn";
    allBtn.dataset.category = "";
    allBtn.textContent = "すべて";
    els.categoryButtons.appendChild(allBtn);
    CATEGORY_ORDER.forEach(v => {
      const b = document.createElement("button");
      b.className = "catbtn";
      b.dataset.category = v;
      b.textContent = v;
      els.categoryButtons.appendChild(b);
    });
    els.categoryButtons.addEventListener("click", e => {
      const b = e.target.closest(".catbtn");
      if (!b) return;
      state.category = b.dataset.category;
      state.major = "";
      saveState();
      syncControls();
      applyFilters(false);
    });

    CATEGORY_ORDER.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v; els.category.appendChild(o);
    });
    syncControls();
  }

  function syncControls() {
    els.category.value = state.category || "";
    els.topResult.value = state.result || "";
    els.topDifficulty.value = state.difficulty || "";
    els.difficulty.value = state.difficulty || "";
    els.result.value = state.result || "";
    els.priority.value = state.priority || "";
    els.shuffle.checked = !!state.shuffle;
    refreshMajorOptions();

    document.querySelectorAll(".catbtn").forEach(b => {
      b.classList.toggle("active", b.dataset.category === (state.category || ""));
    });
  }

  function refreshMajorOptions() {
    const selected = state.major || "";
    els.major.innerHTML = '<option value="">すべて</option>';
    const majors = [...new Set(all
      .filter(q => !state.category || q.category === state.category)
      .map(q => q.major))];
    majors.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v; els.major.appendChild(o);
    });
    if (majors.includes(selected)) els.major.value = selected;
  }

  function shuffled(arr) {
    const copy = [...arr];
    for (let i=copy.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }
  function resultMatch(q) {
    const s=statusOf(q.id);
    if (!state.result) return true;
    if (state.result==="unanswered") return !s;
    return s===state.result;
  }

  function applyFilters(preserveCurrent=true) {
    const currentId = preserveCurrent && filtered[index] ? filtered[index].id : state.currentId;
    filtered = all.filter(q =>
      (!state.category || q.category===state.category) &&
      (!state.major || q.major===state.major) &&
      (!state.difficulty || q.difficulty===state.difficulty) &&
      (!state.priority || q.kyotoPriority===state.priority) &&
      resultMatch(q)
    );
    if (state.shuffle) filtered=shuffled(filtered);
    const found=filtered.findIndex(q=>q.id===currentId);
    index=found>=0?found:0;
    render();
    renderCategoryProgress();
  }

  function updateGlobalCounts() {
    let correct=0,wrong=0;
    all.forEach(q=>{
      const s=statusOf(q.id);
      if(s==="correct") correct++;
      if(s==="wrong") wrong++;
    });
    els.doneCount.textContent=`できた ${correct}`;
    els.wrongCount.textContent=`できなかった ${wrong}`;
    els.unansweredCount.textContent=`未回答 ${all.length-correct-wrong}`;
  }

  function renderCategoryProgress() {
    els.categoryProgress.innerHTML="";
    CATEGORY_ORDER.forEach(cat=>{
      const arr=all.filter(q=>q.category===cat);
      let correct=0,wrong=0;
      arr.forEach(q=>{
        const s=statusOf(q.id);
        if(s==="correct") correct++;
        if(s==="wrong") wrong++;
      });
      const answered=correct+wrong;
      const pct=arr.length?Math.round(answered/arr.length*100):0;
      const row=document.createElement("div");
      row.className="progress-row";
      row.innerHTML=`
        <div class="progress-name">${cat}</div>
        <div class="progress-numbers">完了 ${answered}/${arr.length}・✕ ${wrong}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`;
      els.categoryProgress.appendChild(row);
    });
    updateGlobalCounts();
  }

  function renderJudge(q) {
    const s=statusOf(q.id);
    els.correctBtn.classList.toggle("selected",s==="correct");
    els.wrongBtn.classList.toggle("selected",s==="wrong");
    els.judgeState.textContent=s==="correct"?"記録：できた":s==="wrong"?"記録：できなかった":"";
  }

  // 「区切って／を入れる」問題から元文だけを取り出し、記載欄に印字
  function extractTemplateText(q) {
    if (!q) return "";
    const isSplit = /区切り[、,]?「?／」?を入れて/.test(q.question) ||
                    /単語に区切り/.test(q.question) ||
                    /文節に区切り/.test(q.question);
    if (!isSplit) return "";
    const quoted = [...q.question.matchAll(/「([^」]+)」/g)].map(m=>m[1]);
    if (!quoted.length) return "";
    // 最後の引用が問題文中の対象文であることが多い
    let t = quoted[quoted.length-1];
    if (t === "／") return "";
    return t;
  }

  function render() {
    updateGlobalCounts();
    if(!filtered.length){
      els.progress.textContent="0 / 0";
      els.meta.textContent="該当問題なし";
      els.questionId.textContent="";
      els.question.textContent="条件に合う問題がありません。トップの分類・学習記録か、歯車の設定を変更してください。";
      els.answerCard.classList.add("hidden");
      els.prevBtn.disabled=els.nextBtn.disabled=els.answerBtn.disabled=true;
      templateText="";
      clearPad();
      return;
    }
    const q=filtered[index];
    state.currentId=q.id; saveState();
    els.progress.textContent=`${index+1} / ${filtered.length}`;
    els.meta.textContent=`${q.category} ・ ${q.difficulty} ・ 京都${q.kyotoPriority}`;
    els.questionId.textContent=`${q.id} / ${q.grammarId} / ${q.major}`;
    els.question.textContent=q.question;
    els.answer.textContent=q.answer;
    els.explanation.textContent=q.explanation;
    els.answerCard.classList.add("hidden");
    els.answerBtn.textContent="答えを見る";
    els.prevBtn.disabled=index===0;
    els.nextBtn.disabled=index===filtered.length-1;
    els.answerBtn.disabled=false;

    templateText=extractTemplateText(q);
    els.writeLabel.textContent=templateText ? "文に「／」を書き込む" : "ここに書く";

    renderJudge(q);
    clearPad();
  }

  function showAnswer(){
    if(!filtered.length) return;
    els.answerCard.classList.remove("hidden");
    els.answerBtn.textContent="答え表示中";
    renderJudge(filtered[index]);
    requestAnimationFrame(()=>els.answerCard.scrollIntoView({behavior:"smooth",block:"nearest"}));
  }
  function judge(result){
    if(!filtered.length) return;
    state.results[filtered[index].id]=result;
    saveState();
    renderJudge(filtered[index]);
    renderCategoryProgress();
  }
  function go(delta){
    const ni=index+delta;
    if(ni<0||ni>=filtered.length)return;
    index=ni; render();
  }

  function setupCanvas(){
    ctx=els.pad.getContext("2d",{alpha:true});
    resizeCanvas();
    window.addEventListener("resize",resizeCanvas);
    els.pad.addEventListener("pointerdown",startDraw);
    els.pad.addEventListener("pointermove",draw);
    els.pad.addEventListener("pointerup",endDraw);
    els.pad.addEventListener("pointercancel",endDraw);
    els.pad.addEventListener("pointerleave",e=>{if(drawing&&e.pointerType==="mouse")endDraw();});
  }
  function configureContext(){
    const dpr=Math.max(1,window.devicePixelRatio||1);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineCap="round";ctx.lineJoin="round";
    ctx.strokeStyle="#2d2932";ctx.lineWidth=3.0;
  }
  function resizeCanvas(){
    if(!ctx)return;
    const c=els.pad,r=c.getBoundingClientRect(),dpr=Math.max(1,window.devicePixelRatio||1);
    c.width=Math.floor(r.width*dpr);c.height=Math.floor(r.height*dpr);
    ctx=c.getContext("2d");
    configureContext();
    renderTemplate();
  }
  function renderTemplate(){
    if(!ctx)return;
    const r=els.pad.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    // うっすら罫線
    ctx.save();
    ctx.strokeStyle="#f0edf4";ctx.lineWidth=1;
    for(let y=38;y<r.height;y+=38){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke();
    }
    if(templateText){
      ctx.fillStyle="#55515d";
      ctx.font='600 24px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.textBaseline="middle";
      const maxWidth=r.width-32;
      // 1行に収まらなければ文字単位で2行へ
      let line="", lines=[];
      for(const ch of templateText){
        const test=line+ch;
        if(ctx.measureText(test).width>maxWidth && line){
          lines.push(line);line=ch;
        }else line=test;
      }
      if(line)lines.push(line);
      const lineHeight=38;
      const startY=Math.max(28,(r.height-(lines.length-1)*lineHeight)/2);
      lines.slice(0,3).forEach((ln,i)=>ctx.fillText(ln,16,startY+i*lineHeight,maxWidth));
    }
    ctx.restore();
    configureContext();
  }
  function point(e){
    const r=els.pad.getBoundingClientRect();
    return[e.clientX-r.left,e.clientY-r.top];
  }
  function startDraw(e){
    e.preventDefault();
    els.pad.setPointerCapture?.(e.pointerId);
    drawing=true;[lastX,lastY]=point(e);
  }
  function draw(e){
    if(!drawing)return;
    e.preventDefault();
    const[x,y]=point(e);
    ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(x,y);ctx.stroke();
    lastX=x;lastY=y;
  }
  function endDraw(){drawing=false;}
  function clearPad(){renderTemplate();}

  els.answerBtn.addEventListener("click",showAnswer);
  els.prevBtn.addEventListener("click",()=>go(-1));
  els.nextBtn.addEventListener("click",()=>go(1));
  els.clearBtn.addEventListener("click",clearPad);
  els.correctBtn.addEventListener("click",()=>judge("correct"));
  els.wrongBtn.addEventListener("click",()=>judge("wrong"));

  els.topResult.addEventListener("change",()=>{
    state.result=els.topResult.value;saveState();syncControls();applyFilters(false);
  });
  els.topDifficulty.addEventListener("change",()=>{
    state.difficulty=els.topDifficulty.value;saveState();syncControls();applyFilters(false);
  });

  els.settingsBtn.addEventListener("click",()=>{
    syncControls();renderCategoryProgress();els.settings.showModal();
  });
  els.category.addEventListener("change",()=>{
    state.category=els.category.value;state.major="";refreshMajorOptions();
  });

  els.apply.addEventListener("click",()=>{
    state.category=els.category.value;
    state.major=els.major.value;
    state.difficulty=els.difficulty.value;
    state.result=els.result.value;
    state.priority=els.priority.value;
    state.shuffle=els.shuffle.checked;
    saveState();syncControls();applyFilters(false);
  });

  els.reset.addEventListener("click",()=>{
    if(!confirm("「できた／できなかった」の学習記録をすべて消しますか？"))return;
    state.results={};state.result="";
    saveState();syncControls();applyFilters(true);
  });

  buildControls();
  setupCanvas();
  applyFilters(true);
})();

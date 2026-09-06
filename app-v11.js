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
    homeView:$("#homeView"), quizView:$("#quizView"), referenceView:$("#referenceView"),
    categoryGrid:$("#categoryGrid"), allQuestionsBtn:$("#allQuestionsBtn"), grammarReferenceBtn:$("#grammarReferenceBtn"), referenceHomeBtn:$("#referenceHomeBtn"), referenceCategoryNav:$("#referenceCategoryNav"), referenceContent:$("#referenceContent"),
    homeAnswered:$("#homeAnswered"), homeWrong:$("#homeWrong"),
    homeResult:$("#homeResultFilter"), homeDifficulty:$("#homeDifficultyFilter"),
    settingsBtnHome:$("#settingsBtnHome"), settingsBtnQuiz:$("#settingsBtnQuiz"),
    homeBtn:$("#homeBtn"),

    progress:$("#progress"), meta:$("#meta"), doneCount:$("#doneCount"),
    wrongCount:$("#wrongCount"), unansweredCount:$("#unansweredCount"),
    questionId:$("#questionId"), question:$("#question"),
    answerCard:$("#answerCard"), answer:$("#answer"), explanation:$("#explanation"),
    answerBtn:$("#answerBtn"), prevBtn:$("#prevBtn"), nextBtn:$("#nextBtn"),
    clearBtn:$("#clearBtn"), pad:$("#pad"), writeLabel:$("#writeLabel"),
    templateText:$("#templateText"), inputDebug:$("#inputDebug"),
    correctBtn:$("#correctBtn"), wrongBtn:$("#wrongBtn"), judgeState:$("#judgeState"),

    settings:$("#settings"), major:$("#majorFilter"), priority:$("#priorityFilter"),
    shuffle:$("#shuffleToggle"), apply:$("#applyBtn"), reset:$("#resetProgressBtn"),
    categoryProgress:$("#categoryProgress")
  };

  const STORAGE="kokugoGrammarAppV5_single";
  const LEGACY=["kokugoGrammarAppV3","kokugoGrammarAppV2","kokugoGrammarAppV1"];
  let state=loadState();
  let filtered=[], index=0, ctx, drawing=false, lastX=0,lastY=0;
  let activeCategory="";

  function loadState(){
    let merged={category:"",major:"",difficulty:"",result:"",priority:"",shuffle:false,currentId:"GQ00001",results:{}};
    for(const key of LEGACY){
      try{
        const old=JSON.parse(localStorage.getItem(key)||"{}");
        if(Object.keys(old).length){ merged=Object.assign(merged,old); break; }
      }catch(e){}
    }
    try{
      merged=Object.assign(merged,JSON.parse(localStorage.getItem(STORAGE)||"{}"));
    }catch(e){}
    return merged;
  }
  function saveState(){localStorage.setItem(STORAGE,JSON.stringify(state))}
  function statusOf(id){return state.results[id]||""}

  function showHome(){
    els.quizView.classList.add("hidden");
    els.referenceView.classList.add("hidden");
    els.homeView.classList.remove("hidden");
    activeCategory="";
    state.category="";
    state.major="";
    saveState();
    renderHome();
    window.scrollTo({top:0,behavior:"instant"});
  }
  function showQuiz(category){
    activeCategory=category||"";
    state.category=activeCategory;
    state.major="";
    saveState();
    applyFilters(false);
    els.homeView.classList.add("hidden");
    els.referenceView.classList.add("hidden");
    els.quizView.classList.remove("hidden");
    requestAnimationFrame(()=>{resizeCanvas();window.scrollTo({top:0,behavior:"instant"});});
  }


  function renderReference(){
    const data = window.GRAMMAR_LECTURE || [];
    const majors = [...new Set(data.map(x=>x.major))];

    els.referenceCategoryNav.innerHTML = "";
    els.referenceContent.innerHTML = "";

    majors.forEach((major, idx)=>{
      const nav = document.createElement("button");
      nav.className = "ref-nav-btn" + (idx===0 ? " active" : "");
      nav.textContent = major;
      nav.addEventListener("click", ()=>{
        document.querySelectorAll(".ref-nav-btn").forEach(b=>b.classList.remove("active"));
        nav.classList.add("active");
        document.getElementById("ref-" + idx)?.scrollIntoView({behavior:"smooth", block:"start"});
      });
      els.referenceCategoryNav.appendChild(nav);

      const section = document.createElement("section");
      section.className = "ref-section";
      section.id = "ref-" + idx;

      const h = document.createElement("h2");
      h.className = "ref-section-title";
      h.textContent = major;
      section.appendChild(h);

      const grid = document.createElement("div");
      grid.className = "ref-card-grid";

      data.filter(x=>x.major===major).forEach(x=>{
        const card = document.createElement("article");
        card.className = "ref-card";
        const impClass = x.importance==="A" ? " imp-a" : "";
        card.innerHTML = `
          <div class="ref-card-head">
            <div class="ref-item">${x.item}</div>
            <span class="ref-importance${impClass}">重要度 ${x.importance}</span>
          </div>
          <div class="ref-label">それが何か</div>
          <div class="ref-text">${x.description}</div>
          <div class="ref-label">代表例</div>
          <div class="ref-example">${x.example}</div>
          <div class="ref-label">押さえるポイント</div>
          <div class="ref-text">${x.point}</div>
        `;
        grid.appendChild(card);
      });

      section.appendChild(grid);
      els.referenceContent.appendChild(section);
    });
  }

  function showReference(){
    els.homeView.classList.add("hidden");
    els.quizView.classList.add("hidden");
    els.referenceView.classList.remove("hidden");
    renderReference();
    window.scrollTo({top:0,behavior:"instant"});
  }

  function resultMatch(q){
    const s=statusOf(q.id);
    if(!state.result)return true;
    if(state.result==="unanswered")return !s;
    return s===state.result;
  }

  function applyFilters(preserveCurrent=true){
    const currentId=preserveCurrent&&filtered[index]?filtered[index].id:state.currentId;
    filtered=all.filter(q=>
      (!activeCategory||q.category===activeCategory)&&
      (!state.major||q.major===state.major)&&
      (!state.difficulty||q.difficulty===state.difficulty)&&
      (!state.priority||q.kyotoPriority===state.priority)&&
      resultMatch(q)
    );
    if(state.shuffle){
      filtered=[...filtered];
      for(let i=filtered.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [filtered[i],filtered[j]]=[filtered[j],filtered[i]];
      }
    }
    const found=filtered.findIndex(q=>q.id===currentId);
    index=found>=0?found:0;
    renderQuiz();
    renderCategoryProgress();
  }

  function counts(arr){
    let correct=0,wrong=0;
    arr.forEach(q=>{
      const s=statusOf(q.id);
      if(s==="correct")correct++;
      if(s==="wrong")wrong++;
    });
    return {correct,wrong,answered:correct+wrong,total:arr.length};
  }

  function renderHome(){
    els.homeResult.value=state.result||"";
    els.homeDifficulty.value=state.difficulty||"";
    const total=counts(all);
    els.homeAnswered.textContent=`完了 ${total.answered}`;
    els.homeWrong.textContent=`できなかった ${total.wrong}`;

    els.categoryGrid.innerHTML="";
    CATEGORY_ORDER.forEach(cat=>{
      const arr=all.filter(q=>q.category===cat);
      const c=counts(arr);
      const pct=c.total?Math.round(c.answered/c.total*100):0;
      const btn=document.createElement("button");
      btn.className="category-card";
      btn.innerHTML=`
        <div class="category-name">${cat}</div>
        <div class="category-stats">
          ${c.total}問<br>
          完了 ${c.answered}問<br>
          できなかった ${c.wrong}問
          <div class="bar"><span style="width:${pct}%"></span></div>
        </div>`;
      btn.addEventListener("click",()=>showQuiz(cat));
      els.categoryGrid.appendChild(btn);
    });
  }

  function updateGlobalCounts(){
    const c=counts(all);
    els.doneCount.textContent=`できた ${c.correct}`;
    els.wrongCount.textContent=`できなかった ${c.wrong}`;
    els.unansweredCount.textContent=`未回答 ${c.total-c.answered}`;
  }

  function renderCategoryProgress(){
    els.categoryProgress.innerHTML="";
    CATEGORY_ORDER.forEach(cat=>{
      const arr=all.filter(q=>q.category===cat),c=counts(arr);
      const pct=c.total?Math.round(c.answered/c.total*100):0;
      const row=document.createElement("div");
      row.className="progress-row";
      row.innerHTML=`
        <div class="progress-name">${cat}</div>
        <div class="progress-numbers">完了 ${c.answered}/${c.total}・✕ ${c.wrong}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`;
      els.categoryProgress.appendChild(row);
    });
    updateGlobalCounts();
  }

  function refreshMajorOptions(){
    const selected=state.major||"";
    els.major.innerHTML='<option value="">すべて</option>';
    const majors=[...new Set(all.filter(q=>!activeCategory||q.category===activeCategory).map(q=>q.major))];
    majors.forEach(v=>{
      const o=document.createElement("option");
      o.value=v;o.textContent=v;els.major.appendChild(o);
    });
    if(majors.includes(selected))els.major.value=selected;
  }

  function renderJudge(q){
    const s=statusOf(q.id);
    els.correctBtn.classList.toggle("selected",s==="correct");
    els.wrongBtn.classList.toggle("selected",s==="wrong");
    els.judgeState.textContent=s==="correct"?"記録：できた":s==="wrong"?"記録：できなかった":"";
  }

  function extractTemplateText(q){
    if(!q)return "";
    // 「単語/文節に区切り、『／』を入れて」タイプを幅広く拾う
    const splitInstruction =
      q.question.includes("「／」を入れて") ||
      q.question.includes("／」を入れて") ||
      /単語に区切/.test(q.question) ||
      /文節に区切/.test(q.question);
    if(!splitInstruction)return "";

    const quoted=[...q.question.matchAll(/「([^」]+)」/g)].map(m=>m[1]);
    const candidates=quoted.filter(t=>t!=="／" && t.length>=2);
    if(!candidates.length)return "";

    // 最後の引用が対象文である設計
    return candidates[candidates.length-1];
  }

  function renderTemplate(q){
    const t=extractTemplateText(q);
    if(t){
      els.templateText.textContent=t;
      els.templateText.classList.remove("hidden");
      els.writeLabel.textContent="文に「／」を書き込む";
    }else{
      els.templateText.textContent="";
      els.templateText.classList.add("hidden");
      els.writeLabel.textContent="ここに書く";
    }
  }

  function renderQuiz(){
    updateGlobalCounts();
    if(!filtered.length){
      els.progress.textContent="0 / 0";
      els.meta.textContent="該当問題なし";
      els.questionId.textContent="";
      els.question.textContent="この条件に合う問題はありません。トップへ戻って条件を変更してください。";
      els.answerCard.classList.add("hidden");
      els.prevBtn.disabled=els.nextBtn.disabled=els.answerBtn.disabled=true;
      els.templateText.classList.add("hidden");
      clearPad();
      return;
    }
    const q=filtered[index];
    state.currentId=q.id;saveState();
    els.progress.textContent=`${index+1} / ${filtered.length}`;
    els.meta.textContent=`${q.difficulty} ・ ${q.category} ・ 京都${q.kyotoPriority}`;
    els.questionId.textContent=`${q.id} / ${q.grammarId} / ${q.major}`;
    els.question.textContent=q.question;
    els.answer.textContent=q.answer;
    els.explanation.textContent=q.explanation;
    els.answerCard.classList.add("hidden");
    els.answerBtn.textContent="答えを見る";
    els.prevBtn.disabled=index===0;
    els.nextBtn.disabled=index===filtered.length-1;
    els.answerBtn.disabled=false;
    renderJudge(q);
    renderTemplate(q);
    clearPad();
  }

  function showAnswer(){
    if(!filtered.length)return;
    els.answerCard.classList.remove("hidden");
    els.answerBtn.textContent="答え表示中";
    renderJudge(filtered[index]);
    // 自動スクロールはしない。iPadで上下位置が飛ばないよう固定。
  }

  function judge(result){
    if(!filtered.length)return;
    state.results[filtered[index].id]=result;
    saveState();
    renderJudge(filtered[index]);
    renderCategoryProgress();
  }
  function go(delta){
    const ni=index+delta;
    if(ni<0||ni>=filtered.length)return;
    index=ni;renderQuiz();
  }

  // ===== 社会アプリ v3.2 で安定していた手書き入力モデル =====
  // iPad SafariはApple PencilをPointer Events / Touch Eventsのどちらでも
  // 通知することがあるため、両方を待ち受け、開始時だけ重複除外する。
  let strokes = [];
  let currentStroke = null;
  let activePointerId = null;
  let lastPoint = null;

  function resizeCanvas(){
    const handCanvas = els.pad;
    if(!handCanvas) return;
    const rect = handCanvas.getBoundingClientRect();

    // quiz画面がhidden中は幅0になるため、その時は触らない。
    // 問題画面を表示した後のrequestAnimationFrameから再度呼ばれる。
    if(!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    handCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    handCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx = handCanvas.getContext("2d", {alpha:true, desynchronized:true});
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawAllStrokes();
  }

  function setupCanvas(){
    const handCanvas = els.pad;
    if(!handCanvas) return;

    resizeCanvas();

    if(els.inputDebug) els.inputDebug.textContent = "V11 / 入力待機";

    let activeSource = null;
    let touchId = null;
    let lastStart = {time:-Infinity,x:0,y:0,source:null};

    const pos = e => {
      const r = handCanvas.getBoundingClientRect();
      return {x:e.clientX-r.left, y:e.clientY-r.top};
    };
    const near = (a,b) => Math.hypot(a.x-b.x,a.y-b.y) < 12;
    const eventPoint = e => ({x:e.clientX,y:e.clientY});

    const configure = () => {
      ctx.strokeStyle = "#2d2932";
      ctx.fillStyle = "#2d2932";
      ctx.lineWidth = 3.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    const segment = (a,b) => {
      configure();
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke();
    };

    const dot = p => {
      configure();
      ctx.beginPath();
      ctx.arc(p.x,p.y,1.7,0,Math.PI*2);
      ctx.fill();
    };

    const batch = e =>
      typeof e.getCoalescedEvents === "function" && e.getCoalescedEvents()?.length
        ? e.getCoalescedEvents()
        : [e];

    const append = e => {
      if(!currentStroke) return;
      for(const ev of batch(e)){
        const p = pos(ev);
        if(!lastPoint){
          currentStroke.push(p);
          lastPoint = p;
          dot(p);
          continue;
        }
        if(Math.abs(p.x-lastPoint.x)<.05 && Math.abs(p.y-lastPoint.y)<.05) continue;
        currentStroke.push(p);
        segment(lastPoint,p);
        lastPoint = p;
      }
    };

    const reset = () => {
      activePointerId = null;
      currentStroke = null;
      lastPoint = null;
    };

    const begin = e => {
      reset();
      activePointerId = e.pointerId;
      currentStroke = [];
      strokes.push(currentStroke);
      append(e);

      const kind = e.pointerType || "unknown";
      if(els.inputDebug) els.inputDebug.textContent = `V11 input: ${kind}`;
    };

    const finish = e => {
      if(activePointerId===null || !currentStroke) return;
      if(e && e.pointerId!==undefined && e.pointerId!==activePointerId) return;
      if(e?.type==="pointerup") append(e);
      reset();
    };

    const duplicate = (source,e) => {
      const now = performance.now();
      const p = eventPoint(e);
      const dup = source!==lastStart.source &&
                  now-lastStart.time<120 &&
                  near(p,lastStart);
      if(!dup) lastStart={time:now,x:p.x,y:p.y,source};
      return dup;
    };

    // Safariの文字選択・コピー・コールアウトがPencilの線を奪わないようにする
    handCanvas.oncontextmenu = e => e.preventDefault();
    for(const ev of ["selectstart","dragstart","gesturestart"]){
      handCanvas.addEventListener(ev,e=>e.preventDefault(),{passive:false});
    }

    // Pointer Events経路
    if("PointerEvent" in window){
      handCanvas.addEventListener("pointerdown",e=>{
        e.preventDefault();
        if(duplicate("pointer",e)) return;
        activeSource = "pointer";
        begin(e);
      },{passive:false});

      for(const ev of ["pointermove","pointerrawupdate"]){
        handCanvas.addEventListener(ev,e=>{
          if(activeSource==="touch") return;

          // Safariがpointerdownを落としてもpenの移動から復帰
          if((activePointerId===null || !currentStroke) &&
             e.pointerType==="pen" &&
             (e.pressure>0 || e.buttons!==0)){
            begin(e);
          }

          if(e.pointerId!==activePointerId || !currentStroke) return;
          e.preventDefault();
          append(e);
        },{passive:false});
      }

      for(const ev of ["pointerup","pointercancel"]){
        handCanvas.addEventListener(ev,e=>{
          if(activeSource!=="pointer") return;
          e.preventDefault();
          finish(e);
          activeSource = null;
        },{passive:false});
      }
    }

    // Touch Events経路
    // Apple PencilがTouchとして届くiPad Safariでも書けるようにする
    const findTouch = (list,id) =>
      Array.from(list||[]).find(t=>t.identifier===id);

    handCanvas.addEventListener("touchstart",e=>{
      const t = e.changedTouches?.[0];
      if(!t) return;
      e.preventDefault();

      const synthetic = {
        pointerId:`t-${t.identifier}`,
        pointerType:t.touchType==="stylus" ? "pen" : "touch",
        pressure:t.force || 1,
        buttons:1,
        clientX:t.clientX,
        clientY:t.clientY
      };

      if(duplicate("touch",synthetic)) return;

      activeSource = "touch";
      touchId = t.identifier;
      begin(synthetic);
    },{passive:false});

    handCanvas.addEventListener("touchmove",e=>{
      if(activeSource!=="touch" || touchId===null) return;
      const t = findTouch(e.changedTouches,touchId) ||
                findTouch(e.touches,touchId);
      if(!t) return;
      e.preventDefault();

      append({
        pointerId:`t-${touchId}`,
        pointerType:t.touchType==="stylus" ? "pen" : "touch",
        clientX:t.clientX,
        clientY:t.clientY
      });
    },{passive:false});

    for(const ev of ["touchend","touchcancel"]){
      handCanvas.addEventListener(ev,e=>{
        if(activeSource!=="touch") return;
        e.preventDefault();
        finish({pointerId:`t-${touchId}`});
        touchId = null;
        activeSource = null;
      },{passive:false});
    }

    // 国語アプリはトップ→問題画面でcanvasの表示状態が変わるため、
    // resize処理を共通関数に集約する。
    window.addEventListener("resize",resizeCanvas,{passive:true});
  }

  function drawAllStrokes(){
    if(!ctx || !els.pad) return;
    const r = els.pad.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    ctx.strokeStyle="#2d2932";
    ctx.fillStyle="#2d2932";
    ctx.lineWidth=3.4;
    ctx.lineCap="round";
    ctx.lineJoin="round";

    for(const stroke of strokes){
      if(!stroke.length) continue;

      if(stroke.length===1){
        ctx.beginPath();
        ctx.arc(stroke[0].x,stroke[0].y,1.7,0,Math.PI*2);
        ctx.fill();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x,stroke[0].y);
      for(const p of stroke.slice(1)){
        ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
  }

  function clearPad(){
    strokes = [];
    currentStroke = null;
    activePointerId = null;
    lastPoint = null;
    drawAllStrokes();
    if(els.inputDebug) els.inputDebug.textContent = "V11 / 入力待機";
  }

  function openSettings(){
    refreshMajorOptions();
    els.priority.value=state.priority||"";
    els.shuffle.checked=!!state.shuffle;
    renderCategoryProgress();
    els.settings.showModal();
  }

  els.allQuestionsBtn.addEventListener("click",()=>showQuiz(""));
  els.grammarReferenceBtn.addEventListener("click",showReference);
  els.referenceHomeBtn.addEventListener("click",showHome);
  els.homeBtn.addEventListener("click",showHome);
  els.settingsBtnHome.addEventListener("click",openSettings);
  els.settingsBtnQuiz.addEventListener("click",openSettings);

  els.homeResult.addEventListener("change",()=>{
    state.result=els.homeResult.value;saveState();renderHome();
  });
  els.homeDifficulty.addEventListener("change",()=>{
    state.difficulty=els.homeDifficulty.value;saveState();renderHome();
  });

  els.answerBtn.addEventListener("click",showAnswer);
  els.prevBtn.addEventListener("click",()=>go(-1));
  els.nextBtn.addEventListener("click",()=>go(1));
  els.clearBtn.addEventListener("click",clearPad);
  els.correctBtn.addEventListener("click",()=>judge("correct"));
  els.wrongBtn.addEventListener("click",()=>judge("wrong"));

  els.apply.addEventListener("click",()=>{
    state.major=els.major.value;
    state.priority=els.priority.value;
    state.shuffle=els.shuffle.checked;
    saveState();
    if(!els.quizView.classList.contains("hidden"))applyFilters(false);
    renderHome();
  });

  els.reset.addEventListener("click",()=>{
    if(!confirm("「できた／できなかった」の学習記録をすべて消しますか？"))return;
    state.results={};state.result="";
    saveState();renderHome();renderCategoryProgress();
  });

  setupCanvas();
  showHome();
})();

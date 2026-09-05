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

  let activePointerId = null;

  function clearNativeSelection(){
    try{
      const sel = window.getSelection?.();
      if(sel && sel.rangeCount) sel.removeAllRanges();
    }catch(_){}
  }

  function setInputDebug(type, extra=""){
    if(!els.inputDebug) return;
    const label = type==="pen" ? "pen" : type==="touch" ? "touch" : type==="mouse" ? "mouse" : type || "不明";
    els.inputDebug.textContent = "Pencil: " + label + (extra ? " " + extra : "");
  }

  function suppressSafari(e){
    if(!els.quizView.classList.contains("hidden")){
      clearNativeSelection();
    }
  }

  function setupCanvas(){
    ctx=els.pad.getContext("2d",{alpha:true});
    resizeCanvas();

    window.addEventListener("resize",resizeCanvas,{passive:true});

    // Canvas自身
    els.pad.addEventListener("pointerdown",startDraw,{passive:false});
    els.pad.addEventListener("pointermove",draw,{passive:false});
    els.pad.addEventListener("pointerup",endDraw,{passive:false});
    els.pad.addEventListener("pointercancel",cancelDraw,{passive:false});
    els.pad.addEventListener("lostpointercapture",lostCapture,{passive:false});

    // Pointer captureがSafari側で途切れても、windowでストロークを拾い続ける
    window.addEventListener("pointermove",globalPointerMove,{capture:true,passive:false});
    window.addEventListener("pointerup",globalPointerUp,{capture:true,passive:false});
    window.addEventListener("pointercancel",globalPointerCancel,{capture:true,passive:false});

    // iPad Safariの選択・コピー・長押し対策
    ["contextmenu","selectstart","dragstart"].forEach(type=>{
      els.pad.addEventListener(type,e=>e.preventDefault(),{capture:true});
      els.pad.closest(".pad-wrap")?.addEventListener(type,e=>e.preventDefault(),{capture:true});
    });

    // touch系のブラウザ既定動作も明示的に止める
    ["touchstart","touchmove","touchend","touchcancel"].forEach(type=>{
      els.pad.addEventListener(type,e=>{
        e.preventDefault();
        clearNativeSelection();
      },{passive:false,capture:true});
    });

    document.addEventListener("selectionchange",suppressSafari,{passive:true});
    document.addEventListener("gesturestart",e=>{
      if(drawing){ e.preventDefault(); clearNativeSelection(); }
    },{passive:false});
    document.addEventListener("gesturechange",e=>{
      if(drawing){ e.preventDefault(); clearNativeSelection(); }
    },{passive:false});
    document.addEventListener("gestureend",e=>{
      if(drawing){ e.preventDefault(); clearNativeSelection(); }
    },{passive:false});
  }

  function configureContext(){
    const dpr=Math.max(1,window.devicePixelRatio||1);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineCap="round";
    ctx.lineJoin="round";
    ctx.strokeStyle="#2d2932";
    ctx.lineWidth=3;
  }

  function resizeCanvas(){
    const r=els.pad.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const dpr=Math.max(1,window.devicePixelRatio||1);
    els.pad.width=Math.max(1,Math.floor(r.width*dpr));
    els.pad.height=Math.max(1,Math.floor(r.height*dpr));
    ctx=els.pad.getContext("2d",{alpha:true});
    configureContext();
  }

  function point(e){
    const r=els.pad.getBoundingClientRect();
    return [e.clientX-r.left,e.clientY-r.top];
  }

  function pointInsideCanvas(e){
    const r=els.pad.getBoundingClientRect();
    return e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom;
  }

  function drawSegment(x,y){
    ctx.beginPath();
    ctx.moveTo(lastX,lastY);
    ctx.lineTo(x,y);
    ctx.stroke();
    lastX=x;
    lastY=y;
  }

  function startDraw(e){
    if(e.pointerType==="mouse" && e.button!==0) return;
    e.preventDefault();
    e.stopPropagation();
    clearNativeSelection();

    drawing=true;
    activePointerId=e.pointerId;
    document.body.classList.add("pen-active");
    setInputDebug(e.pointerType, "入力中");

    try{ els.pad.setPointerCapture(e.pointerId); }catch(_){}

    [lastX,lastY]=point(e);

    // 始点
    ctx.beginPath();
    ctx.arc(lastX,lastY,1.15,0,Math.PI*2);
    ctx.fillStyle="#2d2932";
    ctx.fill();
  }

  function renderPointerEvent(e){
    if(!drawing || e.pointerId!==activePointerId) return;
    e.preventDefault();
    clearNativeSelection();

    const events=(typeof e.getCoalescedEvents==="function")
      ? e.getCoalescedEvents()
      : [e];

    for(const ev of events){
      const[x,y]=point(ev);
      drawSegment(x,y);
    }
  }

  function draw(e){
    if(!drawing || e.pointerId!==activePointerId) return;
    e.stopPropagation();
    renderPointerEvent(e);
  }

  function globalPointerMove(e){
    if(!drawing || e.pointerId!==activePointerId) return;
    // canvasのpointermoveが来ない瞬間をwindow側で補完
    if(!pointInsideCanvas(e)) return;
    renderPointerEvent(e);
  }

  function finishDraw(e, cancelled=false){
    if(!drawing) return;
    if(e && activePointerId!==null && e.pointerId!==activePointerId) return;

    e?.preventDefault?.();
    clearNativeSelection();

    try{
      if(e && els.pad.hasPointerCapture?.(e.pointerId)){
        els.pad.releasePointerCapture(e.pointerId);
      }
    }catch(_){}

    const type=e?.pointerType || "";
    drawing=false;
    activePointerId=null;
    document.body.classList.remove("pen-active");
    setInputDebug(type, cancelled ? "cancel" : "OK");
  }

  function endDraw(e){ finishDraw(e,false); }
  function cancelDraw(e){ finishDraw(e,true); }

  function lostCapture(e){
    // lostpointercaptureだけでは描画終了にしない。
    // Safariが勝手にcaptureを失ってもwindow listenerで追跡する。
    if(drawing && e.pointerId===activePointerId){
      setInputDebug(e.pointerType || "pen","capture継続");
      clearNativeSelection();
    }
  }

  function globalPointerUp(e){
    if(drawing && e.pointerId===activePointerId) finishDraw(e,false);
  }

  function globalPointerCancel(e){
    if(drawing && e.pointerId===activePointerId) finishDraw(e,true);
  }

  function clearPad(){
    if(!ctx)return;
    const r=els.pad.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    clearNativeSelection();
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

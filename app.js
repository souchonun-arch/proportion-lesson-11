/* ═══════════════════════════════════════════════════════════════
   認識比例 · 互動學習網頁
   教材來源：教育出版社 六上數學 第 11 課 M6A_11
   風格基準：手感層八通道 + Damage Skin（math 主題）
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ═══════════════════ 1. Damage Skin 模組（TWRO 風格） ═══════════════════ */
const DM = (() => {
  const SKINS = {
    classic:{label:'經典',cn:false,lw:11,stroke:'#ffffff',fill:'#e8323c',critFill:'#ff2d2d',shadow:8,shadowColor:'rgba(0,0,0,.5)'},
    rainbow:{label:'彩色',cn:false,lw:10,stroke:'rgba(255,255,255,.92)',gradient:['#ff3b3b','#ff9f1c','#ffe66d','#4ddb6b','#3b8ff0','#b06ff0'],shadow:12,shadowColor:'rgba(0,0,0,.42)'},
    words  :{label:'文字',cn:true,lw:9,stroke:'#3a2400',fill:'#ffd76e',critFill:'#ff5a3c',shadow:10,shadowColor:'rgba(0,0,0,.55)'},
    hidden :{label:'隱形',cn:false,invisible:true},
    plain  :{label:'純白',cn:false,lw:10,stroke:'#ffffff',fill:'#ffffff',shadow:8,shadowColor:'rgba(0,0,0,.45)'},
    crit   :{label:'會心',cn:false,lw:14,stroke:'#7a3b00',mult:1.05,rays:true,gradient:['#fff8d0','#ffb62e','#ff6a00'],doubleStroke:['#7a3b00','#ffd76e'],shadow:22,shadowColor:'rgba(255,150,0,.85)'},
    flame  :{label:'火焰',cn:false,lw:8,stroke:'#5c0f00',wobble:.03,gradient:['#fff3a0','#ff8a1e','#f02b0a','#a30d00'],shadow:20,shadowColor:'rgba(255,90,0,.8)'},
    frost  :{label:'冰霜',cn:false,lw:9,stroke:'#0d3d6b',wobble:.028,gradient:['#ffffff','#9fe8ff','#2b7fd4'],shadow:18,shadowColor:'rgba(80,200,255,.75)'},
    thunder:{label:'雷電',cn:false,lw:10,stroke:'#2b0a52',fill:'#d9b3ff',innerStroke:'rgba(255,255,255,.85)',wobble:.035,shadow:20,shadowColor:'rgba(170,90,255,.85)'},
    venom  :{label:'劇毒',cn:false,lw:9,stroke:'#1e3d0c',wobble:.04,gradient:['#d9ff8a','#3f9a1f'],shadow:16,shadowColor:'rgba(110,220,40,.7)'},
    mend   :{label:'治癒',cn:false,lw:9,stroke:'#04452f',rise:true,gradient:['#ffffff','#7dffc4','#16a97a'],shadow:20,shadowColor:'rgba(60,255,190,.8)'},
    center :{label:'置中',cn:false,lw:8,stroke:'#0a1a3a',gradient:['#ffffff','#b9d4ff'],shadow:12,shadowColor:'rgba(80,140,255,.6)'}
  };
  const WORDS={normal:['一擊','打中','命中','中了'],crit:['會心一擊','重擊','致命一擊','破壞']};
  const floats=[],sparks=[],rings=[];
  let hitstop=0,shakeMag=0,shakeT=0;
  const STAGE={el:null};

  function tone(freq,dur,type='sine',gain=.16,delay=0,slide=0){
    try{
      const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
      DM._ac=DM._ac||new C();
      if(DM._ac.state==='suspended') DM._ac.resume();
      const c=DM._ac,t0=c.currentTime+delay;
      const o=c.createOscillator(),g=c.createGain();
      o.type=type;o.frequency.setValueAtTime(freq,t0);
      if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t0+dur);
      g.gain.setValueAtTime(0,t0);
      g.gain.linearRampToValueAtTime(gain,t0+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+.04);
    }catch(e){}
  }
  function slashSfx(){
    try{
      const c=DM._ac;if(!c)return;
      const t0=c.currentTime,len=Math.floor(c.sampleRate*.13);
      const buf=c.createBuffer(1,len,c.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);
      const src=c.createBufferSource();src.buffer=buf;
      const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.6;
      bp.frequency.setValueAtTime(2600,t0);
      bp.frequency.exponentialRampToValueAtTime(700,t0+.13);
      const g=c.createGain();g.gain.value=.22;
      src.connect(bp);bp.connect(g);g.connect(c.destination);src.start(t0);
    }catch(e){}
  }
  function hitSfx(crit){
    if(crit){tone(120,.30,'sawtooth',.22,0,-70);tone(240,.16,'square',.16,.01);tone(1800,.10,'square',.10,.02);tone(2600,.08,'square',.07,.07);}
    else{tone(190,.14,'square',.16,0,-90);tone(700,.05,'triangle',.10,.01);}
  }
  function healSfx(){[523,659,784,1046].forEach((f,i)=>tone(f,.22,'sine',.12,i*.06));}

  function strokeFill(ctx,text,cfg){
    ctx.font=cfg.font;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineJoin='round';ctx.miterLimit=2;
    if(cfg.shadow){ctx.shadowColor=cfg.shadowColor;ctx.shadowBlur=cfg.shadow;ctx.shadowOffsetY=2;}
    ctx.lineWidth=cfg.lw;ctx.strokeStyle=cfg.stroke;ctx.strokeText(text,0,0);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle=cfg.fill;ctx.fillText(text,0,0);
  }
  function paint(ctx,sk,text,p,crit){
    if(sk.invisible)return;
    const big=crit?1.62:1;
    const size=68*big*(sk.mult||1);
    const font=sk.cn?`900 ${(size*.58).toFixed(1)}px "Noto Sans TC","PingFang TC",sans-serif`
                    :`800 ${size.toFixed(1)}px "Baloo 2","Arial Black","Segoe UI",sans-serif`;
    if(sk.rays&&crit){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.max(0,1-p*1.4);
      for(let i=0;i<14;i++){
        const a=(i/14)*Math.PI*2+p*.6;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*26,Math.sin(a)*26);
        ctx.lineTo(Math.cos(a)*(60+90*(1-p)),Math.sin(a)*(60+90*(1-p)));
        ctx.strokeStyle='rgba(255,224,130,.7)';ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke();
      }
      ctx.restore();
    }
    if(sk.wobble)ctx.rotate(Math.sin(p*(sk.id==='venom'?20:30))*sk.wobble);
    if(sk.doubleStroke){
      ctx.lineWidth=sk.lw+5;ctx.strokeStyle=sk.doubleStroke[0];ctx.strokeText(text,0,0);
      ctx.lineWidth=sk.lw-4;ctx.strokeStyle=sk.doubleStroke[1];ctx.strokeText(text,0,0);
    }
    let fill=sk.fill||(crit?sk.critFill:sk.fill);
    if(sk.gradient){
      const m=ctx.measureText(text).width||1;
      const g=ctx.createLinearGradient(-m/2,0,m/2,0);
      sk.gradient.forEach((c,i)=>g.addColorStop(i/(sk.gradient.length-1),c));
      fill=g;
    }
    strokeFill(ctx,text,{font,lw:sk.lw,stroke:sk.stroke,fill,shadow:sk.shadow,shadowColor:sk.shadowColor});
    if(sk.innerStroke){ctx.save();ctx.globalAlpha*=.8;ctx.lineWidth=4;ctx.strokeStyle=sk.innerStroke;ctx.strokeText(text,0,0);ctx.restore();}
  }
  function makeText(sk,val,crit){
    if(sk.cn){const pool=crit?WORDS.crit:WORDS.normal;return pool[(Math.random()*pool.length)|0];}
    return crit?`${val}!`:String(val);
  }
  function hit(x,y,val,opt={}){
    const crit=!!opt.crit,skinId=opt.skin||'classic';
    const sk=Object.assign({},SKINS[skinId]||SKINS.classic);sk.id=skinId;
    floats.push({x,y,vx:(Math.random()-.5)*34,vy:crit?-168:-132,g:(sk.rise?-60:crit?155:128),
      age:0,life:crit?108:88,text:makeText(sk,val,crit),skin:sk,crit,scale:(crit?1.16:1)*(.92+Math.random()*.16)});
    const n=crit?34:14;
    const cols=crit?['#fff3a0','#ffd76e','#ff9f43','#ff6b6b','#ffffff']:['#ffe66d','#ffb347','#ffffff'];
    for(let i=0;i<n;i++){
      const a=-Math.PI/2+(Math.random()-.5)*2.4,s=(crit?9:5)*(.5+Math.random());
      sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:.38,life:crit?52:36,age:0,
        r:(crit?6:3.6)*(.6+Math.random()*.9),color:cols[(Math.random()*cols.length)|0],
        rot:Math.random()*6.28,vr:(Math.random()-.5)*.4,star:Math.random()<.45});
    }
    rings.push({x,y,age:0,life:crit?26:16,max:crit?190:110,color:crit?'255,200,90':'255,255,255'});
    if(opt.shake!==false){shakeMag=Math.max(shakeMag,crit?14:4);shakeT=crit?14:8;}
    if(opt.hitstop!==false)hitstop=crit?8:5;
    if(opt.sfx!==false)hitSfx(crit);
    return true;
  }
  function heal(x,y,amt){
    const sk=Object.assign({},SKINS.mend);sk.id='mend';
    floats.push({x,y,vx:(Math.random()-.5)*22,vy:-95,g:-58,age:0,life:96,text:`+${amt}`,skin:sk,crit:false,scale:.95+Math.random()*.12});
    for(let i=0;i<12;i++){
      const a=-Math.PI/2+(Math.random()-.5)*1.8;
      sparks.push({x,y,vx:Math.cos(a)*3.4,vy:Math.sin(a)*3.4,g:-.12,life:52,age:0,r:3+Math.random()*2.6,
        color:['#7dffc4','#16a97a','#ffffff'][(Math.random()*3)|0],rot:0,vr:0,star:false});
    }
    hitstop=4;
    if(STAGE.el){shakeMag=3;shakeT=6;}
    healSfx();
  }
  function tickHitstop(dt){ if(hitstop>0){hitstop--;return dt*.18;} return dt; }
  function update(dt){
    const k=dt/16.67;
    for(let i=floats.length-1;i>=0;i--){
      const f=floats[i];f.age+=k;if(f.age>=f.life){floats.splice(i,1);continue;}
      f.vy+=f.g*(dt/1000);f.x+=f.vx*(dt/1000);f.y+=f.vy*(dt/1000);f.vx*=.99;
    }
    for(let i=sparks.length-1;i>=0;i--){
      const s=sparks[i];s.age+=k;if(s.age>=s.life){sparks.splice(i,1);continue;}
      s.vx*=.985;s.vy=s.vy*.985+s.g;s.x+=s.vx*k;s.y+=s.vy*k;s.rot+=s.vr;
    }
    for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.age+=k;if(r.age>=r.life)rings.splice(i,1);}
    if(shakeT>0)shakeT--;
  }
  function draw(ctx){
    for(const r of rings){
      const k=r.age/r.life;
      ctx.beginPath();ctx.arc(r.x,r.y,r.max*k,0,6.29);
      ctx.strokeStyle=`rgba(${r.color},${(1-k).toFixed(3)})`;ctx.lineWidth=7*(1-k)+1;ctx.stroke();
    }
    for(const s of sparks){
      const k=1-s.age/s.life;
      ctx.save();ctx.globalAlpha=Math.max(0,k);ctx.translate(s.x,s.y);ctx.rotate(s.rot);
      ctx.fillStyle=s.color;
      if(s.star){
        ctx.beginPath();
        for(let j=0;j<10;j++){const r2=j%2?s.r*.45:s.r;const a=j*Math.PI/5-Math.PI/2;ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);}
        ctx.closePath();ctx.fill();
      }else{ctx.beginPath();ctx.arc(0,0,s.r*k,0,6.29);ctx.fill();}
      ctx.restore();
    }
    for(const f of floats){
      const p=f.age/f.life,q=Math.min(1,p/.16),c1=1.9,c3=c1+1;
      const e=1+c3*Math.pow(q-1,3)+c1*Math.pow(q-1,2);
      const fade=p>.62?1-(p-.62)/.38:1;
      ctx.save();ctx.globalAlpha=Math.max(0,fade);ctx.translate(f.x,f.y);ctx.scale(e*f.scale,e*f.scale);
      paint(ctx,f.skin,f.text,p,f.crit);ctx.restore();
    }
  }
  function shakeOffset(){
    if(shakeT<=0)return{x:0,y:0};
    const m=shakeMag*(shakeT/14);
    return{x:(Math.random()-.5)*m*2,y:(Math.random()-.5)*m*2};
  }
  return{hit,heal,update,draw,tickHitstop,shakeOffset,slashSfx,hitSfx,healSfx,tone,
    setStage(el){STAGE.el=el;},
    reset(){floats.length=0;sparks.length=0;rings.length=0;hitstop=0;shakeT=0;shakeMag=0;},
    setSkin(id){return !!SKINS[id];},
    list(){return Object.entries(SKINS).map(([id,s])=>({id,label:s.label}));},
    count(){return floats.length+sparks.length+rings.length;}};
})();

/* ═══════════════════ 2. 手感層七通道 ═══════════════════ */
const COMBO_SCALE={
  1:{freq:523.25,type:'sine',gain:.20,extra:0},
  2:{freq:587.33,type:'sine',gain:.22,extra:0},
  3:{freq:659.25,type:'triangle',gain:.24,extra:1},
  4:{freq:783.99,type:'triangle',gain:.26,extra:1},
  5:{freq:880.00,type:'sawtooth',gain:.26,extra:2},
  6:{freq:1046.5,type:'sawtooth',gain:.28,extra:2},
  7:{freq:1174.7,type:'square',gain:.28,extra:3},
  8:{freq:1318.5,type:'square',gain:.30,extra:3}
};
let SOUND_ON=true;
function comboSound(combo){
  if(!SOUND_ON)return;
  const k=COMBO_SCALE[Math.min(combo,8)];if(!k)return;
  DM.tone(k.freq,.12,k.type,k.gain);
  if(k.extra>=1)DM.tone(k.freq*1.5,.10,'sine',k.gain*.55);
  if(k.extra>=2)DM.tone(k.freq*2.0,.09,'triangle',k.gain*.35);
  if(k.extra>=3)DM.tone(k.freq*.5,.22,'sine',k.gain*.60);
  if(combo>=5)setTimeout(()=>DM.tone(2093,.08,'square',.12),40);
}
function missSound(){
  if(!SOUND_ON)return;
  DM.tone(320,.10,'square',.18);
  setTimeout(()=>DM.tone(220,.16,'sawtooth',.16),90);
  setTimeout(()=>DM.tone(150,.26,'sine',.14),190);
}
function clickSound(){
  if(!SOUND_ON)return;
  DM.tone(660,.05,'sine',.10);
}
/* 時間頓挫：凍結戰場動畫 60ms，令命中有重量感。
   ⚠️ 必須同時還原 transition 同 animationPlayState，否則元素會永久卡住，
   導致按鈕 hover / 點擊反應失效（學生會以為「不能輸入」）。 */
function hitstop(ms=60){
  const targets=[...document.querySelectorAll('#stage, #stage *')];
  const saved=targets.map(el=>{
    const st=el.style;
    return {el, transition:st.transition, playState:st.animationPlayState};
  });
  targets.forEach(el=>{
    el.style.transition='none';
    el.style.animationPlayState='paused';
  });
  setTimeout(()=>{
    saved.forEach(({el,transition,playState})=>{
      el.style.transition=transition;
      el.style.animationPlayState=playState;
    });
  },ms);
}
function shake(el,level='soft'){
  if(!el)return;
  const map={soft:'shakeSoft',hard:'shakeHard',epic:'shakeEpic'};
  const cls=map[level]||'shakeSoft';
  el.classList.remove(...Object.values(map));
  void el.offsetWidth;
  el.classList.add(cls);
}
function tweenNumber(el,from,to,dur=420,onDone){
  if(!el)return;
  const t0=performance.now();
  const over=to>from?1.14:.9;
  function step(now){
    const p=Math.min(1,(now-t0)/dur);
    const e=1-Math.pow(1-p,3);
    const v=from+(to-from)*e;
    el.textContent=Math.round(v);
    const scale=p<.75?1+(1-p/.75)*.22:1;
    el.style.transform=`scale(${scale.toFixed(3)})`;
    if(p<1)requestAnimationFrame(step);
    else{el.textContent=to;el.style.transform='scale(1)';onDone&&onDone();}
  }
  requestAnimationFrame(step);
}
function sparkleAt(sel,count=6,colors){
  const host=typeof sel==='string'?document.querySelector(sel):sel;
  if(!host)return;
  const r=host.getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const pal=colors||['#ffe66d','#ff8f3f','#fff','#7fd8ff'];
  for(let i=0;i<count;i++){
    const s=document.createElement('div');
    s.className='fx-spark';
    const a=-Math.PI/2+(Math.random()-.5)*2.2;
    const d=40+Math.random()*46;
    s.style.cssText=`position:fixed;left:${cx}px;top:${cy}px;width:8px;height:8px;
      background:${pal[(Math.random()*pal.length)|0]};border-radius:${Math.random()<.4?'50%':'2px'};
      pointer-events:none;z-index:250;transform:translate(-50%,-50%);
      transition:transform .62s cubic-bezier(.2,.9,.3,1),opacity .62s;box-shadow:0 0 10px currentColor;`;
    document.body.appendChild(s);
    requestAnimationFrame(()=>{
      s.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d+26}px) rotate(${Math.random()*360}deg) scale(.2)`;
      s.style.opacity='0';
    });
    setTimeout(()=>s.remove(),650);
  }
}
async function ultimateAnticipation(name){
  const curtain=document.getElementById('curtain');
  const title=document.getElementById('ultTitle');
  const stage=document.getElementById('stage');
  curtain.style.opacity='.72';
  title.textContent=name;
  title.classList.remove('show','fade');
  void title.offsetWidth;
  title.classList.add('show');
  if(SOUND_ON){DM.tone(180,.5,'sawtooth',.16);DM.tone(90,.7,'square',.14);}
  await new Promise(r=>setTimeout(r,500));
  curtain.style.opacity='0';
  shake(stage,'hard');
  // 大字停留 1.1 秒後淡出消失，唔好永久霸佔畫面
  await new Promise(r=>setTimeout(r,1100));
  title.classList.remove('show');
  title.classList.add('fade');
  setTimeout(()=>{
    title.classList.remove('fade');
    title.textContent='';
  },400);
}
/* UI 呼吸：只作用喺「需要學生操作」的元素（例如待答的題目、卡片），
   絕對唔好掛喺整張關卡卡片上 —— 否則連插圖都會跟住縮放，非常突兀。
   ⚠️ 呼吸動畫唔可以掛喺會被 hitstop 凍結的元素上，
   否則還原 animationPlayState 時會令佢永久停喺縮放狀態。 */
function armIdleBreath(el,delay=4200){
  if(!el)return;
  clearTimeout(el._idleT);
  el.classList.remove('breathe');
  el._idleT=setTimeout(()=>{
    // 確保當刻冇其他動畫凍結住，先加呼吸 class
    if(el.getAnimations&&el.getAnimations().some(a=>a.playState==='paused'))return;
    el.classList.add('breathe');
  },delay);
}

/* ═══════════════════ 3. FX Canvas 迴圈 ═══════════════════ */
const fxCanvas=document.getElementById('fxCanvas');
const fxCtx=fxCanvas.getContext('2d');
let fxLast=0;
function fxResize(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  fxCanvas.width=innerWidth*dpr;fxCanvas.height=innerHeight*dpr;
  fxCanvas.style.width=innerWidth+'px';fxCanvas.style.height=innerHeight+'px';
  fxCtx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',fxResize);fxResize();
function fxLoop(now){
  let dt=now-fxLast;fxLast=now;
  if(dt>100)dt=16.67;
  DM.tickHitstop(dt);
  DM.update(dt);
  const off=DM.shakeOffset();
  fxCtx.clearRect(0,0,innerWidth,innerHeight);
  fxCtx.save();
  fxCtx.translate(off.x,off.y);
  DM.draw(fxCtx);
  fxCtx.restore();
  requestAnimationFrame(fxLoop);
}
requestAnimationFrame(fxLoop);

/* ═══════════════════ 4. 狀態 ═══════════════════ */
const S={
  level:0, score:0, combo:0, maxCombo:0,
  answered:new Set(),     // 已答題 id
  completed:new Set(),    // 已答對 id（答錯可重試，不重複計分）
  misses:[],              // 錯題記錄
  mode:'study',           // study | class
  classMode:{names:[],scores:{},cur:0,countdown:0},
  sound:true
};
const LEVELS=[
  {id:'L1',name:'影子比例',short:'影子'},
  {id:'L2',name:'什麼是比例',short:'定義'},
  {id:'L3',name:'樹葉配對',short:'配對'},
  {id:'L4',name:'外項與內項',short:'內外項'},
  {id:'L5',name:'正方形與圓形',short:'正方形'},
  {id:'L6',name:'生活應用',short:'應用'}
];

/* ═══════════════════ 5. 工具 ═══════════════════ */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function frac(a,b,cls=''){
  const c=cls?` ${cls}`:'';
  return `<span class="frac${c}"><i>${a}</i><b>${b}</b></span>`;
}
function say(text,who='mascot'){
  return `<div class="hero-say"><img class="m" src="assets/${who}.webp" alt=""><p>${text}</p></div>`;
}
function fb(cls,icon,html){
  return `<div class="fb ${cls} show" id="fbBox"><span class="fb-ic">${icon}</span><div>${html}</div></div>`;
}
function syncHUD(){
  const done=S.completed.size;
  $('#progressFill').style.width=(done/TOTAL_QUESTIONS*100)+'%';
  $('#progressText').textContent=`${done}/${TOTAL_QUESTIONS}`;
  const sv=$('#scoreVal');
  tweenNumber(sv,Number(sv.textContent)||0,S.score,420);
  sv.classList.remove('score-pop');void sv.offsetWidth;sv.classList.add('score-pop');
  const cb=$('#comboVal');
  cb.textContent=S.combo;
  cb.dataset.tier=S.combo>=5?'5':(S.combo>=3?'3':'0');
  cb.style.transform=`scale(${1+Math.min(S.combo,8)*.06})`;
  setTimeout(()=>{cb.style.transition='transform .3s cubic-bezier(.34,1.56,.64,1)';cb.style.transform='scale(1)';},90);
  // 各關完成狀態（以「答對」為準）
  const need={0:['l1'],1:['l2'],2:['l3'],3:['l4a','l4b'],4:['l5'],5:['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11']};
  Object.entries(need).forEach(([lv,ids])=>{
    if(ids.every(id=>S.completed.has(id)))LEVEL_DONE.add(Number(lv));
  });
  renderTabs();
}
function renderTabs(){
  const box=$('#levelTabs');
  box.innerHTML=LEVELS.map((L,i)=>{
    const done=LEVEL_DONE.has(i);
    return `<button class="tab ${i===S.level?'cur':''} ${done?'done':''}" data-i="${i}">${i+1}. ${L.short}</button>`;
  }).join('');
  box.querySelectorAll('.tab').forEach(b=>b.onclick=()=>goto(Number(b.dataset.i)));
}
const LEVEL_DONE=new Set();
/* 總題數：L1 一題 + L2 一題 + L3 一題 + L4 兩小題 + L5 一題 + L6 十一題 = 17 */
let TOTAL_QUESTIONS=17;

/* 答題處理 —— 統一入口，所有回饋通道在此開 */
function answer(correct,qid,opts){
  if(S.answered.has(qid)&&S.completed.has(qid))return;
  S.answered.add(qid);
  if(correct){
    S.completed.add(qid);
    // 重試後答對 → 從錯題清單移除
    const mi=S.misses.findIndex(m=>m.qid===qid);
    if(mi>=0)S.misses.splice(mi,1);
  }
  const stage=$('#stage');
  const card=$('#qCard');
  if(correct){
    S.combo++;
    S.maxCombo=Math.max(S.maxCombo,S.combo);
    S.score+=10*Math.min(S.combo,5);
    comboSound(S.combo);
    hitstop(60);
    shake(stage,'soft');
    sparkleAt(card,9,['#ffe66d','#ff8f3f','#fff','#7fd8ff']);
    // Damage Skin：答對數字（math 主題 = classic）
    if(card){
      const r=card.getBoundingClientRect();
      DM.hit(r.left+r.width/2,r.top+40,10*Math.min(S.combo,5),{skin:'classic'});
    }
    if(S.combo>=3)setTimeout(()=>{sparkleAt(card,16,['#ffd76e','#ff9f43','#fff']);},120);
    if(S.combo===5){ultimateAnticipation('連對 5 題！');}
    DM.setStage(stage);
  }else{
    S.combo=0;
    missSound();
    shake(stage,'hard');
    if(card){
      const r=card.getBoundingClientRect();
      DM.hit(r.left+r.width/2,r.top+40,0,{skin:'hidden'});
    }
    sparkleAt(card,7,['#ff6b6b','#ff9a9a']);
    if(opts&&opts.missNote)S.misses.push({qid,...opts.missNote});
  }
  syncHUD();
  if(opts&&opts.after)opts.after(correct);
}

/* 記錄錯題但不鎖死作答（讓學生可以重試） */
function recordMiss(qid,note){
  if(!S.misses.some(m=>m.qid===qid))S.misses.push({qid,...note});
  S.answered.add(qid);      // 計入「已作答」，但允許重試
  syncHUD();
}

/* ═══════════════════ 6. 題庫 ═══════════════════ */
/* 教材 P7 練習①：下面各組比可以組成比例嗎 */
const Q_JUDGE=[
  {id:'q1',a:'10 : 12',b:'25 : 35',ans:false,why:'10 : 12 = 5 : 6，而 25 : 35 = 5 : 7，兩個比值不相等，所以不能組成比例。'},
  {id:'q2',a:'20 : 10',b:'5 : 10',ans:false,why:'20 : 10 = 2 : 1，而 5 : 10 = 1 : 2，兩個比值不相等，所以不能組成比例。'},
  {id:'q3',a:'14 : 21',b:'18 : 27',ans:true,why:'14 : 21 = 2 : 3，18 : 27 = 2 : 3，兩個比值相等，所以可以組成比例。'},
  {id:'q4',a:'3.6 : 4.2',b:'6/11 : 7/11',ans:true,why:'3.6 : 4.2 = 3 : 7，而 6/11 : 7/11 = 6 : 7。兩邊同時乘 1.4 都變成 6 : 7，所以可以組成比例。'},
  {id:'q5',a:'0.8 : 0.6',b:'4/5 : 3/5',ans:true,why:'0.8 : 0.6 = 8 : 6 = 4 : 3，而 4/5 : 3/5 = 4 : 3，兩個比值相等，所以可以組成比例。'},
  {id:'q6',a:'1/2 : 1/3',b:'2 : 3',ans:false,why:'1/2 : 1/3 = 3 : 2，而 2 : 3 = 2 : 3。3 : 2 ≠ 2 : 3，所以不能組成比例。'}
];
/* 教材 P8：師生人數 */
const Q_CLASS=[
  {id:'q7',sub:'(a)',q:'第一次活動老師 : 學生 = 16 : 320，第二次活動老師 : 學生 = 48 : 960。判斷這兩個比能否組成比例。',
   a:'16 : 320',b:'48 : 960',ans:true,why:'16 : 320 = 1 : 20，48 : 960 = 1 : 20，兩個比值相等，所以可以組成比例。'},
  {id:'q8',sub:'(b)',q:'第一次活動老師 : 第二次活動老師 = 16 : 48，學生 : 學生 = 320 : 960。判斷這兩個比能否組成比例。',
   a:'16 : 48',b:'320 : 960',ans:true,why:'16 : 48 = 1 : 3，320 : 960 = 1 : 3，兩個比值相等，所以可以組成比例。'}
];
/* 教材 P9：龜兔賽程 */
const Q_RACE=[
  {id:'q9',sub:'(a)',q:'分別寫出烏龜和白兔完成兩段賽程所需時間的比，判斷這兩個比能否組成比例。',
   a:'15 : 2',b:'50 : 5',ans:false,why:'烏龜和白兔完成第一段賽程所需時間的比是 15 : 2，完成第二段賽程所需時間的比是 50 : 5。<br>15 : 2 = 7.5，而 50 : 5 = 10，兩個比值不相等，所以<b>不能</b>組成比例。'},
  {id:'q10',sub:'(b)',q:'分別寫出兩段賽程中烏龜和白兔所需時間的比，判斷這兩個比能否組成比例。',
   a:'15 : 50',b:'2 : 5',ans:false,why:'烏龜完成兩段賽程所需時間的比是 15 : 50 = 3 : 10，白兔完成兩段賽程所需時間的比是 2 : 5 = 4 : 10。<br>3 : 10 ≠ 4 : 10，兩個比值不相等，所以<b>不能</b>組成比例。'}
];
/* 教材 P9 挑戰題：16、8、4、2 */
const Q_CHALLENGE={id:'q11'};

/* ═══════════════════ 7. 關卡渲染 ═══════════════════ */
function goto(i){
  if(i<0||i>=LEVELS.length)return;
  stopCountdown();
  S.level=i;
  S.combo=0;
  $('#stageWrap').className='wrap'+(i===5?' wide':'');
  const render=LEVELS_RENDER[i];
  $('#stageWrap').innerHTML=render();
  // 課堂搶答模式：注入倒數、登記榜單
  if(S.mode==='class'){
    const head=$('#stageWrap').querySelector('.level-head');
    if(head)head.insertAdjacentHTML('beforeend',classPanelHTML());
    const body=$('#stageWrap').querySelector('.level-body');
    if(body){
      body.insertAdjacentHTML('afterbegin',classScorePanel());
      body.insertAdjacentHTML('beforeend',leaderHTML());
    }
  }
  renderTabs();
  // 綁定本關互動
  const b=LEVELS_BIND[i];if(b)b();
  if(S.mode==='class')bindClassPanel();
  // 注意：唔喺整張 #qCard 上掛呼吸動畫（會連插圖一齊縮放，非常突兀）
  // 改為只喺「需要學生操作的按鈕」上加呼吸提示
  armIdleBreath(document.querySelector('.level-body .opt, .level-body .vbtn'));
  window.scrollTo({top:0,behavior:'smooth'});
  DM.reset();
  if(S.mode==='class')startCountdown(30,()=>toast('⏰ 時間到！老師可以按「顯示答案」揭示。'));
}
function nextLevel(){
  if(S.level<LEVELS.length-1)goto(S.level+1);
  else showResult();
}
function prevLevel(){ if(S.level>0)goto(S.level-1); }

/* ── 關卡 1：影子比例（教材 P1–P2） ── */
function renderL1(){
  return `
  <div class="level" id="qCard">
    <div class="level-head">
      <div class="level-no">1</div>
      <div class="level-title">
        <h2>影子比例：少傑與爸爸</h2>
        <p>教材第 1–2 頁 · 觀察身高與影子長的關係</p>
      </div>
      <div class="level-badge">學習活動 ①</div>
    </div>
    <div class="level-body">
      <div class="l1-grid">
        <div class="l1-fig">
          <img class="hero-img" src="assets/hero_shadow.webp" alt="少傑和爸爸在草地上，腳下有細長的影子和虛線量度">
          <div class="l1-cap">同一時間、同一太陽，影子長度與身高成正比</div>
        </div>
        <div class="l1-txt">
          ${say('觀察少傑和爸爸的身高與影子長，你知道<span style="color:var(--orange-d);font-weight:800">人的身高與影子長有甚麼關係</span>嗎？說一說。')}
          <div class="tip">
            <span class="tip-ic">💡</span>
            <div><b>老師提示：</b>太陽的位置越低，影子越長。表格已經記錄了兩人的身高和影長，試試找出裏面的規律。</div>
          </div>

          <table class="tbl" id="tbl1">
            <thead><tr><th style="background:var(--sky-l)"></th><th class="lilac">少傑</th><th class="lilac">爸爸</th></tr></thead>
            <tbody>
              <tr><th>身高（米）</th><td class="num">1.4</td><td class="num">1.8</td></tr>
              <tr><th>影長（米）</th><td class="num">0.7</td><td class="num">0.9</td></tr>
            </tbody>
          </table>

          <div class="q-line" style="font-size:17px;margin-top:20px">
            少傑身高和影長的比是 <span class="blank" id="bA">?</span>，
            爸爸身高和影長的比是 <span class="blank" id="bB">?</span>。
            兩個人身高和影長的比值<span id="cmpTag" style="font-weight:800"></span>，
            因此可以寫成 <b style="font-family:var(--font-num)">1.4 : 0.7 = 1.8 : 0.9</b>。
          </div>

          <div class="opts" id="optsL1">
            <button class="opt" data-v="equal"><span class="badge">A</span>兩個比值相等</button>
            <button class="opt" data-v="diff"><span class="badge">B</span>兩個比值不相等</button>
            <button class="opt" data-v="none"><span class="badge">C</span>看不出關係</button>
          </div>
          <div id="fbL1"></div>
        </div>
      </div>
    </div>
    <div class="level-foot">
      <span style="font-size:13px;color:var(--ink-3)">完成後按「下一關」繼續</span>
      <button class="btn" id="goL1">下一關 →</button>
    </div>
  </div>`;
}
function bindL1(){
  $('#optsL1').querySelectorAll('.opt').forEach(b=>{
    b.onclick=()=>{
      const v=b.dataset.v;
      const ok=v==='equal';
      const all=$('#optsL1').querySelectorAll('.opt');
      all.forEach(x=>{x.disabled=true;if(x.dataset.v==='equal')x.classList.add('correct');});
      b.classList.add(ok?'correct':'wrong');
      b.querySelector('.badge').outerHTML=`<span class="mark">${ok?'✓':'✗'}</span>`;
      $('#bA').textContent='2 : 1';$('#bA').classList.add('ans');
      $('#bB').textContent='2 : 1';$('#bB').classList.add('ans');
      $('#cmpTag').innerHTML=`<span style="color:var(--ok)">相等</span>`;
      $('#fbL1').innerHTML=fb(ok?'good':'bad',ok?'🎉':'💡',
        ok?`<b>答對了！</b> 1.4 : 0.7 = 14 : 7 = 2 : 1，1.8 : 0.9 = 18 : 9 = 2 : 1。兩個比值相等，所以 <b>1.4 : 0.7 = 1.8 : 0.9</b>。`
          :`<b>再想想。</b> 我們把 1.4 : 0.7 都乘 10 變成 14 : 7，再同時除以 7 變成 2 : 1；同樣 1.8 : 0.9 = 18 : 9 = 2 : 1。兩個人身高和影長的比值是<b>相等</b>的。`);
      $('#goL1').disabled=false;
      if(ok){
        answer(true,'l1');
      }else{
        // 答錯：記錄錯題，學生可看詳解後再試
        recordMiss('l1',{level:1,
          q:'少傑與爸爸的身高和影長的比值是否相等？',
          you:'答「兩個比值不相等」',right:'相等（都是 2 : 1）'});
        S.combo=0;missSound();shake($('#stage'),'hard');
        setTimeout(()=>{
          all.forEach(x=>{x.disabled=false;});
          b.classList.remove('wrong');
          const mark=b.querySelector('.mark');
          if(mark)mark.outerHTML=`<span class="badge">${b.dataset.v==='equal'?'A':(b.dataset.v==='diff'?'B':'C')}</span>`;
        },1600);
        // 重試時讓學生看到答案後再選
        $('#fbL1').innerHTML=fb('info','💡',`<b>再看一次：</b> 兩個比值都是 <b class="num">2 : 1</b>，所以兩個比值是<b>相等</b>的。試試再選一次！`);
      }
    };
  });
  $('#goL1').disabled=true;
  $('#goL1').onclick=nextLevel;
}

/* ── 關卡 2：什麼是比例（教材 P2–P3） ── */
function renderL2(){
  return `
  <div class="level" id="qCard">
    <div class="level-head">
      <div class="level-no">2</div>
      <div class="level-title">
        <h2>甚麼是比例？</h2>
        <p>教材第 2–3 頁 · 比例的定義與判斷方法</p>
      </div>
      <div class="level-badge">學習活動 ①</div>
    </div>
    <div class="level-body">
      <div class="tip">
        <span class="tip-ic">📖</span>
        <div><b>由兩個比值相等的比組成的等式，稱為「比例」。</b><br>
        寫法：<code style="font-family:var(--font-num);font-size:16px">a : b = c : d</code> 或 <code style="font-family:var(--font-num);font-size:16px">a/b = c/d</code></div>
      </div>

      <div class="q-line" style="margin-top:20px;font-size:17px">
        判斷兩個比能不能組成比例，只要看<b>兩個比值是否相等</b>。我們可以用以下兩種方法：
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:14px">
        <div style="background:var(--cream);border:2px solid var(--cream-d);border-radius:var(--r-m);padding:16px">
          <b style="font-size:15.5px;color:var(--orange-d)">方法一：化簡比</b>
          <div style="font-family:var(--font-num);font-size:17px;font-weight:800;margin-top:10px;line-height:1.9">
            1.4 : 0.7 = 14 : 7 = <span style="color:var(--ok)">2 : 1</span><br>
            1.8 : 0.9 = 18 : 9 = <span style="color:var(--ok)">2 : 1</span>
          </div>
          <div style="font-size:13.5px;color:var(--ink-3);margin-top:8px">兩邊都化簡成 2 : 1 → 相等 ✓</div>
        </div>
        <div style="background:var(--sky-l);border:2px solid #8FCBE8;border-radius:var(--r-m);padding:16px">
          <b style="font-size:15.5px;color:var(--sky-d)">方法二：交叉相乘</b>
          <div style="font-family:var(--font-num);font-size:17px;font-weight:800;margin-top:10px;line-height:1.9">
            1.4 × 0.9 = <span style="color:var(--ok)">1.26</span><br>
            1.8 × 0.7 = <span style="color:var(--ok)">1.26</span>
          </div>
          <div style="font-size:13.5px;color:var(--ink-3);margin-top:8px">交叉乘積相等 → 相等 ✓</div>
        </div>
      </div>

      ${say('現在<b>由你來判斷</b>！下面兩組比，哪一組可以組成比例？')}

      <div style="margin-top:6px">
        <div class="ratio-row">
          <div class="ratio-box small" id="rA2">12 : 18</div>
          <div class="vs-sign">和</div>
          <div class="ratio-box small" id="rB2">8 : 12</div>
        </div>
        <p style="text-align:center;font-size:13.5px;color:var(--ink-3);margin-top:-6px">
          按「檢查」按鈕，系統會用兩種方法各算一次
        </p>
        <div class="opts" style="justify-content:center">
          <button class="btn" id="calcBtn">🔍 檢查（用兩種方法算一算）</button>
        </div>
      </div>
      <div id="calcL2"></div>
      <div id="fbL2"></div>
    </div>
    <div class="level-foot">
      <span style="font-size:13px;color:var(--ink-3)">第 2 關</span>
      <button class="btn" id="goL2" disabled>下一關 →</button>
    </div>
  </div>`;
}
function bindL2(){
  const calcBtn=$('#calcBtn');const go=$('#goL2');
  calcBtn.onclick=()=>{
    calcBtn.disabled=true;
    const box=$('#calcL2');
    box.innerHTML=`<div class="calcbox">
      <div class="calc-line" style="animation-delay:.05s">方法一（化簡比）：12 : 18 = 2 : 3　　8 : 12 = 2 : 3</div>
      <div class="calc-line" style="animation-delay:.35s">方法二（交叉相乘）：12 × 12 = <span class="hl">144</span>　　18 × 8 = <span class="hl">144</span></div>
      <div class="calc-line" style="animation-delay:.65s">兩個方法都得到<b style="color:var(--ok)">相同的結果</b> → 這兩個比<span class="res">可以組成比例</span></div>
    </div>`;
    $('#fbL2').innerHTML=fb('info','🤖',`兩種方法都可以用。<b>方法一</b>適合兩個比都可以化簡成簡單整數比的時候；<b>方法二</b>（交叉相乘）遇到分數或小數時更快。`);
    go.disabled=false;
    answer(true,'l2');
  };
}

/* ── 關卡 3：樹葉配對（教材 P4） ── */
const LEAF_PAIRS=[
  {a:'4 : 5',   b:'16 : 20', color:'red'},
  {a:'1.8 : 3', b:'10.8 : 18',color:'green'},
  {a:'7 : 4',   b:'17.5 : 10',color:'blue'}
];
function renderL3(){
  const leaves=[];
  LEAF_PAIRS.forEach((p,pi)=>{
    leaves.push({t:p.a,c:p.color,pi,k:'a'});
    leaves.push({t:p.b,c:p.color,pi,k:'b'});
  });
  // 打亂順序
  const shuffled=[...leaves].sort(()=>Math.random()-0.5);
  const imgMap={red:['leaf_a','leaf_b','leaf_c'],green:[],blue:[]};
  const leafImg=['leaf_a','leaf_b','leaf_c'];
  return `
  <div class="level" id="qCard">
    <div class="level-head">
      <div class="level-no">3</div>
      <div class="level-title">
        <h2>樹葉配對：找出相等的比</h2>
        <p>教材第 4 頁 · 把可以組成比例的樹葉塗上相同的顏色</p>
      </div>
      <div class="level-badge">學習活動 ②</div>
    </div>
    <div class="level-body">
      ${say('把<b>可以組成比例</b>的比的樹葉塗上相同的顏色。先點一對樹葉，它們會塗上同一個顏色。')}
      <div class="leaf-grid" id="leafGrid">
        ${shuffled.map((L,i)=>{
          const im=leafImg[(L.pi*2+(L.k==='b'?1:0))%3];
          return `<div class="leaf" data-i="${i}" data-pi="${L.pi}" data-k="${L.k}">
            <span class="tint"></span>
            <img src="assets/${im}.webp" alt="樹葉">
            <span class="ratio-txt">${L.t}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin-top:10px">
        <div class="opts" style="justify-content:center">
          <button class="btn ghost sm" id="clearL3">↺ 全部重置</button>
          <button class="btn" id="checkL3" disabled>檢查答案</button>
        </div>
      </div>
      <div id="fbL3"></div>
    </div>
    <div class="level-foot">
      <span style="font-size:13px;color:var(--ink-3)">配對 3 組</span>
      <button class="btn" id="goL3" disabled>下一關 →</button>
    </div>
  </div>`;
}
function bindL3(){
  const grid=$('#leafGrid');
  let sel=null;
  const paired=new Map();
  grid.querySelectorAll('.leaf').forEach(el=>{
    el.onclick=()=>{
      if(el.classList.contains('pair-ok'))return;
      if(sel===el){el.classList.remove('sel');sel=null;return;}
      if(!sel){
        sel=el;el.classList.add('sel');clickSound();
        armIdleBreath(el);
        return;
      }
      // 第二次點擊：判斷是否同組
      const a=sel,b=el;
      sel=null;a.classList.remove('sel');
      const pa=paired.get(a),pb=paired.get(b);
      if(a.dataset.pi===b.dataset.pi){
        // 同組 → 塗色
        const color=['red','green','blue'][Number(a.dataset.pi)];
        [a,b].forEach(x=>{x.classList.add('pair-ok','t-'+color);});
        paired.set(a,b);paired.set(b,a);
        comboSound(Math.min(S.combo+1,8));S.combo++;
        sparkleAt(a,7);
        const r=a.getBoundingClientRect();
        DM.hit(r.left+r.width/2,r.top+r.height/2,10,{skin:'classic'});
        $('#fbL3').innerHTML=fb('info','🍃',`<b>配對成功！</b> ${a.querySelector('.ratio-txt').textContent} 和 ${b.querySelector('.ratio-txt').textContent} 的比值相等，可以組成比例。`);
        $('#checkL3').disabled=false;
      }else{
        a.classList.add('pair-bad');b.classList.add('pair-bad');
        missSound();shake($('#stage'),'hard');
        setTimeout(()=>{a.classList.remove('pair-bad');b.classList.remove('pair-bad');},450);
        $('#fbL3').innerHTML=fb('bad','💡',`<b>這兩個比不能組成比例。</b> 試試用化簡比的方法算一算，看哪個比值大一點。`);
      }
    };
  });
  $('#clearL3').onclick=()=>{
    grid.querySelectorAll('.leaf').forEach(x=>{x.classList.remove('pair-ok','t-red','t-green','t-blue','sel');});
    paired.clear();$('#fbL3').innerHTML='';$('#checkL3').disabled=true;
  };
  $('#checkL3').onclick=()=>{
    const total=grid.querySelectorAll('.leaf').length;
    const okN=grid.querySelectorAll('.leaf.pair-ok').length;
    const all=okN===total;
    $('#fbL3').innerHTML=fb(all?'good':'bad',all?'🏆':'💡',
      all?`<b>全部配對成功！</b> 4 : 5 = 16 : 20；1.8 : 3 = 10.8 : 18；7 : 4 = 17.5 : 10。三組都可以組成比例。`
         :`你已配對 ${okN/2} 組，共 3 組。再試試剩下的。`);
    if(all){$('#goL3').disabled=false;answer(true,'l3');}
  };
  $('#goL3').disabled=true;
  $('#goL3').onclick=nextLevel;
}

/* ── 關卡 4：外項與內項（教材 P5） ── */
function renderL4(){
  return `
  <div class="level" id="qCard">
    <div class="level-head">
      <div class="level-no">4</div>
      <div class="level-title">
        <h2>外項與內項</h2>
        <p>教材第 5 頁 · 組成比例的四個數，哪個是外項？哪個是內項？</p>
      </div>
      <div class="level-badge">學習活動 ③</div>
    </div>
    <div class="level-body">
      <div class="tip">
        <span class="tip-ic">💡</span>
        <div><b>組成比例的四個數稱為比例的項。</b>比例兩端的兩項稱為<b>外項</b>，比例中間的兩項稱為<b>內項</b>。<br>
        例如 <span class="num" style="font-size:16px">6 : 8 = 1.5 : 2</span>，外項是 <b>6</b> 和 <b>2</b>，內項是 <b>8</b> 和 <b>1.5</b>。<br>
        寫成 <code>a : b = c : d</code> 或 <code>a/b = c/d</code> 時，<b>a 和 d 是外項，b 和 c 是內項</b>。也可以用代數符號寫出比例。</div>
      </div>

      <div id="l4wrap" style="margin-top:20px"></div>
      <div id="fbL4"></div>
    </div>
    <div class="level-foot">
      <span style="font-size:13px;color:var(--ink-3)">第 4 關</span>
      <button class="btn" id="goL4" disabled>下一關 →</button>
    </div>
  </div>`;
}
function bindL4(){
  const wrap=$('#l4wrap');
  const items=[
    {qid:'l4a',label:'(a)',expr:'15 : 9 = 10 : 6',
     ext:['15','6'],int:['9','10'],
     why:'15 : 9 = 10 : 6 中，外項是 <b>15</b> 和 <b>6</b>（比例兩端），內項是 <b>9</b> 和 <b>10</b>（比例中間）。'},
    {qid:'l4b',label:'(b)',expr:'',  fracExpr:true,
     ext:['7','36'],int:['12','21'],
     why:'7/12 = 21/36 中，外項是 <b>7</b> 和 <b>36</b>，內項是 <b>12</b> 和 <b>21</b>。注意分母在內項。'}
  ];
  wrap.innerHTML=items.map((it,i)=>`
    <div style="background:var(--paper-2);border:2px solid var(--line);border-radius:var(--r-m);padding:16px;margin-bottom:16px">
      <div style="font-size:15px;font-weight:800;margin-bottom:12px">${it.label}　寫出下列比例的外項和內項</div>
      <div class="ratio-row" style="margin:6px 0 16px">
        ${it.fracExpr
          ?`<div class="ratio-box">${frac('7','12')} = ${frac('21','36')}</div>`
          :`<div class="ratio-box">${it.expr}</div>`}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="drop-zone ext">
          <h4>🔵 外項 <span>比例兩端</span></h4>
          <div class="drop-slots" data-t="ext" data-i="${i}">
            <div class="slot" data-v=""></div><div class="slot" data-v=""></div>
          </div>
        </div>
        <div class="drop-zone int">
          <h4>🟡 內項 <span>比例中間</span></h4>
          <div class="drop-slots" data-t="int" data-i="${i}">
            <div class="slot" data-v=""></div><div class="slot" data-v=""></div>
          </div>
        </div>
      </div>
      <div class="chip-pool" data-i="${i}">
        ${[...new Set([...it.ext,...it.int])].map(v=>`<div class="chip" data-v="${v}" data-i="${i}">${v}</div>`).join('')}
      </div>
      <div class="opts" style="justify-content:flex-end;margin-top:14px">
        <button class="btn sm sky check-l4" data-i="${i}">檢查</button>
      </div>
      <div class="fb-l4" data-i="${i}"></div>
    </div>`).join('');

  let picked=null;
  wrap.querySelectorAll('.chip').forEach(ch=>{
    ch.onclick=()=>{
      if(ch.classList.contains('used'))return;
      if(picked&&picked===ch){ch.classList.remove('picked');picked=null;return;}
      if(picked)picked.classList.remove('picked');
      picked=ch;ch.classList.add('picked');clickSound();
    };
  });
  wrap.querySelectorAll('.slot').forEach(sl=>{
    sl.onclick=()=>{
      if(!picked)return;
      if(sl.dataset.v){ // 換回
        const old=wrap.querySelector(`.chip[data-v="${sl.dataset.v}"][data-i="${sl.closest('[data-i]').dataset.i}"]`);
        if(old)old.classList.remove('used');
      }
      sl.dataset.v=picked.dataset.v;
      sl.textContent=picked.dataset.v;
      sl.classList.add('filled');
      picked.classList.add('used');picked.classList.remove('picked');
      picked=null;
    };
  });
  wrap.querySelectorAll('.check-l4').forEach(b=>{
    b.onclick=()=>{
      const i=Number(b.dataset.i),it=items[i];
      const extEls=[...wrap.querySelectorAll(`.drop-slots[data-t="ext"][data-i="${i}"] .slot`)];
      const intEls=[...wrap.querySelectorAll(`.drop-slots[data-t="int"][data-i="${i}"] .slot`)];
      const gotExt=extEls.map(x=>x.dataset.v).filter(Boolean).sort();
      const gotInt=intEls.map(x=>x.dataset.v).filter(Boolean).sort();
      const needExt=[...it.ext].sort(),needInt=[...it.int].sort();
      const okExt=JSON.stringify(gotExt)===JSON.stringify(needExt);
      const okInt=JSON.stringify(gotInt)===JSON.stringify(needInt);
      const ok=okExt&&okInt;
      extEls.forEach(x=>x.classList.remove('ok','no'));intEls.forEach(x=>x.classList.remove('ok','no'));
      if(okExt)extEls.forEach(x=>x.classList.add('ok'));else extEls.forEach(x=>{if(x.dataset.v)x.classList.add('no')});
      if(okInt)intEls.forEach(x=>x.classList.add('ok'));else intEls.forEach(x=>{if(x.dataset.v)x.classList.add('no')});
      wrap.querySelector(`.fb-l4[data-i="${i}"]`).innerHTML=fb(ok?'good':'bad',ok?'🎉':'💡',
        ok?`<b>完全正確！</b> ${it.why}`:`${it.why}<br><b>提示：</b> 外項在比例的兩端，內項在中間。`);
      if(ok){
        answer(true,it.qid);
      }else{
        // 記錄錯題（同一小題只記一次），學生可繼續修改重試
        recordMiss(it.qid,{level:4,
          q:`${it.fracExpr?'7/12 = 21/36':it.expr} 的外項和內項`,
          you:`外項填了 ${gotExt.join('、')||'（未填）'}，內項填了 ${gotInt.join('、')||'（未填）'}`,
          right:`外項 ${needExt.join('、')}；內項 ${needInt.join('、')}`});
        S.combo=0;
        missSound();
        shake($('#stage'),'hard');
      }
    };
  });
  $('#goL4').disabled=true;
  $('#goL4').onclick=()=>{
    if(S.completed.has('l4a')&&S.completed.has('l4b'))nextLevel();
    else{
      toast('請先完成 (a) 和 (b) 兩小題');
      $('#goL4').disabled=true;
    }
  };
  // 兩小題都答對後解鎖「下一關」
  const unlock=()=>{
    if(S.completed.has('l4a')&&S.completed.has('l4b'))$('#goL4').disabled=false;
  };
  const origAnswer=window.__answerHook;
  $('#l4wrap').querySelectorAll('.check-l4').forEach(b=>{
    const prev=b.onclick;
    b.onclick=e=>{prev(e);unlock();};
  });
}

/* ── 關卡 5：正方形（教材 P6） ── */
function renderL5(){
  return `
  <div class="level" id="qCard">
    <div class="level-head">
      <div class="level-no">5</div>
      <div class="level-title">
        <h2>正方形的邊長與周長</h2>
        <p>教材第 6 頁 · 根據表內的數據，填寫比例並判斷</p>
      </div>
      <div class="level-badge">學習活動 ④</div>
    </div>
    <div class="level-body">
      <div class="sq-row">
        <div class="sq-item">
          <svg viewBox="0 0 120 120" aria-label="正方形 A">
            <rect x="18" y="18" width="84" height="84" fill="#FFE9C7" stroke="#8A5A20" stroke-width="4" rx="4"/>
            <text x="60" y="68" text-anchor="middle" font-size="34" font-weight="800" fill="#8A5A20" font-family="Baloo 2, sans-serif">A</text>
          </svg>
          <div class="sq-name">正方形 A</div>
          <div class="sq-data">邊長 13 cm　周長 52 cm</div>
        </div>
        <div class="sq-item">
          <svg viewBox="0 0 120 120" aria-label="正方形 B">
            <rect x="14" y="14" width="92" height="92" fill="#E2D4F5" stroke="#5B3A8C" stroke-width="4" rx="4"/>
            <text x="60" y="68" text-anchor="middle" font-size="34" font-weight="800" fill="#5B3A8C" font-family="Baloo 2, sans-serif">B</text>
          </svg>
          <div class="sq-name">正方形 B</div>
          <div class="sq-data">邊長 21 cm　周長 84 cm</div>
        </div>
      </div>

      <table class="tbl">
        <thead><tr><th style="background:var(--sky-l)"></th><th class="lilac">正方形 A</th><th class="lilac">正方形 B</th></tr></thead>
        <tbody>
          <tr><th>邊長（cm）</th><td class="num">13</td><td class="num">21</td></tr>
          <tr><th>周長（cm）</th><td class="num">52</td><td class="num">84</td></tr>
        </tbody>
      </table>

      ${say('根據表內的數據，<b>填一填，判斷一下</b>。')}

      <div style="margin-top:8px">
        <div class="q-line" style="margin-top:18px">
          <span class="lab">(a)</span> 正方形 A 的邊長和周長的比是 <span class="blank" id="q5a1">?</span>，
          正方形 B 的邊長和周長的比是 <span class="blank" id="q5a2">?</span>，
          這兩個比 <span class="pick-group" id="q5a3" data-pick="yesno">
            <button type="button" class="pick-btn" data-v="yes">可以</button>
            <button type="button" class="pick-btn" data-v="no">不可以</button>
          </span> 組成比例。
        </div>
        <div class="q-line" style="margin-top:18px">
          <span class="lab">(b)</span> 正方形 A 和正方形 B 的邊長的比是 <span class="blank" id="q5b1">?</span>，
          它們的周長的比是 <span class="blank" id="q5b2">?</span>，
          這兩個比 <span class="pick-group" id="q5b3" data-pick="yesno">
            <button type="button" class="pick-btn" data-v="yes">可以</button>
            <button type="button" class="pick-btn" data-v="no">不可以</button>
          </span> 組成比例。
        </div>
        <div class="opts" style="justify-content:center">
          <button class="btn" id="checkL5">🔍 檢查答案</button>
        </div>
      </div>
      <div id="fbL5"></div>
    </div>
    <div class="level-foot">
      <span style="font-size:13px;color:var(--ink-3)">第 5 關</span>
      <button class="btn" id="goL5" disabled>下一關 →</button>
    </div>
  </div>`;
}
function bindL5(){
  // 「可以／不可以」按鈕組
  $$('.pick-group').forEach(group=>{
    group.querySelectorAll('.pick-btn').forEach(btn=>{
      btn.onclick=()=>{
        if(group.dataset.done)return;
        group.dataset.val=btn.dataset.v;
        group.querySelectorAll('.pick-btn').forEach(b=>{
          b.classList.toggle('on',b===btn);
        });
        clickSound();
      };
    });
  });
  $('#checkL5').onclick=()=>{
    $('#q5a1').textContent='13 : 52';$('#q5a1').classList.add('ans');
    $('#q5a2').textContent='21 : 84';$('#q5a2').classList.add('ans');
    $('#q5b1').textContent='13 : 21';$('#q5b1').classList.add('ans');
    $('#q5b2').textContent='52 : 84';$('#q5b2').classList.add('ans');
    const a=$('#q5a3'),c=$('#q5b3');
    const okA=a.dataset.val==='yes',okB=c.dataset.val==='yes';
    // 標示對錯
    [[a,okA],[c,okB]].forEach(([g,ok])=>{
      g.classList.add(ok?'pick-ok':'pick-no');
      g.querySelectorAll('.pick-btn').forEach(b=>{
        if((b.dataset.v==='yes')===ok)b.classList.add('ans');
      });
    });
    const both=okA&&okB;
    $('#fbL5').innerHTML=fb(both?'good':'bad',both?'🎉':'💡',
      `<b>(a)</b> 13 : 52 = 1 : 4，21 : 84 = 1 : 4，兩個比值相等，<b>可以</b>組成比例。<br>
       <b>(b)</b> 13 : 21 = 13 : 21，52 : 84 = 13 : 21，兩個比值相等，<b>可以</b>組成比例。`+
      (both?'':`<br><b>提示：</b> 把兩個比都化簡成最簡整數比，再比較是否一樣。`));
    if(both){$('#goL5').disabled=false;answer(true,'l5');}
    else{
      recordMiss('l5',{level:5,
        q:'正方形 A、B 的邊長與周長所成的比',
        you:`(a) ${a.dataset.val==='yes'?'可以':'不可以'}；${okA?'':''}(b) ${c.dataset.val==='yes'?'可以':'不可以'}`,
        right:'(a) 可以；(b) 可以'});
    }
  };
  $('#goL5').onclick=nextLevel;
}

/* ── 關卡 6：生活應用（教材 P7–P9） ── */
function renderL6(){
  return `
  <div class="level" id="qCard">
    <div class="level-head">
      <div class="level-no">6</div>
      <div class="level-title">
        <h2>練習一：生活中的比例</h2>
        <p>教材第 7–9 頁 · 判斷各組比能否組成比例</p>
      </div>
      <div class="level-badge">練習 ①</div>
    </div>
    <div class="level-body">
      <div class="tip">
        <span class="tip-ic">🎯</span>
        <div><b>下面各組比可以組成比例嗎？</b>可以的在圈內加 <b style="color:var(--ok)">＝</b>，不可以的加 <b style="color:var(--no)">✗</b>。<br>
        提示：先算兩個比各自的比值，或用交叉相乘法比較。</div>
      </div>
      <div id="l6wrap"></div>
      <div id="judgeFb"></div>

      <hr style="border:none;border-top:2px dashed var(--line);margin:28px 0">

      <h3 style="font-size:17px;font-weight:900;margin-bottom:4px">🐢 龜兔賽跑</h3>
      <p style="font-size:13.5px;color:var(--ink-3);margin-bottom:14px">下表是烏龜和白兔完成兩段賽程所需的時間。</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:start">
        <img src="assets/turtle_rabbit.webp" alt="烏龜和白兔賽跑" style="width:100%;border-radius:var(--r-m);border:2px solid var(--line)">
        <table class="tbl" style="margin:0">
          <thead><tr><th style="background:var(--sky-l)"></th><th class="green">烏龜</th><th class="green">白兔</th></tr></thead>
          <tbody>
            <tr><th>完成第一段賽程所需的時間（分鐘）</th><td class="num">15</td><td class="num">2</td></tr>
            <tr><th>完成第二段賽程所需的時間（分鐘）</th><td class="num">50</td><td class="num">5</td></tr>
          </tbody>
        </table>
      </div>
      <div id="raceWrap" style="margin-top:16px"></div>
      <div id="raceFb"></div>

      <hr style="border:none;border-top:2px dashed var(--line);margin:28px 0">

      <h3 style="font-size:17px;font-weight:900;margin-bottom:4px">⭐ 挑戰題</h3>
      <p style="font-size:14px;color:var(--ink-2);margin-bottom:14px">用 <b class="num">16、8、4 和 2</b> 可以組成多少個不同的比例？試把它們寫出來。</p>
      <div style="background:var(--cream);border:2px solid var(--cream-d);border-radius:var(--r-m);padding:16px">
        <div class="q-line">我的答案：可以組成
          <input class="blank-input num" id="chCount" type="number" inputmode="numeric" min="0" max="20" placeholder="幾多個" aria-label="比例個數">
          個比例。</div>
        <div class="q-line">它們是：
          <textarea class="blank-input area" id="chList" rows="3"
            placeholder="例如：16 : 8 = 4 : 2　　16 : 4 = 8 : 2 …（每行一個，用空格分開）"
            aria-label="列出所有比例"></textarea></div>
        <div class="opts" style="justify-content:flex-end;margin-top:10px">
          <button class="btn sm sky" id="chCheck">檢查</button>
          <button class="btn sm ghost" id="chHint">💡 提示</button>
        </div>
        <div id="chFb"></div>
      </div>
      <div id="fbL6"></div>
      <div class="fb info" id="l6Progress" style="margin-top:12px"></div>    </div>
    <div class="level-foot">
      <span style="font-size:13px;color:var(--ink-3)">最後一關</span>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn ghost" id="showWrong">📋 錯題回顧</button>
        <button class="btn" id="goL6" disabled>完成 🎉</button>
      </div>
    </div>
  </div>`;
}
/* 比值格式化：把 "6/11 : 7/11"、"4/5 : 3/5"、"1/2 : 1/3" 轉成直式分數 */
function fmtRatio(s){
  // 拆成左右兩組（以 : 分隔，但分數內的 / 不影響）
  const parts=String(s).split(':').map(x=>x.trim());
  const render=(p)=>{
    if(p.includes('/')){
      const [a,b]=p.split('/').map(x=>x.trim());
      return frac(a,b);
    }
    return p;
  };
  if(parts.length===2)return render(parts[0])+' : '+render(parts[1]);
  return render(parts[0]);
}
function renderJudgeItem(q,i,prefix){
  return `<div class="ratio-row" data-qid="${q.id}" style="gap:12px">
    <span class="num" style="font-size:15px;color:var(--ink-3)">${prefix}${i+1}</span>
    <div class="ratio-box small">${fmtRatio(q.a)}</div>
    <div class="vs-sign">和</div>
    <div class="ratio-box small">${fmtRatio(q.b)}</div>
    <div class="verdict" style="margin:0;gap:9px">
      <button class="vbtn eq" data-qid="${q.id}" data-v="1" style="width:56px;height:56px;font-size:27px;border-radius:16px">＝</button>
      <button class="vbtn ne" data-qid="${q.id}" data-v="0" style="width:56px;height:56px;font-size:27px;border-radius:16px">✗</button>
    </div>
  </div>`;
}
function bindL6(){
  const wrap=$('#l6wrap');
  wrap.innerHTML=Q_JUDGE.map((q,i)=>renderJudgeItem(q,i,'')).join('');
  // 師生人數題
  const teacherHTML=`
    <h3 style="font-size:17px;font-weight:900;margin:22px 0 4px">🏫 學校舉辦了兩次活動</h3>
    <p style="font-size:13.5px;color:var(--ink-3);margin-bottom:14px">參與活動的老師和學生的人數如下：</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:start">
      <img src="assets/teacher_students.webp" alt="老師和學生參加活動" style="width:100%;border-radius:var(--r-m);border:2px solid var(--line)">
      <table class="tbl" style="margin:0">
        <thead><tr><th style="background:var(--sky-l)"></th><th class="orange">第一次活動</th><th class="orange">第二次活動</th></tr></thead>
        <tbody>
          <tr><th>老師人數（人）</th><td class="num">16</td><td class="num">48</td></tr>
          <tr><th>學生人數（人）</th><td class="num">320</td><td class="num">960</td></tr>
        </tbody>
      </table>
    </div>
    ${Q_CLASS.map((q,i)=>`
      <div style="margin-top:20px">
        <div class="q-line" style="margin-bottom:8px"><span class="lab">${q.sub}</span> ${q.q}</div>
        <div class="ratio-row" data-qid="${q.id}" style="gap:12px">
          <div class="ratio-box small">${fmtRatio(q.a)}</div>
          <div class="vs-sign">和</div>
          <div class="ratio-box small">${fmtRatio(q.b)}</div>
          <div class="verdict" style="margin:0;gap:9px">
            <button class="vbtn eq" data-qid="${q.id}" data-v="1" style="width:56px;height:56px;font-size:27px;border-radius:16px">＝</button>
            <button class="vbtn ne" data-qid="${q.id}" data-v="0" style="width:56px;height:56px;font-size:27px;border-radius:16px">✗</button>
          </div>
        </div>
      </div>`).join('')}
    <div id="classFb"></div>`;
  wrap.insertAdjacentHTML('beforeend',teacherHTML);

  // 龜兔
  const raceWrap=$('#raceWrap');
  raceWrap.innerHTML=Q_RACE.map((q,i)=>`
    <div style="margin-top:18px">
      <div class="q-line" style="margin-bottom:8px"><span class="lab">${q.sub}</span> ${q.q}</div>
      <div class="ratio-row" data-qid="${q.id}" style="gap:12px">
        <div class="ratio-box small">${fmtRatio(q.a)}</div>
        <div class="vs-sign">和</div>
        <div class="ratio-box small">${fmtRatio(q.b)}</div>
        <div class="verdict" style="margin:0;gap:9px">
          <button class="vbtn eq" data-qid="${q.id}" data-v="1" style="width:56px;height:56px;font-size:27px;border-radius:16px">＝</button>
          <button class="vbtn ne" data-qid="${q.id}" data-v="0" style="width:56px;height:56px;font-size:27px;border-radius:16px">✗</button>
        </div>
      </div>
    </div>`).join('');

  // 判斷按鈕統一處理（練習① 六組 + 師生人數兩題 + 龜兔賽程兩題）
  const allQ={};
  [...Q_JUDGE,...Q_CLASS,...Q_RACE].forEach(q=>allQ[q.id]=q);
  const fbHostOf=qid=>{
    if(qid==='q7'||qid==='q8')return $('#classFb');
    if(qid==='q9'||qid==='q10')return $('#raceFb');
    return $('#judgeFb');
  };
  document.querySelectorAll('.vbtn').forEach(b=>{
    b.onclick=()=>{
      const qid=b.dataset.qid, q=allQ[qid];
      if(!q||S.completed.has(qid))return;
      const pick=b.dataset.v==='1';
      const ok=pick===q.ans;
      const row=b.closest('.ratio-row');
      row.querySelectorAll('.vbtn').forEach(x=>{x.disabled=true;});
      const good=row.querySelector(`.vbtn[data-v="${q.ans?'1':'0'}"]`);
      good.classList.add('correct');
      if(!ok)b.classList.add('wrong');
      const fbHost=fbHostOf(qid);
      fbHost.innerHTML=fbHost.innerHTML+fb(ok?'good':'bad',ok?'🎉':'💡',`<b>${qid.toUpperCase()}</b> ${q.why}`);
      if(ok){
        answer(true,qid);
      }else{
        // 答錯：記錄錯題，學生可以看詳解後再試（不鎖死）
        recordMiss(qid,{level:6,
          q:`${q.a} 和 ${q.b} 能否組成比例？`,
          you:pick?'答「可以組成比例」':'答「不能組成比例」',
          right:q.ans?'可以組成比例 ✓':'不能組成比例 ✗'});
        S.combo=0;
        missSound();
        shake($('#stage'),'hard');
        const card=$('#qCard');
        if(card){
          const r=card.getBoundingClientRect();
          DM.hit(r.left+r.width/2,r.top+40,0,{skin:'hidden'});
        }
        sparkleAt(card,7,['#ff6b6b','#ff9a9a']);
        // 允許重試：把按鈕重新啟用
        setTimeout(()=>{
          row.querySelectorAll('.vbtn').forEach(x=>{x.disabled=false;});
          b.classList.remove('wrong');
          good.classList.remove('correct');
        },1400);
      }
      checkDone();
    };
  });

  // 挑戰題
  const chCheck=$('#chCheck'),chHint=$('#chHint');
  const chCount=$('#chCount'),chList=$('#chList');
  // 標準答案：8 個比例
  const CH_ANSWERS=[
    '2:4=8:16','2:8=4:16','8:16=2:4','16:4=8:2',
    '16:8=4:2','4:16=2:8','8:2=16:4','4:2=16:8'
  ];
  // 解析學生輸入：抓出所有 a:b=c:d 形式的式子
  function parseProportions(text){
    const out=[];
    // 以空白／逗號／分號／換行分隔，再逐段解析
    String(text||'').split(/[\s,;、，；\n]+/).forEach(seg=>{
      const m=seg.match(/^(\d+)\s*[:：]\s*(\d+)\s*=\s*(\d+)\s*[:：]\s*(\d+)$/);
      if(m)out.push(`${+m[1]}:${+m[2]}=${+m[3]}:${+m[4]}`);
    });
    return out;
  }
  function checkChCount(){
    const c=(chCount.value||'').trim();
    return c!==''&&Number(c)===8;
  }
  function checkChList(){
    const parsed=parseProportions(chList.value);
    if(!parsed.length)return {n:0,ok:false,wrong:[]};
    const uniq=[...new Set(parsed)];
    // 數學上正確（有冇用齊 16、8、4、2）+ 是否啱用四個數
    const good=uniq.filter(p=>{
      const [l,r]=p.split('=');
      const [a,b]=l.split(':').map(Number),[c,d]=r.split(':').map(Number);
      const nums=[a,b,c,d].sort((x,y)=>x-y).join(',');
      const okSet=(nums==='2,4,8,16');
      const okRatio=a*d===b*c;
      return okSet&&okRatio;
    });
    return {n:uniq.length,good:good.length,wrong:uniq.filter(x=>!good.includes(x))};
  }
  chCheck.onclick=()=>{
    const cntOK=checkChCount();
    const lst=checkChList();
    const listOK=lst.n===8&&lst.good===8;
    const ok=cntOK&&listOK;
    chCount.classList.toggle('ok',cntOK);
    chCount.classList.toggle('no',!cntOK);
    chList.classList.toggle('ok',listOK);
    chList.classList.toggle('no',!listOK);
    let msg;
    if(ok){
      msg=`<b>完全正確！</b> 可以組成 <b class="num">8</b> 個不同的比例，你寫低嘅全部啱晒！<br>
        <span class="num" style="font-size:16px;line-height:2.1;display:inline-block;margin-top:4px">
        2 : 4 = 8 : 16　　2 : 8 = 4 : 16　　8 : 16 = 2 : 4　　16 : 4 = 8 : 2<br>
        16 : 8 = 4 : 2　　4 : 16 = 2 : 8　　8 : 2 = 16 : 4　　4 : 2 = 16 : 8</span><br>
        <span style="font-size:13.5px">小技巧：<b>4 個不同的數能組成比例時，一共可以組成 8 個不同的比例</b>。
        因為 16 × 2 = 8 × 4 = 4 × 16 = 2 × 8（都是 32），可以作為外項與內項配對，再考慮先後次序。</span>`;
    }else{
      const parts=[];
      if(!cntOK)parts.push(`個數方面：你填咗 <b>${chCount.value||'（空）'}</b>，正確答案係 <b>8</b>。`);
      if(!listOK){
        if(lst.n===0)parts.push(`比例列表仲係空嘅，或者格式唔啱 —— 請寫成 <b>16 : 8 = 4 : 2</b> 咁樣（等號兩邊各一個比），可以每行一個。`);
        else if(lst.good===0)parts.push(`你寫嘅 ${lst.n} 條入面，冇一條符合「用齊 16、8、4、2 而且外項×外項 = 內項×內項」。`);
        else parts.push(`你寫嘅 ${lst.n} 條入面，<b>${lst.good}</b> 條啱，仲有 ${lst.n-lst.good} 條要再諗吓。`);
      }
      msg=`<b>再想想。</b> ${parts.join(' ')}<br>
        <span style="font-size:13.5px">提示：先看哪些數相乘的積相等 —— 16 × 2 = 32，8 × 4 = 32，就可以配成比例，再考慮先後次序同倒轉。</span>`;
    }
    $('#chFb').innerHTML=fb(ok?'good':'bad',ok?'🏆':'💡',msg);
    if(ok){$('#goL6').disabled=false;answer(true,'q11');}
  };
  chHint.onclick=()=>{
    $('#chFb').innerHTML=fb('info','💡',`用<b>比例的基本性質</b>：兩個外項的積 = 兩個內項的積。<br>
      16 × 2 = 32，8 × 4 = 32，所以 16、2 可以做外項，8、4 可以做內項（或對調），再考慮兩邊的次序。<br>
      <span style="font-size:13.5px">寫法提示：每行寫一個，例如 <b>16 : 8 = 4 : 2</b>，用空格分開就可以。</span>`);
    chList.focus();
  };
  // Enter 快速檢查
  chCount.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();chList.focus();}});
  chList.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();chCheck.click();}});
  $('#showWrong').onclick=showWrongModal;
  $('#goL6').onclick=showResult;
  checkDone();
}
function checkDone(){
  const need=['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11'];
  const done=need.filter(id=>S.answered.has(id)).length;
  const right=need.filter(id=>S.completed.has(id)).length;
  const box=$('#l6Progress');
  if(box){
    box.innerHTML=`<span class="fb-ic">📊</span><div>本關進度：已作答 <b>${done} / ${need.length}</b> 題（答對 <b>${right}</b> 題）。全部答對後「完成」按鈕即可使用。</div>`;
    box.classList.add('show');
  }
  if(right>=need.length)$('#goL6').disabled=false;
}

/* ═══════════════════ 8. 結算 ═══════════════════ */
function showResult(){
  LEVEL_DONE.add(S.level);
  const total=S.completed.size;
  const acc=total?Math.round((total-S.misses.length)/total*100):0;
  const grade=acc>=90?'🏆 優異':(acc>=70?'👍 良好':(acc>=50?'💪 進步中':'📖 需要多練習'));
  $('#stageWrap').className='wrap';
  $('#stageWrap').innerHTML=`
    <div class="level" id="qCard">
      <div class="level-head">
        <div class="level-no">🎉</div>
        <div class="level-title">
          <h2>完成《認識比例》！</h2>
          <p>你已經學會判斷兩個比能不能組成比例</p>
        </div>
        <div class="level-badge">學習成果</div>
      </div>
      <div class="level-body">
        <div class="result-grid">
          <div class="res-card"><div class="rv">${S.score}</div><div class="rl">總分</div></div>
          <div class="res-card"><div class="rv">${total}</div><div class="rl">完成題數</div></div>
          <div class="res-card"><div class="rv">${S.maxCombo}</div><div class="rl">最高連對</div></div>
          <div class="res-card"><div class="rv">${acc}%</div><div class="rl">正確率</div></div>
        </div>
        <div class="tip" style="margin-bottom:18px">
          <span class="tip-ic">${grade.split(' ')[0]}</span>
          <div><b>${grade}</b><br>
          ${acc>=90?'判斷比例的方法掌握得很紮實！可以嘗試做課本練習一的其他題目。'
            :acc>=70?'已經掌握大部分方法！記住兩個重點：① 比較兩個比值是否相等；② 分數和小數可以用交叉相乘。'
            :'建議重新做一次第 3、4 關：先化簡比，再比較比值，是判斷比例最穩妥的方法。'}</div>
        </div>
        <h3 style="font-size:17px;font-weight:900;margin:20px 0 8px">📋 錯題回顧</h3>
        <div id="reviewBox"></div>
        <div class="opts" style="justify-content:center;margin-top:22px">
          <button class="btn ghost" id="againBtn">↺ 重新開始</button>
          <button class="btn" id="reviewBtn">📋 看看錯題</button>
        </div>
      </div>
    </div>`;
  renderReview();
  $('#againBtn').onclick=()=>{
    S.level=0;S.score=0;S.combo=0;S.maxCombo=0;S.answered.clear();S.completed.clear();S.misses=[];LEVEL_DONE.clear();
    DM.reset();goto(0);syncHUD();
  };
  $('#reviewBtn').onclick=showWrongModal;
}
function renderReview(){
  const box=$('#reviewBox');
  if(!box)return;
  if(!S.misses.length){
    box.innerHTML=`<div class="fb good show"><span class="fb-ic">🌟</span><div><b>全部答對，沒有錯題！</b>你對「判斷比例」掌握得非常穩。</div></div>`;
    return;
  }
  box.innerHTML=S.misses.map((m,i)=>`
    <div class="review-item miss">
      <div class="rq">${i+1}. ${m.q}</div>
      <div class="ra">你的答案：<span class="you">${m.you}</span>　｜　正確答案：<span class="right">${m.right}</span></div>
    </div>`).join('');
}
function showWrongModal(){
  $('#modalTitle').textContent='錯題回顧';
  const body=$('#modalBody');
  if(!S.misses.length){
    body.innerHTML=`<div class="fb good show" style="margin:0"><span class="fb-ic">🌟</span><div><b>暫時沒有錯題記錄。</b>繼續加油！</div></div>`;
  }else{
    body.innerHTML=S.misses.map((m,i)=>`
      <div class="review-item miss">
        <div class="rq">${i+1}. ${m.q}</div>
        <div class="ra">你的答案：<span class="you">${m.you}</span><br>正確答案：<span class="right">${m.right}</span></div>
      </div>`).join('')+
      `<div class="tip" style="margin-top:16px"><span class="tip-ic">💡</span><div><b>判斷比例的兩招：</b><br>① <b>化簡比</b>：把兩個比都化簡成最簡整數比，再看是否相同。<br>② <b>交叉相乘</b>：遇到分數或小數時特別快。</div></div>`;
  }
  $('#modalBg').classList.add('show');
}

/* ═══════════════════ 9. 模式切換 ═══════════════════ */
function toggleMode(){
  S.mode=S.mode==='study'?'class':'study';
  document.body.classList.toggle('class-mode',S.mode==='class');
  document.body.classList.toggle('study-mode',S.mode==='study');
  const btn=$('#modeBtn');
  if(S.mode==='class'){
    btn.innerHTML='📚 學生自學';btn.classList.add('on');
    toast('已切換到課堂搶答模式：每題會有倒數，老師可以按「顯示答案」揭示。');
  }else{
    btn.innerHTML='🎯 課堂搶答';btn.classList.remove('on');
    toast('已切換到學生自學模式：每題都有提示和詳解。');
  }
  goto(S.level);   // 重新渲染以套用模式
}
function toast(msg){
  const t=document.createElement('div');
  t.style.cssText=`position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:350;
    background:var(--ink);color:#fff;padding:11px 20px;border-radius:99px;font-size:14px;font-weight:700;
    box-shadow:0 8px 24px rgba(0,0,0,.28);animation:cardIn .35s cubic-bezier(.2,.9,.3,1);max-width:88vw;text-align:center;`;
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.transition='opacity .4s, transform .4s';t.style.opacity='0';t.style.transform='translate(-50%,-14px)';},3200);
  setTimeout(()=>t.remove(),3700);
}

/* ═══════════════════ 10. 全班模式 ═══════════════════ */
/* 課堂搶答：每關加上倒數計時 + 揭示答案 + 學生排行榜 */
function classPanelHTML(){
  return `<div class="countdown class-only" id="cdBox"><span>⏱</span><span id="cdNum">20</span><span style="font-size:12px;opacity:.75">秒</span></div>`;
}
function leaderHTML(){
  return `<div class="leader class-only" id="leaderBox">
    <h4>🏆 學生排行榜 <span>課堂搶答模式</span></h4>
    <div class="lead-rows" id="leadRows"></div>
  </div>`;
}
function startCountdown(sec,onEnd){
  const box=$('#cdBox');if(!box)return null;
  let n=sec;box.classList.add('show');
  const num=$('#cdNum');
  num.textContent=n;
  const t=setInterval(()=>{
    n--;
    if(n<=0){clearInterval(t);num.textContent='0';box.classList.remove('urgent');if(SOUND_ON)DM.tone(300,.2,'square',.16);onEnd&&onEnd();return;}
    num.textContent=n;
    box.classList.toggle('urgent',n<=5);
    if(SOUND_ON&&n<=3)DM.tone(880,.08,'square',.13);
  },1000);
  S.classMode.countdown=t;
  return t;
}
function stopCountdown(){
  if(S.classMode.countdown){clearInterval(S.classMode.countdown);S.classMode.countdown=0;}
  const box=$('#cdBox');if(box){box.classList.remove('show','urgent');}
}
/* 課堂搶答：輸入學生姓名 + 記分 */
function classScorePanel(){
  return `<div class="class-only" style="margin-top:16px;padding:14px 16px;border-radius:var(--r-m);background:var(--cream);border:2px solid var(--cream-d)">
    <div style="font-size:14px;font-weight:800;margin-bottom:10px">✍️ 登記作答</div>
    <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">
      <input id="stuName" placeholder="學生姓名" maxlength="8"
        style="height:40px;padding:0 14px;border-radius:99px;border:2px solid var(--line);background:#fff;font-family:var(--font);font-size:14.5px;font-weight:600;min-width:130px">
      <button class="btn sm" id="stuAdd">登記</button>
      <button class="btn sm green" id="stuOk">✅ 答對 +10</button>
      <button class="btn sm ghost" id="stuNo">❌ 答錯</button>
      <button class="btn sm ghost" id="stuReset">重設登記</button>
    </div>
  </div>`;
}
let stuList=[];
function bindClassPanel(){
  const add=$('#stuAdd');if(!add)return;
  const inp=$('#stuName');
  const render=()=>{
    const box=$('#leadRows');if(!box)return;
    if(!stuList.length){box.innerHTML=`<div style="font-size:13px;color:var(--ink-3);padding:4px">尚未登記學生</div>`;return;}
    const sorted=[...stuList].sort((a,b)=>b.pt-a.pt);
    box.innerHTML=sorted.map((s,i)=>`
      <div class="lead-row">
        <span class="rk">${i+1}</span>
        <span class="nm">${esc(s.name)}</span>
        <span class="pt">${s.pt}</span>
        <button class="x-btn" style="width:26px;height:26px;font-size:12px" data-del="${i}">✕</button>
      </div>`).join('');
    box.querySelectorAll('[data-del]').forEach(b=>{
      b.onclick=()=>{stuList.splice(Number(b.dataset.del),1);render();};
    });
  };
  add.onclick=()=>{
    const n=inp.value.trim();
    if(!n){toast('請先輸入學生姓名');return;}
    if(stuList.some(s=>s.name===n)){toast('這位學生已登記');return;}
    stuList.push({name:n,pt:0});inp.value='';render();
    clickSound();
  };
  inp.onkeydown=e=>{if(e.key==='Enter')add.click();};
  $('#stuOk').onclick=()=>{
    if(!stuList.length){toast('請先登記學生');return;}
    const first=stuList.reduce((a,b)=>a.pt<=b.pt?a:b);
    first.pt+=10;render();
    comboSound(Math.min(Math.floor(first.pt/10),8));
    sparkleAt('#leaderBox',8);
    toast(`✅ ${first.name} 答對！目前 ${first.pt} 分`);
  };
  $('#stuNo').onclick=()=>{
    if(!stuList.length){toast('請先登記學生');return;}
    missSound();toast('❌ 答錯，沒有得分');
  };
  $('#stuReset').onclick=()=>{stuList=[];render();};
  render();
}

/* ═══════════════════ 11. 事件綁定 ═══════════════════ */
const LEVELS_RENDER=[renderL1,renderL2,renderL3,renderL4,renderL5,renderL6];
const LEVELS_BIND=[bindL1,bindL2,bindL3,bindL4,bindL5,bindL6];

$('#modeBtn').onclick=toggleMode;
$('#soundBtn').onclick=()=>{
  S.sound=!S.sound;SOUND_ON=S.sound;
  $('#soundBtn').textContent=S.sound?'🔊':'🔇';
  $('#soundBtn').classList.toggle('on',!S.sound);
  if(S.sound)clickSound();
};
$('#helpBtn').onclick=()=>{
  $('#modalTitle').textContent='學習說明 · 認識比例';
  $('#modalBody').innerHTML=`
    <h4>🎯 這堂課要學甚麼？</h4>
    <ul>
      <li>知道<b>比例</b>是甚麼：兩個比值相等的比組成的等式。</li>
      <li>學會用兩種方法判斷兩個比能否組成比例。</li>
      <li>認識比例的<b>外項</b>和<b>內項</b>。</li>
    </ul>
    <h4>🔧 兩種判斷方法</h4>
    <ul>
      <li><b>化簡比</b>：把兩個比都化簡成最簡整數比，再比較是否一樣。<br>
      例：12 : 18 = 2 : 3，8 : 12 = 2 : 3 → 相等 ✓</li>
      <li><b>交叉相乘</b>：分數或小數時更快。<br>
      例：12 × 12 = 144，18 × 8 = 144 → 相等 ✓</li>
    </ul>
    <h4>🕹️ 兩種模式</h4>
    <ul>
      <li><b>📚 學生自學</b>：每題都有提示、詳解和錯題回顧，適合自己溫習。</li>
      <li><b>🎯 課堂搶答</b>：老師投屏全班搶答，每題有倒數，可揭示答案。</li>
    </ul>
    <h4>⌨️ 操作</h4>
    <ul>
      <li>點擊選項或按鈕作答；答對會有粒子、音效和數字跳動。</li>
      <li>連續答對會累積<b>連對</b>倍率，分數愈來愈高。</li>
      <li>答錯會自動記錄在「錯題回顧」裏，可隨時查看。</li>
    </ul>`;
  $('#modalBg').classList.add('show');
};
$('#modalX').onclick=()=>$('#modalBg').classList.remove('show');
$('#modalBg').onclick=e=>{if(e.target===$('#modalBg'))$('#modalBg').classList.remove('show');};
$('#prevBtn').onclick=prevLevel;
$('#nextBtn').onclick=nextLevel;

/* 鍵盤快捷 */
addEventListener('keydown',e=>{
  if(e.key==='Escape')$('#modalBg').classList.remove('show');
  if(e.key==='ArrowRight')nextLevel();
  if(e.key==='ArrowLeft')prevLevel();
});

/* ═══════════════════ 12. 啟動 ═══════════════════ */
syncHUD();
goto(0);

/* 交付前自檢（console） */
setTimeout(()=>{
  const CHECK={
    hitstop:typeof hitstop==='function',
    shake:typeof shake==='function',
    tweenNumber:typeof tweenNumber==='function',
    sparkleAt:typeof sparkleAt==='function',
    anticipation:typeof ultimateAnticipation==='function',
    comboSound:typeof comboSound==='function',
    dmHit:typeof DM.hit==='function',
    dmUpdate:typeof DM.update==='function',
    dmDraw:typeof DM.draw==='function',
    dmTick:typeof DM.tickHitstop==='function',
    dmReset:typeof DM.reset==='function',
    skins:DM.list().length
  };
  Object.entries(CHECK).forEach(([k,v])=>{if(v===false)console.error('✗ 缺回饋通道:',k);});
  console.log(CHECK);
  console.log('✓ 互動網頁就緒 — 教材 M6A_11《認識比例》');
},400);

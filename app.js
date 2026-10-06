const el=id=>document.getElementById(id);
const classSelect=el('classSelect'),className=el('className'),studentCount=el('studentCount'),classSummary=el('classSummary');
const numberDisplay=el('numberDisplay'),stageLabel=el('stageLabel'),drawBtn=el('drawBtn');
const historyChips=el('historyChips'),drawCount=el('drawCount'),missionDisplay=el('missionDisplay');
const rouletteWheel=el('rouletteWheel'),routePanel=el('routePanel'),routeDrawBtn=el('routeDrawBtn'),routeResult=el('routeResult');
const settings={drawSeconds:el('drawSeconds'),excludeDrawn:el('excludeDrawn'),soundOn:el('soundOn'),luckySafe:el('luckySafe'),missionList:el('missionList')};

const DEFAULT_MISSIONS=['答えを説明する','英文を音読する','日本語に訳す','理由を1つ言う','隣の人に質問する','例文を1つ作る'];
const ROUTES=[
  {order:'縦に順番',horizontal:'窓 → 廊下',vertical:'前 → 後ろ'},
  {order:'縦に順番',horizontal:'窓 → 廊下',vertical:'後ろ → 前'},
  {order:'縦に順番',horizontal:'廊下 → 窓',vertical:'前 → 後ろ'},
  {order:'縦に順番',horizontal:'廊下 → 窓',vertical:'後ろ → 前'},
  {order:'横に順番',horizontal:'窓 → 廊下',vertical:'前 → 後ろ'},
  {order:'横に順番',horizontal:'窓 → 廊下',vertical:'後ろ → 前'},
  {order:'横に順番',horizontal:'廊下 → 窓',vertical:'前 → 後ろ'},
  {order:'横に順番',horizontal:'廊下 → 窓',vertical:'後ろ → 前'}
];
const STORE_KEY='classroomDrawV2';
const state={mode:'normal',busy:false,activeId:null,profiles:{}};

function uid(){return 'class-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)}
function freshProfile(name='クラスを設定'){return{id:uid(),name,count:40,drawSeconds:3,absent:[],history:[],excludeDrawn:true,soundOn:true,luckySafe:false,missionList:DEFAULT_MISSIONS.join('\n')}}
function current(){return state.profiles[state.activeId]}

function migrate(){
  let data=null;
  try{data=JSON.parse(localStorage.getItem(STORE_KEY)||'null')}catch{}
  if(data&&data.profiles){state.profiles=data.profiles;state.activeId=data.activeId&&data.profiles[data.activeId]?data.activeId:Object.keys(data.profiles)[0];return}
  let old={};try{old=JSON.parse(localStorage.getItem('classroomDrawState')||'{}')}catch{}
  const legacyName=(old.className&&old.className!=='1年3組')?old.className:'クラスを設定';
  const p=freshProfile(legacyName);
  p.count=old.count||40;p.absent=old.absent||[];p.history=old.history||[];
  if(typeof old.excludeDrawn==='boolean')p.excludeDrawn=old.excludeDrawn;
  if(typeof old.soundOn==='boolean')p.soundOn=old.soundOn;
  if(typeof old.luckySafe==='boolean')p.luckySafe=old.luckySafe;
  if(old.missionList)p.missionList=old.missionList;
  state.profiles[p.id]=p;state.activeId=p.id;persist();
}
function persist(){localStorage.setItem(STORE_KEY,JSON.stringify({activeId:state.activeId,profiles:state.profiles}))}
function capture(){
  const p=current();if(!p)return;
  p.name=className.value.trim()||'クラスを設定';
  p.count=Math.max(1,Math.min(60,+studentCount.value||1));
  p.drawSeconds=Math.max(1,Math.min(15,+settings.drawSeconds.value||3));
  p.excludeDrawn=settings.excludeDrawn.checked;p.soundOn=settings.soundOn.checked;
  p.luckySafe=settings.luckySafe.checked;p.missionList=settings.missionList.value;
}
function renderClassSelect(){
  classSelect.innerHTML='';
  Object.values(state.profiles).forEach(p=>{
    const o=document.createElement('option');o.value=p.id;o.textContent=p.name;
    if(p.id===state.activeId)o.selected=true;classSelect.appendChild(o);
  });
}
function loadProfile(){
  const p=current();if(!p)return;
  className.value=p.name==='クラスを設定'?'':p.name;studentCount.value=p.count;
  settings.drawSeconds.value=p.drawSeconds||3;
  settings.excludeDrawn.checked=p.excludeDrawn!==false;settings.soundOn.checked=p.soundOn!==false;
  settings.luckySafe.checked=!!p.luckySafe;settings.missionList.value=p.missionList||DEFAULT_MISSIONS.join('\n');
  renderClassSelect();renderClassSummary();renderHistory();resetStage();
  if(p.name==='クラスを設定'){
    const panel=el('settingsPanel');panel.classList.remove('hidden');
    el('settingsToggle').textContent='設定を閉じる';
  }
}
function renderClassSummary(){
  const p=current();if(!p)return;
  classSummary.textContent='最大'+p.count+'番 · '+(p.drawSeconds||3)+'秒';
}
function saveCurrent(){
  capture();persist();renderClassSelect();renderClassSummary();flashLabel('クラスを保存しました');
}
function newClass(){
  capture();persist();
  const p=freshProfile('クラスを設定');state.profiles[p.id]=p;state.activeId=p.id;persist();loadProfile();
  className.focus();className.select();
}
function switchClass(id){capture();persist();state.activeId=id;persist();loadProfile()}
function deleteCurrentClass(){
  const p=current();if(!p)return;
  const label=p.name==='クラスを設定'?'この未設定クラス':`「${p.name}」`;
  if(!confirm(`${label}を削除しますか？\n欠席設定・指名履歴・MISSION設定も削除されます。`))return;
  delete state.profiles[state.activeId];
  const ids=Object.keys(state.profiles);
  if(!ids.length){
    const next=freshProfile('クラスを設定');
    state.profiles[next.id]=next;state.activeId=next.id;
  }else{
    state.activeId=ids[0];
  }
  persist();loadProfile();flashLabel('クラスを削除しました');
}

function absentSet(){return new Set(current()?.absent||[])}
function pool(){
  const p=current();if(!p)return[];
  const absent=absentSet();
  let arr=Array.from({length:p.count},(_,i)=>i+1).filter(n=>!absent.has(n));
  if(settings.excludeDrawn.checked){
    const used=new Set(p.history.map(x=>x.number));
    const fresh=arr.filter(n=>!used.has(n));
    if(fresh.length)arr=fresh;
  }
  return arr;
}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function pulseNumber(){
  numberDisplay.classList.remove('pop');void numberDisplay.offsetWidth;numberDisplay.classList.add('pop');
}
function flashLabel(t){stageLabel.textContent=t;setTimeout(()=>{if(!state.busy)stageLabel.textContent='READY'},1100)}

let audioCtx=null;
function audio(){
  if(!settings.soundOn.checked)return null;
  try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();return audioCtx}catch{return null}
}
function tone(freq,dur=.08,type='sine',gain=.055,delay=0){
  const c=audio();if(!c)return;
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur);
}
function tick(i=0){tone(300+i*9,.04,'square',.032)}
function popSound(){tone(520,.07,'triangle',.05);tone(720,.08,'triangle',.035,.05)}
function suspense(){tone(220,.16,'sawtooth',.035);tone(277,.16,'sawtooth',.03,.12);tone(330,.2,'sawtooth',.025,.24)}
function fanfare(){
  [523,659,784,1047].forEach((f,i)=>tone(f,.16,'triangle',.065,i*.1));
  tone(1319,.32,'sine',.055,.42);
}
function missionSound(){tone(660,.1,'triangle',.05);tone(880,.12,'triangle',.05,.1);tone(1108,.2,'triangle',.05,.22)}

function drawDurationMs(){
  return Math.max(1000,Math.min(15000,Math.round((+settings.drawSeconds.value||3)*1000)));
}
async function animateSlot(arr){
  rouletteWheel.classList.add('hidden');numberDisplay.classList.remove('hidden');stageLabel.textContent='SLOT SPIN!';
  const total=drawDurationMs();
  const frames=Math.max(12,Math.min(90,Math.round(total/90)));
  const weights=Array.from({length:frames},(_,i)=>0.45+1.1*(i/(frames-1||1)));
  const sum=weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<frames;i++){
    numberDisplay.textContent=String(pick(arr)).padStart(2,'0');tick(i);
    await sleep(total*weights[i]/sum);
  }
  return pick(arr);
}
async function animateRoulette(arr){
  numberDisplay.classList.add('hidden');rouletteWheel.classList.remove('hidden');
  const center=rouletteWheel.querySelector('.wheel-center');center.textContent='?';
  const total=drawDurationMs();
  rouletteWheel.style.animationDuration=total+'ms';
  rouletteWheel.classList.remove('spin');void rouletteWheel.offsetWidth;rouletteWheel.classList.add('spin');
  stageLabel.textContent='ROULETTE!';
  const ticks=Math.max(10,Math.min(55,Math.round(total/100)));
  for(let i=0;i<ticks;i++){tick(i);await sleep(total/ticks)}
  const winner=pick(arr);
  center.textContent=String(winner).padStart(2,'0');fanfare();
  return winner;
}
async function animateSurvival(arr){
  rouletteWheel.classList.add('hidden');numberDisplay.classList.remove('hidden');stageLabel.textContent='SURVIVAL START!';
  const total=drawDurationMs();
  let survivors=[...arr],rounds=[];
  while(survivors.length>3){
    survivors=survivors.sort(()=>Math.random()-.5).slice(0,Math.max(3,Math.ceil(survivors.length*.58)));
    rounds.push([...survivors]);
  }
  const reduceTime=rounds.length?total*.68:0;
  const perRound=rounds.length?reduceTime/rounds.length:0;
  for(const list of rounds){
    numberDisplay.textContent=list.length;popSound();await sleep(perRound);
  }
  const finalists=survivors;
  stageLabel.textContent='FINAL 3';suspense();
  numberDisplay.style.fontSize='clamp(3rem,10vw,7rem)';
  numberDisplay.textContent=finalists.map(n=>String(n).padStart(2,'0')).join(' · ');
  await sleep(total-reduceTime);
  numberDisplay.style.fontSize='';
  return pick(finalists);
}
async function animateMission(arr){return animateSlot(arr)}

function confetti(){
  const layer=el('confettiLayer'),colors=['#ff78ad','#ffd95f','#69dfc8','#75b9ff','#ac8cff','#ff9f75'];
  for(let i=0;i<80;i++){
    const d=document.createElement('i');d.className='confetti';d.style.left=Math.random()*100+'vw';
    d.style.background=colors[i%colors.length];d.style.animationDelay=Math.random()*260+'ms';
    d.style.transform='rotate('+Math.random()*360+'deg)';layer.appendChild(d);setTimeout(()=>d.remove(),1800);
  }
}
function resetStage(){
  rouletteWheel.classList.add('hidden');rouletteWheel.classList.remove('spin');
  numberDisplay.classList.remove('hidden');numberDisplay.textContent='--';numberDisplay.style.fontSize='';
  missionDisplay.classList.add('hidden');routePanel.classList.add('hidden');routeResult.classList.add('hidden');routeResult.innerHTML='';
  stageLabel.textContent='READY';
}
async function draw(){
  if(state.busy)return;
  capture();
  const arr=pool();if(!arr.length){stageLabel.textContent='候補がいません';numberDisplay.textContent='--';return}
  state.busy=true;drawBtn.disabled=true;missionDisplay.classList.add('hidden');
  routePanel.classList.add('hidden');routeResult.classList.add('hidden');routeResult.innerHTML='';
  let winner;
  if(state.mode==='roulette')winner=await animateRoulette(arr);
  else if(state.mode==='survival')winner=await animateSurvival(arr);
  else if(state.mode==='mission')winner=await animateMission(arr);
  else winner=await animateSlot(arr);

  if(state.mode!=='roulette'){numberDisplay.classList.remove('hidden');numberDisplay.textContent=String(winner).padStart(2,'0');pulseNumber()}
  stageLabel.textContent='TODAY\'S PICK!';

  let mission='';
  if(state.mode==='mission'){
    const list=settings.missionList.value.split('\n').map(s=>s.trim()).filter(Boolean);
    mission=list.length?pick(list):'答えを説明する';
    missionDisplay.textContent='MISSION：'+mission;missionDisplay.classList.remove('hidden');missionSound();
  }else if(state.mode!=='roulette'){fanfare()}

  if(settings.luckySafe.checked&&Math.random()<.08){
    stageLabel.textContent='LUCKY SAFE!';
    missionDisplay.textContent='今回はセーフ！ もう一度DRAW!';missionDisplay.classList.remove('hidden');missionSound();
  }else{
    current().history.push({number:winner,mission,time:Date.now(),mode:state.mode,route:null});
    routePanel.classList.remove('hidden');routeResult.classList.add('hidden');routeResult.innerHTML='';
    confetti();renderHistory();persist();
  }
  state.busy=false;drawBtn.disabled=false;
}
async function drawRoute(){
  const p=current();if(state.busy||!p?.history.length)return;
  state.busy=true;routeDrawBtn.disabled=true;routeResult.classList.remove('hidden');
  stageLabel.textContent='ROUTE DRAW!';
  const total=Math.max(900,Math.min(2400,drawDurationMs()*.55));
  const steps=12;
  for(let i=0;i<steps;i++){
    const r=ROUTES[i%ROUTES.length];
    routeResult.innerHTML='<span>進み方：'+r.order+'</span><span>横：'+r.horizontal+'</span><span>縦：'+r.vertical+'</span>';
    tick(i);await sleep(total/steps);
  }
  const picked=pick(ROUTES);
  routeResult.innerHTML='<span>進み方：'+picked.order+'</span><span>横：'+picked.horizontal+'</span><span>縦：'+picked.vertical+'</span>';
  const last=p.history[p.history.length-1];last.route=picked;
  persist();renderHistory();fanfare();confetti();
  stageLabel.textContent='この順番でGO!';
  routeDrawBtn.disabled=false;state.busy=false;
}
function renderHistory(){
  const p=current();drawCount.textContent=(p?.history.length||0)+'回';historyChips.innerHTML='';
  (p?.history||[]).forEach(x=>{
    const s=document.createElement('span');s.className='chip';
    const route=x.route?' · '+(x.route.order?x.route.order+' / ':'')+x.route.horizontal+' / '+x.route.vertical:'';
    s.textContent='#'+x.number+(x.mission?' · '+x.mission:'')+route;historyChips.appendChild(s);
  });
}
function openAbsence(){
  capture();
  const p=current(),set=new Set(p.absent||[]),grid=el('absenceGrid');grid.innerHTML='';
  for(let n=1;n<=p.count;n++){
    const b=document.createElement('button');b.type='button';b.className='absence-btn'+(set.has(n)?' active':'');b.textContent=n;
    b.onclick=()=>{b.classList.toggle('active');set.has(n)?set.delete(n):set.add(n);p.absent=[...set].sort((a,b)=>a-b)};
    grid.appendChild(b);
  }
  el('absenceDialog').showModal();
}

document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{
  if(state.busy)return;
  document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  state.mode=b.dataset.mode;resetStage();
});
drawBtn.onclick=draw;
routeDrawBtn.onclick=drawRoute;
el('absenceBtn').onclick=openAbsence;
el('saveAbsenceBtn').onclick=()=>{capture();persist()};
el('saveClassBtn').onclick=saveCurrent;
el('newClassBtn').onclick=newClass;
el('deleteClassBtn').onclick=deleteCurrentClass;
classSelect.onchange=e=>switchClass(e.target.value);
el('settingsToggle').onclick=()=>{const p=el('settingsPanel');p.classList.toggle('hidden');el('settingsToggle').textContent=p.classList.contains('hidden')?'設定を開く':'設定を閉じる'};
el('undoBtn').onclick=()=>{const p=current();if(p.history.length){p.history.pop();renderHistory();persist();routePanel.classList.add('hidden');routeResult.classList.add('hidden');flashLabel('1回戻しました')}};
el('resetRoundBtn').onclick=()=>{if(confirm('このクラスの今日の指名履歴をリセットしますか？')){current().history=[];renderHistory();persist();resetStage()}};
el('helpBtn').onclick=()=>location.href='manual.html';
[className,studentCount,settings.drawSeconds,settings.excludeDrawn,settings.soundOn,settings.luckySafe,settings.missionList].forEach(x=>x.addEventListener('change',()=>{capture();persist()}));
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)){e.preventDefault();draw()}});
migrate();loadProfile();
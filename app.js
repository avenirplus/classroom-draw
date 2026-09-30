const el=id=>document.getElementById(id);
const classSelect=el('classSelect'),className=el('className'),studentCount=el('studentCount');
const numberDisplay=el('numberDisplay'),stageLabel=el('stageLabel'),drawBtn=el('drawBtn');
const historyChips=el('historyChips'),drawCount=el('drawCount'),missionDisplay=el('missionDisplay');
const rouletteWheel=el('rouletteWheel');
const settings={excludeDrawn:el('excludeDrawn'),soundOn:el('soundOn'),luckySafe:el('luckySafe'),missionList:el('missionList')};

const DEFAULT_MISSIONS=['答えを説明する','英文を音読する','日本語に訳す','理由を1つ言う','隣の人に質問する','例文を1つ作る'];
const STORE_KEY='classroomDrawV2';
const state={mode:'normal',busy:false,activeId:null,profiles:{}};

function uid(){return 'class-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)}
function freshProfile(name='1年3組'){return{id:uid(),name,count:40,absent:[],history:[],excludeDrawn:true,soundOn:true,luckySafe:false,missionList:DEFAULT_MISSIONS.join('\n')}}
function current(){return state.profiles[state.activeId]}

function migrate(){
  let data=null;
  try{data=JSON.parse(localStorage.getItem(STORE_KEY)||'null')}catch{}
  if(data&&data.profiles){state.profiles=data.profiles;state.activeId=data.activeId&&data.profiles[data.activeId]?data.activeId:Object.keys(data.profiles)[0];return}
  let old={};try{old=JSON.parse(localStorage.getItem('classroomDrawState')||'{}')}catch{}
  const p=freshProfile(old.className||'1年3組');
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
  p.name=className.value.trim()||'名称未設定';
  p.count=Math.max(1,Math.min(60,+studentCount.value||1));
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
  className.value=p.name;studentCount.value=p.count;
  settings.excludeDrawn.checked=p.excludeDrawn!==false;settings.soundOn.checked=p.soundOn!==false;
  settings.luckySafe.checked=!!p.luckySafe;settings.missionList.value=p.missionList||DEFAULT_MISSIONS.join('\n');
  renderClassSelect();renderHistory();resetStage();
}
function saveCurrent(){
  capture();persist();renderClassSelect();flashLabel('クラスを保存しました');
}
function newClass(){
  capture();persist();
  const p=freshProfile('新しいクラス');state.profiles[p.id]=p;state.activeId=p.id;persist();loadProfile();
  className.focus();className.select();
}
function switchClass(id){capture();persist();state.activeId=id;persist();loadProfile()}

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

async function animateSlot(arr){
  rouletteWheel.classList.add('hidden');numberDisplay.classList.remove('hidden');stageLabel.textContent='SLOT SPIN!';
  for(let i=0;i<30;i++){
    numberDisplay.textContent=String(pick(arr)).padStart(2,'0');tick(i);await sleep(38+Math.floor(i*4.8));
  }
  return pick(arr);
}
async function animateRoulette(arr){
  numberDisplay.classList.add('hidden');rouletteWheel.classList.remove('hidden');
  const center=rouletteWheel.querySelector('.wheel-center');center.textContent='?';
  rouletteWheel.classList.remove('spin');void rouletteWheel.offsetWidth;rouletteWheel.classList.add('spin');
  stageLabel.textContent='ROULETTE!';
  for(let i=0;i<20;i++){tick(i);await sleep(85+Math.floor(i*5))}
  const winner=pick(arr);await sleep(500);center.textContent=String(winner).padStart(2,'0');fanfare();await sleep(500);
  return winner;
}
async function animateSurvival(arr){
  rouletteWheel.classList.add('hidden');numberDisplay.classList.remove('hidden');stageLabel.textContent='SURVIVAL START!';
  let survivors=[...arr];
  while(survivors.length>3){
    survivors=survivors.sort(()=>Math.random()-.5).slice(0,Math.max(3,Math.ceil(survivors.length*.58)));
    numberDisplay.textContent=survivors.length;popSound();await sleep(420);
  }
  stageLabel.textContent='FINAL 3';suspense();
  numberDisplay.style.fontSize='clamp(3rem,10vw,7rem)';
  numberDisplay.textContent=survivors.map(n=>String(n).padStart(2,'0')).join(' · ');
  await sleep(1300);
  numberDisplay.style.fontSize='';
  return pick(survivors);
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
  missionDisplay.classList.add('hidden');stageLabel.textContent='READY';
}
async function draw(){
  if(state.busy)return;
  capture();
  const arr=pool();if(!arr.length){stageLabel.textContent='候補がいません';numberDisplay.textContent='--';return}
  state.busy=true;drawBtn.disabled=true;missionDisplay.classList.add('hidden');
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
    current().history.push({number:winner,mission,time:Date.now(),mode:state.mode});
    confetti();renderHistory();persist();
  }
  state.busy=false;drawBtn.disabled=false;
}
function renderHistory(){
  const p=current();drawCount.textContent=(p?.history.length||0)+'回';historyChips.innerHTML='';
  (p?.history||[]).forEach(x=>{
    const s=document.createElement('span');s.className='chip';
    s.textContent='#'+x.number+(x.mission?' · '+x.mission:'');historyChips.appendChild(s);
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
el('absenceBtn').onclick=openAbsence;
el('saveAbsenceBtn').onclick=()=>{capture();persist()};
el('saveClassBtn').onclick=saveCurrent;
el('newClassBtn').onclick=newClass;
classSelect.onchange=e=>switchClass(e.target.value);
el('settingsToggle').onclick=()=>{const p=el('settingsPanel');p.classList.toggle('hidden');el('settingsToggle').textContent=p.classList.contains('hidden')?'設定を開く':'設定を閉じる'};
el('undoBtn').onclick=()=>{const p=current();if(p.history.length){p.history.pop();renderHistory();persist();flashLabel('1回戻しました')}};
el('resetRoundBtn').onclick=()=>{if(confirm('このクラスの今日の指名履歴をリセットしますか？')){current().history=[];renderHistory();persist();resetStage()}};
el('helpBtn').onclick=()=>location.href='manual.html';
[className,studentCount,settings.excludeDrawn,settings.soundOn,settings.luckySafe,settings.missionList].forEach(x=>x.addEventListener('change',()=>{capture();persist()}));
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)){e.preventDefault();draw()}});
migrate();loadProfile();
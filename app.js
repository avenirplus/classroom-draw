const state={mode:'normal',absent:new Set(),history:[],busy:false};
const el=id=>document.getElementById(id);
const className=el('className'),studentCount=el('studentCount'),numberDisplay=el('numberDisplay'),stageLabel=el('stageLabel'),drawBtn=el('drawBtn'),historyChips=el('historyChips'),drawCount=el('drawCount'),missionDisplay=el('missionDisplay');
const settings={excludeDrawn:el('excludeDrawn'),soundOn:el('soundOn'),luckySafe:el('luckySafe'),missionList:el('missionList')};

function save(){
 localStorage.setItem('classroomDrawState',JSON.stringify({
  className:className.value,count:+studentCount.value,absent:[...state.absent],history:state.history,
  excludeDrawn:settings.excludeDrawn.checked,soundOn:settings.soundOn.checked,luckySafe:settings.luckySafe.checked,missionList:settings.missionList.value
 }));
}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem('classroomDrawState')||'{}');
  if(s.className)className.value=s.className;if(s.count)studentCount.value=s.count;
  state.absent=new Set(s.absent||[]);state.history=s.history||[];
  if(typeof s.excludeDrawn==='boolean')settings.excludeDrawn.checked=s.excludeDrawn;
  if(typeof s.soundOn==='boolean')settings.soundOn.checked=s.soundOn;
  if(typeof s.luckySafe==='boolean')settings.luckySafe.checked=s.luckySafe;
  if(s.missionList)settings.missionList.value=s.missionList;
 }catch{}
 renderHistory();
}
function pool(){
 const max=Math.max(1,Math.min(60,+studentCount.value||1));
 let arr=Array.from({length:max},(_,i)=>i+1).filter(n=>!state.absent.has(n));
 if(settings.excludeDrawn.checked){
  const used=new Set(state.history.map(x=>x.number));
  const fresh=arr.filter(n=>!used.has(n));
  if(fresh.length)arr=fresh;
 }
 return arr;
}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function beep(freq=440,dur=.08){
 if(!settings.soundOn.checked)return;
 try{
  const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();
  o.frequency.value=freq;o.connect(g);g.connect(c.destination);g.gain.value=.06;o.start();o.stop(c.currentTime+dur);
 }catch{}
}
async function animateNormal(arr){
 stageLabel.textContent='DRAWING';
 for(let i=0;i<26;i++){numberDisplay.textContent=String(pick(arr)).padStart(2,'0');beep(250+i*6,.03);await sleep(45+i*5)}
 return pick(arr);
}
async function animateSurvival(arr){
 stageLabel.textContent='SURVIVAL';
 let survivors=[...arr];
 while(survivors.length>3){
  survivors=survivors.sort(()=>Math.random()-.5).slice(0,Math.max(3,Math.ceil(survivors.length*.55)));
  numberDisplay.textContent=survivors.length;await sleep(420);
 }
 stageLabel.textContent='FINAL 3';
 numberDisplay.textContent=survivors.map(n=>String(n).padStart(2,'0')).join(' · ');
 await sleep(1100);
 stageLabel.textContent='FINAL';
 return pick(survivors);
}
async function draw(){
 if(state.busy)return;
 const arr=pool();if(!arr.length){stageLabel.textContent='NO CANDIDATES';numberDisplay.textContent='--';return}
 state.busy=true;drawBtn.disabled=true;missionDisplay.classList.add('hidden');
 const winner=state.mode==='survival'?await animateSurvival(arr):await animateNormal(arr);
 numberDisplay.textContent=String(winner).padStart(2,'0');
 stageLabel.textContent='TODAY\'S PICK';
 beep(740,.18);confetti();
 let mission='';
 if(state.mode==='mission'){
  const list=settings.missionList.value.split('\n').map(s=>s.trim()).filter(Boolean);
  mission=list.length?pick(list):'答えを説明する';
  missionDisplay.textContent=mission;missionDisplay.classList.remove('hidden');
 }
 if(settings.luckySafe.checked&&Math.random()<.08){
  stageLabel.textContent='LUCKY SAFE!';
  missionDisplay.textContent='今回はセーフ。もう一度DRAW!';missionDisplay.classList.remove('hidden');
 }else{
  state.history.push({number:winner,mission,time:Date.now()});renderHistory();save();
 }
 state.busy=false;drawBtn.disabled=false;
}
function confetti(){
 const layer=el('confettiLayer');for(let i=0;i<55;i++){const d=document.createElement('i');d.className='confetti';d.style.left=Math.random()*100+'vw';d.style.transform='rotate('+Math.random()*360+'deg)';d.style.animationDelay=Math.random()*200+'ms';d.style.opacity=.5+Math.random()*.5;layer.appendChild(d);setTimeout(()=>d.remove(),1500)}
}
function renderHistory(){
 drawCount.textContent=state.history.length+'回';
 historyChips.innerHTML='';
 state.history.forEach((x,i)=>{const s=document.createElement('span');s.className='chip';s.textContent='#'+x.number+(x.mission?' · '+x.mission:'');historyChips.appendChild(s)});
}
function openAbsence(){
 const grid=el('absenceGrid');grid.innerHTML='';const max=Math.max(1,Math.min(60,+studentCount.value||1));
 for(let n=1;n<=max;n++){const b=document.createElement('button');b.type='button';b.className='absence-btn'+(state.absent.has(n)?' active':'');b.textContent=n;b.onclick=()=>{b.classList.toggle('active');state.absent.has(n)?state.absent.delete(n):state.absent.add(n)};grid.appendChild(b)}
 el('absenceDialog').showModal();
}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mode=b.dataset.mode;missionDisplay.classList.add('hidden');stageLabel.textContent='READY';numberDisplay.textContent='--'});
drawBtn.onclick=draw;
el('absenceBtn').onclick=openAbsence;
el('saveAbsenceBtn').onclick=save;
el('settingsToggle').onclick=()=>{const p=el('settingsPanel');p.classList.toggle('hidden');el('settingsToggle').textContent=p.classList.contains('hidden')?'設定を開く':'設定を閉じる'};
el('undoBtn').onclick=()=>{state.history.pop();renderHistory();save()};
el('resetRoundBtn').onclick=()=>{if(confirm('今日の指名履歴をリセットしますか？')){state.history=[];renderHistory();save();stageLabel.textContent='READY';numberDisplay.textContent='--';missionDisplay.classList.add('hidden')}};
el('helpBtn').onclick=()=>location.href='manual.html';
[className,studentCount,settings.excludeDrawn,settings.soundOn,settings.luckySafe,settings.missionList].forEach(x=>x.addEventListener('change',save));
load();
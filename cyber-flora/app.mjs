import { GardenEngine } from './engine.mjs?v=heat-2';

const $ = (id) => document.getElementById(id);
const engine = new GardenEngine(7);
const garden = $('garden');
const cursor = $('cursor');
const dialog = $('help-dialog');
const plants = [
  {x:48,y:41,size:166,hue:'#69b8b9',type:0,mx:50,my:40},
  {x:19,y:28,size:119,hue:'#6e9d98',type:1,mx:18,my:22},
  {x:19,y:62,size:119,hue:'#6e9d98',type:2,mx:18,my:55},
  {x:77,y:43,size:151,hue:'#80b8bb',type:3,mx:82,my:40},
  {x:48,y:72,size:102,hue:'#8bada3',type:4,mx:50,my:72},
  {x:76,y:18,size:100,hue:'#a5a683',type:5,mx:82,my:18},
  {x:85,y:74,size:102,hue:'#74999f',type:6,mx:82,my:72},
];
const pad = (n) => String(n).padStart(2,'0');
let inputMode = 'pointer';
let pointer = {x:0,y:0};
let physicalNode = null;
let touchNode = null;
let previousLock = null;
let previousActive = null;
let inspectedIndex = null;
let lastRelease = -Infinity;
let suppressFocus = false;
let hidden = false;
let helpReturnFocus = null;

function chip(type) {
  const pins=Array.from({length:8},(_,i)=>{
    const n=29+i*9;
    return `<path d="M${n} 12v12M${n} 96v12M12 ${n}h12M96 ${n}h12"/>`;
  }).join('');
  const die=type===1||type===2
    ? Array.from({length:3},(_,i)=>`<rect x="35" y="${32+i*20}" width="50" height="15" rx="1"/><path d="M39 ${38+i*20}h14"/>`).join('')
    : `<rect x="36" y="36" width="48" height="48" rx="1"/><path d="M40 43h8m-8 5h5M72 77h8m-5-5h5"/>`;
  return `<span class="aura"></span><svg class="chip" viewBox="0 0 120 120" aria-hidden="true"><g class="pins">${pins}</g><rect class="socket" x="16" y="16" width="88" height="88" rx="3"/><path class="package" d="M27 24h66l3 3v66l-3 3H27l-3-3V27Z"/><g class="inner">${die}</g><path class="outer" d="M24 36V24h12M84 24h12v12M96 84v12H84M36 96H24V84"/><circle class="core" cx="31" cy="31" r="2"/><path class="etch" d="M34 89h22m4 0h5m5 0h15"/></svg>`;
}

const nodeButtons = plants.map((plant,i)=>{
  const button=document.createElement('button');
  button.className='node';button.dataset.index=i;
  button.setAttribute('aria-label',`Chip ${pad(i+1)}. Focus to supply power. Residual load resumes on return; disconnect to cool.`);
  button.innerHTML=chip(plant.type);
  $('nodes').append(button);
  button.addEventListener('pointerenter',e=>{
    if(e.pointerType==='touch')return;
    physicalNode=i;
    if(inputMode==='pointer'&&!dialog.open)engine.enter(i,performance.now());
  });
  button.addEventListener('pointerleave',e=>{
    if(e.pointerType==='touch')return;
    if(physicalNode===i)physicalNode=null;
    if(inputMode==='pointer')engine.leave(i,performance.now());
  });
  button.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    e.preventDefault();inputMode='touch';touchNode=i;
    document.body.classList.remove('pointer-active','keyboard-input');
    $('input-label').textContent='Touch input';
    button.setPointerCapture(e.pointerId);
    engine.enter(i,performance.now());
  });
  const endTouch=e=>{
    if(e.pointerType!=='touch')return;
    touchNode=null;engine.leave(i,performance.now());
  };
  button.addEventListener('pointerup',endTouch);
  button.addEventListener('pointercancel',endTouch);
  button.addEventListener('focus',()=>{
    if(!suppressFocus&&inputMode==='keyboard'&&!dialog.open)engine.enter(i,performance.now());
  });
  button.addEventListener('blur',()=>{
    if(!suppressFocus&&inputMode==='keyboard')engine.leave(i,performance.now());
  });
  return button;
});

function layout(){
  const mobile=matchMedia('(max-width:760px)').matches;
  const compact=matchMedia('(max-width:1100px)').matches;
  const coords=plants.map(p=>({x:(mobile?p.mx:p.x)*10,y:(mobile?p.my:p.y)*5}));
  const cpu=coords[0];
  $('stems').innerHTML=plants.map((p,i)=>{
    const {x,y}=coords[i];
    nodeButtons[i].style.left=`${x/10}%`;
    nodeButtons[i].style.top=`${y/5}%`;
    const size=mobile?(i===0?120:94):compact?p.size*.82:p.size;
    nodeButtons[i].style.width=`${size}px`;nodeButtons[i].style.height=`${size}px`;
    const paths=Array.from({length:5},(_,j)=>{
      const d=(j-2)*7;
      const bend=x+(cpu.x-x)*.53+d;
      return `<path d="M${x+d} ${y+d} H${bend} V${cpu.y+d} H${cpu.x+d}"/><circle cx="${x+d}" cy="${y+d}" r="2"/>`;
    }).join('');
    return `<g class="trace-bundle" data-trace="${i}">${i===0?`<path d="M${x-20} ${y}V90H360V62M${x} ${y}V80H600V62M${x+20} ${y}V96H630V62"/>`:paths}</g>`;
  }).join('')+`<g class="board-etch"><path d="M30 76H120V126H260M32 82H114V132H254M32 88H108V138H248M970 100H921V152H868M970 107H928V159H875M970 114H935V166H882M43 405H220V380H300M43 412H226V387H306M43 419H232V394H312M570 427H710V404H968M570 434H717V411H968"/><rect x="36" y="354" width="72" height="22"/><path d="M44 358v14m7-14v14m7-14v14m7-14v14m7-14v14m7-14v14m7-14v14m7-14v14"/></g>`;
}
layout();window.addEventListener('resize',layout);
document.querySelector('.ambient-particles').innerHTML=Array.from({length:35},(_,i)=>`<i style="left:${(i*29.71+8)%96}%;top:${(i*17.93+13)%83+7}%;opacity:${.12+(i%4)*.09}"></i>`).join('');
$('energy-meter').innerHTML='<i></i>'.repeat(20);
const meterBars=[...$('energy-meter').children];

function announce(message){$('announcement').textContent=message;}
function setKeyboard(){
  if(inputMode!=='keyboard'&&engine.lockedIndex===null&&engine.activeIndex!==null)engine.leave(engine.activeIndex,performance.now());
  inputMode='keyboard';document.body.classList.add('keyboard-input');document.body.classList.remove('pointer-active');$('input-label').textContent='Keyboard input';
}
document.addEventListener('keydown',e=>{
  if(e.key==='Tab'){
    setKeyboard();
    if(engine.lockedIndex!==null&&!dialog.open){e.preventDefault();nodeButtons[engine.lockedIndex].focus({preventScroll:true});}
  }
  if(e.key==='Escape'&&!dialog.open){
    const released=engine.release(performance.now());
    if(released!==null){e.preventDefault();announce('Released early. Move away or press Tab to choose another chip.');lastRelease=performance.now();}
  }
});
document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  pointer={x:e.clientX,y:e.clientY};
  if(inputMode!=='pointer'){
    if(engine.lockedIndex===null&&engine.activeIndex!==null)engine.leave(engine.activeIndex,performance.now());
    inputMode='pointer';
    if(physicalNode!==null&&!dialog.open)engine.enter(physicalNode,performance.now());
  }
  document.body.classList.add('pointer-active');document.body.classList.remove('keyboard-input');$('input-label').textContent='Pointer input';
  const rect=garden.getBoundingClientRect();
  $('coord-x').textContent=String(Math.round(Math.max(0,Math.min(rect.width,e.clientX-rect.left)))).padStart(3,'0');
  $('coord-y').textContent=String(Math.round(Math.max(0,Math.min(rect.height,e.clientY-rect.top)))).padStart(3,'0');
});
document.documentElement.addEventListener('pointerleave',()=>{
  document.body.classList.remove('pointer-active');physicalNode=null;
  if(inputMode==='pointer'&&engine.activeIndex!==null)engine.leave(engine.activeIndex,performance.now());
});
document.addEventListener('focusin',e=>{
  if(engine.lockedIndex!==null&&!dialog.open&&inputMode==='keyboard'&&e.target!==nodeButtons[engine.lockedIndex]){
    suppressFocus=true;nodeButtons[engine.lockedIndex].focus({preventScroll:true});suppressFocus=false;
  }
});

function clearGarden(){
  engine.reset(performance.now());lastRelease=-Infinity;previousLock=null;previousActive=null;inspectedIndex=null;
  nodeButtons.forEach(b=>b.dataset.state='');
  announce('System reset. All seven modules are ready for input.');
}
$('reset-button').addEventListener('click',clearGarden);
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  if(!engine.setMode(button.dataset.mode,performance.now()))return;
  previousLock=null;previousActive=null;inspectedIndex=null;lastRelease=-Infinity;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const trap=engine.mode==='trap';
  $('mode-description').innerHTML=trap?'<strong>Thermal protection active.</strong> Load carries over between visits. Reach 100% and the system locks for 4 seconds.':'<strong>Unrestricted power.</strong> Keep a module powered for as long as you like. No lockout.';
  $('mode-label').textContent=trap?'LIMITS CREATE RHYTHM':'ATTENTION WITHOUT LIMITS';
  $('meter-end').textContent=trap?'CRITICAL / 100%':'CAPACITY / ∞';
  nodeButtons.forEach(b=>b.dataset.state='');
  announce(`${trap?'Overload Trap':'Infinite Capacity'} mode. Board and session counts reset. ${trap?'Disconnect to cool. Returning resumes the remaining load. At 100%, a 4-second lock begins.':'Chips never trap you.'}`);
}));

function openHelp(){
  helpReturnFocus=document.activeElement;
  if(engine.lockedIndex!==null)engine.release(performance.now());
  if(engine.activeIndex!==null)engine.leave(engine.activeIndex,performance.now());
  dialog.showModal();
}
$('help-button').addEventListener('click',openHelp);
$('close-help').addEventListener('click',()=>dialog.close());
$('start-button').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{helpReturnFocus?.focus({preventScroll:true});});
document.addEventListener('visibilitychange',()=>{
  hidden=document.hidden;
  if(hidden&&engine.activeIndex!==null&&engine.lockedIndex===null)engine.leave(engine.activeIndex,performance.now());
  if(!hidden)requestAnimationFrame(frame);
});
window.addEventListener('blur',()=>{
  if(engine.activeIndex!==null&&engine.lockedIndex===null)engine.leave(engine.activeIndex,performance.now());
  document.body.classList.remove('pointer-active');
});

function colorAt(amount){
  const stops=[[0,[113,234,216]],[.5,[193,165,242]],[.77,[252,163,118]],[1,[250,83,103]]];
  const index=stops.findIndex((s,i)=>i<stops.length-1&&amount<=stops[i+1][0]);
  const a=stops[Math.max(0,index)],b=stops[Math.min(3,Math.max(0,index)+1)];
  const t=Math.max(0,Math.min(1,(amount-a[0])/(b[0]-a[0])));
  return `rgb(${a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*t)).join(',')})`;
}

function frame(now){
  engine.tick(now);
  const locked=engine.lockedIndex;
  if(locked!==null&&previousLock===null){
    announce(`Chip ${pad(locked+1)} overloaded. Cursor and focus locked for 4 seconds. Press Escape to release early.`);
    suppressFocus=true;nodeButtons[locked].focus({preventScroll:true});suppressFocus=false;
  }
  if(locked===null&&previousLock!==null){
    lastRelease=now;
    announce('Released. The chip has cooled. Move away or press Tab to keep exploring.');
    if(inputMode==='pointer'&&physicalNode!==previousLock){
      engine.leave(previousLock,now);
      if(physicalNode!==null&&!dialog.open)engine.enter(physicalNode,now);
    }else if(inputMode==='touch'&&touchNode!==previousLock){engine.leave(previousLock,now);}
  }
  previousLock=locked;
  const active=engine.activeIndex;
  if(active!==null&&active!==previousActive&&locked===null)announce(`Chip ${pad(active+1)} absorbing. ${engine.mode==='trap'?'Residual load resumes. Disconnect to cool before 100%.':'Infinite capacity.'}`);
  previousActive=active;
  if(active!==null)inspectedIndex=active;
  const energy=inspectedIndex!==null?engine.nodes[inspectedIndex].energy:0;
  const cooling=active===null&&energy>0;
  const activeColor=locked!==null?'#fa5367':engine.mode==='infinite'?'#71ead8':colorAt(energy);
  engine.nodes.forEach((node,i)=>{
    const button=nodeButtons[i];
    button.className=`node ${node.state}${node.state==='idle'&&node.energy>0?' warm':''}`;
    button.style.setProperty('--energy',node.energy);
    const color=node.state==='overload'?'#fa5367':node.state==='absorbing'?(engine.mode==='infinite'?'#71ead8':colorAt(node.energy)):node.state==='released'?'#717581':node.energy>0?(engine.mode==='infinite'?'#71ead8':colorAt(node.energy)):plants[i].hue;
    button.style.setProperty('--node-color',color);
    const trace=document.querySelector(`[data-trace="${i}"]`);
    if(trace){trace.style.stroke=color;trace.style.opacity=node.state==='absorbing'||node.state==='overload'?'0.8':'0.24';}
    if(button.dataset.state!==node.state){
      button.dataset.state=node.state;
      button.setAttribute('aria-label',`Chip ${pad(i+1)}, ${node.state}. ${engine.mode==='trap'?'Load carries over and cools while away. Overload at 100%.':'Infinite capacity; no trap.'}`);
    }
  });
  garden.classList.toggle('trapped',locked!==null);
  cursor.classList.toggle('locked',locked!==null);
  if(locked!==null){
    const rect=nodeButtons[locked].getBoundingClientRect();cursor.style.left=`${rect.x+rect.width/2}px`;cursor.style.top=`${rect.y+rect.height/2}px`;
    cursor.querySelector('span').textContent=`LOCKED ${(engine.remaining(now)/1000).toFixed(1)}s`;
  }else{cursor.style.left=`${pointer.x}px`;cursor.style.top=`${pointer.y}px`;cursor.querySelector('span').textContent='';}
  const recent=now-lastRelease<2200;
  $('state-name').textContent=locked!==null?'Thermal lockout':active!==null?'Power flowing':cooling?'Cooling down':recent?'System recovered':'System standby';
  $('state-detail').textContent=locked!==null?`MODULE ${pad(locked+1)} / OVERLOAD`:active!==null?`MODULE ${pad(active+1)} / CONNECTED`:cooling?`MODULE ${pad(inspectedIndex+1)} / COOLING`:recent?'COOLDOWN COMPLETE':'SYSTEM IDLE';
  $('state-icon').style.color=energy>0?activeColor:recent?'#8f969d':'#75acb5';
  $('energy-percent').innerHTML=`${Math.round(energy*100)}<span>%</span>`;
  $('energy-meter').style.setProperty('--meter-color',activeColor);
  meterBars.forEach((bar,i)=>bar.classList.toggle('filled',i<Math.round(energy*20)));
  $('timer-label').textContent=locked!==null?'RELEASE IN':'DWELL TIME';
  $('dwell-value').innerHTML=`${((locked!==null?engine.remaining(now):engine.dwell(now))/1000).toFixed(2)}<span>s</span>`;
  $('dwell-value').style.color=locked!==null?'#fa606b':'';
  $('monitor-note').innerHTML=locked!==null?'Thermal limit exceeded.<br>Cooling cycle in progress.':engine.mode==='infinite'?'Continuous power enabled.<br>Thermal lockout is bypassed.':'Load resumes where you left it.<br>Disconnect to let it cool.';
  $('feed-count').textContent=pad(engine.stats.feeds);
  $('trap-count').textContent=pad(engine.stats.overloads);
  $('field-message').lastElementChild.textContent=locked!==null?`THERMAL LOCK / Release in ${(engine.remaining(now)/1000).toFixed(1)}s · Esc to let go`:active!==null?(engine.mode==='infinite'?'CONTINUOUS POWER / NO THERMAL LIMIT':energy>.7?'CRITICAL LOAD / DISCONNECT TO AVOID LOCKOUT':'POWER TRANSFER ACTIVE / MONITOR THE LOAD'):cooling?'RESIDUAL LOAD / COOLING WHILE DISCONNECTED':recent?'COOLDOWN COMPLETE / BUS RELEASED':'SYSTEM READY / HOVER OVER A MODULE';
  if(!hidden)requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

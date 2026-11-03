(() => {
  'use strict';

  const canvas = document.getElementById('pitch');
  const ctx = canvas.getContext('2d');
  const W = 900, H = 590;
  const corner = { x: 859, y: 63 };
  const spawn = { x: 465, y: 318 };
  const initialAim = { x: 365, y: 155 };
  const left = 40, right = 860, top = 64, bottom = 567;
  const ink = '#132d23', paper = '#fff6d6', orange = '#ff753c', ice = '#a8e8df';
  const pathKeys = new Set();
  const copy = {
    ready: ['Korner senin', 'Hedefe basıp bırak. Beklemek için basılı tut.'],
    corner: ['Ortanı aç', 'Sürükleyip bırak veya oklarla nişan alıp boşluğa bas.'],
    flight: ['Top havada', 'Düşüş noktasını izle. Birazdan oraya koşacaksın.'],
    review: ['Şimdi sıra forvette', 'WASD ile koşuya başla veya gideceğin yere dokun.'],
    run: ['Ortana yetiş', 'WASD ile koş, boşlukla vur. Telefonda dokunarak koş.'],
    shot: ['Tek vuruş!', 'Top kaleye gidiyor.'],
    goal: ['Gooool!', 'Asist de senin, gol de.'],
    miss: ['Top kaçtı', 'Düşüş noktasına koş, top alçalınca vur.']
  };
  let phase = 'ready', time = 0, goals = 0, attempts = 0;
  let aim = { ...initialAim }, runner = { ...spawn }, target = null;
  let record = null, shot = null, dragging = null, message = '', messageUntil = 0;
  let frameTime = null, lastSend = -1, stride = 0, moving = false, heldShotUntil = -1;
  let audioCtx = null, sound = false;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mix = (a, b, p) => a + (b - a) * p;
  const focus = () => canvas.focus({ preventScroll: true });

  function emit() {
    const [title, hint] = copy[phase];
    const detail = { phase, title, hint: time < messageUntil ? message : hint, time,
      kickTime: record?.kick ?? null, arrivalTime: record?.arrival ?? null, goals, attempts };
    document.dispatchEvent(new CustomEvent('pitchstate', { detail }));
    lastSend = time;
    return detail;
  }

  function setPhase(next, resetClock = false) {
    phase = next;
    if (resetClock) time = 0;
    messageUntil = 0;
    emit();
  }

  function setSound(on) {
    sound = Boolean(on);
    if (!sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx ||= new AC();
      audioCtx.resume().catch(() => {});
    } catch { /* Sound is optional. */ }
  }

  function tone(whistle = false) {
    if (!sound || !audioCtx || audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    const start = audioCtx.currentTime, end = start + (whistle ? 0.19 : 0.12);
    osc.type = whistle ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(whistle ? 1820 : 160, start);
    osc.frequency.exponentialRampToValueAtTime(whistle ? 2260 : 51, end);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(whistle ? 0.055 : 0.14, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start); osc.stop(end);
  }

  function start(recording = true) {
    record = null; shot = null; target = null; dragging = null;
    runner = { ...spawn }; aim = { ...initialAim }; moving = false;
    heldShotUntil = -1; pathKeys.clear();
    setPhase(recording ? 'corner' : 'ready', true); focus();
  }

  function playableAim(p) {
    return { x: clamp(p.x, 215, 695), y: clamp(p.y, 113, 362) };
  }

  // Store a timestamped ball track once. Both takes interpolate the same samples.
  function cross() {
    const flight = 0.46 + distance(corner, aim) / 900;
    const roll = 0.5;
    const samples = [];
    const duration = flight + roll;
    const count = Math.ceil(duration * 60);
    for (let i = 0; i <= count; i++) {
      const t = duration * i / count, p = Math.min(1, t / flight);
      const u = clamp((t - flight) / roll, 0, 1);
      const bend = Math.sin(Math.PI * p);
      samples.push({ t, x: mix(corner.x, aim.x, p) - 18 * bend - 24 * u,
        y: mix(corner.y, aim.y, p) + 22 * bend + 8 * u,
        z: p < 1 ? 57 * 4 * p * (1 - p) : 11 * Math.abs(Math.sin(2 * Math.PI * u)) * (1 - u) });
    }
    record = { aim: { ...aim }, kick: time, arrival: time + flight, duration, samples };
    tone(); setPhase('flight');
  }

  function ballAt(clock) {
    if (!record || clock <= record.kick) return { ...corner, z: 0 };
    const { samples, duration } = record;
    const index = clamp((clock - record.kick) / duration, 0, 1) * (samples.length - 1);
    const a = samples[Math.floor(index)], b = samples[Math.min(samples.length - 1, Math.floor(index) + 1)];
    const f = index - Math.floor(index);
    return { x: mix(a.x, b.x, f), y: mix(a.y, b.y, f), z: mix(a.z, b.z, f) };
  }

  function replay() {
    if (!record) return start();
    attempts++;
    runner = { ...spawn }; shot = null; target = null; moving = false;
    pathKeys.clear(); heldShotUntil = -1; dragging = null;
    setPhase('run', true); tone(true); focus();
  }

  function hittable(ball) {
    return time >= (record.kick + record.arrival) / 2 && ball.z <= 30 && distance(ball, runner) <= 44;
  }

  function shoot(ball) {
    const goalX = clamp(450 + (450 - runner.x) * 0.29, 395, 505);
    shot = { from: ball, goalX, at: time };
    moving = false; heldShotUntil = -1; tone(); setPhase('shot');
  }

  function tryShot() {
    const ball = ballAt(time);
    if (hittable(ball)) return shoot(ball);
    heldShotUntil = time + 0.22;
    message = time < record.kick || ball.z > 30 ? 'Biraz erken! Topun alçalmasını bekle.' : 'Topa biraz daha yaklaş!';
    messageUntil = time + 0.7; emit();
  }

  function act() {
    switch (phase) {
      case 'ready': start(); break;
      case 'corner': cross(); break;
      case 'review': case 'goal': case 'miss': replay(); break;
      case 'run': tryShot(); break;
    }
  }

  function position(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) return;
    focus();
    const p = position(e);
    // The first gesture both starts the clock and selects the cross.
    if (phase === 'ready') start();
    if (phase === 'review') replay();
    if (phase === 'corner') {
      dragging = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      aim = playableAim(p);
    } else if (phase === 'run') {
      const ball = ballAt(time);
      if (distance(p, ball) < 48 && distance(ball, runner) < 75 && time >= record.kick) tryShot();
      else target = { x: clamp(p.x, left + 10, right - 10), y: clamp(p.y, top + 10, bottom - 10) };
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (phase === 'corner' && e.pointerId === dragging) aim = playableAim(position(e));
  });
  canvas.addEventListener('pointerup', e => {
    if (e.pointerId !== dragging) return;
    dragging = null;
    if (phase === 'corner') { aim = playableAim(position(e)); cross(); }
  });
  canvas.addEventListener('pointercancel', () => { dragging = null; });

  const directions = {
    ArrowLeft: [-1,0], KeyA: [-1,0], ArrowRight: [1,0], KeyD: [1,0],
    ArrowUp: [0,-1], KeyW: [0,-1], ArrowDown: [0,1], KeyS: [0,1]
  };
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.target !== canvas && e.target !== document.body)) return;
    if (directions[e.code] && !e.repeat) {
      if (phase === 'ready') start();
      if (phase === 'review') replay();
    }
    if (directions[e.code] && (phase === 'corner' || phase === 'run')) {
      e.preventDefault(); target = null; pathKeys.add(e.code);
    } else if (e.code === 'KeyR' && !e.repeat && (phase === 'goal' || phase === 'miss')) {
      e.preventDefault(); start(false);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault(); if (!e.repeat) act();
    }
  });
  document.addEventListener('keyup', e => pathKeys.delete(e.code));
  function clearInput() { pathKeys.clear(); dragging = null; frameTime = null; }
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', clearInput);

  function update(dt) {
    if (!['corner','flight','run','shot'].includes(phase)) return;
    const prevTime = time;
    time += dt;
    let dx = 0, dy = 0;
    pathKeys.forEach(key => { dx += directions[key][0]; dy += directions[key][1]; });
    if (phase === 'corner') {
      const len = Math.hypot(dx, dy) || 1;
      aim = playableAim({ x: aim.x + dx / len * dt * 245, y: aim.y + dy / len * dt * 245 });
    } else if (phase === 'flight') {
      if (time >= record.kick + record.duration) setPhase('review');
    } else if (phase === 'run') {
      if (prevTime < record.kick && time >= record.kick) tone();
      if (target) { dx = target.x - runner.x; dy = target.y - runner.y; }
      const len = Math.hypot(dx, dy);
      moving = len > 0.05;
      if (moving) {
        const step = target ? Math.min(len, 165 * dt) : 165 * dt;
        runner.x = clamp(runner.x + dx / len * step, left + 10, right - 10);
        runner.y = clamp(runner.y + dy / len * step, top + 10, bottom - 10);
        stride += step * 0.13;
        if (target && len <= step) target = null;
      }
      if (time <= heldShotUntil && hittable(ballAt(time))) shoot(ballAt(time));
      else if (time >= record.kick + record.duration) { moving = false; setPhase('miss'); }
    } else if (phase === 'shot' && time >= shot.at + 0.5) {
      goals++; setPhase('goal');
    }
    if (time - lastSend >= 0.08) emit();
  }

  function line(x1, y1, x2, y2, color, width = 1, dash = []) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function ellipse(x, y, rx, ry, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function label(text, x, y, color, align = 'left', size = 12) {
    ctx.font = 'bold ' + size + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
  const turf = document.createElement('canvas');
  turf.width = W; turf.height = H;
  function paintTurf() {
    const g = turf.getContext('2d');
    g.fillStyle = '#193d30'; g.fillRect(0,0,W,H);
    g.fillStyle = '#244d3a'; g.fillRect(12,47,876,535);
    const bands = ['#306348','#35694d'];
    g.save(); g.beginPath(); g.rect(12,47,876,535); g.clip();
    for (let i = 0; i < 8; i++) {
      g.fillStyle = bands[i % 2]; g.fillRect(12,top - 15 + i*73,876,73);
    }
    let seed = 7143;
    function rand() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
    for (let i = 0; i < 15500; i++) {
      g.fillStyle = rand() > 0.5 ? 'rgba(254,250,191,.075)' : 'rgba(6,32,22,.11)';
      const x = rand() * W, y = rand() * H;
      g.fillRect(x,y,1+rand()*1.9,1+rand()*0.9);
    }
    g.restore();
    const chalk = '#c1d9ac';
    g.lineWidth = 2.4; g.strokeStyle = chalk;
    g.strokeRect(left,top,right-left,bottom-top);
    g.strokeRect(205,top,490,164); g.strokeRect(333,top,234,63);
    g.beginPath(); g.arc(450,176,79,Math.asin(52/79),Math.PI - Math.asin(52/79)); g.stroke();
    g.beginPath(); g.arc(450,bottom,82,Math.PI, Math.PI*2); g.stroke();
    for (const [x,y,r] of [[450,bottom,3.5],[450,176,3.5]]) {
      g.fillStyle = chalk; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
    g.beginPath(); g.arc(left,top,16,0,Math.PI/2); g.stroke();
    g.beginPath(); g.arc(right,top,16,Math.PI/2,Math.PI); g.stroke();
    // Recessed goal with knotted net and a bright front frame.
    g.fillStyle = '#102e23'; g.fillRect(376,31,148,32);
    g.save(); g.beginPath(); g.rect(377,31,146,32); g.clip();
    g.strokeStyle = '#668578'; g.lineWidth = 1;
    for(let i = 335; i < 551; i += 10) {
      g.beginPath(); g.moveTo(i,31); g.lineTo(i+27,64); g.stroke();
      g.beginPath(); g.moveTo(i,31); g.lineTo(i-27,64); g.stroke();
    }
    g.restore();
    g.lineWidth = 2; g.strokeStyle = '#b6cbbc'; g.strokeRect(376,31,148,32);
    g.lineWidth = 4; g.strokeStyle = '#f5f0d3';
    g.beginPath(); g.moveTo(372,65); g.lineTo(372,39); g.lineTo(528,39); g.lineTo(528,65); g.stroke();
    // Corner pennants sit just outside the touchline.
    for (const x of [left-1,right+1]) {
      g.strokeStyle = paper; g.lineWidth = 2; g.beginPath(); g.moveTo(x,64); g.lineTo(x,37); g.stroke();
      g.fillStyle = orange; g.beginPath(); g.moveTo(x,37); g.lineTo(x+14,42); g.lineTo(x,47); g.fill();
    }
  }
  paintTurf();

  function marker(p, live, pulse) {
    const color = live ? '#eff9ae' : '#b6d995';
    const r = 16 + Math.sin(pulse) * 2;
    ellipse(p.x,p.y,r+6,r+6,null,'rgba(221,245,162,.28)',1.4);
    ellipse(p.x,p.y,r,r,null,color,2.2);
    line(p.x-7,p.y,p.x+7,p.y,color,2); line(p.x,p.y-7,p.x,p.y+7,color,2);
  }
  function tag(text, x, y, color) {
    ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace';
    const w = ctx.measureText(text).width + 16;
    const startX = clamp(x - w/2,8,W-w-8);
    ctx.fillStyle = ink; ctx.fillRect(startX,y,w,21);
    label(text,startX+w/2,y+11,color,'center');
  }
  function player(p, color, number, walk, ghost, kickMotion = 0) {
    const foot = walk ? Math.sin(stride) * 4.4 : 0;
    ctx.save(); ctx.translate(p.x,p.y);
    if (ghost) ctx.globalAlpha = 0.82;
    ellipse(3,4,15,7,'rgba(10,30,19,.40)');
    line(-5,0,-7-foot-kickMotion,8+foot,ink,5);
    line(5,0,7+foot,8-foot,ink,5);
    // Sewn sleeves, shirt, number and head keep the two roles readable at phone size.
    ctx.fillStyle = color; ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6,-16); ctx.lineTo(-15,-12); ctx.lineTo(-12,-5);
    ctx.lineTo(-8,-7); ctx.lineTo(-8,2); ctx.lineTo(8,2); ctx.lineTo(8,-7);
    ctx.lineTo(12,-5); ctx.lineTo(15,-12); ctx.lineTo(6,-16); ctx.closePath(); ctx.fill(); ctx.stroke();
    label(number,0,-6,ink,'center',10);
    ellipse(0,-19,6.4,6.6,ghost ? '#dbf6df' : '#d6a174',ink,1.8);
    ctx.beginPath(); ctx.arc(0,-19,5.7,Math.PI,Math.PI*2); ctx.fillStyle = ink; ctx.fill();
    ctx.restore();
  }
  function ball(b) {
    const h = b.z || 0, scale = 1 + h/160;
    ellipse(b.x + 1,b.y+2,8+h/15,3+h/35,'rgba(10,29,20,.38)');
    const x = b.x, y = b.y-h-3;
    ellipse(x,y,6.7*scale,6.7*scale,paper,ink,1.7);
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
    ctx.rotate((corner.x-x)/22); ctx.fillStyle = ink; ctx.beginPath();
    for(let i=0;i<5;i++){ const a = i*2*Math.PI/5; const dx=Math.cos(a)*2.8, dy=Math.sin(a)*2.8;
      if(i===0) ctx.moveTo(dx,dy); else ctx.lineTo(dx,dy); }
    ctx.closePath(); ctx.fill(); ctx.fillRect(-1,4.5,2.4,1.6); ctx.fillRect(-5.8,-2,1.6,2.5); ctx.restore();
  }

  function draw(clock) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(rect.width*dpr), ph = Math.round(rect.height*dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    ctx.setTransform(pw / W, 0, 0, ph / H, 0, 0);
    ctx.drawImage(turf,0,0);
    const receiving = ['review','run','shot','goal','miss'].includes(phase);
    const preview = phase === 'ready' || phase === 'corner';
    const point = record?.aim ?? aim;
    if (preview || phase === 'review') {
      ctx.beginPath(); ctx.moveTo(corner.x,corner.y);
      ctx.quadraticCurveTo((corner.x+point.x)/2-28,(corner.y+point.y)/2-22,point.x,point.y);
      ctx.lineWidth=2.2; ctx.strokeStyle='rgba(244,247,202,.70)'; ctx.setLineDash([5,8]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (!['goal','shot'].includes(phase)) {
      marker(point,true,clock*3.1);
      if (preview || phase === 'review') tag(preview ? 'ORTA HEDEFİ' : 'DÜŞÜŞ NOKTASI',point.x,point.y+29,'#e0eda4');
    }
    if (phase === 'run' && target && distance(target,runner)>15) {
      line(runner.x,runner.y,target.x,target.y,'rgba(255,227,188,.55)',1.5,[3,6]);
      ellipse(target.x,target.y,5,5,null,orange,1.5);
    }
    const kickMotion = record && Math.abs(time - record.kick) < 0.22 ? 6 : 0;
    player({x:842,y:81},receiving?ice:orange,'7',false,receiving,kickMotion);
    if (preview || phase === 'review') tag(receiving?'GEÇMİŞ SEN':'SEN',815,101,receiving?ice:paper);
    if (receiving || phase === 'ready') {
      ctx.save(); if (phase === 'ready') ctx.globalAlpha = 0.65;
      if (phase === 'run') ellipse(runner.x,runner.y+3,19,7,null,orange,2);
      player(runner,phase === 'ready' ? ice : orange,'9',moving,false);
      if (phase === 'ready' || phase === 'review') tag(phase === 'ready'?'İKİNCİ TUR':'SEN',runner.x,runner.y+20,paper);
      ctx.restore();
    }
    let b;
    if (phase === 'review' || preview) b = { ...corner,z:0 };
    else if (shot) {
      const p = clamp((time-shot.at)/0.45,0,1);
      b = {x:mix(shot.from.x,shot.goalX,p),y:mix(shot.from.y,49,p),z:mix(shot.from.z,0,p)+22*Math.sin(p*Math.PI)};
    } else b = ballAt(time);
    if (phase === 'run' && hittable(b)) {
      ellipse(runner.x,runner.y,26,18,null,'#e8ff9d',2.8);
      tag('VUR!',runner.x,runner.y+22,'#e8ff9d');
    }
    ball(b);
    if (phase === 'goal' || phase === 'miss') {
      const goal = phase === 'goal';
      const text = goal ? 'G O L !' : 'TOP KAÇTI';
      ctx.fillStyle = ink; ctx.fillRect(343,407,214,58);
      ctx.fillStyle = goal ? '#d8f28e' : orange; ctx.fillRect(343,407,214,3);
      label(text,450,437,goal ? '#d8f28e' : paper,'center',27);
    }
  }

  function animate(now) {
    const dt = frameTime === null || document.hidden ? 0 : clamp((now-frameTime)/1000,0,0.08);
    frameTime = now;
    if (!document.hidden) {
      update(dt);
      draw(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : now/1000);
    }
    requestAnimationFrame(animate);
  }

  window.ArkaDirege = { start, act, retry: replay, replay, setSound, getState: emit };
  requestAnimationFrame(animate);
  emit();
})();

'use strict';
/* ===== UI, save data, missions, garage, input and main loop ===== */
const $ = id => document.getElementById(id);
const CARS = Game.CARS;
const UPG_COST = [150, 320, 560, 900, 1400];
const UPG_KEYS = ['nitro', 'handling', 'engine'];

/* ---------- save ---------- */
const Save = {
  d: null,
  def() { return { v: 1, coins: 0, bestOne: 0, bestTwo: 0, owned: [0], sel: 0, upg: { nitro: 0, handling: 0, engine: 0 }, stats: { runs: 0, dist: 0, near: 0 }, missions: [], completed: 0, lang: null, vol: 2, tut: false, two: true }; },
  load() {
    const base = this.def();
    try { const raw = Platform.getItem('tne_save_v1'); if (raw) { const o = JSON.parse(raw); Object.assign(base, o); base.upg = Object.assign(this.def().upg, o.upg || {}); base.stats = Object.assign(this.def().stats, o.stats || {}); } } catch (e) {}
    if (!Array.isArray(base.owned) || !base.owned.length) base.owned = [0];
    this.d = base;
  },
  save() { try { Platform.setItem('tne_save_v1', JSON.stringify(this.d)); } catch (e) {} }
};

/* ---------- missions ---------- */
const MDEF = {
  near:  { t: [10, 25, 50],      r: [80, 150, 300],  max: false },
  dist:  { t: [3000, 10000, 25000], r: [100, 200, 400], max: false },
  speed: { t: [180, 220, 260],   r: [100, 160, 250], max: true },
  onc:   { t: [500, 1500, 3000], r: [120, 220, 400], max: false },
  combo: { t: [5, 8, 12],        r: [100, 170, 300], max: true },
  coin:  { t: [30, 80, 150],     r: [80, 150, 280],  max: false }
};
const Missions = {
  fill() {
    const d = Save.d; d.missions = (d.missions || []).filter(m => MDEF[m.k]);
    while (d.missions.length < 3) {
      const used = d.missions.map(m => m.k), keys = Object.keys(MDEF).filter(k => !used.includes(k));
      const k = keys[Math.floor(Math.random() * keys.length)], maxT = Math.min(2, Math.floor((d.completed || 0) / 3));
      d.missions.push({ k, tier: Math.floor(Math.random() * (maxT + 1)), p: 0 });
    }
  },
  add(k, v) { this._upd(k, v, false); },
  max(k, v) { this._upd(k, v, true); },
  _upd(k, v, isMax) {
    if (!Save.d || Game.getHud().mode !== 'play') return;
    for (const m of Save.d.missions) {
      if (m.k !== k) continue;
      m.p = isMax ? Math.max(m.p, v) : m.p + v;
      const def = MDEF[k];
      if (m.p >= def.t[m.tier]) { this.complete(m); break; }
    }
  },
  complete(m) {
    const def = MDEF[m.k], d = Save.d, reward = def.r[m.tier];
    d.coins += reward; d.completed = (d.completed || 0) + 1;
    d.missions = d.missions.filter(x => x !== m); this.fill();
    toast('✔ ' + T('pop_mission') + '  +' + reward + ' 🪙'); Aud.sfx('mission'); Platform.happytime(); Save.save();
  },
  text(m) { return T('m_' + m.k, { n: MDEF[m.k].t[m.tier].toLocaleString() }); }
};
Game.hooks.mission = (k, v) => Missions.add(k, v);
Game.hooks.missionMax = (k, v) => Missions.max(k, v);

/* ---------- small helpers ---------- */
let toastT = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { $(id).classList.add('on'); }
function hide(id) { $(id).classList.remove('on'); }
function carOf(i) { return CARS[i] || CARS[0]; }
function loadout() { return { car: carOf(Save.d.sel), upg: Save.d.upg }; }
function bestOf(two) { return two ? Save.d.bestTwo : Save.d.bestOne; }

/* ---------- state ---------- */
let uiState = 'menu';      // menu | garage | missions | play | pause | over
let paused = false, lastRun = null, earned = 0, adDone = false, gIdx = 0, hintT = 0;

function refreshMenu() {
  $('m-coins').textContent = Save.d.coins.toLocaleString();
  $('m-best').textContent = bestOf(Save.d.two).toLocaleString() + ' m';
  $('mode-one').classList.toggle('active', !Save.d.two); $('mode-two').classList.toggle('active', Save.d.two);
  $('m-snd').textContent = ['🔇', '🔉', '🔊'][Save.d.vol];
  $('btn-mute').textContent = ['🔇', '🔉', '🔊'][Save.d.vol];
}
function goMenu() {
  Platform.gameplayStop(); paused = false; uiState = 'menu';
  ['garage', 'missions', 'pause', 'over'].forEach(hide); $('hud').classList.remove('on'); $('hint').classList.remove('on');
  const l = loadout(); Game.setLoadout(l.car, l.upg, Save.d.two); Game.setMode('menu', Save.d.two);
  Aud.engineStop(); Aud.musicStop(); refreshMenu(); show('menu');
}
function startRun() {
  if (Platform.adActive) return;
  Aud.init(); Aud.unlock(); Aud.setVol(Save.d.vol);
  const l = loadout(); Game.setLoadout(l.car, l.upg, Save.d.two); Game.start(Save.d.two);
  uiState = 'play'; paused = false; adDone = false;
  ['menu', 'garage', 'missions', 'pause', 'over'].forEach(hide); $('hud').classList.add('on');
  Aud.engineStart(); Aud.musicStart(); Platform.gameplayStart();
  if (!Save.d.tut) { showHint(); Save.d.tut = true; Save.save(); }
}
function showHint() {
  const touch = document.body.classList.contains('touch');
  $('hint').innerHTML = touch ? T('c_touch') : T('c_move') + '<br>' + T('c_nitro') + '<br>' + T('c_brake');
  $('hint').classList.add('on'); hintT = 7;
}
function setPaused(p) {
  if (uiState !== 'play' && uiState !== 'pause') return;
  if (p === paused || Platform.adActive) return;
  paused = p;
  if (p) { uiState = 'pause'; Platform.gameplayStop(); Aud.engineStop(); Aud.musicStop(); resetInput(); $('p-ctrl').innerHTML = T('c_move') + '<br>' + T('c_nitro') + '<br>' + T('c_brake') + '<br>' + T('c_pause'); show('pause'); }
  else { uiState = 'play'; hide('pause'); last = performance.now(); acc = 0; Aud.engineStart(); Aud.musicStart(); Platform.gameplayStart(); }
}
Game.hooks.event = (e) => {
  if (e === 'coin') Aud.sfx('coin');
  else if (e === 'near') { Aud.sfx('near'); if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) {} }
  else if (e === 'nitro') Aud.sfx('nitro');
  else if (e === 'scrape') Aud.sfx('scrape');
  else if (e === 'combo_lost') Aud.sfx('combo_lost');
  else if (e === 'crash') { Aud.sfx('crash'); Aud.engineStop(); Platform.gameplayStop(); if (navigator.vibrate) try { navigator.vibrate(120); } catch (x) {} onCrash(); }
  else if (e === 'gameover') showOver();
};
function onCrash() {
  const r = Game.getRun(), d = Save.d; lastRun = r;
  earned = r.coins + Math.floor(r.score / 250);
  d.coins += earned; d.stats.runs++; d.stats.dist += r.dist; d.stats.near += r.near;
  r.isBest = r.score > bestOf(r.twoWay);
  if (r.isBest) { if (r.twoWay) d.bestTwo = r.score; else d.bestOne = r.score; Platform.happytime(); }
  Save.save();
}
function showOver() {
  if (uiState !== 'play') return;
  uiState = 'over'; $('hud').classList.remove('on'); Aud.musicStop();
  const r = lastRun;
  $('o-score').textContent = r.score.toLocaleString(); $('o-dist').textContent = r.dist.toLocaleString() + ' m';
  $('o-best').textContent = bestOf(r.twoWay).toLocaleString(); $('o-coins').textContent = earned.toLocaleString();
  $('o-new').style.display = r.isBest ? 'block' : 'none';
  $('o-ad').classList.toggle('dis', false); $('o-ad').classList.remove('hide');
  show('over');
}
async function retry() {
  if (Platform.adActive) return;
  hide('over'); await Platform.midgame(); startRun();
}
async function doubleCoins() {
  if (adDone || Platform.adActive) return;
  const ok = await Platform.rewarded();
  if (ok) { adDone = true; Save.d.coins += earned; earned *= 2; $('o-coins').textContent = earned.toLocaleString(); $('o-ad').classList.add('dis'); Aud.sfx('buy'); Save.save(); }
  else toast(T('adfail'));
}

/* ---------- garage ---------- */
function drawGarageCar() {
  const c = $('gcar'), x = c.getContext('2d'), car = carOf(gIdx), sp = Sprites.SHAPES[car.shape];
  x.clearRect(0, 0, c.width, c.height);
  const g = x.createRadialGradient(150, 150, 10, 150, 150, 150); g.addColorStop(0, 'rgba(0,229,255,.28)'); g.addColorStop(1, 'rgba(0,229,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 300, 190);
  const img = Sprites.getCar(car.shape, car.color, 'rear', 0, car.opts, 256), w = 250, h = w * sp.aspect;
  x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(150, 168, w * 0.5, 12, 0, 0, 7); x.fill();
  x.drawImage(img, 150 - w / 2, 165 - h, w, h);
}
function renderGarage() {
  const d = Save.d, car = carOf(gIdx), owned = d.owned.includes(gIdx);
  $('g-coins').textContent = d.coins.toLocaleString(); $('g-name').textContent = car.name;
  $('g-price').textContent = owned ? '' : '🪙 ' + car.price.toLocaleString();
  $('st-speed').style.width = Math.round((car.top - 0.9) / 0.4 * 100) + '%';
  $('st-hand').style.width = Math.round((car.hand - 0.85) / 0.45 * 100) + '%';
  $('st-nit').style.width = Math.round((car.nit - 0.9) / 0.5 * 100) + '%';
  const b = $('g-act'); b.className = 'gbtn blue';
  if (d.sel === gIdx) { b.textContent = T('selected'); b.classList.add('dis'); }
  else if (owned) b.textContent = T('select');
  else { b.textContent = T('buy') + '  🪙 ' + car.price.toLocaleString(); b.className = 'gbtn amber'; if (d.coins < car.price) b.classList.add('dis'); }
  drawGarageCar();
  const u = $('g-upg'); u.innerHTML = '';
  const names = { nitro: T('u_nitro'), handling: T('u_handling'), engine: T('u_engine') };
  UPG_KEYS.forEach(k => {
    const lv = d.upg[k], row = document.createElement('div'); row.className = 'upg';
    let pips = ''; for (let i = 0; i < 5; i++) pips += '<u class="' + (i < lv ? 'on' : '') + '"></u>';
    const max = lv >= 5, cost = UPG_COST[lv] || 0;
    row.innerHTML = '<div class="nm">' + names[k] + '</div><div class="pips">' + pips + '</div>';
    const btn = document.createElement('button'); btn.className = 'ubtn' + (max ? ' max' : (d.coins < cost ? ' dis' : ''));
    btn.textContent = max ? T('maxed') : '🪙 ' + cost.toLocaleString();
    btn.onclick = () => { if (max || d.coins < cost) return; d.coins -= cost; d.upg[k]++; Save.save(); Aud.sfx('buy'); renderGarage(); };
    row.appendChild(btn); u.appendChild(row);
  });
}
function openGarage(from) {
  gIdx = Save.d.sel; renderGarage(); hide('menu'); hide('over'); show('garage'); uiState = 'garage'; $('garage').dataset.from = from || 'menu';
}
function closeGarage() {
  hide('garage'); const l = loadout(); Game.setLoadout(l.car, l.upg, Save.d.two);
  if ($('garage').dataset.from === 'over') { show('over'); uiState = 'over'; } else { refreshMenu(); show('menu'); uiState = 'menu'; }
}
function openMissions() { renderMissions(); hide('menu'); show('missions'); uiState = 'missions'; }
function renderMissions() {
  const l = $('ms-list'); l.innerHTML = '';
  Save.d.missions.forEach(m => {
    const def = MDEF[m.k], tgt = def.t[m.tier], pct = Math.min(100, Math.round(m.p / tgt * 100));
    const el = document.createElement('div'); el.className = 'mis';
    el.innerHTML = '<div class="t"><span>' + Missions.text(m) + '</span><b>+' + def.r[m.tier] + ' 🪙</b></div><div class="pb"><i style="width:' + pct + '%"></i></div>';
    l.appendChild(el);
  });
}

/* ---------- input ---------- */
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'brake', KeyS: 'brake', ArrowUp: 'nitro', KeyW: 'nitro', Space: 'nitro' };
function resetInput() { Game.inp.left = Game.inp.right = Game.inp.brake = Game.inp.nitro = false; document.querySelectorAll('.cbtn').forEach(b => b.classList.remove('active')); }
window.addEventListener('keydown', e => {
  Aud.init(); Aud.unlock();
  if (KEYMAP[e.code]) { e.preventDefault(); Game.inp[KEYMAP[e.code]] = true; }
  if (e.code === 'KeyP') { if (uiState === 'play' || uiState === 'pause') setPaused(!paused); }
  if ((e.code === 'Enter') && uiState === 'menu') startRun();
}, { passive: false });
window.addEventListener('keyup', e => { if (KEYMAP[e.code]) { e.preventDefault(); Game.inp[KEYMAP[e.code]] = false; } }, { passive: false });
function bindHold(id, key) {
  const el = $(id);
  const on = e => { e.preventDefault(); Aud.init(); Aud.unlock(); Game.inp[key] = true; el.classList.add('active'); try { el.setPointerCapture(e.pointerId); } catch (x) {} };
  const off = e => { e.preventDefault(); Game.inp[key] = false; el.classList.remove('active'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
bindHold('b-left', 'left'); bindHold('b-right', 'right'); bindHold('b-brake', 'brake'); bindHold('b-nitro', 'nitro');
if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
document.addEventListener('contextmenu', e => e.preventDefault());
['touchend', 'pointerup', 'click'].forEach(ev => document.addEventListener(ev, () => Aud.unlock(), { passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (uiState === 'play') setPaused(true); Save.save(); } });
window.addEventListener('blur', () => { resetInput(); });

/* ---------- buttons ---------- */
function cycleVol() { const v = (Save.d.vol + 2) % 3; Save.d.vol = v; Aud.init(); Aud.setVol(v); if (v > 0 && uiState === 'play') Aud.engineStart(); refreshMenu(); Save.save(); }
$('b-play').onclick = () => { Aud.init(); Aud.sfx('click'); startRun(); };
$('b-garage').onclick = () => { Aud.init(); Aud.sfx('click'); openGarage('menu'); };
$('b-missions').onclick = () => { Aud.init(); Aud.sfx('click'); openMissions(); };
$('mode-one').onclick = () => { Save.d.two = false; refreshMenu(); const l = loadout(); Game.setMode('menu', false); Save.save(); };
$('mode-two').onclick = () => { Save.d.two = true; refreshMenu(); Game.setMode('menu', true); Save.save(); };
$('m-snd').onclick = cycleVol; $('btn-mute').onclick = cycleVol;
document.querySelectorAll('.lang-btn').forEach(b => b.onclick = () => { LANG = b.dataset.l; Save.d.lang = LANG; applyLang(); Save.save(); refreshMenu(); });
$('btn-pause').onclick = () => setPaused(true);
$('p-resume').onclick = () => setPaused(false);
$('p-restart').onclick = async () => { if (Platform.adActive) return; hide('pause'); paused = false; await Platform.midgame(); startRun(); };
$('p-menu').onclick = () => { goMenu(); };
$('o-retry').onclick = retry;
$('o-ad').onclick = doubleCoins;
$('o-menu').onclick = () => { goMenu(); };
$('o-garage').onclick = () => openGarage('over');
$('g-back').onclick = closeGarage; $('ms-back').onclick = () => { hide('missions'); refreshMenu(); show('menu'); uiState = 'menu'; };
$('g-prev').onclick = () => { gIdx = (gIdx + CARS.length - 1) % CARS.length; renderGarage(); };
$('g-next').onclick = () => { gIdx = (gIdx + 1) % CARS.length; renderGarage(); };
$('g-act').onclick = () => {
  const d = Save.d, car = carOf(gIdx);
  if (d.owned.includes(gIdx)) { d.sel = gIdx; Aud.sfx('click'); }
  else if (d.coins >= car.price) { d.coins -= car.price; d.owned.push(gIdx); d.sel = gIdx; Aud.sfx('buy'); }
  Save.save(); renderGarage();
};

/* ---------- canvas sizing + main loop ---------- */
const canvas = $('c');
function resizeAll() {
  const w = window.innerWidth, h = window.innerHeight;
  let d = Math.min(window.devicePixelRatio || 1, 2);
  const px = w * h * d * d; if (px > 2300000) d = Math.max(1, Math.sqrt(2300000 / (w * h)));
  Game.resize(w, h, d);
}
window.addEventListener('resize', resizeAll); window.addEventListener('orientationchange', () => setTimeout(resizeAll, 150));

const STEP = 1 / 60; let last = 0, acc = 0, hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud() {
  const h = Game.getHud();
  setTxt('h-score', h.score.toLocaleString()); setTxt('h-dist', h.dist.toLocaleString()); setTxt('h-speed', String(h.kmh)); setTxt('h-coins', (Save.d.coins + h.runCoins).toLocaleString());
  $('nfill').style.width = h.nitro.toFixed(0) + '%'; $('nfill').classList.toggle('low', h.nitro < 20);
  const cb = $('combo'); cb.style.opacity = h.combo > 1 ? '1' : '0'; setTxt('h-combo', 'x' + h.combo); $('cfill').style.width = (h.comboPct * 100).toFixed(0) + '%';
}
function loop(now) {
  requestAnimationFrame(loop);
  if (Platform.adActive || paused) { last = now; return; }
  let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = STEP; acc += dt;
  let n = 0; while (acc >= STEP && n < 3) { Game.update(STEP); acc -= STEP; n++; } if (acc > STEP * 3) acc = 0;
  Game.render();
  if (uiState === 'play') {
    updateHud();
    Aud.engineSet(Game.getSpeedPct(), Game.isNitro());
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.remove('on'); }
  }
}

/* ---------- boot ---------- */
async function boot() {
  Platform.loadingStart();
  Game.init(canvas); resizeAll();
  applyLang();
  await Platform.init();
  Save.load(); Missions.fill();
  const saved = Save.d.lang, loc = (Platform.locale() || navigator.language || 'en').slice(0, 2).toLowerCase();
  LANG = (saved && I18N[saved]) ? saved : (I18N[loc] ? loc : 'en');
  applyLang();
  Aud.setVol(Save.d.vol);
  goMenu();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  Platform.loadingStop();
}
boot();

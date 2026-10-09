'use strict';
/* ===== Pseudo-3D road engine + traffic + gameplay (rear chase camera) ===== */
const Game = (function () {
  const SEG = 200, ROAD = 900, RUMBLE = 3, LANES = 4, CAMH = 800, DRAW = 240, FOV = 100, FOG = 3.2;
  const CAMD = 1 / Math.tan(FOV / 2 * Math.PI / 180), PZ = CAMH * CAMD;
  const BASE_MAX = 12000, KMH = 200 / 12000, MPU = 1 / 240, WALL = 1.13, PW = 0.28, PLEN = 380;
  const LANE_C = [-0.75, -0.25, 0.25, 0.75];
  const NEAR_GAP = 0.16;

  const CARS = [
    { id: 0, name: 'STREET',  shape: 'sedan', color: '#00e5ff', opts: {},            price: 0,    top: 1.00, acc: 1.00, hand: 1.00, nit: 1.00 },
    { id: 1, name: 'RALLY',   shape: 'sedan', color: '#f57f42', opts: { stripes: 1 }, price: 900,  top: 1.05, acc: 1.10, hand: 1.10, nit: 1.00 },
    { id: 2, name: 'MUSCLE',  shape: 'sport', color: '#e0463c', opts: { stripes: 1 }, price: 2200, top: 1.12, acc: 1.15, hand: 0.95, nit: 1.10 },
    { id: 3, name: 'PHANTOM', shape: 'sport', color: '#7a5cff', opts: {},            price: 4800, top: 1.18, acc: 1.20, hand: 1.15, nit: 1.15 },
    { id: 4, name: 'HYPER',   shape: 'sport', color: '#c6ff3d', opts: { stripes: 1 }, price: 9500, top: 1.26, acc: 1.30, hand: 1.25, nit: 1.30 }
  ];

  /* ---- day/night palettes ---- */
  const PAL_KEYS = ['skyTop', 'skyBot', 'fog', 'grassA', 'grassB', 'roadA', 'roadB', 'rumbleA', 'rumbleB', 'lane', 'mt1', 'mt2'];
  const PALS = [
    { skyTop: '#3f9bff', skyBot: '#cfeaff', fog: '#cfeaff', grassA: '#3aa655', grassB: '#339a4c', roadA: '#4b4e5a', roadB: '#464955', rumbleA: '#e9e9e9', rumbleB: '#c0392b', lane: '#ffffff', mt1: '#9fc2e6', mt2: '#6fa3a0', dark: 0 },
    { skyTop: '#2e2a66', skyBot: '#ff9a57', fog: '#e0905e', grassA: '#2e6b3d', grassB: '#296036', roadA: '#403b46', roadB: '#3b3641', rumbleA: '#d8d0cc', rumbleB: '#a33328', lane: '#f1e3d3', mt1: '#7a5a7e', mt2: '#4c4466', dark: 0.35 },
    { skyTop: '#03050f', skyBot: '#14203f', fog: '#0c1328', grassA: '#0f2a1c', grassB: '#0c2418', roadA: '#222530', roadB: '#1d202a', rumbleA: '#808590', rumbleB: '#5d2a26', lane: '#cfd6e8', mt1: '#17213d', mt2: '#101830', dark: 1 },
    { skyTop: '#27427f', skyBot: '#ff9fb0', fog: '#c88fa6', grassA: '#2c6240', grassB: '#275a39', roadA: '#3d3c49', roadB: '#383744', rumbleA: '#cfc7cc', rumbleB: '#9a3a3a', lane: '#ece0e6', mt1: '#6d6290', mt2: '#473f66', dark: 0.4 }
  ];
  function h2r(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  PALS.forEach(p => PAL_KEYS.forEach(k => { p['_' + k] = h2r(p[k]); }));
  const pal = { dark: 0 }; PAL_KEYS.forEach(k => pal[k] = '#000');
  function updatePalette(ph) {
    const i = Math.floor(ph) % 4, t = ph - Math.floor(ph), a = PALS[i], b = PALS[(i + 1) % 4];
    PAL_KEYS.forEach(k => { const x = a['_' + k], y = b['_' + k]; pal[k] = 'rgb(' + ((x[0] + (y[0] - x[0]) * t) | 0) + ',' + ((x[1] + (y[1] - x[1]) * t) | 0) + ',' + ((x[2] + (y[2] - x[2]) * t) | 0) + ')'; });
    pal.dark = a.dark + (b.dark - a.dark) * t;
  }

  /* ---- state ---- */
  let cv, ctx, W = 800, H = 600, dpr = 1, HY = 240;
  let segs = [], trackLen = 0;
  const hooks = { event() {}, mission() {}, missionMax() {} };
  const inp = { left: false, right: false, brake: false, nitro: false };
  const debug = { god: false };
  let mode = 'menu';
  let twoWay = true, carDef = CARS[0], upg = { nitro: 0, handling: 0, engine: 0 };
  let position = 0, travelled = 0, playerX = 0.25, speed = 0, steer = 0, nitro = 60, nitroOn = false, wasNitro = false;
  let scoreDist = 0, bonus = 0, combo = 1, comboT = 0, runCoins = 0, nearCnt = 0, maxKmh = 0, oncDist = 0;
  let crashed = false, crashT = 0, crashSpin = 0, gameOverSent = false, shake = 0, time = 0, wallT = 0;
  let objs = [], particles = [], popups = [];
  let trafficT = 0, coinT = 3, sky1 = 0, sky2 = 0, phaseOff = 0;
  const stars = []; for (let i = 0; i < 70; i++) stars.push({ x: Math.random(), y: Math.random() * 0.9, s: Math.random() * 1.4 + 0.4, a: Math.random() * 6 });
  const mt = [[], []];
  (function () { for (let l = 0; l < 2; l++) { const n = 48, p = [Math.random() * 6, Math.random() * 6, Math.random() * 6]; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; mt[l].push(0.5 + 0.25 * Math.sin(a * 2 + p[0]) + 0.15 * Math.sin(a * 5 + p[1]) + 0.1 * Math.sin(a * 11 + p[2])); } } })();

  /* ---- helpers ---- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inc = (s, d, m) => { let r = s + d; while (r >= m) r -= m; while (r < 0) r += m; return r; };
  const wrap = d => { d = ((d % trackLen) + trackLen) % trackLen; return d > trackLen / 2 ? d - trackLen : d; };
  const pctRem = (n, t) => (n % t) / t;
  const findSeg = z => segs[Math.floor(z / SEG) % segs.length];
  const posAbs = () => (position + PZ) % trackLen;

  /* ---- track ---- */
  function lastY() { return segs.length ? segs[segs.length - 1].p2.world.y : 0; }
  function addSeg(curve, y) {
    const n = segs.length;
    segs.push({ index: n, p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} }, p2: { world: { y: y, z: (n + 1) * SEG }, camera: {}, screen: {} }, curve, sprites: [], objs: [], light: Math.floor(n / RUMBLE) % 2 === 0 });
  }
  const easeIO = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);
  const easeI = (a, b, p) => a + (b - a) * p * p;
  function addRoad(enter, hold, leave, curve, y) {
    const sy = lastY(), ey = sy + y * SEG, tot = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSeg(easeI(0, curve, n / enter), easeIO(sy, ey, n / tot));
    for (let n = 0; n < hold; n++) addSeg(curve, easeIO(sy, ey, (enter + n) / tot));
    for (let n = 0; n < leave; n++) addSeg(easeIO(curve, 0, n / leave), easeIO(sy, ey, (enter + hold + n) / tot));
  }
  function buildTrack() {
    segs = [];
    addRoad(30, 40, 30, 0, 0);
    while (segs.length < 3400) {
      const enter = 15 + (Math.random() * 25 | 0), hold = 20 + (Math.random() * 50 | 0), leave = 15 + (Math.random() * 25 | 0);
      let curve = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 1.3); if (Math.random() < 0.3) curve = 0;
      const ly = lastY(); let y = (ly > 5000 ? -1 : ly < -2500 ? 1 : (Math.random() < 0.5 ? -1 : 1)) * Math.random() * 28; if (Math.random() < 0.3) y = 0;
      addRoad(enter, hold, leave, curve, y);
    }
    addRoad(45, 45, 45, 0, -lastY() / SEG);
    trackLen = segs.length * SEG;
    const SC = Sprites.SCEN;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i], region = Math.floor(i / 260) % 3;
      if (i % 5 === 0) for (const side of [-1, 1]) {
        const r = Math.random(); let kind, extra;
        if (region === 0) { kind = r < 0.55 ? 'pine' : r < 0.8 ? 'bush' : 'rock'; extra = Math.random() * 3.5; }
        else if (region === 1) { kind = r < 0.4 ? 'bld1' : r < 0.7 ? 'bld2' : r < 0.85 ? 'board' : 'tree'; extra = 0.3 + Math.random() * 1.5; }
        else { kind = r < 0.5 ? 'tree' : r < 0.78 ? 'bush' : 'sign'; extra = Math.random() * 3; }
        const w = SC[kind].w; seg.sprites.push({ kind, offset: side * (SC[kind].a === 'e' ? 1.25 + extra : 1.25 + w / 2 + extra) });
      }
      if (i % 12 === 0) for (const side of [-1, 1]) seg.sprites.push({ kind: 'lamp', offset: side * 1.62 });
    }
  }

  /* ---- projection ---- */
  function project(p, camX, camY, camZ) {
    p.camera.x = -camX; p.camera.y = p.world.y - camY; p.camera.z = p.world.z - camZ;
    p.screen.scale = CAMD / p.camera.z;
    p.screen.x = Math.round(W / 2 + p.screen.scale * (p.camera.x) * W / 2);
    p.screen.y = Math.round(HY - p.screen.scale * p.camera.y * H / 2);
    p.screen.w = Math.round(p.screen.scale * ROAD * W / 2);
  }

  /* ---- run setup ---- */
  function resetRun() {
    position = 0; travelled = 0; playerX = twoWay ? 0.25 : 0.25; speed = 2500; steer = 0; nitro = 60; nitroOn = false; wasNitro = false;
    scoreDist = 0; bonus = 0; combo = 1; comboT = 0; runCoins = 0; nearCnt = 0; maxKmh = 0; oncDist = 0;
    crashed = false; crashT = 0; crashSpin = 0; gameOverSent = false; shake = 0; wallT = 0;
    objs.length = 0; particles.length = 0; popups.length = 0;
    for (const s of segs) s.objs.length = 0;
    trafficT = 0.6; coinT = 3; phaseOff = 0;
  }
  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); buildTrack(); resetRun(); mode = 'menu'; }
  function resize(w, h, d) {
    dpr = d; W = Math.round(w * d); H = Math.round(h * d); cv.width = W; cv.height = H; HY = Math.round(H * (H > W * 1.2 ? 0.35 : 0.4));
  }
  function start(two) { twoWay = two; mode = 'play'; resetRun(); }
  function setMode(m, two) { mode = m; if (m === 'menu') { if (two !== undefined) twoWay = two; resetRun(); speed = 4500; } }
  function setLoadout(car, u, two) { carDef = car; upg = u; if (two !== undefined) twoWay = two; }

  /* ---- traffic ---- */
  const TCOL = ['#e0463c', '#3fa9f5', '#f5c542', '#8e6bd8', '#4caf6a', '#f57f42', '#e8e8e8', '#2b2b30', '#c0c4cc'];
  const BCOL = ['#f5b400', '#3fa9f5', '#e8e8e8', '#c0392b'], KCOL = ['#e6e6e6', '#c62828', '#2e5eaa', '#f5f5f5', '#2e7d32'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function addObj(o) { o.seg = findSeg(o.z); o.seg.objs.push(o); objs.push(o); }
  function delObj(o) { const i = o.seg.objs.indexOf(o); if (i >= 0) o.seg.objs.splice(i, 1); const j = objs.indexOf(o); if (j >= 0) objs.splice(j, 1); }
  function spawnTraffic(d) {
    const lane = Math.floor(Math.random() * 4), onc = twoWay && lane < 2;
    const r = Math.random(); let shape = 'sedan', col = pick(TCOL), o = {}, fast = false;
    if (r < 0.46) shape = 'sedan'; else if (r < 0.58) { shape = 'sedan'; col = '#f5c542'; o = { taxi: 1 }; }
    else if (r < 0.70) { shape = 'van'; col = pick(TCOL); } else if (r < 0.79) { shape = 'bus'; col = pick(BCOL); }
    else if (r < 0.88) { shape = 'truck'; col = pick(KCOL); } else { shape = 'sport'; col = pick(['#ff2d95', '#00e5ff', '#ffb000', '#ffffff']); o = { stripes: 1 }; fast = !onc; }
    const sp = Sprites.SHAPES[shape];
    const z = (posAbs() + DRAW * SEG * 0.93 + Math.random() * 1500) % trackLen;
    for (const c of objs) if (c.kind === 'car' && c.lane === lane && Math.abs(wrap(c.z - z)) < 3500) return;
    const slow = shape === 'bus' || shape === 'truck';
    let base;
    if (onc) base = -((slow ? 2600 : 3300) + Math.random() * 3000);
    else base = fast ? 8000 + Math.random() * 1800 : (slow ? 2200 : 2800) + Math.random() * 3200;
    const crazy = Math.random() < 0.08 + 0.3 * d && !slow;
    addObj({ kind: 'car', shape, color: col, opts: o, lane, offset: LANE_C[lane], dir: onc ? -1 : 1, base, speed: base, w: sp.w, len: sp.len, z, rel: 0,
      crazy, state: 'ok', timer: 1.5 + Math.random() * 3, target: lane, from: 0, t: 0, signal: 0, near: false, minGap: 9, credited: false });
  }
  function spawnCoins() {
    const lane = Math.floor(Math.random() * 4), z0 = posAbs() + DRAW * SEG * 0.9, n = 5 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) addObj({ kind: 'coin', z: (z0 + i * 900) % trackLen, offset: LANE_C[lane], collected: false, rel: 0 });
  }
  function laneFree(o, lane, range) {
    for (const c of objs) if (c !== o && c.kind === 'car' && (c.lane === lane || c.target === lane) && Math.abs(wrap(c.z - o.z)) < range) return false;
    return true;
  }
  function updateObjs(dt) {
    const pa = posAbs(), play = mode === 'play' && !crashed, dif = difficulty();
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (o.kind === 'coin') {
        o.rel = wrap(o.z - pa);
        if (play && !o.collected && Math.abs(o.rel) < 420 && Math.abs(o.offset - playerX) < 0.22) {
          o.collected = true; runCoins++; nitro = Math.min(nitroMax(), nitro + 3);
          hooks.event('coin'); hooks.mission('coin', 1);
        }
        if (o.collected || o.rel < -3500) delObj(o);
        continue;
      }
      let desired = o.base;
      for (const q of objs) {
        if (q === o || q.kind !== 'car' || q.dir !== o.dir || Math.abs(q.offset - o.offset) > 0.34) continue;
        const gap = wrap(q.z - o.z) * o.dir, need = (o.len + q.len) / 2;
        if (gap > 0 && gap < need + 900) { desired = o.dir * Math.min(Math.abs(desired), Math.abs(q.speed)); if (gap < need + 250) desired = o.dir * Math.max(0, Math.abs(q.speed) - 700); }
      }
      if (o.dir > 0 && o.rel < 0 && o.rel > -3000 && Math.abs(o.offset - playerX) < 0.5) desired = Math.min(desired, Math.max(0, speed * 0.96));
      o.speed += (desired - o.speed) * Math.min(1, dt * 2.5);
      o.z = inc(o.z, o.speed * dt, trackLen);
      /* lane changes (only the "crazy" drivers) */
      if (o.crazy) {
        if (o.state === 'ok') {
          o.timer -= dt;
          if (o.timer <= 0) {
            o.timer = 2 + Math.random() * 3;
            const grp = !twoWay ? [0, 1, 2, 3] : (o.dir < 0 ? [0, 1] : [2, 3]);
            const opts = grp.filter(l => Math.abs(l - o.lane) === 1);
            if (opts.length) { const tl = pick(opts); if (laneFree(o, tl, 2600)) { o.target = tl; o.state = 'signal'; o.t = 0.7; o.signal = tl > o.lane ? 1 : -1; } }
          }
        } else if (o.state === 'signal') {
          o.t -= dt; if (o.t <= 0) { o.state = 'change'; o.t = 0; o.from = o.offset; o.lane = o.target; }
        } else if (o.state === 'change') {
          o.t += dt / 0.9; const k = Math.min(1, o.t); o.offset = lerp(o.from, LANE_C[o.target], k * k * (3 - 2 * k));
          if (k >= 1) { o.state = 'ok'; o.signal = 0; o.offset = LANE_C[o.target]; }
        }
      }
      o.rel = wrap(o.z - pa);
      const ns = findSeg(o.z); if (ns !== o.seg) { const j = o.seg.objs.indexOf(o); if (j >= 0) o.seg.objs.splice(j, 1); ns.objs.push(o); o.seg = ns; }
      if (o.rel < -7000 || o.rel > DRAW * SEG * 1.06) { delObj(o); continue; }
      if (play) {
        const lat = Math.abs(o.offset - playerX) - (o.w + PW) / 2, zone = (o.len + PLEN) / 2;
        if (Math.abs(o.rel) < zone * 0.9 && lat < -(o.w + PW) / 2 * 0.12 + 0.0 && !debug.god) { doCrash(); }
        if (!o.credited) {
          if (Math.abs(o.rel) < zone + 300) { o.near = true; o.minGap = Math.min(o.minGap, lat); }
          else if (o.near) {
            o.credited = true;
            if (o.minGap > -0.02 && o.minGap < NEAR_GAP && speed * KMH > 70) nearMiss(o);
          }
        }
      }
    }
  }
  function nitroMax() { return 100; }
  function difficulty() { return Math.min(1, travelled * MPU / 7000); }
  function nearMiss(o) {
    const onc = o.dir < 0, mult = onc ? 2 : 1;
    const pts = Math.round(60 * combo * mult);
    bonus += pts; combo = Math.min(30, combo + 1); comboT = 3.4; nearCnt++;
    nitro = Math.min(nitroMax(), nitro + 9);
    popup((onc ? T('pop_onc') + ' ' : '') + T('pop_near') + ' +' + pts, '#00e5ff');
    hooks.event('near'); hooks.mission('near', 1); hooks.missionMax('combo', combo);
  }
  function popup(text, col) { popups.push({ text, col, life: 1.2, y: 0, x: (Math.random() - 0.5) * 0.3 }); if (popups.length > 5) popups.shift(); }

  function doCrash() {
    if (crashed) return;
    crashed = true; crashT = 0; shake = 22; combo = 1; comboT = 0;
    burst(W / 2, H * 0.84, 60, ['#ff6a3c', '#ffd23c', '#ffffff', '#444']);
    hooks.event('crash');
  }
  function burst(x, y, n, cols) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 9) * dpr; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4 * dpr, life: 1, col: pick(cols), size: (2 + Math.random() * 5) * dpr, g: 0.25 * dpr }); }
  }

  /* ---- main update (fixed step) ---- */
  function update(dt) {
    time += dt;
    const play = mode === 'play';
    const seg = findSeg(position + PZ);
    const maxSp = BASE_MAX * carDef.top * (1 + 0.05 * upg.engine), sp = speed / BASE_MAX;
    steer += (((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * (crashed || !play ? 0 : 1) - steer) * Math.min(1, dt * 10);
    const hand = carDef.hand * (1 + 0.06 * upg.handling);
    if (!crashed) {
      if (play) playerX += steer * dt * 2.4 * hand * (0.35 + 0.65 * Math.min(1, sp));
      playerX -= dt * 2 * sp * sp * seg.curve * 0.13;
    }
    if (!play) { playerX += (0.25 - playerX) * Math.min(1, dt * 2); }
    /* nitro + speed */
    nitroOn = play && !crashed && inp.nitro && nitro > 1;
    if (nitroOn) { nitro = Math.max(0, nitro - 28 * (1 - 0.08 * upg.nitro) / carDef.nit * dt); if (!wasNitro) hooks.event('nitro'); }
    else nitro = Math.min(nitroMax(), nitro + 2.5 * dt);
    wasNitro = nitroOn;
    let tgt = play ? (nitroOn ? maxSp * 1.32 : maxSp) : 4500;
    if (crashed) tgt = 0;
    if (inp.brake && play && !crashed) speed = Math.max(0, speed - 15000 * dt);
    else if (speed < tgt) speed = Math.min(tgt, speed + (nitroOn ? 14000 : 5500 * carDef.acc) * dt);
    else speed = Math.max(tgt, speed - (crashed ? 18000 : 3500) * dt);
    /* walls */
    if (play && !crashed && Math.abs(playerX) > WALL) {
      playerX = clamp(playerX, -WALL, WALL); speed = Math.max(0, speed - 7000 * dt); shake = Math.max(shake, 3);
      wallT -= dt; if (wallT <= 0) { wallT = 0.12; hooks.event('scrape'); }
      burst(W / 2 + (playerX > 0 ? 1 : -1) * W * 0.14, H * 0.86, 2, ['#ffd23c', '#ff9f1c']);
    }
    /* movement */
    const adv = speed * dt; position = inc(position, adv, trackLen); travelled += adv;
    if (play && !crashed) {
      const m = adv * MPU, onc = twoWay && playerX < 0;
      scoreDist += m * (onc ? 2 : 1);
      hooks.mission('dist', m);
      if (onc && speed > 3000) { hooks.mission('onc', m); }
      const kmh = speed * KMH; if (kmh > maxKmh) maxKmh = kmh; hooks.missionMax('speed', kmh);
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) { if (combo > 2) { popup(T('pop_combo'), '#ff6a6a'); hooks.event('combo_lost'); } combo = 1; } }
    }
    /* spawning */
    if (play ? true : true) {
      const dif = play ? difficulty() : 0.05;
      trafficT -= dt;
      if (trafficT <= 0) { spawnTraffic(dif); if (play && Math.random() < 0.25 + dif * 0.5) spawnTraffic(dif); trafficT = (play ? Math.max(0.3, 0.85 - dif * 0.5) : 1.8) * (0.7 + Math.random() * 0.6); }
      coinT -= dt; if (coinT <= 0) { if (play) spawnCoins(); coinT = 4 + Math.random() * 4; }
    }
    updateObjs(dt);
    /* crash sequence */
    if (crashed) {
      crashT += dt; crashSpin += dt * 9; 
      if (crashT > 1.5 && !gameOverSent) { gameOverSent = true; hooks.event('gameover'); }
    }
    shake *= 0.9; if (shake < 0.2) shake = 0;
    /* particles & popups */
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= dt * 1.4; if (p.life <= 0) particles.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { const p = popups[i]; p.life -= dt; p.y -= dt * 40 * dpr; if (p.life <= 0) popups.splice(i, 1); }
    /* parallax */
    sky1 += seg.curve * sp * dt * 60 * dpr * 0.5; sky2 += seg.curve * sp * dt * 60 * dpr * 1.2;
    if (speed > 8000 && nitroOn) shake = Math.max(shake, 1.2);
    if (play && !crashed && speed > 1500 && Math.random() < 0.5 && nitroOn) burst(W / 2 + (Math.random() - 0.5) * W * 0.2, H * 0.9, 1, ['#00e5ff', '#9ffcff']);
  }

  /* ---- rendering ---- */
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
  function drawSegment(seg) {
    const p1 = seg.p1.screen, p2 = seg.p2.screen, light = seg.light;
    const r1 = p1.w / Math.max(6, 2 * LANES), r2 = p2.w / Math.max(6, 2 * LANES);
    ctx.fillStyle = light ? pal.grassA : pal.grassB; ctx.fillRect(0, p2.y, W, p1.y - p2.y);
    const rc = light ? pal.rumbleA : pal.rumbleB;
    poly(p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, rc);
    poly(p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, rc);
    poly(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, light ? pal.roadA : pal.roadB);
    const l1 = p1.w / Math.max(32, 8 * LANES), l2 = p2.w / Math.max(32, 8 * LANES);
    for (let i = 1; i < LANES; i++) {
      const x1 = p1.x - p1.w + (p1.w * 2 / LANES) * i, x2 = p2.x - p2.w + (p2.w * 2 / LANES) * i;
      if (i === 2 && twoWay) {
        const g1 = l1 * 0.9, g2 = l2 * 0.9;
        poly(x1 - g1 * 2.2, p1.y, x1 - g1 * 0.9, p1.y, x2 - g2 * 0.9, p2.y, x2 - g2 * 2.2, p2.y, '#f2c230');
        poly(x1 + g1 * 0.9, p1.y, x1 + g1 * 2.2, p1.y, x2 + g2 * 2.2, p2.y, x2 + g2 * 0.9, p2.y, '#f2c230');
      } else if (light) poly(x1 - l1 / 2, p1.y, x1 + l1 / 2, p1.y, x2 + l2 / 2, p2.y, x2 - l2 / 2, p2.y, pal.lane);
    }
    if (seg.fog < 0.985) { ctx.globalAlpha = 1 - seg.fog; ctx.fillStyle = pal.fog; ctx.fillRect(0, p2.y, W, p1.y - p2.y); ctx.globalAlpha = 1; }
  }
  function drawLayer(arr, tile, off, amp, col) {
    ctx.fillStyle = col; ctx.beginPath();
    const n = arr.length, step = tile / n; let x0 = -(((off % tile) + tile) % tile);
    ctx.moveTo(x0, HY + 2);
    for (let x = x0, i = 0; x < W + tile; x += step, i++) ctx.lineTo(x, HY - arr[i % n] * amp);
    ctx.lineTo(W + tile, HY + 2); ctx.closePath(); ctx.fill();
  }
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 1);
    ctx.fillStyle = pal.fog; ctx.fillRect(0, HY, W, H - HY);
    const d = pal.dark;
    if (d > 0.25) {
      ctx.fillStyle = '#fff';
      for (const s of stars) { ctx.globalAlpha = (0.4 + 0.6 * Math.sin(time * 2 + s.a)) * Math.min(1, (d - 0.25) * 1.6) * 0.9; ctx.fillRect(s.x * W, s.y * HY, s.s * dpr, s.s * dpr); }
      ctx.globalAlpha = Math.min(1, (d - 0.3) * 1.5);
      ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(W * 0.78, HY * 0.3, HY * 0.07, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (d < 0.8) {
      const sx = W * 0.27, sy = HY * (0.34 + d * 0.5), gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, HY * 0.5);
      gr.addColorStop(0, 'rgba(255,245,200,' + (0.9 * (1 - d)) + ')'); gr.addColorStop(0.2, 'rgba(255,220,150,' + (0.35 * (1 - d)) + ')'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, HY);
    }
    const tile = W * 1.6;
    drawLayer(mt[0], tile, sky1 * 0.5, HY * 0.42, pal.mt1);
    drawLayer(mt[1], tile * 0.8, sky2 * 0.5, HY * 0.24, pal.mt2);
  }

  const playerScr = { x: 0, y: 0, w: 0, h: 0 };
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const ph = ((travelled * MPU / 3500) + phaseOff) % 4; updatePalette(ph);
    const dark = pal.dark, lvl = Math.round(dark * 3);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * dpr, (Math.random() - 0.5) * shake * dpr);
    drawSky();
    const baseSeg = findSeg(position), basePct = pctRem(position, SEG);
    const pSeg = findSeg(position + PZ), pPct = pctRem(position + PZ, SEG);
    const playerY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
    let maxy = H, x = 0, dx = -(baseSeg.curve * basePct);
    for (let n = 0; n < DRAW; n++) {
      const seg = segs[(baseSeg.index + n) % segs.length];
      seg.looped = seg.index < baseSeg.index; seg.fog = 1 / Math.exp(Math.pow(n / DRAW, 2) * FOG); seg.clip = maxy;
      const camX = playerX * ROAD - x, camY = playerY + CAMH, camZ = position - (seg.looped ? trackLen : 0);
      project(seg.p1, camX, camY, camZ); project(seg.p2, camX - dx, camY, camZ);
      x += dx; dx += seg.curve;
      if (seg.p1.camera.z <= CAMD || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
      drawSegment(seg); maxy = seg.p1.screen.y;
    }
    const wscale = ROAD * W / 2;
    for (let n = DRAW - 1; n > 0; n--) {
      const seg = segs[(baseSeg.index + n) % segs.length], sc = seg.p1.screen.scale;
      if (seg.p1.camera.z <= CAMD) continue;
      for (const s of seg.sprites) {
        const spec = Sprites.SCEN[s.kind], dw = sc * spec.w * wscale, dh = dw * spec.aspect;
        if (dw < 1.5) continue;
        const sx = seg.p1.screen.x + sc * s.offset * wscale, sy = seg.p1.screen.y;
        const dx0 = spec.a === 'e' ? (s.offset < 0 ? sx - dw : sx) : sx - dw / 2;
        const clipH = Math.max(0, sy - seg.clip); if (clipH >= dh) continue;
        const img = Sprites.getScen(s.kind, lvl);
        ctx.drawImage(img, 0, 0, img.width, img.height * (1 - clipH / dh), dx0, sy - dh, dw, dh - clipH);
      }
      for (const o of seg.objs) {
        const pct = pctRem(o.z, SEG), p1 = seg.p1.screen, p2 = seg.p2.screen;
        const sx = lerp(p1.x, p2.x, pct) + sc * o.offset * wscale, sy = lerp(p1.y, p2.y, pct);
        if (o.kind === 'coin') {
          const r = sc * 0.1 * wscale; if (r < 1.2) continue;
          const sq = Math.abs(Math.cos(time * 5 + o.z * 0.004)), cy = sy - r * 1.6;
          if (sy - seg.clip > r * 2.6) continue;
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.9, r * 0.25, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#ffcf33'; ctx.beginPath(); ctx.ellipse(sx, cy, Math.max(r * 0.15, r * sq), r, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff2a8'; ctx.beginPath(); ctx.ellipse(sx, cy, Math.max(r * 0.08, r * sq * 0.6), r * 0.62, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#e09a12'; ctx.beginPath(); ctx.ellipse(sx, cy, Math.max(r * 0.04, r * sq * 0.28), r * 0.3, 0, 0, 7); ctx.fill();
          continue;
        }
        const sp = Sprites.SHAPES[o.shape], dw = sc * o.w * wscale, dh = dw * sp.aspect;
        if (dw < 1.5) continue;
        const clipH = Math.max(0, sy - seg.clip); if (clipH >= dh) continue;
        const img = Sprites.getCar(o.shape, o.color, o.dir < 0 ? 'front' : 'rear', lvl, o.opts);
        ctx.fillStyle = 'rgba(0,0,0,' + (0.38 * (1 - dark * 0.4)) + ')'; ctx.beginPath(); ctx.ellipse(sx, sy - dh * 0.02, dw * 0.54, Math.max(1, dw * 0.09), 0, 0, 7); ctx.fill();
        ctx.drawImage(img, 0, 0, img.width, img.height * (1 - clipH / dh), sx - dw / 2, sy - dh, dw, dh - clipH);
        if (o.signal && Math.floor(time * 4) % 2 === 0 && dw > 8) { ctx.fillStyle = '#ffb000'; const bx = sx + o.signal * dw * 0.46; ctx.beginPath(); ctx.arc(bx, sy - dh * 0.5, Math.max(2, dw * 0.045), 0, 7); ctx.fill(); }
      }
    }
    /* night: soft headlight pool on the road */
    if (dark > 0.15 && !crashed) {
      const cx = W / 2, cy = H * 0.7, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.36);
      g.addColorStop(0, 'rgba(255,248,215,' + (0.30 * dark) + ')'); g.addColorStop(0.55, 'rgba(255,248,215,' + (0.12 * dark) + ')'); g.addColorStop(1, 'rgba(255,248,215,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.62); ctx.translate(-cx, -cy); ctx.fillRect(0, 0, W, H * 1.6); ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    drawPlayer(pSeg, pPct, lvl, dark);
    /* speed lines */
    const sp1 = speed / (BASE_MAX * carDef.top);
    if (sp1 > 1.02 || nitroOn) {
      const a = clamp((sp1 - 1) * 2.5 + (nitroOn ? 0.25 : 0), 0, 0.55);
      ctx.strokeStyle = nitroOn ? 'rgba(160,240,255,' + a + ')' : 'rgba(255,255,255,' + a * 0.6 + ')'; ctx.lineWidth = dpr * 1.4;
      ctx.beginPath();
      for (let i = 0; i < 18; i++) { const ang = Math.random() * Math.PI * 2, r0 = Math.min(W, H) * (0.35 + Math.random() * 0.3), r1 = r0 + Math.min(W, H) * (0.12 + Math.random() * 0.2); ctx.moveTo(W / 2 + Math.cos(ang) * r0 * 1.5, HY + 20 + Math.sin(ang) * r0 * 0.9); ctx.lineTo(W / 2 + Math.cos(ang) * r1 * 1.5, HY + 20 + Math.sin(ang) * r1 * 0.9); }
      ctx.stroke();
    }
    /* particles / popups */
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * Math.max(0.3, p.life), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = '800 ' + Math.round(17 * dpr) + 'px "Segoe UI",Roboto,Arial,sans-serif';
    for (const p of popups) { ctx.globalAlpha = clamp(p.life * 1.6, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(p.text, W / 2 + p.x * W + 1, H * 0.34 + p.y + 2); ctx.fillStyle = p.col; ctx.fillText(p.text, W / 2 + p.x * W, H * 0.34 + p.y); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPlayer(pSeg, pPct, lvl, dark) {
    const sc = CAMD / PZ, sh = Sprites.SHAPES[carDef.shape], wscale = ROAD * W / 2;
    const dw = sc * PW * wscale, dh = dw * sh.aspect;
    const slope = lerp(pSeg.p1.camera.y, pSeg.p2.camera.y, pPct);
    let py = HY - sc * slope * H / 2, px = W / 2;
    const sp = speed / BASE_MAX; py += (Math.random() - 0.5) * 2 * dpr * sp * 1.2;
    let lift = 0, rot = steer * 0.045;
    if (crashed) { rot = crashSpin; lift = Math.abs(Math.sin(crashT * 5)) * dh * 1.1 * Math.max(0, 1 - crashT / 1.4); }
    playerScr.x = px; playerScr.y = py; playerScr.w = dw; playerScr.h = dh;
    ctx.save(); ctx.translate(px, py - lift);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, lift + dh * 0.02, dw * 0.55, dw * 0.1, 0, 0, 7); ctx.fill();
    ctx.translate(0, -dh * 0.5); ctx.rotate(rot); ctx.transform(1, 0, steer * 0.05, 1, 0, 0); ctx.translate(0, dh * 0.5);
    const img = Sprites.getCar(carDef.shape, carDef.color, 'rear', Math.min(1, lvl), carDef.opts, 256);
    ctx.drawImage(img, -dw / 2, -dh, dw, dh);
    const tl = sh.tail;
    if (inp.brake || crashed) {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of tl) { const gx = -dw / 2 + dw * p[0], gy = -dh + dh * p[1], r = dw * 0.2; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, 'rgba(255,50,40,.85)'); g.addColorStop(1, 'rgba(255,50,40,0)'); ctx.fillStyle = g; ctx.fillRect(gx - r, gy - r, r * 2, r * 2); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (nitroOn) {
      ctx.globalCompositeOperation = 'lighter';
      for (const sx of [-0.27, 0.27]) {
        const gx = dw * sx, gy = -dh * 0.1, r = dw * (0.12 + Math.random() * 0.06);
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 2.2); g.addColorStop(0, 'rgba(235,255,255,.95)'); g.addColorStop(0.3, 'rgba(70,200,255,.75)'); g.addColorStop(1, 'rgba(0,120,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r * 2.2, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function getHud() {
    return { score: Math.floor(scoreDist + bonus), dist: Math.floor(travelled * MPU), kmh: Math.round(speed * KMH), nitro, combo, comboPct: clamp(comboT / 3.4, 0, 1), runCoins, nitroOn, crashed, maxKmh: Math.round(maxKmh), near: nearCnt, mode };
  }
  function getRun() { return { score: Math.floor(scoreDist + bonus), dist: Math.floor(travelled * MPU), coins: runCoins, near: nearCnt, maxKmh: Math.round(maxKmh), twoWay }; }
  return { CARS, hooks, inp, debug, init, resize, start, setMode, setLoadout, update, render, getHud, getRun, isCrashed: () => crashed, objCount: () => objs.length, getSpeedPct: () => speed / BASE_MAX, isNitro: () => nitroOn, setPhase: p => { phaseOff = p; }, KMH };
})();

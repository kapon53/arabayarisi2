'use strict';
/* ===== Procedural audio: engine, wind, sfx and a small synth music loop ===== */
const Aud = (function () {
  let ctx = null, master = null, sfxG = null, musG = null, noiseBuf = null;
  let eng = null, wind = null;
  let vol = 2, ext = false, musicTimer = null, nextT = 0, stepI = 0, musicWanted = false;
  const BPM = 124, ROOTS = [57, 57, 53, 55];       // A, A, F, G (midi) per bar
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxG = ctx.createGain(); sfxG.connect(master);
      musG = ctx.createGain(); musG.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVol();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function applyVol() {
    if (!ctx) return;
    master.gain.value = (ext || vol === 0) ? 0 : 1;
    musG.gain.value = vol === 2 ? 0.5 : 0;
    sfxG.gain.value = 1;
  }
  function unlock() { if (ctx && ctx.state !== 'running' && !Platform.adActive) { try { ctx.resume(); } catch (e) {} } }
  function setVol(v) { vol = v; applyVol(); if (vol === 0) engineStop(); }
  function setExternalMute(m) { ext = m; applyVol(); }
  function pauseAll() { if (ctx) { try { ctx.suspend(); } catch (e) {} } }
  function resumeAll() { if (ctx) { try { ctx.resume(); } catch (e) {} } }

  /* ---- engine ---- */
  function engineStart() {
    if (!ctx || eng || vol === 0) return;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxG);
    o1.start(); o2.start();
    g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.4);
    eng = { o1, o2, g, f };
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const wg = ctx.createGain(); wg.gain.value = 0;
    n.connect(bp); bp.connect(wg); wg.connect(sfxG); n.start();
    wind = { n, g: wg };
  }
  function engineSet(speedPct, nitro) {
    if (!eng) return;
    const t = ctx.currentTime;
    const fr = 38 + speedPct * 110 + (nitro ? 28 : 0);
    eng.o1.frequency.setTargetAtTime(fr, t, 0.05);
    eng.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.05);
    eng.f.frequency.setTargetAtTime(500 + speedPct * 900, t, 0.1);
    wind.g.gain.setTargetAtTime(Math.min(0.12, speedPct * 0.07 + (nitro ? 0.05 : 0)), t, 0.1);
  }
  function engineStop() {
    if (!eng) return;
    const e = eng, w = wind; eng = null; wind = null;
    try { e.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08); w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.08); } catch (x) {}
    setTimeout(() => { try { e.o1.stop(); e.o2.stop(); w.n.stop(); } catch (x) {} }, 400);
  }

  /* ---- sfx ---- */
  function tone(type, f0, f1, dur, gain, delay) {
    if (!ctx || vol === 0) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, f0, f1, gain, type) {
    if (!ctx || vol === 0) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass';
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(sfxG); n.start(t); n.stop(t + dur + 0.02);
  }
  function sfx(k) {
    if (!ctx) return;
    switch (k) {
      case 'coin': tone('square', 988, null, 0.07, 0.07); tone('square', 1319, null, 0.14, 0.07, 0.06); break;
      case 'near': tone('sine', 420, 1500, 0.18, 0.2); noise(0.2, 3000, 6000, 0.05, 'highpass'); break;
      case 'crash': noise(0.7, 2400, 90, 0.7, 'lowpass'); tone('sawtooth', 150, 30, 0.6, 0.4); break;
      case 'nitro': noise(0.6, 1500, 5000, 0.12, 'bandpass'); tone('sawtooth', 120, 400, 0.4, 0.05); break;
      case 'scrape': noise(0.12, 4000, 2000, 0.06, 'highpass'); break;
      case 'click': tone('triangle', 640, 900, 0.07, 0.08); break;
      case 'buy': [523, 659, 784, 1047].forEach((f, i) => tone('square', f, null, 0.12, 0.06, i * 0.07)); break;
      case 'mission': [659, 784, 988, 1319].forEach((f, i) => tone('triangle', f, null, 0.16, 0.12, i * 0.08)); break;
      case 'combo_lost': tone('sawtooth', 300, 120, 0.25, 0.08); break;
    }
  }

  /* ---- music: bass + arp + kick + hat, scheduled ahead of time ---- */
  function musicStart() {
    musicWanted = true;
    if (!ctx || musicTimer) return;
    nextT = ctx.currentTime + 0.1; stepI = 0;
    musicTimer = setInterval(sched, 90);
  }
  function musicStop() {
    musicWanted = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  function sched() {
    if (!ctx || vol < 2 || ctx.state !== 'running') { if (ctx) nextT = Math.max(nextT, ctx.currentTime + 0.05); return; }
    const spb = 60 / BPM / 4;
    while (nextT < ctx.currentTime + 0.25) { playStep(stepI, nextT); nextT += spb; stepI = (stepI + 1) % 64; }
  }
  function mTone(type, f, t, dur, gain, lp) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp || 2000;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musG); o.start(t); o.stop(t + dur + 0.02);
  }
  function playStep(s, t) {
    const bar = (s >> 4) & 3, st = s & 15, root = ROOTS[bar];
    if (st % 4 === 0) { // kick
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.22);
    }
    if (st % 4 === 2) { // hat
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(f); f.connect(g); g.connect(musG); n.start(t); n.stop(t + 0.06);
    }
    if (st % 2 === 0 && st % 4 !== 0) mTone('sawtooth', mtof(root - 24), t, 0.2, 0.18, 400);   // off-beat bass
    const arp = [0, 7, 12, 15, 12, 7, 3, 7];
    if (st % 2 === 1 || st % 4 === 0) mTone('square', mtof(root + 12 + arp[(st >> 1) & 7]), t, 0.12, 0.05, 2600);
  }
  return { init, unlock, setVol, getVol: () => vol, setExternalMute, pauseAll, resumeAll, engineStart, engineSet, engineStop, sfx, musicStart, musicStop };
})();

'use strict';
/* ===== Procedural sprites (cars seen from behind / front, roadside objects). Cached per darkness level. ===== */
const Sprites = (function () {
  const cache = new Map();
  function h2r(h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb(r, g, b) { return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  function shade(h, a) { const c = h2r(h), t = a < 0 ? 0 : 255, p = Math.abs(a); return rgb(c[0] + (t - c[0]) * p, c[1] + (t - c[1]) * p, c[2] + (t - c[2]) * p); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function poly(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* w = width in road units (road half-width = 1), len = length along the road (world units) */
  const SHAPES = {
    sedan: { aspect: 0.62, w: 0.30, len: 420, tail: [[.17, .51], [.83, .51]], head: [[.17, .5], [.83, .5]] },
    sport: { aspect: 0.52, w: 0.30, len: 440, tail: [[.22, .58], [.78, .58]], head: [[.2, .56], [.8, .56]] },
    van:   { aspect: 0.86, w: 0.32, len: 540, tail: [[.1, .54], [.9, .54]], head: [[.14, .64], [.86, .64]] },
    bus:   { aspect: 1.00, w: 0.36, len: 1100, tail: [[.09, .72], [.91, .72]], head: [[.12, .7], [.88, .7]] },
    truck: { aspect: 1.00, w: 0.36, len: 1300, tail: [[.08, .72], [.92, .72]], head: [[.14, .72], [.86, .72]] }
  };

  function wheels(c, W, H, y) { c.fillStyle = '#0b0c0f'; rr(c, W * .05, H * y, W * .2, H * (1 - y), W * .03); c.fill(); rr(c, W * .75, H * y, W * .2, H * (1 - y), W * .03); c.fill(); }
  function bodyGrad(c, col, y0, y1) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, shade(col, .28)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.4)); return g; }

  function rear(c, W, H, shape, col, o) {
    const mid = shade(col, -.12), dark = shade(col, -.4);
    if (shape === 'sedan') {
      wheels(c, W, H, .78);
      c.fillStyle = bodyGrad(c, col, H * .36, H * .9); rr(c, W * .02, H * .36, W * .96, H * .52, W * .09); c.fill();
      c.fillStyle = mid; poly(c, [W * .2, H * .06, W * .8, H * .06, W * .9, H * .42, W * .1, H * .42]); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; poly(c, [W * .22, H * .06, W * .78, H * .06, W * .8, H * .1, W * .2, H * .1]); c.fill();
      if (o.stripes) { c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(W * .43, H * .06, W * .05, H * .36); c.fillRect(W * .52, H * .06, W * .05, H * .36); }
      c.fillStyle = '#0e1722'; poly(c, [W * .27, H * .12, W * .73, H * .12, W * .82, H * .38, W * .18, H * .38]); c.fill();
      c.fillStyle = 'rgba(120,170,220,.2)'; poly(c, [W * .3, H * .13, W * .45, H * .13, W * .36, H * .37, W * .22, H * .37]); c.fill();
      if (o.stripes) { c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(W * .43, H * .42, W * .05, H * .3); c.fillRect(W * .52, H * .42, W * .05, H * .3); }
      if (o.taxi) { c.fillStyle = '#fff6c0'; rr(c, W * .38, 0, W * .24, H * .07, W * .02); c.fill(); c.fillStyle = '#222'; c.fillRect(W * .43, H * .02, W * .14, H * .03); }
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(W * .1, H * .42, W * .8, H * .012);
      c.fillStyle = '#d11a1a'; rr(c, W * .06, H * .46, W * .22, H * .1, H * .03); c.fill(); rr(c, W * .72, H * .46, W * .22, H * .1, H * .03); c.fill();
      c.fillStyle = '#ff6a5a'; c.fillRect(W * .08, H * .48, W * .1, H * .03); c.fillRect(W * .82, H * .48, W * .1, H * .03);
      c.fillStyle = '#f2f2e8'; rr(c, W * .38, H * .62, W * .24, H * .1, W * .01); c.fill();
      c.fillStyle = 'rgba(0,0,0,.4)'; rr(c, W * .05, H * .8, W * .9, H * .09, W * .03); c.fill();
    } else if (shape === 'sport') {
      wheels(c, W, H, .76);
      c.fillStyle = bodyGrad(c, col, H * .34, H * .86); rr(c, 0, H * .34, W, H * .5, W * .1); c.fill();
      c.fillStyle = mid; poly(c, [W * .22, H * .2, W * .78, H * .2, W * .9, H * .45, W * .1, H * .45]); c.fill();
      c.fillStyle = '#0e1722'; poly(c, [W * .28, H * .25, W * .72, H * .25, W * .8, H * .42, W * .2, H * .42]); c.fill();
      c.fillStyle = 'rgba(120,170,220,.2)'; poly(c, [W * .3, H * .26, W * .44, H * .26, W * .36, H * .41, W * .23, H * .41]); c.fill();
      if (o.stripes) { c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(W * .44, H * .44, W * .05, H * .34); c.fillRect(W * .52, H * .44, W * .05, H * .34); }
      c.fillStyle = dark; c.fillRect(W * .25, H * .16, W * .04, H * .2); c.fillRect(W * .71, H * .16, W * .04, H * .2);
      c.fillStyle = shade(col, -.55); rr(c, W * .0, H * .09, W, H * .08, H * .02); c.fill();
      c.fillStyle = col; rr(c, W * .02, H * .1, W * .96, H * .04, H * .015); c.fill();
      c.fillStyle = shade(col, -.55); rr(c, W * .0, H * .05, W * .05, H * .16, H * .015); c.fill(); rr(c, W * .95, H * .05, W * .05, H * .16, H * .015); c.fill();
      c.fillStyle = '#c4161c'; rr(c, W * .1, H * .55, W * .8, H * .07, H * .03); c.fill();
      c.fillStyle = '#12090a'; rr(c, W * .43, H * .55, W * .14, H * .07, H * .02); c.fill();
      c.fillStyle = '#ff6a5a'; c.fillRect(W * .12, H * .57, W * .2, H * .02); c.fillRect(W * .68, H * .57, W * .2, H * .02);
      c.fillStyle = 'rgba(0,0,0,.55)'; rr(c, W * .14, H * .76, W * .72, H * .11, W * .02); c.fill();
      c.fillStyle = '#3a3d44'; c.beginPath(); c.arc(W * .3, H * .84, W * .035, 0, 7); c.fill(); c.beginPath(); c.arc(W * .7, H * .84, W * .035, 0, 7); c.fill();
      c.fillStyle = '#05060a'; c.beginPath(); c.arc(W * .3, H * .84, W * .02, 0, 7); c.fill(); c.beginPath(); c.arc(W * .7, H * .84, W * .02, 0, 7); c.fill();
      c.fillStyle = '#f2f2e8'; rr(c, W * .4, H * .65, W * .2, H * .08, W * .01); c.fill();
    } else if (shape === 'van') {
      wheels(c, W, H, .8);
      c.fillStyle = bodyGrad(c, col, H * .04, H * .84); rr(c, W * .04, H * .04, W * .92, H * .78, W * .07); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; rr(c, W * .08, H * .05, W * .84, H * .04, W * .02); c.fill();
      c.fillStyle = '#0e1722'; rr(c, W * .18, H * .12, W * .64, H * .26, W * .04); c.fill();
      c.fillStyle = 'rgba(120,170,220,.18)'; poly(c, [W * .2, H * .13, W * .4, H * .13, W * .3, H * .37, W * .2, H * .37]); c.fill();
      c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(W * .495, H * .4, W * .01, H * .36); c.fillRect(W * .12, H * .4, W * .76, H * .01);
      c.fillStyle = '#d11a1a'; rr(c, W * .05, H * .44, W * .1, H * .2, W * .02); c.fill(); rr(c, W * .85, H * .44, W * .1, H * .2, W * .02); c.fill();
      c.fillStyle = '#f2f2e8'; rr(c, W * .4, H * .62, W * .2, H * .08, W * .01); c.fill();
      c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, W * .05, H * .74, W * .9, H * .07, W * .02); c.fill();
    } else if (shape === 'bus') {
      wheels(c, W, H, .82);
      c.fillStyle = bodyGrad(c, col, H * .02, H * .86); rr(c, W * .02, H * .02, W * .96, H * .84, W * .05); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, W * .3, 0, W * .4, H * .05, W * .02); c.fill();
      c.fillStyle = '#0e1722'; rr(c, W * .1, H * .13, W * .8, H * .3, W * .03); c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(W * .1, H * .13, W * .8, H * .03);
      c.fillStyle = '#ffb347'; rr(c, W * .3, H * .07, W * .4, H * .05, W * .01); c.fill();
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(W * .5, H * .45, W * .01, H * .3);
      c.fillStyle = '#d11a1a'; rr(c, W * .06, H * .6, W * .1, H * .22, W * .02); c.fill(); rr(c, W * .84, H * .6, W * .1, H * .22, W * .02); c.fill();
      c.fillStyle = '#f2f2e8'; rr(c, W * .42, H * .68, W * .16, H * .07, W * .01); c.fill();
      c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, W * .04, H * .8, W * .92, H * .06, W * .02); c.fill();
    } else { // truck (container)
      wheels(c, W, H, .83);
      c.fillStyle = bodyGrad(c, col, H * .02, H * .82); rr(c, W * .02, H * .02, W * .96, H * .8, W * .03); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = Math.max(1, W * .008);
      for (let i = 1; i < 9; i++) { c.beginPath(); c.moveTo(W * (.02 + i * .96 / 9), H * .04); c.lineTo(W * (.02 + i * .96 / 9), H * .78); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(W * .495, H * .04, W * .012, H * .74);
      c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(W * .03, H * .03, W * .94, H * .03);
      c.fillStyle = '#d11a1a'; rr(c, W * .05, H * .66, W * .09, H * .1, W * .015); c.fill(); rr(c, W * .86, H * .66, W * .09, H * .1, W * .015); c.fill();
      for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#fff' : '#d11a1a'; c.fillRect(W * (.04 + i * .08), H * .8, W * .08, H * .035); }
      c.fillStyle = '#f2f2e8'; rr(c, W * .42, H * .7, W * .16, H * .06, W * .01); c.fill();
    }
  }

  function front(c, W, H, shape, col, o) {
    const mid = shade(col, -.12);
    if (shape === 'sedan' || shape === 'sport') {
      const sp = shape === 'sport';
      wheels(c, W, H, sp ? .76 : .78);
      c.fillStyle = bodyGrad(c, col, H * .34, H * .88); rr(c, W * (sp ? 0 : .02), H * (sp ? .38 : .36), W * (sp ? 1 : .96), H * .5, W * .1); c.fill();
      c.fillStyle = mid; poly(c, sp ? [W * .24, H * .18, W * .76, H * .18, W * .9, H * .46, W * .1, H * .46] : [W * .2, H * .06, W * .8, H * .06, W * .9, H * .42, W * .1, H * .42]); c.fill();
      c.fillStyle = '#0e1722'; poly(c, sp ? [W * .3, H * .23, W * .7, H * .23, W * .82, H * .44, W * .18, H * .44] : [W * .26, H * .11, W * .74, H * .11, W * .84, H * .39, W * .16, H * .39]); c.fill();
      c.fillStyle = 'rgba(120,170,220,.2)'; poly(c, [W * .3, H * .13, W * .44, H * .13, W * .34, H * .38, W * .2, H * .38]); c.fill();
      if (o.stripes) { c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(W * .44, H * .4, W * .05, H * .3); c.fillRect(W * .52, H * .4, W * .05, H * .3); }
      c.fillStyle = '#12151b'; rr(c, W * .3, H * .6, W * .4, H * .14, W * .02); c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 5; i++) c.fillRect(W * .32, H * (.62 + i * .025), W * .36, H * .008);
      c.fillStyle = '#fff6d0'; rr(c, W * .06, H * .48, W * .2, H * .1, H * .03); c.fill(); rr(c, W * .74, H * .48, W * .2, H * .1, H * .03); c.fill();
      c.fillStyle = 'rgba(0,0,0,.4)'; rr(c, W * .05, H * .8, W * .9, H * .08, W * .03); c.fill();
      if (o.taxi) { c.fillStyle = '#fff6c0'; rr(c, W * .38, 0, W * .24, H * .07, W * .02); c.fill(); }
    } else { // van / bus / truck seen from the front
      const cab = shape === 'truck';
      wheels(c, W, H, shape === 'van' ? .8 : .82);
      c.fillStyle = bodyGrad(c, cab ? '#2c3340' : col, H * .02, H * .86); rr(c, W * .03, H * .02, W * .94, H * .84, W * .06); c.fill();
      c.fillStyle = '#0e1722'; rr(c, W * .1, H * .1, W * .8, H * .4, W * .05); c.fill();
      c.fillStyle = 'rgba(120,170,220,.2)'; poly(c, [W * .13, H * .12, W * .4, H * .12, W * .26, H * .48, W * .13, H * .48]); c.fill();
      if (shape === 'bus') { c.fillStyle = '#ffb347'; rr(c, W * .3, H * .04, W * .4, H * .05, W * .01); c.fill(); }
      c.fillStyle = '#12151b'; rr(c, W * .3, H * .6, W * .4, H * .14, W * .02); c.fill();
      c.fillStyle = '#fff6d0'; rr(c, W * .08, H * .62, W * .16, H * .1, H * .02); c.fill(); rr(c, W * .76, H * .62, W * .16, H * .1, H * .02); c.fill();
      c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, W * .04, H * .8, W * .92, H * .06, W * .02); c.fill();
    }
  }

  function glows(c, W, H, shape, facing, lvl) {
    const sp = SHAPES[shape], pts = facing === 'rear' ? sp.tail : sp.head, r = W * (facing === 'rear' ? .12 : .17);
    const a = facing === 'rear' ? 0.3 + lvl * 0.18 : 0.25 + lvl * 0.25;
    const col = facing === 'rear' ? '255,40,30' : '255,244,200';
    c.globalCompositeOperation = 'lighter';
    for (const p of pts) {
      const g = c.createRadialGradient(W * p[0], H * p[1], 0, W * p[0], H * p[1], r);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g; c.fillRect(W * p[0] - r, H * p[1] - r, r * 2, r * 2);
    }
    c.globalCompositeOperation = 'source-over';
  }

  function getCar(shape, col, facing, lvl, o, Wd) {
    o = o || {}; Wd = Wd || 192;
    const key = shape + col + facing + lvl + (o.stripes ? 's' : '') + (o.taxi ? 't' : '') + Wd;
    let cv = cache.get(key); if (cv) return cv;
    const sp = SHAPES[shape], Hd = Math.round(Wd * sp.aspect);
    cv = mk(Wd, Hd); const c = cv.getContext('2d');
    if (facing === 'rear') rear(c, Wd, Hd, shape, col, o); else front(c, Wd, Hd, shape, col, o);
    if (lvl > 0) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(6,10,28,' + (lvl * 0.2) + ')'; c.fillRect(0, 0, Wd, Hd); c.globalCompositeOperation = 'source-over'; }
    glows(c, Wd, Hd, shape, facing, lvl);
    cache.set(key, cv); return cv;
  }

  /* ---------- roadside objects ---------- */
  const SCEN = {
    pine:  { w: 1.0, aspect: 2.2, a: 'c' }, tree: { w: 1.3, aspect: 1.5, a: 'c' }, bush: { w: 0.8, aspect: 0.55, a: 'c' }, rock: { w: 0.9, aspect: 0.6, a: 'c' },
    sign:  { w: 0.55, aspect: 1.7, a: 'c' }, lamp: { w: 0.7, aspect: 3.2, a: 'c' }, bld1: { w: 2.4, aspect: 1.8, a: 'e' }, bld2: { w: 1.8, aspect: 3.0, a: 'e' }, board: { w: 2.0, aspect: 1.25, a: 'c' }
  };
  function paintScen(c, W, H, k) {
    if (k === 'pine') {
      c.fillStyle = '#4b3220'; c.fillRect(W * .45, H * .82, W * .1, H * .18);
      for (let i = 0; i < 3; i++) { const y0 = H * (.04 + i * .24), hw = W * (.26 + i * .11); c.fillStyle = shade('#2f7d3a', -.08 * i); poly(c, [W / 2, y0, W / 2 + hw, y0 + H * .38, W / 2 - hw, y0 + H * .38]); c.fill(); c.fillStyle = 'rgba(255,255,255,.08)'; poly(c, [W / 2, y0, W / 2 + hw * .1, y0 + H * .1, W / 2 - hw, y0 + H * .38]); c.fill(); }
    } else if (k === 'tree') {
      c.fillStyle = '#5a3d27'; c.fillRect(W * .46, H * .5, W * .08, H * .5);
      for (const p of [[.5, .3, .34], [.3, .42, .24], [.7, .42, .24], [.5, .5, .26]]) { c.fillStyle = shade('#3c9a4a', p[1] > .4 ? -.12 : 0); c.beginPath(); c.arc(W * p[0], H * p[1], W * p[2], 0, 7); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.arc(W * .42, H * .22, W * .12, 0, 7); c.fill();
    } else if (k === 'bush') {
      for (const p of [[.3, .62, .28], [.55, .5, .32], [.75, .66, .24]]) { c.fillStyle = shade('#3a8f48', p[0] > .5 ? -.15 : 0); c.beginPath(); c.arc(W * p[0], H * p[1], W * p[2], 0, 7); c.fill(); }
    } else if (k === 'rock') {
      c.fillStyle = '#7b7f88'; poly(c, [W * .05, H, W * .2, H * .4, W * .5, H * .1, W * .8, H * .35, W * .95, H]); c.fill();
      c.fillStyle = 'rgba(255,255,255,.15)'; poly(c, [W * .2, H * .4, W * .5, H * .1, W * .5, H * .6]); c.fill();
    } else if (k === 'sign') {
      c.fillStyle = '#9aa0aa'; c.fillRect(W * .46, H * .3, W * .08, H * .7);
      c.fillStyle = '#1565c0'; rr(c, W * .05, H * .02, W * .9, H * .36, W * .06); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = W * .04; c.stroke();
      c.fillStyle = '#fff'; c.fillRect(W * .2, H * .15, W * .6, H * .04); poly(c, [W * .62, H * .08, W * .8, H * .17, W * .62, H * .26]); c.fill();
    } else if (k === 'lamp') {
      c.fillStyle = '#4a4f5a'; c.fillRect(W * .47, H * .1, W * .06, H * .9);
      c.fillStyle = '#5a606c'; rr(c, W * .2, H * .04, W * .6, H * .07, W * .03); c.fill();
      c.fillStyle = '#fff4c8'; rr(c, W * .26, H * .09, W * .48, H * .035, W * .015); c.fill();
    } else if (k === 'bld1' || k === 'bld2') {
      const base = k === 'bld1' ? '#4c5873' : '#3b4660';
      c.fillStyle = bodyGrad(c, base, 0, H); c.fillRect(0, H * .03, W, H * .97);
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, H * .03, W, H * .02);
      const cols = k === 'bld1' ? 8 : 5, rows = k === 'bld1' ? 6 : 12;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const lit = ((r * 7 + q * 13 + (k === 'bld1' ? 3 : 5)) % 5) < 2;
        c.fillStyle = lit ? '#2a3550' : '#222b40';
        c.fillRect(W * (.06 + q * (.88 / cols)), H * (.08 + r * (.82 / rows)), W * (.88 / cols) * .62, H * (.82 / rows) * .55);
      }
    } else if (k === 'board') {
      c.fillStyle = '#3a3f4a'; c.fillRect(W * .2, H * .55, W * .06, H * .45); c.fillRect(W * .74, H * .55, W * .06, H * .45);
      const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#ff2d95'); g.addColorStop(1, '#00e5ff');
      c.fillStyle = '#10131c'; rr(c, W * .02, H * .02, W * .96, H * .56, W * .03); c.fill();
      c.fillStyle = g; rr(c, W * .06, H * .08, W * .88, H * .44, W * .02); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(W * .14, H * .22, W * .5, H * .06); c.fillRect(W * .14, H * .34, W * .3, H * .04);
    }
  }
  function scenGlow(c, W, H, k, lvl) {
    if (lvl < 1) return;
    c.globalCompositeOperation = 'lighter';
    if (k === 'lamp') {
      const g = c.createRadialGradient(W * .5, H * .1, 0, W * .5, H * .1, W * .55); g.addColorStop(0, 'rgba(255,230,150,' + (0.3 + lvl * 0.2) + ')'); g.addColorStop(1, 'rgba(255,230,150,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H * .4);
    } else if (k === 'bld1' || k === 'bld2') {
      const cols = k === 'bld1' ? 8 : 5, rows = k === 'bld1' ? 6 : 12;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        if (((r * 7 + q * 13 + (k === 'bld1' ? 3 : 5)) % 5) < 2) { c.fillStyle = 'rgba(255,214,120,' + (0.25 + lvl * 0.2) + ')'; c.fillRect(W * (.06 + q * (.88 / cols)), H * (.08 + r * (.82 / rows)), W * (.88 / cols) * .62, H * (.82 / rows) * .55); }
      }
    } else if (k === 'board') {
      c.fillStyle = 'rgba(255,80,200,' + (0.1 + lvl * 0.1) + ')'; c.fillRect(W * .06, H * .08, W * .88, H * .44);
    }
    c.globalCompositeOperation = 'source-over';
  }
  function getScen(k, lvl) {
    const key = 's|' + k + lvl; let cv = cache.get(key); if (cv) return cv;
    const sp = SCEN[k], W = 192, H = Math.round(W * sp.aspect);
    cv = mk(W, H); const c = cv.getContext('2d');
    paintScen(c, W, H, k);
    if (lvl > 0) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(6,10,28,' + (lvl * 0.22) + ')'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    scenGlow(c, W, H, k, lvl);
    cache.set(key, cv); return cv;
  }
  return { SHAPES, SCEN, getCar, getScen };
})();

'use strict';
/* ===== CrazyGames SDK wrapper. Everything is guarded, so the game also runs without the SDK (AdBlock, local test). ===== */
const Platform = {
  ready: false, playing: false, adActive: false,
  sdk() { return (window.CrazyGames && window.CrazyGames.SDK) || null; },
  async init() {
    const s = this.sdk(); if (!s) return;
    try {
      await Promise.race([
        Promise.resolve(s.init()).then(() => { this.ready = true; }),
        new Promise(r => setTimeout(r, 3000))
      ]);
    } catch (e) {}
    this.hookMute();
  },
  hookMute() {
    try {
      const g = this.sdk().game;
      if (g.addSettingsChangeListener) g.addSettingsChangeListener(st => { Aud.setExternalMute(!!(st && st.muteAudio)); });
      if (g.settings && g.settings.muteAudio) Aud.setExternalMute(true);
    } catch (e) {}
  },
  loadingStart() { try { if (this.sdk() && this.sdk().game.loadingStart) this.sdk().game.loadingStart(); } catch (e) {} },
  loadingStop() { try { if (this.sdk() && this.sdk().game.loadingStop) this.sdk().game.loadingStop(); } catch (e) {} },
  gameplayStart() { if (this.playing) return; this.playing = true; try { if (this.ready) this.sdk().game.gameplayStart(); } catch (e) {} },
  gameplayStop() { if (!this.playing) return; this.playing = false; try { if (this.ready) this.sdk().game.gameplayStop(); } catch (e) {} },
  happytime() { try { if (this.ready && this.sdk().game.happytime) this.sdk().game.happytime(); } catch (e) {} },
  locale() { try { if (this.ready) return this.sdk().user.systemInfo.locale || ''; } catch (e) {} return ''; },
  getItem(k) {
    try { if (this.ready && this.sdk().data) { const v = this.sdk().data.getItem(k); if (v !== null && v !== undefined) return v; } } catch (e) {}
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  setItem(k, v) {
    try { if (this.ready && this.sdk().data) this.sdk().data.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e) {}
  },
  /* Ad helpers: resolve(true) only if the ad was really shown / finished */
  _ad(type) {
    this.gameplayStop();
    this.adActive = true; Aud.pauseAll();
    return new Promise(resolve => {
      let done = false;
      const fin = ok => { if (done) return; done = true; this.adActive = false; Aud.resumeAll(); resolve(ok); };
      const s = this.sdk();
      if (!this.ready || !s || !s.ad) { fin(false); return; }
      try { s.ad.requestAd(type, { adStarted: () => {}, adFinished: () => fin(true), adError: () => fin(false) }); }
      catch (e) { fin(false); }
    });
  },
  midgame() { return this._ad('midgame'); },
  rewarded() { return this._ad('rewarded'); }
};

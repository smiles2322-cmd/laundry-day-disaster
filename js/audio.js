/* Web Audio sound effects. No external files, no network. */
(function (global) {
  "use strict";

  let ctx = null;
  let muted = false;
  let master = null;

  function ac() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function envGain(duration, peak, when) {
    const c = ac();
    if (!c || !master) return null;
    const g = c.createGain();
    const t = when || c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(master);
    return { g: g, t: t, c: c };
  }

  function tone(type, freq, duration, peak, slide) {
    if (muted) return;
    const e = envGain(duration, peak || 0.5, null);
    if (!e) return;
    const o = e.c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, e.t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, e.t + duration);
    o.connect(e.g);
    o.start(e.t);
    o.stop(e.t + duration + 0.02);
  }

  function noise(duration, peak, filterType, freq) {
    if (muted) return;
    const e = envGain(duration, peak || 0.3, null);
    if (!e) return;
    const len = Math.floor(e.c.sampleRate * duration);
    const buf = e.c.createBuffer(1, len, e.c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = e.c.createBufferSource();
    src.buffer = buf;
    const f = e.c.createBiquadFilter();
    f.type = filterType || "lowpass";
    f.frequency.value = freq || 800;
    src.connect(f);
    f.connect(e.g);
    src.start(e.t);
  }

  const Sfx = {
    unlock: function () { ac(); },
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; },
    catch: function (combo) {
      const n = Math.min(combo || 1, 10);
      tone("triangle", 420 + n * 40, 0.16, 0.45, 720 + n * 30);
      tone("sine", 840 + n * 50, 0.12, 0.2, 1100);
    },
    miss: function () {
      tone("square", 180, 0.22, 0.25, 90);
      noise(0.18, 0.22, "lowpass", 400);
    },
    stink: function () {
      tone("sawtooth", 140, 0.38, 0.28, 60);
      tone("square", 90, 0.45, 0.18, 50);
      noise(0.3, 0.2, "bandpass", 220);
    },
    combo: function () {
      tone("triangle", 523, 0.1, 0.35, 784);
      setTimeout(function () { tone("triangle", 784, 0.12, 0.35, 1046); }, 80);
    },
    tick: function () { tone("square", 880, 0.06, 0.18); },
    start: function () {
      tone("triangle", 392, 0.12, 0.3, 523);
      setTimeout(function () { tone("triangle", 523, 0.12, 0.3, 659); }, 100);
      setTimeout(function () { tone("triangle", 784, 0.18, 0.32, 988); }, 200);
    },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { tone("triangle", f, 0.2, 0.32, f * 1.02); }, i * 110);
      });
    },
    lose: function () {
      tone("triangle", 330, 0.25, 0.28, 196);
      setTimeout(function () { tone("sawtooth", 196, 0.4, 0.2, 110); }, 180);
    },
    pause: function () { tone("sine", 440, 0.08, 0.15, 330); },
    whoosh: function () { noise(0.12, 0.12, "highpass", 900); }
  };

  global.LDDAudio = Sfx;
})(window);

/* Sound: synthesized feedback effects + procedural ambient stations (Web Audio, no files). */
const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, verbIn, current = null, schedTimer = null;
  let sfxVol = 0.6, musicVol = 0.35;
  const STATIONS = {
    pads: { name: "Soft pads", desc: "Slow warm chords" },
    rain: { name: "Rain on glass", desc: "Gentle rainfall" },
    lofi: { name: "Lo-fi keys", desc: "Mellow piano loop" },
    brown: { name: "Deep focus", desc: "Brown noise" },
  };
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
      const verb = ctx.createConvolver(); verb.buffer = impulse(3.2, 2.2);
      const wet = ctx.createGain(); wet.gain.value = 0.5; verbIn = ctx.createGain();
      verbIn.connect(verb); verb.connect(wet); wet.connect(musicBus);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function noiseBuf(kind, sec = 3) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else if (kind === "pink") { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.9; }
      else d[i] = w;
    }
    return b;
  }
  function tone(f, t0, dur, type = "sine", vol = 0.2, dest = sfxBus, glide = 0, attack = 0.01) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
    return g;
  }
  /* ---------- feedback effects ---------- */
  function correct() { if (!ensure()) return; const t = ctx.currentTime + 0.01; tone(784, t, 0.18, "sine", 0.22); tone(1175, t + 0.085, 0.34, "sine", 0.2); tone(2350, t + 0.085, 0.22, "sine", 0.035); tone(1568, t + 0.17, 0.3, "triangle", 0.05); }
  function wrong() { if (!ensure()) return; const t = ctx.currentTime + 0.01; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(sfxBus); tone(330, t, 0.2, "triangle", 0.22, lp, 247); tone(247, t + 0.13, 0.32, "triangle", 0.2, lp, 185); }
  function done() { if (!ensure()) return; const t = ctx.currentTime + 0.02; [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * 0.11, 0.5, "sine", 0.16); tone(f * 2, t + i * 0.11, 0.25, "sine", 0.03); }); }
  function tap() { if (!ensure()) return; tone(1400, ctx.currentTime + 0.005, 0.06, "sine", 0.04); }

  /* ---------- ambient ---------- */
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  function stop() {
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
    if (current) {
      const nodes = current.nodes; const t = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0, t, 0.4);
      setTimeout(() => nodes.forEach(n => { try { n.stop && n.stop(); } catch (e) { } try { n.disconnect(); } catch (e) { } }), 1800);
      current = null;
    }
  }
  function play(id) {
    if (!ensure()) return false; stop();
    const nodes = [], st = { id, nodes, next: ctx.currentTime + 0.1, step: 0 };
    const out = ctx.createGain(); out.gain.value = 1; out.connect(musicBus); out.connect(verbIn); nodes.push(out); st.out = out;
    if (id === "rain" || id === "brown") {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf(id === "rain" ? "pink" : "brown", 4); src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = id === "rain" ? 5200 : 700;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = id === "rain" ? 300 : 30;
      const g = ctx.createGain(); g.gain.value = id === "rain" ? 0.55 : 0.9;
      src.connect(hp); hp.connect(f); f.connect(g); g.connect(musicBus); src.start(); nodes.push(src, f, hp, g);
      if (id === "rain") {
        const r2 = ctx.createBufferSource(); r2.buffer = noiseBuf("brown", 4); r2.loop = true; const g2 = ctx.createGain(); g2.gain.value = 0.45; r2.connect(g2); g2.connect(musicBus); r2.start(); nodes.push(r2, g2);
      }
    }
    current = st;
    const t = ctx.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(musicBus.gain.value, t); musicBus.gain.linearRampToValueAtTime(musicVol, t + 2.5);
    schedTimer = setInterval(() => schedule(st), 120); schedule(st);
    return true;
  }
  function pad(f, t0, dur, out) {
    [-7, 7].forEach(cent => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "triangle"; o.frequency.value = f; o.detune.value = cent; lp.type = "lowpass"; lp.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 2.2); g.gain.setValueAtTime(0.05, t0 + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 3);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 3.2);
    });
  }
  function key(f, t0, vol, out) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2; g2.gain.value = 0.18; lp.type = "lowpass"; lp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(out); o.start(t0); o2.start(t0); o.stop(t0 + 2.5); o2.stop(t0 + 2.5);
  }
  const PADS = [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 49, 52, 54]];   // Dmaj7 Bm7 Gmaj7 A6
  const LOFI = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];   // Fmaj7 Em7 Dm7 Cmaj7
  function schedule(st) {
    if (current !== st) return;
    const ahead = ctx.currentTime + 0.6;
    while (st.next < ahead) {
      const t0 = st.next;
      if (st.id === "pads") {
        const ch = PADS[st.step % 4]; ch.forEach(n => pad(NOTE(n), t0, 7.5, st.out)); pad(NOTE(ch[0] - 12), t0, 7.5, st.out);
        if (st.step % 2 === 1) key(NOTE(ch[3] + 12), t0 + 3.5, 0.03, st.out);
        st.next += 8; st.step++;
      } else if (st.id === "lofi") {
        const beat = 60 / 68, bar = Math.floor(st.step / 8), pos = st.step % 8, ch = LOFI[bar % 4];
        if (pos === 0) { ch.forEach((n, i) => key(NOTE(n), t0 + i * 0.03, 0.05, st.out)); key(NOTE(ch[0] - 12), t0, 0.07, st.out); }
        if ([3, 5, 6].includes(pos) && Math.random() < 0.8) key(NOTE(ch[(pos + bar) % 4] + 12), t0, 0.035, st.out);
        if (pos % 2 === 0) crackle(t0, st.out);
        st.next += beat / 2; st.step++;
      } else if (st.id === "rain") {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) { const tt = t0 + Math.random() * 0.25; tone(1800 + Math.random() * 2600, tt, 0.05 + Math.random() * 0.05, "sine", 0.006 + Math.random() * 0.01, st.out, 0, 0.003); }
        st.next += 0.25;
      } else { st.next += 1; }
    }
  }
  function crackle(t0, out) {
    for (let i = 0; i < 3; i++) { if (Math.random() < 0.6) { const tt = t0 + Math.random() * 0.4; tone(3000 + Math.random() * 4000, tt, 0.012, "square", 0.004, out, 0, 0.001); } }
  }
  function setSfxVol(v) { sfxVol = v; if (sfxBus) sfxBus.gain.value = v; }
  function setMusicVol(v) { musicVol = v; if (musicBus && current) musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.2); }
  return { STATIONS, correct, wrong, done, tap, play, stop, setSfxVol, setMusicVol, playing: () => !!current, station: () => current && current.id, ensure };
})();

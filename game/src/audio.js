// All sound is synthesised with WebAudio: no audio files, no network.
// Engine hum, siren, gunshot, pickup blip and a lazy sunset bassline.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  // A slow Am–F–C–G bassline with a soft pluck on top, one bar every 2 s.
  const BASS = [110, 87.31, 130.81, 98];
  const PLUCK = [440, 523.25, 659.25, 392];
  let bar = 0;
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const root = BASS[bar % 4];
      tone(root, 1.8, 'triangle', 0.12);
      tone(root * 2, 0.4, 'sine', 0.05);
      tone(PLUCK[(bar * 2) % 4], 0.5, 'sine', 0.06);
      tone(PLUCK[(bar * 2 + 1) % 4], 0.5, 'sine', 0.05);
      bar += 1;
    }, 2000);
  }

  function engine(on, speed) {
    if (!ensure()) return;
    if (!on) {
      if (engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; }
      return;
    }
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain.gain.value = 0.03;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    engineOsc.frequency.value = 55 + Math.abs(speed) * 0.16;
    engineGain.gain.value = muted ? 0 : 0.02 + Math.abs(speed) * 0.00004;
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); startMusic(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    get muted() { return muted; },
    engine,
    shot() { noise(0.12, 0.35, 2500); tone(180, 0.1, 'square', 0.12, 60); },
    punch() { noise(0.08, 0.25, 800); },
    pickup() { tone(660, 0.12, 'sine', 0.2, 990); },
    cash() { tone(880, 0.1, 'sine', 0.18); window.setTimeout(() => tone(1320, 0.14, 'sine', 0.18), 90); },
    siren() { tone(700, 0.5, 'sine', 0.06, 950); },
    crash() { noise(0.25, 0.4, 500); },
    busted() { tone(220, 0.5, 'sawtooth', 0.15, 110); },
    mission() { tone(523, 0.15, 'sine', 0.2); window.setTimeout(() => tone(784, 0.25, 'sine', 0.2), 140); },
  };
}

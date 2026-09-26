// Sound effects, synthesized with the Web Audio API - no audio files. Each
// sound is a short list of "voices": a tone (waveform + pitch sweep) or a
// noise burst, each with its own start time, length and volume. Tuning a
// sound = editing its entry in SOUNDS.
//
// Safe everywhere: without Web Audio (tests, old browsers) every call is a
// no-op. Browsers only allow audio after a user gesture, so the context is
// created / resumed on the first click (unlockAudio, wired in main.ts).

type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface Voice {
  /** Tone waveform, or 'noise' for a filtered noise burst. */
  wave: Wave | 'noise';
  /** Start pitch in Hz (noise: the filter's centre frequency). */
  freq: number;
  /** Pitch at the end (a sweep); omit to hold. */
  to?: number;
  /** Seconds after the sound starts. */
  at?: number;
  /** Length in seconds. */
  dur: number;
  /** 0..1, before the master / sound volume. */
  vol?: number;
}

interface SoundDef {
  voices: Voice[];
  /** Minimum ms between two plays - keeps rapid events from stacking. */
  gap: number;
}

// Notes for the little arpeggios (C major-ish, bright but not shrill).
const C5 = 523, E5 = 659, G5 = 784, A5 = 880, C6 = 1047, E6 = 1319, G6 = 1568;

export const SOUNDS = {
  // Frequent - short and soft.
  hit: { gap: 45, voices: [{ wave: 'noise', freq: 1800, dur: 0.05, vol: 0.35 }, { wave: 'square', freq: 420, to: 260, dur: 0.05, vol: 0.12 }] },
  kill: { gap: 90, voices: [{ wave: 'triangle', freq: 660, to: 990, dur: 0.07, vol: 0.3 }, { wave: 'noise', freq: 3000, dur: 0.06, vol: 0.18 }] },
  // Rewards - brighter, a little longer.
  levelUp: { gap: 600, voices: [
    { wave: 'square', freq: C5, dur: 0.08, vol: 0.18 },
    { wave: 'square', freq: E5, at: 0.07, dur: 0.08, vol: 0.18 },
    { wave: 'square', freq: G5, at: 0.14, dur: 0.14, vol: 0.2 },
  ] },
  digivolve: { gap: 800, voices: [
    { wave: 'sawtooth', freq: 220, to: 880, dur: 0.45, vol: 0.12 },
    { wave: 'triangle', freq: C6, at: 0.4, dur: 0.12, vol: 0.28 },
    { wave: 'triangle', freq: E6, at: 0.5, dur: 0.12, vol: 0.28 },
    { wave: 'triangle', freq: G6, at: 0.6, dur: 0.3, vol: 0.3 },
  ] },
  hatch: { gap: 500, voices: [
    { wave: 'noise', freq: 2400, dur: 0.06, vol: 0.3 },
    { wave: 'noise', freq: 2400, at: 0.12, dur: 0.06, vol: 0.3 },
    { wave: 'triangle', freq: G5, at: 0.24, to: C6, dur: 0.22, vol: 0.3 },
  ] },
  questReady: { gap: 800, voices: [
    { wave: 'sine', freq: A5, dur: 0.12, vol: 0.3 },
    { wave: 'sine', freq: E6, at: 0.1, dur: 0.25, vol: 0.28 },
  ] },
  residentJoined: { gap: 800, voices: [
    { wave: 'triangle', freq: C5, dur: 0.1, vol: 0.25 },
    { wave: 'triangle', freq: G5, at: 0.1, dur: 0.1, vol: 0.25 },
    { wave: 'triangle', freq: C6, at: 0.2, dur: 0.1, vol: 0.25 },
    { wave: 'triangle', freq: E6, at: 0.3, dur: 0.3, vol: 0.28 },
  ] },
  // Bosses.
  bossStart: { gap: 1000, voices: [
    { wave: 'sawtooth', freq: 110, to: 82, dur: 0.5, vol: 0.2 },
    { wave: 'square', freq: 220, at: 0.05, to: 165, dur: 0.45, vol: 0.1 },
    { wave: 'noise', freq: 400, dur: 0.35, vol: 0.2 },
  ] },
  bossWin: { gap: 1000, voices: [
    { wave: 'square', freq: C5, dur: 0.12, vol: 0.2 },
    { wave: 'square', freq: E5, at: 0.12, dur: 0.12, vol: 0.2 },
    { wave: 'square', freq: G5, at: 0.24, dur: 0.12, vol: 0.2 },
    { wave: 'square', freq: C6, at: 0.36, dur: 0.45, vol: 0.22 },
    { wave: 'triangle', freq: G6, at: 0.36, dur: 0.45, vol: 0.12 },
  ] },
  bossLose: { gap: 1000, voices: [
    { wave: 'triangle', freq: 392, to: 370, dur: 0.22, vol: 0.25 },
    { wave: 'triangle', freq: 330, at: 0.22, to: 311, dur: 0.22, vol: 0.25 },
    { wave: 'triangle', freq: 262, at: 0.44, to: 196, dur: 0.5, vol: 0.25 },
  ] },
  // UI.
  uiOpen: { gap: 60, voices: [{ wave: 'sine', freq: 880, to: 1175, dur: 0.05, vol: 0.12 }] },
} satisfies Record<string, SoundDef>;

export type SoundName = keyof typeof SOUNDS;

// ---- Settings (per browser) --------------------------------------------
const SETTINGS_KEY = 'digiclicker-sound';

function loadSettings(): { volume: number; muted: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      volume: typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : 0.5,
      muted: saved.muted === true,
    };
  } catch {
    return { volume: 0.5, muted: false };
  }
}

export const soundSettings: { volume: number; muted: boolean } = $state(loadSettings());

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(soundSettings));
  } catch {
    // not remembered - fine
  }
}

export function setVolume(volume: number): void {
  soundSettings.volume = Math.min(1, Math.max(0, volume));
  if (master) master.gain.value = soundSettings.volume;
  saveSettings();
}

export function setMuted(muted: boolean): void {
  soundSettings.muted = muted;
  saveSettings();
}

// ---- Engine --------------------------------------------------------------
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const lastPlayed: Partial<Record<SoundName, number>> = {};
let suppressed = 0;

/** Create / resume the audio context - must run inside a user gesture. */
export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = soundSettings.volume;
    master.connect(ctx.destination);
    // One second of white noise, reused by every noise voice.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

/** 'none' until the first gesture, then the audio context's state. */
export function audioState(): string {
  return ctx?.state ?? 'none';
}

/** Runs `fn` without any sounds - for catch-ups that replay many events
 * at once (offline progress). */
export function withSoundSuppressed<T>(fn: () => T): T {
  suppressed += 1;
  try {
    return fn();
  } finally {
    suppressed -= 1;
  }
}

function playVoice(voice: Voice, start: number): void {
  if (!ctx || !master) return;
  const t0 = start + (voice.at ?? 0);
  const t1 = t0 + voice.dur;
  const gain = ctx.createGain();
  // Quick attack, smooth exponential release - no clicks.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, voice.vol ?? 0.25), t0 + Math.min(0.01, voice.dur / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  gain.connect(master);

  if (voice.wave === 'noise') {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = voice.freq;
    filter.Q.value = 1.2;
    source.connect(filter);
    filter.connect(gain);
    source.start(t0, Math.random() * 0.5);
    source.stop(t1 + 0.02);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(voice.freq, t0);
  if (voice.to) osc.frequency.exponentialRampToValueAtTime(voice.to, t1);
  osc.connect(gain);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

/** Plays a sound - unless muted, suppressed, the tab is hidden, audio isn't
 * unlocked yet, or the same sound played within its `gap`. */
export function playSound(name: SoundName): void {
  if (!ctx || ctx.state !== 'running' || soundSettings.muted || suppressed > 0) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const now = performance.now();
  const sound: SoundDef = SOUNDS[name];
  if (now - (lastPlayed[name] ?? -Infinity) < sound.gap) return;
  lastPlayed[name] = now;
  const start = ctx.currentTime + 0.005;
  for (const voice of sound.voices) playVoice(voice, start);
}

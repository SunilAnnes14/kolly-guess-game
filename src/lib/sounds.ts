/**
 * KOLLYWOOD's retro cinema sound engine.
 *
 * Every sound is synthesised at runtime with the Web Audio API — no audio
 * files ship with the game. The palette is deliberately narrow: a mechanical
 * film projector, an analog camera, soft vintage percussion and a warm
 * string/organ bed. Nothing neon, nothing EDM, nothing like a mobile-game
 * notification.
 *
 *   🎞 projector click + whirr + reel rhythm   → effects bus
 *   🎻 warm keys / strings / chord stings       → music bus
 *
 * The player's preferences (on/off, master volume, music and effects) live in
 * localStorage, so a mute survives the whole session.
 */

export type SoundName =
  | "correct"
  | "solveComplete"
  | "firstPlace"
  | "secondPlace"
  | "thirdPlace"
  | "wrong"
  | "roundComplete"
  | "finalWinner";

type Bus = "music" | "fx";

export type SoundPreferences = {
  /** Master switch — 🔊 SOUND ON / 🔇 SOUND OFF. */
  enabled: boolean;
  /** Master volume, 0 – 1. */
  volume: number;
  /** 🎵 Music — the warm musical stings. */
  music: boolean;
  /** 🔊 Effects — the projector and camera mechanics. */
  effects: boolean;
};

const STORAGE_KEY = "kollywood.sound.v1";

const DEFAULTS: SoundPreferences = {
  enabled: true,
  volume: 0.7,
  music: true,
  effects: true,
};

/**
 * Relative loudness per cue. Everything is kept low and warm — a wrong answer
 * in particular must feel like a soft mechanical nudge, never an alarm.
 */
const LEVELS: Record<SoundName, number> = {
  correct: 0.45,
  wrong: 0.25,
  solveComplete: 0.6,
  firstPlace: 0.65,
  secondPlace: 0.5,
  thirdPlace: 0.4,
  roundComplete: 0.5,
  finalWinner: 0.7,
};

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.volume;
  return Math.min(1, Math.max(0, value));
}

function readPreferences(): SoundPreferences {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
    return {
      enabled: parsed.enabled ?? DEFAULTS.enabled,
      volume: clampVolume(parsed.volume ?? DEFAULTS.volume),
      music: parsed.music ?? DEFAULTS.music,
      effects: parsed.effects ?? DEFAULTS.effects,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let preferences: SoundPreferences = readPreferences();
const listeners = new Set<() => void>();

function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* private mode — keep going with in-memory settings */
  }
  applyPreferences();
  for (const listener of listeners) listener();
}

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let effectsBus: GainNode | null = null;
let reverbSend: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlockInstalled = false;

function buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Slightly brown-tinted noise reads warmer and less "digital" than pure white.
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.03 * white) / 1.03;
    data[i] = Math.max(-1, Math.min(1, last * 3.2 + white * 0.35));
  }
  return buffer;
}

function applyPreferences() {
  if (!context || !masterGain) return;
  const now = context.currentTime;
  const level = preferences.enabled ? preferences.volume : 0;
  masterGain.gain.setTargetAtTime(level, now, 0.02);
  musicBus?.gain.setTargetAtTime(preferences.music ? 1 : 0, now, 0.02);
  effectsBus?.gain.setTargetAtTime(preferences.effects ? 1 : 0, now, 0.02);
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  if (!context) {
    context = new Ctor();
    noiseBuffer = buildNoiseBuffer(context);

    // A gentle limiter keeps stacked cues from ever spiking the speakers.
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.18;
    limiter.connect(context.destination);

    masterGain = context.createGain();
    masterGain.connect(limiter);

    musicBus = context.createGain();
    effectsBus = context.createGain();
    musicBus.connect(masterGain);
    effectsBus.connect(masterGain);

    // A cheap plate: two feedback delays instead of a convolution impulse.
    reverbSend = context.createGain();
    const wet = context.createGain();
    wet.gain.value = 0.5;
    const damp = context.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2600;

    const taps: Array<[number, number]> = [
      [0.093, 0.42],
      [0.137, 0.36],
    ];
    for (const [time, feedback] of taps) {
      const delay = context.createDelay(1);
      delay.delayTime.value = time;
      const back = context.createGain();
      back.gain.value = feedback;
      reverbSend.connect(delay);
      delay.connect(back);
      back.connect(delay);
      delay.connect(damp);
    }
    damp.connect(wet);
    wet.connect(masterGain);

    applyPreferences();
  }

  // Browsers keep the context suspended until a gesture — poke it awake.
  if (context.state === "suspended") void context.resume();

  if (!unlockInstalled) {
    unlockInstalled = true;
    const unlock = () => {
      if (context?.state === "suspended") void context.resume();
    };
    for (const event of ["pointerdown", "keydown", "touchstart"]) {
      window.addEventListener(event, unlock, { passive: true });
    }
  }

  return context;
}

/* ------------------------------------------------------------------ */
/* Voices                                                              */
/* ------------------------------------------------------------------ */

type VoiceOptions = {
  at: number;
  duration: number;
  /** Peak gain before the cue's own level and the bus are applied. */
  peak: number;
};

function voiceOutput(ctx: AudioContext, bus: Bus, send: number): AudioNode {
  const target = bus === "music" ? musicBus : effectsBus;
  const out = ctx.createGain();
  out.gain.value = 1;
  if (target) out.connect(target);
  if (send > 0 && reverbSend) {
    const wet = ctx.createGain();
    wet.gain.value = send;
    out.connect(wet);
    wet.connect(reverbSend);
  }
  return out;
}

/**
 * One warm oscillator voice — keys, strings, the little organ swells.
 * `sweepTo` bends it (a rewind's falling pitch, a sting's lift).
 */
function tone(
  ctx: AudioContext,
  dest: AudioNode,
  opts: VoiceOptions & {
    freq: number;
    type?: OscillatorType;
    attack?: number;
    sweepTo?: number;
    detune?: number;
    filter?: { type: BiquadFilterType; freq: number; q?: number };
  },
) {
  const { at, duration, peak, attack = 0.012, freq } = opts;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(freq, at);
  if (opts.detune) osc.detune.value = opts.detune;
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, opts.sweepTo),
      at + duration,
    );
  }

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(amp);

  if (opts.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter.type;
    filter.frequency.setValueAtTime(opts.filter.freq, at);
    filter.Q.value = opts.filter.q ?? 1;
    amp.connect(filter);
    filter.connect(dest);
  } else {
    amp.connect(dest);
  }

  osc.start(at);
  osc.stop(at + duration + 0.05);
}

/**
 * One mechanical voice — the projector's flutter, the camera's flash, the
 * soft clatter of a reel. Filtered noise with an optional pitch glide, and an
 * optional steady pulse for the reel's rhythm.
 */
function noise(
  ctx: AudioContext,
  dest: AudioNode,
  opts: VoiceOptions & {
    filter: BiquadFilterType;
    freq: number;
    endFreq?: number;
    q?: number;
    attack?: number;
    pulses?: { count: number; every: number; decay?: number };
  },
) {
  const { at, duration, peak } = opts;
  const attack = opts.attack ?? 0.004;

  const fire = (start: number, gain: number) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter;
    filter.frequency.setValueAtTime(opts.freq, start);
    filter.Q.value = opts.q ?? 1;
    if (opts.endFreq) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, opts.endFreq),
        start + duration,
      );
    }

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, gain),
      start + attack,
    );
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    source.start(start);
    source.stop(start + duration + 0.05);
  };

  if (opts.pulses) {
    for (let i = 0; i < opts.pulses.count; i++) {
      const start = at + i * opts.pulses.every;
      if (start >= at + duration + 0.2) break;
      fire(start, peak * (opts.pulses.decay ?? 1) ** i);
    }
  } else {
    fire(at, peak);
  }
}

/* ------------------------------------------------------------------ */
/* Shared fragments — the KOLLYWOOD vocabulary                         */
/* ------------------------------------------------------------------ */

/** The frame-change tick of a mechanical projector. */
function projectorClick(ctx: AudioContext, at: number, gain: number) {
  noise(ctx, voiceOutput(ctx, "fx", 0.05), {
    at,
    duration: 0.05,
    peak: gain,
    filter: "bandpass",
    freq: 2200,
    q: 1.4,
  });
  tone(ctx, voiceOutput(ctx, "fx", 0.05), {
    at,
    duration: 0.05,
    peak: gain * 0.5,
    freq: 320,
    type: "square",
    filter: { type: "lowpass", freq: 1600 },
  });
}

/** A softer, lower sibling of the click — used for losses. */
function lowClick(ctx: AudioContext, at: number, gain: number) {
  noise(ctx, voiceOutput(ctx, "fx", 0.04), {
    at,
    duration: 0.09,
    peak: gain,
    filter: "lowpass",
    freq: 620,
  });
  tone(ctx, voiceOutput(ctx, "fx", 0.04), {
    at,
    duration: 0.09,
    peak: gain * 0.6,
    freq: 140,
    type: "triangle",
    sweepTo: 90,
  });
}

/** Analog camera shutter and the flash's little high-frequency hiss. */
function cameraFlash(ctx: AudioContext, at: number, gain: number) {
  noise(ctx, voiceOutput(ctx, "fx", 0.18), {
    at,
    duration: 0.03,
    peak: gain,
    filter: "bandpass",
    freq: 3600,
    q: 0.9,
  });
  noise(ctx, voiceOutput(ctx, "fx", 0.3), {
    at: at + 0.025,
    duration: 0.16,
    peak: gain * 0.55,
    filter: "highpass",
    freq: 2600,
    attack: 0.002,
  });
}

/** The steady flutter of film running past the gate. */
function projectorWhirr(
  ctx: AudioContext,
  at: number,
  duration: number,
  gain: number,
) {
  noise(ctx, voiceOutput(ctx, "fx", 0.1), {
    at,
    duration,
    peak: gain,
    filter: "bandpass",
    freq: 900,
    endFreq: 480,
    q: 3.2,
    attack: 0.05,
  });
  noise(ctx, voiceOutput(ctx, "fx", 0.08), {
    at,
    duration,
    peak: gain * 0.5,
    filter: "bandpass",
    freq: 240,
    q: 1.2,
    attack: 0.06,
  });
}

/** A short film-rewind wobble — descending, gentle, never an error buzzer. */
function rewind(ctx: AudioContext, at: number, duration: number, gain: number) {
  const out = voiceOutput(ctx, "fx", 0.12);
  noise(ctx, out, {
    at,
    duration,
    peak: gain,
    filter: "bandpass",
    freq: 2400,
    endFreq: 380,
    q: 2.6,
    attack: 0.01,
  });
  tone(ctx, out, {
    at,
    duration,
    peak: gain * 0.45,
    freq: 420,
    type: "sawtooth",
    sweepTo: 150,
    filter: { type: "lowpass", freq: 1200 },
  });
}

/** The soft heartbeat of a turning reel — a handful of ticks and a catch. */
function reelSpin(ctx: AudioContext, at: number, gain: number) {
  noise(ctx, voiceOutput(ctx, "fx", 0.12), {
    at,
    duration: 0.62,
    peak: gain,
    filter: "bandpass",
    freq: 1500,
    q: 1.1,
    pulses: { count: 5, every: 0.14, decay: 0.88 },
  });
}

/** Warm old-keyboard/strings bed for the musical stings. */
function warmChord(
  ctx: AudioContext,
  at: number,
  duration: number,
  gain: number,
  freqs: number[],
) {
  const out = voiceOutput(ctx, "music", 0.45);
  for (const [index, freq] of freqs.entries()) {
    tone(ctx, out, {
      at: at + index * 0.035,
      duration,
      peak: (gain / (freqs.length * 0.72)) * (1 - index * 0.12),
      freq,
      type: "triangle",
      attack: 0.05,
      detune: index % 2 === 0 ? -4 : 4,
      filter: { type: "lowpass", freq: 2400, q: 0.8 },
    });
    // A breath of sawtooth underneath gives the strings their age.
    tone(ctx, out, {
      at: at + index * 0.035,
      duration: duration * 0.9,
      peak: (gain / freqs.length) * 0.22,
      freq,
      type: "sawtooth",
      attack: 0.09,
      detune: index % 2 === 0 ? 7 : -7,
      filter: { type: "lowpass", freq: 1100, q: 0.7 },
    });
  }
}

/** A vintage soft-percussion accent — a brushed, muted thump. */
function softDrum(ctx: AudioContext, at: number, gain: number) {
  const out = voiceOutput(ctx, "music", 0.2);
  noise(ctx, out, {
    at,
    duration: 0.22,
    peak: gain,
    filter: "lowpass",
    freq: 900,
    attack: 0.006,
  });
  tone(ctx, out, {
    at,
    duration: 0.24,
    peak: gain * 0.7,
    freq: 120,
    type: "sine",
    sweepTo: 62,
  });
}

/* ------------------------------------------------------------------ */
/* The cues                                                            */
/* ------------------------------------------------------------------ */

/**
 * CLICK → CAMERA FLASH → PROJECTOR WHIRR → SHORT STING. Just over a second,
 * warm rather than triumphant — this one fires on every single correct part.
 */
function playCorrect(ctx: AudioContext, at: number, level: number) {
  projectorClick(ctx, at, 0.3 * level);
  cameraFlash(ctx, at + 0.06, 0.22 * level);
  projectorWhirr(ctx, at + 0.1, 0.55, 0.16 * level);
  warmChord(ctx, at + 0.26, 0.62, 0.34 * level, [392, 523.25, 659.25]);
  softDrum(ctx, at + 0.24, 0.16 * level);
}

/** Low click and a short rewind. "You lost one chance" — not "YOU FAILED". */
function playWrong(ctx: AudioContext, at: number, level: number) {
  lowClick(ctx, at, 0.5 * level);
  rewind(ctx, at + 0.08, 0.42, 0.34 * level);
}

/** All four cracked: projector start → flash → retro fanfare → reel click. */
function playSolveComplete(ctx: AudioContext, at: number, level: number) {
  projectorWhirr(ctx, at, 0.34, 0.18 * level);
  cameraFlash(ctx, at + 0.32, 0.34 * level);
  softDrum(ctx, at + 0.38, 0.3 * level);
  warmChord(ctx, at + 0.42, 1.15, 0.5 * level, [261.63, 329.63, 392, 523.25]);
  warmChord(ctx, at + 1.05, 0.85, 0.3 * level, [392, 523.25, 659.25]);
  reelSpin(ctx, at + 1.5, 0.16 * level);
  projectorClick(ctx, at + 2.05, 0.24 * level);
}

/** First board closed — an old title reveal, not an esports victory. */
function playFirstPlace(ctx: AudioContext, at: number, level: number) {
  projectorClick(ctx, at, 0.42 * level);
  cameraFlash(ctx, at + 0.09, 0.4 * level);
  warmChord(ctx, at + 0.16, 1.25, 0.62 * level, [
    329.63, 415.3, 493.88, 659.25,
  ]);
  softDrum(ctx, at + 0.16, 0.34 * level);
  reelSpin(ctx, at + 0.5, 0.14 * level);
  warmChord(ctx, at + 0.86, 0.9, 0.34 * level, [392, 523.25]);
  projectorClick(ctx, at + 1.66, 0.26 * level);
}

/** Short cinematic chord plus a camera click. */
function playSecondPlace(ctx: AudioContext, at: number, level: number) {
  warmChord(ctx, at, 0.62, 0.4 * level, [293.66, 349.23, 440]);
  cameraFlash(ctx, at + 0.06, 0.24 * level);
  projectorClick(ctx, at + 0.6, 0.2 * level);
}

/** Just a short projector click. */
function playThirdPlace(ctx: AudioContext, at: number, level: number) {
  projectorClick(ctx, at, 0.34 * level);
  lowClick(ctx, at + 0.09, 0.18 * level);
}

/** Reel → projector stop → chord. */
function playRoundComplete(ctx: AudioContext, at: number, level: number) {
  reelSpin(ctx, at, 0.24 * level);
  projectorWhirr(ctx, at + 0.5, 0.4, 0.2 * level);
  lowClick(ctx, at + 0.92, 0.42 * level);
  warmChord(ctx, at + 1.0, 1.1, 0.46 * level, [261.63, 329.63, 392, 523.25]);
  projectorClick(ctx, at + 1.72, 0.2 * level);
}

/** The end title of an old movie — projector, reel, warmth, final click. */
function playFinalWinner(ctx: AudioContext, at: number, level: number) {
  projectorWhirr(ctx, at, 0.6, 0.22 * level);
  reelSpin(ctx, at + 0.35, 0.18 * level);
  cameraFlash(ctx, at + 0.85, 0.34 * level);
  softDrum(ctx, at + 0.9, 0.32 * level);
  warmChord(ctx, at + 0.95, 1.4, 0.55 * level, [261.63, 329.63, 392, 493.88]);
  warmChord(ctx, at + 1.7, 1.3, 0.48 * level, [220, 261.63, 329.63, 440]);
  warmChord(ctx, at + 2.55, 1.6, 0.6 * level, [
    196, 246.94, 293.66, 392, 493.88,
  ]);
  reelSpin(ctx, at + 2.7, 0.16 * level);
  projectorClick(ctx, at + 3.9, 0.3 * level);
  warmChord(ctx, at + 3.95, 1.2, 0.28 * level, [196, 246.94, 392]);
}

const CUES: Record<
  SoundName,
  (ctx: AudioContext, at: number, level: number) => void
> = {
  correct: playCorrect,
  solveComplete: playSolveComplete,
  firstPlace: playFirstPlace,
  secondPlace: playSecondPlace,
  thirdPlace: playThirdPlace,
  wrong: playWrong,
  roundComplete: playRoundComplete,
  finalWinner: playFinalWinner,
};

/**
 * Fire one cue. Safe to call anywhere — it no-ops while sound is off, while
 * both buses are muted, and on any browser without Web Audio.
 */
export function playSound(name: SoundName): void {
  if (!preferences.enabled) return;
  if (!preferences.music && !preferences.effects) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const cue = CUES[name];
  if (!cue) return;
  cue(ctx, ctx.currentTime + 0.02, LEVELS[name]);
}

/** The hierarchy sting for a finishing position: 1 / 2 / 3, or nothing. */
export function playPlacementSound(placement: number | null): void {
  if (placement === 1) playSound("firstPlace");
  else if (placement === 2) playSound("secondPlace");
  else if (placement === 3) playSound("thirdPlace");
}

/* ------------------------------------------------------------------ */
/* Public settings API                                                 */
/* ------------------------------------------------------------------ */

export function getSoundPreferences(): SoundPreferences {
  return preferences;
}

export function setSoundPreferences(patch: Partial<SoundPreferences>): void {
  preferences = {
    ...preferences,
    ...patch,
    volume: clampVolume(patch.volume ?? preferences.volume),
  };
  persist();
}

/** Flip the master switch and return the new value. */
export function toggleSound(): boolean {
  setSoundPreferences({ enabled: !preferences.enabled });
  return preferences.enabled;
}

/** Subscribe to preference changes (for `useSyncExternalStore`). */
export function subscribeSoundPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A one-second taste of the sound design, for the settings preview button. */
export function previewSound(): void {
  playSound("correct");
}

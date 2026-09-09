// Tiny synthesized mechanical-keyboard sounds (Web Audio, no audio files).
//
// Two switch profiles + mute, chosen in Settings → Appearance → Key sounds:
//   - "brown": tactile brown switch — soft, round "thock", no bright click.
//   - "blue":  clicky blue switch — crisp bright "click" with a weighted clack.
//   - "off":   silent.
//
// "click" sounds key presses (buttons, toggles, nav); "pop" is the softer,
// lower confirm when adding an item to the cart.

const SOUND_KEY = "simplepos:sound"; // "brown" | "blue" | "off"

export type SoundProfile = "brown" | "blue" | "off";

export function soundProfile(): SoundProfile {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v === "blue" || v === "off" ? v : "brown";
  } catch {
    return "brown";
  }
}

export function setSoundProfile(profile: SoundProfile): void {
  try {
    localStorage.setItem(SOUND_KEY, profile);
  } catch {
    // Storage unavailable — profile lasts for the session.
  }
}

type Wave = OscillatorType;

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One quick decaying tone: freq sweeps `from` -> `to` over `dur` seconds. */
function tone(
  ac: AudioContext,
  type: Wave,
  from: number,
  to: number,
  dur: number,
  peak: number,
  at = 0,
): void {
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(from, 1), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  gain.gain.setValueAtTime(peak, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Throttle identical sounds fired within one gesture frame / rapid repeat so a
// flurry of taps doesn't turn into a machine gun.
const lastAt: Record<string, number> = {};
const MIN_GAP_MS = 35;

function brownClick(ac: AudioContext): void {
  // Soft round "thock": warm tactile bump + low weighted bottom-out.
  tone(ac, "triangle", 240, 115, 0.055, 0.2);
  tone(ac, "sine", 150, 72, 0.075, 0.11, 0.003);
  tone(ac, "sine", 70, 45, 0.05, 0.07, 0.008);
}

function brownPop(ac: AudioContext): void {
  tone(ac, "triangle", 400, 205, 0.07, 0.13);
  tone(ac, "sine", 720, 430, 0.04, 0.04, 0.006);
}

function blueClick(ac: AudioContext): void {
  // Crisp "click": bright transient tick + weighted clack landing.
  tone(ac, "triangle", 2600, 1400, 0.008, 0.05);
  tone(ac, "triangle", 1500, 620, 0.02, 0.1, 0.001);
  tone(ac, "sine", 320, 120, 0.06, 0.18, 0.002);
}

function bluePop(ac: AudioContext): void {
  tone(ac, "triangle", 620, 280, 0.07, 0.16);
  tone(ac, "sine", 1150, 680, 0.04, 0.05, 0.005);
}

function play(kind: "click" | "pop"): void {
  const profile = soundProfile();
  if (profile === "off") return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = performance.now();
  if (now - (lastAt[kind] ?? 0) < MIN_GAP_MS) return;
  lastAt[kind] = now;

  if (profile === "blue") {
    if (kind === "click") blueClick(ac);
    else bluePop(ac);
  } else {
    if (kind === "click") brownClick(ac);
    else brownPop(ac);
  }
}

export function playClick(): void {
  play("click");
}

export function playPop(): void {
  play("pop");
}

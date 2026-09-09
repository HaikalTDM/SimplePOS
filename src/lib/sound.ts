// Tiny synthesized mechanical-keyboard sounds (Web Audio, no audio files).
//
// Tuned like a tactile "brown" switch: a soft, round "thock" with a warm
// bump — no bright audible click.
// "click": the key press thock (buttons, toggles, nav).
// "pop":   the softer, lower confirm pop when adding an item to the cart.

const SOUND_KEY = "simplepos:sound"; // "on" | "off"

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable — sound stays on for the session.
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

function play(kind: "click" | "pop"): void {
  if (!soundEnabled()) return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = performance.now();
  if (now - (lastAt[kind] ?? 0) < MIN_GAP_MS) return;
  lastAt[kind] = now;

  if (kind === "click") {
    // Brown switch: a soft, round "thock" — no bright click, just a warm
    // tactile bump and a low weighted bottom-out.
    tone(ac, "triangle", 240, 115, 0.055, 0.2);
    tone(ac, "sine", 150, 72, 0.075, 0.11, 0.003);
    tone(ac, "sine", 70, 45, 0.05, 0.07, 0.008);
  } else {
    // Satisfying add-to-cart pop: pitch falls, rounded and soft.
    tone(ac, "triangle", 400, 205, 0.07, 0.13);
    tone(ac, "sine", 720, 430, 0.04, 0.04, 0.006);
  }
}

export function playClick(): void {
  play("click");
}

export function playPop(): void {
  play("pop");
}

import type { ThemeColors } from "../types";

// Runtime theming (§: user can pick a preset or custom bg/text/accent).
//
// The app's CSS is built from a small set of custom properties that are the
// *derived shades* of the three base colors (keycap sides, muted text, tints,
// card surfaces). This module derives those from bg/text/accent and writes
// them onto :root. Only --bg, --text and --accent are authored by the user;
// everything below is computed so any combination (light or dark) stays
// coherent and readable.

export interface ThemePreset {
  id: string;
  name: string;
  /** Null = the built-in Cream theme (no custom override). */
  colors: ThemeColors | null;
}

export const DEFAULT_PRESET_ID = "cream";

export const THEME_PRESETS: ThemePreset[] = [
  { id: "cream", name: "Cream", colors: null },
  { id: "sunrise", name: "Sunrise", colors: { bg: "#fbefe5", text: "#4a3526", accent: "#b96a47" } },
  { id: "mint", name: "Mint", colors: { bg: "#edf3ea", text: "#2e3a2c", accent: "#4e7b5c" } },
  { id: "ocean", name: "Ocean", colors: { bg: "#e9f0f6", text: "#22303e", accent: "#3d6b99" } },
  { id: "night", name: "Slate Night", colors: { bg: "#1f242b", text: "#e8e9ed", accent: "#7e9ccb" } },
  { id: "plum", name: "Midnight Plum", colors: { bg: "#271f2e", text: "#efe9f3", accent: "#9a7ec2" } },
];

// ---------- color math (hex in, hex/rgba out) ----------

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color "${hex}"`);
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, v));
}

/** Linear interpolation; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([
    clamp255(ar + (br - ar) * t),
    clamp255(ag + (bg - ag) * t),
    clamp255(ab + (bb - ab) * t),
  ]);
}

function channelLum(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG (0..1). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)]
    .sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Darken `hex` toward black until its contrast against `against` >= min. */
export function darkenUntil(hex: string, against: string, min: number): string {
  let out = hex;
  for (let t = 0; t <= 0.9 && contrastRatio(out, against) < min; t += 0.06) {
    out = mix(hex, "#000000", t);
  }
  return out;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------- derived palette ----------

const KEYS = [
  "bg",
  "text",
  "accent",
  "border",
  "text-muted",
  "bg-card",
  "bg-subtle",
  "accent-deep",
  "accent-ink",
  "keycap-primary-side",
  "keycap-neutral-side",
  "accent-tint",
  "accent-tint-soft",
  "accent-line",
  "ring-soft",
  "toggle-off",
  "focus-ring",
] as const;

export type ThemeVar = (typeof KEYS)[number];

/** Every :root variable this engine may override, so a reset can clear them. */
export const THEME_VARS: readonly ThemeVar[] = KEYS;

const WHITE = "#ffffff";
const BLACK = "#000000";

/**
 * Derive the full CSS palette from the three user colors. `bg` luminance
 * decides whether the theme is treated as light or dark so surfaces, borders,
 * muted text and accent-ink all flip to stay readable.
 */
export function buildThemeVars({ bg, text, accent }: ThemeColors): Record<ThemeVar, string> {
  const isDark = relativeLuminance(bg) < 0.42;

  const bgCard = isDark ? mix(bg, WHITE, 0.1) : WHITE;
  const bgSubtle = isDark ? mix(bg, WHITE, 0.055) : mix(bg, BLACK, 0.045);
  const border = isDark ? mix(text, bg, 0.22) : mix(text, bg, 0.12);
  const textMuted = isDark ? mix(text, bg, 0.5) : mix(text, bg, 0.62);
  // Button fill: deeper than accent, always AA for white text.
  const accentDeep = darkenUntil(mix(accent, BLACK, 0.18), WHITE, 5);
  // Text sitting on accent-tinted surfaces: dark slate on light themes,
  // lifted toward white on dark themes.
  const accentInk = isDark ? mix(accent, WHITE, 0.3) : accentDeep;
  const keycapPrimarySide = mix(accentDeep, BLACK, 0.14);
  const keycapNeutralSide = mix(bgCard, BLACK, isDark ? 0.18 : 0.16);
  const toggleOff = isDark ? mix(bg, WHITE, 0.2) : mix(WHITE, BLACK, 0.21);

  return {
    bg: bg.toLowerCase(),
    text: text.toLowerCase(),
    accent: accent.toLowerCase(),
    border,
    "text-muted": textMuted,
    "bg-card": bgCard,
    "bg-subtle": bgSubtle,
    "accent-deep": accentDeep,
    "accent-ink": accentInk,
    "keycap-primary-side": keycapPrimarySide,
    "keycap-neutral-side": keycapNeutralSide,
    "accent-tint": rgba(accent, 0.1),
    "accent-tint-soft": rgba(accent, 0.12),
    "accent-line": rgba(accent, 0.35),
    "ring-soft": `0 0 0 3px ${rgba(accent, 0.18)}`,
    "toggle-off": toggleOff,
    "focus-ring": accent,
  };
}

function toCssVar(key: ThemeVar): string {
  return `--${key}`;
}

/** Write a palette onto document :root. `null` resets to the CSS defaults
 *  (the Cream theme defined statically in variables.css). */
export function applyTheme(colors: ThemeColors | null): void {
  const root = document.documentElement;
  if (!colors) {
    for (const key of KEYS) root.style.removeProperty(toCssVar(key));
    return;
  }
  const vars = buildThemeVars(colors);
  for (const [key, value] of Object.entries(vars) as [ThemeVar, string][]) {
    root.style.setProperty(toCssVar(key), value);
  }
}

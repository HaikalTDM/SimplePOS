import { afterEach, describe, expect, it } from "vitest";
import {
  THEME_PRESETS,
  applyTheme,
  buildThemeVars,
  contrastRatio,
  darkenUntil,
  hexToRgb,
  mix,
  relativeLuminance,
  rgbToHex,
} from "./theme";

describe("color math", () => {
  it("parses and reformats hex", () => {
    expect(hexToRgb("#F5F1E8")).toEqual([245, 241, 232]);
    expect(() => hexToRgb("#fff")).toThrow();
    expect(rgbToHex(hexToRgb("#0a1b2c"))).toBe("#0a1b2c");
  });

  it("mixes linearly", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mix("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("computes WCAG luminance and contrast", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThanOrEqual(21);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(contrastRatio("#000000", "#ffffff"));
  });

  it("darkenUntil reaches the requested contrast", () => {
    const out = darkenUntil("#B96A47", "#ffffff", 5);
    expect(contrastRatio(out, "#ffffff")).toBeGreaterThanOrEqual(5);
  });
});

describe("presets", () => {
  it("offers a distinct set with valid hex colors", () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const p of THEME_PRESETS) {
      if (p.colors) {
        expect(hexToRgb(p.colors.bg)).toBeTruthy();
        expect(hexToRgb(p.colors.text)).toBeTruthy();
        expect(hexToRgb(p.colors.accent)).toBeTruthy();
        // bg/text must differ enough to be usable
        expect(contrastRatio(p.colors.bg, p.colors.text)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("buildThemeVars", () => {
  it("treats a light bg as a light theme (white cards)", () => {
    const vars = buildThemeVars({ bg: "#F5F1E8", text: "#2C2C2C", accent: "#6B7C99" });
    expect(vars["bg-card"]).toBe("#ffffff");
    // accent-deep keeps AA for the white-on-accent keycap buttons
    expect(contrastRatio(vars["accent-deep"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    // accent text used on tints is darker than the plain accent
    expect(relativeLuminance(vars["accent-ink"])).toBeLessThan(relativeLuminance(vars.accent));
  });

  it("treats a dark bg as a dark theme (lifted surfaces and accent ink)", () => {
    const vars = buildThemeVars({ bg: "#1F242B", text: "#E8E9ED", accent: "#7E9CCB" });
    expect(relativeLuminance(vars["bg-card"])).toBeGreaterThan(relativeLuminance(vars.bg));
    // text must stay readable on the lifted card
    expect(contrastRatio(vars.text, vars["bg-card"])).toBeGreaterThanOrEqual(4.5);
    // accent ink lifts toward white so it reads on dark tinted surfaces
    expect(relativeLuminance(vars["accent-ink"])).toBeGreaterThan(relativeLuminance(vars.accent));
  });

  it("keeps keycap side/tints derived from the accent", () => {
    const vars = buildThemeVars({ bg: "#F5F1E8", text: "#2C2C2C", accent: "#6B7C99" });
    expect(relativeLuminance(vars["keycap-primary-side"])).toBeLessThan(
      relativeLuminance(vars["accent-deep"]),
    );
    expect(vars["accent-tint"]).toContain("rgba(107, 124, 153");
    expect(vars["ring-soft"]).toContain("rgba(107, 124, 153, 0.18)");
  });
});

describe("applyTheme", () => {
  afterEach(() => applyTheme(null));

  it("writes derived variables onto :root and clears them on reset", () => {
    applyTheme({ bg: "#123456", text: "#FFFFFF", accent: "#ABCDEF" });
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--bg")).toBe("#123456");
    expect(root.style.getPropertyValue("--text")).toBe("#ffffff");
    expect(root.style.getPropertyValue("--accent")).toBe("#abcdef");
    expect(root.style.getPropertyValue("--ring-soft")).toContain("rgba(171, 205, 239, 0.18)");

    applyTheme(null);
    expect(root.style.getPropertyValue("--bg")).toBe("");
    expect(root.style.getPropertyValue("--accent-deep")).toBe("");
  });
});

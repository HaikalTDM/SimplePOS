import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const results = [];
let failures = 0;

function check(name, pass, detail = "") {
  results.push(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

function readDist(rel) {
  const p = join(DIST, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

const manifestName = existsSync(join(DIST, "manifest.webmanifest"))
  ? "manifest.webmanifest"
  : existsSync(join(DIST, "manifest.json"))
    ? "manifest.json"
    : null;

const manifestRaw = manifestName ? readDist(manifestName) : null;
let manifest = null;
try {
  manifest = manifestRaw ? JSON.parse(manifestRaw) : null;
} catch {
  manifest = null;
}

check("dist/manifest.webmanifest (or .json) exists", Boolean(manifestRaw));
check(
  'manifest "name" is "SimplePOS"',
  manifest?.name === "SimplePOS",
  manifest ? `got "${manifest.name}"` : "missing manifest"
);
check(
  'manifest "display" is "standalone"',
  manifest?.display === "standalone",
  manifest ? `got "${manifest.display}"` : ""
);
check('manifest "start_url" is "/"', manifest?.start_url === "/", manifest ? `got "${manifest.start_url}"` : "");
check(
  'manifest "background_color" is "#F5F1E8"',
  (manifest?.background_color ?? "").toUpperCase() === "#F5F1E8",
  manifest ? `got "${manifest.background_color}"` : ""
);
check(
  'manifest "theme_color" is "#6B7C99"',
  (manifest?.theme_color ?? "").toUpperCase() === "#6B7C99",
  manifest ? `got "${manifest.theme_color}"` : ""
);
const iconSizes = new Set((manifest?.icons ?? []).map((i) => i.sizes));
check(
  'manifest icons include 192x192 and 512x512',
  iconSizes.has("192x192") && iconSizes.has("512x512"),
  [...iconSizes].join(", ") || "no icons"
);

const sw = readDist("sw.js");
check("dist/sw.js exists", Boolean(sw));

let precacheUrls = [];
if (sw) {
  const match = sw.match(/precacheAndRoute\(([\s\S]*?)\],/);
  if (match) {
    precacheUrls = [...match[1].matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
  }
}

const precacheSet = new Set(precacheUrls);
const hashed = (re) => precacheUrls.some((u) => re.test(u));

check(
  "precache includes index.html",
  precacheSet.has("index.html"),
  `${precacheUrls.length} precache entries`
);
check(
  "precache includes a hashed JS asset",
  hashed(/^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.js$/),
  precacheUrls.filter((u) => u.endsWith(".js")).join(", ") || "none"
);
check(
  "precache includes a hashed CSS asset",
  hashed(/^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.css$/),
  precacheUrls.filter((u) => u.endsWith(".css")).join(", ") || "none"
);
const woff2 = precacheUrls.filter((u) => u.endsWith(".woff2"));
check(
  "precache includes woff2 font assets",
  woff2.length > 0,
  woff2.length > 0 ? `${woff2.length} font files` : "no woff2 in precache"
);

console.log(results.join("\n"));
if (failures > 0) {
  console.log(`\nverify:pwa FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`\nverify:pwa OK — all checks passed (${precacheUrls.length} precache entries).`);

# Task 1 Report — SimplePOS Foundation Scaffold

Status: DONE

## Files created

Config / root:
- package.json (name simplepos, private, type module; scripts: dev/build/preview/typecheck/test)
- tsconfig.json, tsconfig.app.json, tsconfig.node.json (Vite react-ts strict layout: bundler resolution, ES2022, react-jsx, noUnusedLocals/Params)
- vite.config.ts (plugin-react + VitePWA autoUpdate, devOptions enabled, manifest per SPEC §64, inline vitest config via `/// <reference types="vitest/config" />`)
- index.html (lang en, viewport-fit=cover, title SimplePOS, theme-color #6B7C99, favicon /icons/icon.svg)
- .gitignore (node_modules, dist, dev-dist, *.local)
- vercel.json (SPA rewrite all → /index.html)

Source:
- src/main.tsx (StrictMode + BrowserRouter + fontsource imports: jetbrains-mono 400/600/700, dm-sans 400/500, poppins 400/500/600; styles)
- src/App.tsx (all 8 SPEC §7 routes; "/" → Navigate to /pos)
- src/vite-env.d.ts (vite/client types — required for CSS side-effect imports under TS 7)
- src/pages/: OnboardingPage, DashboardPage, PosPage ("POS"), ProductsPage, SalesPage, SaleDetailPage, ExpensesPage, SettingsPage (placeholder divs)
- src/styles/variables.css (SPEC §12 palette + neutral shades + keycap/motion/type tokens)
- src/styles/base.css (reset, body, focus-visible, selection, reduced-motion)
- src/styles/components.css (placeholder header comment for Task 3)
- src/test/setup.ts (jest-dom/vitest + fake-indexeddb/auto)
- src/test/smoke.test.tsx (renders App in MemoryRouter at /pos, asserts getByText("POS"))

PWA:
- public/icons/icon.svg (slate rounded square, cream keycap, amber bar)
- scripts/gen-icons.mjs (pure Node, node:zlib only, manual PNG encoder: IHDR/IDAT/IEND + CRC32, 3x3 supersampled AA, maskable = art at 80% on full-bleed square)
- public/icons/icon-192.png (1040 bytes), icon-512.png (3564 bytes), maskable-512.png (2631 bytes)

## Installed dependency versions

runtime: react 19.2.8, react-dom 19.2.8, react-router-dom 7.18.3, vite-plugin-pwa 1.3.0, @fontsource/{jetbrains-mono,dm-sans,poppins} 5.3.0 — dev: typescript 7.0.2, vite 8.2.2, @vitejs/plugin-react 6.1.1, vitest 5.0.0, jsdom 29.1.1, @testing-library/react 16.3.3, @testing-library/jest-dom 7.0.1, @testing-library/user-event 14.6.7, @testing-library/dom 6.6.x (peer, see concerns), fake-indexeddb 6.2.5, @types/react 19.2.18, @types/react-dom 19.2.7

## Commands run

1. `npm install react react-dom react-router-dom vite-plugin-pwa @fontsource/*` → PASS (348 pkgs, 0 vulns)
2. `npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/* fake-indexeddb @types/*` → FAIL (ERESOLVE: plugin-react 6.1.1 peerOptional chain wants @babel/core@8, workbox-build pins @babel/core@7)
3. Same dev install with `--legacy-peer-deps` → PASS (74 pkgs, 0 vulns)
4. `npm install -D @testing-library/dom --legacy-peer-deps` → PASS (10 pkgs; required peer of RTL 16 / jest-dom 7 that step 3 skipped)
5. `node scripts/gen-icons.mjs` → PASS (3 PNGs written)
6. `npm run typecheck` (`tsc -b --noEmit`) → first run FAIL (TS2882 CSS side-effect imports; TS2305 RTL16 dropped `screen` export) → fixed with src/vite-env.d.ts + render() return queries → PASS
7. `npm run test` → PASS (1 test, 33ms)
8. `npm run build` → PASS (42 modules, sw.js + workbox runtime + manifest.webmanifest emitted, icons copied to dist/icons, precache 8 entries)

## Skipped

- No ESLint (spec doesn't require it)
- No README yet (deferred to a later task; not requested for Task 1)
- No extra config files beyond the list

## Concerns

1. `--legacy-peer-deps` was required because latest @vitejs/plugin-react (6.x, built for Vite 8/rolldown) conflicts with workbox-build's Babel 7 pin (via vite-plugin-pwa). Runtime build + tests all pass; a future npm update that re-resolves deps may need the flag again. Could be avoided by pinning plugin-react@5 + vite@7 if it ever bites.
2. Added `@testing-library/dom` as a devDependency although not on the task's list — it is a hard peer of the listed testing libs and vitest fails without it.
3. `tsc -b --noEmit` works fine on TypeScript 7.0.2 (native tsc).
4. @fontsource weight css files bundle all language subsets (latin + latin-ext + cyrillic + greek + vietnamese + devanagari, woff + woff2). CSS is self-hosted and offline-safe per spec, but build size could shrink later by importing `*-latin.css` files only.
5. maskable icon uses `sizes: "any"` per instructions; some strict validators prefer "512x512". Installability unaffected.

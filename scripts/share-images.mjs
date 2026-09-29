#!/usr/bin/env node
/**
 * Correcoes-validacao AC 67: draws the share card (`public/og-image.png`, 1200 × 630) and the iOS
 * home-screen icon (`public/apple-touch-icon.png`, 180 × 180) with the installed Chrome (or Edge)
 * headless, from the title screen's colours, fonts and the favicon's mark. Run by hand when the
 * identity changes; the PNGs are committed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const font = (file) => pathToFileURL(join(PUBLIC, "fonts", file)).href;
const FONTS = `
@font-face { font-family: "Exo 2"; src: url("${font("exo-2-latin-800-italic.woff2")}"); font-weight: 800; font-style: italic; }
@font-face { font-family: "Exo 2"; src: url("${font("exo-2-latin-700-italic.woff2")}"); font-weight: 700; font-style: italic; }
@font-face { font-family: "Barlow Semi Condensed"; src: url("${font("barlow-semi-condensed-latin-500-normal.woff2")}"); font-weight: 500; }
`;

/** The favicon's mark: the slanted F over the cyan bar. */
const MARK = (size, radius) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b3fb8"/>
      <stop offset="1" stop-color="#07123a"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="${radius}" fill="url(#bg)"/>
  <path d="M22 50 L29 14 H48 L46.6 21 H35.4 L34 28.4 H44 L42.6 35.4 H32.6 L29.6 50 Z" fill="#ffffff"/>
  <rect x="10" y="54" width="44" height="3" rx="1.5" fill="#38d6ff"/>
</svg>`;

const OG = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body {
  display: flex; align-items: center; gap: 64px; padding: 0 96px; box-sizing: border-box;
  background: radial-gradient(ellipse 120% 90% at 50% -10%, #0c2a78 0%, #06163f 40%, #020817 85%);
  font-family: "Barlow Semi Condensed", sans-serif; color: #eaf1ff;
}
body::after {
  content: ""; position: fixed; left: 0; right: 0; bottom: 0; height: 220px;
  background: radial-gradient(ellipse 70% 100% at 50% 100%, rgba(31, 194, 87, 0.22), transparent 70%);
}
.mark { flex: none; filter: drop-shadow(0 18px 36px rgba(0, 0, 0, 0.55)); }
.logo {
  font-family: "Exo 2", sans-serif; font-weight: 800; font-style: italic; line-height: 0.9; margin: 0;
  font-size: 150px;
  background: linear-gradient(180deg, #ffffff 0%, #e9f0ff 42%, #8fb0f5 50%, #dbe6ff 58%, #ffffff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 7px 0 #0a2a8a) drop-shadow(0 14px 28px rgba(0, 0, 0, 0.6));
}
.logo span { display: block; font-size: 0.4em; letter-spacing: 0.08em; margin-top: 0.12em; }
.tagline {
  display: inline-block; margin-top: 34px; padding: 8px 26px;
  font-family: "Exo 2", sans-serif; font-weight: 700; font-style: italic; text-transform: uppercase;
  letter-spacing: 0.3em; font-size: 26px; color: #38d6ff;
  border-top: 2px solid rgba(56, 214, 255, 0.6); border-bottom: 2px solid rgba(56, 214, 255, 0.6);
}
.note { margin-top: 22px; font-size: 30px; color: #9fb3e6; }
</style></head><body>
<div class="mark">${MARK(300, 12)}</div>
<div>
  <h1 class="logo">Forzion <span>FutManager</span></h1>
  <div class="tagline">Manager de futebol</div>
  <div class="note">No navegador, com clubes e jogadores fictícios</div>
</div>
</body></html>`;

// iOS rounds the corners itself: the icon is full bleed.
const ICON = `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: 180px; height: 180px; overflow: hidden; background: #07123a; }
svg { display: block; }
</style></head><body>${MARK(180, 0)}</body></html>`;

const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) {
  console.error("share-images: Chrome ou Edge não encontrado (defina CHROME_PATH)");
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "share-images-"));
try {
  for (const [name, html, width, height] of [
    ["og-image.png", OG, 1200, 630],
    ["apple-touch-icon.png", ICON, 180, 180],
  ]) {
    const page = join(work, `${name}.html`);
    writeFileSync(page, html);
    const out = join(PUBLIC, name);
    const r = spawnSync(
      exe,
      [
        "--headless=new",
        `--user-data-dir=${join(work, "profile")}`,
        "--no-first-run",
        "--disable-extensions",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--virtual-time-budget=3000",
        `--window-size=${width},${height}`,
        `--screenshot=${out}`,
        pathToFileURL(page).href,
      ],
      { stdio: "ignore", timeout: 60000 },
    );
    if (r.status !== 0 || !existsSync(out)) {
      console.error(`share-images: ${name} não foi gerado (saída ${r.status})`);
      process.exitCode = 1;
    } else console.log(`share-images: ${name} ${width} × ${height}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { cacheVersion, precacheList, serviceWorkerSource } from "./build";

/** A build output with the files of C1, each holding its own name. */
function fakeDist(): string {
  const dir = mkdtempSync(join(tmpdir(), "pwa-build-"));
  for (const file of [
    "index.html",
    "sw.js",
    "manifest.webmanifest",
    "favicon.svg",
    "icon-192.png",
    "og-image.png",
    "assets/app-x1.js",
    "assets/app-x1.css",
    "fonts/exo.woff2",
    "audio/music/abertura.mp3",
  ]) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), file);
  }
  return dir;
}

describe("service worker no build (offline-instalar)", () => {
  test("lista do cache", () => {
    // C1 (AC 1): everything but the worker, the share card and the music; `./` first, then sorted.
    const dir = fakeDist();
    try {
      expect(precacheList(dir)).toEqual([
        "./",
        "./assets/app-x1.css",
        "./assets/app-x1.js",
        "./favicon.svg",
        "./fonts/exo.woff2",
        "./icon-192.png",
        "./index.html",
        "./manifest.webmanifest",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("versão do cache", () => {
    // C2 (AC 2): 12 hex digits, stable for the same build, different when one byte changes.
    const dir = fakeDist();
    try {
      const list = precacheList(dir);
      const v = cacheVersion(dir, list);
      expect(v).toMatch(/^[0-9a-f]{12}$/);
      expect(cacheVersion(dir, list)).toBe(v);
      writeFileSync(join(dir, "assets/app-x1.js"), "assets/app-x2.js");
      const changed = cacheVersion(dir, list);
      expect(changed).toMatch(/^[0-9a-f]{12}$/);
      expect(changed).not.toBe(v);
      const source = serviceWorkerSource(v, list);
      expect(source).toContain(`const PREFIX = "forzion-futmanager-";`);
      expect(source).toContain(`const CACHE = PREFIX + "${v}";`);
      expect(source).toContain(`const PRECACHE = ${JSON.stringify(list)};`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

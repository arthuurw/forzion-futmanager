#!/usr/bin/env node
/**
 * The match sounds measured in a real browser: serves `scripts/audio-check.html` with the Vite dev
 * server, renders every effect and the crowd offline in headless Chrome (or Edge) through the real
 * Web Audio backend, and exits 1 naming every sound that clips or hisses.
 *
 * Limits: no sample above PEAK_MAX anywhere; the crowd (ambience and crowd-*) keeps at most
 * HISS_4K of its energy above 4 kHz, and the ambience, which plays the whole match, at most
 * AMBIENCE_2K above 2 kHz. White noise gave the ambience 30% above 2 kHz: it hissed.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4181;
const HOST = "127.0.0.1";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PEAK_MAX = 0.9;
export const HISS_4K = 0.05;
export const AMBIENCE_2K = 0.12;
const BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portFree(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: HOST });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(true));
  });
}

async function until(what, check, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > end) throw new Error(`timeout: ${what}`);
    await sleep(150);
  }
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGKILL");
}

/** What is wrong with one rendered sound, if anything. */
export function problems(r) {
  const out = [];
  if (r.peak > PEAK_MAX) out.push(`pico ${r.peak.toFixed(2)} > ${PEAK_MAX}`);
  const crowd = r.name.startsWith("crowd-") || r.name.startsWith("ambience");
  if (crowd && r.above4k > HISS_4K) out.push(`${(r.above4k * 100).toFixed(1)}% acima de 4 kHz > ${HISS_4K * 100}%`);
  if (r.name === "ambience" && r.above2k > AMBIENCE_2K) out.push(`${(r.above2k * 100).toFixed(1)}% acima de 2 kHz > ${AMBIENCE_2K * 100}%`);
  return out;
}

async function main() {
  let server = null;
  let browser = null;
  let profile = null;
  let failed = false;
  try {
    if (!(await portFree(PORT))) throw new Error(`a porta ${PORT} já está em uso`);
    server = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "--port", String(PORT), "--strictPort", "--host", HOST], { cwd: ROOT, stdio: "ignore" });
    const url = `http://${HOST}:${PORT}/scripts/audio-check.html`;
    await until("vite", () => fetch(url).then((r) => r.ok, () => false));

    const exe = BROWSERS.find((p) => existsSync(p));
    if (!exe) throw new Error("Chrome ou Edge não encontrado (defina CHROME_PATH)");
    profile = mkdtempSync(join(tmpdir(), "audio-check-"));
    browser = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--disable-extensions", "about:blank"], { stdio: "ignore" });
    const portFile = join(profile, "DevToolsActivePort");
    const devtools = await until("DevToolsActivePort", () => existsSync(portFile) && readFileSync(portFile, "utf8").split("\n")[0].trim());
    const target = await until("página", () =>
      fetch(`http://${HOST}:${devtools}/json/list`).then((r) => r.json().then((l) => l.find((t) => t.type === "page")), () => null),
    );
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error("DevTools inacessível")), { once: true });
    });
    let id = 0;
    const pending = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m.result);
        pending.delete(m.id);
      }
    });
    const send = (method, params = {}) => new Promise((resolve) => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
    await send("Page.navigate", { url });
    const text = await until(
      "sons renderizados",
      async () => {
        const r = await send("Runtime.evaluate", { expression: "document.getElementById('out')?.textContent ?? ''", returnByValue: true });
        const v = r?.result?.value ?? "";
        return v.startsWith("DONE") || v.startsWith("ERR") ? v : false;
      },
      120000,
    );
    ws.close();
    if (text.startsWith("ERR")) throw new Error(text);
    const results = JSON.parse(text.slice(4));
    for (const r of results) {
      const bad = problems(r);
      if (bad.length) failed = true;
      console.log(
        `${bad.length ? "FALHA" : "ok   "} ${r.name.padEnd(22)} pico ${r.peak.toFixed(2)} rms ${r.rms.toFixed(3)} >2k ${(r.above2k * 100).toFixed(1)}% >4k ${(r.above4k * 100).toFixed(1)}%${bad.length ? ` · ${bad.join("; ")}` : ""}`,
      );
    }
  } catch (e) {
    console.log(`ERRO ${e.message}`);
    failed = true;
  } finally {
    killTree(browser);
    killTree(server);
    await until("porta livre", () => portFree(PORT), 10000).catch(() => {
      console.log(`ERRO a porta ${PORT} continua ocupada`);
      failed = true;
    });
    if (profile) {
      await until("perfil removido", () => {
        try {
          rmSync(profile, { recursive: true, force: true });
          return true;
        } catch {
          return false;
        }
      }, 10000).catch(() => console.log(`aviso: perfil temporário não removido: ${profile}`));
    }
  }
  if (failed) {
    console.log("áudio: FALHA");
    process.exit(1);
  }
  console.log("áudio: nenhum som satura ou chia");
}

await main();

#!/usr/bin/env node
/**
 * Offline-instalar C7, C9: the build in a real browser, with and without the server. Builds the
 * app, serves it with `vite preview`, opens it in the installed Chrome (or Edge) headless over the
 * DevTools Protocol, asks Chrome whether the site is installable, waits for the service worker to
 * control the page, starts a game, stops the server and reloads: the title must offer
 * «Continuar», the squad must open and a round must be played to its screen, with no error
 * screen. Exits 1 at the first step that fails.
 *
 * Flags: `--no-build` reuses `dist/`.
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BROWSERS, HOST, PREVIEW_PORT, ROOT, connect, killTree, portFree, removeProfile, until } from "./layout-check.mjs";

const PROFILE_PREFIX = "offline-check-";

/** Clicks the first enabled, visible button whose text is `text`. */
const clickJs = (text) => `(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled && x.getClientRects().length > 0);
  if (!b) return false;
  b.click();
  return true;
})()`;
const enabledJs = (text) => `[...document.querySelectorAll("button")].some((x) => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled && x.getClientRects().length > 0)`;
const ERROR_SCREEN = `[...document.querySelectorAll("[role=alert]")].some((x) => x.textContent.includes("Algo deu errado"))`;
/** The game in slot 1 of the save, if any (varios-saves door 1). */
const SAVED = `new Promise((resolve) => {
  const open = indexedDB.open("forzion-futmanager");
  open.onerror = () => resolve(false);
  open.onsuccess = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains("saves")) { db.close(); resolve(false); return; }
    const get = db.transaction("saves").objectStore("saves").get("slot-1");
    get.onsuccess = () => { db.close(); resolve(!!get.result && !!get.result.userClubId); };
    get.onerror = () => { db.close(); resolve(false); };
  };
})`;
const CONTROLLED = `navigator.serviceWorker.controller !== null && caches.keys().then((keys) => keys.some((k) => k.startsWith("forzion-futmanager-")))`;

async function run({ build }) {
  let preview = null;
  let browser = null;
  let profile = null;
  let page = null;
  const step = (text) => console.log(`ok    ${text}`);
  try {
    if (!(await portFree())) throw new Error(`a porta ${PREVIEW_PORT} já está em uso`);
    if (build) execSync("npm run build", { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] });
    preview = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PREVIEW_PORT), "--strictPort", "--host", HOST], {
      cwd: ROOT,
      stdio: "ignore",
    });
    const base = `http://${HOST}:${PREVIEW_PORT}/`;
    await until("vite preview", () => fetch(base).then((r) => r.ok, () => false));

    const exe = BROWSERS.find((p) => existsSync(p));
    if (!exe) throw new Error("Chrome ou Edge não encontrado (defina CHROME_PATH)");
    profile = mkdtempSync(join(tmpdir(), PROFILE_PREFIX));
    browser = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], {
      stdio: "ignore",
    });
    const portFile = join(profile, "DevToolsActivePort");
    const devtools = await until("DevToolsActivePort", () => existsSync(portFile) && readFileSync(portFile, "utf8").split("\n")[0].trim());
    const target = await until("página do navegador", () =>
      fetch(`http://${HOST}:${devtools}/json/list`).then((r) => r.json().then((list) => list.find((t) => t.type === "page")), () => null),
    );
    page = await connect(target.webSocketDebuggerUrl);
    await page.send("Page.enable");
    const js = async (expression) => {
      const r = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    const wait = (what, expression, timeoutMs = 20000) => until(what, () => js(`(() => { try { return ${expression}; } catch { return false; } })()`), timeoutMs);
    const click = async (text) => {
      if (!(await js(clickJs(text)))) throw new Error(`sem o botão «${text}»`);
    };

    await page.send("Page.navigate", { url: base });
    await wait("tela inicial", enabledJs("Novo jogo"));
    await wait("service worker no controle", CONTROLLED, 30000);
    step("service worker controla a página e o cache está pronto");

    // C9: Chrome's own verdict on the manifest, the icons and the worker.
    const { installabilityErrors } = await page.send("Page.getInstallabilityErrors");
    if (installabilityErrors.length) throw new Error(`não instalável: ${installabilityErrors.map((e) => e.errorId).join(", ")}`);
    console.log("ok    instalável: sem erros");

    await click("Novo jogo");
    await wait("escolher clube", "document.querySelector('h1')?.textContent.trim() === 'Escolher clube'");
    await js("document.querySelector('.club-card').click()");
    await wait("elenco", enabledJs("Mercado"));
    await wait("jogo gravado", SAVED);
    step("jogo novo gravado com o servidor no ar");

    killTree(preview);
    preview = null;
    await until("servidor fora do ar", () => portFree(), 10000);
    step("servidor derrubado");

    await page.send("Page.reload", { ignoreCache: false });
    await wait("título sem rede", enabledJs("Continuar"), 30000);
    step("sem rede: título com «Continuar»");
    await click("Continuar");
    await wait("elenco sem rede", enabledJs("Jogar rodada"));
    step("sem rede: elenco aberto");
    await click("Jogar rodada");
    await wait("partida sem rede", enabledJs("Pular para o fim"));
    await click("Pular para o fim");
    await wait("rodada sem rede", `${enabledJs("Escalação")} && document.querySelector('h1')?.textContent.trim().startsWith('Rodada')`, 30000);
    if (await js(ERROR_SCREEN)) throw new Error("tela de erro sem rede");
    step("sem rede: rodada jogada até a tela da rodada");
    return true;
  } catch (e) {
    console.log(`FALHA ${e.message}`);
    // What the page showed when it failed, to tell a blank page from the browser's offline page.
    const seen = await page
      ?.send("Runtime.evaluate", { expression: "location.href + ' | ' + document.title + ' | ' + (document.body?.innerText ?? '').slice(0, 200).replace(/\s+/g, ' ')", returnByValue: true })
      .then((r) => r.result.value, () => null);
    if (seen) console.log(`      página: ${seen}`);
    return false;
  } finally {
    if (page) page.close();
    killTree(browser);
    killTree(preview);
    if (profile && !(await removeProfile(profile))) console.log(`ERRO perfil temporário não removido: ${profile}`);
  }
}

const ok = await run({ build: !process.argv.includes("--no-build") });
if (!ok) process.exit(1);
console.log("offline: o jogo abre e joga sem rede");

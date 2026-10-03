#!/usr/bin/env node
/**
 * Door 1 of ajustes-audio: AD-010 measured in a real browser. Builds the app, serves it with
 * `vite preview`, drives the installed Chrome (or Edge) headless over the DevTools Protocol at
 * 400 × 700 px through the 11 screens and the Copa screen's continental tab, and exits 1 naming every screen that scrolls, that cuts a
 * sound switch, or (title screen) whose switches overlap the title, the tagline or the menu.
 *
 * Flags: `--no-build` reuses `dist/`; `--inject=<screen>` adds an 800 px tall element to that
 * screen (the selftest's broken screen); `--seed=<n>` plays the game of seed n, 1 by default
 * (correcoes-validacao AC 60): the page opens with `?seed=<n>` and the script prints `seed <n>` as
 * read back from the saved game. The Chrome profile is a `layout-check-*` folder in the temp
 * directory, removed on every exit (AC 64).
 */
import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PREVIEW_PORT = 4179;
export const HOST = "127.0.0.1";
const WIDTH = 400;
const HEIGHT = 700;
/** Correcoes-validacao AC 64: a loaded machine can take long to settle the entrance animations. */
export const ANIMATION_TIMEOUT_MS = 20000;
export const PROFILE_PREFIX = "layout-check-";
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True when nothing accepts a connection on the port. */
export function portFree(port = PREVIEW_PORT, host = HOST) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(true));
  });
}

export async function until(what, check, timeoutMs = 20000, everyMs = 100) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > end) throw new Error(`timeout: ${what}`);
    await sleep(everyMs);
  }
}

export function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGKILL");
}

/** A minimal DevTools Protocol client over Node's global WebSocket. */
export async function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let next = 0;
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    const p = msg.id !== undefined && pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error(`cannot connect to ${url}`)), { once: true });
  });
  return {
    send(method, params = {}) {
      const id = ++next;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

/** Helpers defined in the page: find and click buttons by their text, measure the layout. */
const PAGE_HELPERS = `window.__lc = {
  buttons: (text) => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === text && b.getClientRects().length > 0),
  has: (text) => __lc.buttons(text).length > 0,
  enabled: (text) => __lc.buttons(text).some((b) => !b.disabled),
  click(text) {
    const b = __lc.buttons(text).find((x) => !x.disabled);
    if (!b) throw new Error("no enabled button " + text);
    b.click();
    return true;
  },
  h1: () => document.querySelector("h1")?.textContent.trim() ?? "",
  settled: () => document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== "running"),
  rect: (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  },
  measure() {
    const doc = document.scrollingElement ?? document.documentElement;
    const toggles = [...document.querySelectorAll(".audio-toggles button")].map((b) => ({ name: b.textContent.trim(), ...__lc.rect(b) }));
    const group = document.querySelector(".audio-toggles");
    const title = [".title-screen .logo-big", ".title-screen .tagline", ".title-screen .menu button"].flatMap((s) =>
      [...document.querySelectorAll(s)].map((el) => ({ name: s.split(" ").pop() + (el.tagName === "BUTTON" ? " «" + el.textContent.trim() + "»" : ""), ...__lc.rect(el) })),
    );
    const posicao = document.querySelector("select[aria-label='Posição']");
    const dialog = document.querySelector("[role=alertdialog]");
    const loanLists = ["Emprestados por você", "Emprestados a você"].filter((l) => document.querySelector("table[aria-label='" + l + "']"));
    const install = [...document.querySelectorAll(".about h3")].find((h) => h.textContent.trim() === "Instalar")?.nextElementSibling ?? null;
    return {
      scrollHeight: doc.scrollHeight,
      scrollWidth: doc.scrollWidth,
      toggles,
      group: group ? __lc.rect(group) : null,
      title,
      posicao: posicao ? __lc.rect(posicao) : null,
      dialog: dialog ? __lc.rect(dialog) : null,
      loanLists,
      install: install ? { text: install.textContent.trim(), ...__lc.rect(install) } : null,
    };
  },
  inject() {
    const el = document.createElement("div");
    el.setAttribute("data-layout-check", "injected");
    el.style.cssText = "height:800px;flex:none;";
    document.querySelector(".screen").appendChild(el);
    return true;
  },
  /** Puts an available player, not already starting, in the first starter slot that has none (as a manager would). */
  repick() {
    const selects = [...document.querySelectorAll("select[aria-label^='Titular']")];
    const used = new Set(selects.map((x) => x.value));
    const bad = selects.find((x) => !x.value || x.selectedOptions[0]?.disabled);
    const pick = bad && [...bad.options].find((o) => o.value && !o.disabled && !used.has(o.value));
    if (!pick) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(bad, pick.value);
    bad.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  },
};
true`;

const within = (r) => r.left >= 0 && r.top >= 0 && r.right <= WIDTH && r.bottom <= HEIGHT && r.right > r.left && r.bottom > r.top;
const crosses = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** The problems AC 1-3 find in one measurement. */
function problems(screen, m) {
  const out = [];
  if (m.scrollHeight > HEIGHT) out.push(`scrollHeight ${m.scrollHeight} > ${HEIGHT}`);
  if (m.scrollWidth > WIDTH) out.push(`scrollWidth ${m.scrollWidth} > ${WIDTH}`);
  for (const name of ["Música", "Efeitos"]) {
    const t = m.toggles.find((x) => x.name === name);
    if (!t) out.push(`sem o botão «${name}»`);
    else if (!within(t)) out.push(`«${name}» fora da janela (${fmt(t)})`);
  }
  // Ajustes-substituicao C5: the field shown after the user's red card is on screen too.
  if (screen === "liveRed") {
    if (!m.posicao) out.push("sem o campo «Posição»");
    else if (!within(m.posicao)) out.push(`«Posição» fora da janela (${fmt(m.posicao)})`);
  }
  if (screen === "home" || screen === "homeSave") {
    if (m.title.length < 3) out.push("título, subtítulo ou menu não encontrados");
    for (const t of m.title) if (m.group && crosses(m.group, t)) out.push(`botões de som sobre ${t.name}`);
  }
  // Emprestimos C23: the loan confirmation on screen; both lists of the «Emprestados» tab filled.
  if (screen === "squadLoan") {
    if (!m.dialog) out.push("sem a confirmação de empréstimo");
    else if (!within(m.dialog)) out.push(`confirmação fora da janela (${fmt(m.dialog)})`);
  }
  if (screen === "marketLoans" && m.loanLists.length !== 2) out.push(`listas de emprestados: ${m.loanLists.length} de 2`);
  // Offline-instalar C11: «Sobre» shows what follows the «Instalar» heading (the button when Chrome
  // invites, the browser's menu otherwise) inside the window.
  if (screen === "about") {
    if (!m.install) out.push("sem a seção «Instalar»");
    else if (!within(m.install)) out.push(`seção «Instalar» fora da janela (${fmt(m.install)})`);
  }
  // Ajustes-saves C8: with a game saved, the title menu shows «Jogos salvos» on screen.
  if (screen === "homeSave") {
    const saves = m.title.find((t) => t.name === "button «Jogos salvos»");
    if (!saves || !within(saves)) out.push("sem o botão «Jogos salvos»");
  }
  return out;
}

const fmt = (r) => `${Math.round(r.left)},${Math.round(r.top)}-${Math.round(r.right)},${Math.round(r.bottom)}`;

/** Noticias C16: the label of the round's «Notícias (n)» tab when n > 0, else null. */
const NEWS_TAB = `(() => {
  const tab = [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent.trim().startsWith("Notícias ("));
  const n = tab ? Number(tab.textContent.trim().slice("Notícias (".length, -1)) : 0;
  return n > 0 ? tab.textContent.trim() : null;
})()`;

/** Emprestimos C23: clicks «Emprestar» row by row until one opens the confirmation (the others are refused). */
const LEND = `(async () => {
  for (const b of [...document.querySelectorAll("button[aria-label^='Emprestar ']")]) {
    b.click();
    await new Promise((r) => setTimeout(r, 50));
    if (document.querySelector("[role=alertdialog][aria-label='Confirmar empréstimo']")) return true;
  }
  return false;
})()`;

/** Emprestimos C23: picks market players, strongest first, until one is a reserve, and takes him on loan. */
const BORROW = `(async () => {
  for (const b of [...document.querySelectorAll("table[aria-label='Mercado'] button.link")]) {
    b.click();
    await new Promise((r) => setTimeout(r, 20));
    const take = [...document.querySelectorAll("button")].find((x) => x.textContent.startsWith("Pegar emprestado"));
    if (take) {
      take.click();
      return true;
    }
  }
  return false;
})()`;

/** The seed of the game in the page's save, read back from IndexedDB. */
/** Carreira-dinamica C20: writes `pendingJob` (3 other clubs) and `boardWarnings` into the saved game. */
const jobInSave = (reason, warnings) => `new Promise((resolve) => {
  const open = indexedDB.open("forzion-futmanager");
  open.onerror = () => resolve(false);
  open.onsuccess = () => {
    const db = open.result;
    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");
    const get = store.get("slot-1");
    get.onsuccess = () => {
      const s = get.result;
      const ids = s.leagues.flatMap((l) => l.clubs.map((c) => c.id)).filter((id) => id !== s.userClubId).slice(0, 3);
      s.pendingJob = { reason: "${reason}", clubIds: ids };
      s.boardWarnings = ${warnings};
      store.put(s, "slot-1");
    };
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); resolve(false); };
  };
})`;

const SAVED_SEED = `new Promise((resolve) => {
  const open = indexedDB.open("forzion-futmanager");
  open.onerror = () => resolve(null);
  open.onsuccess = () => {
    const db = open.result;
    try {
      const get = db.transaction("saves").objectStore("saves").get("slot-1");
      get.onsuccess = () => { db.close(); resolve(get.result?.seed ?? null); };
      get.onerror = () => { db.close(); resolve(null); };
    } catch { db.close(); resolve(null); }
  };
})`;

/** Removes the Chrome profile, retrying while the browser still holds its files. */
export async function removeProfile(profile) {
  const gone = await until("perfil removido", () => {
    try {
      rmSync(profile, { recursive: true, force: true });
      return !existsSync(profile);
    } catch {
      return false;
    }
  }, 10000).catch(() => false);
  return gone;
}

async function run({ build, inject, seed }) {
  const failures = [];
  const measured = new Set();
  let preview = null;
  let browser = null;
  let profile = null;
  let page = null;
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
    // Whatever way the process ends, the profile does not stay behind (AC 64).
    process.once("exit", () => {
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        // the finally below already reported it
      }
    });
    browser = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], {
      stdio: "ignore",
    });
    const portFile = join(profile, "DevToolsActivePort");
    const devtools = await until("DevToolsActivePort", () => existsSync(portFile) && readFileSync(portFile, "utf8").split("\n")[0].trim());
    const target = await until("página do navegador", () =>
      fetch(`http://${HOST}:${devtools}/json/list`).then((r) => r.json().then((list) => list.find((t) => t.type === "page")), () => null),
    );
    page = await connect(target.webSocketDebuggerUrl);
    await page.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await page.send("Page.navigate", { url: `${base}?seed=${seed}` });

    const js = async (expression) => {
      const r = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    const wait = (what, expression, timeoutMs) => until(what, () => js(`(() => { try { return ${expression}; } catch { return false; } })()`), timeoutMs);
    const click = (text) => js(`__lc.click(${JSON.stringify(text)})`);
    const measure = async (screen) => {
      if (inject === screen) await js("__lc.inject()");
      await wait(`animações de ${screen}`, "__lc.settled()", ANIMATION_TIMEOUT_MS);
      const m = await js("__lc.measure()");
      const bad = problems(screen, m);
      const toggles =
        m.toggles.map((t) => `${t.name} ${fmt(t)}`).join(" · ") +
        (screen === "liveRed" && m.posicao ? ` · Posição ${fmt(m.posicao)}` : "") +
        (screen === "about" && m.install ? ` · Instalar «${m.install.text.slice(0, 30)}» ${fmt(m.install)}` : "");
      console.log(`${bad.length ? "FALHA" : "ok   "} ${screen.padEnd(10)} scrollHeight ${m.scrollHeight} scrollWidth ${m.scrollWidth} · ${toggles}${bad.length ? ` · ${bad.join("; ")}` : ""}`);
      if (bad.length) failures.push(screen);
      measured.add(screen);
    };

    await wait("página carregada", "document.readyState === 'complete' && !!document.querySelector('#root')");
    await js(PAGE_HELPERS);
    console.log(`Janela ${WIDTH} × ${HEIGHT} px (${exe})`);

    await wait("tela inicial", "__lc.enabled('Novo jogo')");
    await measure("home");
    await click("Novo jogo");
    await wait("escolher clube", "__lc.h1() === 'Escolher clube'");
    await measure("chooseClub");
    await js("document.querySelector('.club-card').click()");
    await wait("elenco", "__lc.enabled('Mercado')");
    const saved = await wait("jogo gravado", SAVED_SEED);
    console.log(`seed ${saved}`);
    if (saved !== seed) {
      console.log(`FALHA a semente gravada é ${saved}, pedida ${seed}`);
      failures.push("semente");
    }
    await measure("squad");
    for (const [button, screen, h1] of [
      ["Mercado", "market", "'Mercado'"],
      ["Finanças", "finance", "'Finanças'"],
      ["Histórico", "history", "'Histórico'"],
      ["Copa", "cup", "document.querySelector('.stage h1')?.textContent.startsWith('Copa')"],
    ]) {
      await click(button);
      await wait(screen, h1.startsWith("'") ? `__lc.h1() === ${h1}` : h1);
      // The Copa screen opens on the continental tab for a qualified club: measure each tab by name.
      if (screen === "cup") {
        await click("Copa Nacional");
        await wait("cup", "__lc.h1() === 'Copa Nacional'");
      }
      await measure(screen);
      if (screen === "cup") {
        // Copa-continental AC 23: the continental cup's tab, four phases with country codes.
        await click("Copa Continental");
        await wait("cupCont", "__lc.h1() === 'Copa Continental'");
        await measure("cupCont");
      }
      await click("Voltar ao elenco");
      await wait("elenco", "__lc.enabled('Mercado')");
    }

    // The season, date by date: each match skipped to the end (skipping is the user's own button).
    await click("Jogar rodada");
    for (let steps = 0; ; steps++) {
      if (steps > 300) throw new Error("a temporada não terminou em 300 passos");
      const state = await wait(
        "próxima tela",
        `__lc.h1() === 'Demitido' ? 'job' : __lc.has('Pular para o fim') ? 'live' : __lc.h1().startsWith('Fim da temporada') ? 'end' : __lc.has('Escalação') ? 'round' : __lc.has('Mercado') ? 'squad' : false`,
      );
      if (state === "end") break;
      // Carreira-dinamica C20: a sacking mid-season is measured and answered with the first offer.
      if (state === "job") {
        if (!measured.has("job")) await measure("job");
        await click("Assumir");
        await wait("elenco do clube novo", "__lc.enabled('Mercado')");
        continue;
      }
      if (state === "live") {
        if (!measured.has("live")) await measure("live");
        // Ajustes-substituicao C5: until the user's first red card, the match runs at 4x; the stop
        // it causes shows «Posição», measured once. Halftime goes on; an injury stop is skipped.
        if (!measured.has("liveRed")) {
          await click("4x");
          for (;;) {
            const moment = await wait(
              "lance da partida",
              `document.querySelector("select[aria-label='Posição']") && !__lc.has('Pausar') ? 'red' : !__lc.has('Pular para o fim') ? 'over' : document.querySelector("[role=status][aria-label='Parada']") ? 'stop' : __lc.enabled('Continuar') ? 'half' : false`,
              60000,
            );
            if (moment === "red") await measure("liveRed");
            if (moment === "half") {
              await click("Continuar");
              continue;
            }
            break;
          }
        }
        if (await js("__lc.has('Pular para o fim')")) {
          await click("Pular para o fim");
          await wait("resultado", "!__lc.has('Pular para o fim')");
        }
        continue;
      }
      if (state === "round" && !measured.has("round")) await measure("round");
      // Noticias C16: the first round with news, on its «Notícias» tab; then the Histórico's tab with them.
      const newsTab = state === "round" && !measured.has("roundNews") ? await js(NEWS_TAB) : null;
      if (newsTab) {
        await click(newsTab);
        await wait("aba notícias", "!!document.querySelector('[role=tabpanel][aria-label=\"Notícias\"] li')");
        await measure("roundNews");
        await click("Escalação");
        await wait("elenco", "__lc.enabled('Mercado')");
        await click("Histórico");
        await wait("histórico", "__lc.h1() === 'Histórico'");
        await js(`[...document.querySelectorAll("[role=tab]")].find((t) => t.textContent.trim() === "Notícias").click()`);
        await wait("histórico notícias", "!!document.querySelector('section[aria-label=\"Notícias\"] li')");
        await measure("historyNews");
        await click("Voltar ao elenco");
        await wait("elenco", "__lc.enabled('Mercado')");
        continue;
      }
      // Carreira-dinamica C20: an offer of a better club is measured once on the round and turned down.
      if (await js("!!document.querySelector('[role=dialog][aria-label=\"Proposta de emprego\"]')")) {
        if (state === "round" && !measured.has("roundOffer")) await measure("roundOffer");
        await click("Recusar");
        await wait("proposta recusada", "!document.querySelector('[role=dialog][aria-label=\"Proposta de emprego\"]')");
      }
      if (state === "round" && !(await js("__lc.enabled('Jogar rodada')"))) {
        await click("Escalação");
        await wait("elenco", "__lc.enabled('Mercado')");
      }
      if ((await js("__lc.has('Mercado')")) && !(await js("__lc.enabled('Jogar rodada')"))) {
        for (let slot = 0; slot < 11 && !(await js("__lc.enabled('Jogar rodada')")); slot++) {
          await js("__lc.repick()");
          await sleep(100);
        }
        await wait("escalação completa", "__lc.enabled('Jogar rodada')", 3000);
      }
      // A click while the last date is still being saved is ignored by the store: click again.
      const before = await js("__lc.h1()");
      const played = `__lc.h1() !== ${JSON.stringify(before)} || __lc.has('Pular para o fim')`;
      for (let tries = 0; ; tries++) {
        await click("Jogar rodada");
        if (await wait("data jogada", played, 2000).catch(() => false)) break;
        if (tries === 10) throw new Error(`data não jogada (${await js("__lc.h1()")})`);
      }
    }
    await measure("end");
    if (await js("!!document.querySelector('[aria-label=\"Propostas de emprego\"] button')")) {
      await js("document.querySelector('[aria-label=\"Propostas de emprego\"] button').click()");
    }
    await wait("próxima temporada", "__lc.enabled('Próxima temporada')");
    await click("Próxima temporada");
    await wait("nova temporada", "__lc.h1() === 'Nova temporada'", 30000);
    await measure("newSeason");
    if (!(await js(jobInSave("fired", 0)))) throw new Error("save not fired");

    // Lancamento AC 27: reloaded with a save, the title menu has its 5 buttons; then «Sobre».
    await page.send("Page.navigate", { url: base });
    await wait("página recarregada", "document.readyState === 'complete' && !!window.__lc === false");
    await js(PAGE_HELPERS);
    await wait("tela inicial com save", "__lc.enabled('Continuar') && __lc.enabled('Exportar jogo') && __lc.enabled('Sobre')");
    await measure("homeSave");
    await click("Sobre");
    await wait("sobre", "__lc.has('Voltar') && document.querySelector('.about') !== null");
    await measure("about");
    // Carreira-dinamica C20: the fired save opens on «Demitido»; «Assumir» leads to the new squad.
    await click("Voltar");
    await wait("tela inicial com save", "__lc.enabled('Continuar')");
    await click("Continuar");
    await wait("demitido", "__lc.h1() === 'Demitido'");
    if (!measured.has("job")) await measure("job");
    await click("Assumir");
    await wait("elenco do clube novo", "__lc.enabled('Mercado')");
    // Carreira-dinamica C20: the squad with an offer panel and the board's warning, both on screen at once.
    if (!(await js(jobInSave("offer", 3)))) throw new Error("save without offer");
    await page.send("Page.navigate", { url: base });
    await wait("página recarregada", "document.readyState === 'complete' && !!window.__lc === false");
    await js(PAGE_HELPERS);
    await wait("tela inicial com save", "__lc.enabled('Continuar')");
    await click("Continuar");
    await wait("elenco com proposta", "__lc.enabled('Recusar') && document.body.textContent.includes('Aviso da diretoria (3/3)')");
    await measure("squadOffer");
    await click("Recusar");
    await wait("proposta recusada", "!document.querySelector('[role=dialog][aria-label=\"Proposta de emprego\"]')");
    // Varios-saves C24: two more games fill the 3 slots; «Jogos salvos» is measured full, then
    // with the delete confirmation open.
    for (let game = 2; game <= 3; game++) {
      await click("Menu principal");
      await wait("tela inicial", "__lc.enabled('Novo jogo')");
      await click("Novo jogo");
      await wait("escolher clube", "__lc.h1() === 'Escolher clube'");
      await js("document.querySelector('.club-card').click()");
      await wait("elenco", "__lc.enabled('Mercado')");
    }
    await click("Menu principal");
    await wait("tela inicial", "__lc.enabled('Jogos salvos')");
    await click("Jogos salvos");
    await wait("jogos salvos", "document.querySelectorAll('.save-slot.ok').length === 3");
    await measure("saves");
    await js("document.querySelector('.save-slot.ok .save-actions button:not(.primary)').click()");
    await wait("confirmar apagar", "!!document.querySelector('[role=alertdialog][aria-label=\"Confirmar apagar\"]')");
    await measure("savesConfirm");
    await click("Cancelar");
    // Emprestimos C23: the newest game (round 1, market open): the squad with the loan confirmation
    // open, then the «Emprestados» tab with one player lent and one borrowed.
    await click("Voltar");
    await wait("tela inicial", "__lc.enabled('Continuar')");
    await click("Continuar");
    await wait("elenco", "__lc.enabled('Mercado')");
    if (!(await js(LEND))) throw new Error("nenhum jogador com destino de empréstimo");
    await measure("squadLoan");
    await click("Confirmar");
    await wait("emprestado", "!document.querySelector('[role=alertdialog]') && __lc.enabled('Mercado')");
    await click("Mercado");
    await wait("mercado", "__lc.h1() === 'Mercado'");
    if (!(await js(BORROW))) throw new Error("nenhum reserva para pegar emprestado");
    await wait("emprestado a você", "__lc.has('Emprestados (2)')");
    await click("Emprestados (2)");
    await wait("aba emprestados", "!!document.querySelector('table[aria-label=\"Emprestados a você\"]')");
    await measure("marketLoans");
  } catch (e) {
    console.log(`ERRO ${e.message}`);
    failures.push("erro");
  } finally {
    if (page) {
      await Promise.race([page.send("Browser.close").catch(() => {}), sleep(2000)]);
      page.close();
    }
    killTree(browser);
    killTree(preview);
    const freed = await until("porta livre", () => portFree(), 10000).catch(() => false);
    if (!freed) {
      console.log(`ERRO a porta ${PREVIEW_PORT} continua ocupada`);
      failures.push("porta");
    }
    if (profile && !(await removeProfile(profile))) {
      console.log(`ERRO perfil temporário não removido: ${profile}`);
      failures.push("perfil");
    }
  }
  const screens = ["home", "chooseClub", "squad", "market", "finance", "live", "round", "cup", "cupCont", "history", "end", "newSeason", "homeSave", "about", "job", "squadOffer", "liveRed", "saves", "savesConfirm", "squadLoan", "marketLoans", "roundNews", "historyNews"];
  return { failures, missing: screens.filter((s) => !measured.has(s)) };
}

async function main() {
  const args = process.argv.slice(2);
  const inject = args.find((a) => a.startsWith("--inject="))?.slice("--inject=".length) ?? null;
  const seedArg = args.find((a) => a.startsWith("--seed="))?.slice("--seed=".length) ?? "1";
  const seed = Number(seedArg);
  if (!Number.isSafeInteger(seed) || seed < 1) {
    console.log(`layout: --seed precisa ser um inteiro positivo (recebeu ${seedArg})`);
    process.exit(2);
  }
  const { failures, missing } = await run({ build: !args.includes("--no-build"), inject, seed });
  if (missing.length) console.log(`FALHA telas não medidas: ${missing.join(", ")}`);
  if (failures.length || missing.length) {
    console.log(`layout: FALHA em ${[...new Set([...failures, ...missing])].join(", ")}`);
    process.exit(1);
  }
  console.log("layout: as 23 telas cabem em 400 × 700 px");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) void main();

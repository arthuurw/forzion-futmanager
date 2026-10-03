import { runInNewContext } from "node:vm";
import { serviceWorkerSource } from "./build";

const ORIGIN = "https://jogo.test";
const BASE = `${ORIGIN}/forzion/`;
const VERSION = "abc123def456";
const CACHE = `forzion-futmanager-${VERSION}`;
const LIST = ["./", "./index.html", "./assets/app.js"];

/** A fake response that says which URL it answers and where it came from. */
const response = (from: string, url: string) => ({ from, url });
type Fake = ReturnType<typeof response>;
const abs = (r: string | { url: string }) => new URL(typeof r === "string" ? r : r.url, BASE).href;

/** Runs the generated worker against fake `self`, `caches` and `fetch`; returns its handlers and the fakes. */
function worker(online = true, seeded: Record<string, string[]> = {}) {
  const stores = new Map<string, Map<string, Fake>>();
  for (const [name, urls] of Object.entries(seeded)) stores.set(name, new Map(urls.map((u) => [abs(u), response("cache", abs(u))])));
  const cacheOf = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      addAll: (urls: string[]) => Promise.resolve(urls.forEach((u) => store.set(abs(u), response("cache", abs(u))))),
      match: (r: string | { url: string }) => Promise.resolve(store.get(abs(r))),
    };
  };
  const caches = {
    open: (name: string) => Promise.resolve(cacheOf(name)),
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
  };
  const fetch = vi.fn((r: { url: string }) => (online ? Promise.resolve(response("network", r.url)) : Promise.reject(new TypeError("Failed to fetch"))));
  const handlers = new Map<string, (e: unknown) => void>();
  const claim = vi.fn(() => Promise.resolve());
  const self = { addEventListener: (type: string, fn: (e: unknown) => void) => handlers.set(type, fn), location: { origin: ORIGIN }, clients: { claim } };
  runInNewContext(serviceWorkerSource(VERSION, LIST), { self, caches, fetch, URL, Promise, Response: { error: () => response("error", "") } });
  return { handlers, stores, fetch, claim };
}

/** Dispatches an extendable event and waits for what it handed to `waitUntil`. */
async function extendable(handler: (e: unknown) => void) {
  let done: Promise<unknown> = Promise.resolve();
  handler({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
}

/** Dispatches a fetch; returns the response handed to `respondWith`, or null when it was not called. */
async function request(handler: (e: unknown) => void, url: string, init: { method?: string; mode?: string } = {}): Promise<Fake | null> {
  let answer: Promise<Fake> | null = null;
  handler({ request: { url, method: init.method ?? "GET", mode: init.mode ?? "no-cors" }, respondWith: (p: Promise<Fake>) => (answer = p) });
  return answer ? await answer : null;
}

describe("service worker gerado (offline-instalar)", () => {
  test("instala o cache da versão", async () => {
    // C4 (AC 4): the 3 listed paths, in the cache of the version.
    const w = worker();
    await extendable(w.handlers.get("install")!);
    expect([...w.stores.keys()]).toEqual([CACHE]);
    expect([...w.stores.get(CACHE)!.keys()].sort()).toEqual(LIST.map((u) => abs(u)).sort());
  });

  test("ativa e apaga as versões velhas", async () => {
    // C5 (AC 5): only the game's other version goes; another site's cache stays; the page is claimed.
    const w = worker(true, { [CACHE]: LIST, "forzion-futmanager-velho000000": LIST, "outro-site": ["./x"] });
    await extendable(w.handlers.get("activate")!);
    expect([...w.stores.keys()].sort()).toEqual([CACHE, "outro-site"].sort());
    expect(w.claim).toHaveBeenCalledTimes(1);
  });

  test("responde da rede ou do cache", async () => {
    // C6 (AC 6, L-005): each kind of request.
    const online = worker(true, { [CACHE]: LIST });
    const offline = worker(false, { [CACHE]: LIST });
    const on = online.handlers.get("fetch")!;
    const off = offline.handlers.get("fetch")!;

    expect(await request(on, BASE, { mode: "navigate" }), "navegação com rede").toEqual(response("network", BASE));
    expect(await request(off, `${BASE}?seed=1`, { mode: "navigate" }), "navegação sem rede").toEqual(response("cache", abs("./index.html")));

    const asset = abs("./assets/app.js");
    expect(await request(on, asset), "arquivo no cache").toEqual(response("cache", asset));
    expect(online.fetch.mock.calls.map(([r]) => r.url), "arquivo no cache").not.toContain(asset);

    const music = abs("./audio/music/abertura.mp3");
    expect(await request(on, music), "fora do cache").toEqual(response("network", music));

    expect(await request(on, asset, { method: "POST" }), "POST").toBeNull();
    expect(await request(on, "https://outro.test/x.js"), "outro site").toBeNull();
  });
});

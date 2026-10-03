import { useSyncExternalStore } from "react";

/** Offline-instalar AC 3: only the production build registers the worker; a failure is silent. */
export function registerServiceWorker({ production, navigator }: { production: boolean; navigator: Partial<Pick<Navigator, "serviceWorker">> }): Promise<void> {
  if (!production || !navigator.serviceWorker) return Promise.resolve();
  return navigator.serviceWorker.register("./sw.js", { scope: "./" }).then(
    () => undefined,
    () => undefined,
  );
}

/** The browser's install invitation (Chrome and Edge only), kept from the moment it arrives. */
interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
}

/** Offline-instalar AC 10-12: what the «Instalar» section of «Sobre» shows. */
export type InstallState = "prompt" | "installed" | "none";

let invitation: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Listens from the start: the invitation may come before «Sobre» is ever opened. */
export function watchInstall(win: Window): void {
  win.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    invitation = e as InstallPrompt;
    emit();
  });
  win.addEventListener("appinstalled", () => {
    installed = true;
    invitation = null;
    emit();
  });
}

/** For tests: forgets the invitation and the installation. */
export function resetInstall(): void {
  invitation = null;
  installed = false;
  emit();
}

function currentState(): InstallState {
  const standalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  if (installed || standalone) return "installed";
  return invitation ? "prompt" : "none";
}

/** Offline-instalar AC 10: shows the browser's dialog once; the button goes whatever the answer. */
function install(): void {
  const shown = invitation;
  invitation = null;
  emit();
  void shown?.prompt().catch(() => undefined);
}

export function useInstall(): { state: InstallState; install: () => void } {
  const state = useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, currentState);
  return { state, install };
}

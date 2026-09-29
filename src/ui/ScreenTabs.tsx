import type { KeyboardEvent } from "react";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** Hidden on wide screens, where that panel is always visible. */
  mobileOnly?: boolean;
}

/** The id of the tab `tab` of the tab set `idBase`. */
export const tabId = (idBase: string, tab: string) => `${idBase}-tab-${tab}`;
/** The id of the panel tab `tab` controls; a set that swaps one panel's content uses `panelId(idBase)`. */
export const panelId = (idBase: string, tab?: string) => (tab === undefined ? `${idBase}-panel` : `${idBase}-panel-${tab}`);

/**
 * Correcoes-validacao AC 48: what a panel of the tab set `idBase` carries. A panel that already has
 * its own `aria-label` keeps it as its name; otherwise the tab names it.
 */
export function tabPanel(idBase: string, tab: string, { shared = false, named = false } = {}) {
  return {
    id: shared ? panelId(idBase) : panelId(idBase, tab),
    role: "tabpanel" as const,
    ...(named ? {} : { "aria-labelledby": tabId(idBase, tab) }),
  };
}

/** A tab the user can see: `mobileOnly` tabs are hidden by CSS on wide screens. */
function visible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0 || !el.classList.contains("mobile-only");
}

/**
 * Tabs that decide which panel is visible on narrow screens, so no screen ever needs page scroll.
 * Rendered as `role="tab"`, not buttons: they switch views, they do not act on the game.
 * Correcoes-validacao AC 48: each tab controls its panel (`aria-controls`), and the left and right
 * arrows move between the visible tabs. `shared` is for a set whose tabs swap the content of one panel.
 */
export function ScreenTabs<T extends string>({ idBase, tabs, active, onChange, hideOnDesktop = false, shared = false }: {
  idBase: string;
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  hideOnDesktop?: boolean;
  shared?: boolean;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')].filter(visible);
    const at = buttons.findIndex((b) => b.id === tabId(idBase, active));
    const next = buttons[(at + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
    const tab = next && tabs.find((t) => tabId(idBase, t.id) === next.id);
    if (!next || !tab) return;
    e.preventDefault();
    onChange(tab.id);
    next.focus();
  }

  return (
    <div role="tablist" className={`screen-tabs${hideOnDesktop ? " mobile-only" : ""}`} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={tabId(idBase, t.id)}
          role="tab"
          type="button"
          aria-selected={t.id === active}
          aria-controls={shared ? panelId(idBase) : panelId(idBase, t.id)}
          tabIndex={t.id === active ? 0 : -1}
          className={`tab${t.id === active ? " is-active" : ""}${t.mobileOnly ? " mobile-only" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

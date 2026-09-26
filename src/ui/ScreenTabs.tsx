export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** Hidden on wide screens, where that panel is always visible. */
  mobileOnly?: boolean;
}

/**
 * Tabs that decide which panel is visible on narrow screens, so no screen ever needs page scroll.
 * Rendered as `role="tab"`, not buttons: they switch views, they do not act on the game.
 */
export function ScreenTabs<T extends string>({ tabs, active, onChange, hideOnDesktop = false }: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  hideOnDesktop?: boolean;
}) {
  return (
    <div role="tablist" className={`screen-tabs${hideOnDesktop ? " mobile-only" : ""}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={t.id === active}
          className={`tab${t.id === active ? " is-active" : ""}${t.mobileOnly ? " mobile-only" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

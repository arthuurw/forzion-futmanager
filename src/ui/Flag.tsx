/**
 * Club "flag": 2-3 colour bands derived from the club id. UI-only - nothing is persisted,
 * so the save format (door 1) is untouched.
 */
const PALETTE = [
  "#e5322b", "#f5c400", "#19b347", "#2f7bff", "#ffffff", "#111111",
  "#7a1fa2", "#ff7a00", "#0b2a8a", "#8b0000", "#00a3a3", "#6b6b6b",
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ClubColors {
  primary: string;
  secondary: string;
  third: string;
  pattern: "vertical" | "horizontal" | "diagonal" | "cross";
}

export function clubColors(clubId: string): ClubColors {
  const h = hash(clubId);
  const primary = PALETTE[h % PALETTE.length]!;
  let secondary = PALETTE[(h >>> 4) % PALETTE.length]!;
  if (secondary === primary) secondary = primary === "#ffffff" ? "#111111" : "#ffffff";
  let third = PALETTE[(h >>> 8) % PALETTE.length]!;
  if (third === primary || third === secondary) third = secondary;
  const patterns: ClubColors["pattern"][] = ["vertical", "horizontal", "diagonal", "cross"];
  return { primary, secondary, third, pattern: patterns[(h >>> 12) % patterns.length]! };
}

export function Flag({ clubId, size = 24 }: { clubId: string; size?: number }) {
  const c = clubColors(clubId);
  const w = 30;
  const h = 20;
  let bands;
  switch (c.pattern) {
    case "vertical":
      bands = (
        <>
          <rect width={10} height={h} fill={c.primary} />
          <rect x={10} width={10} height={h} fill={c.secondary} />
          <rect x={20} width={10} height={h} fill={c.third} />
        </>
      );
      break;
    case "horizontal":
      bands = (
        <>
          <rect width={w} height={h} fill={c.primary} />
          <rect y={7} width={w} height={6} fill={c.secondary} />
        </>
      );
      break;
    case "diagonal":
      bands = (
        <>
          <rect width={w} height={h} fill={c.primary} />
          <polygon points={`0,${h} ${w},0 ${w},7 7,${h}`} fill={c.secondary} />
        </>
      );
      break;
    case "cross":
      bands = (
        <>
          <rect width={w} height={h} fill={c.primary} />
          <rect x={9} width={5} height={h} fill={c.secondary} />
          <rect y={7.5} width={w} height={5} fill={c.secondary} />
        </>
      );
      break;
  }
  return (
    <svg className="flag" viewBox={`0 0 ${w} ${h}`} width={size * 1.5} height={size} aria-hidden="true" focusable="false">
      {bands}
      <rect width={w} height={h} fill="none" stroke="rgba(0,0,0,.6)" strokeWidth={1.5} />
      <rect width={w} height={h / 2} fill="rgba(255,255,255,.18)" />
    </svg>
  );
}

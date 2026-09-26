import { clubIdentity, type FlagPattern } from "../engine/names";

/**
 * Club flag drawn from the club identity's colours (engine/names). A name with no identity
 * falls back to colours hashed from the id. UI-only: nothing here is persisted.
 */
const PALETTE = ["#d7141a", "#f5c400", "#0b6e2c", "#1446b8", "#ffffff", "#111111", "#7a1fa2", "#ff7a00"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function look(clubId: string, name: string): { colors: string[]; pattern: FlagPattern } {
  const identity = clubIdentity(name);
  if (identity) return { colors: [...identity.colors], pattern: identity.pattern };
  const h = hash(clubId);
  const a = PALETTE[h % PALETTE.length]!;
  let b = PALETTE[(h >>> 4) % PALETTE.length]!;
  if (b === a) b = a === "#ffffff" ? "#111111" : "#ffffff";
  return { colors: [a, b], pattern: "vertical" };
}

export function Flag({ clubId, name, size = 24 }: { clubId: string; name: string; size?: number }) {
  const { colors, pattern } = look(clubId, name);
  const [c1, c2 = c1, c3 = c2] = colors as [string, string?, string?];
  const w = 30;
  const h = 20;
  let bands;
  switch (pattern) {
    case "vertical":
      bands =
        colors.length >= 3 ? (
          <>
            <rect width={10} height={h} fill={c1} />
            <rect x={10} width={10} height={h} fill={c2} />
            <rect x={20} width={10} height={h} fill={c3} />
          </>
        ) : (
          <>
            <rect width={w} height={h} fill={c1} />
            <rect x={6} width={6} height={h} fill={c2} />
            <rect x={18} width={6} height={h} fill={c2} />
          </>
        );
      break;
    case "horizontal":
      bands = (
        <>
          <rect width={w} height={h} fill={c1} />
          <rect y={6.5} width={w} height={7} fill={c2} />
          {colors.length >= 3 && <rect y={13.5} width={w} height={6.5} fill={c3} />}
        </>
      );
      break;
    case "hoops":
      bands = (
        <>
          <rect width={w} height={h} fill={c1} />
          <rect y={4} width={w} height={4} fill={c2} />
          <rect y={12} width={w} height={4} fill={c2} />
          {colors.length >= 3 && <rect y={9} width={w} height={2} fill={c3} />}
        </>
      );
      break;
    case "diagonal":
      bands = (
        <>
          <rect width={w} height={h} fill={c1} />
          <polygon points={`0,${h} ${w},0 ${w},7 7,${h}`} fill={c2} />
          {colors.length >= 3 && <polygon points={`0,${h - 3} ${w - 3},0 ${w},0 3,${h}`} fill={c3} />}
        </>
      );
      break;
    case "cross":
      bands = (
        <>
          <rect width={w} height={h} fill={c1} />
          <rect x={9} width={5} height={h} fill={c2} />
          <rect y={7.5} width={w} height={5} fill={c2} />
        </>
      );
      break;
  }
  return (
    <svg className="flag" viewBox={`0 0 ${w} ${h}`} width={size * 1.5} height={size} aria-hidden="true" focusable="false">
      {bands}
      <rect width={w} height={h} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={1.2} />
      <rect width={w} height={h / 2} fill="rgba(255,255,255,.16)" />
    </svg>
  );
}

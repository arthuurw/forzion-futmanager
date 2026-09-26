import type { Condition } from "../engine/types";

/** AC 41: morale as a PES-style 5-level arrow. */
export const MORALE_ARROW: Record<number, string> = { [-2]: "↓", [-1]: "↘", 0: "→", 1: "↗", 2: "↑" };

export function MoraleArrow({ value }: { value: number }) {
  const v = Math.max(-2, Math.min(2, Math.round(value)));
  return (
    <span className={`morale m${v < 0 ? "n" : "p"}${Math.abs(v)}`} aria-label={`moral ${v > 0 ? "+" : ""}${v}`} title={`Moral ${v > 0 ? "+" : ""}${v}`}>
      {MORALE_ARROW[v]}
    </span>
  );
}

export function fitnessTier(fitness: number): "ok" | "tired" | "spent" {
  if (fitness >= 75) return "ok";
  if (fitness >= 50) return "tired";
  return "spent";
}

export function FitnessBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="fitness">
      <span className={`fbar f-${fitnessTier(v)}`} aria-hidden="true">
        <span style={{ width: `${v}%` }} />
      </span>
      <span className="fnum">{v}</span>
    </span>
  );
}

/** AC 29 / AC 34: why a player cannot be picked. Nothing when available. */
export function StatusBadge({ player }: { player: Pick<Condition, "injuryRounds" | "suspendedRounds"> }) {
  if (player.injuryRounds > 0) return <span className="badge les">LES {player.injuryRounds}</span>;
  if (player.suspendedRounds > 0) return <span className="badge sus">SUS</span>;
  return null;
}

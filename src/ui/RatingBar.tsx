import { RATING_MAX, RATING_MIN } from "../engine/types";

/** Winning Eleven style attribute bar. Purely decorative: the number sits next to it as text. */
export function ratingTier(rating: number): "elite" | "high" | "mid" | "low" {
  if (rating >= 85) return "elite";
  if (rating >= 75) return "high";
  if (rating >= 65) return "mid";
  return "low";
}

export function RatingBar({ rating }: { rating: number }) {
  const pct = Math.max(4, Math.min(100, ((rating - RATING_MIN) / (RATING_MAX - RATING_MIN)) * 100));
  return (
    <span className={`bar tier-${ratingTier(rating)}`} aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

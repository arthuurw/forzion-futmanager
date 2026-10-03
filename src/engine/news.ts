import type { Club, GameState, NewsDate, NewsItem } from "./types";

/** Noticias door 1: the news kept in the save, newest last. */
export const NEWS_LIMIT = 60;

const clubsOf = (s: Pick<GameState, "leagues">): Club[] => s.leagues.flatMap((l) => l.clubs);

/**
 * Noticias AC 1-9: what a date changed for the user's club, comparing the game before it with the
 * game after it, in a fixed order: cup, injuries, suspensions, ratings, offers, board, job,
 * transfers. No user club, no news.
 */
export function dateNews(before: GameState, after: GameState, date: NewsDate): NewsItem[] {
  const userId = after.userClubId;
  const mine = userId ? clubsOf(after).find((c) => c.id === userId) : undefined;
  if (!userId || !mine) return [];
  const old = new Map((clubsOf(before).find((c) => c.id === userId)?.players ?? []).map((p) => [p.id, p]));
  const base = { season: after.season, date };
  const news: NewsItem[] = [];

  // AC 8: the user's tie of a cup date.
  if (date.kind === "cup") {
    const cup = after.cups.find((c) => c.id === date.cupId);
    const tie = cup?.phases[date.phase]?.ties.find((t) => t.homeId === userId || t.awayId === userId);
    if (cup && tie?.winnerId) {
      const opponentId = tie.homeId === userId ? tie.awayId : tie.homeId;
      const result = tie.winnerId !== userId ? "out" : date.phase === cup.phases.length - 1 ? "champion" : "advanced";
      news.push({ ...base, kind: "cup", cupId: cup.id, phase: date.phase, result, opponentId });
    }
  }
  // AC 1.
  for (const p of mine.players) {
    if (p.injuryRounds > (old.get(p.id)?.injuryRounds ?? 0)) news.push({ ...base, kind: "injury", playerName: p.name, rounds: p.injuryRounds });
  }
  // AC 2: the league's, then each cup's.
  for (const p of mine.players) {
    const was = old.get(p.id);
    if (p.suspendedRounds > (was?.suspendedRounds ?? 0)) news.push({ ...base, kind: "suspension", playerName: p.name, rounds: p.suspendedRounds });
    for (const [cupId, d] of Object.entries(p.cupDiscipline)) {
      if (d.suspendedRounds > (was?.cupDiscipline[cupId]?.suspendedRounds ?? 0)) news.push({ ...base, kind: "suspension", playerName: p.name, rounds: d.suspendedRounds, cupId });
    }
  }
  // AC 3: a step logged for this very league round.
  if (date.kind === "league") {
    for (const p of mine.players) {
      const step = p.ratingLog?.at(-1);
      if (step?.round === date.round && (old.get(p.id)?.ratingLog?.length ?? 0) < (p.ratingLog?.length ?? 0)) {
        news.push({ ...base, kind: "rating", playerName: p.name, rating: p.rating, delta: step.delta });
      }
    }
  }
  // AC 4: offers arrive when a league round closes and stay until the next one does, so a cup date
  // in between would repeat them.
  if (date.kind === "league") {
    for (const o of after.market.offers) {
      const p = mine.players.find((x) => x.id === o.playerId);
      if (p) news.push({ ...base, kind: "offer", playerName: p.name, clubId: o.buyerId, amount: o.amount });
    }
  }
  // AC 5, AC 6.
  if ((after.boardWarnings ?? 0) > (before.boardWarnings ?? 0)) news.push({ ...base, kind: "board", warnings: after.boardWarnings! });
  if (after.pendingJob?.reason === "offer" && before.pendingJob?.reason !== "offer") news.push({ ...base, kind: "job", clubIds: [...after.pendingJob.clubIds] });
  // AC 7: the AI's purchases of this round with a side in the user's division.
  if (date.kind === "league") {
    const division = new Set(after.leagues.find((l) => l.clubs.some((c) => c.id === userId))?.clubs.map((c) => c.id) ?? []);
    for (const t of after.market.transfers) {
      if (t.kind !== "buy" || t.round !== date.round) continue;
      if (!(t.fromId !== null && division.has(t.fromId)) && !(t.toId !== null && division.has(t.toId))) continue;
      if (t.fromId === null || t.toId === null) continue;
      news.push({ ...base, kind: "transfer", playerName: t.playerName, fromId: t.fromId, toId: t.toId, amount: t.amount });
    }
  }
  return news;
}

/** Noticias AC 9: the date's news at the end; only the newest 60 stay. Mutates `state`. */
export function appendNews(state: GameState, items: readonly NewsItem[]): void {
  if (items.length === 0) return;
  state.news = [...(state.news ?? []), ...items].slice(-NEWS_LIMIT);
}

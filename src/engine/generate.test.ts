import { CLUBS_PER_LEAGUE, PLAYERS_PER_CLUB, newGame } from "./generate";
import { AGE_MAX, AGE_MIN, POSITIONS, RATING_MAX, RATING_MIN, type Club, type Position } from "./types";

function best11Mean(club: Club): number {
  const top = club.players
    .map((p) => p.rating)
    .sort((a, b) => b - a)
    .slice(0, 11);
  return top.reduce((a, b) => a + b, 0) / top.length;
}

describe("geração da liga", () => {
  const seeds = [1, 2, 3, 42, 2024];

  test("20 clubes com 22 jogadores 3-7-7-5", () => {
    for (const seed of seeds) {
      const league = newGame(seed).leagues[0]!;
      expect(league.clubs).toHaveLength(CLUBS_PER_LEAGUE);
      expect(CLUBS_PER_LEAGUE).toBe(20);
      for (const club of league.clubs) {
        expect(club.players).toHaveLength(PLAYERS_PER_CLUB);
        const count = (pos: Position) => club.players.filter((p) => p.position === pos).length;
        expect(count("GK")).toBe(3);
        expect(count("DF")).toBe(7);
        expect(count("MF")).toBe(7);
        expect(count("FW")).toBe(5);
        for (const p of club.players) expect(POSITIONS).toContain(p.position);
      }
    }
  });

  test("rating e age dentro dos limites", () => {
    for (const seed of seeds) {
      for (const club of newGame(seed).leagues[0]!.clubs) {
        for (const p of club.players) {
          expect(Number.isInteger(p.rating)).toBe(true);
          expect(p.rating).toBeGreaterThanOrEqual(RATING_MIN);
          expect(p.rating).toBeLessThanOrEqual(RATING_MAX);
          expect(Number.isInteger(p.age)).toBe(true);
          expect(p.age).toBeGreaterThanOrEqual(AGE_MIN);
          expect(p.age).toBeLessThanOrEqual(AGE_MAX);
        }
      }
    }
    expect([RATING_MIN, RATING_MAX, AGE_MIN, AGE_MAX]).toEqual([40, 95, 17, 36]);
  });

  test("diferença de força entre clubes", () => {
    for (const seed of seeds) {
      const means = newGame(seed).leagues[0]!.clubs.map(best11Mean);
      expect(Math.max(...means) - Math.min(...means)).toBeGreaterThanOrEqual(15);
    }
  });

  test("nomes únicos", () => {
    for (const seed of seeds) {
      const league = newGame(seed).leagues[0]!;
      const clubNames = league.clubs.map((c) => c.name);
      expect(new Set(clubNames).size).toBe(clubNames.length);
      const playerNames = league.clubs.flatMap((c) => c.players.map((p) => p.name));
      expect(new Set(playerNames).size).toBe(playerNames.length);
      const ids = league.clubs.flatMap((c) => [c.id, ...c.players.map((p) => p.id)]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("calendário turno e returno", () => {
    for (const seed of seeds) {
      const league = newGame(seed).leagues[0]!;
      expect(league.rounds).toHaveLength(38);
      const ids = league.clubs.map((c) => c.id);
      const meetings = new Map<string, number>();
      league.rounds.forEach((round, i) => {
        expect(round.number).toBe(i + 1);
        expect(round.matches).toHaveLength(10);
        const playing = new Set<string>();
        for (const m of round.matches) {
          expect(m.result).toBeNull();
          expect(ids).toContain(m.homeId);
          expect(ids).toContain(m.awayId);
          expect(m.homeId).not.toBe(m.awayId);
          expect(playing.has(m.homeId)).toBe(false);
          expect(playing.has(m.awayId)).toBe(false);
          playing.add(m.homeId);
          playing.add(m.awayId);
          const key = `${m.homeId}>${m.awayId}`;
          meetings.set(key, (meetings.get(key) ?? 0) + 1);
        }
        expect(playing.size).toBe(20);
      });
      // Every ordered pair (home, away) exactly once => each pair meets twice, once per venue.
      for (const a of ids) {
        for (const b of ids) {
          if (a === b) continue;
          expect(meetings.get(`${a}>${b}`)).toBe(1);
        }
      }
    }
  });

  test("mesma seed gera liga idêntica", () => {
    expect(newGame(777)).toEqual(newGame(777));
    expect(newGame(777)).not.toEqual(newGame(778));
  });
});

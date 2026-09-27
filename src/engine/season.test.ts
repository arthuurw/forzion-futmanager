import { divisionAt, jobOffers, userBoardGoal, verdictFor } from "./board";
import { newGame } from "./generate";
import { AI_FORMATION, aiLineup, autoLineup } from "./lineup";
import { createRng, mix32 } from "./rng";
import { playRound } from "./season";
import type { Club, GameState } from "./types";

const setRating = (club: Club, rating: number) => club.players.forEach((p) => (p.rating = rating));

/**
 * A new game where strength is known: the Série A clubs, in array order, rate 90 down to 71 and
 * the Série B clubs 70 down to 51. Rank k (1-based) of the 40 is `all[k - 1]`.
 */
function ranked(seed = 20): { state: GameState; all: Club[] } {
  const state = newGame(seed);
  const all = state.leagues.flatMap((l) => l.clubs);
  all.forEach((c, i) => setRating(c, 90 - i));
  return { state, all };
}

describe("diretoria (engine)", () => {
  test("meta pela força", () => {
    const { state } = ranked();
    // Written out (L-004): A min(16, r + 3); B 4 up to r = 4, then min(20, r + 3).
    const expected = {
      0: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16, 16, 16, 16, 16, 16, 16],
      1: [4, 4, 4, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 20, 20, 20],
    } as const;
    for (const division of [0, 1] as const) {
      const clubs = state.leagues[division]!.clubs;
      clubs.forEach((club, i) => {
        state.userClubId = club.id;
        expect(userBoardGoal(state), `divisão ${division} posição ${i + 1}`).toBe(expected[division][i]);
      });
    }
    // Ties go to the smaller id: two clubs of equal strength, the one with the smaller id ranks higher.
    const a = state.leagues[0]!;
    const [first, second] = [...a.clubs].sort((x, y) => x.id.localeCompare(y.id));
    setRating(first!, 60);
    setRating(second!, 60);
    // Both now rank 19th and 20th of the Série A (below every club rated 71+).
    state.userClubId = second!.id;
    expect(userBoardGoal(state)).toBe(16);
    state.userClubId = first!.id;
    const others = a.clubs.filter((c) => c !== first && c !== second);
    for (const c of others) setRating(c, 60);
    // Now all 20 tie: rank follows the id order, so the smallest id is 1st (goal 4).
    expect(userBoardGoal(state)).toBe(4);
    state.userClubId = second!.id;
    expect(userBoardGoal(state)).toBe(5);
  });

  test("veredito da diretoria", () => {
    const rows: [number, number, number, string][] = [
      [0, 8, 8, "met"],
      [0, 8, 9, "missed"],
      [0, 8, 12, "missed"],
      [0, 8, 13, "fired"],
      [0, 16, 16, "met"],
      [0, 16, 17, "fired"],
      [1, 4, 4, "met"],
      [1, 4, 5, "missed"],
      [1, 4, 9, "fired"],
      [1, 20, 20, "met"],
    ];
    // Paises: the board reads the league's role (tier and country), not its index.
    const leagues = newGame(1).leagues;
    for (const [division, goal, position, verdict] of rows) {
      expect(verdictFor(divisionAt(leagues, division), goal, position), `${division} meta ${goal} posição ${position}`).toBe(verdict);
    }
  });

  test("propostas de emprego", () => {
    const { state, all } = ranked();
    const rank = (k: number) => all[k - 1]!.id;
    state.userClubId = rank(10);
    expect(jobOffers(state)).toEqual([rank(11), rank(12), rank(13)]);
    // Last of the Série A: the next three come from the Série B, not from the user's own division.
    state.userClubId = rank(20);
    expect(jobOffers(state)).toEqual([rank(21), rank(22), rank(23)]);
    // Paises (Superseded checks): the ranking has 80 clubs; same rule, ids recalculated.
    state.userClubId = rank(39);
    expect(jobOffers(state)).toEqual([rank(40), rank(41), rank(42)]);
    // 79th of 80: fewer than 3 below, so the 3 weakest others.
    state.userClubId = rank(79);
    expect(jobOffers(state)).toEqual([rank(77), rank(78), rank(80)]);
    state.userClubId = rank(80);
    expect(jobOffers(state)).toEqual([rank(77), rank(78), rank(79)]);
  });
});

describe("mercado da IA na rodada (gastos-da-ia)", () => {
  test("rodada de janela dispara compras da IA", () => {
    // Door 3, written out: the first draw of round 1 goes to Série A club 0 when the user is in the Série B.
    const firstDraw = (rngState: number) => createRng(mix32(mix32(rngState, 0xa1), 1)).next();
    let seed = 1;
    while (firstDraw(newGame(seed).rngState) >= 0.25) seed++;
    const s = newGame(seed);
    const me = s.leagues[1]!.clubs[19]!;
    s.userClubId = me.id;
    me.lineup = autoLineup(me, AI_FORMATION);
    const club = s.leagues[0]!.clubs[0]!;
    club.finance.cash = 500_000_000;
    // Its weakest starter is a DF rated 60; club 1 has a reserve DF rated 80 at 25.
    club.players.forEach((p) => (p.rating = 75));
    club.players.filter((p) => p.position === "DF").forEach((p, i) => (p.rating = i < 3 ? 75 : i === 3 ? 60 : 50));
    const other = s.leagues[0]!.clubs[1]!;
    const dfs = other.players.filter((p) => p.position === "DF");
    dfs.forEach((p, i) => Object.assign(p, i < 4 ? { rating: 90, age: 33 } : i === 4 ? { rating: 80, age: 25 } : {}));
    expect(other.players.length).toBeGreaterThan(20);
    expect(aiLineup(other).starters).not.toContain(dfs[4]!.id);
    const { state } = playRound(s);
    expect(state.leagues[0]!.currentRound).toBe(1);
    expect(state.market.transfers.some((t) => t.kind === "buy" && t.toId === club.id)).toBe(true);
  });
});

describe("países na rodada (paises)", () => {
  test("quatro ligas jogam a rodada", () => {
    // C7 (AC 7): every league plays its 10 matches and moves to round 1.
    const s = playRound(newGame(61)).state;
    expect(s.leagues.map((l) => l.id)).toEqual(["l1", "l2", "l3", "l4"]);
    for (const league of s.leagues) {
      expect(league.currentRound, league.id).toBe(1);
      expect(league.rounds[0]!.matches, league.id).toHaveLength(10);
      for (const m of league.rounds[0]!.matches) expect(m.result, `${league.id} ${m.id}`).not.toBeNull();
      for (const m of league.rounds[1]!.matches) expect(m.result, `${league.id} ${m.id}`).toBeNull();
    }
  });
});

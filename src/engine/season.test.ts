import { jobOffers, userBoardGoal, verdictFor } from "./board";
import { newGame } from "./generate";
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
    for (const [division, goal, position, verdict] of rows) {
      expect(verdictFor(division, goal, position), `${division} meta ${goal} posição ${position}`).toBe(verdict);
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
    // 39th of 40: fewer than 3 below, so the 3 weakest others.
    state.userClubId = rank(39);
    expect(jobOffers(state)).toEqual([rank(37), rank(38), rank(40)]);
    state.userClubId = rank(40);
    expect(jobOffers(state)).toEqual([rank(37), rank(38), rank(39)]);
  });
});

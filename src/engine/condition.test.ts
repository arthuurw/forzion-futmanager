import { playerAfterRound } from "./condition";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { makeSide, runToEnd, startRound, type LiveSide } from "./live";
import { FRESH_CONDITION, type Player } from "./types";

const base: Player = { id: "p", name: "p", position: "MF", age: 25, rating: 70, ...FRESH_CONDITION, salary: 0 };

/** A side where `p` played (or not), with the given match facts. */
function side(opts: { played?: boolean; fitness?: number; yellows?: number; red?: boolean; injured?: number } = {}): LiveSide {
  const s = makeSide("c", ["MF"], opts.played === false ? [null] : ["p"], [], { p: base });
  if (opts.played === false) s.played = [];
  if (opts.fitness !== undefined) s.fitness.p = opts.fitness;
  if (opts.yellows) s.yellows.p = opts.yellows;
  if (opts.red) s.sentOff.push("p");
  if (opts.injured) s.injured.p = opts.injured;
  return s;
}

describe("pós-rodada", () => {
  test("três amarelos suspendem e zeram", () => {
    const two = { ...base, yellowCards: 2 };
    const third = playerAfterRound(two, side({ yellows: 1 }), "draw");
    expect(third.suspendedRounds).toBe(1);
    expect(third.yellowCards).toBe(0);
    const one = playerAfterRound({ ...base, yellowCards: 1 }, side({ yellows: 1 }), "draw");
    expect(one).toMatchObject({ yellowCards: 2, suspendedRounds: 0 });
    // Serves the next round, then is available again.
    const served = playerAfterRound(third, side({ played: false }), "draw");
    expect(served.suspendedRounds).toBe(0);
  });

  test("vermelho suspende uma rodada", () => {
    const sent = playerAfterRound({ ...base, yellowCards: 1 }, side({ yellows: 2, red: true }), "loss");
    expect(sent.suspendedRounds).toBe(1);
    expect(sent.yellowCards).toBe(1);
    const served = playerAfterRound(sent, side({ played: false }), "win");
    expect(served.suspendedRounds).toBe(0);
  });

  test("recuperação 30 e 15 até 100", () => {
    expect(playerAfterRound({ ...base, fitness: 60 }, side({ fitness: 60 }), "draw").fitness).toBe(75);
    expect(playerAfterRound({ ...base, fitness: 60 }, side({ played: false }), "draw").fitness).toBe(90);
    expect(playerAfterRound({ ...base, fitness: 90 }, side({ played: false }), "draw").fitness).toBe(100);
    expect(playerAfterRound({ ...base, fitness: 95 }, side({ fitness: 95 }), "draw").fitness).toBe(100);
    expect(playerAfterRound({ ...base, fitness: 60 }, null, null).fitness).toBe(90);
  });

  test("lesão de 1 a 4 rodadas", () => {
    let p = playerAfterRound(base, side({ injured: 3, fitness: 80 }), "draw");
    expect(p.injuryRounds).toBe(3);
    for (const left of [2, 1, 0]) {
      p = playerAfterRound(p, side({ played: false }), "draw");
      expect(p.injuryRounds).toBe(left);
    }
    // Over many simulated rounds, injuries last 1, 2, 3 or 4 rounds and nothing else.
    const durations = new Set<number>();
    for (let seed = 1; seed <= 120; seed++) {
      const state = newGame(1);
      const club = state.leagues[0]!.clubs[0]!;
      state.userClubId = club.id;
      club.lineup = autoLineup(club, AI_FORMATION);
      state.rngState = seed * 97;
      for (const m of runToEnd(startRound(state)).matches) {
        for (const s of [m.home, m.away]) for (const d of Object.values(s.injured)) durations.add(d);
      }
    }
    expect([...durations].sort()).toEqual([1, 2, 3, 4]);
  });

  test("vitória sobe moral até +2", () => {
    expect(playerAfterRound({ ...base, morale: 1 }, side(), "win").morale).toBe(2);
    expect(playerAfterRound({ ...base, morale: 2 }, side(), "win").morale).toBe(2);
    expect(playerAfterRound({ ...base, morale: 0 }, side(), "draw").morale).toBe(0);
  });

  test("derrota baixa moral até -2", () => {
    expect(playerAfterRound({ ...base, morale: -1 }, side(), "loss").morale).toBe(-2);
    expect(playerAfterRound({ ...base, morale: -2 }, side(), "loss").morale).toBe(-2);
  });

  test("três rodadas sem jogar baixa moral", () => {
    let p = { ...base, morale: 1 };
    p = playerAfterRound(p, side({ played: false }), "win");
    p = playerAfterRound(p, side({ played: false }), "win");
    expect(p).toMatchObject({ idleRounds: 2, morale: 1 });
    p = playerAfterRound(p, side({ played: false }), "win");
    expect(p).toMatchObject({ idleRounds: 0, morale: 0 });
    // Playing resets the count.
    const back = playerAfterRound({ ...base, idleRounds: 2 }, side(), "draw");
    expect(back.idleRounds).toBe(0);
    // An injured player sitting out is not "idle".
    const hurt = playerAfterRound({ ...base, idleRounds: 2, injuryRounds: 2 }, side({ played: false }), "draw");
    expect(hurt).toMatchObject({ idleRounds: 2, morale: 0 });
  });
});

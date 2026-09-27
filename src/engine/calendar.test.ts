import { nextDate } from "./calendar";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { playDate, playRound } from "./season";
import type { GameState } from "./types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** «L» for a league round, «Ck» for cup phase k. */
function label(s: GameState): string {
  const d = nextDate(s);
  if (d.kind === "cup") return `C${d.phase}`;
  if (d.kind === "league") return "L";
  return "over";
}

function withUser(seed: number): GameState {
  const s = newGame(seed);
  const club = s.leagues[0]!.clubs[2]!;
  s.userClubId = club.id;
  club.lineup = autoLineup(club, AI_FORMATION);
  return s;
}

describe("calendário de 44 datas", () => {
  test("sequência das 44 datas", () => {
    const L = (n: number) => Array<string>(n).fill("L");
    const expected = [...L(4), "C0", ...L(6), "C1", ...L(6), "C2", ...L(6), "C3", ...L(6), "C4", ...L(6), "C5", ...L(4)];
    expect(expected).toHaveLength(44);
    let s = newGame(51);
    const seen: string[] = [];
    while (nextDate(s).kind !== "over") {
      seen.push(label(s));
      s = playDate(s).state;
    }
    expect(seen).toEqual(expected);
    expect(s.leagues.map((l) => l.currentRound)).toEqual([38, 38]);
    expect(s.cups[0]!.currentPhase).toBe(6);
  }, 60_000);

  test("data de copa não mexe na liga", () => {
    let s = newGame(52);
    for (let i = 0; i < 4; i++) s = playDate(s).state;
    expect(nextDate(s)).toEqual({ kind: "cup", cupIndex: 0, phase: 0 });
    const rounds = s.leagues.map((l) => clone(l.rounds));
    const after = playDate(s).state;
    expect(after.leagues.map((l) => l.currentRound)).toEqual([4, 4]);
    expect(after.leagues.map((l) => l.rounds)).toEqual(rounds);
    const cup = after.cups[0]!;
    expect(cup.phases[0]!.ties).toHaveLength(8);
    for (const t of cup.phases[0]!.ties) expect(t.result, t.id).not.toBeNull();
    // Only phase 0 has results: the drawn «16 avos» and the rest do not.
    for (const phase of cup.phases.slice(1)) for (const t of phase.ties) expect(t.result, t.id).toBeNull();
  });

  test("playRound joga copa pendente e uma rodada", () => {
    let s = newGame(53);
    for (let i = 0; i < 4; i++) s = playRound(s).state;
    expect(s.cups[0]!.currentPhase).toBe(0);
    const next = playRound(s).state;
    expect(next.cups[0]!.currentPhase).toBe(1);
    for (const t of next.cups[0]!.phases[0]!.ties) expect(t.winnerId, t.id).not.toBeNull();
    expect(next.leagues.map((l) => l.currentRound)).toEqual([5, 5]);

    let full = newGame(53);
    for (let i = 0; i < 38; i++) full = playRound(full).state;
    expect(full.cups[0]!.currentPhase).toBe(6);
    expect(full.leagues.map((l) => l.currentRound)).toEqual([38, 38]);
  }, 60_000);

  test("mesma seed mesma copa", () => {
    const run = () => {
      let s = withUser(54);
      for (let i = 0; i < 38; i++) {
        const me = s.leagues.flatMap((l) => l.clubs).find((c) => c.id === s.userClubId)!;
        me.lineup = autoLineup(me, "4-3-3", "attacking");
        s = playRound(s).state;
      }
      return s.cups;
    };
    const a = run();
    expect(a[0]!.phases[5]!.ties[0]!.winnerId).not.toBeNull();
    expect(run()).toEqual(a);
  }, 60_000);
});

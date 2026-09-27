import { nextCompetition, nextDate } from "./calendar";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup, validateLineup } from "./lineup";
import { playDate, playRound } from "./season";
import { atCupDate } from "./test-fixtures";
import type { Club, GameState, Player } from "./types";

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
    // Paises (Superseded checks): 4 leagues.
    expect(s.leagues.map((l) => l.currentRound)).toEqual([38, 38, 38, 38]);
    expect(s.cups[0]!.currentPhase).toBe(6);
  }, 60_000);

  test("data de copa não mexe na liga", () => {
    let s = newGame(52);
    for (let i = 0; i < 4; i++) s = playDate(s).state;
    expect(nextDate(s)).toEqual({ kind: "cup", cupIndex: 0, phase: 0 });
    const rounds = s.leagues.map((l) => clone(l.rounds));
    const after = playDate(s).state;
    expect(after.leagues.map((l) => l.currentRound)).toEqual([4, 4, 4, 4]);
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
    expect(next.leagues.map((l) => l.currentRound)).toEqual([5, 5, 5, 5]);

    let full = newGame(53);
    for (let i = 0; i < 38; i++) full = playRound(full).state;
    expect(full.cups[0]!.currentPhase).toBe(6);
    expect(full.leagues.map((l) => l.currentRound)).toEqual([38, 38, 38, 38]);
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

describe("competição do próximo jogo (ajustes-4a)", () => {
  const every = (s: GameState): Club[] => s.leagues.flatMap((l) => l.clubs);
  const loserOf = (s: GameState, phase: number, tie = 0) => {
    const t = s.cups[0]!.phases[phase]!.ties[tie]!;
    return t.winnerId === t.homeId ? t.awayId : t.homeId;
  };
  const inPhase = (s: GameState, phase: number, clubId: string) =>
    s.cups[0]!.phases[phase]!.ties.some((t) => t.homeId === clubId || t.awayId === clubId);

  /** The user takes `clubId` with a clean squad and an auto eleven; A and B are two of its starters. */
  function take(s: GameState, clubId: string): { club: Club; a: Player; b: Player } {
    s.userClubId = clubId;
    const club = every(s).find((c) => c.id === clubId)!;
    for (const p of club.players) Object.assign(p, { injuryRounds: 0, suspendedRounds: 0, cupDiscipline: {} });
    club.lineup = autoLineup(club, AI_FORMATION);
    const [a, b] = [club.players.find((p) => p.id === club.lineup!.starters[1])!, club.players.find((p) => p.id === club.lineup!.starters[2])!];
    return { club, a, b };
  }

  /** Missing starters when only A (cup suspension), only B (league suspension) and both are marked. */
  function missing(s: GameState, clubId: string): [number, number, number] {
    const { club, a, b } = take(s, clubId);
    const markA = (on: boolean) => (a.cupDiscipline = on ? { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } } : {});
    const markB = (on: boolean) => (b.suspendedRounds = on ? 1 : 0);
    const run = (onA: boolean, onB: boolean) => {
      markA(onA);
      markB(onB);
      return validateLineup(club, club.lineup, nextCompetition(s)).missing;
    };
    return [run(true, false), run(false, true), run(true, true)];
  }

  test("competição do próximo jogo do usuário", () => {
    const s = atCupDate(81, 3);
    expect(nextDate(s)).toEqual({ kind: "cup", cupIndex: 0, phase: 3 });
    const out = loserOf(s, 2);
    const alive = s.cups[0]!.phases[2]!.ties[0]!.winnerId!;
    expect(inPhase(s, 3, out)).toBe(false);
    expect(inPhase(s, 3, alive)).toBe(true);
    // Rows: [only A, only B, both] -> missing starters.
    expect(missing(s, out), "copa sem o usuário").toEqual([0, 1, 1]);
    expect(nextCompetition(s)).toEqual({ kind: "league" });
    expect(missing(s, alive), "copa com o usuário").toEqual([1, 0, 1]);
    expect(nextCompetition(s)).toEqual({ kind: "cup", cupId: "cup-nat" });
    const league = playDate(s).state;
    expect(nextDate(league).kind).toBe("league");
    expect(missing(league, alive), "liga").toEqual([0, 1, 1]);
    expect(nextCompetition(league)).toEqual({ kind: "league" });
  }, 60_000);

  test("eliminado e isento da preliminar", () => {
    // Eliminated in an earlier phase: at the Quartas, the losers of the Preliminar, 16 avos and Oitavas.
    const s = atCupDate(82, 3);
    for (const phase of [0, 1, 2]) {
      const out = loserOf(s, phase);
      expect(inPhase(s, 3, out)).toBe(false);
      expect(missing(s, out), `eliminado na fase ${phase}`).toEqual([0, 1, 1]);
      expect(nextCompetition(s), `eliminado na fase ${phase}`).toEqual({ kind: "league" });
    }
    // At the Preliminar: the top seed skips it; a club in it plays the cup.
    const p = atCupDate(82, 0);
    expect(nextDate(p)).toEqual({ kind: "cup", cupIndex: 0, phase: 0 });
    const exempt = p.cups[0]!.seeding[0]!;
    expect(inPhase(p, 0, exempt)).toBe(false);
    expect(missing(p, exempt), "isento da Preliminar").toEqual([0, 1, 1]);
    expect(nextCompetition(p)).toEqual({ kind: "league" });
    const playing = p.cups[0]!.phases[0]!.ties[0]!.homeId;
    expect(missing(p, playing), "na Preliminar").toEqual([1, 0, 1]);
    expect(nextCompetition(p)).toEqual({ kind: "cup", cupId: "cup-nat" });
  }, 60_000);
});

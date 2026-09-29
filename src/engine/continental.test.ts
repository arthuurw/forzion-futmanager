import { strengthRanking } from "./board";
import { nextDate } from "./calendar";
import { catchUpPhase, cupLive, cupMatchSeed, drawSeed, finishCupDate, startCupDate } from "./cup";
import { runToEnd } from "./live";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { mix32 } from "./rng";
import { nextSeason } from "./rollover";
import { playDate, seasonReview } from "./season";
import { computeTable } from "./table";
import type { Club, Country, Cup, GameState } from "./types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const all = (s: GameState): Club[] => s.leagues.flatMap((l) => l.clubs);
const clubOf = (s: GameState, id: string) => all(s).find((c) => c.id === id)!;
const countryOf = (s: GameState, id: string): Country => s.leagues.find((l) => l.clubs.some((c) => c.id === id))!.country;
const first = (s: GameState, country: Country) => s.leagues.find((l) => l.country === country && l.tier === 0)!;
const cont = (s: GameState): Cup => s.cups[1]!;
const clubsOf = (cup: Cup, k: number) => cup.phases[k]!.ties.flatMap((t) => [t.homeId, t.awayId]);
/** AC 12, written out. */
const PRIZES = [800_000, 1_500_000, 2_500_000, 5_000_000];

/** AC 5, written out: 1º BR, 1º AR, 1º PT, 2º BR, … , 5º PT, 6º BR. */
function interleaved(br: string[], ar: string[], pt: string[]): string[] {
  return [br[0], ar[0], pt[0], br[1], ar[1], pt[1], br[2], ar[2], pt[2], br[3], ar[3], pt[3], br[4], ar[4], pt[4], br[5]] as string[];
}

interface KDate {
  phase: number;
  before: GameState;
  after: GameState;
}

let cached: { dates: KDate[]; final: GameState } | null = null;
/** One whole season (seed 61, user on a qualified Série A club), keeping the state around each continental date. */
function season(): { dates: KDate[]; final: GameState } {
  if (!cached) {
    let s = newGame(61);
    s.userClubId = cont(s).seeding[0]!;
    const dates: KDate[] = [];
    while (nextDate(s).kind !== "over") {
      const d = nextDate(s);
      const me = clubOf(s, s.userClubId!);
      me.lineup = autoLineup(me, AI_FORMATION);
      const before = s;
      s = playDate(s).state;
      if (d.kind === "cup" && d.cupIndex === 1) dates.push({ phase: d.phase, before, after: s });
    }
    cached = { dates, final: s };
  }
  return clone(cached);
}

describe("S1 - classificados e sorteio", () => {
  test("continental no jogo novo", () => {
    const s = newGame(11);
    expect(s.cups.map((c) => c.id)).toEqual(["cup-nat", "cup-cont"]);
    const c = cont(s);
    expect(c.name).toBe("Copa Continental");
    expect(c.phases.map((p) => p.name)).toEqual(["Oitavas", "Quartas", "Semifinal", "Final"]);
    expect(c.phases.map((p) => p.afterLeagueRound)).toEqual([7, 13, 25, 31]);
    expect(c.currentPhase).toBe(0);
  });

  test("classificados do jogo novo pelo ranking de força", () => {
    for (const seed of [11, 12, 13]) {
      const s = newGame(seed);
      const br = strengthRanking(first(s, "BR").clubs);
      const ar = strengthRanking(first(s, "AR").clubs);
      const pt = strengthRanking(first(s, "PT").clubs);
      const seeding = new Set(cont(s).seeding);
      expect(seeding).toEqual(new Set([...br.slice(0, 6), ...ar.slice(0, 5), ...pt.slice(0, 5)]));
      expect(seeding.has(br[6]!), `seed ${seed}: 7º da Série A`).toBe(false);
      expect(seeding.has(ar[5]!), `seed ${seed}: 6º da Liga Argentina`).toBe(false);
      expect(seeding.has(pt[5]!), `seed ${seed}: 6º da Liga Portuguesa`).toBe(false);
      for (const c of s.leagues[1]!.clubs) expect(seeding.has(c.id), `Série B ${c.id}`).toBe(false);
    }
  });

  test("seeding intercalado por país", () => {
    const s = newGame(12);
    const br = strengthRanking(first(s, "BR").clubs);
    const ar = strengthRanking(first(s, "AR").clubs);
    const pt = strengthRanking(first(s, "PT").clubs);
    expect(cont(s).seeding).toEqual(interleaved(br, ar, pt));
  });

  test("vagas brasileiras na virada", () => {
    const base = season().final;
    const table = computeTable(base.leagues[0]!).map((r) => r.clubId);
    const serieB = base.leagues[1]!.clubs[0]!.id;
    const cases: { name: string; champion: string; expected: string[]; out: string }[] = [
      { name: "campeão da Série B", champion: serieB, expected: [serieB, ...table.slice(0, 5)], out: table[5]! },
      { name: "campeão entre os 6", champion: table[2]!, expected: table.slice(0, 6), out: table[6]! },
      { name: "campeão fora dos 6", champion: table[8]!, expected: [table[8]!, ...table.slice(0, 5)], out: table[5]! },
    ];
    for (const c of cases) {
      const s = clone(base);
      const final = s.cups[0]!.phases[5]!.ties[0]!;
      if (final.awayId === c.champion) final.awayId = final.homeId;
      final.homeId = c.champion;
      final.winnerId = c.champion;
      const next = nextSeason(s).state;
      const seeding = cont(next).seeding;
      const brazil = seeding.filter((id) => countryOf(next, id) === "BR");
      expect(new Set(brazil), c.name).toEqual(new Set(c.expected));
      expect(seeding[0], c.name).toBe(c.champion);
      expect(seeding.includes(c.out), `${c.name}: ${c.out} fica de fora`).toBe(false);
    }
  }, 120_000);

  test("vagas de fora pela tabela final", () => {
    const s = season().final;
    for (const idx of [2, 3]) {
      const table = computeTable(s.leagues[idx]!).map((r) => r.clubId);
      // The 6th becomes the strongest club of its league; the final table still decides (L-007).
      for (const p of clubOf(s, table[5]!).players) p.rating = 95;
      expect(strengthRanking(s.leagues[idx]!.clubs)[0]).toBe(table[5]);
    }
    const tables = [2, 3].map((idx) => computeTable(s.leagues[idx]!).map((r) => r.clubId));
    const next = nextSeason(s).state;
    const seeding = cont(next).seeding;
    const byCountry = (c: Country) => seeding.filter((id) => countryOf(next, id) === c);
    expect(new Set(byCountry("AR"))).toEqual(new Set(tables[0]!.slice(0, 5)));
    expect(new Set(byCountry("PT"))).toEqual(new Set(tables[1]!.slice(0, 5)));
    expect(seeding.includes(tables[0]![5]!)).toBe(false);
    expect(seeding.includes(tables[1]![5]!)).toBe(false);
    // AC 5 on the turn of the season: AR1 and PT1 are the champions.
    expect([seeding[1], seeding[2]]).toEqual([tables[0]![0], tables[1]![0]]);
  }, 120_000);

  test("oitavas sem confronto do mesmo país", () => {
    const check = (s: GameState, label: string) => {
      const c = cont(s);
      const ties = c.phases[0]!.ties;
      expect(ties, label).toHaveLength(8);
      for (const t of ties) expect([t.result, t.penalties, t.winnerId], label).toEqual([null, null, null]);
      const clubs = clubsOf(c, 0);
      expect(new Set(clubs).size, label).toBe(16);
      expect(new Set(clubs), label).toEqual(new Set(c.seeding));
      for (const t of ties) expect(countryOf(s, t.homeId), `${label} ${t.id}`).not.toBe(countryOf(s, t.awayId));
      for (const k of [1, 2, 3]) expect(c.phases[k]!.ties, label).toEqual([]);
    };
    for (let seed = 1; seed <= 50; seed++) check(newGame(seed), `jogo novo ${seed}`);
    const base = season().final;
    for (let i = 1; i <= 50; i++) {
      const s = clone(base);
      s.rngState = mix32(0x5eed, i);
      check(nextSeason(s).state, `virada ${i}`);
    }
  }, 240_000);

  test("fases seguintes sorteadas entre os vencedores", () => {
    let sameCountry = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const s = newGame(seed);
      for (const k of [0, 1, 2]) {
        catchUpPhase(s, 1, mix32(seed, 100 + k), mix32(seed, 200 + k));
        const c = cont(s);
        const winners = c.phases[k]!.ties.map((t) => t.winnerId!);
        const next = c.phases[k + 1]!.ties;
        expect(next, `seed ${seed} fase ${k + 1}`).toHaveLength(winners.length / 2);
        expect(new Set(clubsOf(c, k + 1))).toEqual(new Set(winners));
        for (const t of next) expect(c.seeding.indexOf(t.homeId), t.id).toBeGreaterThan(c.seeding.indexOf(t.awayId));
        if (k === 0) sameCountry += next.filter((t) => countryOf(s, t.homeId) === countryOf(s, t.awayId)).length;
      }
    }
    expect(sameCountry).toBeGreaterThan(0);
  }, 120_000);

  test("sementes da continental", () => {
    for (const r of [1, 0x1234_5678, 0xffff_fff0]) {
      for (const k of [0, 3]) {
        expect(drawSeed(r, k, "cup-cont")).toBe(mix32(mix32(r, 0xd1), k));
        expect(drawSeed(r, k, "cup-nat")).toBe(mix32(mix32(r, 0xd0), k));
        expect(drawSeed(r, k)).toBe(mix32(mix32(r, 0xd0), k));
        for (const i of [0, 7]) {
          expect(cupMatchSeed(r, k, i, "cup-cont")).toBe(mix32(mix32(r, 0xc1), k * 32 + i));
          expect(cupMatchSeed(r, k, i, "cup-nat")).toBe(mix32(mix32(r, 0xc0), k * 32 + i));
        }
      }
    }
    // The continental's matches read the continental's seed (L-003).
    const s = newGame(13);
    const live = cupLive(s, 1, 99, null);
    live.matches.forEach((m, i) => expect(m.rngState).toBe(mix32(mix32(99, 0xc1), i)));
    expect(cont(newGame(13))).toEqual(cont(newGame(13)));
    const draws = new Set<string>();
    for (let seed = 21; seed <= 30; seed++) draws.add(JSON.stringify(cont(newGame(seed)).phases[0]!.ties.map((t) => [t.homeId, t.awayId])));
    expect(draws.size).toBeGreaterThan(1);
  });
});

describe("S2 - a continental no calendário", () => {
  test("prêmio de cada fase da continental", () => {
    const { dates } = season();
    expect(dates.map((d) => d.phase)).toEqual([0, 1, 2, 3]);
    for (const { phase, before, after } of dates) {
      for (const t of cont(after).phases[phase]!.ties) {
        for (const id of [t.homeId, t.awayId]) {
          const was = clubOf(before, id).finance.cash;
          const f = clubOf(after, id).finance;
          const home = id === t.homeId;
          const prize = id === t.winnerId ? PRIZES[phase]! : 0;
          if (home) expect(f.lastRound!.tickets, `${t.id} mandante`).toBeGreaterThan(0);
          else expect(f.lastRound!.tickets, `${t.id} visitante`).toBe(0);
          expect(f.lastRound!.cupPrize, `${t.id} ${id}`).toBe(prize);
          expect(f.cash - was, `${t.id} ${id}`).toBe(prize + f.lastRound!.tickets);
        }
      }
    }
  }, 120_000);

  test("cartão da continental conta só nela", () => {
    const { dates } = season();
    let carded = 0;
    for (const { before, after } of dates) {
      for (const club of all(after)) {
        for (const p of club.players) {
          const q = clubOf(before, club.id).players.find((x) => x.id === p.id);
          if (!q) continue;
          const was = q.cupDiscipline["cup-cont"]?.yellowCards ?? 0;
          const now = p.cupDiscipline["cup-cont"]?.yellowCards ?? 0;
          if (now === was + 1) carded++;
          expect([p.yellowCards, p.suspendedRounds], p.id).toEqual([q.yellowCards, q.suspendedRounds]);
          expect(p.cupDiscipline["cup-nat"], p.id).toEqual(q.cupDiscipline["cup-nat"]);
        }
      }
    }
    expect(carded).toBeGreaterThan(0);
  }, 120_000);

  test("suspensão da nacional não vale na continental", () => {
    let s = newGame(14);
    const me = cont(s).seeding[0]!;
    s.userClubId = me;
    while (!(nextDate(s).kind === "cup" && (nextDate(s) as { cupIndex: number }).cupIndex === 1)) {
      const club = clubOf(s, me);
      club.lineup = autoLineup(club, AI_FORMATION);
      s = playDate(s).state;
    }
    const club = clubOf(s, me);
    club.lineup = autoLineup(club, AI_FORMATION);
    const [a, b] = club.lineup.starters.filter((id): id is string => !!id).slice(1, 3) as [string, string];
    const pa = club.players.find((p) => p.id === a)!;
    const pb = club.players.find((p) => p.id === b)!;
    pa.cupDiscipline = { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } };
    pb.cupDiscipline = { "cup-cont": { yellowCards: 0, suspendedRounds: 1 } };
    const live = startCupDate(s);
    const side = live.matches.flatMap((m) => [m.home, m.away]).find((x) => x.clubId === me)!;
    expect(side.slots).toContain(a);
    expect([...side.slots, ...side.bench]).not.toContain(b);
  }, 60_000);

  test("veredito não lê a continental", () => {
    const base = season().final;
    const me = base.userClubId!;
    const position = computeTable(base.leagues[0]!).findIndex((r) => r.clubId === me) + 1;
    const champion = (s: GameState) => {
      const f = cont(s).phases[3]!.ties[0]!;
      if (f.awayId === me) f.awayId = f.homeId;
      f.homeId = me;
      f.winnerId = me;
    };
    const outInOitavas = (s: GameState) => {
      const c = cont(s);
      const t = c.phases[0]!.ties.find((x) => x.homeId === me || x.awayId === me)!;
      const other = t.homeId === me ? t.awayId : t.homeId;
      t.winnerId = other;
      for (const p of c.phases.slice(1)) {
        for (const x of p.ties) {
          if (x.homeId === me) x.homeId = other;
          if (x.awayId === me) x.awayId = other;
          if (x.winnerId === me) x.winnerId = other;
        }
      }
    };
    for (const goal of [20, Math.max(1, position - 6)]) {
      const a = clone(base);
      const b = clone(base);
      a.boardGoal = goal;
      b.boardGoal = goal;
      champion(a);
      outInOitavas(b);
      const ra = seasonReview(a);
      const rb = seasonReview(b);
      expect(ra.cups[1]!.userReached).toBe(4);
      expect(rb.cups[1]!.userReached).toBe(0);
      expect(ra.user!.verdict, `meta ${goal}`).toBe(rb.user!.verdict);
    }
  }, 120_000);
});

describe("disciplina ligada ao evento (correcoes-validacao)", () => {
  test("amarelo ligado ao evento", () => {
    // C65 (AC 61, L-025, L-007): the first continental date, every match's events read before closing it.
    let s = newGame(61);
    while (!(nextDate(s).kind === "cup" && (nextDate(s) as { cupIndex: number }).cupIndex === 1)) s = playDate(s).state;
    const live = startCupDate(s);
    const ended = runToEnd(live);
    const after = finishCupDate(s, live).state;
    expect(cont(after).phases[0]!.ties.map((t) => [t.result!.homeGoals, t.result!.awayGoals])).toEqual(ended.matches.map((m) => [m.homeGoals, m.awayGoals]));

    let carded = 0;
    let spared = 0;
    for (const m of ended.matches) {
      const yellows = new Set(m.events.filter((e) => e.type === "yellow").map((e) => e.playerId!));
      const reds = new Set(m.events.filter((e) => e.type === "red").map((e) => e.playerId!));
      for (const clubId of [m.home.clubId, m.away.clubId]) {
        for (const q of clubOf(s, clubId).players) {
          const p = clubOf(after, clubId).players.find((x) => x.id === q.id)!;
          const was = q.cupDiscipline["cup-cont"]?.yellowCards ?? 0;
          const now = p.cupDiscipline["cup-cont"]?.yellowCards ?? 0;
          // One yellow in the date counts once; a red suspends instead; no event of his, no change.
          const expected = yellows.has(q.id) && !reds.has(q.id) ? was + 1 : reds.has(q.id) ? 0 : was;
          expect(now, `${m.matchId} ${q.id}`).toBe(expected);
          expect(p.yellowCards, q.id).toBe(q.yellowCards);
          if (expected === was + 1) carded++;
          else if (!yellows.has(q.id)) spared++;
        }
      }
    }
    expect(carded).toBeGreaterThan(0);
    expect(spared).toBeGreaterThan(0);
  }, 60_000);
});

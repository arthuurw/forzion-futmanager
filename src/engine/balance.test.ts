import { nextDate } from "./calendar";
import { newGame } from "./generate";
import { formationSlots } from "./lineup";
import { simulateMatch, type TeamSheet } from "./match";
import { createRng } from "./rng";
import { nextSeason } from "./rollover";
import { playDate, playRound } from "./season";
import type { Country, FormationName, GameState, PlayerCore, Posture, TransferRecord } from "./types";

function flatSheet(clubId: string, rating: number, posture: Posture = "balanced", formation: FormationName = "4-4-2"): TeamSheet {
  const starters: PlayerCore[] = formationSlots(formation).map((position, i) => ({
    id: `${clubId}-${i}`,
    name: `${clubId} ${i}`,
    position,
    age: 25,
    rating,
  }));
  return { clubId, starters, posture };
}

/** Per-match means over seeds 1..n: shots and goals by side, cards and injuries. */
function tally(home: TeamSheet, away: TeamSheet, n = 2000) {
  const t = { homeShots: 0, awayShots: 0, homeConceded: 0, yellows: 0, reds: 0, injuries: 0 };
  for (let seed = 1; seed <= n; seed++) {
    const { result, events } = simulateMatch(home, away, createRng(seed));
    t.homeConceded += result.awayGoals;
    for (const e of events) {
      const shot = e.type === "goal" || e.type === "shot_saved" || e.type === "shot_missed";
      if (shot && e.clubId === home.clubId) t.homeShots++;
      if (shot && e.clubId === away.clubId) t.awayShots++;
      if (e.type === "yellow") t.yellows++;
      if (e.type === "red") t.reds++;
      if (e.type === "injury") t.injuries++;
    }
  }
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v / n])) as typeof t;
}

function run(homeRating: number, awayRating: number, n = 2000) {
  let goals = 0;
  let homeWins = 0;
  let draws = 0;
  for (let seed = 1; seed <= n; seed++) {
    const { result } = simulateMatch(flatSheet("H", homeRating), flatSheet("A", awayRating), createRng(seed));
    goals += result.homeGoals + result.awayGoals;
    if (result.homeGoals > result.awayGoals) homeWins++;
    else if (result.homeGoals === result.awayGoals) draws++;
  }
  return { meanGoals: goals / n, homeWinRate: homeWins / n, drawRate: draws / n };
}

describe("balanceamento", () => {
  test("times iguais", () => {
    const r = run(70, 70);
    expect(r.meanGoals).toBeGreaterThanOrEqual(2.3);
    expect(r.meanGoals).toBeLessThanOrEqual(3.1);
    expect(r.homeWinRate).toBeGreaterThanOrEqual(0.4);
    expect(r.homeWinRate).toBeLessThanOrEqual(0.52);
  });

  test("forte contra fraco", () => {
    const r = run(85, 55);
    expect(r.homeWinRate).toBeGreaterThanOrEqual(0.75);
  });

  test("postura ofensiva cria e sofre mais finalizações", () => {
    const balanced = tally(flatSheet("H", 70), flatSheet("A", 70));
    const attacking = tally(flatSheet("H", 70, "attacking"), flatSheet("A", 70));
    expect(attacking.homeShots).toBeGreaterThanOrEqual(balanced.homeShots * 1.15);
    expect(attacking.awayShots).toBeGreaterThan(balanced.awayShots);
  });

  test("postura defensiva sofre menos gols", () => {
    const balanced = tally(flatSheet("H", 70), flatSheet("A", 70));
    const defensive = tally(flatSheet("H", 70, "defensive"), flatSheet("A", 70));
    expect(defensive.homeConceded).toBeLessThanOrEqual(balanced.homeConceded * 0.85);
  });

  test("taxa de cartões", () => {
    const t = tally(flatSheet("H", 70), flatSheet("A", 70));
    expect(t.yellows).toBeGreaterThanOrEqual(3.0);
    expect(t.yellows).toBeLessThanOrEqual(5.5);
    expect(t.reds).toBeGreaterThanOrEqual(0.08);
    expect(t.reds).toBeLessThanOrEqual(0.3);
  });

  test("taxa de lesões", () => {
    const t = tally(flatSheet("H", 70), flatSheet("A", 70));
    expect(t.injuries).toBeGreaterThanOrEqual(0.1);
    expect(t.injuries).toBeLessThanOrEqual(0.4);
  });
});

describe("equilíbrio financeiro", () => {
  test("caixa equilibrado em uma temporada", () => {
    // Gastos-da-ia C34 (Superseded checks): the running result of the 38 league rounds only -
    // tickets, sponsorship, salaries and interest; cup dates, prizes, transfers and works stay out.
    const ratios: number[] = [];
    for (let seed = 1; seed <= 5; seed++) {
      let state = newGame(seed);
      const serieA = state.leagues[0]!.clubs.map((c) => c.id);
      const running = new Map(state.leagues[0]!.clubs.map((c) => [c.id, c.finance.cash]));
      const initial = new Map(running);
      let leagueRounds = 0;
      while (nextDate(state).kind !== "over") {
        const date = nextDate(state);
        state = playDate(state).state;
        if (date.kind !== "league") continue;
        leagueRounds++;
        const clubs = state.leagues.flatMap((l) => l.clubs);
        for (const id of serieA) {
          const l = clubs.find((c) => c.id === id)!.finance.lastRound!;
          running.set(id, running.get(id)! + l.tickets + l.sponsorship - l.salaries - l.interest);
        }
      }
      expect(leagueRounds).toBe(38);
      for (const id of serieA) ratios.push(running.get(id)! / initial.get(id)!);
    }
    expect(ratios).toHaveLength(100);
    report("C34 uma temporada", ratios);
    for (const r of ratios) {
      expect(r).toBeGreaterThanOrEqual(0.5);
      expect(r).toBeLessThanOrEqual(2.5);
    }
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = (sorted[49]! + sorted[50]!) / 2;
    expect(median).toBeGreaterThanOrEqual(0.9);
    expect(median).toBeLessThanOrEqual(1.6);
  }, 90_000);
});

/** Min / median / max of a list, printed so a run shows the measured band. */
function report(label: string, values: number[]): void {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  console.log(`${label}: ${sorted[0]!.toFixed(2)} / ${median.toFixed(2)} / ${sorted[sorted.length - 1]!.toFixed(2)}`);
}

/** Five seasons of three seeds with no user, played once and shared by the checks below. */
const SEASONS = 5;
const MULTI_SEEDS = [1, 2, 3];
const best18 = (ratings: number[]) => [...ratings].sort((a, b) => b - a).slice(0, 18).reduce((a, b) => a + b, 0) / Math.min(18, ratings.length);

interface Run {
  /** Per season start, per league (in `leagues` order): mean over clubs of the best-18 mean. */
  strength: number[][];
  /** The country of each league, in `leagues` order, at the start. */
  countries: Country[];
  /** Final cash / initial cash, per club, with the country of the league it started in. */
  cash: { country: Country; ratio: number }[];
  /** Paises C33: after every round and every turn of the season, clubs in a league of another country than at the start. */
  countryMoves: string[];
  /** Per season: the transfer list just before the turn of the season. */
  transfers: TransferRecord[][];
  /** Per season: players at another club of Brazil after a round than before it, from the squads alone (paises C26). */
  moved: number[];
  /**
   * Per season: rounds whose squads afterwards differ from the squads before with the round's
   * transfer lines replayed in order (a buy moves `fromId` -> `toId`, a release takes the player
   * out, a free signing brings one in).
   */
  unexplained: number[];
}

/** Which club each player is at. */
const clubOf = (state: GameState) => new Map(state.leagues.flatMap((l) => l.clubs).flatMap((c) => c.players.map((p) => [p.id, c.id] as const)));

let runs: Run[] | null = null;
function multiSeason(): Run[] {
  if (runs) return runs;
  runs = MULTI_SEEDS.map((seed) => {
    let state = newGame(seed);
    const initial = new Map(state.leagues.flatMap((l) => l.clubs).map((c) => [c.id, c.finance.cash]));
    const startCountry = new Map(state.leagues.flatMap((l) => l.clubs.map((c) => [c.id, l.country] as const)));
    const countries = state.leagues.map((l) => l.country);
    const countryMoves: string[] = [];
    const checkCountries = (label: string) => {
      for (const l of state.leagues) for (const c of l.clubs) if (startCountry.get(c.id) !== l.country) countryMoves.push(`${label} ${c.id} em ${l.id}`);
    };
    const strength: number[][] = [];
    const transfers: TransferRecord[][] = [];
    const moved: number[] = [];
    const unexplained: number[] = [];
    for (let season = 1; season <= SEASONS; season++) {
      strength.push(state.leagues.map((l) => l.clubs.reduce((sum, c) => sum + best18(c.players.map((p) => p.rating)), 0) / l.clubs.length));
      let movedNow = 0;
      let unexplainedNow = 0;
      for (let r = 0; r < 38; r++) {
        const before = clubOf(state);
        const seen = state.market.transfers.length;
        state = playRound(state).state;
        checkCountries(`seed ${seed} temporada ${season} rodada ${r + 1}`);
        const after = clubOf(state);
        for (const [id, clubId] of after) {
          const from = before.get(id);
          if (from !== undefined && from !== clubId && startCountry.get(clubId) === "BR") movedNow++;
        }
        const replay = new Map(before);
        let consistent = true;
        for (const t of state.market.transfers.slice(seen)) {
          if ((replay.get(t.playerId) ?? null) !== t.fromId) consistent = false;
          if (t.toId === null) replay.delete(t.playerId);
          else replay.set(t.playerId, t.toId);
        }
        const same = replay.size === after.size && [...after].every(([id, clubId]) => replay.get(id) === clubId);
        if (!consistent || !same) unexplainedNow++;
      }
      moved.push(movedNow);
      unexplained.push(unexplainedNow);
      transfers.push(state.market.transfers);
      if (season < SEASONS) {
        state = nextSeason(state).state;
        checkCountries(`seed ${seed} virada ${season}`);
      }
    }
    const cash = state.leagues.flatMap((l) => l.clubs).map((c) => ({ country: startCountry.get(c.id)!, ratio: c.finance.cash / initial.get(c.id)! }));
    return { strength, countries, cash, countryMoves, transfers, moved, unexplained };
  });
  return runs;
}

describe("equilíbrio em várias temporadas", () => {
  test("força estável em 5 temporadas", () => {
    // Gastos-da-ia C21 (Superseded checks): the limit is 5 points, was 4.
    // Paises C26 (Superseded checks): measured over the leagues of Brazil only.
    let drift = 0;
    for (const [k, run] of multiSeason().entries()) {
      for (const [season, divisions] of run.strength.entries()) {
        divisions.forEach((mean, d) => {
          if (run.countries[d] !== "BR") return;
          drift = Math.max(drift, Math.abs(mean - run.strength[0]![d]!));
          expect(Math.abs(mean - run.strength[0]![d]!), `seed ${MULTI_SEEDS[k]} temporada ${season + 1} divisão ${d}`).toBeLessThanOrEqual(5);
        });
      }
    }
    console.log(`C21 deriva máxima: ${drift.toFixed(2)}`);
  }, 120_000);

  test("caixa em 5 temporadas", () => {
    // Gastos-da-ia C19 (Superseded checks): −2× to 15×, median 2× to 4×; was −2× to 30×, median 3× to 10×.
    // Paises C26 (Superseded checks): the clubs that started in the leagues of Brazil only.
    const ratios = multiSeason().flatMap((r) => r.cash.filter((c) => c.country === "BR").map((c) => c.ratio));
    expect(ratios).toHaveLength(120);
    report("C19 caixa em 5 temporadas", ratios);
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = (sorted[59]! + sorted[60]!) / 2;
    for (const r of ratios) {
      expect(r).toBeGreaterThanOrEqual(-2);
      expect(r).toBeLessThanOrEqual(15);
    }
    expect(median).toBeGreaterThanOrEqual(2);
    expect(median).toBeLessThanOrEqual(4);
  }, 120_000);

  test("compras da IA em 5 temporadas", () => {
    for (const [k, run] of multiSeason().entries()) {
      // Paises C26 (Superseded checks): the buys of the clubs of Brazil, c1-c40 by door 1.
      const brazil = (id: string | null) => id !== null && Number(id.slice(1)) <= 40;
      const buys = run.transfers.map((list) => list.filter((t) => t.kind === "buy" && brazil(t.toId)).length);
      console.log(`C20 seed ${MULTI_SEEDS[k]}: compras por temporada ${buys.join(", ")}; movimentos ${run.transfers.map((l) => l.length).join(", ")}`);
      console.log(`C20 seed ${MULTI_SEEDS[k]}: jogadores que mudaram de clube por temporada ${run.moved.join(", ")}`);
      // L-015: the lines are checked against the squads. Replaying each round's lines over the
      // squads before it gives the squads after it, so every buy line is one player leaving
      // one club for another. A player bought twice in the same round counts once in the
      // squads, so the squads alone give a lower bound on the buys.
      expect(run.unexplained, `seed ${MULTI_SEEDS[k]}`).toEqual([0, 0, 0, 0, 0]);
      for (const [season, n] of buys.entries()) {
        expect(run.moved[season]!, `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toBeGreaterThan(0);
        expect(n, `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toBeGreaterThanOrEqual(run.moved[season]!);
      }
      for (const [season, n] of buys.entries()) expect(n, `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toBeGreaterThan(0);
      const total = buys.reduce((a, b) => a + b, 0);
      expect(total, `seed ${MULTI_SEEDS[k]}`).toBeGreaterThanOrEqual(50);
      expect(total, `seed ${MULTI_SEEDS[k]}`).toBeLessThanOrEqual(600);
    }
  }, 120_000);

  test("uma compra por jogador por temporada", () => {
    // Ajustes-4a AC 8: the list is read just before each turn of the season.
    let most = 0;
    for (const [k, run] of multiSeason().entries()) {
      expect(run.transfers).toHaveLength(SEASONS);
      for (const [season, list] of run.transfers.entries()) {
        const buys = new Map<string, number>();
        for (const t of list) if (t.kind === "buy") buys.set(t.playerId, (buys.get(t.playerId) ?? 0) + 1);
        expect(buys.size, `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toBeGreaterThan(0);
        const max = Math.max(...buys.values());
        most = Math.max(most, max);
        expect(max, `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toBeLessThanOrEqual(1);
      }
    }
    console.log(`AC 8 maior número de compras de um jogador numa temporada: ${most}`);
  }, 120_000);

  test("boletim só com os três tipos", () => {
    for (const [k, run] of multiSeason().entries()) {
      expect(run.transfers).toHaveLength(SEASONS);
      for (const [season, list] of run.transfers.entries()) {
        expect(list.length, `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toBeGreaterThan(0);
        const kinds = new Set(list.map((t) => t.kind));
        for (const kind of kinds) expect(["buy", "free", "release"], `seed ${MULTI_SEEDS[k]} temporada ${season + 1}`).toContain(kind);
      }
    }
  }, 120_000);
  test("caixa em 5 temporadas dos países novos", () => {
    // Paises C24 (AC 23): every club of the Liga Argentina and the Liga Portuguesa between −2× and
    // 15× its initial cash, the median of each league between 1,2× and 4× (floor renegotiated from 2×).
    const all = multiSeason().flatMap((r) => r.cash);
    for (const country of ["AR", "PT"] as const) {
      const ratios = all.filter((c) => c.country === country).map((c) => c.ratio);
      expect(ratios, country).toHaveLength(60);
      report(`C24 caixa em 5 temporadas ${country}`, ratios);
      for (const r of ratios) {
        expect(r, country).toBeGreaterThanOrEqual(-2);
        expect(r, country).toBeLessThanOrEqual(15);
      }
      const sorted = [...ratios].sort((a, b) => a - b);
      const median = (sorted[29]! + sorted[30]!) / 2;
      expect(median, country).toBeGreaterThanOrEqual(1.2);
      expect(median, country).toBeLessThanOrEqual(4);
    }
  }, 120_000);

  test("força estável dos países novos", () => {
    // Paises C25 (AC 24): the mean best 18 of the Liga Argentina and the Liga Portuguesa stays
    // within 5 points of season 1, every season.
    for (const [k, run] of multiSeason().entries()) {
      expect(run.countries, `seed ${MULTI_SEEDS[k]}`).toEqual(["BR", "BR", "AR", "PT"]);
      for (const d of [2, 3]) {
        const drift = run.strength.map((divisions) => Math.abs(divisions[d]! - run.strength[0]![d]!));
        console.log(`C25 seed ${MULTI_SEEDS[k]} ${run.countries[d]}: deriva ${drift.map((x) => x.toFixed(2)).join(", ")}`);
        expect(run.strength, `seed ${MULTI_SEEDS[k]}`).toHaveLength(SEASONS);
        for (const [season, x] of drift.entries()) {
          expect(x, `seed ${MULTI_SEEDS[k]} temporada ${season + 1} ${run.countries[d]}`).toBeLessThanOrEqual(5);
        }
      }
    }
  }, 120_000);

  test("clube nunca muda de país", () => {
    // Paises C33 (door 1): after every round and every turn of the season of 5 seasons of seeds 1-3.
    for (const run of multiSeason()) expect(run.countryMoves).toEqual([]);
  }, 120_000);
});

describe("partida coerente (correcoes-validacao)", () => {
  test("conversão sem goleiro", () => {
    // C43 (AC 39): 2000 matches against a 4-4-2 with no keeper (ten outfield players).
    const home = flatSheet("H", 70);
    const away = flatSheet("A", 70);
    away.starters = away.starters.filter((p) => p.position !== "GK");
    expect(away.starters).toHaveLength(10);
    let goals = 0;
    let onTarget = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      for (const e of simulateMatch(home, away, createRng(seed)).events) {
        if (e.clubId !== "H") continue;
        if (e.type === "goal") goals++;
        if (e.type === "goal" || e.type === "shot_saved") onTarget++;
      }
    }
    console.log(`C43 conversão contra time sem goleiro: ${(goals / onTarget).toFixed(3)} (${goals}/${onTarget})`);
    expect(onTarget).toBeGreaterThan(0);
    expect(goals / onTarget).toBeLessThan(0.8);
  });

  test("formação muda o placar", () => {
    // C46 (AC 42): the same clubs, 70 against 70; the home side in 4-3-3 and then in 4-5-1, against a 4-4-2.
    const homeGoals = (formation: FormationName) => {
      let goals = 0;
      for (let seed = 1; seed <= 2000; seed++) goals += simulateMatch(flatSheet("H", 70, "balanced", formation), flatSheet("A", 70), createRng(seed)).result.homeGoals;
      return goals / 2000;
    };
    const attacking = homeGoals("4-3-3");
    const holding = homeGoals("4-5-1");
    console.log(`C46 gols do mandante: 4-3-3 ${attacking.toFixed(3)}, 4-5-1 ${holding.toFixed(3)}`);
    expect(attacking).toBeGreaterThanOrEqual(1.05 * holding);
  });
});

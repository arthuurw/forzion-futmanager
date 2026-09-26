import { CLUBS_PER_LEAGUE, PLAYERS_PER_CLUB, SERIE_B, generateLeague, newGame, takenNames } from "./generate";
import { createRng, mix32 } from "./rng";
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

/** Written out here, not imported (L-004): AD-009 and AD-011. */
const SERIE_A_NAMES = [
  "Rubro-Negro Carioca", "Alviverde Paulistano", "Alvinegro do Parque", "Tricolor do Morumbi", "Peixe Praiano",
  "Tricolor das Laranjeiras", "Estrela Solitária", "Cruzmaltino da Colina", "Tricolor Gaúcho", "Colorado do Sul",
  "Galo Mineiro", "Raposa Celeste", "Esquadrão de Aço", "Leão da Barra", "Leão do Pici",
  "Vozão Alvinegro", "Leão da Ilha", "Massa Bruta Paulista", "Furacão Paranaense", "Coxa Alviverde",
];
const SERIE_B_NAMES = [
  "Esmeraldino do Cerrado", "Macaca Campineira", "Bugre Campineiro", "Leão Catarinense", "Papão da Curuzu",
  "Leão Azul Paraense", "Timbu Pernambucano", "Cobra Coral", "Coelho Mineiro", "Verdão do Oeste",
  "Tigre Catarinense", "Tigrão Goiano", "Galo da Pajuçara", "Azulão do Mutange", "Alvinegro Potiguar",
  "Tubarão Paranaense", "Fantasma de Ponta Grossa", "Pantera de Ribeirão", "Dragão Goiano", "Dourado Pantaneiro",
];

describe("duas divisões", () => {
  const seeds = [1, 2, 3, 42, 2024];

  test("duas divisões com identidades fixas", () => {
    for (const seed of seeds) {
      const state = newGame(seed);
      expect(state.leagues.map((l) => l.id), `seed ${seed}`).toEqual(["l1", "l2"]);
      const [a, b] = state.leagues as [(typeof state.leagues)[0], (typeof state.leagues)[0]];
      expect(a.clubs.map((c) => c.name).sort()).toEqual([...SERIE_A_NAMES].sort());
      expect(b.clubs.map((c) => c.name).sort()).toEqual([...SERIE_B_NAMES].sort());
      expect(b.clubs.map((c) => c.id).sort()).toEqual(Array.from({ length: 20 }, (_, i) => `c${21 + i}`).sort());
      expect(a.clubs.map((c) => c.id).sort()).toEqual(Array.from({ length: 20 }, (_, i) => `c${1 + i}`).sort());
      const names = [...a.clubs, ...b.clubs].flatMap((c) => c.players.map((p) => p.name));
      names.push(...state.market.freeAgents.map((p) => p.name), ...state.market.juniors.map((p) => p.name));
      expect(new Set(names).size, `seed ${seed}`).toBe(names.length);
      expect(names).toHaveLength(40 * 22 + 40 + 3);
    }
  });

  test("série B mais fraca", () => {
    const means = { a: [] as number[], b: [] as number[] };
    for (const seed of seeds) {
      const [a, b] = newGame(seed).leagues;
      const mean = (c: Club) => c.players.reduce((s, p) => s + p.rating, 0) / c.players.length;
      for (const c of a!.clubs) {
        expect(mean(c), c.id).toBeGreaterThanOrEqual(55);
        expect(mean(c), c.id).toBeLessThanOrEqual(83);
      }
      for (const c of b!.clubs) {
        expect(mean(c), c.id).toBeGreaterThanOrEqual(47);
        expect(mean(c), c.id).toBeLessThanOrEqual(69);
      }
      means.a.push(a!.clubs.reduce((s, c) => s + mean(c), 0) / 20);
      means.b.push(b!.clubs.reduce((s, c) => s + mean(c), 0) / 20);
    }
    for (const m of means.a) {
      expect(m).toBeGreaterThanOrEqual(67);
      expect(m).toBeLessThanOrEqual(71);
    }
    for (const m of means.b) {
      expect(m).toBeGreaterThanOrEqual(56);
      expect(m).toBeLessThanOrEqual(60);
    }
  });

  test("contratos de 1 a 4", () => {
    for (const seed of seeds) {
      const seen = new Set<number>();
      for (const league of newGame(seed).leagues) {
        for (const c of league.clubs) {
          for (const p of c.players) {
            expect(Number.isInteger(p.contractSeasons), p.id).toBe(true);
            expect(p.contractSeasons, p.id).toBeGreaterThanOrEqual(1);
            expect(p.contractSeasons, p.id).toBeLessThanOrEqual(4);
            seen.add(p.contractSeasons);
          }
        }
      }
      expect([...seen].sort(), `seed ${seed}`).toEqual([1, 2, 3, 4]);
    }
  });

  test("série B tem stream próprio", () => {
    for (const seed of seeds) {
      const state = newGame(seed);
      // The Série A and rngState are still those of createRng(seed) alone.
      const rng = createRng(seed);
      expect(state.leagues[0]).toEqual(generateLeague(rng, "l1", "Campeonato Nacional"));
      expect(state.rngState).toBe(rng.getState());
      // The Série B is generateLeague over mix32(seed, 4), avoiding the Série A and market names.
      const taken = takenNames({ leagues: [state.leagues[0]!], market: state.market });
      expect(state.leagues[1]).toEqual(generateLeague(createRng(mix32(seed, 4)), "l2", "Série B", SERIE_B, taken));
    }
  });
});

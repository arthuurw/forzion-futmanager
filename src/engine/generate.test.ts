import { readFileSync } from "node:fs";
import { CLUBS_PER_LEAGUE, LIGA_ARGENTINA, LIGA_PORTUGUESA, PLAYERS_PER_CLUB, SERIE_B, generateLeague, newGame, takenNames } from "./generate";
import { AR_IDENTITIES, CLUB_IDENTITIES, FIRST_NAMES_BY_COUNTRY, PT_IDENTITIES, SERIE_B_IDENTITIES } from "./names";
import { createRng, mix32 } from "./rng";
import { AGE_MAX, AGE_MIN, COUNTRIES, POSITIONS, RATING_MAX, RATING_MIN, SCHEMA_VERSION, type Club, type Position } from "./types";

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
      // Paises (Superseded checks): 4 leagues.
      expect(state.leagues.map((l) => l.id), `seed ${seed}`).toEqual(["l1", "l2", "l3", "l4"]);
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

describe("boletim (gastos-da-ia)", () => {
  test("jogo novo com boletim vazio", () => {
    // Paises (Superseded checks): the save is v7.
    expect(SCHEMA_VERSION).toBe(8);
    for (const seed of [1, 2, 3]) {
      const state = newGame(seed);
      expect(state.schemaVersion).toBe(8);
      expect(state.market.transfers).toEqual([]);
    }
  });
});

// ---------- paises ----------

/** Written out here, not imported (L-004): paises AC 2, AC 3. */
const SQUAD_3775: Record<Position, number> = { GK: 3, DF: 7, MF: 7, FW: 5 };
const REAL_CLUBS = [
  "River", "Boca", "Racing", "Independiente", "San Lorenzo", "Vélez", "Estudiantes", "Newell's", "Rosario Central", "Huracán",
  "Benfica", "Porto", "Sporting", "Braga", "Vitória", "Boavista", "Marítimo", "Belenenses",
];

/** Snapshot v6 (checks.md): recorded from 889aa71, before the countries existed. */
interface SnapshotSeed {
  serieA: Record<string, unknown>;
  serieB: Record<string, unknown>;
  market: unknown;
  rngState: number;
}
const snapshotV6 = () =>
  JSON.parse(readFileSync(new URL("./__fixtures__/snapshot-v6.json", import.meta.url), "utf8")) as Record<string, SnapshotSeed>;

describe("países (paises S1)", () => {
  test("quatro ligas em ordem", () => {
    // C1 (AC 1, door 1) and C32.
    const s = newGame(1);
    expect(s.leagues.map((l) => [l.id, l.country, l.tier])).toEqual([
      ["l1", "BR", 0],
      ["l2", "BR", 1],
      ["l3", "AR", 0],
      ["l4", "PT", 0],
    ]);
    expect(SCHEMA_VERSION).toBe(8);
    expect(s.schemaVersion).toBe(8);
    expect(COUNTRIES).toEqual({ BR: "Brasil", AR: "Argentina", PT: "Portugal" });
  });

  test("ligas novas com 20 clubes de 22", () => {
    // C2 (AC 2).
    const s = newGame(1);
    const expectIds = (first: number) => Array.from({ length: 20 }, (_, i) => `c${first + i}`).sort();
    expect(s.leagues[2]!.clubs.map((c) => c.id).sort()).toEqual(expectIds(41));
    expect(s.leagues[3]!.clubs.map((c) => c.id).sort()).toEqual(expectIds(61));
    const clubs = [...s.leagues[2]!.clubs, ...s.leagues[3]!.clubs];
    expect(clubs).toHaveLength(40);
    for (const c of clubs) {
      expect(c.players, c.id).toHaveLength(22);
      const shape = { GK: 0, DF: 0, MF: 0, FW: 0 };
      for (const p of c.players) shape[p.position]++;
      expect(shape, c.id).toEqual(SQUAD_3775);
      expect(c.players.map((p) => p.id), c.id).toEqual(Array.from({ length: 22 }, (_, i) => `${c.id}-p${i + 1}`));
    }
    expect(new Set(s.leagues.flatMap((l) => l.clubs.map((c) => c.id))).size).toBe(80);
  });

  test("identidades fictícias dos países novos", () => {
    // C3 (AC 3, AD-008).
    expect(AR_IDENTITIES).toHaveLength(20);
    expect(PT_IDENTITIES).toHaveLength(20);
    const all = [...CLUB_IDENTITIES, ...SERIE_B_IDENTITIES, ...AR_IDENTITIES, ...PT_IDENTITIES].map((c) => c.name);
    expect(new Set(all).size).toBe(80);
    for (const id of [...AR_IDENTITIES, ...PT_IDENTITIES]) {
      expect(id.colors.length, id.name).toBeGreaterThanOrEqual(1);
      expect(id.colors.length, id.name).toBeLessThanOrEqual(3);
      expect(["vertical", "horizontal", "diagonal", "cross", "hoops"], id.name).toContain(id.pattern);
      for (const real of REAL_CLUBS) expect(id.name.toLowerCase(), `${id.name} ~ ${real}`).not.toContain(real.toLowerCase());
    }
    for (const seed of [1, 2, 3]) {
      const s = newGame(seed);
      expect(s.leagues[2]!.clubs.map((c) => c.name).sort()).toEqual(AR_IDENTITIES.map((c) => c.name).sort());
      expect(s.leagues[3]!.clubs.map((c) => c.name).sort()).toEqual(PT_IDENTITIES.map((c) => c.name).sort());
    }
  });

  test("nomes de jogador por país", () => {
    // C4 (AC 4, door 4).
    const { BR, AR, PT } = FIRST_NAMES_BY_COUNTRY;
    expect(AR).not.toEqual(BR);
    expect(PT).not.toEqual(BR);
    expect(AR).not.toEqual(PT);
    const s = newGame(1);
    const first = (name: string) => name.slice(0, name.indexOf(" "));
    for (const [k, list] of [[2, AR], [3, PT]] as const) {
      for (const c of s.leagues[k]!.clubs) for (const p of c.players) expect(list, p.name).toContain(first(p.name));
    }
    const names = [
      ...s.leagues.flatMap((l) => l.clubs.flatMap((c) => c.players.map((p) => p.name))),
      ...s.market.freeAgents.map((p) => p.name),
      ...s.market.juniors.map((p) => p.name),
    ];
    expect(names).toHaveLength(80 * 22 + 40 + 3);
    expect(new Set(names).size).toBe(names.length);
  });

  test("força dos países novos", () => {
    // C5 (AC 5).
    expect(LIGA_ARGENTINA.base).toEqual({ min: 60, max: 76 });
    expect(LIGA_PORTUGUESA.base).toEqual({ min: 58, max: 80 });
    const s = newGame(1);
    const mean = (c: Club) => c.players.reduce((sum, p) => sum + p.rating, 0) / c.players.length;
    for (const k of [2, 3]) {
      const means = s.leagues[k]!.clubs.map(mean);
      expect(Math.max(...means) - Math.min(...means), s.leagues[k]!.id).toBeGreaterThanOrEqual(10);
    }
  });

  test("Brasil igual ao snapshot v6", () => {
    // C6 (AC 6, door 3, door 4): the Brazil of a seed is the one of v6.
    const snapshot = snapshotV6();
    const withoutDoor1 = (l: unknown) => {
      const { country, tier, ...rest } = l as Record<string, unknown>;
      expect([country, tier].every((x) => x !== undefined)).toBe(true);
      return rest;
    };
    for (const seed of [1, 2, 3]) {
      const s = newGame(seed);
      const v6 = snapshot[seed]!;
      expect(withoutDoor1(s.leagues[0]), `seed ${seed}`).toEqual(v6.serieA);
      expect(withoutDoor1(s.leagues[1]), `seed ${seed}`).toEqual(v6.serieB);
      expect(s.market, `seed ${seed}`).toEqual(v6.market);
      expect(s.rngState, `seed ${seed}`).toBe(v6.rngState);
    }
  });
});

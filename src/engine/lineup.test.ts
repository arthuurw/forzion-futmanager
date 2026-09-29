import { newGame } from "./generate";
import { AI_FORMATION, FORMATIONS, assignSlot, autoLineup, formationSlots, isAvailableFor, starters, validateLineup } from "./lineup";
import { effectiveRating } from "./strength";
import { FORMATION_NAMES, type Club, type Position } from "./types";

function club(seed = 5): Club {
  return newGame(seed).leagues[0]!.clubs[3]!;
}

describe("escalação", () => {
  test("auto preenche melhor por slot", () => {
    const c = club();
    for (const formation of FORMATION_NAMES) {
      const lineup = autoLineup(c, formation);
      const slots = formationSlots(formation);
      expect(slots).toHaveLength(11);
      expect(lineup.starters).toHaveLength(11);
      expect(lineup.starters.every(Boolean)).toBe(true);
      expect(new Set(lineup.starters).size).toBe(11);
      // Per position: the chosen set is the top-N by rating of that position.
      for (const position of ["GK", "DF", "MF", "FW"] as Position[]) {
        const need = position === "GK" ? 1 : FORMATIONS[formation][position];
        const chosen = slots
          .map((pos, i) => (pos === position ? lineup.starters[i] : null))
          .filter((id): id is string => !!id)
          .map((id) => c.players.find((p) => p.id === id)!.rating)
          .sort((a, b) => b - a);
        const top = c.players
          .filter((p) => p.position === position)
          .map((p) => p.rating)
          .sort((a, b) => b - a)
          .slice(0, need);
        expect(chosen).toEqual(top);
      }
      expect(validateLineup(c, lineup).ok).toBe(true);
    }
  });

  // Supersedes nucleo C19 ("slot rejeita posição diferente"): partida-ao-vivo AC 23 allows it at 75%.
  test("fora de posição aceito com 75% da força", () => {
    const c = club();
    const lineup = autoLineup(c, "4-4-2");
    const benchDf = c.players.find((p) => p.position === "DF" && !lineup.starters.includes(p.id))!;
    const fwSlot = formationSlots("4-4-2").indexOf("FW");
    const dfSlot = formationSlots("4-4-2").indexOf("DF");
    const oop = assignSlot(c, lineup, fwSlot, benchDf.id)!;
    expect(oop.starters[fwSlot]).toBe(benchDf.id);
    expect(validateLineup(c, oop).ok).toBe(true);
    expect(effectiveRating(benchDf, "FW") / effectiveRating(benchDf, "DF")).toBeCloseTo(0.75, 10);
    const ok = assignSlot(c, lineup, dfSlot, benchDf.id)!;
    expect(ok.starters[dfSlot]).toBe(benchDf.id);
    // Moving a starter to another slot empties the one it came from.
    const otherDf = formationSlots("4-4-2").lastIndexOf("DF");
    const moved = assignSlot(c, ok, otherDf, benchDf.id)!;
    expect(moved.starters[dfSlot]).toBeNull();
    expect(moved.starters[otherDf]).toBe(benchDf.id);
    expect(validateLineup(c, moved)).toEqual({ ok: false, missing: 1 });
  });

  test("IA escala melhores 11 em 4-4-2", () => {
    expect(AI_FORMATION).toBe("4-4-2");
    const c = club(9);
    const lineup = autoLineup(c, AI_FORMATION);
    const xi = starters(c, lineup);
    expect(xi).toHaveLength(11);
    const count = (pos: Position) => xi.filter((p) => p.position === pos).length;
    expect([count("GK"), count("DF"), count("MF"), count("FW")]).toEqual([1, 4, 4, 2]);
    for (const p of xi) {
      const betterBench = c.players.find((q) => q.position === p.position && q.rating > p.rating && !xi.includes(q));
      expect(betterBench).toBeUndefined();
    }
  });

  test("validação conta titulares faltando", () => {
    const c = club();
    const lineup = autoLineup(c, "4-3-3");
    const broken = { ...lineup, starters: lineup.starters.map((id, i) => (i < 3 ? null : id)) };
    expect(validateLineup(c, broken)).toEqual({ ok: false, missing: 3 });
    const dup = { ...lineup, starters: lineup.starters.map((id, i) => (i === 2 ? lineup.starters[1]! : id)) };
    expect(validateLineup(c, dup)).toEqual({ ok: false, missing: 1 });
    expect(validateLineup(c, null)).toEqual({ ok: false, missing: 11 });
  });

  test("indisponível não entra na escalação", () => {
    const c = club();
    const lineup = autoLineup(c, "4-4-2");
    const [injured, suspended] = c.players.filter((p) => p.position === "MF" && lineup.starters.includes(p.id));
    injured!.injuryRounds = 2;
    suspended!.suspendedRounds = 1;
    // Neither can be put in a slot, the saved lineup counts them as missing, and autoLineup skips them.
    expect(assignSlot(c, lineup, 0, injured!.id)).toBeNull();
    expect(assignSlot(c, lineup, 0, suspended!.id)).toBeNull();
    expect(validateLineup(c, lineup)).toEqual({ ok: false, missing: 2 });
    const fresh = autoLineup(c, "4-4-2");
    expect(fresh.starters).not.toContain(injured!.id);
    expect(fresh.starters).not.toContain(suspended!.id);
    expect(validateLineup(c, fresh).ok).toBe(true);
  });
});

describe("disponibilidade por competição (copa-nacional)", () => {
  test("disponibilidade por competição", () => {
    const p = club().players[0]!;
    const cup = { kind: "cup", cupId: "cup-nat" } as const;
    const league = { kind: "league" } as const;
    const variants = {
      nada: { ...p, injuryRounds: 0, suspendedRounds: 0, cupDiscipline: {} },
      lesao: { ...p, injuryRounds: 2, suspendedRounds: 0, cupDiscipline: {} },
      suspensaoLiga: { ...p, injuryRounds: 0, suspendedRounds: 1, cupDiscipline: {} },
      suspensaoCopa: { ...p, injuryRounds: 0, suspendedRounds: 0, cupDiscipline: { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } } },
    };
    const table: [keyof typeof variants, boolean, boolean][] = [
      ["nada", true, true],
      ["lesao", false, false],
      ["suspensaoLiga", false, true],
      ["suspensaoCopa", true, false],
    ];
    for (const [key, inLeague, inCup] of table) {
      expect(isAvailableFor(variants[key], league), `${key} na liga`).toBe(inLeague);
      expect(isAvailableFor(variants[key], cup), `${key} na copa`).toBe(inCup);
    }
  });
});

describe("escalação com menos de 11 aptos (correcoes-validacao)", () => {
  test("mínimo é o menor entre 11 e os aptos", () => {
    // C17 (AC 16, L-005, L-007): 12, 11, 10 and 7 available; the others injured.
    for (const available of [12, 11, 10, 7]) {
      const c = club();
      c.players.forEach((p, i) => Object.assign(p, { injuryRounds: i < available ? 0 : 2, suspendedRounds: 0 }));
      const full = autoLineup(c, "4-4-2");
      const fielded = full.starters.filter(Boolean);
      expect(fielded, `${available} aptos`).toHaveLength(Math.min(11, available));
      expect(validateLineup(c, full), `${available} aptos`).toEqual({ ok: true, missing: 0 });
      // One slot less: an empty slot, then an injured player in it; neither counts.
      const slot = full.starters.indexOf(fielded[fielded.length - 1]!);
      const short = { ...full, starters: full.starters.map((id, i) => (i === slot ? null : id)) };
      const injured = { ...full, starters: full.starters.map((id, i) => (i === slot ? c.players[21]!.id : id)) };
      expect(c.players[21]!.injuryRounds).toBe(2);
      // 12 and 11 need 11 valid; 10 needs the 10 (9 miss one); 7 only its full eleven, checked above.
      if (available >= 10) {
        expect(validateLineup(c, short), `${available} aptos`).toEqual({ ok: false, missing: 1 });
        expect(validateLineup(c, injured), `${available} aptos`).toEqual({ ok: false, missing: 1 });
      }
    }
  });
});

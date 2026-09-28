import { userBoardGoal } from "./board";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { migrateSave } from "./migrate";
import { nextSeason } from "./rollover";
import { nextDate } from "./calendar";
import { playDate, playRound } from "./season";
import { decodeSaveFile, encodeSaveFile, saveFileName } from "./saveFile";
import { v1Document, v7Document } from "./test-fixtures";
import type { GameState } from "./types";

const ISO = "2026-09-28T12:00:00.000Z";

function withClub(seed = 1): GameState {
  const state = newGame(seed);
  const club = state.leagues[0]!.clubs[0]!;
  state.userClubId = club.id;
  state.boardGoal = userBoardGoal(state);
  club.lineup = autoLineup(club, AI_FORMATION);
  return state;
}

function played(state: GameState, rounds: number): GameState {
  let s = state;
  for (let i = 0; i < rounds; i++) s = playRound(s).state;
  return s;
}

const envelope = (save: unknown) => JSON.stringify({ format: "forzion-futmanager-save", exportedAt: ISO, save });

describe("arquivo de save (lancamento door 1)", () => {
  test("envelope tem só format, exportedAt e save", () => {
    const game = withClub();
    const parsed = JSON.parse(encodeSaveFile(game, ISO)) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["exportedAt", "format", "save"]);
    expect(parsed.format).toBe("forzion-futmanager-save");
    expect(parsed.exportedAt).toBe(ISO);
    expect(parsed.save).toEqual(game);
  });

  test("nome do arquivo sem acento e com hífen", () => {
    expect(saveFileName(2026, "São Paulo")).toBe("forzion-futmanager-t2026-sao-paulo.json");
    expect(saveFileName(3, "Rubro-Negro Carioca")).toBe("forzion-futmanager-t3-rubro-negro-carioca.json");
    expect(saveFileName(1, "Grêmio  Porto-Alegrense")).toBe("forzion-futmanager-t1-gremio-porto-alegrense.json");
  });

  test("ida e volta devolve o mesmo jogo", () => {
    const fresh = withClub(4);
    const midSeason = played(withClub(5), 20);
    let second = newGame(6);
    while (nextDate(second).kind !== "over") second = playDate(second).state;
    second = nextSeason(second).state;
    second.userClubId = second.leagues[0]!.clubs[3]!.id;
    expect(second.history.length).toBeGreaterThan(0);
    for (const g of [fresh, midSeason, second]) {
      const r = decodeSaveFile(encodeSaveFile(g, ISO));
      expect(r.kind).toBe("ok");
      if (r.kind === "ok") expect(r.state).toEqual(g);
    }
  });

  test("save antigo chega migrado", () => {
    const v7 = v7Document(3, 4);
    const r7 = decodeSaveFile(envelope(v7));
    expect(r7.kind).toBe("ok");
    const expected = migrateSave(v7);
    if (r7.kind === "ok" && expected.kind === "ok") expect(r7.state).toEqual(expected.state);
    else throw new Error("v7 did not migrate");
    const v1 = { ...v1Document(3), userClubId: (v1Document(3) as { leagues: { clubs: { id: string }[] }[] }).leagues[0]!.clubs[2]!.id };
    const r1 = decodeSaveFile(envelope(v1));
    expect(r1.kind).toBe("ok");
    if (r1.kind === "ok") expect(r1.state.schemaVersion).toBe(8);
  });

  test("texto que não é JSON", () => {
    expect(decodeSaveFile("isto não é json")).toEqual({ kind: "invalid_json" });
    expect(decodeSaveFile("")).toEqual({ kind: "invalid_json" });
  });

  test("JSON que não é arquivo de save", () => {
    const game = withClub();
    const cases = [
      JSON.stringify({ exportedAt: ISO, save: game }),
      JSON.stringify({ format: "outro-jogo", exportedAt: ISO, save: game }),
      JSON.stringify([game]),
      "null",
      JSON.stringify(game),
    ];
    for (const text of cases) expect(decodeSaveFile(text), text.slice(0, 60)).toEqual({ kind: "not_a_save" });
  });

  test("versão não suportada", () => {
    expect(decodeSaveFile(envelope({ ...withClub(), schemaVersion: 9 }))).toEqual({ kind: "unsupported_version", version: 9 });
  });

  test("save v8 sem a forma de um jogo", () => {
    const breaks: [string, (s: Record<string, unknown>) => void][] = [
      ["leagues ausente", (s) => delete s.leagues],
      ["leagues vazio", (s) => (s.leagues = [])],
      ["liga sem clubs em lista", (s) => ((s.leagues as Record<string, unknown>[])[1]!.clubs = "x")],
      ["market ausente", (s) => delete s.market],
      ["history não lista", (s) => (s.history = {})],
      ["cups não lista", (s) => (s.cups = null)],
      ["seed não inteiro", (s) => (s.seed = 1.5)],
      ["rngState não inteiro", (s) => (s.rngState = "7")],
      ["season não inteiro", (s) => (s.season = null)],
      ["userClubId fora das ligas", (s) => (s.userClubId = "nenhum")],
    ];
    expect(breaks).toHaveLength(10);
    for (const [name, brk] of breaks) {
      const s = JSON.parse(JSON.stringify(withClub())) as Record<string, unknown>;
      brk(s);
      expect(decodeSaveFile(envelope(s)), name).toEqual({ kind: "malformed" });
    }
    expect(decodeSaveFile(envelope(withClub())).kind).toBe("ok");
  });
});

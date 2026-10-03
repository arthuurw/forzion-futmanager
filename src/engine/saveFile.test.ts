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
    // Correcoes-validacao C3: the user's club has a lineup, as after choosing it.
    second.leagues[0]!.clubs[3]!.lineup = autoLineup(second.leagues[0]!.clubs[3]!, AI_FORMATION);
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
    // Correcoes-validacao C3: the user's club needs its lineup, so the v1 save keeps its own user
    // club (which has one) instead of pointing at a club without.
    const v1 = v1Document(3);
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

describe("save importado íntegro (correcoes-validacao)", () => {
  test("validação profunda do save importado", () => {
    // C3 (AC 4, L-005, L-007): a valid v8 save with one field taken out at a time.
    const start = newGame(8);
    const mine = start.leagues[0]!.clubs[5]!;
    start.userClubId = mine.id;
    start.boardGoal = userBoardGoal(start);
    mine.lineup = autoLineup(mine, AI_FORMATION);
    const game = played(start, 3);
    const breaks: [string, (s: GameState) => void][] = [
      ["leagues[0].rounds", (s) => delete (s.leagues[0] as Partial<GameState["leagues"][0]>).rounds],
      ["leagues[0].currentRound", (s) => delete (s.leagues[0] as Partial<GameState["leagues"][0]>).currentRound],
      ["clubs[0].players", (s) => delete (s.leagues[0]!.clubs[0] as Partial<GameState["leagues"][0]["clubs"][0]>).players],
      ["clubs[0].finance", (s) => delete (s.leagues[0]!.clubs[0] as Partial<GameState["leagues"][0]["clubs"][0]>).finance],
      ["clubs[0].forSale", (s) => delete (s.leagues[0]!.clubs[0] as Partial<GameState["leagues"][0]["clubs"][0]>).forSale],
      [
        "lineup do clube do usuário",
        (s) => delete (s.leagues.flatMap((l) => l.clubs).find((c) => c.id === s.userClubId) as Partial<GameState["leagues"][0]["clubs"][0]>).lineup,
      ],
    ];
    expect(breaks).toHaveLength(6);
    // The user is not club 0 of the first league, so the club fields and the lineup are two cases.
    expect(game.userClubId).not.toBe(game.leagues[0]!.clubs[0]!.id);
    for (const [name, brk] of breaks) {
      const s = JSON.parse(JSON.stringify(game)) as GameState;
      brk(s);
      expect(decodeSaveFile(encodeSaveFile(s, ISO)), name).toEqual({ kind: "malformed" });
    }
    expect(decodeSaveFile(encodeSaveFile(game, ISO))).toEqual({ kind: "ok", state: game });
  });
});

describe("carreira no arquivo (carreira-dinamica)", () => {
  test("proposta pendente no arquivo", () => {
    // C19 (AC 26): an offer naming a club that does not exist, or the user's own, is refused.
    const game = withClub();
    const other = game.leagues[1]!.clubs[0]!.id;
    const withJob = (clubIds: string[]) => envelope({ ...game, pendingJob: { reason: "offer", clubIds } });
    expect(decodeSaveFile(withJob(["no-such-club"])).kind).toBe("malformed");
    expect(decodeSaveFile(withJob([other, game.userClubId!])).kind).toBe("malformed");
    const ok = decodeSaveFile(withJob([other]));
    expect(ok.kind).toBe("ok");
    if (ok.kind === "ok") expect(ok.state.pendingJob).toEqual({ reason: "offer", clubIds: [other] });
    expect("pendingJob" in game).toBe(false);
    expect(decodeSaveFile(envelope(game)).kind).toBe("ok");
  });
});

describe("empréstimo no arquivo (emprestimos)", () => {
  test("empréstimo atravessa o arquivo", () => {
    // C16 (door 1): two players on loan, one each way, export and import unchanged.
    const g = withClub(4);
    const [me, x] = [g.leagues[0]!.clubs[0]!, g.leagues[0]!.clubs[3]!];
    const out = me.players.pop()!;
    x.players.push({ ...out, loanFrom: me.id });
    const inn = x.players.shift()!;
    me.players.push({ ...inn, loanFrom: x.id });
    const r = decodeSaveFile(encodeSaveFile(g, ISO));
    expect(r).toEqual({ kind: "ok", state: g });
    if (r.kind !== "ok") throw new Error(r.kind);
    const loaned = r.state.leagues.flatMap((l) => l.clubs).flatMap((c) => c.players).filter((p) => p.loanFrom);
    expect(loaned.map((p) => [p.id, p.loanFrom]).sort()).toEqual([[out.id, me.id], [inn.id, x.id]].sort());
  });
});

describe("notícias no arquivo (noticias)", () => {
  test("notícias atravessam o arquivo", () => {
    // C12 (door 1): a league and a cup item, export and import unchanged.
    const g = withClub(6);
    const x = g.leagues[0]!.clubs[4]!.id;
    g.news = [
      { season: 1, date: { kind: "league", round: 3 }, kind: "offer", playerName: "Fulano", clubId: x, amount: 900_000 },
      { season: 1, date: { kind: "cup", cupId: "cup-nat", phase: 0 }, kind: "cup", cupId: "cup-nat", phase: 0, result: "advanced", opponentId: x },
    ];
    const r = decodeSaveFile(encodeSaveFile(g, ISO));
    expect(r).toEqual({ kind: "ok", state: g });
  });
});

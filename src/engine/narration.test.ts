import { newGame } from "./generate";
import { narrate, narrationContext } from "./narration";
import { MATCH_EVENT_TYPES, PENALTY_EVENT_TYPES, type MatchEvent, type MatchEventType } from "./types";

describe("narração (copa-nacional)", () => {
  test("narração de pênalti", () => {
    const club = newGame(88).leagues[1]!.clubs[0]!;
    const player = club.players[20]!;
    const ctx = narrationContext([club]);
    expect(narrate({ minute: 90, type: "penalty_scored", clubId: club.id, playerId: player.id }, ctx)).toBe(`Pênalti convertido por ${player.name}.`);
    expect(narrate({ minute: 90, type: "penalty_missed", clubId: club.id, playerId: player.id }, ctx)).toBe(`${player.name} perde o pênalti.`);
  });
});

describe("narração com nomes (correcoes-validacao)", () => {
  test("linha de cada tipo de evento", () => {
    // C61 (AC 57, L-005): every type `narrate` handles, each line written out with the names.
    const club = newGame(88).leagues[0]!.clubs[0]!;
    Object.assign(club, { name: "Leões do Norte" });
    const [out, on] = [club.players[3]!, club.players[15]!];
    Object.assign(out, { name: "Tadeu Lima" });
    Object.assign(on, { name: "Rui Faria" });
    const ctx = narrationContext([club]);
    const rows: [MatchEventType, string][] = [
      ["kickoff", "Começa o jogo!"],
      ["shot_saved", "Tadeu Lima (Leões do Norte) finaliza, mas o goleiro defende."],
      ["shot_missed", "Tadeu Lima (Leões do Norte) chuta pra fora."],
      ["goal", "GOL do Leões do Norte! Tadeu Lima marca."],
      ["halftime", "Fim do primeiro tempo."],
      ["fulltime", "Fim de jogo!"],
      ["yellow", "Cartão amarelo para Tadeu Lima (Leões do Norte)."],
      ["red", "Cartão vermelho! Tadeu Lima (Leões do Norte) está expulso."],
      ["injury", "Tadeu Lima (Leões do Norte) se machuca e deixa o campo."],
      ["substitution", "Substituição no Leões do Norte: sai Tadeu Lima, entra Rui Faria."],
      ["penalty_scored", "Pênalti convertido por Tadeu Lima."],
      ["penalty_missed", "Tadeu Lima perde o pênalti."],
    ];
    expect(rows.map(([type]) => type).sort()).toEqual([...MATCH_EVENT_TYPES, ...PENALTY_EVENT_TYPES].sort());
    for (const [type, line] of rows) {
      const event: MatchEvent = { minute: 10, type, clubId: club.id, playerId: out.id, ...(type === "substitution" ? { playerInId: on.id } : {}) };
      const text = narrate(event, ctx);
      expect(text, type).toBe(line);
      expect(text, type).not.toContain(club.id);
      expect(text, type).not.toContain(out.id);
    }
  });
});

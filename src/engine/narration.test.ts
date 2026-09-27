import { newGame } from "./generate";
import { narrate, narrationContext } from "./narration";

describe("narração (copa-nacional)", () => {
  test("narração de pênalti", () => {
    const club = newGame(88).leagues[1]!.clubs[0]!;
    const player = club.players[20]!;
    const ctx = narrationContext([club]);
    expect(narrate({ minute: 90, type: "penalty_scored", clubId: club.id, playerId: player.id }, ctx)).toBe(`Pênalti convertido por ${player.name}.`);
    expect(narrate({ minute: 90, type: "penalty_missed", clubId: club.id, playerId: player.id }, ctx)).toBe(`${player.name} perde o pênalti.`);
  });
});

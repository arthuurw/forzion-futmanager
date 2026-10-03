import { newGame } from "../engine/generate";
import type { NewsDate, NewsItem } from "../engine/types";
import { newsText } from "./newsText";

/** Written out here, not imported (L-004). */
const brl = (n: number) => `R$ ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

describe("texto das notícias (noticias)", () => {
  test("texto das notícias", () => {
    // C13 (AC 12, L-005, L-008): the 14 sentences, exact.
    const game = newGame(3);
    const [x, y, z] = [game.leagues[0]!.clubs[1]!, game.leagues[0]!.clubs[2]!, game.leagues[1]!.clubs[3]!];
    const league: NewsDate = { kind: "league", round: 4 };
    const cupDate: NewsDate = { kind: "cup", cupId: "cup-nat", phase: 2 };
    const at = (date: NewsDate, rest: Record<string, unknown>) => ({ season: 1, date, ...rest }) as NewsItem;
    const rows: [string, NewsItem, string][] = [
      ["lesão plural", at(league, { kind: "injury", playerName: "Fulano", rounds: 3 }), "Fulano se lesionou e fica fora por 3 rodadas."],
      ["lesão singular", at(league, { kind: "injury", playerName: "Fulano", rounds: 1 }), "Fulano se lesionou e fica fora por 1 rodada."],
      ["suspensão liga", at(league, { kind: "suspension", playerName: "Beltrano", rounds: 2 }), "Beltrano está suspenso por 2 rodadas na liga."],
      ["suspensão copa", at(cupDate, { kind: "suspension", playerName: "Beltrano", rounds: 1, cupId: "cup-nat" }), "Beltrano está suspenso por 1 rodada na Copa Nacional."],
      ["força sobe", at(league, { kind: "rating", playerName: "Ciclano", rating: 71, delta: 1 }), "Ciclano subiu para 71."],
      ["força cai", at(league, { kind: "rating", playerName: "Ciclano", rating: 69, delta: -1 }), "Ciclano caiu para 69."],
      ["proposta", at(league, { kind: "offer", playerName: "Fulano", clubId: x.id, amount: 1_250_000 }), `${x.name} oferece ${brl(1_250_000)} por Fulano.`],
      ["diretoria", at(league, { kind: "board", warnings: 2 }), "Aviso da diretoria (2/3): a campanha está abaixo do aceitável."],
      ["emprego um", at(league, { kind: "job", clubIds: [x.id] }), `${x.name} quer contratar você.`],
      ["emprego dois", at(league, { kind: "job", clubIds: [x.id, y.id] }), `${x.name} e ${y.name} querem contratar você.`],
      ["transferência", at(league, { kind: "transfer", playerName: "Beltrano", fromId: z.id, toId: y.id, amount: 800_000 }), `${y.name} contratou Beltrano (${z.name}) por ${brl(800_000)}.`],
      ["copa classificado", at(cupDate, { kind: "cup", cupId: "cup-nat", phase: 2, result: "advanced", opponentId: z.id }), "Copa Nacional: classificado para Quartas."],
      ["copa campeão", at({ kind: "cup", cupId: "cup-nat", phase: 5 }, { kind: "cup", cupId: "cup-nat", phase: 5, result: "champion", opponentId: z.id }), "Copa Nacional: campeão!"],
      ["copa eliminado", at(cupDate, { kind: "cup", cupId: "cup-nat", phase: 2, result: "out", opponentId: z.id }), `Copa Nacional: eliminado por ${z.name}.`],
    ];
    expect(rows).toHaveLength(14);
    for (const [name, item, text] of rows) expect(newsText(item, game), name).toBe(text);
  });
});

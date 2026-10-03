import { BOARD_PATIENCE } from "../engine/career";
import { findAnyClub } from "../engine/season";
import type { GameState, NewsItem } from "../engine/types";
import { formatMoney } from "./money";

const rounds = (n: number) => `${n} ${n === 1 ? "rodada" : "rodadas"}`;

/** Noticias AC 12: the sentence of one news item, written from its data when it is shown (AD-004). */
export function newsText(item: NewsItem, game: Pick<GameState, "leagues" | "cups">): string {
  const club = (id: string) => findAnyClub(game, id).name;
  const cupName = (id: string) => game.cups.find((c) => c.id === id)?.name ?? id;
  switch (item.kind) {
    case "injury":
      return `${item.playerName} se lesionou e fica fora por ${rounds(item.rounds)}.`;
    case "suspension":
      return `${item.playerName} está suspenso por ${rounds(item.rounds)} ${item.cupId ? `na ${cupName(item.cupId)}` : "na liga"}.`;
    case "rating":
      return `${item.playerName} ${item.delta > 0 ? "subiu" : "caiu"} para ${item.rating}.`;
    case "offer":
      return `${club(item.clubId)} oferece ${formatMoney(item.amount)} por ${item.playerName}.`;
    case "board":
      return `Aviso da diretoria (${item.warnings}/${BOARD_PATIENCE - 1}): a campanha está abaixo do aceitável.`;
    case "job": {
      const names = item.clubIds.map(club);
      const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} e ${names.at(-1)!}`;
      return `${list} ${names.length === 1 ? "quer" : "querem"} contratar você.`;
    }
    case "transfer":
      return `${club(item.toId)} contratou ${item.playerName} (${club(item.fromId)}) por ${formatMoney(item.amount)}.`;
    case "cup": {
      const cup = game.cups.find((c) => c.id === item.cupId);
      const name = cup?.name ?? item.cupId;
      if (item.result === "champion") return `${name}: campeão!`;
      if (item.result === "out") return `${name}: eliminado por ${club(item.opponentId)}.`;
      return `${name}: classificado para ${cup?.phases[item.phase + 1]?.name ?? "a próxima fase"}.`;
    }
  }
}

/** Noticias AC 13: «Temporada <n> · Rodada <r>» or «Temporada <n> · <copa> · <fase>». */
export function newsDateLabel(item: NewsItem, game: Pick<GameState, "cups">): string {
  if (item.date.kind === "league") return `Temporada ${item.season} · Rodada ${item.date.round}`;
  const { cupId, phase } = item.date;
  const cup = game.cups.find((c) => c.id === cupId);
  return `Temporada ${item.season} · ${cup?.name ?? cupId} · ${cup?.phases[phase]?.name ?? ""}`;
}

import type { Club, MatchEvent, Player } from "./types";

export interface NarrationContext {
  clubs: Map<string, Club>;
  players: Map<string, Player>;
}

export function narrationContext(clubs: readonly Club[]): NarrationContext {
  const c = new Map<string, Club>();
  const p = new Map<string, Player>();
  for (const club of clubs) {
    c.set(club.id, club);
    for (const player of club.players) p.set(player.id, player);
  }
  return { clubs: c, players: p };
}

/** One PT-BR line per event type (C46 of partida-ao-vivo). */
export function narrate(event: MatchEvent, ctx: NarrationContext): string {
  const club = ctx.clubs.get(event.clubId)?.name ?? event.clubId;
  const nameOf = (id: string | undefined) => (id ? (ctx.players.get(id)?.name ?? id) : "");
  const player = nameOf(event.playerId);
  switch (event.type) {
    case "kickoff":
      return "Começa o jogo!";
    case "halftime":
      return "Fim do primeiro tempo.";
    case "fulltime":
      return "Fim de jogo!";
    case "goal":
      return `GOL do ${club}! ${player} marca.`;
    case "shot_saved":
      return `${player} (${club}) finaliza, mas o goleiro defende.`;
    case "shot_missed":
      return `${player} (${club}) chuta pra fora.`;
    case "yellow":
      return `Cartão amarelo para ${player} (${club}).`;
    case "red":
      return `Cartão vermelho! ${player} (${club}) está expulso.`;
    case "injury":
      return `${player} (${club}) se machuca e deixa o campo.`;
    case "substitution":
      return `Substituição no ${club}: sai ${player || "—"}, entra ${nameOf(event.playerInId)}.`;
    case "penalty_scored":
      return `Pênalti convertido por ${player}.`;
    case "penalty_missed":
      return `${player} perde o pênalti.`;
  }
}

import { newGame } from "./generate";
import { autoLineup } from "./lineup";

/** A document shaped like a v1 save: no condition on players, no posture on lineups. */
export function v1Document(seed = 3): Record<string, unknown> {
  const state = newGame(seed);
  const club = state.leagues[0]!.clubs[0]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, "4-3-3");
  const doc = JSON.parse(JSON.stringify(state));
  doc.schemaVersion = 1;
  for (const c of doc.leagues[0].clubs) {
    for (const p of c.players) {
      for (const k of ["fitness", "morale", "injuryRounds", "suspendedRounds", "yellowCards", "idleRounds"]) delete p[k];
    }
    if (c.lineup) delete c.lineup.posture;
  }
  return doc;
}

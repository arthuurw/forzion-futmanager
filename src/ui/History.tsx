import { useState } from "react";
import { DIVISION_LABEL } from "../engine/board";
import { findAnyClub, topScorers, userLeague } from "../engine/season";
import { CONTINENTAL_CUP_ID } from "../engine/cup";
import type { DivisionRecord, SeasonRecord } from "../engine/types";
import { useGame, userClub } from "../store";
import { ScreenTabs } from "./ScreenTabs";
import { POSITION_LABEL } from "./Squad";

type HistoryTab = "scorers" | "stats" | "champions";

/** Copa-continental AC 21: null for a season closed before the continental cup existed. */
function continentalChampion(r: SeasonRecord): string | null {
  return r.cups.find((c) => c.cupId === CONTINENTAL_CUP_ID)?.championId ?? null;
}

function scorerText(d: DivisionRecord | undefined): string {
  const s = d?.topScorer;
  return s ? `${s.name} (${s.clubName}) · ${s.goals} gols` : "—";
}

/** AC 39, AC 40: the season's scorers, the squad's numbers and the champions of every season. */
export function History() {
  const game = useGame((s) => s.game);
  const goToSquad = useGame((s) => s.goToSquad);
  const [tab, setTab] = useState<HistoryTab>("scorers");
  if (!game) return null;
  const club = userClub(game);
  if (!club) return null;
  const scorers = topScorers(userLeague(game), 10);
  const records = [...game.history].reverse();
  const clubName = (id: string) => findAnyClub(game, id).name;
  const division = (leagueId: string | null) => {
    const i = game.leagues.findIndex((l) => l.id === leagueId);
    return DIVISION_LABEL[i] ?? "";
  };
  // Paises AC 22: the champions of the leagues abroad, by league id (seasons before v7 have none).
  const abroad = game.leagues.filter((l) => l.country !== "BR");
  const championIn = (r: (typeof records)[number], leagueId: string) => {
    const d = r.divisions.find((x) => x.leagueId === leagueId);
    return d ? clubName(d.championId) : "—";
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Histórico</h1>
        <ScreenTabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "scorers", label: "Artilharia" },
            { id: "stats", label: "Estatísticas" },
            { id: "champions", label: "Campeões" },
          ]}
        />
      </div>
      <div className="screen-body">
        {tab === "scorers" && (
          <section aria-label="Artilharia" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="title-bar">Artilharia · {division(userLeague(game).id)}</h2>
            {scorers.length === 0 ? (
              <p className="empty">Nenhum gol ainda</p>
            ) : (
              <div className="fill">
                <table aria-label="Artilharia" className="compact">
                  <thead>
                    <tr>
                      <th className="num">#</th>
                      <th>Nome</th>
                      <th>Clube</th>
                      <th className="num">Gols</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorers.map((s, i) => (
                      <tr key={s.playerId} className={s.clubId === club.id ? "me" : undefined}>
                        <td className="num">{i + 1}</td>
                        <td>{s.name}</td>
                        <td>{s.clubName}</td>
                        <td className="num">{s.goals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        {tab === "stats" && (
          <section aria-label="Estatísticas" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="title-bar">Estatísticas do elenco</h2>
            <div className="fill">
              <table aria-label="Estatísticas" className="compact">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Pos</th>
                    <th className="num">Jogos</th>
                    <th className="num">Gols</th>
                    <th className="num">Jogos na carreira</th>
                    <th className="num">Gols na carreira</th>
                  </tr>
                </thead>
                <tbody>
                  {club.players.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        <span className={`pos pos-${p.position}`}>{POSITION_LABEL[p.position]}</span>
                      </td>
                      <td className="num">{p.seasonGames}</td>
                      <td className="num">{p.seasonGoals}</td>
                      <td className="num">{p.careerGames + p.seasonGames}</td>
                      <td className="num">{p.careerGoals + p.seasonGoals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === "champions" && (
          <section aria-label="Campeões" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="title-bar">Campeões</h2>
            {records.length === 0 ? (
              <p className="empty">Nenhuma temporada encerrada</p>
            ) : (
              <div className="fill">
                <table aria-label="Campeões" className="compact">
                  <thead>
                    <tr>
                      <th className="num" title="Temporada">Temp.</th>
                      <th>Campeão Série A</th>
                      <th>Artilheiro Série A</th>
                      <th>Campeão Série B</th>
                      <th>Artilheiro Série B</th>
                      <th>Copa Nacional</th>
                      <th>Copa Continental</th>
                      <th>Sua posição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.season}>
                        <td className="num">{r.season}</td>
                        <td>{r.divisions[0] ? clubName(r.divisions[0].championId) : "—"}</td>
                        <td>{scorerText(r.divisions[0])}</td>
                        <td>{r.divisions[1] ? clubName(r.divisions[1].championId) : "—"}</td>
                        <td>{scorerText(r.divisions[1])}</td>
                        <td>{r.cups[0] ? clubName(r.cups[0].championId) : "-"}</td>
                        <td>{continentalChampion(r) ? clubName(continentalChampion(r)!) : "-"}</td>
                        <td>{r.userPosition ? `${r.userPosition}º na ${division(r.userLeagueId)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table aria-label="Campeões no exterior" className="compact">
                  <thead>
                    <tr>
                      <th className="num" title="Temporada">Temp.</th>
                      {abroad.map((l) => (
                        <th key={l.id}>Campeão {division(l.id)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.season}>
                        <td className="num">{r.season}</td>
                        {abroad.map((l) => (
                          <td key={l.id}>{championIn(r, l.id)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
      <div className="action-bar">
        <button onClick={goToSquad}>Voltar ao elenco</button>
      </div>
    </div>
  );
}

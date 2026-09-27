import { useState } from "react";
import { divisionOf, goalLabel } from "../engine/board";
import { CONTRACT_RENEWAL, isMarketOpen, releaseCost, renewalSalary } from "../engine/market";
import { formationSlots, isAvailable, validateLineup } from "../engine/lineup";
import { userLeague } from "../engine/season";
import { FORMATION_NAMES, POSITIONS, POSTURES, type FormationName, type Position, type Posture } from "../engine/types";
import { useGame, userClub } from "../store";
import { FitnessBar, MoraleArrow, StatusBadge } from "./Condition";
import { formatMoney } from "./money";
import { Flag } from "./Flag";
import { RatingBar } from "./RatingBar";
import { ScreenTabs } from "./ScreenTabs";
import { DivisionTable } from "./Table";

export const POSITION_LABEL: Record<Position, string> = { GK: "GOL", DF: "ZAG", MF: "MEI", FW: "ATA" };

/** Vertical position of each line on the pitch, attack at the top. */
const LINE_Y: Record<Position, number> = { FW: 17, MF: 44, DF: 70, GK: 89 };

/**
 * Pitch coordinates (percent) for each slot of a formation, spread evenly along its line.
 * `w` is the token width, narrowed on crowded lines so neighbours never overlap.
 */
function slotCoordinates(slots: Position[]): { x: number; y: number; w: number }[] {
  const perLine = new Map<Position, number[]>();
  slots.forEach((pos, i) => perLine.set(pos, [...(perLine.get(pos) ?? []), i]));
  const coords: { x: number; y: number; w: number }[] = [];
  for (const [pos, indexes] of perLine) {
    const n = indexes.length;
    const w = Math.min(26, 100 / (n + 1) - 1.5);
    indexes.forEach((slotIndex, k) => {
      coords[slotIndex] = { x: ((k + 1) / (n + 1)) * 100, y: LINE_Y[pos], w };
    });
  }
  return coords;
}

type SquadTab = "pitch" | "roster" | "table";

const POSTURE_LABEL: Record<Posture, string> = { defensive: "Defensiva", balanced: "Equilibrada", attacking: "Ofensiva" };

export function Squad() {
  const game = useGame((s) => s.game);
  const setFormation = useGame((s) => s.setFormation);
  const setPosture = useGame((s) => s.setPosture);
  const assignStarter = useGame((s) => s.assignStarter);
  const playRound = useGame((s) => s.playRound);
  const toggleForSale = useGame((s) => s.toggleForSale);
  const releasePlayer = useGame((s) => s.releasePlayer);
  const goToMarket = useGame((s) => s.goToMarket);
  const goToFinance = useGame((s) => s.goToFinance);
  const goToHistory = useGame((s) => s.goToHistory);
  const renewContract = useGame((s) => s.renewContract);
  const message = useGame((s) => s.marketMessage);
  const [tab, setTab] = useState<SquadTab>("pitch");
  const [releasing, setReleasing] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<string | null>(null);
  if (!game) return null;
  const club = userClub(game);
  if (!club) return null;
  const league = userLeague(game);
  const lineup = club.lineup;
  const validation = validateLineup(club, lineup);
  const slots = lineup ? formationSlots(lineup.formation) : [];
  const coords = slotCoordinates(slots);
  const starterIds = new Set(lineup?.starters.filter((id): id is string => !!id));
  const marketOpen = isMarketOpen(game);
  const toRelease = club.players.find((p) => p.id === releasing) ?? null;
  const toRenew = club.players.find((p) => p.id === renewing) ?? null;

  // AC 9: by position, then rating descending.
  const roster = [...club.players].sort(
    (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating || a.name.localeCompare(b.name),
  );

  // Narrow screens show one panel (the active tab). Wide screens always show the pitch,
  // plus the squad list or the table in the right column.
  const panelClass = (id: SquadTab) =>
    ["panel", tab === id ? "m-active" : "", id === "roster" && tab === "table" ? "d-hidden" : "", id === "table" && tab !== "table" ? "d-hidden" : ""]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="club-title">
          <Flag clubId={club.id} name={club.name} size={26} />
          {club.name}
        </h1>
        <ScreenTabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "pitch", label: "Campo", mobileOnly: true },
            { id: "roster", label: "Elenco" },
            { id: "table", label: "Classificação" },
          ]}
        />
      </div>

      <div className="screen-body squad-body tabbed">
        <section className={`${panelClass("pitch")} pitch-panel`} style={{ "--i": 0 } as React.CSSProperties}>
          <div className="panel-head">
            <h2 className="title-bar">Escalação</h2>
            <div className="formation-controls">
              <label className="formation-row">
                Formação
                <select aria-label="Formação" value={lineup?.formation ?? ""} onChange={(e) => setFormation(e.target.value as FormationName)}>
                  {FORMATION_NAMES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="formation-row">
                Postura
                <select aria-label="Postura" value={lineup?.posture ?? "balanced"} onChange={(e) => setPosture(e.target.value as Posture)}>
                  {POSTURES.map((p) => (
                    <option key={p} value={p}>
                      {POSTURE_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="pitch-wrap">
            <div className="pitch">
              <div className="line halfway" />
              <div className="line circle" />
              <div className="line box" />
              <div className="line small-box" />
              {slots.map((position, i) => {
                const current = lineup?.starters[i] ?? "";
                const currentPlayer = club.players.find((p) => p.id === current);
                // Same position first, then everyone else available (out of position, AC 23).
                const options = club.players
                  .filter((p) => isAvailable(p) || p.id === current)
                  .sort((a, b) => Number(b.position === position) - Number(a.position === position) || POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating);
                const oop = !!currentPlayer && currentPlayer.position !== position;
                const unavailable = !!currentPlayer && !isAvailable(currentPlayer);
                const at = coords[i] ?? { x: 50, y: 50, w: 26 };
                return (
                  <div
                    key={i}
                    className={`token pos-${position}${current ? "" : " empty"}${oop ? " oop" : ""}${unavailable ? " unavailable" : ""}`}
                    style={{ left: `${at.x}%`, top: `${at.y}%`, width: `${at.w}%` }}
                  >
                    <span className="num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <select aria-label={`Titular ${i + 1} (${POSITION_LABEL[position]})`} value={current} onChange={(e) => assignStarter(i, e.target.value)}>
                      {current === "" && <option value="">—</option>}
                      {options.map((p) => (
                        <option key={p.id} value={p.id} disabled={!isAvailable(p)}>
                          {p.position === position ? "" : `${POSITION_LABEL[p.position]} · `}
                          {p.name} ({p.rating})
                        </option>
                      ))}
                    </select>
                    {oop && <span className="sr-only">fora de posição</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={panelClass("roster")} style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Elenco</h2>
          <div className="fill">
            <table aria-label="Elenco" className="compact">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Pos</th>
                  <th className="num">Idade</th>
                  <th className="num">Força</th>
                  <th className="num">Salário</th>
                  <th className="num">Contr.</th>
                  <th className="num">Cond</th>
                  <th>Moral</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p.id} className={[starterIds.has(p.id) ? "starter" : "", isAvailable(p) ? "" : "out"].filter(Boolean).join(" ") || undefined}>
                    <td>{p.name}</td>
                    <td>
                      <span className={`pos pos-${p.position}`}>{POSITION_LABEL[p.position]}</span>
                    </td>
                    <td className="num">{p.age}</td>
                    <td className="num rating-cell">
                      <RatingBar rating={p.rating} />
                      {p.rating}
                    </td>
                    <td className="num">{formatMoney(p.salary)}</td>
                    <td className="num contract">
                      {p.contractSeasons === 1 ? (
                        // The last year's number is the renewal button (AC 26).
                        <button className="link contract-n last" aria-label={`Renovar ${p.name}`} title="Renovar contrato" onClick={() => setRenewing(p.id)}>
                          {p.contractSeasons}
                        </button>
                      ) : (
                        <span className="contract-n">{p.contractSeasons}</span>
                      )}
                      {p.contractSeasons === 1 && <span className="last-year">Último ano</span>}
                    </td>
                    <td className="num">
                      <FitnessBar value={p.fitness} />
                    </td>
                    <td>
                      <MoraleArrow value={p.morale} />
                    </td>
                    <td className="row-actions">
                      <StatusBadge player={p} />
                      {marketOpen && (
                        <>
                          <label className="for-sale" title="À venda">
                            <input
                              type="checkbox"
                              aria-label={`À venda: ${p.name}`}
                              checked={club.forSale.includes(p.id)}
                              onChange={() => void toggleForSale(p.id)}
                            />
                            <span aria-hidden="true">$</span>
                          </label>
                          <button className="mini" aria-label={`Dispensar ${p.name}`} title="Dispensar" onClick={() => setReleasing(p.id)}>
                            ✕
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={panelClass("table")} style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Classificação</h2>
          <div className="fill">
            <DivisionTable game={game} highlightClubId={club.id} />
          </div>
        </section>
      </div>

      {toRenew && (
        <div role="alertdialog" aria-label="Confirmar renovação" className="panel confirm inline">
          <p>
            Renovar {toRenew.name} por {CONTRACT_RENEWAL} temporadas com salário {formatMoney(renewalSalary(toRenew))} por rodada. Confirmar?
          </p>
          <button
            className="primary"
            onClick={() => {
              setRenewing(null);
              void renewContract(toRenew.id);
            }}
          >
            Confirmar
          </button>
          <button onClick={() => setRenewing(null)}>Cancelar</button>
        </div>
      )}

      {toRelease && (
        <div role="alertdialog" aria-label="Confirmar dispensa" className="panel confirm inline">
          <p>
            Dispensar {toRelease.name} custa {formatMoney(releaseCost(toRelease))}. Confirmar?
          </p>
          <button
            className="primary"
            onClick={() => {
              setReleasing(null);
              void releasePlayer(toRelease.id);
            }}
          >
            Confirmar
          </button>
          <button onClick={() => setReleasing(null)}>Cancelar</button>
        </div>
      )}

      <div className="action-bar">
        <span className="matchday">
          Rodada {league.currentRound + 1} de {league.rounds.length}
        </span>
        <span className="goal">Meta: {goalLabel(divisionOf(game, club.id), game.boardGoal)}</span>
        <span className="cash">{formatMoney(club.finance.cash)}</span>
        <button onClick={goToMarket}>Mercado</button>
        <button onClick={goToFinance}>Finanças</button>
        <button onClick={goToHistory}>Histórico</button>
        {message && (
          <p role="status" className="missing">
            {message}
          </p>
        )}
        {!validation.ok && (
          <p role="status" className="missing">
            Faltam {validation.missing} titulares
          </p>
        )}
        <button className="primary" disabled={!validation.ok} onClick={() => void playRound()}>
          Jogar rodada
        </button>
      </div>
    </div>
  );
}

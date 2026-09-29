import { useState } from "react";
import { isMarketOpen, marketValue, nextRoundNumber, nextWindowStart, signingFee } from "../engine/market";
import { allClubs, findAnyClub } from "../engine/season";
import { COUNTRIES, POSITIONS, type Country, type GameState, type Player, type Position } from "../engine/types";
import { useGame, userClub } from "../store";
import { formatMoney } from "./money";
import { ScreenTabs, tabPanel } from "./ScreenTabs";
import { POSITION_LABEL } from "./Squad";

type MarketTab = "buy" | "offers" | "youth" | "transfers";

interface Listing {
  player: Player;
  /** null for a free agent. */
  clubId: string | null;
  clubName: string;
}

/**
 * Gastos-da-ia AC 19-21: this season's AI moves, the most recent first, scrolling inside the panel.
 * A null club is a free agent: «Livre».
 */
function Transfers({ game }: { game: GameState }) {
  const names = new Map(allClubs(game).map((c) => [c.id, c.name]));
  const clubName = (id: string | null) => (id === null ? "Livre" : (names.get(id) ?? id));
  const lines = [...game.market.transfers].reverse();
  return (
    <section aria-label="Transferências" className="panel" style={{ "--i": 1 } as React.CSSProperties}>
      <h2 className="title-bar">Transferências</h2>
      {lines.length === 0 ? (
        <p className="empty">Nenhuma transferência nesta temporada</p>
      ) : (
        <div className="fill">
          <table aria-label="Transferências" className="compact">
            <thead>
              <tr>
                <th className="num">Rodada</th>
                <th>Jogador</th>
                <th>De</th>
                <th>Para</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((t, i) => (
                <tr key={`${lines.length - i}-${t.playerId}`}>
                  <td className="num">{t.round}</td>
                  <td>{t.playerName}</td>
                  <td>{clubName(t.fromId)}</td>
                  <td>{clubName(t.toId)}</td>
                  <td className="num">{formatMoney(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** AC 16-40: buy from other clubs, answer offers, sign free agents, promote juniors. */
export function Market() {
  const game = useGame((s) => s.game);
  const message = useGame((s) => s.marketMessage);
  const buyPlayer = useGame((s) => s.buyPlayer);
  const signFreeAgent = useGame((s) => s.signFreeAgent);
  const acceptOffer = useGame((s) => s.acceptOffer);
  const rejectOffer = useGame((s) => s.rejectOffer);
  const promoteJunior = useGame((s) => s.promoteJunior);
  const goToSquad = useGame((s) => s.goToSquad);
  const [tab, setTab] = useState<MarketTab>("buy");
  const [position, setPosition] = useState<Position | "all">("all");
  const [country, setCountry] = useState<Country | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Correcoes-validacao AC 45: kept as typed, so an empty field stays empty and is not a zero offer.
  const [offer, setOffer] = useState("");
  const offerAmount = Number(offer);
  const validOffer = offer.trim() !== "" && Number.isInteger(offerAmount) && offerAmount > 0;
  const [confirmingOffer, setConfirmingOffer] = useState<string | null>(null);
  if (!game) return null;
  const club = userClub(game);
  if (!club) return null;
  const next = nextRoundNumber(game);

  const head = (
    <div className="screen-head">
      <h1 className="title-bar">Mercado</h1>
      <span className="cash">Caixa {formatMoney(club.finance.cash)}</span>
    </div>
  );
  const back = (
    <div className="action-bar">
      {message && (
        <p role="status" className="missing">
          {message}
        </p>
      )}
      <button onClick={goToSquad}>Voltar ao elenco</button>
    </div>
  );

  if (!isMarketOpen(game)) {
    const reopens = nextWindowStart(next);
    return (
      <div className="screen">
        {head}
        <div className="screen-body closed-body">
          <section className="panel closed-market">
            <p className="empty">
              {reopens === null ? "Mercado fechado - reabre na próxima temporada" : `Mercado fechado - reabre antes da rodada ${reopens}`}
            </p>
          </section>
          <Transfers game={game} />
        </div>
        {back}
      </div>
    );
  }

  // Paises AC 18: one country at a time, the user's own first; the free agents with the user's country.
  const home = game.leagues.find((l) => l.clubs.some((c) => c.id === club.id))?.country ?? "BR";
  const shownCountry = country ?? home;
  // AC 18: every other club's players and the free agents, strongest first.
  const listings: Listing[] = [
    ...game.leagues
      .filter((l) => l.country === shownCountry)
      .flatMap((l) => l.clubs)
      .filter((c) => c.id !== club.id)
      .flatMap((c) => c.players.map((player) => ({ player, clubId: c.id, clubName: c.name }))),
    ...(shownCountry === home ? game.market.freeAgents.map((player) => ({ player, clubId: null, clubName: "Livre" })) : []),
  ]
    .filter((l) => position === "all" || l.player.position === position)
    .sort((a, b) => b.player.rating - a.player.rating || a.player.name.localeCompare(b.player.name));
  const selected = listings.find((l) => l.player.id === selectedId) ?? null;

  const select = (l: Listing) => {
    setSelectedId(l.player.id);
    setOffer(String(marketValue(l.player)));
  };

  return (
    <div className="screen">
      {head}
      <ScreenTabs
        idBase="market"
        shared
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "buy", label: "Comprar" },
          { id: "offers", label: `Propostas (${game.market.offers.length})` },
          { id: "youth", label: "Base" },
          { id: "transfers", label: "Transferências" },
        ]}
      />

      {tab === "buy" && (
        <div className="screen-body market-body" {...tabPanel("market", tab, { shared: true })}>
          <section className="panel" style={{ "--i": 0 } as React.CSSProperties}>
            <div className="panel-head">
              <h2 className="title-bar">Jogadores</h2>
              <label className="formation-row">
                País
                <select aria-label="País" value={shownCountry} onChange={(e) => setCountry(e.target.value as Country)}>
                  {(Object.keys(COUNTRIES) as Country[]).map((c) => (
                    <option key={c} value={c}>
                      {COUNTRIES[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="formation-row">
                Posição
                <select aria-label="Posição" value={position} onChange={(e) => setPosition(e.target.value as Position | "all")}>
                  <option value="all">Todas</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {POSITION_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="fill">
              {listings.length === 0 ? (
                <p className="empty">Nenhum jogador</p>
              ) : (
                <table aria-label="Mercado" className="compact">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Pos</th>
                      <th className="num">Idade</th>
                      <th className="num">Força</th>
                      <th>Clube</th>
                      <th className="num">Valor</th>
                      <th className="num">Salário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.player.id} className={l.player.id === selectedId ? "selected" : undefined}>
                        <td>
                          <button className="link" onClick={() => select(l)}>
                            {l.player.name}
                          </button>
                        </td>
                        <td>
                          <span className={`pos pos-${l.player.position}`}>{POSITION_LABEL[l.player.position]}</span>
                        </td>
                        <td className="num">{l.player.age}</td>
                        <td className="num">{l.player.rating}</td>
                        <td>{l.clubName}</td>
                        <td className="num">{formatMoney(marketValue(l.player))}</td>
                        <td className="num">{formatMoney(l.player.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section aria-label="Negociação" className={`panel deal${selected ? "" : " idle"}`} style={{ "--i": 1 } as React.CSSProperties}>
            <h2 className="title-bar">Negociação</h2>
            {!selected ? (
              <p className="empty">Escolha um jogador na lista</p>
            ) : (
              <>
                <p className="deal-name">
                  {selected.player.name} · {POSITION_LABEL[selected.player.position]} · {selected.player.rating}
                </p>
                <p>
                  {selected.clubName} · valor {formatMoney(marketValue(selected.player))} · salário {formatMoney(selected.player.salary)}
                </p>
                {selected.clubId === null ? (
                  <button
                    className="primary"
                    onClick={() => void signFreeAgent(selected.player.id).then((ok) => ok && setSelectedId(null))}
                  >
                    Contratar (luvas {formatMoney(signingFee(selected.player))})
                  </button>
                ) : (
                  <div className="loan-row">
                    <label className="formation-row">
                      Oferta (R$)
                      <input
                        aria-label="Oferta"
                        type="number"
                        min={0}
                        step={10000}
                        value={offer}
                        onChange={(e) => setOffer(e.target.value)}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={!validOffer}
                      onClick={() => void buyPlayer(selected.player.id, offerAmount).then((ok) => ok && setSelectedId(null))}
                    >
                      Fazer proposta
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {tab === "offers" && (
        <div className="screen-body" {...tabPanel("market", tab, { shared: true })}>
          <section aria-label="Propostas" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="title-bar">Propostas</h2>
            {game.market.offers.length === 0 ? (
              <p className="empty">Nenhuma proposta</p>
            ) : (
              <ul className="offers fill">
                {game.market.offers.map((o) => {
                  const player = club.players.find((p) => p.id === o.playerId);
                  const buyer = findAnyClub(game, o.buyerId);
                  if (!player) return null;
                  return (
                    <li key={o.id}>
                      <span>
                        {buyer.name} · {player.name} · {formatMoney(o.amount)}
                      </span>
                      {confirmingOffer === o.id ? (
                        <span role="alertdialog" aria-label="Confirmar venda" className="confirm inline">
                          <span>
                            Vender {player.name} por {formatMoney(o.amount)}?
                          </span>
                          <button
                            className="primary"
                            onClick={() => {
                              setConfirmingOffer(null);
                              void acceptOffer(o.id);
                            }}
                          >
                            Confirmar
                          </button>
                          <button onClick={() => setConfirmingOffer(null)}>Cancelar</button>
                        </span>
                      ) : (
                        <span>
                          <button className="primary" onClick={() => setConfirmingOffer(o.id)}>
                            Aceitar
                          </button>
                          <button onClick={() => void rejectOffer(o.id)}>Recusar</button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "youth" && (
        <div className="screen-body" {...tabPanel("market", tab, { shared: true })}>
          <section aria-label="Base" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="title-bar">Base</h2>
            {game.market.juniors.length === 0 ? (
              <p className="empty">Nenhum júnior na base</p>
            ) : (
              <ul className="offers fill">
                {game.market.juniors.map((j) => (
                  <li key={j.id}>
                    <span>
                      {j.name} · {POSITION_LABEL[j.position]} · {j.age} anos · força {j.rating} · salário {formatMoney(j.salary)}
                    </span>
                    <button className="primary" onClick={() => void promoteJunior(j.id)}>
                      Promover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "transfers" && (
        <div className="screen-body" {...tabPanel("market", tab, { shared: true })}>
          <Transfers game={game} />
        </div>
      )}

      {back}
    </div>
  );
}

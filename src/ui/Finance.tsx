import { useState } from "react";
import {
  EXPANSION_COST,
  LOAN_STEP,
  TICKET_PRICE_MAX,
  TICKET_PRICE_MIN,
  TICKET_PRICE_STEP,
  attendanceFor,
  formFactor,
  ledgerBalance,
  payroll,
  positionsBeforeRound,
  sponsorshipPaid,
} from "../engine/finance";
import { divisionOf } from "../engine/board";
import { userLeague } from "../engine/season";
import { useGame, userClub } from "../store";
import { formatMoney, formatNumber } from "./money";
import { ScreenTabs } from "./ScreenTabs";

type FinanceTab = "summary" | "round" | "loan";

const TICKET_PRICES = Array.from(
  { length: (TICKET_PRICE_MAX - TICKET_PRICE_MIN) / TICKET_PRICE_STEP + 1 },
  (_, i) => TICKET_PRICE_MIN + i * TICKET_PRICE_STEP,
);

/** Multiples of R$ 500.000 from one step up to `max`. */
function steps(max: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(max / LOAN_STEP)) }, (_, i) => (i + 1) * LOAN_STEP);
}

/** AC 8-10, 41-49: the club's money, the last round, the stadium and the bank. */
export function Finance() {
  const game = useGame((s) => s.game);
  const message = useGame((s) => s.marketMessage);
  const setTicketPrice = useGame((s) => s.setTicketPrice);
  const expandStadium = useGame((s) => s.expandStadium);
  const takeLoan = useGame((s) => s.takeLoan);
  const repayLoan = useGame((s) => s.repayLoan);
  const goToSquad = useGame((s) => s.goToSquad);
  const [tab, setTab] = useState<FinanceTab>("summary");
  const [confirming, setConfirming] = useState(false);
  const [borrow, setBorrow] = useState(LOAN_STEP);
  const [repay, setRepay] = useState(0);
  if (!game) return null;
  const club = userClub(game);
  if (!club) return null;
  const league = userLeague(game);
  const f = club.finance;
  const form = formFactor(positionsBeforeRound(league).get(club.id) ?? null, league.clubs.length);
  const estimate = attendanceFor(f, f.ticketPrice, form);
  const last = f.lastRound;
  const canBorrow = steps(f.loanLimit - f.loan);
  const repayOptions = [...steps(f.loan), ...(f.loan % LOAN_STEP ? [f.loan] : [])];
  const repayValue = repayOptions.includes(repay) ? repay : (repayOptions[0] ?? 0);
  const borrowValue = canBorrow.includes(borrow) ? borrow : (canBorrow[0] ?? 0);
  const panelClass = (id: FinanceTab) => `panel${tab === id ? " m-active" : ""}`;

  const lines: [string, string][] = last
    ? [
        ["Público", formatNumber(last.attendance)],
        ["Bilheteria", formatMoney(last.tickets)],
        ["Patrocínio", formatMoney(last.sponsorship)],
        ["Salários", formatMoney(-last.salaries)],
        ["Juros", formatMoney(-last.interest)],
        ["Compras", formatMoney(-last.transfersOut)],
        ["Vendas", formatMoney(last.transfersIn)],
        ...(last.prize !== undefined ? ([["Prêmio", formatMoney(last.prize)]] as [string, string][]) : []),
        ...((last.cupPrize ?? 0) > 0 ? ([["Prêmio da copa", formatMoney(last.cupPrize!)]] as [string, string][]) : []),
        ["Saldo", formatMoney(ledgerBalance(last))],
      ]
    : [];

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Finanças</h1>
        <ScreenTabs
          hideOnDesktop
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "summary", label: "Clube" },
            { id: "round", label: "Rodada" },
            { id: "loan", label: "Banco" },
          ]}
        />
      </div>

      <div className="screen-body finance-body tabbed">
        <section aria-label="Clube" className={panelClass("summary")} style={{ "--i": 0 } as React.CSSProperties}>
          <h2 className="title-bar">Clube</h2>
          <dl className="money-list fill">
            <dt>Caixa</dt>
            <dd className={f.cash < 0 ? "neg" : undefined}>{formatMoney(f.cash)}</dd>
            <dt>Folha por rodada</dt>
            <dd>{formatMoney(payroll(club.players))}</dd>
            <dt>Patrocínio por rodada</dt>
            <dd>{formatMoney(sponsorshipPaid(f, game.leagues[divisionOf(game, club.id)]?.tier ?? 0))}</dd>
            <dt>Torcida</dt>
            <dd>{formatNumber(f.fans)}</dd>
            <dt>Capacidade</dt>
            <dd>{formatNumber(f.capacity)}</dd>
            <dt>
              <label htmlFor="ticket-price">Preço do ingresso</label>
            </dt>
            <dd>
              <select id="ticket-price" value={f.ticketPrice} onChange={(e) => void setTicketPrice(Number(e.target.value))}>
                {TICKET_PRICES.map((p) => (
                  <option key={p} value={p}>
                    {formatMoney(p)}
                  </option>
                ))}
              </select>
            </dd>
            <dt>Público estimado</dt>
            <dd>{formatNumber(estimate)}</dd>
            {f.expansionRoundsLeft > 0 && (
              <>
                <dt>Estádio</dt>
                <dd>Obras: {f.expansionRoundsLeft} rodadas</dd>
              </>
            )}
          </dl>
          {confirming ? (
            <div role="alertdialog" aria-label="Confirmar ampliação" className="confirm inline">
              <p>Ampliar custa {formatMoney(EXPANSION_COST)}. Confirmar?</p>
              <button
                className="primary"
                onClick={() => {
                  setConfirming(false);
                  void expandStadium();
                }}
              >
                Confirmar
              </button>
              <button onClick={() => setConfirming(false)}>Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)}>Ampliar estádio</button>
          )}
        </section>

        <section aria-label="Última rodada" className={panelClass("round")} style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Última rodada</h2>
          {last ? (
            <table aria-label="Registro da rodada" className="compact money-table">
              <tbody>
                {lines.map(([label, value]) => (
                  <tr key={label} className={label === "Saldo" ? "total" : undefined}>
                    <th scope="row">{label}</th>
                    <td className="num">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">Nenhuma rodada jogada</p>
          )}
        </section>

        <section aria-label="Empréstimo" className={panelClass("loan")} style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="title-bar">Empréstimo</h2>
          <dl className="money-list">
            <dt>Saldo devedor</dt>
            <dd>{formatMoney(f.loan)}</dd>
            <dt>Limite</dt>
            <dd>{formatMoney(f.loanLimit)}</dd>
            <dt>Juros</dt>
            <dd>1,5% por rodada</dd>
          </dl>
          <div className="loan-row">
            <select aria-label="Valor do empréstimo" value={borrowValue} disabled={!canBorrow.length} onChange={(e) => setBorrow(Number(e.target.value))}>
              {canBorrow.map((v) => (
                <option key={v} value={v}>
                  {formatMoney(v)}
                </option>
              ))}
            </select>
            <button disabled={!canBorrow.length} onClick={() => void takeLoan(borrowValue)}>
              Pegar empréstimo
            </button>
          </div>
          {repayOptions.length === 0 ? (
            <p className="empty">Sem dívida</p>
          ) : (
            <div className="loan-row">
              <select aria-label="Valor do pagamento" value={repayValue} onChange={(e) => setRepay(Number(e.target.value))}>
                {repayOptions.map((v) => (
                  <option key={v} value={v}>
                    {v === f.loan ? `Tudo (${formatMoney(v)})` : formatMoney(v)}
                  </option>
                ))}
              </select>
              <button onClick={() => void repayLoan(repayValue)}>Pagar</button>
            </div>
          )}
        </section>
      </div>

      <div className="action-bar">
        {message && (
          <p role="status" className="missing">
            {message}
          </p>
        )}
        <button onClick={goToSquad}>Voltar ao elenco</button>
      </div>
    </div>
  );
}

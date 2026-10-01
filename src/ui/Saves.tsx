import { useState } from "react";
import { useGame, type SlotView } from "../store";

const two = (n: number) => String(n).padStart(2, "0");

/** Varios-saves AC 10: «Salvo em dd/mm/aaaa às hh:mm», in local time. */
export function savedAtText(savedAt: number): string {
  const d = new Date(savedAt);
  return `Salvo em ${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} às ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** «Jogos salvos»: the 3 slots, opened or deleted one at a time (varios-saves AC 9-17). */
export function Saves() {
  const slots = useGame((s) => s.slots);
  const notice = useGame((s) => s.savesNotice);
  const openSlot = useGame((s) => s.openSlot);
  const deleteSlot = useGame((s) => s.deleteSlot);
  const goHome = useGame((s) => s.goHome);
  const [confirming, setConfirming] = useState<number | null>(null);

  const body = (s: SlotView) => {
    if (s.kind === "empty") return <span className="save-line">Vazio</span>;
    if (s.kind === "incompatible") return <span className="save-line notice">Jogo salvo incompatível (versão {String(s.version)})</span>;
    return (
      <>
        <span className="save-line">
          {s.club} · {s.league} · Temporada {s.season}
        </span>
        {s.savedAt > 0 && <span className="save-date">{savedAtText(s.savedAt)}</span>}
      </>
    );
  };

  return (
    <div className="saves-screen">
      <div className="panel saves">
        <h2>Jogos salvos</h2>
        {notice !== null && (
          <p className="notice" role="alert">
            {notice}
          </p>
        )}
        <ul aria-label="Espaços">
          {slots.map((s) => (
            <li key={s.slot} aria-label={`Jogo ${s.slot}`} className={`save-slot ${s.kind}`}>
              <strong>Jogo {s.slot}</strong>
              {body(s)}
              {confirming === s.slot ? (
                <div role="alertdialog" aria-label="Confirmar apagar" className="confirm inline">
                  <p>Apagar o Jogo {s.slot}? Isso não pode ser desfeito.</p>
                  {/* Correcoes-validacao AC 50: the focus goes to the confirmation's main button. */}
                  <button
                    className="primary"
                    autoFocus
                    onClick={() => {
                      setConfirming(null);
                      void deleteSlot(s.slot);
                    }}
                  >
                    Sim, apagar
                  </button>
                  <button onClick={() => setConfirming(null)}>Cancelar</button>
                </div>
              ) : (
                s.kind !== "empty" && (
                  <div className="save-actions">
                    {s.kind === "ok" && (
                      <button className="primary" onClick={() => void openSlot(s.slot)}>
                        Abrir
                      </button>
                    )}
                    <button onClick={() => setConfirming(s.slot)}>Apagar</button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
        <button onClick={goHome}>Voltar</button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { audio, type Crowd } from "../audio";
import { MATCH_MINUTES, MAX_SUBS, forcedVacancy, userMatch, type LiveMatch, type LiveRound, type LiveSide } from "../engine/live";
import { gameNarrationContext, narrate } from "../engine/narration";
import { findAnyClub } from "../engine/season";
import { FORMATION_NAMES, POSTURES, type FormationName, type MatchEvent, type Posture } from "../engine/types";
import { BASE_TICK_MS, useGame, type GameStore, type Speed } from "../store";
import { FitnessBar, MoraleArrow } from "./Condition";
import { cupPhaseTitle, scoreText } from "./Cup";
import { Flag } from "./Flag";
import { ScreenTabs, tabPanel } from "./ScreenTabs";
import { POSITION_LABEL } from "./Squad";

type LiveTab = "match" | "games" | "team";
const SPEEDS: Speed[] = [1, 2, 4];
export const FLASH_MS = 2000;
export const POSTURE_LABEL: Record<Posture, string> = { defensive: "Defensiva", balanced: "Equilibrada", attacking: "Ofensiva" };

/** Parada-obrigatoria C8: one line per injury or red card that stopped the clock. */
function stopLine(e: MatchEvent, live: LiveRound, side: LiveSide, forced: ReturnType<typeof forcedVacancy>): string {
  const name = live.players[e.playerId!]!.name;
  if (e.type === "injury") {
    const open = Object.values(side.vacancy).some((v) => v.why === "injury" && v.playerId === e.playerId);
    return open && forced?.why === "injury" ? `Lesão: ${name} saiu. Faça a substituição.` : `Lesão: ${name} saiu.`;
  }
  if (live.players[e.playerId!]!.position === "GK") {
    return forced?.why === "red" ? `Goleiro expulso: ${name}. Coloque o goleiro reserva.` : `Goleiro expulso: ${name}.`;
  }
  return `${name} expulso.`;
}

function mySide(m: LiveMatch, clubId: string): LiveSide {
  return m.home.clubId === clubId ? m.home : m.away;
}

/** S1 + S2 of partida-ao-vivo: the round as it happens, and the decisions while it is stopped. */
export function Live() {
  const game = useGame((s) => s.game);
  const live = useGame((s) => s.live);
  const clock = useGame((s) => s.clock);
  const speed = useGame((s) => s.speed);
  const message = useGame((s) => s.liveMessage);
  const liveStop = useGame((s) => s.liveStop);
  const finishing = useGame((s) => s.finishing);
  const { tick, pause, resume, setSpeed, skipToEnd, substitute, changeLiveFormation, changeLivePosture } = useGame.getState();
  const [tab, setTab] = useState<LiveTab>("match");
  const [outSlot, setOutSlot] = useState(0);
  const [inId, setInId] = useState("");
  // Posicao-na-substituicao: where the player coming on plays; null = the slot of who leaves.
  const [target, setTarget] = useState<number | null>(null);
  const [flash, setFlash] = useState<Record<string, true>>({});
  const scores = useRef<Record<string, string>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastLine = useRef<HTMLLIElement>(null);

  // The clock (AC 2, AC 7).
  useEffect(() => {
    if (clock !== "running" || finishing) return;
    // Correcoes-validacao AC 47: an error in the clock shows the error screen instead of freezing it.
    const id = setInterval(() => {
      try {
        tick();
      } catch (e) {
        useGame.getState().crash(e);
      }
    }, BASE_TICK_MS / speed);
    return () => clearInterval(id);
  }, [clock, speed, finishing, tick]);

  // Audio AC 7-9, 12: the user's match as it is played, and the crowd following the clock.
  useEffect(() => {
    const sound = audio();
    const crowdOf = (s: GameStore): Crowd | null => (!s.live ? null : s.finishing || s.live.minute >= MATCH_MINUTES ? "over" : s.clock);
    const start = useGame.getState();
    let heard = start.live ? (userMatch(start.live)?.events.length ?? 0) : 0;
    let crowd = crowdOf(start);
    if (crowd) sound.crowd(crowd);
    const unsubscribe = useGame.subscribe((s, prev) => {
      if (s.live && prev.live && s.live !== prev.live && s.live.userClubId) {
        // Only the user's match sounds (AC 8).
        const events = userMatch(s.live)?.events ?? [];
        const fresh = events.slice(heard);
        heard = events.length;
        // «Pular para o fim» plays every minute left at once: only the final whistle sounds (AC 12),
        // at any minute, even the 89th (ajustes-audio AC 5).
        sound.matchEvents(s.skipped ? fresh.filter((e) => e.type === "fulltime") : fresh, s.live.userClubId);
      }
      const next = crowdOf(s);
      if (next && next !== crowd) sound.crowd(next);
      crowd = next ?? crowd;
    });
    // Correcoes-validacao AC 53: the screen going away (an error screen, a reload of the state)
    // stops the crowd; «over» is a no-op when the match already ended.
    return () => {
      unsubscribe();
      sound.crowd("over");
    };
  }, []);

  // Parada-obrigatoria C9, C11: a stop opens «Seu time» with the empty slot or the bench keeper chosen.
  useEffect(() => {
    const s = useGame.getState();
    if (!liveStop || !s.live) return;
    setTab("team");
    const forced = forcedVacancy(s.live);
    const m = userMatch(s.live);
    if (!forced || !m || !s.live.userClubId) return;
    if (forced.why === "injury") setOutSlot(forced.slot);
    else setInId(mySide(m, s.live.userClubId).bench.find((id) => s.live!.players[id]?.position === "GK") ?? "");
  }, [liveStop]);

  // A score that changed flashes for 2 s (AC 4).
  const minute = live?.minute ?? 0;
  useEffect(() => {
    if (!live) return;
    const changed: string[] = [];
    // Match ids repeat across divisions; only the user's division is on screen (AC 4).
    const leagueId = userMatch(live)?.leagueId;
    for (const m of live.matches.filter((x) => x.leagueId === leagueId)) {
      const now = `${m.homeGoals}-${m.awayGoals}`;
      const before = scores.current[m.matchId];
      if (before !== undefined && before !== now) changed.push(m.matchId);
      scores.current[m.matchId] = now;
    }
    if (!changed.length) return;
    setFlash((f) => ({ ...f, ...Object.fromEntries(changed.map((id) => [id, true as const])) }));
    // Not cleared on the next minute: at 300 ms a minute, that would cancel every un-flash.
    for (const id of changed) {
      clearTimeout(flashTimers.current[id]);
      flashTimers.current[id] = setTimeout(() => {
        delete flashTimers.current[id];
        setFlash((f) => {
          const next = { ...f };
          delete next[id];
          return next;
        });
      }, FLASH_MS);
    }
    // Only a new minute can change a score, so the minute is the only dependency.
  }, [minute]);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  // Newest narration line in view (AC 3).
  const mine = live ? userMatch(live) : null;
  const eventCount = mine?.events.length ?? 0;
  useEffect(() => {
    lastLine.current?.scrollIntoView?.({ block: "nearest" });
  }, [eventCount]);

  if (!game || !live || !game.userClubId || !mine) return null;
  // A cup date mixes both divisions (copa-nacional AC 45); a player may have left his club (correcoes-validacao AC 46).
  const ctx = gameNarrationContext(game);
  const name = (id: string) => findAnyClub(game, id).name;
  const cup = live.cup ? game.cups[live.cup.cupIndex] : undefined;
  const side = mySide(mine, game.userClubId);
  const stopped = clock !== "running" && !finishing;
  const panelClass = (id: LiveTab) => `panel${tab === id ? " m-active" : ""}`;
  const status = finishing ? "Fim de jogo" : clock === "halftime" ? "Intervalo" : clock === "paused" ? "Pausado" : minute <= 45 ? "1º tempo" : "2º tempo";
  const player = (id: string) => live.players[id]!;
  const benchOptions = side.bench.map((id) => player(id));
  const chosenIn = side.bench.includes(inId) ? inId : (side.bench[0] ?? "");
  // Posicao-na-substituicao C5, C6: the empty slots of players sent off, and who is in a slot.
  const redSlots = side.slots.flatMap((id, slot) => (!id && side.vacancy[slot]?.why === "red" ? [slot] : []));
  // C9: only someone leaving the pitch opens a red card's slot. C10: a keeper coming on for an
  // outfield player goes in goal when the keeper was sent off, so that is the default shown.
  const targets = side.slots[outSlot] ? redSlots.filter((slot) => slot !== outSlot) : [];
  const goal = targets.find((slot) => side.slotPos[slot] === "GK");
  const keeperIn = !!chosenIn && player(chosenIn).position === "GK" && side.slotPos[outSlot] !== "GK";
  const defaultTarget = keeperIn && goal !== undefined ? goal : outSlot;
  const chosenTarget = target !== null && targets.includes(target) ? target : defaultTarget;
  const slotName = (slot: number) => {
    const id = side.slots[slot] ?? side.vacancy[slot]?.playerId;
    return id ? player(id).name : "Vaga";
  };
  const forced = forcedVacancy(live);
  // Parada-obrigatoria C10: after a red card nothing forces, and going on is a decision too.
  const goOn = liveStop?.some((e) => e.type === "red") && !forced ? `Seguir com ${side.slots.filter(Boolean).length}` : "Continuar";

  return (
    <div className="screen live-screen">
      <div className="screen-head">
        <h1 className="title-bar">Ao vivo · {cup && live.cup ? cupPhaseTitle(cup, live.cup.phase) : `Rodada ${live.roundNumber}`}</h1>
        <ScreenTabs
          idBase="live"
          hideOnDesktop
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "match", label: "Partida" },
            { id: "games", label: "Jogos" },
            { id: "team", label: "Seu time" },
          ]}
        />
      </div>

      <div className="screen-body round-body tabbed">
        <section aria-label="Partida ao vivo" {...tabPanel("live", "match", { named: true })} className={panelClass("match")} style={{ "--i": 0 } as React.CSSProperties}>
          <h2 className="scorebug">
            <Flag clubId={mine.home.clubId} name={name(mine.home.clubId)} size={20} />
            <span className="team home">{name(mine.home.clubId)}</span>{" "}
            <span className={`score${flash[mine.matchId] ? " flash" : ""}`}>{mine.homeGoals}</span>
            <span className="vs"> x </span>
            <span className={`score${flash[mine.matchId] ? " flash" : ""}`}>{mine.awayGoals}</span>
            {mine.penalties && <span className="pens"> (pên. {mine.penalties.home} x {mine.penalties.away})</span>}{" "}
            <span className="team">{name(mine.away.clubId)}</span>
            <Flag clubId={mine.away.clubId} name={name(mine.away.clubId)} size={20} />
          </h2>
          <div className={`clock${clock === "running" && !finishing ? " running" : ""}`}>
            <span role="timer" aria-label="Relógio">
              {minute}&apos;
            </span>
            <span>{status}</span>
          </div>
          <ul className="ticker fill" aria-label="Narração">
            {mine.events.map((e, i) => (
              <li key={i} className={e.type} ref={i === mine.events.length - 1 ? lastLine : undefined}>
                <span className="min">{e.minute}&apos;</span> <span>{narrate(e, ctx)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Jogos da rodada" {...tabPanel("live", "games", { named: true })} className={panelClass("games")} style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Jogos da rodada</h2>
          <ul className="results live-results fill">
            {live.matches.filter((m) => m.leagueId === mine.leagueId).map((m) => (
              <li key={m.matchId} data-match={m.matchId} className={[m === mine ? "mine" : "", flash[m.matchId] ? "flash" : ""].filter(Boolean).join(" ") || undefined}>
                <Flag clubId={m.home.clubId} name={name(m.home.clubId)} size={13} />
                <span className="h">{name(m.home.clubId)}</span>{" "}
                <b>{scoreText(m, m.penalties)}</b>{" "}
                <span className="a">{name(m.away.clubId)}</span>
                <Flag clubId={m.away.clubId} name={name(m.away.clubId)} size={13} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Seu time" {...tabPanel("live", "team", { named: true })} className={`${panelClass("team")} team-panel`} style={{ "--i": 2 } as React.CSSProperties}>
          <div className="panel-head">
            <h2 className="title-bar">Seu time</h2>
            <span className="subs-count">
              Substituições: {side.subsUsed}/{MAX_SUBS}
            </span>
          </div>
          <div className="fill">
            <table className="compact" aria-label="Em campo">
              <tbody>
                {side.slots.map((id, slot) => {
                  const pos = side.slotPos[slot]!;
                  if (!id) {
                    const v = side.vacancy[slot];
                    return (
                      <tr key={slot} className="vacant">
                        <td>
                          <span className={`pos pos-${pos}`}>{POSITION_LABEL[pos]}</span>
                        </td>
                        <td colSpan={3}>
                          {v ? `${player(v.playerId).name} (${v.why === "red" ? "expulso" : "lesionado"})` : "Vaga"}
                        </td>
                      </tr>
                    );
                  }
                  const p = player(id);
                  const oop = p.position !== pos;
                  const yellow = (side.yellows[id] ?? 0) > 0;
                  return (
                    <tr key={slot} className={oop ? "oop" : undefined}>
                      <td>
                        <span className={`pos pos-${pos}`}>{POSITION_LABEL[pos]}</span>
                      </td>
                      <td>
                        {p.name}
                        {yellow && <span className="card-yellow" role="img" aria-label="amarelo" />}
                        {oop && <span className="oop-tag">fora de posição</span>}
                      </td>
                      <td className="num">
                        <FitnessBar value={side.fitness[id] ?? 100} />
                      </td>
                      <td>
                        <MoraleArrow value={p.morale ?? 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <table className="compact bench" aria-label="Banco">
              <tbody>
                {benchOptions.length === 0 && (
                  <tr>
                    <td>Sem reservas disponíveis</td>
                  </tr>
                )}
                {benchOptions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className={`pos pos-${p.position}`}>{POSITION_LABEL[p.position]}</span>
                    </td>
                    <td>{p.name}</td>
                    <td className="num">
                      <FitnessBar value={p.fitness ?? 100} />
                    </td>
                    <td>
                      <MoraleArrow value={p.morale ?? 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="decisions">
            {!stopped && !finishing && <p className="hint">Pause para mexer no time</p>}
            {liveStop && (
              <div role="status" aria-label="Parada" className="stop-notice">
                {liveStop.map((e, i) => (
                  <p key={i} className="missing">
                    {stopLine(e, live, side, forced)}
                  </p>
                ))}
              </div>
            )}
            <div className="decision-row">
              <select
                aria-label="Sai"
                disabled={!stopped}
                value={outSlot}
                onChange={(e) => {
                  setOutSlot(Number(e.target.value));
                  setTarget(null);
                }}
              >
                {side.slots.map((id, slot) => {
                  const v = side.vacancy[slot];
                  const label = id ? player(id).name : v ? `${player(v.playerId).name} (${v.why === "red" ? "expulso" : "lesionado"})` : "Vaga";
                  return (
                    <option key={slot} value={slot}>
                      {POSITION_LABEL[side.slotPos[slot]!]} · {label}
                    </option>
                  );
                })}
              </select>
              <select aria-label="Entra" disabled={!stopped} value={chosenIn} onChange={(e) => setInId(e.target.value)}>
                {benchOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {POSITION_LABEL[p.position]} · {p.name} ({p.rating})
                  </option>
                ))}
              </select>
              <button disabled={!stopped || !chosenIn} onClick={() => substitute(outSlot, chosenIn, chosenTarget)}>
                Substituir
              </button>
            </div>
            {redSlots.length > 0 && (
              <div className="decision-row">
                <select aria-label="Posição" disabled={!stopped} value={chosenTarget} onChange={(e) => setTarget(Number(e.target.value))}>
                  <option value={outSlot}>
                    no lugar de {slotName(outSlot)} ({POSITION_LABEL[side.slotPos[outSlot]!]})
                  </option>
                  {targets.map((slot) => (
                    <option key={slot} value={slot}>
                      na vaga de {slotName(slot)} ({POSITION_LABEL[side.slotPos[slot]!]}, expulso)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="decision-row">
              <select aria-label="Formação" disabled={!stopped} value={side.formation ?? ""} onChange={(e) => changeLiveFormation(e.target.value as FormationName)}>
                {FORMATION_NAMES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select aria-label="Postura" disabled={!stopped} value={side.posture} onChange={(e) => changeLivePosture(e.target.value as Posture)}>
                {POSTURES.map((p) => (
                  <option key={p} value={p}>
                    {POSTURE_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            {message && (
              <p role="alert" className="missing">
                {message}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="action-bar">
        <span className="matchday">
          {minute}&apos; de {MATCH_MINUTES}&apos;
        </span>
        <div className="speeds">
          {SPEEDS.map((s) => (
            <button key={s} className={`speed${speed === s ? " is-on" : ""}`} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
        {clock === "running" ? (
          <button onClick={pause} disabled={finishing}>
            Pausar
          </button>
        ) : (
          <button onClick={resume} disabled={finishing || !!forced}>
            {goOn}
          </button>
        )}
        <button className="primary" disabled={finishing} onClick={() => void skipToEnd()}>
          Pular para o fim
        </button>
      </div>
    </div>
  );
}

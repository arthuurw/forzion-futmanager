// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { openDB } from "idb";
import { App } from "../App";
import type { GameState } from "../engine/types";
import { DB_NAME, DB_VERSION, STORE, slotKey } from "../persistence/save";
import { useGame, userClub } from "../store";
import { resetAll, seededGame, seededGameIn } from "./test-utils";

beforeEach(resetAll);
afterEach(() => vi.restoreAllMocks());

async function put(slot: number, doc: unknown): Promise<void> {
  const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
  await db.put(STORE, doc, slotKey(slot));
  db.close();
}

async function raw(slot: number): Promise<Record<string, unknown> | undefined> {
  const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
  const doc = (await db.get(STORE, slotKey(slot))) as Record<string, unknown> | undefined;
  db.close();
  return doc;
}

const at = (game: GameState, savedAt: number) => ({ ...game, savedAt });
const clubName = (game: GameState) => userClub(game)!.name;
/** Three games of different clubs, so the screen tells which one opened. */
const games = () => [seededGame(7, 0), seededGame(9, 3), seededGame(11, 5)] as const;
const row = (n: number) => within(screen.getByRole("list", { name: "Espaços" })).getByRole("listitem", { name: `Jogo ${n}` });
const buttonsOf = (el: HTMLElement) => within(el).queryAllByRole("button").map((b) => b.textContent);

/** Opens the app on what IndexedDB holds and waits for the title menu. */
async function boot(): Promise<UserEvent> {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("button", { name: "Novo jogo" });
  return user;
}

async function openSaves(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Jogos salvos" }));
  await screen.findByRole("heading", { name: "Jogos salvos" });
}

describe("tela Jogos salvos (varios-saves)", () => {
  test("lista dos espaços na tela", async () => {
    // C11 (L-001, L-008): a readable game, an empty slot and an unsupported save, in order.
    const [a] = games();
    const savedAt = new Date(2026, 8, 30, 14, 5).getTime();
    await put(1, at(a, savedAt));
    await put(3, { schemaVersion: 9 });
    const user = await boot();
    await openSaves(user);
    const items = within(screen.getByRole("list", { name: "Espaços" })).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("aria-label"))).toEqual(["Jogo 1", "Jogo 2", "Jogo 3"]);
    expect(row(1)).toHaveTextContent(`${clubName(a)} · ${a.leagues[0]!.name} · Temporada ${a.season}`);
    expect(row(1)).toHaveTextContent("Salvo em 30/09/2026 às 14:05");
    expect(buttonsOf(row(1))).toEqual(["Abrir", "Apagar"]);
    expect(row(2)).toHaveTextContent("Vazio");
    expect(buttonsOf(row(2))).toEqual([]);
    expect(row(3)).toHaveTextContent("Jogo salvo incompatível (versão 9)");
    expect(buttonsOf(row(3))).toEqual(["Apagar"]);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  test("jogo sem data", async () => {
    // C12: a save from before the feature has no «Salvo em».
    const [a] = games();
    await put(1, a);
    const user = await boot();
    await openSaves(user);
    expect(row(1)).toHaveTextContent(`${clubName(a)} · ${a.leagues[0]!.name} · Temporada ${a.season}`);
    expect(row(1)).not.toHaveTextContent("Salvo em");
  });

  test("resumo com a liga do clube", async () => {
    // Ajustes-saves C3 (L-018, L-005): the user's club outside the first league names its own league.
    for (const division of [1, 2]) {
      cleanup();
      resetAll();
      const game = seededGameIn(division, 7, 2);
      expect(game.leagues[division]!.name, `liga ${division}`).not.toBe(game.leagues[0]!.name);
      await put(1, at(game, 100));
      const user = await boot();
      await openSaves(user);
      expect(row(1), `liga ${division}`).toHaveTextContent(`${clubName(game)} · ${game.leagues[division]!.name} · Temporada ${game.season}`);
      expect(row(1), `liga ${division}`).not.toHaveTextContent(game.leagues[0]!.name);
    }
  });

  test("abrir um espaço", async () => {
    // C13 (L-005): a slot with no mark opens its squad; one with a pending live date plays it first.
    const [a, b, c] = games();
    await put(1, at(a, 200));
    await put(3, at(c, 100));
    let user = await boot();
    expect(useGame.getState().activeSlot).toBe(1);
    await openSaves(user);
    await user.click(within(row(3)).getByRole("button", { name: "Abrir" }));
    expect(await screen.findByRole("heading", { name: clubName(c) })).toBeInTheDocument();
    expect(useGame.getState().activeSlot).toBe(3);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    await act(async () => {
      await useGame.getState().setFormation("4-3-3");
    });
    expect((await raw(3))?.savedAt).toBe(1700000000000);
    expect((await raw(1))?.savedAt).toBe(200);
    vi.restoreAllMocks();

    cleanup();
    resetAll();
    await put(1, at(a, 200));
    await put(2, { ...at(b, 100), pendingLive: true });
    user = await boot();
    await openSaves(user);
    await user.click(within(row(2)).getByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(useGame.getState().phase).toBe("round"));
    await waitFor(async () => expect((await raw(2))?.pendingLive).toBeUndefined());
    expect(((await raw(2))!.leagues as GameState["leagues"])[0]!.currentRound).toBe(1);
    expect(useGame.getState().activeSlot).toBe(2);
  });

  test("apagar com confirmação", async () => {
    // C14 (L-008): the exact question, the focus on «Sim, apagar», nothing removed before it.
    const [a, b] = games();
    await put(1, at(a, 200));
    await put(2, at(b, 100));
    const user = await boot();
    await openSaves(user);
    await user.click(within(row(2)).getByRole("button", { name: "Apagar" }));
    const dialog = screen.getByRole("alertdialog", { name: "Confirmar apagar" });
    expect(dialog).toHaveTextContent("Apagar o Jogo 2? Isso não pode ser desfeito.");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Sim, apagar" }));
    expect(await raw(2)).toBeDefined();
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog", { name: "Confirmar apagar" })).not.toBeInTheDocument();
    expect(await raw(2)).toBeDefined();

    await user.click(within(row(2)).getByRole("button", { name: "Apagar" }));
    await user.click(screen.getByRole("button", { name: "Sim, apagar" }));
    await waitFor(() => expect(row(2)).toHaveTextContent("Vazio"));
    expect(await raw(2)).toBeUndefined();
    expect(await raw(1)).toEqual(at(a, 200));
  });

  test("apagar o espaço ativo", async () => {
    // C15 (L-005): the next most recent game becomes active; with none left, the menu has no game.
    const [a, b, c] = games();
    await put(1, at(a, 100));
    await put(3, at(c, 200));
    let user = await boot();
    expect(useGame.getState().activeSlot).toBe(3);
    await openSaves(user);
    await user.click(within(row(3)).getByRole("button", { name: "Apagar" }));
    await user.click(screen.getByRole("button", { name: "Sim, apagar" }));
    await waitFor(() => expect(row(3)).toHaveTextContent("Vazio"));
    expect(useGame.getState().activeSlot).toBe(1);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: clubName(a) })).toBeInTheDocument();

    cleanup();
    resetAll();
    await put(2, at(b, 100));
    user = await boot();
    await openSaves(user);
    await user.click(within(row(2)).getByRole("button", { name: "Apagar" }));
    await user.click(screen.getByRole("button", { name: "Sim, apagar" }));
    await waitFor(() => expect(row(2)).toHaveTextContent("Vazio"));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await screen.findByRole("button", { name: "Novo jogo" });
    expect(screen.getAllByRole("button").filter((b) => b.closest(".menu")).map((b) => b.textContent)).toEqual(["Importar jogo", "Novo jogo", "Sobre"]);
  });

  test("voltar ao título", async () => {
    // C16.
    await put(1, at(games()[0], 100));
    const user = await boot();
    await openSaves(user);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(useGame.getState().phase).toBe("home");
  });
});

describe("novo jogo nos espaços (varios-saves)", () => {
  test("novo jogo no espaço vazio", async () => {
    // C17 (L-018): slot 2 is the empty one between two games.
    const [a, , c] = games();
    await put(1, at(a, 100));
    await put(3, at(c, 200));
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Novo jogo" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(useGame.getState().phase).toBe("chooseClub");
    const clubId = useGame.getState().game!.leagues[0]!.clubs[6]!.id;
    await act(async () => {
      await useGame.getState().chooseClub(clubId);
    });
    expect((await raw(2))?.userClubId).toBe(clubId);
    expect(await raw(1)).toEqual(at(a, 100));
    expect(await raw(3)).toEqual(at(c, 200));
  });

  test("novo jogo com os espaços cheios", async () => {
    // C18 (L-008): two readable games and an unsupported save fill the 3 slots.
    const [a, , c] = games();
    await put(1, at(a, 100));
    await put(2, { schemaVersion: 9 });
    await put(3, at(c, 200));
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Novo jogo" }));
    expect(await screen.findByRole("heading", { name: "Jogos salvos" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Os 3 espaços estão ocupados. Apague um jogo para começar outro.");
    expect(useGame.getState().phase).toBe("saves");
    expect(useGame.getState().game?.userClubId).toBe(c.userClubId);
    expect(await raw(1)).toEqual(at(a, 100));
    expect(await raw(2)).toEqual({ schemaVersion: 9 });
    expect(await raw(3)).toEqual(at(c, 200));
  });

  test("menu principal mantém o espaço", async () => {
    // C22 (menu-no-elenco C1): back to the title and «Continuar» keep the slot being written.
    const [a, b] = games();
    await put(1, at(a, 100));
    await put(2, at(b, 200));
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: clubName(b) });
    await user.click(screen.getByRole("button", { name: "Menu principal" }));
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: clubName(b) })).toBeInTheDocument();
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    await act(async () => {
      await useGame.getState().setFormation("4-3-3");
    });
    expect((await raw(2))?.savedAt).toBe(1700000000000);
    expect(await raw(1)).toEqual(at(a, 100));
    // Ajustes-saves C5: the third slot is left alone too.
    expect(await raw(3)).toBeUndefined();
  });
});

describe("dificuldade em Jogos salvos (dificuldade)", () => {
  test("nível no resumo", async () => {
    // C8 (AC 7, L-001, L-005): each readable game ends its summary with its level; none = Normal.
    const [a, b, c] = games();
    await put(1, at({ ...a, difficulty: "easy" }, 100));
    await put(2, at(b, 200));
    await put(3, at({ ...c, difficulty: "hard" }, 300));
    const user = await boot();
    await openSaves(user);
    const summary = (game: GameState, level: string) => `${clubName(game)} · ${game.leagues[0]!.name} · Temporada ${game.season} · ${level}`;
    expect(row(1)).toHaveTextContent(summary(a, "Fácil"));
    expect(row(2)).toHaveTextContent(summary(b, "Normal"));
    expect(row(3)).toHaveTextContent(summary(c, "Difícil"));
  });
});

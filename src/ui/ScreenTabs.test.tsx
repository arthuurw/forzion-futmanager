// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { newGame } from "../engine/generate";
import { playRound } from "../engine/season";
import { useGame } from "../store";
import { ChooseClub } from "./ChooseClub";
import { Cup } from "./Cup";
import { Finance } from "./Finance";
import { History } from "./History";
import { Live } from "./Live";
import { Market } from "./Market";
import { Round } from "./Round";
import { Squad } from "./Squad";
import { resetAll, seededGame } from "./test-utils";

beforeEach(() => {
  resetAll();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("abas (correcoes-validacao)", () => {
  test("abas acessíveis", async () => {
    // C52 (AC 48, L-005): every screen with tabs.
    const screens: [string, () => Promise<void> | void, () => ReactElement][] = [
      ["Escolher clube", () => void useGame.setState({ phase: "chooseClub", game: newGame(5) }), () => <ChooseClub />],
      ["Elenco", () => void useGame.setState({ phase: "squad", game: seededGame(4), hasSave: true }), () => <Squad />],
      ["Mercado", () => void useGame.setState({ phase: "market", game: seededGame(3), hasSave: true }), () => <Market />],
      ["Finanças", () => void useGame.setState({ phase: "finance", game: seededGame(9), hasSave: true }), () => <Finance />],
      ["Histórico", () => void useGame.setState({ phase: "history", game: seededGame(1, 0, 3), hasSave: true }), () => <History />],
      ["Copa", () => void useGame.setState({ phase: "cup", game: seededGame(1), hasSave: true }), () => <Cup />],
      [
        "Rodada",
        () => {
          const { state, ...lastRound } = playRound(seededGame(8, 5));
          useGame.setState({ phase: "round", game: state, lastRound });
        },
        () => <Round />,
      ],
      [
        "Ao vivo",
        async () => {
          useGame.setState({ phase: "squad", game: seededGame(3), hasSave: true });
          await useGame.getState().playRound();
          useGame.getState().pause();
        },
        () => <Live />,
      ],
    ];
    const user = userEvent.setup();
    for (const [name, setup, element] of screens) {
      resetAll();
      await setup();
      render(element());
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length, name).toBeGreaterThan(1);
      // Each tab controls a panel that exists.
      for (const tab of tabs) {
        const id = tab.getAttribute("aria-controls");
        expect(id, `${name} ${tab.textContent}`).toBeTruthy();
        expect(document.getElementById(id!), `${name} ${tab.textContent}`).toHaveAttribute("role", "tabpanel");
      }
      // The arrows move to the next visible tab and back; «mobile-only» tabs are skipped here (no CSS in jsdom,
      // so they count as the wide layout's hidden ones).
      const visible = tabs.filter((t) => !t.classList.contains("mobile-only"));
      const start = tabs.find((t) => t.getAttribute("aria-selected") === "true")!;
      const from = visible.includes(start) ? visible.indexOf(start) : -1;
      const right = visible[(from + 1) % visible.length]!;
      start.focus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: right.textContent! }), `${name} →`).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement, `${name} → foco`).toBe(screen.getByRole("tab", { name: right.textContent! }));
      const left = visible[(visible.indexOf(right) + visible.length - 1) % visible.length]!;
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByRole("tab", { name: left.textContent! }), `${name} ←`).toHaveAttribute("aria-selected", "true");
      expect(screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true"), name).toHaveLength(1);
      cleanup();
    }
  }, 60_000);
});

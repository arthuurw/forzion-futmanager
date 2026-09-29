// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MoraleArrow } from "./Condition";

describe("condição (correcoes-validacao)", () => {
  test("ícones rotulados", () => {
    // C53 (AC 49): each of the 5 morale levels is an image named by its value.
    const rows: [number, string, string][] = [
      [-2, "moral -2", "↓"],
      [-1, "moral -1", "↘"],
      [0, "moral 0", "→"],
      [1, "moral +1", "↗"],
      [2, "moral +2", "↑"],
    ];
    for (const [value, label, arrow] of rows) {
      const view = render(<MoraleArrow value={value} />);
      const icon = screen.getByRole("img", { name: label });
      expect(icon).toHaveTextContent(arrow);
      view.unmount();
    }
  });
});

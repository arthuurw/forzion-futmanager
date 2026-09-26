import { formatMoney } from "./money";

describe("dinheiro", () => {
  test("formato do dinheiro", () => {
    expect(formatMoney(0)).toBe("R$ 0");
    expect(formatMoney(40_800)).toBe("R$ 40.800");
    expect(formatMoney(1_234_567)).toBe("R$ 1.234.567");
    expect(formatMoney(-500_000)).toBe("-R$ 500.000");
    expect(formatMoney(999)).toBe("R$ 999");
    expect(formatMoney(1000)).toBe("R$ 1.000");
  });
});

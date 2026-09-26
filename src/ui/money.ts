/** Whole number with PT-BR thousands dots, e.g. «38.000». */
export function formatNumber(n: number): string {
  return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** AC 14: whole reais, e.g. «R$ 1.234.567» and «-R$ 500.000». */
export function formatMoney(amount: number): string {
  return `${amount < 0 ? "-" : ""}R$ ${formatNumber(amount)}`;
}

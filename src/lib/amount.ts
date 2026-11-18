/** Decimal separator only; grouping separators are deliberately not guessed. */
export function parseAmount(value: string): number {
  const text = value.trim();
  if (!/^-?(?:\d{1,12}(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text)) {
    throw new Error("Introduce un importe con hasta dos decimales, usando coma o punto.");
  }
  const amount = Number(text.replace(",", "."));
  if (!Number.isFinite(amount)) throw new Error("Revisa el importe.");
  return amount;
}

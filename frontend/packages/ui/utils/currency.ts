/** Formats an amount as GBP currency. Returns "—" for null/undefined/invalid values. */
export function formatCurrency(amount: number | string | null | undefined): string {
    if (amount == null) return "—";
    const numericAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount;
    if (Number.isNaN(numericAmount)) return "—";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
    }).format(numericAmount);
}

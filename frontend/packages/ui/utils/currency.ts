/** Formats a numeric amount as GBP currency. Returns "—" for null/undefined. */
export function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return "—";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
    }).format(amount);
}

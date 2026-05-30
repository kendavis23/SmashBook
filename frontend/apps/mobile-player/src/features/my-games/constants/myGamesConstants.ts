import type { FilterTab } from "../types";
import type { ThemeColors } from "../../../theme";
import { palette } from "../../../theme";

export const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
];

type StatusConfig = { label: string; bg: string; text: string; dot: string };
type PaymentConfig = { label: string; bg: string; text: string };

// Theme-aware status/payment badge builders — see bookingConstants for the same pattern.
export function getStatusConfig(c: ThemeColors): Record<string, StatusConfig> {
    return {
        confirmed: {
            label: "Confirmed",
            bg: c.successSurface,
            text: c.success,
            dot: palette.emerald500,
        },
        pending: {
            label: "Pending",
            bg: c.warningSurface,
            text: c.warning,
            dot: palette.amber500,
        },
        cancelled: {
            label: "Cancelled",
            bg: c.destructiveSurface,
            text: c.destructive,
            dot: palette.red500,
        },
        completed: {
            label: "Completed",
            bg: c.ctaSurface,
            text: c.cta,
            dot: c.cta,
        },
    };
}

export function getPaymentConfig(c: ThemeColors): Record<string, PaymentConfig> {
    return {
        paid: { label: "Paid", bg: c.successSurface, text: c.success },
        pending: { label: "Unpaid", bg: c.warningSurface, text: c.warning },
        refunded: { label: "Refunded", bg: c.ctaSurface, text: c.cta },
    };
}

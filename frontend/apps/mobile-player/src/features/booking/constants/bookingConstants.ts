import type { ThemeColors } from "../../../theme";
import { palette } from "../../../theme";

type StatusConfig = { label: string; bg: string; text: string; dot: string };
type PaymentConfig = { label: string; bg: string; text: string };
type InviteConfig = { label: string; color: string };

// Theme-aware badge config builders. Components pass `useThemeColors()`; each status
// maps to a semantic state token (surface + foreground) plus a vivid palette "dot".
export function getStatusConfig(c: ThemeColors): Record<string, StatusConfig> {
    return {
        confirmed: {
            label: "Confirmed",
            bg: c.successSurface,
            text: c.success,
            dot: palette.green500,
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
            bg: c.muted,
            text: c.mutedForeground,
            dot: c.mutedForeground,
        },
    };
}

export function getPaymentConfig(c: ThemeColors): Record<string, PaymentConfig> {
    return {
        paid: { label: "Paid", bg: c.successSurface, text: c.success },
        pending: { label: "Unpaid", bg: c.warningSurface, text: c.warning },
        failed: { label: "Failed", bg: c.destructiveSurface, text: c.destructive },
        refunded: { label: "Refunded", bg: c.muted, text: c.mutedForeground },
    };
}

export function getInviteConfig(c: ThemeColors): Record<string, InviteConfig> {
    return {
        accepted: { label: "Accepted", color: c.success },
        declined: { label: "Declined", color: c.destructive },
        pending: { label: "Pending", color: c.warning },
    };
}

export const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

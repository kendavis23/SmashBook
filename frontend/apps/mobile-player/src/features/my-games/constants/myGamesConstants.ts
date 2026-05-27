import type { FilterTab } from "../types";

export const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
];

export const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
> = {
    confirmed: {
        label: "Confirmed",
        bg: "#ECFDF5",
        text: "#059669",
        dot: "#10B981",
    },
    pending: {
        label: "Pending",
        bg: "#FFFBEB",
        text: "#D97706",
        dot: "#F59E0B",
    },
    cancelled: {
        label: "Cancelled",
        bg: "#FEF2F2",
        text: "#DC2626",
        dot: "#EF4444",
    },
    completed: {
        label: "Completed",
        bg: "#F0F9FF",
        text: "#0369A1",
        dot: "#0EA5E9",
    },
};

export const PAYMENT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    paid: { label: "Paid", bg: "#ECFDF5", text: "#059669" },
    pending: { label: "Unpaid", bg: "#FFFBEB", text: "#D97706" },
    refunded: { label: "Refunded", bg: "#EFF6FF", text: "#2563EB" },
};

export const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
> = {
    confirmed: {
        label: "Confirmed",
        bg: "#DCFCE7",
        text: "#15803D",
        dot: "#22C55E",
    },
    pending: {
        label: "Pending",
        bg: "#FEF9C3",
        text: "#A16207",
        dot: "#EAB308",
    },
    cancelled: {
        label: "Cancelled",
        bg: "#FEE2E2",
        text: "#B91C1C",
        dot: "#EF4444",
    },
    completed: {
        label: "Completed",
        bg: "#F3F4F6",
        text: "#6B7280",
        dot: "#9CA3AF",
    },
};

export const PAYMENT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    paid: { label: "Paid", bg: "#DCFCE7", text: "#15803D" },
    pending: { label: "Unpaid", bg: "#FEF9C3", text: "#A16207" },
    failed: { label: "Failed", bg: "#FEE2E2", text: "#B91C1C" },
    refunded: { label: "Refunded", bg: "#F3F4F6", text: "#6B7280" },
};

export const INVITE_CONFIG: Record<string, { label: string; color: string }> = {
    accepted: { label: "Accepted", color: "#15803D" },
    declined: { label: "Declined", color: "#B91C1C" },
    pending: { label: "Pending", color: "#A16207" },
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

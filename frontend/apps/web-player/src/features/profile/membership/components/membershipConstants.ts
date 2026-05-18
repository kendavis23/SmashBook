type StatusStyle = { label: string; bg: string; text: string };

export const STATUS_STYLES: Record<string, StatusStyle> = {
    active: { label: "Active", bg: "bg-success/10", text: "text-success" },
    trialing: { label: "Trial", bg: "bg-success/10", text: "text-success" },
    paused: { label: "Paused", bg: "bg-muted", text: "text-muted-foreground" },
    cancelled: { label: "Cancelled", bg: "bg-muted", text: "text-muted-foreground" },
    expired: { label: "Expired", bg: "bg-muted", text: "text-muted-foreground" },
};

export const FALLBACK_STYLE: StatusStyle = {
    label: "Unknown",
    bg: "bg-muted",
    text: "text-muted-foreground",
};

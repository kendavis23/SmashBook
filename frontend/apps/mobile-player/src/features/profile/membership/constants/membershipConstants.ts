type StatusStyle = { label: string; bgClassName: string; textClassName: string };

export const STATUS_STYLES: Record<string, StatusStyle> = {
    active: { label: "Active", bgClassName: "bg-success/10", textClassName: "text-success" },
    trialing: { label: "Trial", bgClassName: "bg-success/10", textClassName: "text-success" },
    paused: {
        label: "Paused",
        bgClassName: "bg-muted",
        textClassName: "text-muted-foreground",
    },
    cancelled: {
        label: "Cancelled",
        bgClassName: "bg-muted",
        textClassName: "text-muted-foreground",
    },
    expired: {
        label: "Expired",
        bgClassName: "bg-muted",
        textClassName: "text-muted-foreground",
    },
};

export const FALLBACK_STYLE: StatusStyle = {
    label: "Unknown",
    bgClassName: "bg-muted",
    textClassName: "text-muted-foreground",
};

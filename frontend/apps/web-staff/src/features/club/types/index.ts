export type {
    Club,
    ClubSettingsInput,
    OperatingHours,
    PricingRule,
} from "@repo/staff-domain/models";

export type Tab = "view" | "settings" | "hours" | "pricing";

export const TABS: { id: Tab; label: string }[] = [
    { id: "view", label: "View" },
    { id: "settings", label: "Settings" },
    { id: "hours", label: "Operating Hours" },
    { id: "pricing", label: "Pricing Rules" },
];

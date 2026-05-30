import type { ProfileModuleRow } from "../types";

// `iconBgClassName` values are intentional *decorative* per-row accent colors (one
// distinct hue per menu item), not semantic state tokens. They are theme-stable —
// these vivid chips read correctly on both light and dark surfaces — so they are kept
// as fixed brand accents rather than mapped to semantic theme tokens. This is the one
// sanctioned exception to "no hardcoded colors"; see the theme guide.
export const PROFILE_MODULE_GROUPS: ProfileModuleRow[][] = [
    [
        {
            id: "personal-information",
            icon: "person-circle",
            iconBgClassName: "bg-[#EF4444]",
            label: "My Profile",
            href: "/profile-edit",
        },
        {
            id: "notifications",
            icon: "notifications",
            iconBgClassName: "bg-[#3B82F6]",
            label: "Notification",
            href: "/profile-notifications",
        },
        {
            id: "appearance",
            icon: "color-palette",
            iconBgClassName: "bg-[#64748B]",
            label: "Appearance",
        },
    ],
    [
        {
            id: "cards",
            icon: "card",
            iconBgClassName: "bg-[#8B5CF6]",
            label: "Cards",
            href: "/profile-cards",
        },
        {
            id: "wallet",
            icon: "wallet",
            iconBgClassName: "bg-[#10B981]",
            label: "Wallet",
            href: "/profile-wallet",
        },
    ],
    [
        {
            id: "membership",
            icon: "ribbon",
            iconBgClassName: "bg-[#F59E0B]",
            label: "My Membership",
            href: "/profile-membership",
        },
        {
            id: "plans",
            icon: "list",
            iconBgClassName: "bg-[#06B6D4]",
            label: "Plans",
            href: "/profile-plans",
        },
    ],
];

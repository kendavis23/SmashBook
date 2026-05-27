import type { ProfileModuleRow } from "../types";

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
    ],
    [
        { id: "cards", icon: "card", iconBgClassName: "bg-[#8B5CF6]", label: "Cards" },
        { id: "wallet", icon: "wallet", iconBgClassName: "bg-[#10B981]", label: "Wallet" },
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

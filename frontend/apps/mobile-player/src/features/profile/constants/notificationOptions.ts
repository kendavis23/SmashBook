import type { NotificationOption } from "../types";

export const DEFAULT_NOTIFICATION_CHANNEL = "email";

// `iconBgClassName` values are intentional decorative per-channel accent colors, not
// semantic tokens — kept as fixed brand accents (theme-stable on light + dark). See the
// note in profileModules.ts and the theme guide's "decorative accents" exception.
export const NOTIFICATION_OPTIONS: NotificationOption[] = [
    {
        value: DEFAULT_NOTIFICATION_CHANNEL,
        label: "Email",
        description: "Inbox updates",
        icon: "mail",
        iconBgClassName: "bg-[#6366F1]",
    },
    {
        value: "sms",
        label: "SMS",
        description: "Text to your phone",
        icon: "chatbubble-ellipses",
        iconBgClassName: "bg-[#10B981]",
    },
    {
        value: "push",
        label: "Push",
        description: "Device alerts",
        icon: "notifications",
        iconBgClassName: "bg-[#EF4444]",
    },
    {
        value: "in_app",
        label: "In-App",
        description: "While you browse",
        icon: "phone-portrait",
        iconBgClassName: "bg-[#3B82F6]",
    },
];

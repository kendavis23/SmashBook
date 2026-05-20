import type { NotificationOption } from "../types";

export const DEFAULT_NOTIFICATION_CHANNEL = "email";

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

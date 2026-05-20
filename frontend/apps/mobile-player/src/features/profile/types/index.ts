import type { Ionicons } from "@expo/vector-icons";
import type { NotificationChannel } from "@repo/auth";
import type { Href } from "expo-router";

export type ProfileModuleRow = {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBgClassName: string;
    label: string;
    href?: Href;
};

export type NotificationOption = {
    value: NotificationChannel;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBgClassName: string;
};

import { type JSX } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem } from "../types";
import { formatAmount } from "../utils/myGamesFormatters";

type Props = {
    games: PlayerBookingItem[];
};

export function StatsBar({ games }: Props): JSX.Element {
    const total = games.length;
    const completed = games.filter((g) => g.status === "completed").length;
    const totalSpend = games
        .filter((g) => g.payment_status === "paid")
        .reduce((sum, g) => sum + (g.amount_due ?? 0), 0);

    const winRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const stats: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value: string;
        iconBg: string;
        iconColor: string;
    }[] = [
        {
            icon: "tennisball",
            label: "Total games",
            value: String(total),
            iconBg: "#EFF6FF",
            iconColor: "#2563EB",
        },
        {
            icon: "checkmark-circle",
            label: "Completed",
            value: String(completed),
            iconBg: "#ECFDF5",
            iconColor: "#059669",
        },
        {
            icon: "trophy",
            label: "Completion",
            value: `${winRate}%`,
            iconBg: "#FFFBEB",
            iconColor: "#D97706",
        },
        {
            icon: "card",
            label: "Total spend",
            value: formatAmount(totalSpend),
            iconBg: "#F0F9FF",
            iconColor: "#0369A1",
        },
    ];

    return (
        <View className="flex-row gap-2.5 px-5">
            {stats.map((stat) => (
                <View
                    key={stat.label}
                    className="flex-1 items-center gap-1.5 overflow-hidden rounded-[18px] bg-white px-2 py-3 shadow-sm"
                >
                    <View
                        style={{ backgroundColor: stat.iconBg }}
                        className="h-8 w-8 items-center justify-center rounded-[10px]"
                    >
                        <Ionicons name={stat.icon} size={15} color={stat.iconColor} />
                    </View>
                    <Text className="text-[14px] font-bold text-[#111827]" numberOfLines={1}>
                        {stat.value}
                    </Text>
                    <Text
                        className="text-center text-[10px] leading-3 text-[#9CA3AF]"
                        numberOfLines={2}
                    >
                        {stat.label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

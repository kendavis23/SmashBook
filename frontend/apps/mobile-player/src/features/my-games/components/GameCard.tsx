import { type JSX } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem } from "../types";
import {
    formatGameDate,
    formatTimeRange,
    formatAmount,
    formatBookingType,
} from "../utils/myGamesFormatters";
import { STATUS_CONFIG, PAYMENT_CONFIG } from "../constants/myGamesConstants";

type Props = {
    game: PlayerBookingItem;
};

export function GameCard({ game }: Props): JSX.Element {
    const statusCfg = STATUS_CONFIG[game.status] ?? {
        label: game.status,
        bg: "#F3F4F6",
        text: "#374151",
        dot: "#9CA3AF",
    };
    const paymentCfg = PAYMENT_CONFIG[game.payment_status] ?? {
        label: game.payment_status,
        bg: "#F3F4F6",
        text: "#374151",
    };

    const isUpcoming = game.status === "confirmed" || game.status === "pending";

    return (
        <View
            className="overflow-hidden rounded-[22px] bg-white shadow-sm"
            accessibilityRole="none"
        >
            {/* Top accent bar — coloured by status */}
            <View style={{ backgroundColor: statusCfg.dot, height: 3 }} />

            <View className="px-4 pt-4 pb-4 gap-3">
                {/* Row 1: Court name + status badge */}
                <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 flex-row items-center gap-2.5 min-w-0">
                        <View
                            style={{ backgroundColor: isUpcoming ? "#EFF6FF" : "#F3F4F6" }}
                            className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                        >
                            <Ionicons
                                name="tennisball"
                                size={18}
                                color={isUpcoming ? "#2563EB" : "#9CA3AF"}
                            />
                        </View>
                        <Text
                            className="flex-1 text-[16px] font-bold text-[#111827]"
                            numberOfLines={1}
                        >
                            {game.court_name}
                        </Text>
                    </View>

                    {/* Status pill */}
                    <View
                        style={{ backgroundColor: statusCfg.bg }}
                        className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0"
                    >
                        <View
                            style={{ backgroundColor: statusCfg.dot }}
                            className="h-1.5 w-1.5 rounded-full"
                        />
                        <Text
                            style={{ color: statusCfg.text }}
                            className="text-[11px] font-semibold"
                        >
                            {statusCfg.label}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View className="h-px bg-[#F3F4F6]" />

                {/* Row 2: Date + Time */}
                <View className="flex-row gap-4">
                    <View className="flex-row items-center gap-1.5 flex-1">
                        <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                        <Text className="text-[12px] text-[#6B7280] font-medium" numberOfLines={1}>
                            {formatGameDate(game.start_datetime)}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                        <Text className="text-[12px] text-[#6B7280] font-medium">
                            {formatTimeRange(game.start_datetime, game.end_datetime)}
                        </Text>
                    </View>
                </View>

                {/* Row 3: Type + Role */}
                <View className="flex-row gap-3">
                    {/* Booking type chip */}
                    <View className="flex-row items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                        <Ionicons name="layers-outline" size={12} color="#6B7280" />
                        <Text className="text-[11px] font-medium text-[#6B7280]">
                            {formatBookingType(game.booking_type)}
                        </Text>
                    </View>

                    {/* Role chip */}
                    <View className="flex-row items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                        <Ionicons
                            name={game.role === "organiser" ? "star-outline" : "person-outline"}
                            size={12}
                            color="#6B7280"
                        />
                        <Text className="text-[11px] font-medium text-[#6B7280] capitalize">
                            {game.role}
                        </Text>
                    </View>
                </View>

                {/* Row 4: Payment status + Amount */}
                <View className="flex-row items-center justify-between">
                    <View
                        style={{ backgroundColor: paymentCfg.bg }}
                        className="rounded-full px-2.5 py-1"
                    >
                        <Text
                            style={{ color: paymentCfg.text }}
                            className="text-[11px] font-semibold"
                        >
                            {paymentCfg.label}
                        </Text>
                    </View>

                    <Text className="text-[15px] font-bold text-[#111827]">
                        {formatAmount(game.amount_due)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

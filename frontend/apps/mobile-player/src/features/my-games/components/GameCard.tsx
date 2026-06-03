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
import { getStatusConfig, getPaymentConfig } from "../constants/myGamesConstants";
import { useThemeColors } from "../../../theme";

type Props = {
    game: PlayerBookingItem;
};

export function GameCard({ game }: Props): JSX.Element {
    const colors = useThemeColors();
    const statusCfg = getStatusConfig(colors)[game.status] ?? {
        label: game.status,
        bg: colors.muted,
        text: colors.mutedForeground,
        dot: colors.mutedForeground,
    };
    const paymentCfg = getPaymentConfig(colors)[game.payment_status] ?? {
        label: game.payment_status,
        bg: colors.muted,
        text: colors.mutedForeground,
    };

    const isUpcoming = game.status === "confirmed" || game.status === "pending";

    return (
        <View
            className="overflow-hidden rounded-[22px] bg-card shadow-sm"
            style={{ borderWidth: 1.5, borderColor: "rgba(0,0,0,0.07)" }}
            accessibilityRole="none"
        >
            <View className="px-4 pt-4 pb-4 gap-3">
                {/* Row 1: Court name + status badge */}
                <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 flex-row items-center gap-2.5 min-w-0">
                        <View
                            style={{
                                backgroundColor: isUpcoming ? colors.ctaSurface : colors.muted,
                            }}
                            className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                        >
                            <Ionicons
                                name="tennisball"
                                size={18}
                                color={isUpcoming ? colors.cta : colors.mutedForeground}
                            />
                        </View>
                        <Text
                            className="flex-1 text-[16px] font-bold text-foreground"
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
                <View className="h-px bg-border" />

                {/* Row 2: Date + Time */}
                <View className="flex-row gap-4">
                    <View className="flex-row items-center gap-1.5 flex-1">
                        <Ionicons
                            name="calendar-outline"
                            size={13}
                            color={colors.mutedForeground}
                        />
                        <Text
                            className="text-[12px] text-muted-foreground font-medium"
                            numberOfLines={1}
                        >
                            {formatGameDate(game.start_datetime)}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                        <Text className="text-[12px] text-muted-foreground font-medium">
                            {formatTimeRange(game.start_datetime, game.end_datetime)}
                        </Text>
                    </View>
                </View>

                {/* Row 3: Type + Role */}
                <View className="flex-row gap-3">
                    {/* Booking type chip */}
                    <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1">
                        <Ionicons name="layers-outline" size={12} color={colors.mutedForeground} />
                        <Text className="text-[11px] font-medium text-muted-foreground">
                            {formatBookingType(game.booking_type)}
                        </Text>
                    </View>

                    {/* Role chip */}
                    <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1">
                        <Ionicons
                            name={game.role === "organiser" ? "star-outline" : "person-outline"}
                            size={12}
                            color={colors.mutedForeground}
                        />
                        <Text className="text-[11px] font-medium text-muted-foreground capitalize">
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

                    <Text className="text-[15px] font-bold text-foreground">
                        {formatAmount(game.amount_due)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

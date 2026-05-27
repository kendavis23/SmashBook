import { type JSX } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem } from "../../types";
import {
    formatBookingDate,
    formatBookingTimeRange,
    formatAmount,
    formatBookingType,
} from "../../utils/bookingFormatters";
import { STATUS_CONFIG, PAYMENT_CONFIG, INVITE_CONFIG } from "../../constants/bookingConstants";

type Props = {
    booking: PlayerBookingItem;
    showActions: boolean;
    onManageClick: (item: PlayerBookingItem) => void;
    onPayClick: (item: PlayerBookingItem) => void;
};

export function BookingCard({
    booking,
    showActions,
    onManageClick,
    onPayClick,
}: Props): JSX.Element {
    const statusCfg = STATUS_CONFIG[booking.status] ?? {
        label: booking.status,
        bg: "#F3F4F6",
        text: "#374151",
        dot: "#9CA3AF",
    };
    const paymentCfg = PAYMENT_CONFIG[booking.payment_status] ?? {
        label: booking.payment_status,
        bg: "#F3F4F6",
        text: "#374151",
    };
    const inviteCfg = INVITE_CONFIG[booking.invite_status] ?? null;

    const isOrganiser = booking.role === "organiser";
    const showPay =
        showActions && booking.payment_status === "pending" && booking.invite_status === "accepted";

    return (
        <View
            className="overflow-hidden rounded-[22px] bg-white shadow-sm"
            accessibilityRole="none"
        >
            {/* Top accent bar */}
            <View style={{ backgroundColor: statusCfg.dot, height: 3 }} />

            <View className="gap-3 px-4 pb-4 pt-4">
                {/* Row 1: Court name + status badge */}
                <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                        <View
                            style={{ backgroundColor: isOrganiser ? "#EFF6FF" : "#F3F4F6" }}
                            className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                        >
                            <Ionicons
                                name="tennisball"
                                size={18}
                                color={isOrganiser ? "#2563EB" : "#9CA3AF"}
                            />
                        </View>
                        <Text
                            className="flex-1 text-[16px] font-bold text-[#111827]"
                            numberOfLines={1}
                        >
                            {booking.court_name}
                        </Text>
                    </View>

                    {/* Status pill */}
                    <View
                        style={{ backgroundColor: statusCfg.bg }}
                        className="shrink-0 flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
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
                    <View className="flex-1 flex-row items-center gap-1.5">
                        <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                        <Text className="text-[12px] font-medium text-[#6B7280]" numberOfLines={1}>
                            {formatBookingDate(booking.start_datetime)}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                        <Text className="text-[12px] font-medium text-[#6B7280]">
                            {formatBookingTimeRange(booking.start_datetime, booking.end_datetime)}
                        </Text>
                    </View>
                </View>

                {/* Row 3: Type + Role + Invite badge */}
                <View className="flex-row flex-wrap gap-2">
                    <View className="flex-row items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                        <Ionicons name="layers-outline" size={12} color="#6B7280" />
                        <Text className="text-[11px] font-medium text-[#6B7280]">
                            {formatBookingType(booking.booking_type)}
                        </Text>
                    </View>

                    <View
                        style={{ backgroundColor: isOrganiser ? "#EFF6FF" : "#F9FAFB" }}
                        className="flex-row items-center gap-1.5 rounded-full border border-[#E5E7EB] px-2.5 py-1"
                    >
                        <Ionicons
                            name={isOrganiser ? "star-outline" : "person-outline"}
                            size={12}
                            color={isOrganiser ? "#2563EB" : "#6B7280"}
                        />
                        <Text
                            style={{ color: isOrganiser ? "#2563EB" : "#6B7280" }}
                            className="text-[11px] font-semibold"
                        >
                            {isOrganiser ? "Organiser" : "Player"}
                        </Text>
                    </View>

                    {inviteCfg ? (
                        <View className="flex-row items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                            <Ionicons name="mail-outline" size={12} color={inviteCfg.color} />
                            <Text
                                style={{ color: inviteCfg.color }}
                                className="text-[11px] font-semibold"
                            >
                                {inviteCfg.label}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Row 4: Payment + Amount + Actions */}
                <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-row items-center gap-2">
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
                            {formatAmount(booking.amount_due)}
                        </Text>
                    </View>

                    {showActions ? (
                        <View className="flex-row items-center gap-2">
                            {showPay ? (
                                <Pressable
                                    onPress={() => onPayClick(booking)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Pay for booking"
                                    className="flex-row items-center gap-1.5 rounded-[12px] bg-[#2563EB] px-3 py-2 active:opacity-75"
                                >
                                    <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                                    <Text className="text-[12px] font-semibold text-white">
                                        Pay
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable
                                onPress={() => onManageClick(booking)}
                                accessibilityRole="button"
                                accessibilityLabel={`View booking at ${booking.court_name}`}
                                className="flex-row items-center gap-1.5 rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2 active:opacity-75"
                            >
                                <Ionicons name="eye-outline" size={14} color="#374151" />
                                <Text className="text-[12px] font-semibold text-[#374151]">
                                    View
                                </Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

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
import {
    getStatusConfig,
    getPaymentConfig,
    getInviteConfig,
} from "../../constants/bookingConstants";
import { useThemeColors } from "../../../../theme";

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
    const colors = useThemeColors();
    const statusCfg = getStatusConfig(colors)[booking.status] ?? {
        label: booking.status,
        bg: colors.muted,
        text: colors.mutedForeground,
        dot: colors.mutedForeground,
    };
    const paymentCfg = getPaymentConfig(colors)[booking.payment_status] ?? {
        label: booking.payment_status,
        bg: colors.muted,
        text: colors.mutedForeground,
    };
    const inviteCfg = getInviteConfig(colors)[booking.invite_status] ?? null;

    const isOrganiser = booking.role === "organiser";
    const showPay =
        showActions && booking.payment_status === "pending" && booking.invite_status === "accepted";

    return (
        <View
            style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
            }}
            accessibilityRole="none"
        >
            {/* Top accent line — status colour */}
            <View style={{ height: 3, backgroundColor: statusCfg.dot }} />

            <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 11 }}>
                {/* Row 1: Court icon + name + status badge */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 0,
                        }}
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 11,
                                backgroundColor: isOrganiser ? colors.ctaSurface : colors.muted,
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Ionicons
                                name="tennisball"
                                size={17}
                                color={isOrganiser ? colors.cta : colors.mutedForeground}
                            />
                        </View>
                        <Text
                            style={{
                                flex: 1,
                                fontSize: 16,
                                fontWeight: "700",
                                color: colors.foreground,
                                letterSpacing: -0.3,
                            }}
                            numberOfLines={1}
                        >
                            {booking.court_name}
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: statusCfg.bg,
                            borderRadius: 20,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            flexShrink: 0,
                        }}
                    >
                        <View
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: statusCfg.dot,
                            }}
                        />
                        <Text style={{ fontSize: 11, fontWeight: "600", color: statusCfg.text }}>
                            {statusCfg.label}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Row 2: Date + Time */}
                <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons
                            name="calendar-outline"
                            size={13}
                            color={colors.mutedForeground}
                        />
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "500",
                                color: colors.mutedForeground,
                            }}
                            numberOfLines={1}
                        >
                            {formatBookingDate(booking.start_datetime)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "500",
                                color: colors.mutedForeground,
                            }}
                        >
                            {formatBookingTimeRange(booking.start_datetime, booking.end_datetime)}
                        </Text>
                    </View>
                </View>

                {/* Row 3: Type + Role + Invite tags */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.muted,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                        }}
                    >
                        <Ionicons name="layers-outline" size={11} color={colors.mutedForeground} />
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "500",
                                color: colors.mutedForeground,
                            }}
                        >
                            {formatBookingType(booking.booking_type)}
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: isOrganiser ? colors.ctaBorder : colors.border,
                            backgroundColor: isOrganiser ? colors.ctaSurface : colors.muted,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                        }}
                    >
                        <Ionicons
                            name={isOrganiser ? "star-outline" : "person-outline"}
                            size={11}
                            color={isOrganiser ? colors.cta : colors.mutedForeground}
                        />
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: isOrganiser ? colors.cta : colors.mutedForeground,
                            }}
                        >
                            {isOrganiser ? "Organiser" : "Player"}
                        </Text>
                    </View>

                    {inviteCfg ? (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.muted,
                                paddingHorizontal: 9,
                                paddingVertical: 4,
                            }}
                        >
                            <Ionicons name="mail-outline" size={11} color={inviteCfg.color} />
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: inviteCfg.color,
                                }}
                            >
                                {inviteCfg.label}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Row 4: Payment badge + amount + action buttons */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View
                            style={{
                                backgroundColor: paymentCfg.bg,
                                borderRadius: 20,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: paymentCfg.text,
                                }}
                            >
                                {paymentCfg.label}
                            </Text>
                        </View>
                        <Text
                            style={{
                                fontSize: 17,
                                fontWeight: "700",
                                color: colors.foreground,
                                letterSpacing: -0.4,
                            }}
                        >
                            {formatAmount(booking.amount_due)}
                        </Text>
                    </View>

                    {showActions ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            {showPay ? (
                                <Pressable
                                    onPress={() => onPayClick(booking)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Pay for booking"
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        borderRadius: 22,
                                        backgroundColor: colors.cta,
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="card-outline"
                                        size={13}
                                        color={colors.ctaForeground}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "600",
                                            color: colors.ctaForeground,
                                        }}
                                    >
                                        Pay
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable
                                onPress={() => onManageClick(booking)}
                                accessibilityRole="button"
                                accessibilityLabel={`View booking at ${booking.court_name}`}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 5,
                                    borderRadius: 22,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.card,
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                }}
                            >
                                <Ionicons name="eye-outline" size={13} color={colors.foreground} />
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "600",
                                        color: colors.foreground,
                                    }}
                                >
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

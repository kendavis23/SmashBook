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
        bg: "#F1F5F9",
        text: "#475569",
        dot: "#94A3B8",
    };
    const paymentCfg = PAYMENT_CONFIG[booking.payment_status] ?? {
        label: booking.payment_status,
        bg: "#F1F5F9",
        text: "#475569",
    };
    const inviteCfg = INVITE_CONFIG[booking.invite_status] ?? null;

    const isOrganiser = booking.role === "organiser";
    const showPay =
        showActions && booking.payment_status === "pending" && booking.invite_status === "accepted";

    return (
        <View
            style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                overflow: "hidden",
                shadowColor: "#1E3A8A",
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
                                backgroundColor: isOrganiser ? "#EFF6FF" : "#F1F5F9",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Ionicons
                                name="tennisball"
                                size={17}
                                color={isOrganiser ? "#2563EB" : "#94A3B8"}
                            />
                        </View>
                        <Text
                            style={{
                                flex: 1,
                                fontSize: 16,
                                fontWeight: "700",
                                color: "#0F172A",
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
                <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />

                {/* Row 2: Date + Time */}
                <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                        <Text
                            style={{ fontSize: 12, fontWeight: "500", color: "#64748B" }}
                            numberOfLines={1}
                        >
                            {formatBookingDate(booking.start_datetime)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="time-outline" size={13} color="#94A3B8" />
                        <Text style={{ fontSize: 12, fontWeight: "500", color: "#64748B" }}>
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
                            borderColor: "#E2E8F0",
                            backgroundColor: "#F8FAFC",
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                        }}
                    >
                        <Ionicons name="layers-outline" size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, fontWeight: "500", color: "#64748B" }}>
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
                            borderColor: isOrganiser ? "#BFDBFE" : "#E2E8F0",
                            backgroundColor: isOrganiser ? "#EFF6FF" : "#F8FAFC",
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                        }}
                    >
                        <Ionicons
                            name={isOrganiser ? "star-outline" : "person-outline"}
                            size={11}
                            color={isOrganiser ? "#2563EB" : "#94A3B8"}
                        />
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: isOrganiser ? "#2563EB" : "#64748B",
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
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F8FAFC",
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
                                color: "#0F172A",
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
                                        backgroundColor: "#2563EB",
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                    }}
                                >
                                    <Ionicons name="card-outline" size={13} color="#FFFFFF" />
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "600",
                                            color: "#FFFFFF",
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
                                    borderColor: "#E2E8F0",
                                    backgroundColor: "#FFFFFF",
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                }}
                            >
                                <Ionicons name="eye-outline" size={13} color="#475569" />
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "600",
                                        color: "#475569",
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

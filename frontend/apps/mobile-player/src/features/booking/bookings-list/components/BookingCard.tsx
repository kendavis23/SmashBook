import { type JSX, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Booking, PlayerBookingItem, InviteStatus } from "../../types";
import {
    formatBookingDate,
    formatBookingTimeRange,
    formatAmount,
    formatBookingType,
} from "../../utils/bookingFormatters";
import { getStatusConfig, getInviteConfig } from "../../constants/bookingConstants";
import { useRespondInvite } from "../../hooks";
import { useThemeColors } from "../../../../theme";

type Props = {
    booking: PlayerBookingItem;
    showActions: boolean;
    onManageClick: (item: PlayerBookingItem) => void;
    onPayClick: (item: PlayerBookingItem) => void;
    onInviteClick: (item: PlayerBookingItem) => void;
    onInviteResponded: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">,
        updated: Booking
    ) => void;
};

export function BookingCard({
    booking,
    showActions,
    onManageClick,
    onPayClick,
    onInviteClick,
    onInviteResponded,
}: Props): JSX.Element {
    const colors = useThemeColors();
    const [respondBusy, setRespondBusy] = useState<"accepted" | "declined" | null>(null);
    const respondMutation = useRespondInvite(booking.club_id, booking.booking_id);

    async function handleRespond(action: "accepted" | "declined"): Promise<void> {
        setRespondBusy(action);
        try {
            const updated = await respondMutation.mutateAsync({ action });
            onInviteResponded(booking, action, updated);
        } finally {
            setRespondBusy(null);
        }
    }
    const statusCfg = getStatusConfig(colors)[booking.status] ?? {
        label: booking.status,
        bg: colors.muted,
        text: colors.mutedForeground,
        dot: colors.mutedForeground,
    };
    const inviteCfg = getInviteConfig(colors)[booking.invite_status] ?? null;

    const isOrganiser = booking.role === "organiser";
    const isPendingInvite = !isOrganiser && booking.invite_status === "pending";
    const isDeclinedInvite = !isOrganiser && booking.invite_status === "declined";
    const showPay = booking.payment_status !== "paid";
    const showInvite = isOrganiser && booking.status === "pending";

    return (
        <View
            style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: colors.ctaBorder,
                overflow: "hidden",
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
            }}
            accessibilityRole="none"
        >
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
                {/* Row 1: Court icon + name/club + status badge */}
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
                            gap: 11,
                            minWidth: 0,
                        }}
                    >
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: colors.foreground,
                                    letterSpacing: -0.3,
                                }}
                                numberOfLines={1}
                            >
                                {booking.court_name}
                            </Text>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                    marginTop: 2,
                                }}
                            >
                                <Ionicons
                                    name="business-outline"
                                    size={11}
                                    color={colors.mutedForeground}
                                />
                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        fontWeight: "500",
                                        color: colors.mutedForeground,
                                        letterSpacing: -0.1,
                                    }}
                                    numberOfLines={1}
                                >
                                    {booking.club_name}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: statusCfg.bg,
                            borderRadius: 8,
                            paddingHorizontal: 9,
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
                            borderRadius: 8,
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
                            borderRadius: 8,
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
                                borderRadius: 8,
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
                        <Text
                            style={{
                                fontSize: 17,
                                fontWeight: "700",
                                color: colors.foreground,
                                letterSpacing: -0.4,
                            }}
                        >
                            {isDeclinedInvite ? "—" : formatAmount(booking.amount_due)}
                        </Text>
                    </View>

                    {showActions ? (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                flexWrap: "wrap",
                                gap: 6,
                            }}
                        >
                            {isDeclinedInvite ? (
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontStyle: "italic",
                                        color: colors.mutedForeground,
                                    }}
                                >
                                    Invitation no longer available
                                </Text>
                            ) : isPendingInvite ? (
                                <>
                                    <Pressable
                                        onPress={() => void handleRespond("accepted")}
                                        disabled={respondBusy !== null}
                                        accessibilityRole="button"
                                        accessibilityLabel="Accept invitation"
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 5,
                                            borderRadius: 10,
                                            backgroundColor: colors.success,
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            opacity: respondBusy !== null ? 0.5 : 1,
                                        }}
                                    >
                                        {respondBusy === "accepted" ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={colors.successForeground}
                                            />
                                        ) : (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={13}
                                                color={colors.successForeground}
                                            />
                                        )}
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: colors.successForeground,
                                            }}
                                        >
                                            Accept
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => void handleRespond("declined")}
                                        disabled={respondBusy !== null}
                                        accessibilityRole="button"
                                        accessibilityLabel="Decline invitation"
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 5,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: colors.card,
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            opacity: respondBusy !== null ? 0.5 : 1,
                                        }}
                                    >
                                        {respondBusy === "declined" ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={colors.mutedForeground}
                                            />
                                        ) : (
                                            <Ionicons
                                                name="close"
                                                size={13}
                                                color={colors.foreground}
                                            />
                                        )}
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: colors.foreground,
                                            }}
                                        >
                                            Decline
                                        </Text>
                                    </Pressable>
                                </>
                            ) : showPay ? (
                                <Pressable
                                    onPress={() => onPayClick(booking)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Pay for booking"
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        borderRadius: 10,
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
                            ) : (
                                <>
                                    {showInvite ? (
                                        <Pressable
                                            onPress={() => onInviteClick(booking)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Invite player"
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 5,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                backgroundColor: colors.card,
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                            }}
                                        >
                                            <Ionicons
                                                name="person-add-outline"
                                                size={13}
                                                color={colors.foreground}
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: "600",
                                                    color: colors.foreground,
                                                }}
                                            >
                                                Invite
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
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: colors.card,
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                        }}
                                    >
                                        <Ionicons
                                            name="eye-outline"
                                            size={13}
                                            color={colors.foreground}
                                        />
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
                                </>
                            )}
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

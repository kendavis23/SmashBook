import { type JSX, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useGetBooking, useRespondInvite } from "../../hooks";
import { useMyProfile } from "@repo/player-domain";
import type {
    Booking,
    InviteStatus,
    PaymentStatus,
    PlayerBookingItem,
    PlayerRole,
} from "../../types";
import {
    formatBookingDate,
    formatBookingTimeRange,
    formatAmount,
    formatBookingType,
    getInitials,
} from "../../utils/bookingFormatters";
import { getStatusConfig } from "../../constants/bookingConstants";
import { useThemeColors, palette } from "../../../../theme";

type SelectedBooking = { bookingId: string; clubId: string };

type MyInfo = {
    role: PlayerRole;
    inviteStatus: InviteStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
};

function InfoTile({
    icon,
    label,
    value,
    iconBg,
    iconColor,
}: {
    icon: string;
    label: string;
    value: string;
    iconBg: string;
    iconColor: string;
}): JSX.Element {
    return (
        <View className="flex-1 flex-row items-center gap-3 rounded-[16px] border border-border bg-muted px-3 py-3">
            <View
                style={{ backgroundColor: iconBg }}
                className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
            >
                <Ionicons name={icon as never} size={16} color={iconColor} />
            </View>
            <View className="min-w-0 flex-1">
                <Text className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                </Text>
                <Text
                    className="mt-0.5 text-[13px] font-semibold text-foreground"
                    numberOfLines={1}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

function PlayerRow({
    name,
    role,
    inviteStatus,
    paymentStatus,
    isMe,
}: {
    name: string;
    role: string;
    inviteStatus: string;
    paymentStatus: string;
    isMe: boolean;
}): JSX.Element {
    const colors = useThemeColors();
    const initials = getInitials(name);
    const isAccepted = inviteStatus === "accepted";
    const isPaid = paymentStatus === "paid";

    const avatarBg = isMe ? colors.ctaSurface : isAccepted ? colors.successSurface : colors.muted;
    const avatarText = isMe ? colors.cta : isAccepted ? colors.success : colors.mutedForeground;

    const inviteBg = isAccepted
        ? colors.successSurface
        : inviteStatus === "pending"
          ? colors.warningSurface
          : colors.muted;
    const inviteColor = isAccepted
        ? colors.success
        : inviteStatus === "pending"
          ? colors.warning
          : colors.mutedForeground;
    const inviteLabel = isAccepted
        ? "Accepted"
        : inviteStatus === "pending"
          ? "Pending"
          : inviteStatus;

    const payBg = isPaid
        ? colors.successSurface
        : paymentStatus === "pending"
          ? colors.warningSurface
          : colors.muted;
    const payColor = isPaid
        ? colors.success
        : paymentStatus === "pending"
          ? colors.warning
          : colors.mutedForeground;

    return (
        <View
            style={{ backgroundColor: isMe ? colors.ctaSurface : colors.card }}
            className="flex-row items-center gap-3 rounded-[16px] border border-border px-3 py-3"
        >
            {/* Left accent */}
            {isMe ? (
                <View className="absolute bottom-0 left-0 top-0 w-0.5 rounded-r bg-cta" />
            ) : null}

            {/* Avatar */}
            <View
                style={{ backgroundColor: avatarBg }}
                className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
            >
                <Text style={{ color: avatarText }} className="text-[12px] font-bold">
                    {initials}
                </Text>
            </View>

            {/* Name + role */}
            <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-semibold text-foreground" numberOfLines={1}>
                    {name}
                    {isMe ? " (You)" : ""}
                </Text>
                <Text className="mt-0.5 text-[11px] capitalize text-muted-foreground">{role}</Text>
            </View>

            {/* Badges */}
            <View className="flex-row gap-1.5">
                <View style={{ backgroundColor: inviteBg }} className="rounded-full px-2 py-1">
                    <Text style={{ color: inviteColor }} className="text-[10px] font-semibold">
                        {inviteLabel}
                    </Text>
                </View>
                {isAccepted ? (
                    <View style={{ backgroundColor: payBg }} className="rounded-full px-2 py-1">
                        <Text style={{ color: payColor }} className="text-[10px] font-semibold">
                            {isPaid ? "Paid" : "Unpaid"}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

type Props = {
    selected: SelectedBooking | null;
    onClose: () => void;
    onPayClick: (item: PlayerBookingItem) => void;
};

export function BookingDetailSheet({ selected, onClose, onPayClick }: Props): JSX.Element {
    const colors = useThemeColors();
    const [respondBusy, setRespondBusy] = useState<"accepted" | "declined" | null>(null);

    const {
        data: booking,
        isLoading,
        error,
        refetch,
    } = useGetBooking(selected?.bookingId ?? "", selected?.clubId ?? "");

    const { data: profile } = useMyProfile();

    const respondMutation = useRespondInvite(selected?.clubId ?? "", selected?.bookingId ?? "");

    const myInfo: MyInfo | undefined = useMemo(() => {
        if (!booking || !profile) return undefined;
        const me = (booking as Booking).players.find((p) => p.user_id === profile.id);
        if (!me) return undefined;
        return {
            role: me.role,
            inviteStatus: me.invite_status,
            paymentStatus: me.payment_status,
            amountDue: me.amount_due,
        };
    }, [booking, profile]);

    const handleRespond = async (action: "accepted" | "declined") => {
        setRespondBusy(action);
        try {
            await respondMutation.mutateAsync({ action });
            void refetch();
        } finally {
            setRespondBusy(null);
        }
    };

    const payableBooking: PlayerBookingItem | null =
        booking &&
        myInfo &&
        myInfo.inviteStatus === "accepted" &&
        myInfo.paymentStatus === "pending"
            ? {
                  booking_id: (booking as Booking).id,
                  club_id: (booking as Booking).club_id,
                  court_id: (booking as Booking).court_id,
                  court_name: (booking as Booking).court_name,
                  booking_type: (booking as Booking).booking_type,
                  status: (booking as Booking).status,
                  start_datetime: (booking as Booking).start_datetime,
                  end_datetime: (booking as Booking).end_datetime,
                  role: myInfo.role,
                  invite_status: myInfo.inviteStatus,
                  payment_status: myInfo.paymentStatus,
                  amount_due: myInfo.amountDue,
              }
            : null;

    const typedBooking = booking as Booking | undefined;
    const statusCfg = typedBooking
        ? (getStatusConfig(colors)[typedBooking.status] ?? {
              dot: colors.mutedForeground,
              text: colors.mutedForeground,
              bg: colors.muted,
              label: typedBooking.status,
          })
        : null;

    return (
        <Modal
            visible={selected !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="flex-row items-center justify-between bg-card px-5 pb-4 pt-5 shadow-sm">
                    <View className="min-w-0 flex-1">
                        <Text className="text-[18px] font-bold text-foreground" numberOfLines={1}>
                            {typedBooking?.court_name ?? "Booking Details"}
                        </Text>
                        {statusCfg ? (
                            <View
                                style={{ backgroundColor: statusCfg.bg }}
                                className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
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
                        ) : null}
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={() => void refetch()}
                            accessibilityRole="button"
                            accessibilityLabel="Refresh booking"
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75"
                        >
                            <Ionicons name="refresh-outline" size={18} color={colors.foreground} />
                        </Pressable>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close booking details"
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75"
                        >
                            <Ionicons name="close" size={20} color={colors.foreground} />
                        </Pressable>
                    </View>
                </View>

                {/* Body */}
                {isLoading ? (
                    <View className="flex-1 items-center justify-center gap-3">
                        <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-card shadow-sm">
                            <ActivityIndicator size="small" color={colors.cta} />
                        </View>
                        <Text className="text-[14px] font-medium text-muted-foreground">
                            Loading booking…
                        </Text>
                    </View>
                ) : error || !typedBooking ? (
                    <View className="flex-1 items-center justify-center gap-4 px-8">
                        <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-destructive/10">
                            <Ionicons
                                name="alert-circle-outline"
                                size={30}
                                color={colors.destructive}
                            />
                        </View>
                        <Text className="text-center text-[16px] font-bold text-foreground">
                            Failed to load booking
                        </Text>
                        <Text className="text-center text-[13px] text-muted-foreground">
                            {error instanceof Error ? error.message : "Booking not found."}
                        </Text>
                        <Pressable
                            onPress={() => void refetch()}
                            accessibilityRole="button"
                            accessibilityLabel="Retry"
                            className="mt-2 flex-row items-center gap-2 rounded-[14px] bg-cta px-6 py-3.5 active:opacity-75"
                        >
                            <Ionicons
                                name="refresh-outline"
                                size={16}
                                color={colors.ctaForeground}
                            />
                            <Text className="text-[14px] font-semibold text-cta-foreground">
                                Retry
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerClassName="pb-[40px] gap-4 pt-4 px-5"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Match info tiles */}
                        <View className="gap-2">
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Match Information
                            </Text>
                            <View className="flex-row gap-2">
                                <InfoTile
                                    icon="location-outline"
                                    label="Court"
                                    value={typedBooking.court_name}
                                    iconBg={colors.ctaSurface}
                                    iconColor={colors.cta}
                                />
                                <InfoTile
                                    icon="calendar-outline"
                                    label="Date"
                                    value={formatBookingDate(typedBooking.start_datetime)}
                                    iconBg={colors.ctaSurface}
                                    iconColor={colors.cta}
                                />
                            </View>
                            <View className="flex-row gap-2">
                                <InfoTile
                                    icon="time-outline"
                                    label="Time"
                                    value={formatBookingTimeRange(
                                        typedBooking.start_datetime,
                                        typedBooking.end_datetime
                                    )}
                                    iconBg={colors.warningSurface}
                                    iconColor={colors.warning}
                                />
                                <InfoTile
                                    icon="layers-outline"
                                    label="Type"
                                    value={formatBookingType(typedBooking.booking_type)}
                                    iconBg={colors.ctaSurface}
                                    iconColor={colors.cta}
                                />
                            </View>
                            <View className="flex-row gap-2">
                                <InfoTile
                                    icon="people-outline"
                                    label="Players"
                                    value={
                                        typedBooking.max_players != null
                                            ? `${typedBooking.max_players - typedBooking.slots_available} / ${typedBooking.max_players}`
                                            : String(typedBooking.players.length)
                                    }
                                    iconBg={colors.muted}
                                    iconColor={colors.mutedForeground}
                                />
                                <InfoTile
                                    icon="cash-outline"
                                    label="Total"
                                    value={formatAmount(typedBooking.total_price)}
                                    iconBg={colors.successSurface}
                                    iconColor={colors.success}
                                />
                            </View>
                        </View>

                        {/* Payment info for accepted player */}
                        {myInfo && myInfo.inviteStatus === "accepted" ? (
                            <View className="gap-2">
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Your Payment
                                </Text>
                                <View className="overflow-hidden rounded-[20px] bg-card shadow-sm">
                                    {payableBooking ? (
                                        <Pressable
                                            onPress={() => {
                                                onPayClick(payableBooking);
                                                onClose();
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Pay now"
                                            className="flex-row items-center justify-between bg-cta px-5 py-4 active:opacity-90"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-white/20">
                                                    <Ionicons
                                                        name="card-outline"
                                                        size={20}
                                                        color={colors.ctaForeground}
                                                    />
                                                </View>
                                                <View>
                                                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-cta-foreground/70">
                                                        Amount Due
                                                    </Text>
                                                    <Text className="mt-0.5 text-[20px] font-bold text-cta-foreground">
                                                        {formatAmount(myInfo.amountDue)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center gap-2 rounded-[12px] bg-white/20 px-4 py-2.5">
                                                <Text className="text-[13px] font-bold text-cta-foreground">
                                                    Pay Now
                                                </Text>
                                                <Ionicons
                                                    name="arrow-forward"
                                                    size={14}
                                                    color={colors.ctaForeground}
                                                />
                                            </View>
                                        </Pressable>
                                    ) : (
                                        <View
                                            style={{ backgroundColor: colors.successSurface }}
                                            className="flex-row items-center justify-between px-5 py-4"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View
                                                    style={{ backgroundColor: palette.green200 }}
                                                    className="h-10 w-10 items-center justify-center rounded-[12px]"
                                                >
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={20}
                                                        color={colors.success}
                                                    />
                                                </View>
                                                <View>
                                                    <Text
                                                        style={{ color: colors.success }}
                                                        className="text-[11px] font-semibold uppercase tracking-wider opacity-70"
                                                    >
                                                        Amount Paid
                                                    </Text>
                                                    <Text
                                                        style={{ color: colors.success }}
                                                        className="mt-0.5 text-[20px] font-bold"
                                                    >
                                                        {formatAmount(myInfo.amountDue)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View
                                                style={{ backgroundColor: colors.success }}
                                                className="rounded-[12px] px-4 py-2.5"
                                            >
                                                <Text
                                                    style={{ color: colors.successForeground }}
                                                    className="text-[13px] font-bold"
                                                >
                                                    Paid ✓
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ) : null}

                        {/* Pending invite CTA for player */}
                        {myInfo?.role === "player" && myInfo.inviteStatus === "pending" ? (
                            <View className="gap-2">
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Invitation
                                </Text>
                                <View
                                    style={{
                                        borderColor: palette.amber200,
                                        backgroundColor: colors.warningSurface,
                                    }}
                                    className="overflow-hidden rounded-[20px] border px-5 py-4"
                                >
                                    <View className="mb-3 flex-row items-center gap-3">
                                        <View
                                            style={{ backgroundColor: palette.amber100 }}
                                            className="h-10 w-10 items-center justify-center rounded-[12px]"
                                        >
                                            <Ionicons
                                                name="mail-outline"
                                                size={20}
                                                color={colors.warning}
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-[14px] font-bold text-foreground">
                                                You&apos;ve been invited
                                            </Text>
                                            <Text className="text-[12px] text-muted-foreground">
                                                Accept to confirm your spot
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="flex-row gap-3">
                                        <Pressable
                                            onPress={() => void handleRespond("accepted")}
                                            disabled={respondBusy !== null}
                                            accessibilityRole="button"
                                            accessibilityLabel="Accept invitation"
                                            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-cta py-3.5 active:opacity-75 disabled:opacity-50"
                                        >
                                            {respondBusy === "accepted" ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={colors.ctaForeground}
                                                />
                                            ) : (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={16}
                                                    color={colors.ctaForeground}
                                                />
                                            )}
                                            <Text className="text-[13px] font-bold text-cta-foreground">
                                                Accept
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => void handleRespond("declined")}
                                            disabled={respondBusy !== null}
                                            accessibilityRole="button"
                                            accessibilityLabel="Decline invitation"
                                            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border border-border bg-card py-3.5 active:opacity-75 disabled:opacity-50"
                                        >
                                            {respondBusy === "declined" ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={colors.mutedForeground}
                                                />
                                            ) : (
                                                <Ionicons
                                                    name="close"
                                                    size={16}
                                                    color={colors.mutedForeground}
                                                />
                                            )}
                                            <Text className="text-[13px] font-semibold text-muted-foreground">
                                                Decline
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        {/* Players list */}
                        {typedBooking.players.length > 0 ? (
                            <View className="gap-2">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Players
                                    </Text>
                                    <View className="rounded-full bg-muted px-2.5 py-1">
                                        <Text className="text-[11px] font-semibold text-muted-foreground">
                                            {typedBooking.players.length}
                                        </Text>
                                    </View>
                                </View>
                                <View className="gap-2">
                                    {typedBooking.players
                                        .slice()
                                        .sort((a, b) => {
                                            const rankA =
                                                a.user_id === profile?.id
                                                    ? 0
                                                    : a.role === "organiser"
                                                      ? 1
                                                      : a.invite_status === "accepted"
                                                        ? 2
                                                        : 3;
                                            const rankB =
                                                b.user_id === profile?.id
                                                    ? 0
                                                    : b.role === "organiser"
                                                      ? 1
                                                      : b.invite_status === "accepted"
                                                        ? 2
                                                        : 3;
                                            return rankA - rankB;
                                        })
                                        .map((p) => (
                                            <PlayerRow
                                                key={p.id}
                                                name={p.full_name}
                                                role={p.role}
                                                inviteStatus={p.invite_status}
                                                paymentStatus={p.payment_status}
                                                isMe={p.user_id === profile?.id}
                                            />
                                        ))}
                                </View>
                            </View>
                        ) : null}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

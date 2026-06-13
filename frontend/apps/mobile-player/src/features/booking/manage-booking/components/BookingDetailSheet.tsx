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
import { useThemeColors } from "../../../../theme";

type SelectedBooking = { bookingId: string; clubId: string };

type MyInfo = {
    role: PlayerRole;
    inviteStatus: InviteStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
};

function SummaryRow({
    icon,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    value: string;
}): JSX.Element {
    const colors = useThemeColors();

    return (
        <View className="flex-row items-center gap-2.5">
            <Ionicons name={icon} size={16} color={colors.mutedForeground} />
            <Text className="flex-1 text-[14px] font-medium text-foreground" numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

function SummaryMetric({
    icon,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    value: string;
}): JSX.Element {
    const colors = useThemeColors();

    return (
        <View className="flex-1 flex-row items-center justify-center gap-2">
            <Ionicons name={icon} size={16} color={colors.mutedForeground} />
            <Text className="text-[13px] font-semibold text-foreground">{value}</Text>
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

    const payColor = isPaid
        ? colors.success
        : paymentStatus === "pending"
          ? colors.warning
          : colors.mutedForeground;

    return (
        <View className="flex-row items-center gap-3 rounded-[16px] bg-card px-3 py-3">
            <View
                style={{ backgroundColor: avatarBg }}
                className="h-10 w-10 shrink-0 items-center justify-center rounded-full"
            >
                <Text style={{ color: avatarText }} className="text-[12px] font-bold">
                    {initials}
                </Text>
            </View>

            <View className="min-w-0 flex-1">
                <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                    {name}
                    {isMe ? " (You)" : ""}
                </Text>
                <Text className="mt-0.5 text-[12px] capitalize text-muted-foreground">{role}</Text>
            </View>

            <View className="items-end gap-1.5">
                <Text style={{ color: inviteColor }} className="text-[11px] font-semibold">
                    {inviteLabel}
                </Text>
                {isAccepted ? (
                    <Text style={{ color: payColor }} className="text-[10px] font-semibold">
                        {isPaid ? "Paid" : "Payment due"}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

type Props = {
    selected: SelectedBooking | null;
    onClose: () => void;
    onPayClick: (item: PlayerBookingItem) => void;
    onInviteClick: (item: PlayerBookingItem) => void;
};

export function BookingDetailSheet({
    selected,
    onClose,
    onPayClick,
    onInviteClick,
}: Props): JSX.Element {
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
                  club_name: (booking as Booking).club_name ?? "",
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
                <View className="flex-row items-center justify-between bg-card px-5 pb-4 pt-5 shadow-sm">
                    <View className="min-w-0 flex-1 flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-secondary">
                            <Ionicons name="calendar-outline" size={20} color={colors.cta} />
                        </View>
                        <View className="min-w-0 flex-1">
                            <Text className="text-[18px] font-bold text-foreground">
                                Manage Booking
                            </Text>
                            <View className="mt-0.5 flex-row items-center gap-2">
                                <Text
                                    className="shrink text-[12px] text-muted-foreground"
                                    numberOfLines={1}
                                >
                                    {typedBooking?.court_name ?? "Booking details"}
                                </Text>
                                {statusCfg ? (
                                    <View
                                        style={{ backgroundColor: statusCfg.bg }}
                                        className="flex-row items-center gap-1.5 rounded-full px-2 py-0.5"
                                    >
                                        <View
                                            style={{ backgroundColor: statusCfg.dot }}
                                            className="h-1.5 w-1.5 rounded-full"
                                        />
                                        <Text
                                            style={{ color: statusCfg.text }}
                                            className="text-[10px] font-semibold"
                                        >
                                            {statusCfg.label}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>
                    <View className="ml-3 flex-row gap-2">
                        <Pressable
                            onPress={() => void refetch()}
                            accessibilityRole="button"
                            accessibilityLabel="Refresh booking"
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75"
                        >
                            <Ionicons
                                name="refresh-outline"
                                size={18}
                                color={colors.mutedForeground}
                            />
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
                        contentContainerClassName="gap-6 px-5 pb-10 pt-5"
                        showsVerticalScrollIndicator={false}
                    >
                        <View
                            style={{
                                shadowColor: colors.shadow,
                                shadowOffset: { width: 0, height: 5 },
                                shadowOpacity: 0.06,
                                shadowRadius: 14,
                                elevation: 2,
                            }}
                            className="gap-4 rounded-[20px] bg-card px-4 py-4"
                        >
                            <Text className="text-[16px] font-bold text-foreground">
                                Booking Summary
                            </Text>
                            <View className="flex-row gap-4">
                                <View className="h-[88px] w-[88px] items-center justify-center rounded-[16px] border border-border bg-muted">
                                    <Ionicons
                                        name="tennisball-outline"
                                        size={28}
                                        color={colors.mutedForeground}
                                    />
                                </View>
                                <View className="min-w-0 flex-1 gap-2">
                                    <Text
                                        className="text-[18px] font-bold text-foreground"
                                        numberOfLines={1}
                                    >
                                        {typedBooking.court_name}
                                    </Text>
                                    <SummaryRow
                                        icon="calendar-outline"
                                        value={formatBookingDate(typedBooking.start_datetime)}
                                    />
                                    <SummaryRow
                                        icon="time-outline"
                                        value={formatBookingTimeRange(
                                            typedBooking.start_datetime,
                                            typedBooking.end_datetime
                                        )}
                                    />
                                    <SummaryRow
                                        icon="pricetag-outline"
                                        value={formatAmount(typedBooking.total_price)}
                                    />
                                </View>
                            </View>
                            <View className="flex-row rounded-[14px] border border-border bg-background py-3">
                                <SummaryMetric
                                    icon="layers-outline"
                                    value={formatBookingType(typedBooking.booking_type)}
                                />
                                <View className="w-px bg-border" />
                                <SummaryMetric
                                    icon="people-outline"
                                    value={
                                        typedBooking.max_players != null
                                            ? `${typedBooking.max_players - typedBooking.slots_available} / ${typedBooking.max_players}`
                                            : String(typedBooking.players.length)
                                    }
                                />
                            </View>
                        </View>

                        {/* Payment info for accepted player */}
                        {myInfo && myInfo.inviteStatus === "accepted" ? (
                            <View className="gap-3">
                                <Text className="text-[15px] font-bold text-foreground">
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
                                            className="flex-row items-center justify-between bg-cta px-4 py-4 active:opacity-90"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View className="h-11 w-11 items-center justify-center rounded-full bg-cta-foreground">
                                                    <Ionicons
                                                        name="card-outline"
                                                        size={20}
                                                        color={colors.cta}
                                                    />
                                                </View>
                                                <View>
                                                    <Text className="text-[11px] font-medium text-cta-foreground/70">
                                                        Amount Due
                                                    </Text>
                                                    <Text className="mt-0.5 text-[21px] font-bold text-cta-foreground">
                                                        {formatAmount(myInfo.amountDue)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center gap-1.5 rounded-full bg-cta-foreground px-4 py-2.5">
                                                <Text
                                                    style={{ color: colors.cta }}
                                                    className="text-[13px] font-bold"
                                                >
                                                    Pay Now
                                                </Text>
                                                <Ionicons
                                                    name="arrow-forward"
                                                    size={14}
                                                    color={colors.cta}
                                                />
                                            </View>
                                        </Pressable>
                                    ) : (
                                        <View
                                            style={{ backgroundColor: colors.successSurface }}
                                            className="flex-row items-center justify-between px-4 py-4"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View
                                                    style={{ backgroundColor: colors.card }}
                                                    className="h-11 w-11 items-center justify-center rounded-full"
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
                                                        className="text-[11px] font-medium opacity-70"
                                                    >
                                                        Amount Paid
                                                    </Text>
                                                    <Text
                                                        style={{ color: colors.success }}
                                                        className="mt-0.5 text-[21px] font-bold"
                                                    >
                                                        {formatAmount(myInfo.amountDue)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View
                                                style={{ backgroundColor: colors.success }}
                                                className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
                                            >
                                                <Ionicons
                                                    name="checkmark"
                                                    size={14}
                                                    color={colors.successForeground}
                                                />
                                                <Text
                                                    style={{ color: colors.successForeground }}
                                                    className="text-[13px] font-bold"
                                                >
                                                    Paid
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ) : null}

                        {/* Invite player CTA for organiser on a pending booking */}
                        {myInfo?.role === "organiser" && typedBooking.status === "pending" ? (
                            <View className="gap-3">
                                <Text className="text-[15px] font-bold text-foreground">
                                    Manage Players
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        onInviteClick({
                                            booking_id: typedBooking.id,
                                            club_id: typedBooking.club_id,
                                            club_name: typedBooking.club_name ?? "",
                                            court_id: typedBooking.court_id,
                                            court_name: typedBooking.court_name,
                                            booking_type: typedBooking.booking_type,
                                            status: typedBooking.status,
                                            start_datetime: typedBooking.start_datetime,
                                            end_datetime: typedBooking.end_datetime,
                                            role: myInfo.role,
                                            invite_status: myInfo.inviteStatus,
                                            payment_status: myInfo.paymentStatus,
                                            amount_due: myInfo.amountDue,
                                        });
                                        onClose();
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Invite a player"
                                    className="flex-row items-center justify-between rounded-[20px] bg-card px-4 py-4 shadow-sm active:opacity-75"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View
                                            style={{ backgroundColor: colors.ctaSurface }}
                                            className="h-11 w-11 items-center justify-center rounded-full"
                                        >
                                            <Ionicons
                                                name="person-add-outline"
                                                size={20}
                                                color={colors.cta}
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-[15px] font-semibold text-foreground">
                                                Invite a player
                                            </Text>
                                            <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                                Add someone to this booking
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color={colors.mutedForeground}
                                    />
                                </Pressable>
                            </View>
                        ) : null}

                        {/* Pending invite CTA for player */}
                        {myInfo?.role === "player" && myInfo.inviteStatus === "pending" ? (
                            <View className="gap-3">
                                <Text className="text-[15px] font-bold text-foreground">
                                    Invitation
                                </Text>
                                <View
                                    style={{
                                        borderColor: colors.warning,
                                        backgroundColor: colors.warningSurface,
                                    }}
                                    className="overflow-hidden rounded-[20px] border px-4 py-4"
                                >
                                    <View className="mb-3 flex-row items-center gap-3">
                                        <View
                                            style={{ backgroundColor: colors.card }}
                                            className="h-11 w-11 items-center justify-center rounded-full"
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
                            <View className="gap-3">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[15px] font-bold text-foreground">
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

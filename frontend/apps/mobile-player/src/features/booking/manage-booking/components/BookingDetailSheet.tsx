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
import { STATUS_CONFIG } from "../../constants/bookingConstants";

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
        <View className="flex-1 flex-row items-center gap-3 rounded-[16px] border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-3">
            <View
                style={{ backgroundColor: iconBg }}
                className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
            >
                <Ionicons name={icon as never} size={16} color={iconColor} />
            </View>
            <View className="min-w-0 flex-1">
                <Text className="text-[9px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    {label}
                </Text>
                <Text className="mt-0.5 text-[13px] font-semibold text-[#111827]" numberOfLines={1}>
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
    const initials = getInitials(name);
    const isAccepted = inviteStatus === "accepted";
    const isPaid = paymentStatus === "paid";

    const avatarBg = isMe ? "#EFF6FF" : isAccepted ? "#DCFCE7" : "#F3F4F6";
    const avatarText = isMe ? "#2563EB" : isAccepted ? "#15803D" : "#9CA3AF";

    const inviteBg = isAccepted ? "#DCFCE7" : inviteStatus === "pending" ? "#FEF9C3" : "#F3F4F6";
    const inviteColor = isAccepted ? "#15803D" : inviteStatus === "pending" ? "#A16207" : "#9CA3AF";
    const inviteLabel = isAccepted
        ? "Accepted"
        : inviteStatus === "pending"
          ? "Pending"
          : inviteStatus;

    const payBg = isPaid ? "#DCFCE7" : paymentStatus === "pending" ? "#FEF9C3" : "#F3F4F6";
    const payColor = isPaid ? "#15803D" : paymentStatus === "pending" ? "#A16207" : "#9CA3AF";

    return (
        <View
            style={{ backgroundColor: isMe ? "#EFF6FF" : "#FFFFFF" }}
            className="flex-row items-center gap-3 rounded-[16px] border border-[#F3F4F6] px-3 py-3"
        >
            {/* Left accent */}
            {isMe ? (
                <View className="absolute bottom-0 left-0 top-0 w-0.5 rounded-r bg-[#2563EB]" />
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
                <Text className="text-[13px] font-semibold text-[#111827]" numberOfLines={1}>
                    {name}
                    {isMe ? " (You)" : ""}
                </Text>
                <Text className="mt-0.5 text-[11px] capitalize text-[#9CA3AF]">{role}</Text>
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
        ? (STATUS_CONFIG[typedBooking.status] ?? {
              dot: "#9CA3AF",
              text: "#374151",
              bg: "#F3F4F6",
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
            <View className="flex-1 bg-[#F2F3F7]">
                {/* Header */}
                <View className="flex-row items-center justify-between bg-white px-5 pb-4 pt-5 shadow-sm">
                    <View className="min-w-0 flex-1">
                        <Text className="text-[18px] font-bold text-[#111827]" numberOfLines={1}>
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
                            className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-75"
                        >
                            <Ionicons name="refresh-outline" size={18} color="#374151" />
                        </Pressable>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close booking details"
                            className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-75"
                        >
                            <Ionicons name="close" size={20} color="#374151" />
                        </Pressable>
                    </View>
                </View>

                {/* Body */}
                {isLoading ? (
                    <View className="flex-1 items-center justify-center gap-3">
                        <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-white shadow-sm">
                            <ActivityIndicator size="small" color="#2563EB" />
                        </View>
                        <Text className="text-[14px] font-medium text-[#9CA3AF]">
                            Loading booking…
                        </Text>
                    </View>
                ) : error || !typedBooking ? (
                    <View className="flex-1 items-center justify-center gap-4 px-8">
                        <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-red-50">
                            <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
                        </View>
                        <Text className="text-center text-[16px] font-bold text-[#111827]">
                            Failed to load booking
                        </Text>
                        <Text className="text-center text-[13px] text-[#9CA3AF]">
                            {error instanceof Error ? error.message : "Booking not found."}
                        </Text>
                        <Pressable
                            onPress={() => void refetch()}
                            accessibilityRole="button"
                            accessibilityLabel="Retry"
                            className="mt-2 flex-row items-center gap-2 rounded-[14px] bg-[#2563EB] px-6 py-3.5 active:opacity-75"
                        >
                            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                            <Text className="text-[14px] font-semibold text-white">Retry</Text>
                        </Pressable>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerClassName="pb-[40px] gap-4 pt-4 px-5"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Match info tiles */}
                        <View className="gap-2">
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                Match Information
                            </Text>
                            <View className="flex-row gap-2">
                                <InfoTile
                                    icon="location-outline"
                                    label="Court"
                                    value={typedBooking.court_name}
                                    iconBg="#EDE9FE"
                                    iconColor="#7C3AED"
                                />
                                <InfoTile
                                    icon="calendar-outline"
                                    label="Date"
                                    value={formatBookingDate(typedBooking.start_datetime)}
                                    iconBg="#DBEAFE"
                                    iconColor="#2563EB"
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
                                    iconBg="#FEF3C7"
                                    iconColor="#D97706"
                                />
                                <InfoTile
                                    icon="layers-outline"
                                    label="Type"
                                    value={formatBookingType(typedBooking.booking_type)}
                                    iconBg="#EFF6FF"
                                    iconColor="#2563EB"
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
                                    iconBg="#FCE7F3"
                                    iconColor="#DB2777"
                                />
                                <InfoTile
                                    icon="cash-outline"
                                    label="Total"
                                    value={formatAmount(typedBooking.total_price)}
                                    iconBg="#DCFCE7"
                                    iconColor="#15803D"
                                />
                            </View>
                        </View>

                        {/* Payment info for accepted player */}
                        {myInfo && myInfo.inviteStatus === "accepted" ? (
                            <View className="gap-2">
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                    Your Payment
                                </Text>
                                <View className="overflow-hidden rounded-[20px] bg-white shadow-sm">
                                    {payableBooking ? (
                                        <Pressable
                                            onPress={() => {
                                                onPayClick(payableBooking);
                                                onClose();
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Pay now"
                                            className="flex-row items-center justify-between bg-[#2563EB] px-5 py-4 active:opacity-90"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-white/20">
                                                    <Ionicons
                                                        name="card-outline"
                                                        size={20}
                                                        color="#FFFFFF"
                                                    />
                                                </View>
                                                <View>
                                                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                                                        Amount Due
                                                    </Text>
                                                    <Text className="mt-0.5 text-[20px] font-bold text-white">
                                                        {formatAmount(myInfo.amountDue)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center gap-2 rounded-[12px] bg-white/20 px-4 py-2.5">
                                                <Text className="text-[13px] font-bold text-white">
                                                    Pay Now
                                                </Text>
                                                <Ionicons
                                                    name="arrow-forward"
                                                    size={14}
                                                    color="#FFFFFF"
                                                />
                                            </View>
                                        </Pressable>
                                    ) : (
                                        <View className="flex-row items-center justify-between bg-[#DCFCE7] px-5 py-4">
                                            <View className="flex-row items-center gap-3">
                                                <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#BBF7D0]">
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={20}
                                                        color="#15803D"
                                                    />
                                                </View>
                                                <View>
                                                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D]/70">
                                                        Amount Paid
                                                    </Text>
                                                    <Text className="mt-0.5 text-[20px] font-bold text-[#15803D]">
                                                        {formatAmount(myInfo.amountDue)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="rounded-[12px] bg-[#15803D] px-4 py-2.5">
                                                <Text className="text-[13px] font-bold text-white">
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
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                    Invitation
                                </Text>
                                <View className="overflow-hidden rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-5 py-4">
                                    <View className="mb-3 flex-row items-center gap-3">
                                        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#FEF3C7]">
                                            <Ionicons
                                                name="mail-outline"
                                                size={20}
                                                color="#D97706"
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-[14px] font-bold text-[#111827]">
                                                You&apos;ve been invited
                                            </Text>
                                            <Text className="text-[12px] text-[#9CA3AF]">
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
                                            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-[#2563EB] py-3.5 active:opacity-75 disabled:opacity-50"
                                        >
                                            {respondBusy === "accepted" ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={16}
                                                    color="#FFFFFF"
                                                />
                                            )}
                                            <Text className="text-[13px] font-bold text-white">
                                                Accept
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => void handleRespond("declined")}
                                            disabled={respondBusy !== null}
                                            accessibilityRole="button"
                                            accessibilityLabel="Decline invitation"
                                            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white py-3.5 active:opacity-75 disabled:opacity-50"
                                        >
                                            {respondBusy === "declined" ? (
                                                <ActivityIndicator size="small" color="#6B7280" />
                                            ) : (
                                                <Ionicons name="close" size={16} color="#6B7280" />
                                            )}
                                            <Text className="text-[13px] font-semibold text-[#6B7280]">
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
                                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                        Players
                                    </Text>
                                    <View className="rounded-full bg-[#F3F4F6] px-2.5 py-1">
                                        <Text className="text-[11px] font-semibold text-[#6B7280]">
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

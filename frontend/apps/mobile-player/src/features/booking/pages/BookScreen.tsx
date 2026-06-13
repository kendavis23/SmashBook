import { type JSX, useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMyProfile } from "@repo/player-domain";
import { useMyBookings } from "../hooks";
import type { Booking, BookingTab, InviteStatus, PlayerBookingItem } from "../types";
import { BookingsListView } from "../bookings-list/pages/BookingsListView";
import { InvitePlayerSheet } from "../bookings-list/components/InvitePlayerSheet";
import { BookingDetailSheet } from "../manage-booking/components/BookingDetailSheet";
import { PaymentSheet, type PaymentContext } from "../../payment";
import { useThemeColors } from "../../../theme";

type SelectedBooking = { bookingId: string; clubId: string };

export function BookScreen(): JSX.Element {
    const colors = useThemeColors();
    const { data: profile } = useMyProfile();
    const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
    const [pastTabVisited, setPastTabVisited] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null);
    const [inviteBooking, setInviteBooking] = useState<PlayerBookingItem | null>(null);
    const [payingBooking, setPayingBooking] = useState<PlayerBookingItem | null>(null);

    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const threeMonthsAgo = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate())
    );
    const defaultFromIso = threeMonthsAgo.toISOString().slice(0, 10);
    const defaultToIso = todayUtc;

    const {
        data: upcomingData,
        isLoading: isUpcomingLoading,
        error: upcomingError,
        refetch: refetchUpcoming,
    } = useMyBookings(undefined);

    const {
        data: pastData,
        isLoading: isPastLoading,
        error: pastError,
        refetch: refetchPast,
    } = useMyBookings(
        { past_from: defaultFromIso, past_to: defaultToIso },
        { enabled: pastTabVisited }
    );

    const isLoading = activeTab === "upcoming" ? isUpcomingLoading : isPastLoading;
    const error = activeTab === "upcoming" ? upcomingError : pastError;

    const refreshCurrent = useCallback(() => {
        if (activeTab === "upcoming") void refetchUpcoming();
        else void refetchPast();
    }, [activeTab, refetchUpcoming, refetchPast]);

    const handleTabChange = useCallback((tab: BookingTab) => {
        setActiveTab(tab);
        if (tab === "past") setPastTabVisited(true);
    }, []);

    const handleManageClick = useCallback((item: PlayerBookingItem) => {
        setSelectedBooking({ bookingId: item.booking_id, clubId: item.club_id });
    }, []);

    const handlePayClick = useCallback((item: PlayerBookingItem) => {
        setPayingBooking(item);
    }, []);

    const handleInviteClick = useCallback((item: PlayerBookingItem) => {
        setInviteBooking(item);
    }, []);

    // After accepting an invite, immediately open payment if there's a balance —
    // mirrors the web-player accept→pay chain.
    const handleInviteResponded = useCallback(
        (
            _item: PlayerBookingItem,
            action: Extract<InviteStatus, "accepted" | "declined">,
            updated: Booking
        ) => {
            refreshCurrent();
            if (action !== "accepted") return;
            const me = updated.players.find((p) => p.user_id === profile?.id);
            if (!me || me.amount_due <= 0) return;
            setPayingBooking({
                booking_id: updated.id,
                club_id: updated.club_id,
                club_name: updated.club_name ?? "",
                court_id: updated.court_id,
                court_name: updated.court_name,
                booking_type: updated.booking_type,
                status: updated.status,
                start_datetime: updated.start_datetime,
                end_datetime: updated.end_datetime,
                role: me.role,
                invite_status: me.invite_status,
                payment_status: me.payment_status,
                amount_due: me.amount_due,
            });
        },
        [profile, refreshCurrent]
    );

    const handlePaymentSuccess = useCallback(() => {
        refreshCurrent();
    }, [refreshCurrent]);

    const handleClosePayment = useCallback(() => {
        setPayingBooking(null);
        refreshCurrent();
    }, [refreshCurrent]);

    const upcomingCount = upcomingData?.upcoming?.length ?? 0;
    const paymentContext: PaymentContext | null = payingBooking
        ? { type: "booking", booking: payingBooking }
        : null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }} edges={["top"]}>
            <StatusBar style="light" />

            {/* Blue hero header — mirrors HomeView */}
            <View
                style={{
                    backgroundColor: colors.hero,
                    paddingHorizontal: 20,
                    paddingTop: 8,
                    paddingBottom: 28,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                fontWeight: "500",
                                letterSpacing: 0.3,
                            }}
                        >
                            Your schedule
                        </Text>
                        <Text
                            style={{
                                fontSize: 26,
                                fontWeight: "700",
                                color: colors.heroForeground,
                                marginTop: 2,
                                letterSpacing: -0.3,
                            }}
                        >
                            My Bookings
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                marginTop: 4,
                                fontWeight: "400",
                            }}
                        >
                            {upcomingCount > 0
                                ? `${upcomingCount} upcoming court session${upcomingCount !== 1 ? "s" : ""}`
                                : "No upcoming sessions"}
                        </Text>
                    </View>

                    <Pressable
                        onPress={refreshCurrent}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh bookings"
                        hitSlop={12}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.heroGlass,
                            borderWidth: 1,
                            borderColor: colors.heroGlassBorder,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="refresh-outline" size={18} color={colors.heroForeground} />
                    </Pressable>
                </View>
            </View>

            {/* White card lifted over hero — mirrors HomeView */}
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.contentSurface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                    overflow: "hidden",
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 6,
                }}
            >
                <BookingsListView
                    upcoming={upcomingData?.upcoming ?? []}
                    past={pastData?.past ?? []}
                    activeTab={activeTab}
                    isLoading={isLoading}
                    error={error}
                    onTabChange={handleTabChange}
                    onRefresh={refreshCurrent}
                    onManageClick={handleManageClick}
                    onPayClick={handlePayClick}
                    onInviteClick={handleInviteClick}
                    onInviteResponded={handleInviteResponded}
                />
            </View>

            <BookingDetailSheet
                selected={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onPayClick={handlePayClick}
                onInviteClick={handleInviteClick}
            />

            <InvitePlayerSheet booking={inviteBooking} onClose={() => setInviteBooking(null)} />

            <PaymentSheet
                visible={payingBooking !== null}
                context={paymentContext}
                onClose={handleClosePayment}
                onSuccess={handlePaymentSuccess}
            />
        </SafeAreaView>
    );
}

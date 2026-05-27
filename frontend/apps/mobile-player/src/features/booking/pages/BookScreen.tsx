import { type JSX, useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@repo/auth";
import { useMyBookings } from "../hooks";
import type { BookingTab, InviteStatus, PlayerBookingItem } from "../types";
import { BookingsListView } from "../bookings-list/pages/BookingsListView";
import { BookingDetailSheet } from "../manage-booking/components/BookingDetailSheet";
import { NewBookingSheet } from "../new-booking/components/NewBookingSheet";

type SelectedBooking = { bookingId: string; clubId: string };

export function BookScreen(): JSX.Element {
    const { clubId } = useAuth();
    const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
    const [pastTabVisited, setPastTabVisited] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null);
    const [newBookingVisible, setNewBookingVisible] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PlayerBookingItem | null>(null);

    // Build YYYY-MM-DD strings from UTC date parts to avoid local-TZ date shifts near midnight.
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10); // always UTC calendar date
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

    const handleRefresh = useCallback(() => {
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
        // Payment flow placeholder — store item and show payment UI when available
        setPendingPayment(item);
    }, []);

    const handleBookingCreated = useCallback(
        (payable: PlayerBookingItem) => {
            setPendingPayment(payable);
            void refetchUpcoming();
        },
        [refetchUpcoming]
    );

    const handleNewBookingSuccess = useCallback(() => {
        void refetchUpcoming();
    }, [refetchUpcoming]);

    const handleInvitePlayer = useCallback((_item: PlayerBookingItem, _userId: string) => {
        // Handled inside BookingDetailSheet for the organiser flow
    }, []);

    const handleRespondInvite = useCallback(
        (_item: PlayerBookingItem, _action: Extract<InviteStatus, "accepted" | "declined">) => {
            // Handled inside BookingDetailSheet for the player flow
        },
        []
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F2F3F7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between bg-[#F2F3F7] px-5 pb-2 pt-1 android:pt-3.5">
                <View>
                    <Text className="text-[22px] font-bold text-[#111827]">My Bookings</Text>
                    <Text className="text-[12px] text-[#9CA3AF]">
                        {(upcomingData?.upcoming?.length ?? 0) > 0
                            ? `${upcomingData?.upcoming?.length ?? 0} upcoming court sessions`
                            : "Manage your court sessions"}
                    </Text>
                </View>

                <View className="flex-row items-center gap-2">
                    {/* Refresh */}
                    <Pressable
                        onPress={handleRefresh}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh bookings"
                        hitSlop={12}
                        className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-50 disabled:opacity-40"
                    >
                        <Ionicons name="refresh-outline" size={20} color="#111827" />
                    </Pressable>

                    {/* New Booking FAB */}
                    <Pressable
                        onPress={() => setNewBookingVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="New booking"
                        className="h-11 w-11 items-center justify-center rounded-full bg-[#2563EB] shadow-sm active:opacity-80"
                    >
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            {/* Pending payment banner */}
            {pendingPayment ? (
                <View className="mx-5 mb-2 flex-row items-center gap-3 rounded-[16px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3">
                    <Ionicons name="card-outline" size={18} color="#2563EB" />
                    <View className="flex-1">
                        <Text className="text-[13px] font-semibold text-[#111827]">
                            Payment pending for {pendingPayment.court_name}
                        </Text>
                        <Text className="text-[11px] text-[#9CA3AF]">Payment flow coming soon</Text>
                    </View>
                    <Pressable
                        onPress={() => setPendingPayment(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss payment banner"
                    >
                        <Ionicons name="close" size={16} color="#9CA3AF" />
                    </Pressable>
                </View>
            ) : null}

            {/* Main list */}
            <BookingsListView
                upcoming={upcomingData?.upcoming ?? []}
                past={pastData?.past ?? []}
                activeTab={activeTab}
                isLoading={isLoading}
                error={error}
                onTabChange={handleTabChange}
                onRefresh={handleRefresh}
                onManageClick={handleManageClick}
                onPayClick={handlePayClick}
                onInvitePlayer={handleInvitePlayer}
                onRespondInvite={handleRespondInvite}
                onNewBooking={() => setNewBookingVisible(true)}
            />

            {/* Booking detail sheet */}
            <BookingDetailSheet
                selected={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onPayClick={handlePayClick}
            />

            {/* New booking sheet */}
            <NewBookingSheet
                visible={newBookingVisible}
                clubId={clubId ?? null}
                onClose={() => setNewBookingVisible(false)}
                onBookingCreated={handleBookingCreated}
                onSuccess={handleNewBookingSuccess}
            />
        </SafeAreaView>
    );
}

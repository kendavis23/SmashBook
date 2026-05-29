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

    const upcomingCount = upcomingData?.upcoming?.length ?? 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#2563EB" }} edges={["top"]}>
            <StatusBar style="light" />

            {/* Blue hero header — mirrors HomeView */}
            <View
                style={{
                    backgroundColor: "#2563EB",
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
                                color: "#BFDBFE",
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
                                color: "#FFFFFF",
                                marginTop: 2,
                                letterSpacing: -0.3,
                            }}
                        >
                            My Bookings
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#BFDBFE",
                                marginTop: 4,
                                fontWeight: "400",
                            }}
                        >
                            {upcomingCount > 0
                                ? `${upcomingCount} upcoming court session${upcomingCount !== 1 ? "s" : ""}`
                                : "No upcoming sessions"}
                        </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {/* Refresh */}
                        <Pressable
                            onPress={handleRefresh}
                            disabled={isLoading}
                            accessibilityRole="button"
                            accessibilityLabel="Refresh bookings"
                            hitSlop={12}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "rgba(255,255,255,0.18)",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.25)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                        </Pressable>

                        {/* New booking */}
                        <Pressable
                            onPress={() => setNewBookingVisible(true)}
                            accessibilityRole="button"
                            accessibilityLabel="New booking"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#FFFFFF",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons name="add" size={22} color="#2563EB" />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* White card lifted over hero — mirrors HomeView */}
            <View
                style={{
                    flex: 1,
                    backgroundColor: "#F1F5F9",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                    overflow: "hidden",
                    shadowColor: "#1E3A8A",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 6,
                }}
            >
                {/* Pending payment banner */}
                {pendingPayment ? (
                    <View
                        style={{
                            marginHorizontal: 16,
                            marginTop: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "#DBEAFE",
                            backgroundColor: "#EFF6FF",
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                        }}
                    >
                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                backgroundColor: "#DBEAFE",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons name="card-outline" size={16} color="#2563EB" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{ fontSize: 13, fontWeight: "600", color: "#1E40AF" }}
                                numberOfLines={1}
                            >
                                Payment pending · {pendingPayment.court_name}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#93C5FD", marginTop: 1 }}>
                                Payment flow coming soon
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setPendingPayment(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss payment banner"
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={16} color="#93C5FD" />
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
            </View>

            <BookingDetailSheet
                selected={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onPayClick={handlePayClick}
            />

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

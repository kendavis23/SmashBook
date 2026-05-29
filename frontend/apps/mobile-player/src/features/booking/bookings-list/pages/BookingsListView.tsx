import { type JSX } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BookingCard } from "../components/BookingCard";
import { BookingsTabBar } from "../components/BookingsTabBar";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
    activeTab: BookingTab;
    isLoading: boolean;
    error: Error | null;
    onTabChange: (tab: BookingTab) => void;
    onRefresh: () => void;
    onManageClick: (item: PlayerBookingItem) => void;
    onPayClick: (item: PlayerBookingItem) => void;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => void;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => void;
    onNewBooking: () => void;
};

function EmptyState({
    tab,
    onNewBooking,
}: {
    tab: BookingTab;
    onNewBooking: () => void;
}): JSX.Element {
    const isUpcoming = tab === "upcoming";
    return (
        <View style={{ marginTop: 48, alignItems: "center", gap: 12, paddingHorizontal: 32 }}>
            <View
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: isUpcoming ? "#EFF6FF" : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Ionicons
                    name={isUpcoming ? "calendar-outline" : "time-outline"}
                    size={28}
                    color={isUpcoming ? "#2563EB" : "#94A3B8"}
                />
            </View>
            <Text
                style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#0F172A",
                    textAlign: "center",
                    letterSpacing: -0.2,
                }}
            >
                {isUpcoming ? "No upcoming bookings" : "No past bookings"}
            </Text>
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20 }}>
                {isUpcoming
                    ? "Book a court to get started!"
                    : "Your past bookings will appear here."}
            </Text>
            {isUpcoming ? (
                <Pressable
                    onPress={onNewBooking}
                    accessibilityRole="button"
                    accessibilityLabel="Book a court"
                    style={{
                        marginTop: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 22,
                        backgroundColor: "#2563EB",
                        paddingHorizontal: 22,
                        paddingVertical: 12,
                    }}
                >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                        Book a Court
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function BookingsListView({
    upcoming,
    past,
    activeTab,
    isLoading,
    error,
    onTabChange,
    onRefresh,
    onManageClick,
    onPayClick,
    onNewBooking,
}: Props): JSX.Element {
    const items = activeTab === "upcoming" ? upcoming : past;
    const showActions = activeTab === "upcoming";

    if (isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    backgroundColor: "#F1F5F9",
                }}
            >
                <View
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: "#EFF6FF",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <ActivityIndicator size="small" color="#2563EB" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#94A3B8" }}>
                    Loading bookings…
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    backgroundColor: "#F1F5F9",
                    paddingHorizontal: 32,
                }}
            >
                <View
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: "#FEF2F2",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name="alert-circle-outline" size={26} color="#EF4444" />
                </View>
                <Text
                    style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#0F172A",
                        textAlign: "center",
                    }}
                >
                    Failed to load bookings
                </Text>
                <Text
                    style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20 }}
                >
                    {error.message ?? "Something went wrong. Please try again."}
                </Text>
                <Pressable
                    onPress={onRefresh}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading bookings"
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 22,
                        backgroundColor: "#2563EB",
                        paddingHorizontal: 22,
                        paddingVertical: 12,
                    }}
                >
                    <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(item) => item.booking_id}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: "#F1F5F9" }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
                <View style={{ gap: 12, paddingBottom: 8, paddingHorizontal: 16 }}>
                    <BookingsTabBar
                        activeTab={activeTab}
                        upcomingCount={upcoming.length}
                        onTabChange={onTabChange}
                    />
                </View>
            }
            ListEmptyComponent={<EmptyState tab={activeTab} onNewBooking={onNewBooking} />}
            renderItem={({ item }) => (
                <View style={{ paddingHorizontal: 16 }}>
                    <BookingCard
                        booking={item}
                        showActions={showActions}
                        onManageClick={onManageClick}
                        onPayClick={onPayClick}
                    />
                </View>
            )}
        />
    );
}

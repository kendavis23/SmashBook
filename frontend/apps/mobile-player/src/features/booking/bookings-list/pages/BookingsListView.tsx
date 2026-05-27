import { type JSX } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BookingCard } from "../components/BookingCard";
import { BookingsTabBar } from "../components/BookingsTabBar";
import { BookingStatsBar } from "../components/BookingStatsBar";

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
        <View className="mt-8 items-center gap-4 px-8">
            <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-white">
                <Ionicons
                    name={isUpcoming ? "calendar-outline" : "time-outline"}
                    size={36}
                    color={isUpcoming ? "#2563EB" : "#9CA3AF"}
                />
            </View>
            <Text className="text-center text-[17px] font-bold text-[#111827]">
                {isUpcoming ? "No upcoming bookings" : "No past bookings"}
            </Text>
            <Text className="text-center text-[13px] leading-5 text-[#9CA3AF]">
                {isUpcoming
                    ? "Book a court to get started!"
                    : "Your past bookings will appear here."}
            </Text>
            {isUpcoming ? (
                <Pressable
                    onPress={onNewBooking}
                    accessibilityRole="button"
                    accessibilityLabel="Book a court"
                    className="mt-1 flex-row items-center gap-2 rounded-[14px] bg-[#2563EB] px-6 py-3.5 active:opacity-75"
                >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text className="text-[14px] font-semibold text-white">Book a Court</Text>
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
            <View className="flex-1 items-center justify-center gap-3 bg-[#F2F3F7]">
                <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-white shadow-sm">
                    <ActivityIndicator size="small" color="#2563EB" />
                </View>
                <Text className="text-[14px] font-medium text-[#9CA3AF]">Loading bookings…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 items-center justify-center gap-4 bg-[#F2F3F7] px-8">
                <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-red-50">
                    <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
                </View>
                <Text className="text-center text-[17px] font-bold text-[#111827]">
                    Failed to load bookings
                </Text>
                <Text className="text-center text-[13px] leading-5 text-[#9CA3AF]">
                    {error.message ?? "Something went wrong. Please try again."}
                </Text>
                <Pressable
                    onPress={onRefresh}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading bookings"
                    className="mt-1 flex-row items-center gap-2 rounded-[14px] bg-[#2563EB] px-6 py-3.5 active:opacity-75"
                >
                    <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                    <Text className="text-[14px] font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(item) => item.booking_id}
            contentContainerClassName="pb-[120px] gap-3 pt-4"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
                <View className="gap-4 pb-1 px-5">
                    {/* Stats */}
                    <BookingStatsBar upcoming={upcoming} past={past} />
                    {/* Tab bar */}
                    <BookingsTabBar
                        activeTab={activeTab}
                        upcomingCount={upcoming.length}
                        onTabChange={onTabChange}
                    />
                </View>
            }
            ListEmptyComponent={<EmptyState tab={activeTab} onNewBooking={onNewBooking} />}
            renderItem={({ item }) => (
                <View className="px-5">
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

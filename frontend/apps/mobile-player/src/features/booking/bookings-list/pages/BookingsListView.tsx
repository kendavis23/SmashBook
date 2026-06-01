import { type JSX } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BookingCard } from "../components/BookingCard";
import { BookingsTabBar } from "../components/BookingsTabBar";
import { useThemeColors } from "../../../../theme";

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
};

function EmptyState({ tab }: { tab: BookingTab }): JSX.Element {
    const colors = useThemeColors();
    const isUpcoming = tab === "upcoming";
    return (
        <View style={{ marginTop: 48, alignItems: "center", gap: 12, paddingHorizontal: 32 }}>
            <View
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: isUpcoming ? colors.ctaSurface : colors.muted,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Ionicons
                    name={isUpcoming ? "calendar-outline" : "time-outline"}
                    size={28}
                    color={isUpcoming ? colors.cta : colors.mutedForeground}
                />
            </View>
            <Text
                style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.foreground,
                    textAlign: "center",
                    letterSpacing: -0.2,
                }}
            >
                {isUpcoming ? "No upcoming bookings" : "No past bookings"}
            </Text>
            <Text
                style={{
                    fontSize: 13,
                    color: colors.mutedForeground,
                    textAlign: "center",
                    lineHeight: 20,
                }}
            >
                {isUpcoming
                    ? "Browse courts from the Explore tab to make a booking."
                    : "Your past bookings will appear here."}
            </Text>
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
}: Props): JSX.Element {
    const colors = useThemeColors();
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
                    backgroundColor: colors.contentSurface,
                }}
            >
                <View
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: colors.ctaSurface,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <ActivityIndicator size="small" color={colors.cta} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.mutedForeground }}>
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
                    backgroundColor: colors.contentSurface,
                    paddingHorizontal: 32,
                }}
            >
                <View
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: colors.destructiveSurface,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name="alert-circle-outline" size={26} color={colors.destructive} />
                </View>
                <Text
                    style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.foreground,
                        textAlign: "center",
                    }}
                >
                    Failed to load bookings
                </Text>
                <Text
                    style={{
                        fontSize: 13,
                        color: colors.mutedForeground,
                        textAlign: "center",
                        lineHeight: 20,
                    }}
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
                        backgroundColor: colors.cta,
                        paddingHorizontal: 22,
                        paddingVertical: 12,
                    }}
                >
                    <Ionicons name="refresh-outline" size={15} color={colors.ctaForeground} />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ctaForeground }}>
                        Retry
                    </Text>
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
            style={{ backgroundColor: colors.contentSurface }}
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
            ListEmptyComponent={<EmptyState tab={activeTab} />}
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

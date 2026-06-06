import { useState, type JSX } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BookingCard } from "../components/BookingCard";
import { BookingsTabBar } from "../components/BookingsTabBar";
import { useThemeColors } from "../../../../theme";
import { isoDateParts, isoDateToWeekdayShort } from "../../../../lib/datetime";

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

interface DateChip {
    iso: string;
    topLabel: string;
    shortLabel: string;
    bottomLabel: string;
}

function isoToDateStr(iso: string): string {
    return iso.split("T")[0] ?? iso.slice(0, 10);
}

function getTodayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function buildChipsFromItems(items: PlayerBookingItem[]): DateChip[] {
    const seen = new Set<string>();
    const allDates: string[] = [];
    for (const item of items) {
        const dateStr = isoToDateStr(item.start_datetime);
        if (!seen.has(dateStr)) {
            seen.add(dateStr);
            allDates.push(dateStr);
        }
    }

    const todayStr = getTodayStr();
    const todayMs = new Date(todayStr + "T00:00:00Z").getTime();
    const tomorrowStr = new Date(todayMs + 86_400_000).toISOString().slice(0, 10);

    const visibleDates = allDates.slice(0, 10);
    const hasMore = allDates.length > 10;

    const chips: DateChip[] = visibleDates.map((dateStr) => {
        const weekday = isoDateToWeekdayShort(dateStr);
        const { day } = isoDateParts(dateStr);
        const topLabel =
            dateStr === todayStr
                ? "TOD"
                : dateStr === tomorrowStr
                  ? "TOM"
                  : weekday.toUpperCase().slice(0, 3);
        return {
            iso: dateStr,
            topLabel,
            shortLabel: String(day),
            bottomLabel: weekday.charAt(0).toUpperCase() + weekday.slice(1),
        };
    });

    if (hasMore) {
        chips.push({ iso: "__later__", topLabel: "···", shortLabel: "+", bottomLabel: "Later" });
    }

    return chips;
}

function DateStrip({
    chips,
    selected,
    onSelect,
}: {
    chips: DateChip[];
    selected: string | null;
    onSelect: (iso: string | null) => void;
}): JSX.Element {
    const colors = useThemeColors();
    const allSelected = selected === null;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 6 }}
            style={{ backgroundColor: colors.contentSurface }}
        >
            {/* All chip */}
            <Pressable
                onPress={() => onSelect(null)}
                accessibilityRole="button"
                accessibilityLabel="Show all dates"
                accessibilityState={{ selected: allSelected }}
                className="active:opacity-75"
                style={{ marginRight: 6 }}
            >
                <View
                    style={{
                        backgroundColor: allSelected ? colors.cta : colors.card,
                        borderWidth: 1,
                        borderColor: allSelected ? colors.cta : colors.border,
                        borderRadius: 14,
                        width: 54,
                        paddingVertical: 8,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 9,
                            fontWeight: "600",
                            color: allSelected ? colors.heroMuted : colors.mutedForeground,
                            letterSpacing: 0.5,
                        }}
                    >
                        ALL
                    </Text>
                    <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={allSelected ? colors.ctaForeground : colors.foreground}
                        style={{ marginTop: 2 }}
                    />
                    <Text
                        style={{
                            fontSize: 9,
                            fontWeight: "500",
                            color: allSelected ? colors.heroMuted : colors.mutedForeground,
                            marginTop: 2,
                        }}
                    >
                        Dates
                    </Text>
                </View>
            </Pressable>

            {chips.map((chip) => {
                const isSelected = selected === chip.iso;
                const isLater = chip.iso === "__later__";
                return (
                    <Pressable
                        key={chip.iso}
                        onPress={() => onSelect(chip.iso)}
                        accessibilityRole="button"
                        accessibilityLabel={
                            isLater
                                ? "Show later dates"
                                : `Filter by ${chip.topLabel} ${chip.shortLabel}`
                        }
                        accessibilityState={{ selected: isSelected }}
                        className="active:opacity-75"
                        style={{ marginRight: 6 }}
                    >
                        <View
                            style={{
                                backgroundColor: isSelected ? colors.cta : colors.card,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.cta : colors.border,
                                borderRadius: 14,
                                width: 54,
                                paddingVertical: 8,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: isLater ? 14 : 9,
                                    fontWeight: "600",
                                    color: isSelected ? colors.heroMuted : colors.mutedForeground,
                                    letterSpacing: isLater ? 0 : 0.5,
                                }}
                            >
                                {chip.topLabel}
                            </Text>
                            <Text
                                style={{
                                    fontSize: isLater ? 14 : 18,
                                    fontWeight: "700",
                                    color: isSelected ? colors.ctaForeground : colors.foreground,
                                    marginTop: 1,
                                    letterSpacing: -0.3,
                                }}
                            >
                                {chip.shortLabel}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 9,
                                    fontWeight: "500",
                                    color: isSelected ? colors.heroMuted : colors.mutedForeground,
                                    marginTop: 1,
                                }}
                            >
                                {chip.bottomLabel}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

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
    const todayStr = getTodayStr();
    const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);

    const isUpcoming = activeTab === "upcoming";
    const allItems = isUpcoming ? upcoming : past;
    const showActions = isUpcoming;

    const chips = buildChipsFromItems(allItems);

    const visibleDates = new Set(chips.filter((c) => c.iso !== "__later__").map((c) => c.iso));
    const items =
        selectedDate === null
            ? allItems
            : selectedDate === "__later__"
              ? allItems.filter((item) => !visibleDates.has(isoToDateStr(item.start_datetime)))
              : allItems.filter((item) => isoToDateStr(item.start_datetime) === selectedDate);

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
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: colors.contentSurface }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
                <View>
                    <View
                        style={{ gap: 12, paddingTop: 16, paddingBottom: 4, paddingHorizontal: 16 }}
                    >
                        <BookingsTabBar
                            activeTab={activeTab}
                            onTabChange={(tab) => {
                                setSelectedDate(null);
                                onTabChange(tab);
                            }}
                        />
                    </View>
                    {chips.length > 0 && (
                        <DateStrip
                            chips={chips}
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                        />
                    )}
                    <View style={{ height: 8 }} />
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

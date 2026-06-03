import { useState, type JSX } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem } from "../types";
import { GameCard } from "../components/GameCard";
import { useThemeColors } from "../../../theme";

type Props = {
    games: PlayerBookingItem[];
    isLoading: boolean;
    error: Error | null;
    onRefresh: () => void;
};

interface DateChip {
    iso: string;
    topLabel: string;
    shortLabel: string;
    bottomLabel: string;
}

function toLocalDateStr(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayStr(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function buildChipsFromGames(items: PlayerBookingItem[]): DateChip[] {
    const seen = new Set<string>();
    const allDates: string[] = [];
    for (const item of items) {
        const dateStr = toLocalDateStr(item.start_datetime);
        if (!seen.has(dateStr)) {
            seen.add(dateStr);
            allDates.push(dateStr);
        }
    }

    const todayStr = getTodayStr();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const visibleDates = allDates.slice(0, 10);
    const hasMore = allDates.length > 10;

    const chips: DateChip[] = visibleDates.map((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
        const topLabel =
            dateStr === todayStr
                ? "TOD"
                : dateStr === tomorrowStr
                  ? "TOM"
                  : weekday.toUpperCase().slice(0, 3);
        return {
            iso: dateStr,
            topLabel,
            shortLabel: String(d.getDate()),
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

export function MyGamesView({ games, isLoading, error, onRefresh }: Props): JSX.Element {
    const colors = useThemeColors();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const chips = buildChipsFromGames(games);
    const visibleDates = new Set(chips.filter((c) => c.iso !== "__later__").map((c) => c.iso));
    const filtered =
        selectedDate === null
            ? games
            : selectedDate === "__later__"
              ? games.filter((g) => !visibleDates.has(toLocalDateStr(g.start_datetime)))
              : games.filter((g) => toLocalDateStr(g.start_datetime) === selectedDate);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center gap-3">
                <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-card shadow-sm">
                    <ActivityIndicator size="small" color={colors.cta} />
                </View>
                <Text className="text-[14px] font-medium text-muted-foreground">
                    Loading match history…
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 items-center justify-center gap-4 px-8">
                <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-destructive/10">
                    <Ionicons name="alert-circle-outline" size={30} color={colors.destructive} />
                </View>
                <Text className="text-center text-[17px] font-bold text-foreground">
                    Failed to load games
                </Text>
                <Text className="text-center text-[13px] leading-5 text-muted-foreground">
                    {error.message ?? "Something went wrong. Please try again."}
                </Text>
                <Pressable
                    onPress={onRefresh}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading games"
                    className="mt-1 flex-row items-center gap-2 rounded-[14px] bg-cta px-6 py-3.5 active:opacity-75"
                >
                    <Ionicons name="refresh-outline" size={16} color={colors.ctaForeground} />
                    <Text className="text-[14px] font-semibold text-cta-foreground">Retry</Text>
                </Pressable>
            </View>
        );
    }

    if (games.length === 0) {
        return (
            <View className="flex-1 items-center justify-center gap-4 px-8">
                <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-cta/10">
                    <Ionicons name="tennisball-outline" size={36} color={colors.cta} />
                </View>
                <Text className="text-center text-[19px] font-bold text-foreground">
                    No games yet
                </Text>
                <Text className="text-center text-[14px] leading-5 text-muted-foreground">
                    Once you book and play a session, your full match history will appear here.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={filtered}
            keyExtractor={(item) => item.booking_id}
            contentContainerStyle={{ paddingBottom: 120, gap: 12, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: colors.contentSurface }}
            ListHeaderComponent={
                chips.length > 0 ? (
                    <DateStrip chips={chips} selected={selectedDate} onSelect={setSelectedDate} />
                ) : null
            }
            ListEmptyComponent={
                <View className="flex-1 items-center justify-center gap-4 px-8 pt-16">
                    <Ionicons name="calendar-outline" size={36} color={colors.mutedForeground} />
                    <Text className="text-center text-[15px] font-semibold text-foreground">
                        No games on this date
                    </Text>
                </View>
            }
            renderItem={({ item }) => (
                <View className="px-5">
                    <GameCard game={item} />
                </View>
            )}
        />
    );
}

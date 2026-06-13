import { type JSX, useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClubAvailability, ClubAvailabilityCourt, ClubAvailabilitySlot } from "../types";
import { FilterBar, FilterButton } from "../components/FilterBar";
import { SlotCard } from "../components/SlotCard";
import { CourtCard } from "../components/CourtCard";
import { formatPlainTime } from "../utils";
import { useThemeColors } from "../../../theme";

type Props = {
    userName: string | undefined;
    date: string;
    surface: string;
    fromTime: string;
    toTime: string;
    availability: ClubAvailability | undefined;
    isLoading: boolean;
    error: Error | null;
    selectedSlot: ClubAvailabilitySlot | null;
    showAvailableSlot: boolean;
    showOpenGame: boolean;
    isJoining: boolean;
    joiningBookingId: string;
    onDateChange: (v: string) => void;
    onSurfaceChange: (v: string) => void;
    onFromTimeChange: (v: string) => void;
    onToTimeChange: (v: string) => void;
    onSelectSlot: (slot: ClubAvailabilitySlot | null) => void;
    onToggleAvailable: (v: boolean) => void;
    onToggleOpenGame: (v: boolean) => void;
    onBook: (courtId: string) => void;
    onJoin: (bookingId: string) => void;
    onRefresh: () => void;
};

function EmptySlots(): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="items-center py-8 px-6">
            <View className="w-14 h-14 rounded-full bg-muted items-center justify-center mb-3">
                <Ionicons name="calendar-outline" size={26} color={colors.mutedForeground} />
            </View>
            <Text className="text-sm font-semibold text-foreground text-center">
                No slots available
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1">
                Try a different date or clear the filters
            </Text>
        </View>
    );
}

function SelectSlotPrompt(): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="items-center py-10 px-6">
            <View className="w-14 h-14 rounded-full bg-cta/10 items-center justify-center mb-3">
                <Ionicons name="time-outline" size={26} color={colors.cta} />
            </View>
            <Text className="text-sm font-semibold text-foreground text-center">
                Pick a time slot above
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1">
                Available courts will appear here
            </Text>
        </View>
    );
}

export function HomeView({
    userName,
    date,
    surface,
    fromTime,
    toTime,
    availability,
    isLoading,
    error,
    selectedSlot,
    showAvailableSlot,
    showOpenGame,
    isJoining,
    joiningBookingId,
    onDateChange,
    onSurfaceChange,
    onFromTimeChange,
    onToTimeChange,
    onSelectSlot,
    onToggleAvailable,
    onToggleOpenGame,
    onBook,
    onJoin,
    onRefresh,
}: Props): JSX.Element {
    const colors = useThemeColors();
    const allSlots = availability?.days[0]?.slots ?? [];
    const courts = availability?.courts ?? [];

    const filteredSlots = allSlots.filter((slot) => {
        const hasOpenGame = slot.existing_matches.length > 0;
        const hasAvailable = slot.available_courts.length > 0;
        if (showAvailableSlot && showOpenGame) return true;
        if (showAvailableSlot) return hasAvailable;
        if (showOpenGame) return hasOpenGame;
        return true;
    });

    // The screen auto-selects a slot from unfiltered availability; if the active
    // filters (Open Game / Available Slot) hide that slot, deselect it so the
    // "Available courts" header doesn't show a stale slot.
    useEffect(() => {
        if (selectedSlot && !filteredSlots.some((s) => s.start_time === selectedSlot.start_time)) {
            onSelectSlot(null);
        }
    }, [selectedSlot, filteredSlots, onSelectSlot]);

    const filteredCourts = (): ClubAvailabilityCourt[] => {
        if (!selectedSlot) return [];
        const surfaceCourts = surface ? courts.filter((c) => c.surface_type === surface) : courts;
        return surfaceCourts.filter((court) => {
            const slotCourt = selectedSlot.available_courts.find((c) => c.court_id === court.id);
            const existingMatch = selectedSlot.existing_matches.find(
                (m) => m.court_id === court.id
            );
            const isAvailable = slotCourt !== undefined;
            const isJoinable = existingMatch !== undefined && existingMatch.slots_available > 0;
            if (showAvailableSlot && showOpenGame) return isAvailable || isJoinable;
            if (showAvailableSlot) return isAvailable;
            if (showOpenGame) return isJoinable;
            return isAvailable || isJoinable;
        });
    };

    const greeting = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const visibleCourts = filteredCourts();

    return (
        <View style={{ flex: 1, backgroundColor: colors.hero }}>
            {/* Hero Header — fixed, does not scroll */}
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
                            {greeting()}
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
                            {userName ? userName.split(" ")[0] : "Player"} 👋
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                marginTop: 4,
                                fontWeight: "400",
                            }}
                        >
                            Book or join a court session
                        </Text>
                    </View>

                    {/* Refresh button */}
                    <Pressable
                        onPress={onRefresh}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh availability"
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
                        {isLoading ? (
                            <ActivityIndicator size="small" color={colors.heroForeground} />
                        ) : (
                            <Ionicons
                                name="refresh-outline"
                                size={18}
                                color={colors.heroForeground}
                            />
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Scrollable content lifted over hero */}
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: colors.contentSurface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* White card lifted over hero */}
                <View
                    style={{
                        backgroundColor: colors.contentSurface,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        overflow: "hidden",
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.06,
                        shadowRadius: 12,
                        elevation: 6,
                    }}
                >
                    {/* Date Picker */}
                    <FilterBar
                        date={date}
                        surface={surface}
                        fromTime={fromTime}
                        toTime={toTime}
                        showAvailableSlot={showAvailableSlot}
                        showOpenGame={showOpenGame}
                        onDateChange={onDateChange}
                        onSurfaceChange={onSurfaceChange}
                        onFromTimeChange={onFromTimeChange}
                        onToTimeChange={onToTimeChange}
                        onToggleAvailable={onToggleAvailable}
                        onToggleOpenGame={onToggleOpenGame}
                    />
                </View>

                {/* Error state */}
                {error && !isLoading && (
                    <View
                        style={{
                            marginHorizontal: 16,
                            marginTop: 12,
                            backgroundColor: colors.destructiveSurface,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.destructive,
                            padding: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <Ionicons
                            name="alert-circle-outline"
                            size={18}
                            color={colors.destructive}
                        />
                        <Text style={{ flex: 1, fontSize: 13, color: colors.destructive }}>
                            Failed to load availability. Pull to refresh.
                        </Text>
                    </View>
                )}

                {/* Quick Time Slots */}
                <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 12,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "700",
                                color: colors.foreground,
                                letterSpacing: -0.1,
                            }}
                        >
                            Quick time slots
                        </Text>
                        {filteredSlots.length > 0 && (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.cta }}>
                                {filteredSlots.length} slot{filteredSlots.length !== 1 ? "s" : ""}
                            </Text>
                        )}
                    </View>

                    {isLoading && (
                        <View style={{ alignItems: "center", paddingVertical: 32 }}>
                            <ActivityIndicator size="large" color={colors.cta} />
                            <Text
                                style={{
                                    marginTop: 10,
                                    fontSize: 13,
                                    color: colors.mutedForeground,
                                }}
                            >
                                Loading courts…
                            </Text>
                        </View>
                    )}

                    {!isLoading && !error && filteredSlots.length === 0 && <EmptySlots />}

                    {!isLoading && filteredSlots.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 4 }}
                        >
                            {filteredSlots.map((slot) => (
                                <SlotCard
                                    key={slot.start_time}
                                    slot={slot}
                                    isSelected={selectedSlot?.start_time === slot.start_time}
                                    onPress={() => onSelectSlot(slot)}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Available Courts */}
                <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 12,
                        }}
                    >
                        <View>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: colors.foreground,
                                    letterSpacing: -0.1,
                                }}
                            >
                                Available courts
                            </Text>
                            {selectedSlot && (
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        marginTop: 3,
                                    }}
                                >
                                    <Ionicons
                                        name="time-outline"
                                        size={12}
                                        color={colors.mutedForeground}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: colors.mutedForeground,
                                            fontWeight: "500",
                                        }}
                                    >
                                        {formatPlainTime(selectedSlot.start_time)} –{" "}
                                        {formatPlainTime(selectedSlot.end_time)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            {selectedSlot && visibleCourts.length > 0 && (
                                <Text
                                    style={{ fontSize: 13, fontWeight: "600", color: colors.cta }}
                                >
                                    {visibleCourts.length} court
                                    {visibleCourts.length !== 1 ? "s" : ""}
                                </Text>
                            )}
                            <FilterButton
                                surface={surface}
                                fromTime={fromTime}
                                toTime={toTime}
                                showAvailableSlot={showAvailableSlot}
                                showOpenGame={showOpenGame}
                                onSurfaceChange={onSurfaceChange}
                                onFromTimeChange={onFromTimeChange}
                                onToTimeChange={onToTimeChange}
                                onToggleAvailable={onToggleAvailable}
                                onToggleOpenGame={onToggleOpenGame}
                            />
                        </View>
                    </View>

                    {!isLoading && !selectedSlot && <SelectSlotPrompt />}

                    {!isLoading && selectedSlot && visibleCourts.length === 0 && (
                        <View style={{ alignItems: "center", paddingVertical: 24 }}>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: colors.mutedForeground,
                                    textAlign: "center",
                                }}
                            >
                                No courts match your filters for this slot
                            </Text>
                        </View>
                    )}

                    {selectedSlot &&
                        visibleCourts.map((court) => (
                            <CourtCard
                                key={court.id}
                                court={court}
                                slot={selectedSlot}
                                isJoining={isJoining}
                                joiningBookingId={joiningBookingId}
                                onBook={onBook}
                                onJoin={onJoin}
                            />
                        ))}
                </View>
            </ScrollView>
        </View>
    );
}

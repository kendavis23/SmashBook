import type { JSX } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClubAvailability, ClubAvailabilityCourt, ClubAvailabilitySlot } from "../types";
import { FilterBar, FilterButton } from "../components/FilterBar";
import { SlotCard } from "../components/SlotCard";
import { CourtCard } from "../components/CourtCard";
import { formatPlainTime } from "../utils";

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
    onSelectSlot: (slot: ClubAvailabilitySlot) => void;
    onToggleAvailable: (v: boolean) => void;
    onToggleOpenGame: (v: boolean) => void;
    onBook: (courtId: string) => void;
    onJoin: (bookingId: string) => void;
    onRefresh: () => void;
    onClear: () => void;
};

function EmptySlots(): JSX.Element {
    return (
        <View className="items-center py-8 px-6">
            <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="calendar-outline" size={26} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-700 text-center">
                No slots available
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
                Try a different date or clear the filters
            </Text>
        </View>
    );
}

function SelectSlotPrompt(): JSX.Element {
    return (
        <View className="items-center py-10 px-6">
            <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Ionicons name="time-outline" size={26} color="#3B82F6" />
            </View>
            <Text className="text-sm font-semibold text-slate-700 text-center">
                Pick a time slot above
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
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
    onClear,
}: Props): JSX.Element {
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
        const hour = new Date().getUTCHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const visibleCourts = filteredCourts();

    return (
        <View style={{ flex: 1, backgroundColor: "#2563EB" }}>
            {/* Hero Header — fixed, does not scroll */}
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
                            {greeting()}
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
                            {userName ? userName.split(" ")[0] : "Player"} 👋
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#BFDBFE",
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
                            backgroundColor: "rgba(255,255,255,0.18)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.25)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Scrollable content lifted over hero */}
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: "#F1F5F9",
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
                        backgroundColor: "#F1F5F9",
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        overflow: "hidden",
                        shadowColor: "#1E3A8A",
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
                        onClear={onClear}
                    />
                </View>

                {/* Error state */}
                {error && !isLoading && (
                    <View
                        style={{
                            marginHorizontal: 16,
                            marginTop: 12,
                            backgroundColor: "#FEF2F2",
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: "#FECACA",
                            padding: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                        <Text style={{ flex: 1, fontSize: 13, color: "#EF4444" }}>
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
                                color: "#0F172A",
                                letterSpacing: -0.1,
                            }}
                        >
                            Quick time slots
                        </Text>
                        {filteredSlots.length > 0 && (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#3B82F6" }}>
                                {filteredSlots.length} slot{filteredSlots.length !== 1 ? "s" : ""}
                            </Text>
                        )}
                    </View>

                    {isLoading && (
                        <View style={{ alignItems: "center", paddingVertical: 32 }}>
                            <ActivityIndicator size="large" color="#2563EB" />
                            <Text style={{ marginTop: 10, fontSize: 13, color: "#94A3B8" }}>
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
                                    color: "#0F172A",
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
                                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: "#64748B",
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
                                <Text style={{ fontSize: 13, fontWeight: "600", color: "#3B82F6" }}>
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
                                onClear={onClear}
                            />
                        </View>
                    </View>

                    {!isLoading && !selectedSlot && <SelectSlotPrompt />}

                    {!isLoading && selectedSlot && visibleCourts.length === 0 && (
                        <View style={{ alignItems: "center", paddingVertical: 24 }}>
                            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
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

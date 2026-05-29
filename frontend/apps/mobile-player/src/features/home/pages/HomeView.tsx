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
        <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }}>
            <View
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                }}
            >
                <Ionicons name="calendar-outline" size={26} color="#9CA3AF" />
            </View>
            <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#374151", textAlign: "center" }}
            >
                No slots available
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>
                Try a different date or clear the filters
            </Text>
        </View>
    );
}

function SelectSlotPrompt(): JSX.Element {
    return (
        <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
            <View
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#EFF6FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                }}
            >
                <Ionicons name="time-outline" size={26} color="#2563EB" />
            </View>
            <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#374151", textAlign: "center" }}
            >
                Pick a time slot above
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>
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
        <ScrollView
            style={{ flex: 1, backgroundColor: "#F2F3F7" }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
            {/* Header */}
            <View
                style={{
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <View>
                        <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "500" }}>
                            {greeting()}
                        </Text>
                        <Text
                            style={{
                                fontSize: 22,
                                fontWeight: "800",
                                color: "#111827",
                                marginTop: 2,
                            }}
                        >
                            {userName ? userName.split(" ")[0] : "Player"} 👋
                        </Text>
                    </View>
                    <Pressable
                        onPress={onRefresh}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh availability"
                        hitSlop={12}
                        className="active:opacity-50"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "#F3F4F6",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                            <Ionicons name="refresh-outline" size={18} color="#374151" />
                        )}
                    </Pressable>
                </View>

                {/* Subtitle */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 10,
                        backgroundColor: "#EFF6FF",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                    }}
                >
                    <Ionicons name="tennisball-outline" size={15} color="#2563EB" />
                    <Text style={{ fontSize: 13, color: "#2563EB", fontWeight: "600" }}>
                        Book a court for today
                    </Text>
                </View>
            </View>

            {/* Filters */}
            <View
                style={{
                    backgroundColor: "#FFFFFF",
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                }}
            >
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
                        margin: 16,
                        backgroundColor: "#FEF2F2",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#FECACA",
                        padding: 16,
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

            {/* Time slots section */}
            <View style={{ marginTop: 14, paddingHorizontal: 16, marginBottom: 2 }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Times</Text>
                    {filteredSlots.length > 0 && (
                        <View
                            style={{
                                backgroundColor: "#F8FAFC",
                                borderRadius: 999,
                                paddingHorizontal: 9,
                                paddingVertical: 5,
                            }}
                        >
                            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700" }}>
                                {filteredSlots.length} slot{filteredSlots.length !== 1 ? "s" : ""}
                            </Text>
                        </View>
                    )}
                </View>

                {isLoading && (
                    <View style={{ alignItems: "center", paddingVertical: 32 }}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={{ marginTop: 10, fontSize: 13, color: "#9CA3AF" }}>
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

            {/* Courts section */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                {/* Section header */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                            {selectedSlot ? "Courts" : "Select a Time"}
                        </Text>
                        {selectedSlot && (
                            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                                {formatPlainTime(selectedSlot.start_time)} –{" "}
                                {formatPlainTime(selectedSlot.end_time)}
                            </Text>
                        )}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {selectedSlot && visibleCourts.length > 0 && (
                            <View
                                style={{
                                    backgroundColor: "#EFF6FF",
                                    borderRadius: 999,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: "800", color: "#2563EB" }}>
                                    {visibleCourts.length} court
                                    {visibleCourts.length !== 1 ? "s" : ""}
                                </Text>
                            </View>
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
                        <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>
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
    );
}

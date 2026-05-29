import type { JSX } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClubAvailabilityCourt, ClubAvailabilitySlot } from "../types";
import { formatCurrency } from "../../../lib";

type Props = {
    court: ClubAvailabilityCourt;
    slot: ClubAvailabilitySlot;
    isJoining: boolean;
    joiningBookingId: string;
    onBook: (courtId: string) => void;
    onJoin: (bookingId: string) => void;
};

function surfaceLabel(surface: string): string {
    return surface.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CourtCard({
    court,
    slot,
    isJoining,
    joiningBookingId,
    onBook,
    onJoin,
}: Props): JSX.Element {
    const slotCourt = slot.available_courts.find((c) => c.court_id === court.id);
    const existingMatch = slot.existing_matches.find((m) => m.court_id === court.id);
    const isAvailable = slotCourt !== undefined;
    const isJoinable = existingMatch !== undefined && existingMatch.slots_available > 0;
    const price = slotCourt?.price ?? existingMatch?.total_price ?? null;
    const isThisJoining = joiningBookingId === existingMatch?.booking_id;

    const borderColor = isAvailable ? "#DBEAFE" : isJoinable ? "#DCFCE7" : "#F3F4F6";
    const badgeBg = isAvailable ? "#EFF6FF" : isJoinable ? "#F0FDF4" : "#F9FAFB";

    return (
        <View
            style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor,
                padding: 16,
                marginBottom: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            {/* Top row: name + badge */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 10,
                }}
            >
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                        {court.name}
                    </Text>
                    <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                                {surfaceLabel(court.surface_type)}
                            </Text>
                        </View>
                        {court.has_lighting && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons name="flash-outline" size={11} color="#9CA3AF" />
                                <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Lighting</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View
                    style={{
                        backgroundColor: badgeBg,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                    }}
                >
                    {isAvailable && (
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#2563EB" }}>
                            Available
                        </Text>
                    )}
                    {!isAvailable && isJoinable && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <View
                                style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 2.5,
                                    backgroundColor: "#22C55E",
                                }}
                            />
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#16A34A" }}>
                                Open Game
                            </Text>
                        </View>
                    )}
                    {!isAvailable && !isJoinable && (
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#9CA3AF" }}>
                            Unavailable
                        </Text>
                    )}
                </View>
            </View>

            {/* Open game spots */}
            {isJoinable && existingMatch && (
                <View
                    style={{
                        backgroundColor: "#F0FDF4",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 10,
                    }}
                >
                    <Ionicons name="people-outline" size={13} color="#16A34A" />
                    <Text style={{ fontSize: 12, color: "#16A34A", fontWeight: "600" }}>
                        {existingMatch.slots_available} spot
                        {existingMatch.slots_available !== 1 ? "s" : ""} left
                    </Text>
                </View>
            )}

            {/* Lighting surcharge */}
            {court.has_lighting && court.lighting_surcharge !== null && (
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>
                    + {formatCurrency(court.lighting_surcharge)} lighting surcharge
                </Text>
            )}

            {/* Price + action */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {price !== null ? (
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
                            {formatCurrency(price)}
                        </Text>
                        <Text
                            style={{
                                fontSize: 10,
                                color: "#9CA3AF",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            per court
                        </Text>
                    </View>
                ) : (
                    <View />
                )}

                {isAvailable && (
                    <Pressable
                        onPress={() => onBook(court.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Book ${court.name}`}
                        className="active:opacity-75"
                        style={{
                            backgroundColor: "#2563EB",
                            borderRadius: 14,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                            Book Now
                        </Text>
                    </Pressable>
                )}

                {!isAvailable && isJoinable && existingMatch && (
                    <Pressable
                        onPress={() => onJoin(existingMatch.booking_id)}
                        disabled={isJoining}
                        accessibilityRole="button"
                        accessibilityLabel={`Join game at ${court.name}`}
                        className="active:opacity-75"
                        style={{
                            backgroundColor: "#16A34A",
                            borderRadius: 14,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            opacity: isJoining ? 0.6 : 1,
                        }}
                    >
                        {isThisJoining ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="people-outline" size={15} color="#FFFFFF" />
                        )}
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                            Join Game
                        </Text>
                    </Pressable>
                )}

                {!isAvailable && !isJoinable && (
                    <View
                        style={{
                            backgroundColor: "#F3F4F6",
                            borderRadius: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                        }}
                    >
                        <Text style={{ color: "#9CA3AF", fontWeight: "600", fontSize: 13 }}>
                            Unavailable
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

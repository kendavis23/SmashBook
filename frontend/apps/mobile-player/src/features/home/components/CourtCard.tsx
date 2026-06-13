import type { JSX } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClubAvailabilityCourt, ClubAvailabilitySlot } from "../types";
import { formatCurrency } from "../../../lib";
import { useThemeColors } from "../../../theme";

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
    const colors = useThemeColors();
    const slotCourt = slot.available_courts.find((c) => c.court_id === court.id);
    const existingMatch = slot.existing_matches.find((m) => m.court_id === court.id);
    const isAvailable = slotCourt !== undefined;
    const isJoinable = existingMatch !== undefined && existingMatch.slots_available > 0;
    const price = slotCourt?.price ?? existingMatch?.total_price ?? null;
    const isThisJoining = joiningBookingId === existingMatch?.booking_id;

    const borderColor = isAvailable
        ? colors.ctaBorder
        : isJoinable
          ? colors.ctaBorder
          : colors.border;
    const badgeBg = isAvailable ? colors.ctaSurface : isJoinable ? colors.ctaSurface : colors.muted;

    return (
        <View
            style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor,
                padding: 16,
                marginBottom: 10,
                shadowColor: colors.shadow,
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
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                        {court.name}
                    </Text>
                    <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons
                                name="location-outline"
                                size={11}
                                color={colors.mutedForeground}
                            />
                            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                                {surfaceLabel(court.surface_type)}
                            </Text>
                        </View>
                        {court.has_lighting && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons
                                    name="flash-outline"
                                    size={11}
                                    color={colors.mutedForeground}
                                />
                                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                                    Lighting
                                </Text>
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
                        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.cta }}>
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
                                    backgroundColor: colors.cta,
                                }}
                            />
                            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.cta }}>
                                Open Game
                            </Text>
                        </View>
                    )}
                    {!isAvailable && !isJoinable && (
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: colors.mutedForeground,
                            }}
                        >
                            Unavailable
                        </Text>
                    )}
                </View>
            </View>

            {/* Open game spots */}
            {isJoinable && existingMatch && (
                <View
                    style={{
                        backgroundColor: colors.ctaSurface,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 10,
                    }}
                >
                    <Ionicons name="people-outline" size={13} color={colors.foreground} />
                    <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: "600" }}>
                        {existingMatch.slots_available} spot
                        {existingMatch.slots_available !== 1 ? "s" : ""} left
                    </Text>
                </View>
            )}

            {/* Lighting surcharge */}
            {court.has_lighting && court.lighting_surcharge !== null && (
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 10 }}>
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
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
                            {formatCurrency(price)}
                        </Text>
                        <Text
                            style={{
                                fontSize: 10,
                                color: colors.mutedForeground,
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
                            backgroundColor: colors.cta,
                            borderRadius: 14,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Ionicons name="calendar-outline" size={15} color={colors.ctaForeground} />
                        <Text
                            style={{ color: colors.ctaForeground, fontWeight: "700", fontSize: 13 }}
                        >
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
                            backgroundColor: colors.cta,
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
                            <ActivityIndicator size="small" color={colors.ctaForeground} />
                        ) : (
                            <Ionicons
                                name="people-outline"
                                size={15}
                                color={colors.ctaForeground}
                            />
                        )}
                        <Text
                            style={{
                                color: colors.ctaForeground,
                                fontWeight: "700",
                                fontSize: 13,
                            }}
                        >
                            Join Game
                        </Text>
                    </Pressable>
                )}

                {!isAvailable && !isJoinable && (
                    <View
                        style={{
                            backgroundColor: colors.muted,
                            borderRadius: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.mutedForeground,
                                fontWeight: "600",
                                fontSize: 13,
                            }}
                        >
                            Unavailable
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

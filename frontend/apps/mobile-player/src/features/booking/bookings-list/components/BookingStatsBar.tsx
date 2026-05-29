import { type JSX } from "react";
import { Text, View } from "react-native";
import type { PlayerBookingItem } from "../../types";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
};

export function BookingStatsBar({ upcoming, past }: Props): JSX.Element {
    const confirmed = upcoming.filter((b) => b.status === "confirmed").length;
    const unpaid = upcoming.filter(
        (b) => b.payment_status === "pending" && b.invite_status === "accepted"
    ).length;
    const totalPast = past.length;

    const stats = [
        { label: "Upcoming", value: upcoming.length, highlight: true },
        { label: "Confirmed", value: confirmed, highlight: false },
        { label: "Unpaid", value: unpaid, highlight: false },
        { label: "Past", value: totalPast, highlight: false },
    ];

    return (
        <View style={{ flexDirection: "row", gap: 8 }}>
            {stats.map((s) => (
                <View
                    key={s.label}
                    style={{
                        flex: 1,
                        backgroundColor: "#FFFFFF",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        alignItems: "center",
                        paddingVertical: 12,
                        shadowColor: "#1E3A8A",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: s.highlight ? "#2563EB" : "#0F172A",
                            letterSpacing: -0.5,
                        }}
                    >
                        {s.value}
                    </Text>
                    <Text
                        style={{
                            fontSize: 10,
                            fontWeight: "500",
                            color: "#94A3B8",
                            marginTop: 2,
                        }}
                    >
                        {s.label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

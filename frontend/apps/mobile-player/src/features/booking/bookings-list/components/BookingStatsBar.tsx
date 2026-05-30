import { type JSX } from "react";
import { Text, View } from "react-native";
import type { PlayerBookingItem } from "../../types";
import { useThemeColors } from "../../../../theme";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
};

export function BookingStatsBar({ upcoming, past }: Props): JSX.Element {
    const colors = useThemeColors();
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
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: "center",
                        paddingVertical: 12,
                        shadowColor: colors.shadow,
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
                            color: s.highlight ? colors.cta : colors.foreground,
                            letterSpacing: -0.5,
                        }}
                    >
                        {s.value}
                    </Text>
                    <Text
                        style={{
                            fontSize: 10,
                            fontWeight: "500",
                            color: colors.mutedForeground,
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

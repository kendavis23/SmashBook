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
        { label: "Upcoming", value: upcoming.length, color: "#2563EB", bg: "#EFF6FF" },
        { label: "Confirmed", value: confirmed, color: "#15803D", bg: "#DCFCE7" },
        { label: "Unpaid", value: unpaid, color: "#A16207", bg: "#FEF9C3" },
        { label: "Past", value: totalPast, color: "#6B7280", bg: "#F3F4F6" },
    ];

    return (
        <View className="flex-row gap-2">
            {stats.map((s) => (
                <View
                    key={s.label}
                    style={{ backgroundColor: s.bg }}
                    className="flex-1 items-center rounded-[16px] py-3"
                >
                    <Text style={{ color: s.color }} className="text-[18px] font-bold">
                        {s.value}
                    </Text>
                    <Text
                        style={{ color: s.color }}
                        className="mt-0.5 text-[10px] font-medium opacity-80"
                    >
                        {s.label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

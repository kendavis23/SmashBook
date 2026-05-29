import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import type { ClubAvailabilitySlot } from "../types";
import { formatPlainTime } from "../utils";

type Props = {
    slot: ClubAvailabilitySlot;
    isSelected: boolean;
    onPress: () => void;
};

export function SlotCard({ slot, isSelected, onPress }: Props): JSX.Element {
    const courtCount = slot.available_courts.length;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Time slot ${formatPlainTime(slot.start_time)} to ${formatPlainTime(slot.end_time)}`}
            accessibilityState={{ selected: isSelected }}
            className="mr-2 active:opacity-75"
        >
            <View
                style={{
                    borderWidth: 1,
                    borderColor: isSelected ? "#2563EB" : "#E2E8F0",
                    backgroundColor: isSelected ? "#2563EB" : "#F8FAFC",
                    borderRadius: 14,
                    width: 100,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    elevation: 0,
                }}
            >
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isSelected ? "#FFFFFF" : "#1E293B",
                    }}
                >
                    {formatPlainTime(slot.start_time)}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 12,
                        fontWeight: "400",
                        color: isSelected ? "#BFDBFE" : "#94A3B8",
                        marginTop: 1,
                    }}
                >
                    {formatPlainTime(slot.end_time)}
                </Text>

                {courtCount > 0 && (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 6,
                        }}
                    >
                        <View
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: isSelected ? "#93C5FD" : "#22C55E",
                            }}
                        />
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "500",
                                color: isSelected ? "#BFDBFE" : "#64748B",
                            }}
                        >
                            {courtCount} Court{courtCount !== 1 ? "s" : ""}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

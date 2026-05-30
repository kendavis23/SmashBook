import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import type { ClubAvailabilitySlot } from "../types";
import { formatPlainTime } from "../utils";
import { useThemeColors } from "../../../theme";

type Props = {
    slot: ClubAvailabilitySlot;
    isSelected: boolean;
    onPress: () => void;
};

export function SlotCard({ slot, isSelected, onPress }: Props): JSX.Element {
    const colors = useThemeColors();
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
                    borderColor: isSelected ? colors.cta : colors.border,
                    backgroundColor: isSelected ? colors.cta : colors.muted,
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
                        color: isSelected ? colors.ctaForeground : colors.foreground,
                    }}
                >
                    {formatPlainTime(slot.start_time)}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 12,
                        fontWeight: "400",
                        color: isSelected ? colors.heroMuted : colors.mutedForeground,
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
                                backgroundColor: isSelected ? colors.heroMuted : colors.success,
                            }}
                        />
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "500",
                                color: isSelected ? colors.heroMuted : colors.mutedForeground,
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

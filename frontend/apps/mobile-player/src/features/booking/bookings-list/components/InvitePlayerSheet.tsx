import { type JSX, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../../theme";
import { useInvitePlayer } from "../../hooks";
import type { PlayerBookingItem, PlayerSearchResult } from "../../types";
import { formatBookingDate, formatBookingTimeRange } from "../../utils/bookingFormatters";
import { PlayerSearchField } from "../../new-booking/components/PlayerSearchField";

type Props = {
    booking: PlayerBookingItem | null;
    onClose: () => void;
};

/**
 * Organiser flow — search the club roster and invite a player to a pending
 * booking. Mirrors the web-player InviteDialog adapted to a native sheet.
 */
export function InvitePlayerSheet({ booking, onClose }: Props): JSX.Element {
    const colors = useThemeColors();
    const [selected, setSelected] = useState<PlayerSearchResult | null>(null);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const inviteMutation = useInvitePlayer(booking?.club_id ?? "", booking?.booking_id ?? "");

    function handleClose(): void {
        setSelected(null);
        setSuccessMsg("");
        setErrorMsg("");
        onClose();
    }

    function handleSend(): void {
        if (!selected) return;
        setErrorMsg("");
        inviteMutation.mutate(
            { user_id: selected.id },
            {
                onSuccess: () => setSuccessMsg(`${selected.full_name} has been invited!`),
                onError: (err) =>
                    setErrorMsg((err as { message?: string })?.message ?? "Failed to invite."),
            }
        );
    }

    return (
        <Modal
            visible={booking !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="flex-row items-center justify-between bg-card px-5 pb-4 pt-5 shadow-sm">
                    <View className="flex-row items-center gap-3">
                        <View
                            style={{ backgroundColor: colors.cta }}
                            className="h-10 w-10 items-center justify-center rounded-[14px]"
                        >
                            <Ionicons name="person-add" size={18} color={colors.ctaForeground} />
                        </View>
                        <View>
                            <Text className="text-[18px] font-bold text-foreground">
                                Invite a Player
                            </Text>
                            <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                                {booking?.court_name ?? ""}
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={handleClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close invite"
                        className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75"
                    >
                        <Ionicons name="close" size={20} color={colors.foreground} />
                    </Pressable>
                </View>

                <View className="gap-4 px-5 pt-5">
                    {/* Date + time pills */}
                    {booking ? (
                        <View className="flex-row flex-wrap gap-2">
                            <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                                <Ionicons
                                    name="calendar-outline"
                                    size={12}
                                    color={colors.mutedForeground}
                                />
                                <Text className="text-[12px] font-medium text-muted-foreground">
                                    {formatBookingDate(booking.start_datetime)}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                                <Ionicons
                                    name="time-outline"
                                    size={12}
                                    color={colors.mutedForeground}
                                />
                                <Text className="text-[12px] font-medium text-muted-foreground">
                                    {formatBookingTimeRange(
                                        booking.start_datetime,
                                        booking.end_datetime
                                    )}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {successMsg ? (
                        <View className="flex-row items-center gap-3 rounded-[16px] border border-success bg-success/10 px-4 py-4">
                            <Ionicons
                                name="checkmark-circle-outline"
                                size={20}
                                color={colors.success}
                            />
                            <Text className="flex-1 text-[14px] font-medium text-foreground">
                                {successMsg}
                            </Text>
                        </View>
                    ) : (
                        <>
                            {errorMsg ? (
                                <View className="flex-row items-center gap-3 rounded-[16px] border border-destructive bg-destructive/10 px-4 py-4">
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={20}
                                        color={colors.destructive}
                                    />
                                    <Text className="flex-1 text-[14px] font-medium text-destructive">
                                        {errorMsg}
                                    </Text>
                                </View>
                            ) : null}

                            <View className="gap-2">
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Search player
                                </Text>
                                {selected ? (
                                    <View className="flex-row items-center justify-between gap-2 rounded-[14px] border border-border bg-muted px-4 py-3.5">
                                        <Text className="flex-1 text-[14px] font-medium text-foreground">
                                            {selected.full_name}
                                        </Text>
                                        <Pressable
                                            onPress={() => setSelected(null)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Remove selected player"
                                            hitSlop={8}
                                            className="h-6 w-6 items-center justify-center rounded-full active:opacity-75"
                                        >
                                            <Ionicons
                                                name="close"
                                                size={15}
                                                color={colors.mutedForeground}
                                            />
                                        </Pressable>
                                    </View>
                                ) : (
                                    <PlayerSearchField
                                        clubId={booking?.club_id ?? null}
                                        selectedIds={[]}
                                        onAdd={(player) => setSelected(player)}
                                    />
                                )}
                            </View>

                            <Pressable
                                onPress={handleSend}
                                disabled={!selected || inviteMutation.isPending}
                                accessibilityRole="button"
                                accessibilityLabel="Send invitation"
                                className="mt-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-cta py-4 active:opacity-75 disabled:opacity-40"
                            >
                                {inviteMutation.isPending ? (
                                    <ActivityIndicator size="small" color={colors.ctaForeground} />
                                ) : (
                                    <Ionicons
                                        name="person-add"
                                        size={16}
                                        color={colors.ctaForeground}
                                    />
                                )}
                                <Text className="text-[14px] font-bold text-cta-foreground">
                                    Send Invitation
                                </Text>
                            </Pressable>
                        </>
                    )}

                    {successMsg ? (
                        <Pressable
                            onPress={handleClose}
                            accessibilityRole="button"
                            accessibilityLabel="Done"
                            className="flex-row items-center justify-center rounded-[14px] border border-border bg-card py-4 active:opacity-75"
                        >
                            <Text className="text-[14px] font-bold text-foreground">Done</Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

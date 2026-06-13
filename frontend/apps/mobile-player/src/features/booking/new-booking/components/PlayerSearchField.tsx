import { type JSX, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../../theme";
import { useSearchPlayers } from "../../hooks";
import type { PlayerSearchResult } from "../../types";

type Props = {
    clubId: string | null;
    selectedIds: string[];
    onAdd: (player: PlayerSearchResult) => void;
};

/**
 * Search-and-add player field. Queries the club roster as the user types and
 * lists matches that have not already been invited.
 */
export function PlayerSearchField({ clubId, selectedIds, onAdd }: Props): JSX.Element {
    const colors = useThemeColors();
    const [query, setQuery] = useState("");
    const trimmed = query.trim();

    const { data: results = [], isLoading } = useSearchPlayers(
        { q: trimmed, club_id: clubId ?? undefined },
        { enabled: Boolean(clubId) && trimmed.length >= 2 }
    );

    const matches = (results as PlayerSearchResult[]).filter((p) => !selectedIds.includes(p.id));

    return (
        <View className="gap-2">
            <View
                className="flex-row items-center gap-2 rounded-[14px] border border-border bg-card px-4 py-3.5"
                style={{ borderColor: colors.border }}
            >
                <Ionicons name="search" size={16} color={colors.placeholder} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search and add player…"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="words"
                    accessibilityLabel="Search and add player"
                    className="flex-1 text-[14px] text-foreground"
                />
                {isLoading && trimmed.length >= 2 ? (
                    <ActivityIndicator size="small" color={colors.placeholder} />
                ) : null}
            </View>

            {trimmed.length >= 2 && !isLoading && matches.length === 0 ? (
                <Text className="px-1 text-[12px] text-muted-foreground">No players found</Text>
            ) : null}

            {matches.length > 0 ? (
                <View className="overflow-hidden rounded-[14px] border border-border bg-card">
                    {matches.slice(0, 6).map((player, index) => (
                        <Pressable
                            key={player.id}
                            onPress={() => {
                                onAdd(player);
                                setQuery("");
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${player.full_name}`}
                            className="flex-row items-center justify-between px-4 py-3 active:bg-muted"
                            style={{
                                borderTopWidth: index === 0 ? 0 : 1,
                                borderTopColor: colors.border,
                            }}
                        >
                            <Text className="flex-1 text-[14px] font-medium text-foreground">
                                {player.full_name}
                                {player.skill_level != null ? (
                                    <Text className="text-[12px] font-normal text-muted-foreground">
                                        {"  "}({player.skill_level})
                                    </Text>
                                ) : null}
                            </Text>
                            <Ionicons name="add-circle" size={20} color={colors.cta} />
                        </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

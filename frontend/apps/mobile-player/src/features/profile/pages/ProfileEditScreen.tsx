import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { UserResponse } from "@repo/auth";
import { useAuthStore } from "@repo/auth";
import { useUpdateMyProfile } from "@repo/player-domain/hooks";
import { ReadOnlyField } from "../components/ReadOnlyField";
import { ProfileScreenShell } from "../components/ProfileScreenShell";
import { getInitials, getSkillLabel, parseSkillLevel } from "../utils/profileFormatters";
import { useThemeColors } from "../../../theme";

type Props = {
    user: UserResponse;
    onCancel: () => void;
    onDone: () => void;
};

export function ProfileEditScreen({ user, onCancel, onDone }: Props) {
    const colors = useThemeColors();
    const [fullName, setFullName] = useState(user.full_name ?? "");
    const [phone, setPhone] = useState(user.phone ?? "");
    const [error, setError] = useState("");

    const setUser = useAuthStore((state) => state.setUser);
    const updateMutation = useUpdateMyProfile();

    useEffect(() => {
        setFullName(user.full_name ?? "");
        setPhone(user.phone ?? "");
        setError("");
    }, [user.full_name, user.phone]);

    const displayName = fullName || user.email || "Player";
    const initials = getInitials(displayName);
    const skillLevel = parseSkillLevel(user.skill_level);

    const skillText =
        skillLevel !== null
            ? `${skillLevel} / 7 - ${getSkillLabel(skillLevel)}`
            : "Not yet assigned";

    const handleDone = async (): Promise<void> => {
        Keyboard.dismiss();
        setError("");
        try {
            const payload = { full_name: fullName, phone };
            await updateMutation.mutateAsync(payload);
            setUser({ ...user, ...payload });
            onDone();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
        }
    };

    const handleCancel = (): void => {
        Keyboard.dismiss();
        setFullName(user.full_name ?? "");
        setPhone(user.phone ?? "");
        setError("");
        onCancel();
    };

    const doneAction = (
        <Pressable
            onPress={() => void handleDone()}
            disabled={updateMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Done editing"
            hitSlop={12}
            style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: colors.heroForeground,
                alignItems: "center",
                justifyContent: "center",
                opacity: updateMutation.isPending ? 0.6 : 1,
            }}
        >
            {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.hero} />
            ) : (
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.hero }}>Done</Text>
            )}
        </Pressable>
    );

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ProfileScreenShell
                title="Edit Profile"
                onBack={handleCancel}
                backLabel="Cancel editing"
                headerAction={doneAction}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="px-4 pt-6 pb-10"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar */}
                    <View className="items-center pb-[26px]">
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Set new profile photo"
                            className="relative h-[104px] w-[104px] items-center justify-center rounded-full border-4 border-card bg-cta/20 shadow-lg active:opacity-50"
                        >
                            {user.photo_url ? (
                                <>
                                    <Image
                                        source={{ uri: user.photo_url }}
                                        className="h-24 w-24 rounded-full"
                                        accessibilityIgnoresInvertColors
                                    />
                                    <View className="absolute bottom-0.5 right-0.5 h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-cta">
                                        <Ionicons
                                            name="camera"
                                            size={16}
                                            color={colors.ctaForeground}
                                        />
                                    </View>
                                </>
                            ) : (
                                <Text className="text-[30px] font-bold text-cta">{initials}</Text>
                            )}
                        </Pressable>
                        <Text className="mt-2.5 text-[13px] font-semibold tracking-[0.1px] text-cta">
                            Change Photo
                        </Text>
                    </View>

                    {!!error && (
                        <View className="mb-2 rounded-[10px] border border-destructive bg-destructive/10 px-3.5 py-2.5">
                            <Text className="text-[13px] font-medium text-destructive">
                                {error}
                            </Text>
                        </View>
                    )}

                    {/* Editable fields — grouped card */}
                    <View className="mb-3 overflow-hidden rounded-xl bg-card shadow-sm">
                        <View className="px-4 py-3">
                            <Text className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
                                Full Name
                            </Text>
                            <TextInput
                                className="min-h-[22px] py-0 text-[15px] font-normal text-foreground"
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Your full name"
                                placeholderTextColor={colors.placeholder}
                                accessibilityLabel="Full name"
                                returnKeyType="next"
                            />
                        </View>
                        <View className="ml-4 h-px bg-border" />
                        <View className="px-4 py-3">
                            <Text className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
                                Phone
                            </Text>
                            <TextInput
                                className="min-h-[22px] py-0 text-[15px] font-normal text-foreground"
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+1 234 567 890"
                                placeholderTextColor={colors.placeholder}
                                keyboardType={
                                    Platform.OS === "ios" ? "numbers-and-punctuation" : "phone-pad"
                                }
                                accessibilityLabel="Phone number"
                                textContentType="telephoneNumber"
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                blurOnSubmit
                            />
                        </View>
                    </View>

                    {/* Read-only fields — grouped card */}
                    <View className="mb-3 overflow-hidden rounded-xl bg-card shadow-sm">
                        <View className="px-4 py-3">
                            <ReadOnlyField label="Email" value={user.email} />
                        </View>
                        <View className="ml-4 h-px bg-border" />
                        <View className="px-4 py-3">
                            <ReadOnlyField label="Role" value={user.role} />
                        </View>
                    </View>

                    {/* Skill level */}
                    <View className="mt-1 rounded-xl border border-warning bg-warning/10 px-4 py-3.5">
                        <View className="flex-row items-center justify-between gap-3">
                            <View>
                                <Text className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.6px] text-warning">
                                    Skill Level
                                </Text>
                                <Text className="text-[14px] font-semibold text-foreground">
                                    {skillText}
                                </Text>
                            </View>
                            <View className="rounded-full border border-warning bg-warning/10 px-2.5 py-1">
                                <Text className="text-[11px] font-semibold text-warning">
                                    Set by staff
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </ProfileScreenShell>
        </KeyboardAvoidingView>
    );
}

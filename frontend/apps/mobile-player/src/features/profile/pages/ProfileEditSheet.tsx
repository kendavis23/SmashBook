import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import type { UserResponse } from "@repo/auth";
import { useAuthStore } from "@repo/auth";
import { useUpdateMyProfile } from "@repo/player-domain/hooks";

type Props = {
    user: UserResponse;
    visible: boolean;
    onCancel: () => void;
    onDone: () => void;
};

function getSkillLabel(level: number): string {
    if (level <= 1.5) return "Beginner";
    if (level <= 2.5) return "Novice";
    if (level <= 3.5) return "Intermediate";
    if (level <= 4.5) return "Advanced";
    if (level <= 5.5) return "Expert";
    if (level <= 6.5) return "Elite";
    return "Pro";
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={[styles.inputSurface, styles.readOnlySurface]}>
                <Text style={styles.readOnlyText}>{value}</Text>
            </View>
        </View>
    );
}

export function ProfileEditSheet({ user, visible, onCancel, onDone }: Props) {
    const [fullName, setFullName] = useState(user.full_name ?? "");
    const [phone, setPhone] = useState(user.phone ?? "");
    const [error, setError] = useState("");

    const setUser = useAuthStore((state) => state.setUser);
    const updateMutation = useUpdateMyProfile();

    useEffect(() => {
        if (visible) {
            setFullName(user.full_name ?? "");
            setPhone(user.phone ?? "");
            setError("");
        }
    }, [visible, user.full_name, user.phone]);

    const rawSkill = user.skill_level;
    const skillLevel =
        typeof rawSkill === "number"
            ? rawSkill
            : rawSkill != null && !Number.isNaN(Number(rawSkill))
              ? Number(rawSkill)
              : null;

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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <Pressable
                            onPress={handleCancel}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing"
                            hitSlop={8}
                            style={({ pressed }) => [styles.headerPill, pressed && styles.pressed]}
                        >
                            <Text style={styles.headerPillText}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => void handleDone()}
                            disabled={updateMutation.isPending}
                            accessibilityRole="button"
                            accessibilityLabel="Done editing"
                            hitSlop={8}
                            style={({ pressed }) => [
                                styles.headerPill,
                                styles.donePill,
                                (pressed || updateMutation.isPending) && styles.pressed,
                            ]}
                        >
                            {updateMutation.isPending ? (
                                <ActivityIndicator size="small" color="#111827" />
                            ) : null}
                            <Text style={styles.headerPillText}>Done</Text>
                        </Pressable>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.avatarSection}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Set new profile photo"
                                style={({ pressed }) => [
                                    styles.avatarButton,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <View style={styles.cameraGlyph}>
                                    <View style={styles.cameraTop} />
                                    <View style={styles.cameraBody}>
                                        <View style={styles.cameraLens} />
                                    </View>
                                </View>
                            </Pressable>

                            <Text style={styles.photoAction}>Set New Photo</Text>
                        </View>

                        <View style={styles.formCard}>
                            <View>
                                <Text style={styles.fieldLabel}>FULL NAME</Text>
                                <TextInput
                                    style={styles.inputSurface}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Your full name"
                                    placeholderTextColor="#A7ADB8"
                                    accessibilityLabel="Full name"
                                    returnKeyType="next"
                                />
                            </View>

                            <View>
                                <Text style={styles.fieldLabel}>PHONE</Text>
                                <TextInput
                                    style={styles.inputSurface}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+1 234 567 890"
                                    placeholderTextColor="#A7ADB8"
                                    keyboardType={
                                        Platform.OS === "ios"
                                            ? "numbers-and-punctuation"
                                            : "phone-pad"
                                    }
                                    accessibilityLabel="Phone number"
                                    textContentType="telephoneNumber"
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                    blurOnSubmit
                                />
                            </View>

                            {/* Error message */}
                            {!!error && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Read-only fields */}
                            <ReadOnlyField label="Email" value={user.email} />
                            <ReadOnlyField label="Role" value={user.role} />

                            {/* Skill level card */}
                            <View style={styles.skillCard}>
                                <View style={styles.skillRow}>
                                    <View>
                                        <Text style={styles.skillLabel}>Skill Level</Text>
                                        <Text style={styles.skillValue}>{skillText}</Text>
                                    </View>
                                    <View style={styles.staffBadge}>
                                        <Text style={styles.staffBadgeText}>Set by staff</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: "#F4F5F8",
    },
    safeArea: {
        flex: 1,
    },
    header: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: Platform.OS === "ios" ? 4 : 18,
        paddingBottom: 10,
    },
    headerPill: {
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        flexDirection: "row",
        gap: 7,
        justifyContent: "center",
        minHeight: 52,
        minWidth: 120,
        paddingHorizontal: 20,
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.11,
        shadowRadius: 24,
        elevation: 8,
    },
    donePill: {
        minWidth: 104,
    },
    headerPillText: {
        color: "#111827",
        fontSize: 18,
        fontWeight: "800",
    },
    pressed: {
        opacity: 0.62,
        transform: [{ scale: 0.98 }],
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 2,
        paddingBottom: 46,
    },
    avatarSection: {
        alignItems: "center",
        paddingTop: 2,
        paddingBottom: 26,
    },
    avatarButton: {
        alignItems: "center",
        backgroundColor: "#DDE8F8",
        borderRadius: 72,
        height: 144,
        justifyContent: "center",
        shadowColor: "#4C6FAE",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        width: 144,
    },
    cameraGlyph: {
        alignItems: "center",
        height: 54,
        justifyContent: "center",
        width: 62,
    },
    cameraTop: {
        backgroundColor: "#4C8DFF",
        borderRadius: 5,
        height: 12,
        position: "absolute",
        top: 8,
        width: 24,
    },
    cameraBody: {
        alignItems: "center",
        backgroundColor: "#3E84F7",
        borderRadius: 9,
        height: 38,
        justifyContent: "center",
        marginTop: 10,
        width: 58,
    },
    cameraLens: {
        borderColor: "#DDE8F8",
        borderRadius: 12,
        borderWidth: 3,
        height: 25,
        width: 25,
    },
    photoAction: {
        color: "#3F8CFF",
        fontSize: 25,
        fontWeight: "700",
        marginTop: 22,
    },
    formCard: {
        gap: 16,
    },
    fieldBlock: {
        gap: 7,
    },
    fieldLabel: {
        color: "#747B89",
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: 0.7,
        marginBottom: 7,
    },
    inputSurface: {
        backgroundColor: "#FFFFFF",
        borderColor: "#E3E6ED",
        borderRadius: 23,
        borderWidth: StyleSheet.hairlineWidth,
        color: "#171B26",
        fontSize: 18,
        minHeight: 72,
        paddingHorizontal: 24,
        paddingVertical: 18,
        shadowColor: "#182033",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 2,
    },
    readOnlySurface: {
        backgroundColor: "#F7F8FB",
        borderColor: "#E9ECF2",
        shadowOpacity: 0,
        elevation: 0,
    },
    readOnlyText: {
        color: "#8E95A3",
        fontSize: 17,
        fontWeight: "500",
    },
    errorBox: {
        backgroundColor: "#FFF1F2",
        borderColor: "#FECDD3",
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    errorText: {
        color: "#BE123C",
        fontSize: 13,
        fontWeight: "700",
    },
    skillCard: {
        backgroundColor: "#FFF8E8",
        borderColor: "#F4D58C",
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 17,
    },
    skillRow: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 14,
    },
    skillLabel: {
        color: "#9A6A12",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.7,
        marginBottom: 5,
        textTransform: "uppercase",
    },
    skillValue: {
        color: "#1F2937",
        fontSize: 16,
        fontWeight: "800",
    },
    staffBadge: {
        backgroundColor: "#FCECC3",
        borderColor: "#F0D184",
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    staffBadgeText: {
        color: "#8A5B0A",
        fontSize: 12,
        fontWeight: "800",
    },
});

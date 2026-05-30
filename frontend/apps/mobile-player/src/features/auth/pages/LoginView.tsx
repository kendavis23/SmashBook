import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { Controller, type Control } from "react-hook-form";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useThemeColors } from "../../../theme";
import type { LoginFormValues } from "./types";

type Props = {
    control: Control<LoginFormValues>;
    onSubmit: () => void;
    isPending: boolean;
    isError: boolean;
    errorMessage: string;
    passwordVisible: boolean;
    onTogglePassword: () => void;
};

function InputField({
    label,
    icon,
    error,
    children,
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    error?: string;
    children: ReactNode;
}) {
    const colors = useThemeColors();
    return (
        <View>
            <View className="mb-2 flex-row items-center gap-1.5">
                <Ionicons name={icon} size={14} color={colors.mutedForeground} />
                <Text className="text-[13px] font-semibold tracking-wide text-muted-foreground">
                    {label}
                </Text>
            </View>
            {children}
            {error ? (
                <View className="mt-1.5 flex-row items-center gap-1">
                    <Ionicons name="alert-circle" size={13} color={colors.destructive} />
                    <Text className="text-xs font-medium text-destructive">{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

export function LoginView({
    control,
    onSubmit,
    isPending,
    isError,
    errorMessage,
    passwordVisible,
    onTogglePassword,
}: Props) {
    const colors = useThemeColors();
    const inputBase = "h-[54px] rounded-2xl border px-4 py-0 text-[15px] text-foreground";
    const inputResting = "border-input bg-muted";

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="grow"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Hero header ── */}
                    <View className="px-7 pb-9 pt-8">
                        {/* Wordmark */}
                        <View className="mb-12 flex-row items-center">
                            <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-xl bg-cta shadow-lg shadow-cta/30">
                                <Ionicons
                                    name="tennisball"
                                    size={20}
                                    color={colors.ctaForeground}
                                />
                            </View>
                            <Text className="text-xl font-black tracking-tight text-foreground">
                                Smash<Text className="text-cta">Book</Text>
                            </Text>
                        </View>

                        {/* Headline */}
                        <Text className="text-[34px] font-extrabold leading-[40px] tracking-tight text-foreground">
                            Welcome back
                        </Text>
                        <Text className="mt-2 text-[15px] leading-6 text-muted-foreground">
                            Sign in to your player account to book courts and track your games.
                        </Text>
                    </View>

                    {/* ── Form ── */}
                    <View className="flex-1 px-7 pb-8">
                        {isError ? (
                            <View
                                accessibilityRole="alert"
                                className="mb-5 flex-row items-center gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3.5"
                            >
                                <Ionicons name="warning" size={18} color={colors.destructive} />
                                <Text className="flex-1 text-[13px] font-medium leading-5 text-destructive">
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}

                        <View className="gap-5">
                            {/* Club */}
                            <Controller
                                control={control}
                                name="tenant_subdomain"
                                render={({ field, fieldState }) => (
                                    <InputField
                                        label="Club"
                                        icon="business-outline"
                                        error={fieldState.error?.message}
                                    >
                                        <TextInput
                                            accessibilityLabel="Club"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            className={`${inputBase} ${
                                                fieldState.error
                                                    ? "border-destructive bg-destructive/5"
                                                    : inputResting
                                            }`}
                                            editable={!isPending}
                                            onBlur={field.onBlur}
                                            onChangeText={field.onChange}
                                            placeholder="your-club"
                                            placeholderTextColor={colors.placeholder}
                                            returnKeyType="next"
                                            value={field.value}
                                        />
                                    </InputField>
                                )}
                            />

                            {/* Email */}
                            <Controller
                                control={control}
                                name="email"
                                render={({ field, fieldState }) => (
                                    <InputField
                                        label="Email"
                                        icon="mail-outline"
                                        error={fieldState.error?.message}
                                    >
                                        <TextInput
                                            accessibilityLabel="Email"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            autoCorrect={false}
                                            className={`${inputBase} ${
                                                fieldState.error
                                                    ? "border-destructive bg-destructive/5"
                                                    : inputResting
                                            }`}
                                            editable={!isPending}
                                            inputMode="email"
                                            keyboardType="email-address"
                                            onBlur={field.onBlur}
                                            onChangeText={field.onChange}
                                            placeholder="you@example.com"
                                            placeholderTextColor={colors.placeholder}
                                            returnKeyType="next"
                                            textContentType="emailAddress"
                                            value={field.value}
                                        />
                                    </InputField>
                                )}
                            />

                            {/* Password */}
                            <Controller
                                control={control}
                                name="password"
                                render={({ field, fieldState }) => (
                                    <InputField
                                        label="Password"
                                        icon="lock-closed-outline"
                                        error={fieldState.error?.message}
                                    >
                                        <View
                                            className={`h-[54px] flex-row items-center rounded-2xl border px-4 ${
                                                fieldState.error
                                                    ? "border-destructive bg-destructive/5"
                                                    : inputResting
                                            }`}
                                        >
                                            <TextInput
                                                accessibilityLabel="Password"
                                                autoCapitalize="none"
                                                autoComplete="password"
                                                autoCorrect={false}
                                                className="h-[54px] flex-1 py-0 text-[15px] text-foreground"
                                                editable={!isPending}
                                                inputMode="text"
                                                keyboardType="default"
                                                onBlur={field.onBlur}
                                                onChangeText={field.onChange}
                                                placeholder="Enter your password"
                                                placeholderTextColor={colors.placeholder}
                                                returnKeyType="done"
                                                secureTextEntry={!passwordVisible}
                                                textContentType="password"
                                                value={field.value}
                                            />
                                            <Pressable
                                                accessibilityLabel={
                                                    passwordVisible
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                                accessibilityRole="button"
                                                disabled={isPending}
                                                hitSlop={8}
                                                onPress={onTogglePassword}
                                            >
                                                <Ionicons
                                                    name={
                                                        passwordVisible
                                                            ? "eye-off-outline"
                                                            : "eye-outline"
                                                    }
                                                    size={20}
                                                    color={colors.mutedForeground}
                                                />
                                            </Pressable>
                                        </View>
                                    </InputField>
                                )}
                            />
                        </View>

                        {/* Forgot password */}
                        <View className="mt-3 items-end">
                            <Pressable
                                accessibilityLabel="Forgot password"
                                accessibilityRole="button"
                                hitSlop={8}
                            >
                                <Text className="text-[13px] font-semibold text-cta">
                                    Forgot password?
                                </Text>
                            </Pressable>
                        </View>

                        {/* Sign in button */}
                        <Pressable
                            accessibilityLabel="Sign in"
                            accessibilityRole="button"
                            className={`mt-7 h-[56px] flex-row items-center justify-center gap-2 rounded-2xl bg-cta shadow-lg shadow-cta/30 ${
                                isPending ? "opacity-60" : "active:opacity-90"
                            }`}
                            disabled={isPending}
                            onPress={onSubmit}
                        >
                            <Text className="text-base font-bold tracking-wide text-cta-foreground">
                                {isPending ? "Signing in…" : "Sign in"}
                            </Text>
                            {!isPending ? (
                                <Ionicons
                                    name="arrow-forward"
                                    size={18}
                                    color={colors.ctaForeground}
                                />
                            ) : null}
                        </Pressable>

                        {/* Footer */}
                        <View className="mt-auto items-center pt-12">
                            <View className="mb-4 flex-row items-center gap-1">
                                <Text className="text-[13px] text-muted-foreground">
                                    Don't have an account?
                                </Text>
                                <Pressable
                                    accessibilityLabel="Sign up"
                                    accessibilityRole="button"
                                    hitSlop={6}
                                >
                                    <Text className="text-[13px] font-bold text-cta">Sign up</Text>
                                </Pressable>
                            </View>
                            <Text className="text-[11px] tracking-wide text-muted-foreground/70">
                                SmashBook · Player Portal
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

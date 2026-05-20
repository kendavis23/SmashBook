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
import type { ReactNode } from "react";
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
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <View>
            <Text className="mb-1.5 text-sm font-semibold text-[#1e293b]">{label}</Text>
            {children}
            {error ? (
                <Text className="mt-1 text-xs font-medium text-destructive">{error}</Text>
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
    return (
        <SafeAreaView className="flex-1 bg-white">
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
                    {/* Header */}
                    <View className="px-7 pb-6 pt-10">
                        {/* Wordmark */}
                        <View className="mb-10 flex-row items-center gap-2">
                            <Text className="text-lg font-black tracking-tight text-[#0f172a]">
                                Smash<Text className="text-cta">Book</Text>
                            </Text>
                        </View>

                        {/* Headline */}
                        <Text className="text-[30px] font-bold leading-snug text-[#0f172a]">
                            Welcome back
                        </Text>
                        <Text className="mt-1.5 text-[15px] text-[#64748b]">
                            Sign in to your player account
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="flex-1 px-7 pb-10">
                        {isError ? (
                            <View
                                accessibilityRole="alert"
                                className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
                            >
                                <Text className="text-sm font-medium text-destructive">
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}

                        <View className="gap-4">
                            {/* Club */}
                            <Controller
                                control={control}
                                name="tenant_subdomain"
                                render={({ field, fieldState }) => (
                                    <InputField label="Club" error={fieldState.error?.message}>
                                        <TextInput
                                            accessibilityLabel="Club"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            className={`h-12 rounded-xl border px-4 py-0 text-base text-[#0f172a] ${
                                                fieldState.error
                                                    ? "border-destructive bg-destructive/5"
                                                    : "border-[#e2e8f0] bg-[#f8fafc]"
                                            }`}
                                            editable={!isPending}
                                            onBlur={field.onBlur}
                                            onChangeText={field.onChange}
                                            placeholder="your-club"
                                            placeholderTextColor="#94a3b8"
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
                                    <InputField label="Email" error={fieldState.error?.message}>
                                        <TextInput
                                            accessibilityLabel="Email"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            autoCorrect={false}
                                            className={`h-12 rounded-xl border px-4 py-0 text-base text-[#0f172a] ${
                                                fieldState.error
                                                    ? "border-destructive bg-destructive/5"
                                                    : "border-[#e2e8f0] bg-[#f8fafc]"
                                            }`}
                                            editable={!isPending}
                                            inputMode="email"
                                            keyboardType="email-address"
                                            onBlur={field.onBlur}
                                            onChangeText={field.onChange}
                                            placeholder="you@example.com"
                                            placeholderTextColor="#94a3b8"
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
                                    <InputField label="Password" error={fieldState.error?.message}>
                                        <View
                                            className={`h-12 flex-row items-center rounded-xl border px-4 ${
                                                fieldState.error
                                                    ? "border-destructive bg-destructive/5"
                                                    : "border-[#e2e8f0] bg-[#f8fafc]"
                                            }`}
                                        >
                                            <TextInput
                                                accessibilityLabel="Password"
                                                autoCapitalize="none"
                                                autoComplete="password"
                                                autoCorrect={false}
                                                className="h-12 flex-1 py-0 text-base text-[#0f172a]"
                                                editable={!isPending}
                                                inputMode="text"
                                                keyboardType="default"
                                                onBlur={field.onBlur}
                                                onChangeText={field.onChange}
                                                placeholder="Enter your password"
                                                placeholderTextColor="#94a3b8"
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
                                                <Text className="text-xs font-bold tracking-wide text-cta">
                                                    {passwordVisible ? "HIDE" : "SHOW"}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </InputField>
                                )}
                            />
                        </View>

                        {/* Sign in button */}
                        <Pressable
                            accessibilityLabel="Sign in"
                            accessibilityRole="button"
                            className={`mt-8 h-[52px] items-center justify-center rounded-xl bg-cta ${
                                isPending ? "opacity-60" : "active:opacity-80"
                            }`}
                            disabled={isPending}
                            onPress={onSubmit}
                        >
                            <Text className="text-base font-bold text-white">
                                {isPending ? "Signing in…" : "Sign in"}
                            </Text>
                        </Pressable>

                        {/* Footer */}
                        <View className="mt-auto pt-12 items-center">
                            <Text className="text-xs text-[#cbd5e1]">
                                SmashBook · Player Portal
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

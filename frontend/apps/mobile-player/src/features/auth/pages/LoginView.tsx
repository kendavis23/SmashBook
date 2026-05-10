import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
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
        <SafeAreaView className="flex-1 bg-[#0f172a]">
            <StatusBar style="light" />
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
                    {/* Hero section */}
                    <View className="items-center px-6 pb-10 pt-12">
                        {/* Logo badge */}
                        <View className="mb-8 flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-xl bg-cta shadow-lg">
                                <Text className="text-lg font-black text-white">S</Text>
                            </View>
                            <Text className="text-2xl font-black tracking-tight text-white">
                                Smash<Text className="text-cta">Book</Text>
                            </Text>
                        </View>

                        {/* Sport icon decoration */}
                        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white/5">
                            <View className="h-16 w-16 items-center justify-center rounded-full bg-cta/20">
                                <Text className="text-4xl">🎾</Text>
                            </View>
                        </View>

                        <Text className="text-center text-3xl font-bold text-white">
                            Welcome back
                        </Text>
                        <Text className="mt-2 text-center text-base text-white/50">
                            Book courts · Join games · Track your game
                        </Text>
                    </View>

                    {/* Form card */}
                    <View className="flex-1 rounded-t-[32px] bg-white px-6 pb-10 pt-8 shadow-2xl">

                        {isError ? (
                            <View
                                accessibilityRole="alert"
                                className="mb-5 flex-row items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3"
                            >
                                <Text className="text-base">⚠️</Text>
                                <Text className="flex-1 text-sm font-medium text-destructive">
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}

                        <View className="gap-5">
                            {/* Club field */}
                            <Controller
                                control={control}
                                name="tenant_subdomain"
                                render={({ field, fieldState }) => (
                                    <View>
                                        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#64748b]">
                                            Club
                                        </Text>
                                        <View
                                            className={`flex-row items-center rounded-2xl border-2 bg-[#f8fafc] px-4 ${
                                                fieldState.error
                                                    ? "border-destructive"
                                                    : "border-transparent"
                                            }`}
                                        >
                                            <Text className="mr-3 text-lg">🏟️</Text>
                                            <TextInput
                                                accessibilityLabel="Club"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                className="h-14 flex-1 text-base font-medium text-[#0f172a]"
                                                editable={!isPending}
                                                onBlur={field.onBlur}
                                                onChangeText={field.onChange}
                                                placeholder="your-club"
                                                placeholderTextColor="#94a3b8"
                                                returnKeyType="next"
                                                value={field.value}
                                            />
                                        </View>
                                        {fieldState.error ? (
                                            <Text className="mt-1.5 ml-1 text-xs font-medium text-destructive">
                                                {fieldState.error.message}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                            />

                            {/* Email field */}
                            <Controller
                                control={control}
                                name="email"
                                render={({ field, fieldState }) => (
                                    <View>
                                        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#64748b]">
                                            Email
                                        </Text>
                                        <View
                                            className={`flex-row items-center rounded-2xl border-2 bg-[#f8fafc] px-4 ${
                                                fieldState.error
                                                    ? "border-destructive"
                                                    : "border-transparent"
                                            }`}
                                        >
                                            <Text className="mr-3 text-lg">✉️</Text>
                                            <TextInput
                                                accessibilityLabel="Email"
                                                autoCapitalize="none"
                                                autoComplete="email"
                                                autoCorrect={false}
                                                className="h-14 flex-1 text-base font-medium text-[#0f172a]"
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
                                        </View>
                                        {fieldState.error ? (
                                            <Text className="mt-1.5 ml-1 text-xs font-medium text-destructive">
                                                {fieldState.error.message}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                            />

                            {/* Password field */}
                            <Controller
                                control={control}
                                name="password"
                                render={({ field, fieldState }) => (
                                    <View>
                                        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#64748b]">
                                            Password
                                        </Text>
                                        <View
                                            className={`flex-row items-center rounded-2xl border-2 bg-[#f8fafc] px-4 ${
                                                fieldState.error
                                                    ? "border-destructive"
                                                    : "border-transparent"
                                            }`}
                                        >
                                            <Text className="mr-3 text-lg">🔒</Text>
                                            <TextInput
                                                accessibilityLabel="Password"
                                                autoCapitalize="none"
                                                autoComplete="password"
                                                className="h-14 flex-1 text-base font-medium text-[#0f172a]"
                                                editable={!isPending}
                                                onBlur={field.onBlur}
                                                onChangeText={field.onChange}
                                                placeholder="Enter password"
                                                placeholderTextColor="#94a3b8"
                                                returnKeyType="done"
                                                secureTextEntry={!passwordVisible}
                                                textContentType="password"
                                                value={field.value}
                                            />
                                            <Pressable
                                                accessibilityLabel={
                                                    passwordVisible ? "Hide password" : "Show password"
                                                }
                                                accessibilityRole="button"
                                                className="ml-2 rounded-xl bg-cta/10 px-3 py-1.5"
                                                disabled={isPending}
                                                onPress={onTogglePassword}
                                            >
                                                <Text className="text-xs font-bold text-cta">
                                                    {passwordVisible ? "HIDE" : "SHOW"}
                                                </Text>
                                            </Pressable>
                                        </View>
                                        {fieldState.error ? (
                                            <Text className="mt-1.5 ml-1 text-xs font-medium text-destructive">
                                                {fieldState.error.message}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                            />
                        </View>

                        {/* Sign in button */}
                        <Pressable
                            accessibilityLabel="Sign in"
                            accessibilityRole="button"
                            className={`mt-8 h-[58px] items-center justify-center rounded-2xl bg-cta shadow-lg ${
                                isPending ? "opacity-60" : "active:scale-[0.98] opacity-100"
                            }`}
                            disabled={isPending}
                            onPress={onSubmit}
                        >
                            <View className="flex-row items-center gap-2">
                                {isPending ? (
                                    <>
                                        <Text className="text-base font-bold tracking-wide text-white">
                                            Signing in…
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-base font-bold tracking-wide text-white">
                                            Sign in
                                        </Text>
                                        <Text className="text-base text-white/80">→</Text>
                                    </>
                                )}
                            </View>
                        </Pressable>

                        {/* Footer trust badge */}
                        <View className="mt-8 items-center gap-1.5">
                            <View className="flex-row items-center gap-1.5">
                                <View className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                <Text className="text-xs font-medium text-[#94a3b8]">
                                    Secure · Encrypted · Player portal
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

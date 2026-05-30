/**
 * AddCardSheet — PCI-compliant card entry via Stripe React Native SDK.
 *
 * Flow:
 *  1. On open: call createSetupIntent() → get client_secret from our backend.
 *  2. Render Stripe's <CardField> — card number, CVC, expiry are collected
 *     entirely inside Stripe's native view. Raw PAN never touches JS or our servers.
 *  3. On "Save": call stripe.confirmSetupIntent(clientSecret, { paymentMethodType: "Card" }).
 *     Stripe returns a PaymentMethod ID (pm_xxx).
 *  4. POST pm_xxx to our backend via savePaymentMethod() to persist the vault reference.
 *
 * PCI DSS scope: card data is handled only by Stripe's certified SDK.
 * Our code only ever sees the opaque pm_xxx token.
 */
import { type JSX, useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { CardField, useStripe, type CardFieldInput } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreateSetupIntent, useSavePaymentMethod } from "@repo/player-domain";
import { useThemeColors } from "../../../../theme";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

type SheetState =
    | { status: "loading" }
    | { status: "ready"; clientSecret: string }
    | { status: "error"; message: string };

export function AddCardSheet({ visible, onClose, onSuccess }: Props): JSX.Element {
    const colors = useThemeColors();
    const { confirmSetupIntent } = useStripe();
    const createSetupIntent = useCreateSetupIntent();
    const savePaymentMethod = useSavePaymentMethod();

    const [sheetState, setSheetState] = useState<SheetState>({ status: "loading" });
    const [cardComplete, setCardComplete] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Fetch a fresh SetupIntent every time the sheet opens
    useEffect(() => {
        if (!visible) return;

        setSheetState({ status: "loading" });
        setCardComplete(false);
        setSaveError(null);

        let cancelled = false;

        createSetupIntent
            .mutateAsync()
            .then((intent) => {
                if (!cancelled) {
                    setSheetState({ status: "ready", clientSecret: intent.client_secret });
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    const msg =
                        (err as { message?: string })?.message ??
                        "Could not initialise secure card entry. Please try again.";
                    setSheetState({ status: "error", message: msg });
                }
            });

        return () => {
            cancelled = true;
        };
        // Only re-run when the sheet opens/closes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const handleSave = useCallback(async () => {
        if (sheetState.status !== "ready" || !cardComplete) return;

        setSaveError(null);
        setIsSaving(true);

        try {
            // Step 1 — tokenise via Stripe SDK (PAN never leaves Stripe's native view)
            const { setupIntent, error: stripeError } = await confirmSetupIntent(
                sheetState.clientSecret,
                { paymentMethodType: "Card" }
            );

            if (stripeError) {
                setSaveError(stripeError.message ?? "Payment confirmation failed.");
                setIsSaving(false);
                return;
            }

            const paymentMethodId =
                typeof setupIntent?.paymentMethodId === "string"
                    ? setupIntent.paymentMethodId
                    : null;

            if (!paymentMethodId) {
                setSaveError("Could not retrieve saved card — please try again.");
                setIsSaving(false);
                return;
            }

            // Step 2 — persist the opaque PaymentMethod ID on our backend
            await savePaymentMethod.mutateAsync({
                payment_method_id: paymentMethodId,
                set_as_default: false,
            });

            onSuccess();
        } catch (err: unknown) {
            setSaveError(
                (err as { message?: string })?.message ?? "Failed to save card. Please try again."
            );
        } finally {
            setIsSaving(false);
        }
    }, [sheetState, cardComplete, confirmSetupIntent, savePaymentMethod, onSuccess]);

    const handleCardChange = useCallback((details: CardFieldInput.Details) => {
        setCardComplete(details.complete);
        setSaveError(null);
    }, []);

    const handleClose = useCallback(() => {
        if (isSaving) return;
        onClose();
    }, [isSaving, onClose]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            {/* Backdrop */}
            <Pressable
                className="flex-1"
                style={{ backgroundColor: colors.overlay }}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                onPress={handleClose}
            />

            {/* Sheet */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View className="rounded-t-[28px] bg-card overflow-hidden">
                    {/* Handle */}
                    <View className="items-center pt-3 pb-1">
                        <View className="h-1 w-10 rounded-full bg-border" />
                    </View>

                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
                        <View>
                            <Text className="text-[16px] font-bold text-foreground">
                                Add new card
                            </Text>
                            <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                Your card details are encrypted and secured by Stripe
                            </Text>
                        </View>
                        <Pressable
                            onPress={handleClose}
                            disabled={isSaving}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={10}
                            className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-60 disabled:opacity-40"
                        >
                            <Ionicons name="close" size={16} color={colors.foreground} />
                        </Pressable>
                    </View>

                    <ScrollView
                        contentContainerClassName="px-5 pb-10 pt-5 gap-5"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Loading SetupIntent */}
                        {sheetState.status === "loading" && (
                            <View className="items-center justify-center py-8 gap-3">
                                <ActivityIndicator size="large" color={colors.cta} />
                                <Text className="text-[13px] text-muted-foreground">
                                    Preparing secure entry…
                                </Text>
                            </View>
                        )}

                        {/* SetupIntent error */}
                        {sheetState.status === "error" && (
                            <View className="flex-row items-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-4">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={18}
                                    color={colors.destructive}
                                />
                                <Text className="flex-1 text-[13px] font-medium text-destructive">
                                    {sheetState.message}
                                </Text>
                            </View>
                        )}

                        {/* Stripe CardField — PAN collected entirely inside Stripe's native view */}
                        {sheetState.status === "ready" && (
                            <>
                                {/* Security notice */}
                                <View className="flex-row items-center gap-2 rounded-xl bg-success/10 px-3.5 py-3">
                                    <Ionicons
                                        name="shield-checkmark"
                                        size={15}
                                        color={colors.success}
                                    />
                                    <Text className="flex-1 text-[12px] leading-5 text-success">
                                        Card details are entered directly into Stripe&apos;s secure
                                        field — your card number never touches our servers.
                                    </Text>
                                </View>

                                {/* Stripe native CardField */}
                                <View>
                                    <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
                                        Card details
                                    </Text>
                                    <CardField
                                        postalCodeEnabled={false}
                                        placeholders={{ number: "4242 4242 4242 4242" }}
                                        cardStyle={{
                                            backgroundColor: colors.card,
                                            textColor: colors.foreground,
                                            placeholderColor: colors.placeholder,
                                            borderColor: cardComplete ? colors.cta : colors.border,
                                            borderWidth: cardComplete ? 2 : 1,
                                            borderRadius: 14,
                                            fontSize: 15,
                                        }}
                                        style={{ height: 54, width: "100%" }}
                                        onCardChange={handleCardChange}
                                        accessibilityLabel="Card number, expiry, and CVC"
                                    />
                                </View>

                                {/* Save error */}
                                {!!saveError && (
                                    <View className="flex-row items-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-4 py-3">
                                        <Ionicons
                                            name="alert-circle-outline"
                                            size={15}
                                            color={colors.destructive}
                                        />
                                        <Text className="flex-1 text-[13px] font-medium text-destructive">
                                            {saveError}
                                        </Text>
                                    </View>
                                )}

                                {/* Save button */}
                                <Pressable
                                    onPress={() => void handleSave()}
                                    disabled={!cardComplete || isSaving}
                                    accessibilityRole="button"
                                    accessibilityLabel="Save card"
                                    className="items-center justify-center rounded-xl bg-cta py-4 active:opacity-80 disabled:opacity-40"
                                >
                                    {isSaving ? (
                                        <View className="flex-row items-center gap-2">
                                            <ActivityIndicator
                                                size="small"
                                                color={colors.ctaForeground}
                                            />
                                            <Text className="text-[15px] font-semibold text-cta-foreground">
                                                Saving…
                                            </Text>
                                        </View>
                                    ) : (
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons
                                                name="lock-closed"
                                                size={15}
                                                color={colors.ctaForeground}
                                            />
                                            <Text className="text-[15px] font-semibold text-cta-foreground">
                                                Save card
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>

                                {/* PCI footer */}
                                <Text className="text-center text-[11px] text-muted-foreground">
                                    PCI DSS compliant · Secured by Stripe · 3D Secure may apply
                                </Text>
                            </>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

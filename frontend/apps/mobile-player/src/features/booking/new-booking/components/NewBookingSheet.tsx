import { type JSX, useState, useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "@repo/player-domain";
import { useThemeColors } from "../../../../theme";
import { formatUTCDate, formatUTCTime, formatCurrency } from "../../../../lib";
import { useCreateBooking, useGetPriceQuote, useListAvailableTrainers } from "../../hooks";
import type {
    BookingInput,
    BookingType,
    PlayerBookingItem,
    Booking,
    PriceQuote,
    PlayerSearchResult,
} from "../../types";
import { buildBookingDatetime } from "../../utils/bookingFormatters";
import { PlayerSearchField } from "./PlayerSearchField";

type Step = "details" | "invite";

type FormState = {
    bookingType: BookingType;
    isOpenGame: boolean;
    maxPlayers: string;
    staffProfileId: string;
    playerUserIds: string[];
};

const BOOKING_TYPE_OPTIONS: {
    value: BookingType;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    {
        value: "regular",
        label: "Regular",
        description: "Open to all players",
        icon: "people-outline",
    },
    {
        value: "lesson_individual",
        label: "Individual Lesson",
        description: "1-on-1 coaching",
        icon: "school-outline",
    },
];

const DISCOUNT_SOURCE_LABELS: Record<string, string> = {
    membership: "Membership",
    campaign: "Campaign",
    promo_code: "Promo Code",
    staff_manual: "Staff Discount",
    ai_gap_offer: "Special Offer",
};

function createDefaultForm(): FormState {
    return {
        bookingType: "regular",
        isOpenGame: true,
        maxPlayers: "4",
        staffProfileId: "",
        playerUserIds: [],
    };
}

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function getPayableBookingForUser(
    booking: Booking,
    myUserId: string | undefined
): PlayerBookingItem | null {
    if (!myUserId) return null;
    const me = booking.players.find((p) => p.user_id === myUserId);
    if (!me || me.invite_status !== "accepted" || me.payment_status !== "pending") return null;
    return {
        booking_id: booking.id,
        club_id: booking.club_id,
        club_name: booking.club_name ?? "",
        court_id: booking.court_id,
        court_name: booking.court_name,
        booking_type: booking.booking_type,
        status: booking.status,
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime,
        role: me.role,
        invite_status: me.invite_status,
        payment_status: me.payment_status,
        amount_due: me.amount_due,
    };
}

/* ── Single icon + value line inside the booking summary ── */
function SummaryRow({
    icon,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    value: string;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="flex-row items-center gap-2.5">
            <Ionicons name={icon} size={15} color={colors.mutedForeground} />
            <Text className="flex-1 text-[14px] font-medium text-foreground" numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

/* ── Court thumbnail (graceful placeholder — no image URL in the booking data) ── */
function CourtThumbnail(): JSX.Element {
    const colors = useThemeColors();
    return (
        <View
            className="h-[88px] w-[88px] items-center justify-center rounded-[16px] bg-muted"
            style={{ borderWidth: 1, borderColor: colors.border }}
        >
            <Ionicons name="tennisball-outline" size={28} color={colors.mutedForeground} />
        </View>
    );
}

/* ── Discount breakdown bar (original / discount / your share) ── */
function PriceBreakdown({ priceQuote }: { priceQuote: PriceQuote | null }): JSX.Element | null {
    const colors = useThemeColors();
    if (
        !priceQuote ||
        priceQuote.discount_amount == null ||
        priceQuote.discount_amount <= 0 ||
        priceQuote.discount_source == null
    ) {
        return null;
    }

    const originalPrice = priceQuote.per_player_price ?? priceQuote.base_price;
    const amountDue = priceQuote.amount_due ?? priceQuote.base_price;
    const discountLabel =
        DISCOUNT_SOURCE_LABELS[priceQuote.discount_source] ?? priceQuote.discount_source;

    return (
        <View className="flex-row overflow-hidden rounded-[16px] border border-border/60 bg-background">
            <View className="flex-1 px-3 py-3">
                <Text className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Original
                </Text>
                <Text
                    className="mt-1 text-[14px] font-bold text-muted-foreground"
                    style={{ textDecorationLine: "line-through" }}
                >
                    {formatCurrency(originalPrice)}
                </Text>
            </View>
            <View className="flex-1 border-l border-border/60 px-3 py-3">
                <Text className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {discountLabel}
                </Text>
                <Text className="mt-1 text-[14px] font-bold" style={{ color: colors.cta }}>
                    -{formatCurrency(priceQuote.discount_amount)}
                </Text>
            </View>
            <View
                className="flex-1 border-l border-border/60 px-3 py-3"
                style={{ backgroundColor: colors.ctaSurface }}
            >
                <Text className="text-[9px] font-semibold uppercase tracking-wider text-cta">
                    Your share
                </Text>
                <Text className="mt-1 text-[14px] font-bold" style={{ color: colors.cta }}>
                    {formatCurrency(amountDue)}
                </Text>
            </View>
        </View>
    );
}

/* ── Booking-type selector — rich radio cards (icon + title + subtitle) ── */
function BookingTypeSelector({
    value,
    onChange,
}: {
    value: BookingType;
    onChange: (v: BookingType) => void;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="gap-3">
            <Text className="text-[15px] font-bold text-foreground">Booking Type</Text>
            <View className="flex-row gap-3">
                {BOOKING_TYPE_OPTIONS.map((opt) => {
                    const active = opt.value === value;
                    return (
                        <Pressable
                            key={opt.value}
                            onPress={() => onChange(opt.value)}
                            accessibilityRole="radio"
                            accessibilityLabel={opt.label}
                            accessibilityState={{ selected: active }}
                            className="flex-1 rounded-[16px] border px-3.5 py-3.5 active:opacity-80"
                            style={{
                                borderColor: active ? colors.cta : colors.border,
                                backgroundColor: active ? colors.ctaSurface : colors.card,
                            }}
                        >
                            <View className="flex-row items-center justify-between">
                                <View
                                    className="h-5 w-5 items-center justify-center rounded-full border-2"
                                    style={{
                                        borderColor: active ? colors.cta : colors.border,
                                    }}
                                >
                                    {active ? (
                                        <View
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: colors.cta }}
                                        />
                                    ) : null}
                                </View>
                                <Ionicons
                                    name={opt.icon}
                                    size={20}
                                    color={active ? colors.cta : colors.mutedForeground}
                                />
                            </View>
                            <Text
                                className="mt-3 text-[14px] font-bold"
                                style={{ color: active ? colors.foreground : colors.foreground }}
                            >
                                {opt.label}
                            </Text>
                            <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                {opt.description}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

/* ── Max-players stepper card (circular +/-, big number, "including you" helper) ── */
function MaxPlayersStepper({
    value,
    min,
    max,
    onChange,
    disabled,
}: {
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="gap-3 rounded-[20px] bg-card px-4 py-4 shadow-sm">
            <Text className="text-[15px] font-bold text-foreground">Max Players</Text>
            <View
                className="flex-row items-center justify-between rounded-[16px] border border-border bg-background px-3 py-2"
                style={{ opacity: disabled ? 0.5 : 1 }}
            >
                <Pressable
                    onPress={() => onChange(Math.max(min, value - 1))}
                    disabled={disabled || value <= min}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease max players"
                    className="h-11 w-11 items-center justify-center rounded-full active:opacity-75 disabled:opacity-40"
                    style={{ backgroundColor: colors.muted }}
                >
                    <Ionicons name="remove" size={20} color={colors.foreground} />
                </Pressable>
                <Text className="text-[26px] font-bold text-foreground">{value}</Text>
                <Pressable
                    onPress={() => onChange(Math.min(max, value + 1))}
                    disabled={disabled || value >= max}
                    accessibilityRole="button"
                    accessibilityLabel="Increase max players"
                    className="h-11 w-11 items-center justify-center rounded-full active:opacity-75 disabled:opacity-40"
                    style={{ backgroundColor: colors.muted }}
                >
                    <Ionicons name="add" size={20} color={colors.foreground} />
                </Pressable>
            </View>
            <View className="flex-row items-center justify-center gap-1.5">
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text className="text-[12px] text-muted-foreground">Including you</Text>
            </View>
        </View>
    );
}

/* ── Toggle row card (leading icon chip + label/description + Switch) ── */
function ToggleRow({
    icon,
    label,
    description,
    value,
    onChange,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    value: boolean;
    onChange: (v: boolean) => void;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="flex-row items-center gap-3 rounded-[20px] bg-card px-4 py-3.5 shadow-sm">
            <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: value ? colors.ctaSurface : colors.muted }}
            >
                <Ionicons
                    name={icon}
                    size={18}
                    color={value ? colors.cta : colors.mutedForeground}
                />
            </View>
            <View className="flex-1">
                <Text className="text-[14px] font-bold text-foreground">{label}</Text>
                {description ? (
                    <Text className="mt-0.5 text-[12px] text-muted-foreground">{description}</Text>
                ) : null}
            </View>
            <Switch
                value={value}
                onValueChange={onChange}
                accessibilityLabel={label}
                trackColor={{ false: colors.border, true: colors.cta }}
                thumbColor={colors.ctaForeground}
                ios_backgroundColor={colors.border}
            />
        </View>
    );
}

type Props = {
    visible: boolean;
    clubId: string | null;
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime?: string;
    onClose: () => void;
    onBookingCreated: (booking: PlayerBookingItem) => void;
    onSuccess: () => void;
};

export function NewBookingSheet({
    visible,
    clubId,
    courtId,
    courtName,
    date,
    startTime,
    endTime,
    onClose,
    onBookingCreated,
    onSuccess,
}: Props): JSX.Element {
    const queryClient = useQueryClient();
    const colors = useThemeColors();
    const { data: profile } = useMyProfile();

    const [step, setStep] = useState<Step>("details");
    const [form, setForm] = useState<FormState>(createDefaultForm);
    const [invitedInfo, setInvitedInfo] = useState<Record<string, PlayerSearchResult>>({});
    const [staffError, setStaffError] = useState("");
    const [apiError, setApiError] = useState("");

    const isIndividualLesson = form.bookingType === "lesson_individual";
    const isLessonType = form.bookingType === "lesson_individual";

    const startDatetimeForQuote = date && startTime ? `${date}T${startTime}:00` : "";
    const { data: priceQuote = null } = useGetPriceQuote({
        club_id: clubId ?? "",
        start_datetime: startDatetimeForQuote,
        booking_type: form.bookingType,
        max_players: parseInt(form.maxPlayers, 10) || 4,
    });

    const {
        data: trainerData = [],
        isLoading: trainersLoading,
        isError: trainersError,
    } = useListAvailableTrainers({
        clubId: isLessonType ? (clubId ?? "") : "",
        date,
        startTime,
        endTime: endTime ?? "",
    });

    const trainerOptions = (trainerData as { staff_profile_id: string; full_name: string }[])
        .map((t) => ({ value: t.staff_profile_id, label: t.full_name }))
        .filter((o) => o.value.length > 0);

    const createMutation = useCreateBooking(clubId ?? "");

    const formattedDate = useMemo(() => (date ? formatUTCDate(`${date}T00:00:00Z`) : "—"), [date]);
    const formattedTime = useMemo(() => {
        if (!startTime) return "—";
        const start = formatUTCTime(`${date}T${startTime}:00Z`);
        const end = endTime ? formatUTCTime(`${date}T${endTime}:00Z`) : "";
        return end ? `${start} – ${end}` : start;
    }, [date, startTime, endTime]);
    const courtPrice = priceQuote?.base_price ?? null;
    const formattedPrice = formatCurrency(courtPrice);
    // What the user actually pays: their discounted share if present, else the base price.
    const payableAmount = priceQuote?.amount_due ?? priceQuote?.per_player_price ?? courtPrice;
    const formattedPayable = formatCurrency(payableAmount);

    const handleFormChange = useCallback((patch: Partial<FormState>) => {
        setForm((prev) => {
            const next = { ...prev, ...patch };
            if (patch.bookingType !== undefined) {
                next.isOpenGame = true;
                if (patch.bookingType === "lesson_individual") {
                    next.maxPlayers = "1";
                    next.playerUserIds = [];
                } else {
                    next.maxPlayers = "4";
                    next.staffProfileId = "";
                }
            }
            return next;
        });
        if (patch.staffProfileId !== undefined) setStaffError("");
        setApiError("");
    }, []);

    const handleAddPlayer = useCallback((player: PlayerSearchResult) => {
        setInvitedInfo((info) => ({ ...info, [player.id]: player }));
        setForm((prev) =>
            prev.playerUserIds.includes(player.id)
                ? prev
                : { ...prev, playerUserIds: [...prev.playerUserIds.filter(Boolean), player.id] }
        );
    }, []);

    const handleRemovePlayer = useCallback((id: string) => {
        setForm((prev) => ({
            ...prev,
            playerUserIds: prev.playerUserIds.filter((uid) => uid !== id),
        }));
    }, []);

    const validate = (): boolean => {
        if (isIndividualLesson && !form.staffProfileId.trim()) {
            setStaffError("Trainer is required for individual lessons.");
            return false;
        }
        return true;
    };

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;

        const startDatetime = buildBookingDatetime(date, startTime);
        const payload: BookingInput = {
            club_id: clubId ?? "",
            court_id: courtId,
            booking_type: form.bookingType,
            start_datetime: startDatetime,
            is_open_game: form.isOpenGame,
            max_players: parseOptionalNumber(form.maxPlayers) ?? undefined,
            player_user_ids:
                !isIndividualLesson && form.playerUserIds.filter(Boolean).length > 0
                    ? form.playerUserIds.filter(Boolean)
                    : undefined,
            staff_profile_id: form.staffProfileId.trim() || null,
        };

        try {
            const booking = (await createMutation.mutateAsync(payload)) as Booking;
            void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });

            const payable = getPayableBookingForUser(booking, profile?.id);
            if (payable) {
                onBookingCreated(payable);
            } else {
                onSuccess();
            }
            onClose();
            setForm(createDefaultForm());
            setInvitedInfo({});
            setStep("details");
        } catch (err) {
            setApiError((err as { message?: string })?.message ?? "Failed to create booking.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        form,
        clubId,
        courtId,
        date,
        startTime,
        isIndividualLesson,
        createMutation,
        queryClient,
        profile?.id,
        onBookingCreated,
        onSuccess,
        onClose,
    ]);

    const invitedIds = form.playerUserIds.filter(Boolean);
    const canInvite = !isIndividualLesson;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <View className="flex-1 bg-background">
                    {/* Header */}
                    <View className="flex-row items-center justify-between bg-card px-5 pb-4 pt-5 shadow-sm">
                        <View className="flex-row items-center gap-3">
                            {step === "invite" ? (
                                <Pressable
                                    onPress={() => setStep("details")}
                                    accessibilityRole="button"
                                    accessibilityLabel="Back"
                                    className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75"
                                >
                                    <Ionicons
                                        name="arrow-back"
                                        size={20}
                                        color={colors.foreground}
                                    />
                                </Pressable>
                            ) : (
                                <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-secondary">
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={colors.cta}
                                    />
                                </View>
                            )}
                            <View>
                                <Text className="text-[18px] font-bold text-foreground">
                                    {step === "invite" ? "Invite Players" : "New Booking"}
                                </Text>
                                <Text className="text-[12px] text-muted-foreground">
                                    {step === "invite"
                                        ? "Add players to this match"
                                        : "Confirm your booking details"}
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75"
                        >
                            <Ionicons name="close" size={20} color={colors.foreground} />
                        </Pressable>
                    </View>

                    <ScrollView
                        contentContainerClassName="pb-[40px] gap-5 pt-5 px-5"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* API Error */}
                        {apiError ? (
                            <View className="flex-row items-center gap-3 rounded-[16px] border border-destructive bg-destructive/10 px-4 py-3">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={18}
                                    color={colors.destructive}
                                />
                                <Text className="flex-1 text-[13px] text-destructive">
                                    {apiError}
                                </Text>
                                <Pressable
                                    onPress={() => setApiError("")}
                                    accessibilityRole="button"
                                    accessibilityLabel="Dismiss error"
                                >
                                    <Ionicons name="close" size={16} color={colors.destructive} />
                                </Pressable>
                            </View>
                        ) : null}

                        {step === "details" ? (
                            <>
                                {/* Booking summary card */}
                                <View className="gap-4 rounded-[20px] bg-card px-4 py-4 shadow-sm">
                                    <Text className="text-[16px] font-bold text-foreground">
                                        Booking Summary
                                    </Text>
                                    <View className="flex-row gap-4">
                                        <CourtThumbnail />
                                        <View className="flex-1 gap-2">
                                            <Text
                                                className="text-[18px] font-bold text-foreground"
                                                numberOfLines={1}
                                            >
                                                {courtName}
                                            </Text>
                                            <SummaryRow
                                                icon="calendar-outline"
                                                value={formattedDate}
                                            />
                                            <SummaryRow icon="time-outline" value={formattedTime} />
                                            <SummaryRow
                                                icon="pricetag-outline"
                                                value={formattedPrice}
                                            />
                                        </View>
                                    </View>
                                    <PriceBreakdown priceQuote={priceQuote} />
                                </View>

                                {/* Booking type */}
                                <BookingTypeSelector
                                    value={form.bookingType}
                                    onChange={(v) => handleFormChange({ bookingType: v })}
                                />

                                {/* Max players */}
                                <MaxPlayersStepper
                                    value={
                                        isIndividualLesson ? 1 : parseInt(form.maxPlayers, 10) || 4
                                    }
                                    min={1}
                                    max={10}
                                    onChange={(v) => handleFormChange({ maxPlayers: String(v) })}
                                    disabled={isIndividualLesson}
                                />

                                {/* Private / invite-only toggle */}
                                {!isIndividualLesson ? (
                                    <ToggleRow
                                        icon="lock-closed-outline"
                                        label="Private / invite-only match"
                                        description="Only invited players can join"
                                        value={!form.isOpenGame}
                                        onChange={(v) => handleFormChange({ isOpenGame: !v })}
                                    />
                                ) : null}

                                {/* Invite & split-cost entry row */}
                                {!isIndividualLesson ? (
                                    <Pressable
                                        onPress={() => setStep("invite")}
                                        accessibilityRole="button"
                                        accessibilityLabel="Invite players and split the cost"
                                        className="flex-row items-center gap-3 rounded-[20px] px-4 py-3.5 active:opacity-80"
                                        style={{ backgroundColor: colors.ctaSurface }}
                                    >
                                        <View
                                            className="h-10 w-10 items-center justify-center rounded-full"
                                            style={{ backgroundColor: colors.cta }}
                                        >
                                            <Ionicons
                                                name="people-outline"
                                                size={18}
                                                color={colors.ctaForeground}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[14px] font-bold text-foreground">
                                                Invite players & split the cost
                                            </Text>
                                            <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                                Easily invite friends and manage payments
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color={colors.mutedForeground}
                                        />
                                    </Pressable>
                                ) : null}

                                {/* Trainer (individual lesson) */}
                                {isLessonType ? (
                                    <View className="gap-3">
                                        <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Trainer
                                        </Text>
                                        <View className="rounded-[20px] bg-card px-4 py-4 shadow-sm">
                                            {trainersLoading ? (
                                                <View className="flex-row items-center gap-2">
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={colors.placeholder}
                                                    />
                                                    <Text className="text-[14px] text-muted-foreground">
                                                        Loading trainers…
                                                    </Text>
                                                </View>
                                            ) : trainersError ? (
                                                <Text className="text-[14px] text-destructive">
                                                    Failed to load trainers
                                                </Text>
                                            ) : trainerOptions.length === 0 ? (
                                                <Text className="text-[14px] text-muted-foreground">
                                                    No trainers available
                                                </Text>
                                            ) : (
                                                <View className="gap-2">
                                                    {trainerOptions.map((opt) => {
                                                        const active =
                                                            opt.value === form.staffProfileId;
                                                        return (
                                                            <Pressable
                                                                key={opt.value}
                                                                onPress={() =>
                                                                    handleFormChange({
                                                                        staffProfileId: opt.value,
                                                                    })
                                                                }
                                                                accessibilityRole="button"
                                                                accessibilityLabel={opt.label}
                                                                accessibilityState={{
                                                                    selected: active,
                                                                }}
                                                                className="flex-row items-center justify-between rounded-[14px] border px-4 py-3 active:opacity-80"
                                                                style={{
                                                                    borderColor: active
                                                                        ? colors.cta
                                                                        : colors.border,
                                                                    backgroundColor: active
                                                                        ? colors.ctaSurface
                                                                        : colors.card,
                                                                }}
                                                            >
                                                                <Text
                                                                    className="text-[14px] font-medium"
                                                                    style={{
                                                                        color: active
                                                                            ? colors.cta
                                                                            : colors.foreground,
                                                                    }}
                                                                >
                                                                    {opt.label}
                                                                </Text>
                                                                {active ? (
                                                                    <Ionicons
                                                                        name="checkmark-circle"
                                                                        size={18}
                                                                        color={colors.cta}
                                                                    />
                                                                ) : null}
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                            {staffError ? (
                                                <Text className="mt-2 text-[12px] text-destructive">
                                                    {staffError}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                ) : null}
                            </>
                        ) : (
                            /* ── Invite players step ── */
                            <View className="gap-4">
                                <View className="gap-3 rounded-[20px] bg-card px-4 py-5 shadow-sm">
                                    <Text className="text-[13px] font-semibold text-foreground">
                                        Invite Players
                                    </Text>
                                    <PlayerSearchField
                                        clubId={clubId}
                                        selectedIds={invitedIds}
                                        onAdd={handleAddPlayer}
                                    />

                                    {invitedIds.length > 0 ? (
                                        <View className="gap-2">
                                            {invitedIds.map((uid) => {
                                                const info = invitedInfo[uid];
                                                const name = info?.full_name ?? "Player";
                                                const label =
                                                    info?.skill_level != null
                                                        ? `${name} (${info.skill_level})`
                                                        : name;
                                                return (
                                                    <View
                                                        key={uid}
                                                        className="flex-row items-center justify-between rounded-[14px] border border-border/60 bg-muted/30 px-4 py-3"
                                                    >
                                                        <Text
                                                            className="flex-1 text-[14px] text-foreground"
                                                            numberOfLines={1}
                                                        >
                                                            {label}
                                                        </Text>
                                                        <Pressable
                                                            onPress={() => handleRemovePlayer(uid)}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Remove ${name}`}
                                                            hitSlop={8}
                                                            className="h-7 w-7 items-center justify-center rounded-full bg-muted active:opacity-75"
                                                        >
                                                            <Ionicons
                                                                name="close"
                                                                size={15}
                                                                color={colors.mutedForeground}
                                                            />
                                                        </Pressable>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <Text className="text-[12px] text-muted-foreground">
                                            Search to add players, or leave seats open for others to
                                            join.
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View className="flex-row gap-3 border-t border-border bg-card px-5 pb-8 pt-4">
                        {step === "details" && canInvite ? (
                            <Pressable
                                onPress={() => setStep("invite")}
                                accessibilityRole="button"
                                accessibilityLabel="Invite players"
                                className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] border border-border bg-card py-4 active:opacity-75"
                            >
                                <Ionicons
                                    name="people-outline"
                                    size={18}
                                    color={colors.foreground}
                                />
                                <Text className="text-[15px] font-bold text-foreground">
                                    Invite Players
                                </Text>
                            </Pressable>
                        ) : null}

                        <Pressable
                            onPress={() => void handleSubmit()}
                            disabled={createMutation.isPending}
                            accessibilityRole="button"
                            accessibilityLabel="Create booking and pay"
                            className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-cta py-4 active:opacity-90 disabled:opacity-60"
                        >
                            {createMutation.isPending ? (
                                <ActivityIndicator size="small" color={colors.ctaForeground} />
                            ) : (
                                <Ionicons
                                    name="calendar-outline"
                                    size={18}
                                    color={colors.ctaForeground}
                                />
                            )}
                            <View className="items-center">
                                <Text className="text-[15px] font-bold text-cta-foreground">
                                    {createMutation.isPending ? "Creating…" : "Create & Pay"}
                                </Text>
                                {!createMutation.isPending && formattedPayable !== "—" ? (
                                    <Text className="text-[12px] font-medium text-cta-foreground/90">
                                        {formattedPayable}
                                    </Text>
                                ) : null}
                            </View>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

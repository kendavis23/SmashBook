import { type JSX, useState, useCallback, useEffect, useRef } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "@repo/player-domain";
import { useThemeColors } from "../../../../theme";
import {
    useCreateBooking,
    useListCourts,
    useGetCourtAvailability,
    useListAvailableTrainers,
} from "../../hooks";
import type { BookingInput, BookingType, TimeSlot, PlayerBookingItem, Booking } from "../../types";
import { formatSlotTime, formatAmount, buildBookingDatetime } from "../../utils/bookingFormatters";

type FormState = {
    courtId: string;
    bookingType: BookingType;
    bookingDate: string;
    startTime: string;
    isOpenGame: boolean;
    maxPlayers: string;
    staffProfileId: string;
    playerUserIds: string[];
};

function createDefaultForm(): FormState {
    return {
        courtId: "",
        bookingType: "regular",
        bookingDate: "",
        startTime: "",
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

/* ── Picker-like row selector ── */
function PickerRow({
    label,
    value,
    placeholder,
    options,
    onChange,
    disabled,
    error,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: { value: string; label: string; disabled?: boolean }[];
    onChange: (v: string) => void;
    disabled?: boolean;
    error?: string;
}): JSX.Element {
    const colors = useThemeColors();
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.value === value);

    return (
        <View className="gap-1.5">
            <Text className="text-[12px] font-semibold text-foreground">{label}</Text>
            <Pressable
                onPress={() => !disabled && setOpen(true)}
                accessibilityRole="combobox"
                accessibilityLabel={label}
                disabled={disabled}
                className="flex-row items-center justify-between rounded-[14px] border border-border bg-card px-4 py-3.5 active:opacity-75"
                style={{
                    borderColor: error ? colors.destructive : colors.border,
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                <Text
                    style={{ color: selected ? colors.foreground : colors.placeholder }}
                    className="flex-1 text-[14px]"
                    numberOfLines={1}
                >
                    {selected?.label ?? placeholder}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.placeholder} />
            </Pressable>
            {error ? <Text className="text-[11px] text-destructive">{error}</Text> : null}

            <Modal visible={open} animationType="slide" transparent>
                <Pressable
                    className="flex-1"
                    style={{ backgroundColor: colors.overlay }}
                    onPress={() => setOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close picker"
                />
                <View className="rounded-t-[24px] bg-card pb-8 pt-4">
                    <View className="mb-2 flex-row items-center justify-between px-5">
                        <Text className="text-[16px] font-bold text-foreground">{label}</Text>
                        <Pressable
                            onPress={() => setOpen(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            className="h-8 w-8 items-center justify-center rounded-full bg-muted"
                        >
                            <Ionicons name="close" size={18} color={colors.foreground} />
                        </Pressable>
                    </View>
                    <ScrollView>
                        {options.map((opt) => (
                            <Pressable
                                key={opt.value}
                                onPress={() => {
                                    if (!opt.disabled) {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }
                                }}
                                accessibilityRole="menuitem"
                                accessibilityLabel={opt.label}
                                disabled={opt.disabled}
                                className="flex-row items-center justify-between px-5 py-4 active:bg-muted"
                                style={{ opacity: opt.disabled ? 0.4 : 1 }}
                            >
                                <Text
                                    style={{
                                        color: opt.value === value ? colors.cta : colors.foreground,
                                    }}
                                    className="text-[14px] font-medium"
                                >
                                    {opt.label}
                                </Text>
                                {opt.value === value ? (
                                    <Ionicons name="checkmark" size={18} color={colors.cta} />
                                ) : null}
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

/* ── Date input ── */
function DateInput({
    label,
    value,
    onChange,
    disabled,
    error,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    error?: string;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="gap-1.5">
            <Text className="text-[12px] font-semibold text-foreground">{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
                editable={!disabled}
                accessibilityLabel={label}
                className="rounded-[14px] border border-border bg-card px-4 py-3.5 text-[14px] text-foreground"
                style={{
                    borderColor: error ? colors.destructive : colors.border,
                    opacity: disabled ? 0.5 : 1,
                }}
            />
            {error ? <Text className="text-[11px] text-destructive">{error}</Text> : null}
        </View>
    );
}

/* ── Number stepper ── */
function NumberStepper({
    label,
    value,
    min,
    max,
    onChange,
    disabled,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <View className="gap-1.5">
            <Text className="text-[12px] font-semibold text-foreground">{label}</Text>
            <View className="flex-row items-center gap-3">
                <Pressable
                    onPress={() => onChange(Math.max(min, value - 1))}
                    disabled={disabled || value <= min}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease"
                    className="h-11 w-11 items-center justify-center rounded-[12px] border border-border bg-card active:opacity-75 disabled:opacity-40"
                >
                    <Ionicons name="remove" size={18} color={colors.foreground} />
                </Pressable>
                <Text className="min-w-[32px] text-center text-[16px] font-bold text-foreground">
                    {value}
                </Text>
                <Pressable
                    onPress={() => onChange(Math.min(max, value + 1))}
                    disabled={disabled || value >= max}
                    accessibilityRole="button"
                    accessibilityLabel="Increase"
                    className="h-11 w-11 items-center justify-center rounded-[12px] border border-border bg-card active:opacity-75 disabled:opacity-40"
                >
                    <Ionicons name="add" size={18} color={colors.foreground} />
                </Pressable>
            </View>
        </View>
    );
}

/* ── Toggle ── */
function ToggleRow({
    label,
    description,
    value,
    onChange,
}: {
    label: string;
    description?: string;
    value: boolean;
    onChange: (v: boolean) => void;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityState={{ checked: value }}
            className="flex-row items-center justify-between rounded-[16px] border border-border bg-card px-4 py-4 active:opacity-75"
        >
            <View className="flex-1 pr-4">
                <Text className="text-[14px] font-semibold text-foreground">{label}</Text>
                {description ? (
                    <Text className="mt-0.5 text-[12px] text-muted-foreground">{description}</Text>
                ) : null}
            </View>
            <View
                style={{
                    backgroundColor: value ? colors.cta : colors.border,
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    padding: 3,
                }}
            >
                <View
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: colors.card,
                        transform: [{ translateX: value ? 18 : 0 }],
                    }}
                />
            </View>
        </Pressable>
    );
}

type Props = {
    visible: boolean;
    clubId: string | null;
    onClose: () => void;
    onBookingCreated: (booking: PlayerBookingItem) => void;
    onSuccess: () => void;
};

export function NewBookingSheet({
    visible,
    clubId,
    onClose,
    onBookingCreated,
    onSuccess,
}: Props): JSX.Element {
    const queryClient = useQueryClient();
    const colors = useThemeColors();
    const { data: profile } = useMyProfile();
    const [form, setForm] = useState<FormState>(createDefaultForm);
    const [courtError, setCourtError] = useState("");
    const [dateError, setDateError] = useState("");
    const [staffError, setStaffError] = useState("");
    const [apiError, setApiError] = useState("");

    const { data: courts = [] } = useListCourts(clubId ?? "");
    const courtList = courts as { id: string; name: string }[];

    // Auto-select first court
    useEffect(() => {
        if (courtList.length > 0 && !form.courtId) {
            setForm((prev) => ({ ...prev, courtId: courtList[0]?.id ?? "" }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courtList]);

    const {
        data: availabilityData,
        isLoading: slotsLoading,
        refetch: refetchSlots,
    } = useGetCourtAvailability(form.courtId, form.bookingDate);
    const slots = (availabilityData?.slots ?? []) as TimeSlot[];
    const selectedSlot = slots.find((s) => s.start_time === form.startTime);
    const selectedPrice = selectedSlot?.price ?? null;

    // Auto-select first available slot
    const prevAvailabilityRef = useRef(availabilityData);
    useEffect(() => {
        if (slotsLoading || slots.length === 0) return;
        if (availabilityData === prevAvailabilityRef.current) return;
        prevAvailabilityRef.current = availabilityData;
        const first = slots.find((s) => s.is_available);
        setForm((prev) => ({ ...prev, startTime: first?.start_time ?? "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availabilityData, slotsLoading]);

    const isLessonType =
        form.bookingType === "lesson_individual" || form.bookingType === "lesson_group";
    const isIndividualLesson = form.bookingType === "lesson_individual";

    const {
        data: trainerData = [],
        isLoading: trainersLoading,
        isError: trainersError,
    } = useListAvailableTrainers({
        clubId: isLessonType ? (clubId ?? "") : "",
        date: form.bookingDate,
        startTime: form.startTime,
        endTime: selectedSlot?.end_time ?? "",
    });

    const trainerOptions = (trainerData as { staff_profile_id: string; full_name: string }[])
        .map((t) => ({
            value: t.staff_profile_id,
            label: t.full_name,
        }))
        .filter((o) => o.value.length > 0);

    const createMutation = useCreateBooking(clubId ?? "");

    const handleFormChange = useCallback((patch: Partial<FormState>) => {
        setForm((prev) => {
            const next = { ...prev, ...patch };
            if (patch.bookingType !== undefined) {
                next.isOpenGame = false;
                if (patch.bookingType === "lesson_individual") {
                    next.maxPlayers = "1";
                    next.playerUserIds = [];
                }
            }
            if (patch.courtId !== undefined) {
                next.bookingDate = "";
                next.startTime = "";
            }
            if (patch.bookingDate !== undefined) next.startTime = "";
            return next;
        });
        if (patch.courtId !== undefined) setCourtError("");
        if (patch.bookingDate !== undefined || patch.startTime !== undefined) setDateError("");
        if (patch.staffProfileId !== undefined) setStaffError("");
        setApiError("");
    }, []);

    const validate = (): boolean => {
        let valid = true;
        if (!form.courtId) {
            setCourtError("Court is required.");
            valid = false;
        }
        if (!form.bookingDate || !form.startTime) {
            setDateError("Date and start time are required.");
            valid = false;
        }
        if (isIndividualLesson && !form.staffProfileId.trim()) {
            setStaffError("Trainer is required for individual lessons.");
            valid = false;
        }
        return valid;
    };

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;

        const startDatetime = buildBookingDatetime(form.bookingDate, form.startTime);
        const payload: BookingInput = {
            club_id: clubId ?? "",
            court_id: form.courtId,
            booking_type: form.bookingType,
            start_datetime: startDatetime,
            is_open_game: form.isOpenGame,
            max_players: parseOptionalNumber(form.maxPlayers) ?? undefined,
            player_user_ids:
                form.playerUserIds.filter(Boolean).length > 0
                    ? form.playerUserIds.filter(Boolean)
                    : undefined,
            staff_profile_id: form.staffProfileId.trim() || null,
        };

        try {
            const booking = await createMutation.mutateAsync(payload);
            const createdBooking = booking as Booking;
            void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });

            const payable = getPayableBookingForUser(createdBooking, profile?.id);
            if (payable) {
                onBookingCreated(payable);
                onClose();
            } else {
                onSuccess();
                onClose();
            }
            setForm(createDefaultForm());
        } catch (err) {
            setApiError((err as { message?: string })?.message ?? "Failed to create booking.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        form,
        clubId,
        createMutation,
        queryClient,
        profile?.id,
        onBookingCreated,
        onSuccess,
        onClose,
    ]);

    const slotOptions = slots.map((s) => ({
        value: s.start_time,
        label: formatSlotTime(s.start_time) + (!s.is_available ? " — Booked" : ""),
        disabled: !s.is_available,
    }));

    const courtOptions = courtList.map((c) => ({ value: c.id, label: c.name }));
    const typeOptions = [
        { value: "regular", label: "Regular" },
        { value: "lesson_individual", label: "Individual Lesson" },
    ];

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
                            <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-secondary">
                                <Ionicons name="calendar-outline" size={20} color={colors.cta} />
                            </View>
                            <View>
                                <Text className="text-[18px] font-bold text-foreground">
                                    New Booking
                                </Text>
                                <Text className="text-[12px] text-muted-foreground">
                                    Book a court session
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

                        {/* Section: Court & Type */}
                        <View className="gap-3">
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Court Details
                            </Text>
                            <View className="gap-4 rounded-[20px] bg-card px-4 py-4 shadow-sm">
                                <PickerRow
                                    label="Court *"
                                    value={form.courtId}
                                    placeholder={
                                        courtList.length === 0
                                            ? "No courts available"
                                            : "Select court…"
                                    }
                                    options={courtOptions}
                                    onChange={(v) => handleFormChange({ courtId: v })}
                                    disabled={courtList.length === 0}
                                    error={courtError}
                                />
                                <PickerRow
                                    label="Booking Type"
                                    value={form.bookingType}
                                    placeholder="Select type…"
                                    options={typeOptions}
                                    onChange={(v) =>
                                        handleFormChange({
                                            bookingType: v as BookingType,
                                            maxPlayers: v === "lesson_individual" ? "1" : "4",
                                        })
                                    }
                                />
                            </View>
                        </View>

                        {/* Section: Date & Time */}
                        <View className="gap-3">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Schedule
                                </Text>
                                {form.courtId && form.bookingDate ? (
                                    <Pressable
                                        onPress={() => void refetchSlots()}
                                        disabled={slotsLoading}
                                        accessibilityRole="button"
                                        accessibilityLabel="Refresh available slots"
                                        className="flex-row items-center gap-1 active:opacity-75"
                                    >
                                        <Ionicons
                                            name="refresh-outline"
                                            size={14}
                                            color={slotsLoading ? colors.placeholder : colors.cta}
                                        />
                                        <Text
                                            style={{
                                                color: slotsLoading
                                                    ? colors.placeholder
                                                    : colors.cta,
                                            }}
                                            className="text-[12px] font-medium"
                                        >
                                            Refresh
                                        </Text>
                                    </Pressable>
                                ) : null}
                            </View>
                            <View className="gap-4 rounded-[20px] bg-card px-4 py-4 shadow-sm">
                                <DateInput
                                    label="Date *"
                                    value={form.bookingDate}
                                    onChange={(v) => handleFormChange({ bookingDate: v })}
                                    disabled={!form.courtId}
                                    error={dateError && !form.bookingDate ? dateError : undefined}
                                />

                                {!form.courtId || !form.bookingDate ? (
                                    <View className="gap-1.5">
                                        <Text className="text-[12px] font-semibold text-foreground">
                                            Start Time *
                                        </Text>
                                        <View className="rounded-[14px] border border-border bg-muted px-4 py-3.5">
                                            <Text className="text-[14px] text-muted-foreground">
                                                {!form.courtId
                                                    ? "Select a court first"
                                                    : "Enter a date first"}
                                            </Text>
                                        </View>
                                    </View>
                                ) : slotsLoading ? (
                                    <View className="gap-1.5">
                                        <Text className="text-[12px] font-semibold text-foreground">
                                            Start Time *
                                        </Text>
                                        <View className="flex-row items-center gap-2 rounded-[14px] border border-border bg-muted px-4 py-3.5">
                                            <ActivityIndicator
                                                size="small"
                                                color={colors.placeholder}
                                            />
                                            <Text className="text-[14px] text-muted-foreground">
                                                Loading slots…
                                            </Text>
                                        </View>
                                    </View>
                                ) : slots.length === 0 ? (
                                    <View className="gap-1.5">
                                        <Text className="text-[12px] font-semibold text-foreground">
                                            Start Time *
                                        </Text>
                                        <View className="rounded-[14px] border border-border bg-muted px-4 py-3.5">
                                            <Text className="text-[14px] text-muted-foreground">
                                                No slots available
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <PickerRow
                                        label="Start Time *"
                                        value={form.startTime}
                                        placeholder="Select time…"
                                        options={slotOptions}
                                        onChange={(v) => handleFormChange({ startTime: v })}
                                        error={dateError && !form.startTime ? dateError : undefined}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Section: Price preview */}
                        {form.startTime && selectedPrice !== null ? (
                            <View className="flex-row items-center justify-between rounded-[20px] border border-cta/30 bg-secondary px-5 py-4">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-cta/20">
                                        <Ionicons
                                            name="cash-outline"
                                            size={18}
                                            color={colors.cta}
                                        />
                                    </View>
                                    <Text className="text-[13px] font-semibold text-cta">
                                        Estimated Price
                                    </Text>
                                </View>
                                <Text className="text-[20px] font-bold text-cta">
                                    {formatAmount(selectedPrice)}
                                </Text>
                            </View>
                        ) : null}

                        {/* Section: Options */}
                        <View className="gap-3">
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Options
                            </Text>
                            <View className="gap-4 rounded-[20px] bg-card px-4 py-4 shadow-sm">
                                <NumberStepper
                                    label="Max Players"
                                    value={
                                        isIndividualLesson ? 1 : parseInt(form.maxPlayers, 10) || 4
                                    }
                                    min={1}
                                    max={10}
                                    onChange={(v) => handleFormChange({ maxPlayers: String(v) })}
                                    disabled={isIndividualLesson}
                                />

                                {!isIndividualLesson ? (
                                    <ToggleRow
                                        label="Private / invite-only match"
                                        description="Only invited players can join"
                                        value={!form.isOpenGame}
                                        onChange={(v) => handleFormChange({ isOpenGame: !v })}
                                    />
                                ) : null}
                            </View>
                        </View>

                        {/* Trainer selection (lesson types) */}
                        {isLessonType ? (
                            <View className="gap-3">
                                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Trainer
                                </Text>
                                <View className="rounded-[20px] bg-card px-4 py-4 shadow-sm">
                                    {!form.startTime ? (
                                        <View className="gap-1.5">
                                            <Text className="text-[12px] font-semibold text-foreground">
                                                Trainer {isIndividualLesson ? "*" : ""}
                                            </Text>
                                            <View className="rounded-[14px] border border-border bg-muted px-4 py-3.5">
                                                <Text className="text-[14px] text-muted-foreground">
                                                    Select a time slot first
                                                </Text>
                                            </View>
                                        </View>
                                    ) : trainersLoading ? (
                                        <View className="flex-row items-center gap-2 rounded-[14px] border border-border bg-muted px-4 py-3.5">
                                            <ActivityIndicator
                                                size="small"
                                                color={colors.placeholder}
                                            />
                                            <Text className="text-[14px] text-muted-foreground">
                                                Loading trainers…
                                            </Text>
                                        </View>
                                    ) : trainersError ? (
                                        <View className="rounded-[14px] border border-destructive bg-destructive/10 px-4 py-3.5">
                                            <Text className="text-[14px] text-destructive">
                                                Failed to load trainers
                                            </Text>
                                        </View>
                                    ) : (
                                        <PickerRow
                                            label={`Trainer${isIndividualLesson ? " *" : ""}`}
                                            value={form.staffProfileId}
                                            placeholder={
                                                trainerOptions.length === 0
                                                    ? "No trainers available"
                                                    : "Select trainer…"
                                            }
                                            options={trainerOptions}
                                            onChange={(v) =>
                                                handleFormChange({ staffProfileId: v })
                                            }
                                            disabled={trainerOptions.length === 0}
                                            error={staffError}
                                        />
                                    )}
                                </View>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* Submit footer */}
                    <View className="border-t border-border bg-card px-5 pb-8 pt-4">
                        <Pressable
                            onPress={() => void handleSubmit()}
                            disabled={createMutation.isPending}
                            accessibilityRole="button"
                            accessibilityLabel="Create booking and pay"
                            className="flex-row items-center justify-center gap-2 rounded-[16px] bg-cta py-4 active:opacity-90 disabled:opacity-60"
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
                            <Text className="text-[15px] font-bold text-cta-foreground">
                                {createMutation.isPending ? "Creating…" : "Create & Pay"}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

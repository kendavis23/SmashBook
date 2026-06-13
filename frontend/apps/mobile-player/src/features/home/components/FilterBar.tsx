import { type ComponentProps, type JSX, useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerAndroid,
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SURFACE_OPTIONS } from "../types";
import { useThemeColors } from "../../../theme";
import { isoDateParts, isoDateToWeekdayShort } from "../../../lib/datetime";
import { formatPlainTime } from "../utils";

type Props = {
    date: string;
    onDateChange: (v: string) => void;
} & FilterControlProps;

type FilterControlProps = {
    surface: string;
    fromTime: string;
    toTime: string;
    showAvailableSlot: boolean;
    showOpenGame: boolean;
    onSurfaceChange: (v: string) => void;
    onFromTimeChange: (v: string) => void;
    onToTimeChange: (v: string) => void;
    onToggleAvailable: (v: boolean) => void;
    onToggleOpenGame: (v: boolean) => void;
};

type IconName = ComponentProps<typeof Ionicons>["name"];
type DateOption = {
    iso: string;
    topLabel: string;
    shortLabel: string;
    bottomLabel: string;
};

function buildDateOption(offset: number): DateOption {
    const ms = Date.now() + offset * 86_400_000;
    const iso = new Date(ms).toISOString().slice(0, 10);
    const weekday = isoDateToWeekdayShort(iso);
    const { day } = isoDateParts(iso);

    const topLabel =
        offset === 0 ? "TOD" : offset === 1 ? "TOM" : weekday.toUpperCase().slice(0, 3);
    const bottomLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1);

    return {
        iso,
        topLabel,
        shortLabel: String(day),
        bottomLabel,
    };
}

function buildDateOptionFromIso(iso: string): DateOption {
    const weekday = isoDateToWeekdayShort(iso);
    const { day } = isoDateParts(iso);

    return {
        iso,
        topLabel: weekday.toUpperCase().slice(0, 3),
        shortLabel: String(day),
        bottomLabel: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    };
}

function FilterChip({
    label,
    active,
    onPress,
    icon,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon?: IconName;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            className="active:opacity-75"
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: active ? colors.cta : colors.card,
                borderWidth: 1.5,
                borderColor: active ? colors.cta : colors.border,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                minHeight: 48,
            }}
        >
            {icon ? (
                <Ionicons
                    name={icon}
                    size={18}
                    color={active ? colors.ctaForeground : colors.mutedForeground}
                />
            ) : null}
            <Text
                style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: active ? colors.ctaForeground : colors.foreground,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function surfaceIcon(value: string): IconName {
    if (value === "indoor") return "home-outline";
    if (value === "outdoor") return "sunny-outline";
    if (value === "crystal") return "diamond-outline";
    return "leaf-outline";
}

function timeStringToDate(value: string): Date {
    const now = new Date();
    const [hourString, minuteString] = value.split(":");

    if (hourString !== undefined && minuteString !== undefined) {
        now.setHours(Number(hourString), Number(minuteString), 0, 0);
        return now;
    }

    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(roundedMinutes, 0, 0);
    return now;
}

function dateToTimeString(value: Date): string {
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function TimeField({
    label,
    value,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
}): JSX.Element {
    const colors = useThemeColors();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pendingTime, setPendingTime] = useState(() => timeStringToDate(value));

    const openPicker = (): void => {
        const pickerValue = timeStringToDate(value);
        setPendingTime(pickerValue);

        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: pickerValue,
                mode: "time",
                display: "clock",
                is24Hour: false,
                onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
                    if (event.type === "set" && selectedTime) {
                        onChange(dateToTimeString(selectedTime));
                    }
                },
            });
            return;
        }

        setIsPickerOpen(true);
    };

    const confirmIosTime = (): void => {
        onChange(dateToTimeString(pendingTime));
        setIsPickerOpen(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <Text
                style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.mutedForeground,
                    marginBottom: 8,
                }}
            >
                {label}
            </Text>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: 52,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: value ? colors.cta : colors.border,
                    backgroundColor: value ? colors.ctaSurface : colors.card,
                }}
            >
                <Pressable
                    onPress={openPicker}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} time filter`}
                    accessibilityHint="Opens the time picker"
                    className="active:opacity-70"
                    style={{
                        flex: 1,
                        minHeight: 49,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingLeft: 14,
                        paddingRight: value ? 4 : 14,
                    }}
                >
                    <Ionicons
                        name="time-outline"
                        size={19}
                        color={value ? colors.cta : colors.mutedForeground}
                    />
                    <Text
                        numberOfLines={1}
                        style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: "700",
                            color: value ? colors.cta : colors.placeholder,
                        }}
                    >
                        {value ? formatPlainTime(value) : placeholder}
                    </Text>
                </Pressable>
                {value ? (
                    <Pressable
                        onPress={() => onChange("")}
                        accessibilityRole="button"
                        accessibilityLabel={`Clear ${label.toLowerCase()} time`}
                        hitSlop={8}
                        className="active:opacity-60"
                        style={{
                            width: 40,
                            minHeight: 49,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                    </Pressable>
                ) : null}
            </View>

            {Platform.OS === "ios" ? (
                <Modal
                    visible={isPickerOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsPickerOpen(false)}
                >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: "center",
                            paddingHorizontal: 24,
                            backgroundColor: colors.overlay,
                        }}
                    >
                        <Pressable
                            onPress={() => setIsPickerOpen(false)}
                            style={{ position: "absolute", inset: 0 }}
                        />
                        <View
                            style={{
                                borderRadius: 24,
                                backgroundColor: colors.card,
                                paddingTop: 18,
                                paddingBottom: 14,
                                overflow: "hidden",
                            }}
                        >
                            <Text
                                style={{
                                    paddingHorizontal: 20,
                                    fontSize: 18,
                                    fontWeight: "700",
                                    color: colors.foreground,
                                }}
                            >
                                Select {label.toLowerCase()} time
                            </Text>
                            <DateTimePicker
                                value={pendingTime}
                                mode="time"
                                display="spinner"
                                is24Hour={false}
                                minuteInterval={5}
                                onChange={(_event, selectedTime) => {
                                    if (selectedTime) setPendingTime(selectedTime);
                                }}
                                textColor={colors.foreground}
                                accentColor={colors.cta}
                                themeVariant="light"
                                style={{ height: 180 }}
                            />
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "flex-end",
                                    gap: 8,
                                    paddingHorizontal: 14,
                                }}
                            >
                                <Pressable
                                    onPress={() => setIsPickerOpen(false)}
                                    accessibilityRole="button"
                                    className="active:opacity-60"
                                    style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            fontWeight: "700",
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={confirmIosTime}
                                    accessibilityRole="button"
                                    className="active:opacity-80"
                                    style={{
                                        borderRadius: 12,
                                        backgroundColor: colors.cta,
                                        paddingHorizontal: 18,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            fontWeight: "700",
                                            color: colors.ctaForeground,
                                        }}
                                    >
                                        Done
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            ) : null}
        </View>
    );
}

export function FilterButton({
    surface,
    fromTime,
    toTime,
    showAvailableSlot,
    showOpenGame,
    onSurfaceChange,
    onFromTimeChange,
    onToTimeChange,
    onToggleAvailable,
    onToggleOpenGame,
}: FilterControlProps): JSX.Element {
    const colors = useThemeColors();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Draft state — the sheet edits these locally; nothing reaches the parent
    // (and thus the availability API) until "Apply Filters" is pressed.
    const [draftSurface, setDraftSurface] = useState(surface);
    const [draftFromTime, setDraftFromTime] = useState(fromTime);
    const [draftToTime, setDraftToTime] = useState(toTime);
    const [draftShowAvailable, setDraftShowAvailable] = useState(showAvailableSlot);
    const [draftShowOpenGame, setDraftShowOpenGame] = useState(showOpenGame);

    // Re-seed the draft from the applied filters each time the sheet opens, so
    // a dismissed-without-apply session doesn't leak stale drafts into the next.
    useEffect(() => {
        if (!isSheetOpen) return;
        setDraftSurface(surface);
        setDraftFromTime(fromTime);
        setDraftToTime(toTime);
        setDraftShowAvailable(showAvailableSlot);
        setDraftShowOpenGame(showOpenGame);
    }, [isSheetOpen, surface, fromTime, toTime, showAvailableSlot, showOpenGame]);

    // Closed-pill badge reflects the *applied* filters.
    const appliedSlotTypeChanged = !showAvailableSlot || !showOpenGame;
    const activeFilterCount = [
        surface,
        fromTime,
        toTime,
        appliedSlotTypeChanged ? "slotType" : "",
    ].filter(Boolean).length;
    const hasActiveFilter = activeFilterCount > 0;

    // Apply button enables only when the draft differs from what's applied.
    const draftDiffersFromApplied =
        draftSurface !== surface ||
        draftFromTime !== fromTime ||
        draftToTime !== toTime ||
        draftShowAvailable !== showAvailableSlot ||
        draftShowOpenGame !== showOpenGame;

    const handleToggleDraftAvailable = (v: boolean): void => {
        if (!v && !draftShowOpenGame) return;
        setDraftShowAvailable(v);
    };

    const handleToggleDraftOpenGame = (v: boolean): void => {
        if (!v && !draftShowAvailable) return;
        setDraftShowOpenGame(v);
    };

    const handleReset = (): void => {
        setDraftSurface("");
        setDraftFromTime("");
        setDraftToTime("");
        setDraftShowAvailable(true);
        setDraftShowOpenGame(true);
    };

    const handleApply = (): void => {
        onSurfaceChange(draftSurface);
        onFromTimeChange(draftFromTime);
        onToTimeChange(draftToTime);
        onToggleAvailable(draftShowAvailable);
        onToggleOpenGame(draftShowOpenGame);
        setIsSheetOpen(false);
    };

    return (
        <>
            <Pressable
                onPress={() => setIsSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open filters"
                className="active:opacity-75"
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: hasActiveFilter ? colors.ctaBorder : colors.border,
                    backgroundColor: hasActiveFilter ? colors.cta : colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Ionicons
                    name="options-outline"
                    size={18}
                    color={hasActiveFilter ? colors.ctaForeground : colors.foreground}
                />
                {hasActiveFilter ? (
                    <View
                        style={{
                            position: "absolute",
                            top: -3,
                            right: -3,
                            minWidth: 17,
                            height: 17,
                            borderRadius: 8.5,
                            backgroundColor: colors.foreground,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingHorizontal: 5,
                        }}
                    >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: colors.background }}>
                            {activeFilterCount}
                        </Text>
                    </View>
                ) : null}
            </Pressable>

            <Modal
                visible={isSheetOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSheetOpen(false)}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: "flex-end",
                        backgroundColor: colors.overlay,
                    }}
                >
                    <Pressable onPress={() => setIsSheetOpen(false)} style={{ flex: 1 }} />
                    <View
                        style={{
                            backgroundColor: colors.card,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            overflow: "hidden",
                            paddingHorizontal: 20,
                            paddingTop: 10,
                            paddingBottom: 24,
                            shadowColor: colors.shadow,
                            shadowOpacity: 0.16,
                            shadowRadius: 20,
                            shadowOffset: { width: 0, height: -8 },
                            elevation: 18,
                        }}
                    >
                        <View style={{ alignItems: "center", marginBottom: 14 }}>
                            <View
                                style={{
                                    width: 40,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: colors.border,
                                }}
                            />
                        </View>

                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 20,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 22,
                                    fontWeight: "700",
                                    color: colors.foreground,
                                }}
                            >
                                Filters
                            </Text>
                            <Pressable
                                onPress={handleReset}
                                accessibilityRole="button"
                                accessibilityLabel="Reset filters"
                                hitSlop={10}
                                className="active:opacity-60"
                            >
                                <Text
                                    style={{ fontSize: 15, fontWeight: "700", color: colors.cta }}
                                >
                                    Reset
                                </Text>
                            </Pressable>
                        </View>

                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: colors.foreground,
                                marginBottom: 12,
                            }}
                        >
                            Court Type
                        </Text>
                        <View
                            style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 10,
                                marginBottom: 22,
                            }}
                        >
                            <View style={{ width: "48%" }}>
                                <FilterChip
                                    label="All"
                                    active={!draftSurface}
                                    icon="grid-outline"
                                    onPress={() => setDraftSurface("")}
                                />
                            </View>
                            {SURFACE_OPTIONS.map((opt) => (
                                <View key={opt.value} style={{ width: "48%" }}>
                                    <FilterChip
                                        label={opt.label}
                                        active={draftSurface === opt.value}
                                        icon={surfaceIcon(opt.value)}
                                        onPress={() => setDraftSurface(opt.value)}
                                    />
                                </View>
                            ))}
                        </View>

                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: colors.foreground,
                                marginBottom: 12,
                            }}
                        >
                            Availability
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}>
                            <View style={{ flex: 1 }}>
                                <FilterChip
                                    label="Available"
                                    active={draftShowAvailable}
                                    icon="ellipse"
                                    onPress={() => handleToggleDraftAvailable(!draftShowAvailable)}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <FilterChip
                                    label="Open Game"
                                    active={draftShowOpenGame}
                                    icon="people-outline"
                                    onPress={() => handleToggleDraftOpenGame(!draftShowOpenGame)}
                                />
                            </View>
                        </View>

                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: colors.foreground,
                                marginBottom: 12,
                            }}
                        >
                            Time
                        </Text>
                        <View style={{ flexDirection: "row", gap: 12, marginBottom: 22 }}>
                            <TimeField
                                label="From"
                                value={draftFromTime}
                                placeholder="Anytime"
                                onChange={setDraftFromTime}
                            />
                            <TimeField
                                label="To"
                                value={draftToTime}
                                placeholder="Anytime"
                                onChange={setDraftToTime}
                            />
                        </View>

                        <Pressable
                            onPress={handleApply}
                            disabled={!draftDiffersFromApplied}
                            accessibilityRole="button"
                            accessibilityLabel="Apply filters"
                            accessibilityState={{ disabled: !draftDiffersFromApplied }}
                            className="active:opacity-85"
                            style={{
                                height: 56,
                                borderRadius: 18,
                                backgroundColor: draftDiffersFromApplied
                                    ? colors.cta
                                    : colors.muted,
                                alignItems: "center",
                                justifyContent: "center",
                                shadowColor: draftDiffersFromApplied ? colors.cta : "transparent",
                                shadowOpacity: draftDiffersFromApplied ? 0.22 : 0,
                                shadowRadius: draftDiffersFromApplied ? 12 : 0,
                                shadowOffset: { width: 0, height: 8 },
                                elevation: draftDiffersFromApplied ? 8 : 0,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: draftDiffersFromApplied
                                        ? colors.ctaForeground
                                        : colors.mutedForeground,
                                }}
                            >
                                Apply Filters
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
}

export function FilterBar({ date, onDateChange }: Props): JSX.Element {
    const colors = useThemeColors();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const quickDays = Array.from({ length: 7 }, (_, index) => buildDateOption(index));
    const calendarDays = Array.from({ length: 35 }, (_, index) => buildDateOption(index));
    const quickDaysWithSelection = quickDays.some((day) => day.iso === date)
        ? quickDays
        : [buildDateOptionFromIso(date), ...quickDays];

    return (
        <View>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                }}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ gap: 6 }}
                >
                    {quickDaysWithSelection.map((day) => {
                        const isSelected = date === day.iso;
                        return (
                            <Pressable
                                key={day.iso}
                                onPress={() => onDateChange(day.iso)}
                                accessibilityRole="button"
                                accessibilityLabel={`Select date ${day.topLabel} ${day.shortLabel}`}
                                accessibilityState={{ selected: isSelected }}
                                className="active:opacity-75"
                                style={{ marginRight: 6 }}
                            >
                                <View
                                    style={{
                                        backgroundColor: isSelected ? colors.cta : colors.card,
                                        borderWidth: 1,
                                        borderColor: isSelected ? colors.cta : colors.border,
                                        borderRadius: 14,
                                        width: 54,
                                        paddingVertical: 8,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        elevation: 0,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 9,
                                            fontWeight: "600",
                                            color: isSelected
                                                ? colors.heroMuted
                                                : colors.mutedForeground,
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {day.topLabel}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            fontWeight: "700",
                                            color: isSelected
                                                ? colors.ctaForeground
                                                : colors.foreground,
                                            marginTop: 1,
                                            letterSpacing: -0.3,
                                        }}
                                    >
                                        {day.shortLabel}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 9,
                                            fontWeight: "500",
                                            color: isSelected
                                                ? colors.heroMuted
                                                : colors.mutedForeground,
                                            marginTop: 1,
                                        }}
                                    >
                                        {day.bottomLabel}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <Pressable
                    onPress={() => setIsCalendarOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Open calendar"
                    className="active:opacity-75"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                    }}
                >
                    <Ionicons
                        name="calendar-clear-outline"
                        size={18}
                        color={colors.mutedForeground}
                    />
                </Pressable>
            </View>

            <Modal
                visible={isCalendarOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsCalendarOpen(false)}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: "flex-end",
                        backgroundColor: colors.overlay,
                    }}
                >
                    <Pressable onPress={() => setIsCalendarOpen(false)} style={{ flex: 1 }} />
                    <View
                        style={{
                            backgroundColor: colors.card,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            overflow: "hidden",
                            paddingHorizontal: 20,
                            paddingTop: 10,
                            paddingBottom: 32,
                            shadowColor: colors.shadow,
                            shadowOpacity: 0.18,
                            shadowRadius: 24,
                            shadowOffset: { width: 0, height: -8 },
                            elevation: 20,
                        }}
                    >
                        {/* Drag handle */}
                        <View style={{ alignItems: "center", marginBottom: 18 }}>
                            <View
                                style={{
                                    width: 36,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: colors.border,
                                }}
                            />
                        </View>

                        {/* Header */}
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                marginBottom: 24,
                            }}
                        >
                            <View>
                                <Text
                                    style={{
                                        fontSize: 24,
                                        fontWeight: "800",
                                        color: colors.foreground,
                                        letterSpacing: -0.5,
                                    }}
                                >
                                    Select Date
                                </Text>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        marginTop: 4,
                                    }}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={12}
                                        color={colors.mutedForeground}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "500",
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        Next 35 days available
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={() => setIsCalendarOpen(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close calendar"
                                hitSlop={10}
                                className="active:opacity-60"
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 19,
                                    backgroundColor: colors.muted,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Ionicons name="close" size={18} color={colors.foreground} />
                            </Pressable>
                        </View>

                        {/* Day-of-week header row */}
                        <View
                            style={{
                                flexDirection: "row",
                                marginBottom: 8,
                            }}
                        >
                            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: "700",
                                            color: colors.mutedForeground,
                                            letterSpacing: 0.3,
                                        }}
                                    >
                                        {d}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar grid — 7 columns */}
                        <View>
                            {Array.from(
                                { length: Math.ceil(calendarDays.length / 7) },
                                (_, week) => (
                                    <View
                                        key={week}
                                        style={{
                                            flexDirection: "row",
                                            marginBottom: 6,
                                        }}
                                    >
                                        {calendarDays.slice(week * 7, week * 7 + 7).map((day) => {
                                            const isSelected = day.iso === date;
                                            const isToday = day.topLabel === "TOD";
                                            return (
                                                <Pressable
                                                    key={day.iso}
                                                    onPress={() => {
                                                        onDateChange(day.iso);
                                                        setIsCalendarOpen(false);
                                                    }}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Select ${day.topLabel} ${day.shortLabel}`}
                                                    accessibilityState={{ selected: isSelected }}
                                                    className="active:opacity-70"
                                                    style={{ flex: 1, alignItems: "center" }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 44,
                                                            height: 44,
                                                            borderRadius: 22,
                                                            overflow: "hidden",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            backgroundColor: isSelected
                                                                ? colors.cta
                                                                : isToday
                                                                  ? colors.ctaSurface
                                                                  : "transparent",
                                                            borderWidth: isSelected
                                                                ? 0
                                                                : isToday
                                                                  ? 1.5
                                                                  : 0,
                                                            borderColor: colors.ctaBorder,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 17,
                                                                fontWeight:
                                                                    isSelected || isToday
                                                                        ? "800"
                                                                        : "600",
                                                                color: isSelected
                                                                    ? colors.ctaForeground
                                                                    : isToday
                                                                      ? colors.cta
                                                                      : colors.foreground,
                                                                letterSpacing: -0.3,
                                                            }}
                                                        >
                                                            {day.shortLabel}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

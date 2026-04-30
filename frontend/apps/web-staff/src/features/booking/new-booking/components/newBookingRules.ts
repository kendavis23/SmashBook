import type { BookingType } from "../../types";

export const INDIVIDUAL_LESSON_MAX_PLAYERS = "1";
export const DEFAULT_MAX_PLAYERS_LIMIT = 10;
export const INDIVIDUAL_LESSON_MAX_PLAYERS_LIMIT = 1;
export const INDIVIDUAL_LESSON_MAX_PLAYERS_TITLE = "Individual lessons are limited to one player";
export const DEFAULT_RECURRENCE_RULE = "FREQ=DAILY;COUNT=1";

export const OPEN_GAME_SKILL_DEFAULTS = {
    anchorSkill: "4",
    skillMin: "1",
    skillMax: "7",
} as const;

const REGULAR_BOOKING_TYPE: BookingType = "regular";
const INDIVIDUAL_LESSON_BOOKING_TYPE: BookingType = "lesson_individual";
const GROUP_LESSON_BOOKING_TYPE: BookingType = "lesson_group";

export function isIndividualLessonBookingType(bookingType: BookingType): boolean {
    return bookingType === INDIVIDUAL_LESSON_BOOKING_TYPE;
}

export function isLessonBookingType(bookingType: BookingType): boolean {
    return (
        bookingType === INDIVIDUAL_LESSON_BOOKING_TYPE || bookingType === GROUP_LESSON_BOOKING_TYPE
    );
}

export function isRegularBookingType(bookingType: BookingType): boolean {
    return bookingType === REGULAR_BOOKING_TYPE;
}

export function canEditMaxPlayers(bookingType: BookingType): boolean {
    return !isIndividualLessonBookingType(bookingType);
}

export function getMaxPlayersLimit(bookingType: BookingType): number {
    return isIndividualLessonBookingType(bookingType)
        ? INDIVIDUAL_LESSON_MAX_PLAYERS_LIMIT
        : DEFAULT_MAX_PLAYERS_LIMIT;
}

export function resolveMaxPlayers(bookingType: BookingType, maxPlayers: string): string {
    return isIndividualLessonBookingType(bookingType) ? INDIVIDUAL_LESSON_MAX_PLAYERS : maxPlayers;
}

export function shouldShowOnBehalfField(isOpenGame: boolean): boolean {
    return !isOpenGame;
}

export function shouldShowInvitedPlayers(isOpenGame: boolean): boolean {
    return !isOpenGame;
}

export function shouldShowParticipantAssignmentSection(
    isOpenGame: boolean,
    bookingType: BookingType
): boolean {
    return shouldShowOnBehalfField(isOpenGame) || isLessonBookingType(bookingType);
}

export function shouldShowStaffTrainerField(bookingType: BookingType): boolean {
    return isLessonBookingType(bookingType);
}

export function shouldShowOpenGameSettings(bookingType: BookingType): boolean {
    return isRegularBookingType(bookingType);
}

export function shouldShowRecurringSettings(bookingType: BookingType): boolean {
    return !isRegularBookingType(bookingType);
}

export function createOpenGameSettingsPatch(isOpenGame: boolean) {
    return isOpenGame
        ? {
              isOpenGame: true,
              ...OPEN_GAME_SKILL_DEFAULTS,
          }
        : { isOpenGame: false };
}

export function getCreateBookingButtonLabel(isPending: boolean, isRecurring: boolean): string {
    if (isPending) {
        return isRecurring ? "Creating series..." : "Creating...";
    }
    return isRecurring ? "Create Series" : "Create Booking";
}

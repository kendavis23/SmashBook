import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DayTimelineBoard from "./DayTimelineBoard";

vi.mock("./CalendarBookingBlock", () => ({
    default: ({
        booking,
        onManageClick,
    }: {
        booking: { id: string; event_name: string | null };
        onManageClick: (id: string) => void;
    }) => (
        <button onClick={() => onManageClick(booking.id)}>
            {booking.event_name ?? booking.id}
        </button>
    ),
}));

vi.mock("./CalendarReservationBlock", () => ({
    default: ({
        block,
        onManageClick,
    }: {
        block: { id: string; title: string };
        onManageClick: (id: string) => void;
    }) => <button onClick={() => onManageClick(block.id)}>{block.title}</button>,
}));

const day = {
    date: "2026-04-20",
    courts: [
        {
            court_id: "court-1",
            court_name: "Court 1",
            slots: [
                {
                    kind: "booking",
                    id: "booking-1",
                    court_id: "court-1",
                    court_name: "Court 1",
                    booking_type: "regular",
                    status: "confirmed",
                    is_open_game: false,
                    start_datetime: "2026-04-20T10:00:00Z",
                    end_datetime: "2026-04-20T11:00:00Z",
                    event_name: "League Match",
                    players: [],
                    slots_available: 2,
                    total_price: 20,
                },
                {
                    kind: "block",
                    id: "block-1",
                    court_id: "court-1",
                    start_datetime: "2026-04-20T07:00:00Z",
                    end_datetime: "2026-04-20T09:00:00Z",
                    reservation_type: "private_hire",
                    title: "Morning Training block",
                    anchor_skill_level: null,
                    skill_range_above: null,
                    skill_range_below: null,
                },
            ],
            time_slots: [
                {
                    start_datetime: "2026-04-20T12:00:00Z",
                    end_datetime: "2026-04-20T13:30:00Z",
                    status: "available",
                    booking_id: null,
                    reservation_id: null,
                },
            ],
        },
    ],
};

describe("DayTimelineBoard", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-20T09:30:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders day metadata, courts, bookings, and blocks", () => {
        render(
            <DayTimelineBoard
                day={day as never}
                onManageClick={vi.fn()}
                onManageReservationClick={vi.fn()}
                onNewSlotClick={vi.fn()}
            />
        );

        expect(screen.getByText("Court 1")).toBeInTheDocument();
        expect(screen.getByText("League Match")).toBeInTheDocument();
        expect(screen.getByText("Morning Training block")).toBeInTheDocument();
        expect(screen.getByText(/1 booking/i)).toBeInTheDocument();
        expect(screen.getByText("20")).toBeInTheDocument();
        expect(screen.getByText("Apr")).toBeInTheDocument();
    });

    it("shows empty state when no courts exist", () => {
        render(
            <DayTimelineBoard
                day={{ date: "2026-04-20", courts: [] } as never}
                onManageClick={vi.fn()}
                onManageReservationClick={vi.fn()}
                onNewSlotClick={vi.fn()}
            />
        );

        expect(screen.getByText("No courts found for this day.")).toBeInTheDocument();
    });

    it("passes manage click through to booking blocks", () => {
        const onManageClick = vi.fn();
        render(
            <DayTimelineBoard
                day={day as never}
                onManageClick={onManageClick}
                onManageReservationClick={vi.fn()}
                onNewSlotClick={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("League Match"));
        expect(onManageClick).toHaveBeenCalledWith("booking-1");
    });

    it("passes manage reservation click through to block items", () => {
        const onManageReservationClick = vi.fn();
        render(
            <DayTimelineBoard
                day={day as never}
                onManageClick={vi.fn()}
                onManageReservationClick={onManageReservationClick}
                onNewSlotClick={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("Morning Training block"));
        expect(onManageReservationClick).toHaveBeenCalledWith("block-1");
    });

    it("calls onNewSlotClick when an available time slot button is clicked", () => {
        const onNewSlotClick = vi.fn();
        render(
            <DayTimelineBoard
                day={day as never}
                onManageClick={vi.fn()}
                onManageReservationClick={vi.fn()}
                onNewSlotClick={onNewSlotClick}
            />
        );

        const slotBtn = screen.getByRole("button", { name: /new booking at 12:00/i });
        fireEvent.click(slotBtn);
        expect(onNewSlotClick).toHaveBeenCalledWith(
            "court-1",
            "Court 1",
            "2026-04-20",
            "12:00",
            "13:30"
        );
    });

    it("does not render a slot button for non-available time slots", () => {
        const dayWithNonAvailable = {
            ...day,
            courts: [
                {
                    ...day.courts[0],
                    time_slots: [
                        {
                            start_datetime: "2026-04-20T09:00:00Z",
                            end_datetime: "2026-04-20T10:00:00Z",
                            status: "booked",
                            booking_id: "booking-1",
                            reservation_id: null,
                        },
                        {
                            start_datetime: "2026-04-20T12:00:00Z",
                            end_datetime: "2026-04-20T13:30:00Z",
                            status: "available",
                            booking_id: null,
                            reservation_id: null,
                        },
                    ],
                },
            ],
        };
        render(
            <DayTimelineBoard
                day={dayWithNonAvailable as never}
                onManageClick={vi.fn()}
                onManageReservationClick={vi.fn()}
                onNewSlotClick={vi.fn()}
            />
        );

        expect(screen.getByRole("button", { name: /new booking at 12:00/i })).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /new booking at 09:00/i })
        ).not.toBeInTheDocument();
    });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WeekTimelineBoard from "./WeekTimelineBoard";

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

const days = [
    {
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
                        event_name: "Court 1 Match",
                        players: [],
                        slots_available: 2,
                        total_price: 20,
                    },
                ],
            },
            {
                court_id: "court-2",
                court_name: "Court 2",
                slots: [
                    {
                        kind: "booking",
                        id: "booking-2",
                        court_id: "court-2",
                        court_name: "Court 2",
                        booking_type: "regular",
                        status: "pending",
                        is_open_game: false,
                        start_datetime: "2026-04-20T12:00:00Z",
                        end_datetime: "2026-04-20T13:00:00Z",
                        event_name: "Court 2 Match",
                        players: [],
                        slots_available: 1,
                        total_price: 18,
                    },
                    {
                        kind: "block",
                        id: "block-1",
                        court_id: "court-2",
                        start_datetime: "2026-04-20T07:00:00Z",
                        end_datetime: "2026-04-20T09:00:00Z",
                        reservation_type: "private_hire",
                        title: "Morning Block",
                        anchor_skill_level: null,
                        skill_range_above: null,
                        skill_range_below: null,
                    },
                ],
            },
        ],
    },
];

describe("WeekTimelineBoard", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-20T09:30:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders bookings and blocks across all courts when no court is selected", () => {
        render(
            <WeekTimelineBoard
                days={days as never}
                selectedCourtId=""
                onManageClick={vi.fn()}
                onManageReservationClick={vi.fn()}
            />
        );

        expect(screen.getByText("Court 1 Match")).toBeInTheDocument();
        expect(screen.getByText("Court 2 Match")).toBeInTheDocument();
        expect(screen.getByText("Morning Block")).toBeInTheDocument();
    });

    it("filters bookings and blocks by selected court", () => {
        render(
            <WeekTimelineBoard
                days={days as never}
                selectedCourtId="court-2"
                onManageClick={vi.fn()}
                onManageReservationClick={vi.fn()}
            />
        );

        expect(screen.queryByText("Court 1 Match")).not.toBeInTheDocument();
        expect(screen.getByText("Court 2 Match")).toBeInTheDocument();
        expect(screen.getByText("Morning Block")).toBeInTheDocument();
    });

    it("passes manage click through to booking blocks", () => {
        const onManageClick = vi.fn();
        render(
            <WeekTimelineBoard
                days={days as never}
                selectedCourtId=""
                onManageClick={onManageClick}
                onManageReservationClick={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("Court 2 Match"));
        expect(onManageClick).toHaveBeenCalledWith("booking-2");
    });

    it("passes manage reservation click through to block items", () => {
        const onManageReservationClick = vi.fn();
        render(
            <WeekTimelineBoard
                days={days as never}
                selectedCourtId=""
                onManageClick={vi.fn()}
                onManageReservationClick={onManageReservationClick}
            />
        );

        fireEvent.click(screen.getByText("Morning Block"));
        expect(onManageReservationClick).toHaveBeenCalledWith("block-1");
    });
});

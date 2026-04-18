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

const day = {
    date: "2026-04-20",
    courts: [
        {
            court_id: "court-1",
            court_name: "Court 1",
            bookings: [
                {
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

    it("renders day metadata, courts, and bookings", () => {
        render(<DayTimelineBoard day={day as never} onManageClick={vi.fn()} />);

        expect(screen.getByText("Court 1")).toBeInTheDocument();
        expect(screen.getByText("League Match")).toBeInTheDocument();
        expect(screen.getAllByText(/1 booking/i)).toHaveLength(2);
    });

    it("shows empty state when no courts exist", () => {
        render(
            <DayTimelineBoard
                day={{ date: "2026-04-20", courts: [] } as never}
                onManageClick={vi.fn()}
            />
        );

        expect(screen.getByText("No courts found for this day.")).toBeInTheDocument();
    });

    it("passes manage click through to booking blocks", () => {
        const onManageClick = vi.fn();
        render(<DayTimelineBoard day={day as never} onManageClick={onManageClick} />);

        fireEvent.click(screen.getByText("League Match"));
        expect(onManageClick).toHaveBeenCalledWith("booking-1");
    });
});

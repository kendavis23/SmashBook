import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarBookingBlock from "./CalendarBookingBlock";

const booking = {
    id: "booking-1",
    court_id: "court-1",
    court_name: "Court 1",
    booking_type: "regular",
    status: "confirmed",
    is_open_game: true,
    start_datetime: "2026-04-20T10:00:00Z",
    end_datetime: "2026-04-20T11:00:00Z",
    event_name: "League Match",
    players: [
        {
            id: "player-1",
            user_id: "user-1",
            full_name: "Alex Doe",
            role: "player",
            payment_status: "paid",
            invite_status: "accepted",
            amount_due: 0,
        },
    ],
    slots_available: 2,
    total_price: 20,
};

describe("CalendarBookingBlock", () => {
    it("renders booking content and calls onManageClick", () => {
        const onManageClick = vi.fn();
        render(
            <CalendarBookingBlock
                booking={booking as never}
                boardHeight={560}
                startOfDayMinutes={360}
                endOfDayMinutes={1500}
                onManageClick={onManageClick}
            />
        );

        expect(screen.getByRole("button", { name: /league match/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /confirmed/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /league match/i }));
        expect(onManageClick).toHaveBeenCalledWith("booking-1");
    });

    it("returns null when the booking range is invalid", () => {
        const { container } = render(
            <CalendarBookingBlock
                booking={
                    {
                        ...booking,
                        start_datetime: "2026-04-20T11:00:00Z",
                        end_datetime: "2026-04-20T10:00:00Z",
                    } as never
                }
                boardHeight={560}
                startOfDayMinutes={360}
                endOfDayMinutes={1500}
                onManageClick={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });
});

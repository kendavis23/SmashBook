import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarReservationBlock from "./CalendarReservationBlock";

const block = {
    kind: "block" as const,
    id: "block-1",
    court_id: "court-1",
    start_datetime: "2026-04-20T10:00:00Z",
    end_datetime: "2026-04-20T11:00:00Z",
    reservation_type: "maintenance",
    title: "Court Maintenance",
    anchor_skill_level: null,
    skill_range_above: null,
    skill_range_below: null,
};

describe("CalendarReservationBlock", () => {
    it("renders block title, time label, and calls onManageClick", () => {
        const onManageClick = vi.fn();
        render(
            <CalendarReservationBlock
                block={block}
                boardHeight={560}
                startOfDayMinutes={360}
                endOfDayMinutes={1500}
                onManageClick={onManageClick}
            />
        );

        expect(screen.getByRole("button", { name: /court maintenance/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /court maintenance/i }));
        expect(onManageClick).toHaveBeenCalledWith("block-1");
    });

    it("returns null when totalMinutes is zero", () => {
        const { container } = render(
            <CalendarReservationBlock
                block={block}
                boardHeight={560}
                startOfDayMinutes={600}
                endOfDayMinutes={600}
                onManageClick={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("returns null when block range is invalid (end <= start after clamping)", () => {
        const { container } = render(
            <CalendarReservationBlock
                block={{
                    ...block,
                    start_datetime: "2026-04-20T11:00:00Z",
                    end_datetime: "2026-04-20T10:00:00Z",
                }}
                boardHeight={560}
                startOfDayMinutes={360}
                endOfDayMinutes={1500}
                onManageClick={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("applies correct inline top and height styles", () => {
        render(
            <CalendarReservationBlock
                block={block}
                boardHeight={760}
                startOfDayMinutes={360}
                endOfDayMinutes={1500}
                onManageClick={vi.fn()}
            />
        );

        const btn = screen.getByRole("button", { name: /court maintenance/i });
        expect(btn.style.top).toBeTruthy();
        expect(btn.style.height).toBeTruthy();
    });
});

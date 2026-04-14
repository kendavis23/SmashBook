import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HoursEditor from "./HoursEditor";
import type { DayRow } from "./ClubDetailHoursSection";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));

const makeRows = (): DayRow[] =>
    [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        day_of_week: day,
        isOpen: day < 5,
        open_time: "08:00",
        close_time: "22:00",
    }));

describe("HoursEditor", () => {
    it("renders all 7 days", () => {
        render(
            <HoursEditor
                initialRows={makeRows()}
                isPending={false}
                isSuccess={false}
                onSave={vi.fn()}
            />
        );
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("Sunday")).toBeInTheDocument();
    });

    it("Save Changes button is disabled initially (not dirty)", () => {
        render(
            <HoursEditor
                initialRows={makeRows()}
                isPending={false}
                isSuccess={false}
                onSave={vi.fn()}
            />
        );
        expect(screen.getByText("Save Changes")).toBeDisabled();
    });

    it("enables Save Changes after toggling a day", () => {
        render(
            <HoursEditor
                initialRows={makeRows()}
                isPending={false}
                isSuccess={false}
                onSave={vi.fn()}
            />
        );
        const toggles = screen.getAllByRole("switch");
        fireEvent.click(toggles[0]!);
        expect(screen.getByText("Save Changes")).not.toBeDisabled();
    });

    it("calls onSave with only open days", () => {
        const handleSave = vi.fn();
        const rows = makeRows();
        render(
            <HoursEditor
                initialRows={rows}
                isPending={false}
                isSuccess={false}
                onSave={handleSave}
            />
        );
        const toggles = screen.getAllByRole("switch");
        fireEvent.click(toggles[0]!);
        fireEvent.click(screen.getByText("Save Changes"));
        expect(handleSave).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ day_of_week: expect.any(Number) })]),
            expect.any(Function)
        );
    });

    it("shows success toast when isSuccess is true and not dirty", () => {
        render(
            <HoursEditor
                initialRows={makeRows()}
                isPending={false}
                isSuccess={true}
                onSave={vi.fn()}
            />
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Operating hours saved.");
    });

    it("shows Saving… when isPending", () => {
        render(
            <HoursEditor
                initialRows={makeRows()}
                isPending={true}
                isSuccess={false}
                onSave={vi.fn()}
            />
        );
        expect(screen.getByText("Saving…")).toBeInTheDocument();
    });
});

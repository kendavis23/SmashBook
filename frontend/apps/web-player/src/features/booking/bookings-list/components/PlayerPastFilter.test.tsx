import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerPastFilter from "./PlayerPastFilter";

vi.mock("@repo/ui", () => ({
    DatePicker: ({
        value,
        onChange,
        className,
    }: {
        value: string;
        onChange: (value: string) => void;
        className?: string;
    }) => (
        <input
            type="date"
            className={className}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
}));

const defaultProps = {
    pastFrom: "",
    pastTo: "",
    onPastFilterChange: vi.fn(),
    onPastFilterApply: vi.fn(),
    onPastFilterClear: vi.fn(),
};

function firstTwoElements<T>(items: T[]): [T, T] {
    const first = items[0];
    const second = items[1];
    if (!first || !second) {
        throw new Error("Expected two matching elements");
    }
    return [first, second];
}

describe("PlayerPastFilter", () => {
    it("disables apply and hides clear when no date filters are set", () => {
        render(<PlayerPastFilter {...defaultProps} />);

        expect(screen.getByRole("button", { name: /apply filters/i })).toBeDisabled();
        expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
    });

    it("emits separate patches for from and to date changes", () => {
        const onPastFilterChange = vi.fn();
        render(<PlayerPastFilter {...defaultProps} onPastFilterChange={onPastFilterChange} />);

        const [fromInput, toInput] = firstTwoElements(screen.getAllByDisplayValue(""));
        fireEvent.change(fromInput, { target: { value: "2026-05-01" } });
        fireEvent.change(toInput, { target: { value: "2026-05-10" } });

        expect(onPastFilterChange).toHaveBeenNthCalledWith(1, { pastFrom: "2026-05-01" });
        expect(onPastFilterChange).toHaveBeenNthCalledWith(2, { pastTo: "2026-05-10" });
    });

    it("applies and clears active filters", () => {
        const onPastFilterApply = vi.fn();
        const onPastFilterClear = vi.fn();
        render(
            <PlayerPastFilter
                {...defaultProps}
                pastFrom="2026-05-01"
                pastTo="2026-05-10"
                onPastFilterApply={onPastFilterApply}
                onPastFilterClear={onPastFilterClear}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));
        fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

        expect(onPastFilterApply).toHaveBeenCalledOnce();
        expect(onPastFilterClear).toHaveBeenCalledOnce();
    });
});

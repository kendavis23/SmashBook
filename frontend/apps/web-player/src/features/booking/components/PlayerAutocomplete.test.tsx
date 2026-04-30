import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerAutocomplete } from "./PlayerAutocomplete";
import { useSearchPlayers } from "../hooks";

vi.mock("../hooks", () => ({
    useSearchPlayers: vi.fn(),
}));

const mockUseSearchPlayers = vi.mocked(useSearchPlayers);

describe("PlayerAutocomplete", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockUseSearchPlayers.mockImplementation(
            (params, options) =>
                ({
                    data:
                        options?.enabled && params?.q === "Roh"
                            ? [
                                  {
                                      id: "player-1",
                                      full_name: "Rohit Sharma",
                                      skill_level: 4.0,
                                  },
                                  {
                                      id: "player-2",
                                      full_name: "Rohan Patel",
                                      skill_level: 3.5,
                                  },
                              ]
                            : [],
                    isFetching: false,
                    isError: false,
                }) as ReturnType<typeof useSearchPlayers>
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it("debounces search and only enables querying after 2 characters", () => {
        render(
            <PlayerAutocomplete
                label="Invited player 1"
                value=""
                onChange={vi.fn()}
                clubId="club-1"
            />
        );

        fireEvent.change(screen.getByRole("combobox", { name: "Invited player 1" }), {
            target: { value: "R" },
        });

        expect(mockUseSearchPlayers).toHaveBeenLastCalledWith(
            { q: "", club_id: "club-1" },
            { enabled: false }
        );

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(mockUseSearchPlayers).toHaveBeenLastCalledWith(
            { q: "R", club_id: "club-1" },
            { enabled: false }
        );

        fireEvent.change(screen.getByRole("combobox", { name: "Invited player 1" }), {
            target: { value: "Roh" },
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(mockUseSearchPlayers).toHaveBeenLastCalledWith(
            { q: "Roh", club_id: "club-1" },
            { enabled: true }
        );
    });

    it("selects a player by full name and emits the player id", () => {
        const onChange = vi.fn();
        render(
            <PlayerAutocomplete
                label="Invited player 1"
                value=""
                onChange={onChange}
                clubId="club-1"
            />
        );

        const input = screen.getByRole("combobox", { name: "Invited player 1" });
        fireEvent.change(input, { target: { value: "Roh" } });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        fireEvent.click(screen.getByRole("option", { name: /Rohit Sharma/i }));

        expect(onChange).toHaveBeenCalledWith("player-1");
        expect(input).toHaveValue("Rohit Sharma");
    });

    it("clears the selected id when the input is cleared or diverges from the selected player", () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <PlayerAutocomplete
                label="Invited player 1"
                value=""
                onChange={onChange}
                clubId="club-1"
            />
        );

        const input = screen.getByRole("combobox", { name: "Invited player 1" });
        fireEvent.change(input, { target: { value: "Roh" } });
        act(() => {
            vi.advanceTimersByTime(300);
        });
        fireEvent.click(screen.getByRole("option", { name: /Rohit Sharma/i }));

        rerender(
            <PlayerAutocomplete
                label="Invited player 1"
                value="player-1"
                onChange={onChange}
                clubId="club-1"
            />
        );

        fireEvent.change(input, { target: { value: "Rohit S" } });
        expect(onChange).toHaveBeenLastCalledWith("");

        fireEvent.change(input, { target: { value: "" } });
        expect(onChange).toHaveBeenLastCalledWith("");
    });

    it("supports arrow key traversal and enter selection", () => {
        const onChange = vi.fn();
        render(
            <PlayerAutocomplete
                label="Invited player 1"
                value=""
                onChange={onChange}
                clubId="club-1"
            />
        );

        const input = screen.getByRole("combobox", { name: "Invited player 1" });
        fireEvent.change(input, { target: { value: "Roh" } });
        act(() => {
            vi.advanceTimersByTime(300);
        });

        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(screen.getByRole("option", { name: /Rohit Sharma/i })).toHaveAttribute(
            "aria-selected",
            "true"
        );

        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(screen.getByRole("option", { name: /Rohan Patel/i })).toHaveAttribute(
            "aria-selected",
            "true"
        );

        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith("player-2");
        expect(input).toHaveValue("Rohan Patel");
    });
});

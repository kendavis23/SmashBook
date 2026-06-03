import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivePlayersLineChart } from "./ActivePlayersLineChart";
import type { ActivePlayersPoint } from "../../types";

const points: ActivePlayersPoint[] = [
    { period_start: "2026-05-04", active_players: 8 },
    { period_start: "2026-05-05", active_players: 14 },
    { period_start: "2026-05-06", active_players: 10 },
];

describe("ActivePlayersLineChart", () => {
    it("shows exact date and active-player count for the selected point", () => {
        render(<ActivePlayersLineChart points={points} granularity="day" />);

        expect(screen.getByText("6 May 2026")).toBeInTheDocument();
        expect(screen.getByText("10 active players")).toBeInTheDocument();

        fireEvent.focus(screen.getByRole("button", { name: "5 May 2026: 14 active players" }));

        expect(screen.getByText("5 May 2026")).toBeInTheDocument();
        expect(screen.getByText("14 active players")).toBeInTheDocument();
    });

    it("updates on hover and returns to latest when the pointer leaves", () => {
        render(<ActivePlayersLineChart points={points} granularity="day" />);

        const secondPoint = screen.getByRole("button", { name: "5 May 2026: 14 active players" });

        fireEvent.mouseEnter(secondPoint);

        expect(screen.getByText("5 May 2026")).toBeInTheDocument();
        expect(screen.getByText("14 active players")).toBeInTheDocument();

        fireEvent.mouseLeave(screen.getByRole("img", { name: "Active players per period chart" }));

        expect(screen.getByText("6 May 2026")).toBeInTheDocument();
        expect(screen.getByText("10 active players")).toBeInTheDocument();
    });

    it("renders the empty state", () => {
        render(<ActivePlayersLineChart points={[]} granularity="day" />);

        expect(screen.getByText("No active-player data for this period.")).toBeInTheDocument();
    });
});

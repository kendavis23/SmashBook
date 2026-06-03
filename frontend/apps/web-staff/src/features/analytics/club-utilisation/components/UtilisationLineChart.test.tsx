import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UtilisationLineChart } from "./UtilisationLineChart";
import type { DailyUtilisationPoint } from "../../types";

const points: DailyUtilisationPoint[] = [
    {
        snapshot_date: "2026-05-04",
        total_slots: 50,
        booked_slots: 14,
        utilisation_pct: 28,
        revenue_actual: 260,
        revenue_potential: 400,
    },
    {
        snapshot_date: "2026-05-05",
        total_slots: 50,
        booked_slots: 22,
        utilisation_pct: 44,
        revenue_actual: 380,
        revenue_potential: 500,
    },
    {
        snapshot_date: "2026-05-06",
        total_slots: 50,
        booked_slots: 8,
        utilisation_pct: 16,
        revenue_actual: 120,
        revenue_potential: 500,
    },
];

describe("UtilisationLineChart", () => {
    it("shows exact date and utilisation percentage for the selected point", () => {
        render(<UtilisationLineChart points={points} />);

        expect(screen.getByText("6 May 2026")).toBeInTheDocument();
        expect(screen.getByText("16% utilisation")).toBeInTheDocument();

        fireEvent.focus(screen.getByRole("button", { name: "5 May 2026: 44% utilisation" }));

        expect(screen.getByText("5 May 2026")).toBeInTheDocument();
        expect(screen.getByText("44% utilisation")).toBeInTheDocument();
    });

    it("updates on hover and returns to latest when the pointer leaves", () => {
        render(<UtilisationLineChart points={points} />);

        fireEvent.mouseEnter(screen.getByRole("button", { name: "5 May 2026: 44% utilisation" }));

        expect(screen.getByText("5 May 2026")).toBeInTheDocument();
        expect(screen.getByText("44% utilisation")).toBeInTheDocument();

        fireEvent.mouseLeave(
            screen.getByRole("img", { name: "Daily utilisation percentage chart" })
        );

        expect(screen.getByText("6 May 2026")).toBeInTheDocument();
        expect(screen.getByText("16% utilisation")).toBeInTheDocument();
    });

    it("renders the empty state", () => {
        render(<UtilisationLineChart points={[]} />);

        expect(screen.getByText("No utilisation data for this period.")).toBeInTheDocument();
    });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDetailViewSection from "./ClubDetailViewSection";
import type { Club } from "../../types";

vi.mock("../../hooks", () => ({
    useGetOperatingHours: vi.fn(),
    useGetPricingRules: vi.fn(),
}));

vi.mock("./ClubDetailView", () => ({
    default: (props: {
        hoursLoading: boolean;
        rulesLoading: boolean;
        hours: unknown[];
        rules: unknown[];
    }) => (
        <div>
            <span data-testid="hours-loading">{String(props.hoursLoading)}</span>
            <span data-testid="rules-loading">{String(props.rulesLoading)}</span>
            <span data-testid="hours-count">{props.hours.length}</span>
            <span data-testid="rules-count">{props.rules.length}</span>
        </div>
    ),
}));

import { useGetOperatingHours, useGetPricingRules } from "../../hooks";

const mockUseGetOperatingHours = useGetOperatingHours as ReturnType<typeof vi.fn>;
const mockUseGetPricingRules = useGetPricingRules as ReturnType<typeof vi.fn>;

const mockClub = { id: "club-1", name: "Alpha", currency: "GBP" } as unknown as Club;

describe("ClubDetailViewSection — loading", () => {
    it("passes hoursLoading=true to view", () => {
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: true });
        mockUseGetPricingRules.mockReturnValue({ data: [], isLoading: false });
        render(<ClubDetailViewSection club={mockClub} clubId="club-1" />);
        expect(screen.getByTestId("hours-loading").textContent).toBe("true");
    });

    it("passes rulesLoading=true to view", () => {
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: false });
        mockUseGetPricingRules.mockReturnValue({ data: [], isLoading: true });
        render(<ClubDetailViewSection club={mockClub} clubId="club-1" />);
        expect(screen.getByTestId("rules-loading").textContent).toBe("true");
    });
});

describe("ClubDetailViewSection — data", () => {
    it("passes hours data to view", () => {
        const hours = [{ day_of_week: 0, open_time: "09:00", close_time: "21:00" }];
        mockUseGetOperatingHours.mockReturnValue({ data: hours, isLoading: false });
        mockUseGetPricingRules.mockReturnValue({ data: [], isLoading: false });
        render(<ClubDetailViewSection club={mockClub} clubId="club-1" />);
        expect(screen.getByTestId("hours-count").textContent).toBe("1");
    });

    it("passes rules data to view", () => {
        const rules = [
            {
                label: "Peak",
                day_of_week: 0,
                start_time: "08:00",
                end_time: "20:00",
                is_active: true,
                price_per_slot: 20,
            },
            {
                label: "Off-Peak",
                day_of_week: 1,
                start_time: "08:00",
                end_time: "20:00",
                is_active: true,
                price_per_slot: 10,
            },
        ];
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: false });
        mockUseGetPricingRules.mockReturnValue({ data: rules, isLoading: false });
        render(<ClubDetailViewSection club={mockClub} clubId="club-1" />);
        expect(screen.getByTestId("rules-count").textContent).toBe("2");
    });
});

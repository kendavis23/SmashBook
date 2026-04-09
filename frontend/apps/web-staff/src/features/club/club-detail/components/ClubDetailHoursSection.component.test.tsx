import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDetailHoursSection from "./ClubDetailHoursSection";

vi.mock("../../hooks", () => ({
    useGetOperatingHours: vi.fn(),
    useSetOperatingHours: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));

vi.mock("./HoursEditor", () => ({
    default: ({ isPending }: { isPending: boolean }) => (
        <div>
            HoursEditor
            <button disabled={isPending}>Save Changes</button>
        </div>
    ),
}));

import { useGetOperatingHours, useSetOperatingHours } from "../../hooks";

const mockUseGetOperatingHours = useGetOperatingHours as ReturnType<typeof vi.fn>;
const mockUseSetOperatingHours = useSetOperatingHours as ReturnType<typeof vi.fn>;

const defaultMutation = { mutate: vi.fn(), isPending: false, isSuccess: false, error: null };

describe("ClubDetailHoursSection — loading", () => {
    it("renders loading spinner", () => {
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: true, error: null });
        mockUseSetOperatingHours.mockReturnValue(defaultMutation);
        render(<ClubDetailHoursSection clubId="club-1" />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("does not render HoursEditor while loading", () => {
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: true, error: null });
        mockUseSetOperatingHours.mockReturnValue(defaultMutation);
        render(<ClubDetailHoursSection clubId="club-1" />);
        expect(screen.queryByText("HoursEditor")).not.toBeInTheDocument();
    });
});

describe("ClubDetailHoursSection — loaded", () => {
    it("renders HoursEditor when data is available", () => {
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: false, error: null });
        mockUseSetOperatingHours.mockReturnValue(defaultMutation);
        render(<ClubDetailHoursSection clubId="club-1" />);
        expect(screen.getByText("HoursEditor")).toBeInTheDocument();
    });
});

describe("ClubDetailHoursSection — error", () => {
    it("renders fetch error toast", () => {
        mockUseGetOperatingHours.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Load failed"),
        });
        mockUseSetOperatingHours.mockReturnValue(defaultMutation);
        render(<ClubDetailHoursSection clubId="club-1" />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Load failed")).toBeInTheDocument();
    });

    it("renders save error toast", () => {
        mockUseGetOperatingHours.mockReturnValue({ data: [], isLoading: false, error: null });
        mockUseSetOperatingHours.mockReturnValue({
            ...defaultMutation,
            error: new Error("Save failed"),
        });
        render(<ClubDetailHoursSection clubId="club-1" />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Save failed")).toBeInTheDocument();
    });
});

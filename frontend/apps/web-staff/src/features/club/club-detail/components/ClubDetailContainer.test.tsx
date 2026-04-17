import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDetailContainer from "./ClubDetailContainer";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ clubId: "club-1" }),
}));

vi.mock("../../hooks", () => ({
    useGetClub: vi.fn(),
    useUpdateClubSettings: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("../../components/ClubModal", () => ({
    default: ({ onClose }: { onClose: () => void }) => (
        <div role="dialog">
            <button onClick={onClose}>Close modal</button>
        </div>
    ),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    Breadcrumb: ({ items }: { items: { label: string; onClick?: () => void }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label} onClick={i.onClick}>
                    {i.label}
                </span>
            ))}
        </nav>
    ),
    MapPin: () => null,
    Pencil: () => null,
}));

vi.mock("./ClubDetailViewSection", () => ({
    default: () => <div>ViewSection</div>,
}));

vi.mock("./ClubDetailSettingsSection", () => ({
    default: () => <div>SettingsSection</div>,
}));

vi.mock("./ClubDetailHoursSection", () => ({
    default: () => <div>HoursSection</div>,
}));

vi.mock("./ClubDetailPricingRulesSection", () => ({
    default: () => <div>PricingSection</div>,
}));

import { useGetClub, useUpdateClubSettings } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseGetClub = useGetClub as ReturnType<typeof vi.fn>;
const mockUseUpdateClubSettings = useUpdateClubSettings as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const mockClub = {
    id: "club-1",
    name: "Alpha Club",
    address: "1 Main St",
    currency: "GBP",
};

const defaultMutation = {
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
};

describe("ClubDetailContainer — loading state", () => {
    it("shows loading spinner", () => {
        mockUseGetClub.mockReturnValue({ data: undefined, isLoading: true, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        expect(screen.getByText("Loading club…")).toBeInTheDocument();
    });
});

describe("ClubDetailContainer — error state", () => {
    it("shows error message", () => {
        mockUseGetClub.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error("Fetch failed"),
        });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });

    it("shows not found message when no data and no error", () => {
        mockUseGetClub.mockReturnValue({ data: undefined, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        expect(screen.getByText("Club not found.")).toBeInTheDocument();
    });
});

describe("ClubDetailContainer — success state", () => {
    it("renders club name", () => {
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        expect(screen.getByText("Alpha Club")).toBeInTheDocument();
    });

    it("shows all tabs for owner", () => {
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        expect(screen.getByText("View")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
        expect(screen.getByText("Operating Hours")).toBeInTheDocument();
        expect(screen.getByText("Pricing Rules")).toBeInTheDocument();
    });

    it("shows only View tab for viewer role", () => {
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "viewer" });
        render(<ClubDetailContainer />);
        expect(screen.getByText("View")).toBeInTheDocument();
        expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("switches to settings tab on click", () => {
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        fireEvent.click(screen.getByText("Settings"));
        expect(screen.getByText("SettingsSection")).toBeInTheDocument();
    });

    it("opens edit modal on Edit Club click", () => {
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        fireEvent.click(screen.getByText("Edit Club"));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("navigates back when Clubs breadcrumb is clicked", () => {
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue(defaultMutation);
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        fireEvent.click(screen.getByText("Clubs"));
        expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/clubs" }));
    });
});

describe("ClubDetailContainer — settings", () => {
    it("calls mutate when Save Changes is clicked", () => {
        const mutate = vi.fn();
        mockUseGetClub.mockReturnValue({ data: mockClub, isLoading: false, error: null });
        mockUseUpdateClubSettings.mockReturnValue({ ...defaultMutation, mutate });
        mockUseClubAccess.mockReturnValue({ role: "owner" });
        render(<ClubDetailContainer />);
        fireEvent.click(screen.getByText("Settings"));
        fireEvent.click(screen.getByText("Save Changes"));
        expect(mutate).toHaveBeenCalled();
    });
});

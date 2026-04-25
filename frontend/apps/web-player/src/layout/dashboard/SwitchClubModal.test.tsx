import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockSetActiveClubId = vi.hoisted(() => vi.fn());
let currentClubId: string | null = null;

vi.mock("@repo/auth", () => ({
    useAuth: () => ({ clubId: currentClubId }),
    useAuthStore: vi.fn(
        (selector?: (s: { setActiveClubId: typeof mockSetActiveClubId }) => unknown) => {
            const store = { setActiveClubId: mockSetActiveClubId };
            return selector ? selector(store) : store;
        }
    ),
}));

import SwitchClubModal from "./SwitchClubModal";

const CLUBS = [
    { id: "c1", name: "Alpha Club", role: "admin" },
    { id: "c2", name: "Beta Club", role: "staff" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    currentClubId = "c1";
    mockSetActiveClubId.mockClear();
});

describe("SwitchClubModal — visibility", () => {
    it("renders nothing when isOpen is false", () => {
        const { container } = render(
            <SwitchClubModal isOpen={false} onClose={vi.fn()} clubs={CLUBS} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the modal when isOpen is true", () => {
        render(<SwitchClubModal isOpen={true} onClose={vi.fn()} clubs={CLUBS} />);
        expect(screen.getByText("Switch Club")).toBeInTheDocument();
    });
});

describe("SwitchClubModal — club list", () => {
    it("renders all clubs", () => {
        render(<SwitchClubModal isOpen={true} onClose={vi.fn()} clubs={CLUBS} />);
        expect(screen.getByText("Alpha Club")).toBeInTheDocument();
        expect(screen.getByText("Beta Club")).toBeInTheDocument();
    });

    it("marks the active club with aria-pressed=true", () => {
        render(<SwitchClubModal isOpen={true} onClose={vi.fn()} clubs={CLUBS} />);
        const buttons = screen.getAllByRole("button", { pressed: true });
        expect(buttons).toHaveLength(1);
        expect(buttons[0]).toHaveTextContent("Alpha Club");
    });

    it("shows count of available clubs", () => {
        render(<SwitchClubModal isOpen={true} onClose={vi.fn()} clubs={CLUBS} />);
        expect(screen.getByText("2 clubs available")).toBeInTheDocument();
    });
});

describe("SwitchClubModal — loading state", () => {
    it("shows a loading spinner when isLoading is true", () => {
        render(<SwitchClubModal isOpen={true} onClose={vi.fn()} clubs={[]} isLoading={true} />);
        expect(screen.getByText("Loading clubs…")).toBeInTheDocument();
    });

    it("shows 'Loading…' in the header when isLoading is true", () => {
        render(<SwitchClubModal isOpen={true} onClose={vi.fn()} clubs={[]} isLoading={true} />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
});

describe("SwitchClubModal — selection", () => {
    it("calls setActiveClubId and onClose when a club is selected", () => {
        const onClose = vi.fn();
        render(<SwitchClubModal isOpen={true} onClose={onClose} clubs={CLUBS} />);
        fireEvent.click(screen.getByText("Beta Club"));
        expect(mockSetActiveClubId).toHaveBeenCalledWith("c2", "Beta Club", "staff");
        expect(onClose).toHaveBeenCalled();
    });
});

describe("SwitchClubModal — close", () => {
    it("calls onClose when the X button is clicked", () => {
        const onClose = vi.fn();
        render(<SwitchClubModal isOpen={true} onClose={onClose} clubs={CLUBS} />);
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalled();
    });
});

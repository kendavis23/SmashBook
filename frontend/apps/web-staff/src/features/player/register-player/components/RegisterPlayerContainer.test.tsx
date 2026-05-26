import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RegisterPlayerContainer from "./RegisterPlayerContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
}));

vi.mock("../../hooks", () => ({
    useInviteNewPlayer: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("../../../club/hooks", () => ({
    useListClubs: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
}));

import { useInviteNewPlayer } from "../../hooks";
import { useClubAccess } from "../../store";
import { useListClubs } from "../../../club/hooks";

const mockUseInvite = useInviteNewPlayer as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;
const mockUseListClubs = useListClubs as ReturnType<typeof vi.fn>;

const CLUB_ID = "club-1";
const mockClubs = [{ id: CLUB_ID, name: "Ace Padel" }];

function setupMocks(overrides: Record<string, unknown> = {}): void {
    mockUseInvite.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
        ...overrides,
    });
    mockUseClubAccess.mockReturnValue({ clubId: CLUB_ID });
    mockUseListClubs.mockReturnValue({ data: mockClubs });
}

describe("RegisterPlayerContainer — rendering", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("renders the Register Player heading", () => {
        render(<RegisterPlayerContainer />);
        expect(screen.getByRole("heading", { name: "Register Player" })).toBeInTheDocument();
    });

    it("displays the active club name", () => {
        render(<RegisterPlayerContainer />);
        expect(screen.getByText("Ace Padel")).toBeInTheDocument();
    });

    it("shows — when clubs list is empty", () => {
        mockUseListClubs.mockReturnValue({ data: [] });
        render(<RegisterPlayerContainer />);
        expect(screen.getByText("—")).toBeInTheDocument();
    });
});

describe("RegisterPlayerContainer — validation", () => {
    beforeEach(() => {
        setupMocks();
        mockMutate.mockReset();
    });

    it("shows full name error when submitting with empty name", () => {
        render(<RegisterPlayerContainer />);
        fireEvent.submit(screen.getByRole("button", { name: /send invitation/i }).closest("form")!);
        expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    });

    it("shows email error when submitting with empty email", () => {
        render(<RegisterPlayerContainer />);
        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Doe" } });
        fireEvent.submit(screen.getByRole("button", { name: /send invitation/i }).closest("form")!);
        expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    });

    it("shows email format error for an invalid email", () => {
        render(<RegisterPlayerContainer />);
        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Doe" } });
        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: "not-an-email" },
        });
        fireEvent.submit(screen.getByRole("button", { name: /send invitation/i }).closest("form")!);
        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    });

    it("does not call mutate when validation fails", () => {
        render(<RegisterPlayerContainer />);
        fireEvent.submit(screen.getByRole("button", { name: /send invitation/i }).closest("form")!);
        expect(mockMutate).not.toHaveBeenCalled();
    });
});

describe("RegisterPlayerContainer — submit", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("calls mutate with the correct payload on valid submit", () => {
        render(<RegisterPlayerContainer />);
        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Doe" } });
        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: "jane@example.com" },
        });
        fireEvent.submit(screen.getByRole("button", { name: /send invitation/i }).closest("form")!);
        expect(mockMutate).toHaveBeenCalledWith(
            { full_name: "Jane Doe", email: "jane@example.com", club_id: CLUB_ID },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("shows Sending… and disables button when isPending", () => {
        setupMocks({ isPending: true });
        render(<RegisterPlayerContainer />);
        expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });
});

describe("RegisterPlayerContainer — cancel", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
    });

    it("navigates to /players when Cancel is clicked", () => {
        render(<RegisterPlayerContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/players" }));
    });
});

describe("RegisterPlayerContainer — API error", () => {
    it("shows API error alert", () => {
        setupMocks({ error: new Error("Email already registered") });
        render(<RegisterPlayerContainer />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Email already registered")).toBeInTheDocument();
    });

    it("calls reset when error is dismissed", () => {
        setupMocks({ error: new Error("Email already registered") });
        render(<RegisterPlayerContainer />);
        fireEvent.click(screen.getByText("Dismiss"));
        expect(mockReset).toHaveBeenCalled();
    });
});

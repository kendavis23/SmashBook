import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyGamesPage from "./MyGamesPage";

vi.mock("../components/MyGamesContainer", () => ({
    default: () => <div>My games container</div>,
}));

describe("MyGamesPage", () => {
    it("renders the my-games container", () => {
        render(<MyGamesPage />);
        expect(screen.getByText("My games container")).toBeInTheDocument();
    });
});

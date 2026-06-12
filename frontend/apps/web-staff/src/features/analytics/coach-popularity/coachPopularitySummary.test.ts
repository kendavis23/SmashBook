import { describe, expect, it } from "vitest";
import { computeCoachPopularitySummary } from "./coachPopularitySummary";
import type { CoachPopularityLeaderboard, CoachPopularityRow } from "../types";

function row(overrides: Partial<CoachPopularityRow> = {}): CoachPopularityRow {
    return {
        staff_profile_id: "sp-1",
        user_id: "u-1",
        coach_name: "Coach A",
        is_active: true,
        sessions: 10,
        first_session_at: "2026-01-01",
        last_session_at: "2026-06-01",
        sessions_last_30d: 2,
        sessions_last_90d: 5,
        distinct_players: 8,
        repeat_players: 4,
        return_rate: 0.5,
        total_attendances: 30,
        lesson_revenue: 200,
        currency: "GBP",
        ...overrides,
    };
}

function board(rows: CoachPopularityRow[]): CoachPopularityLeaderboard {
    return {
        club_id: "club-1",
        sort: "sessions",
        limit: 10,
        offset: 0,
        total_records: rows.length,
        rows,
    };
}

describe("computeCoachPopularitySummary", () => {
    it("returns all-zero, empty for undefined input", () => {
        const s = computeCoachPopularitySummary(undefined);
        expect(s).toEqual({
            coachCount: 0,
            totalSessions: 0,
            totalDistinctPlayers: 0,
            totalLessonRevenue: 0,
            avgReturnRatePct: 0,
            isEmpty: true,
        });
    });

    it("returns empty for a board with no rows", () => {
        expect(computeCoachPopularitySummary(board([])).isEmpty).toBe(true);
    });

    it("sums sessions, players and revenue across rows", () => {
        const s = computeCoachPopularitySummary(
            board([
                row({ sessions: 10, distinct_players: 8, repeat_players: 4, lesson_revenue: 200 }),
                row({ sessions: 5, distinct_players: 2, repeat_players: 2, lesson_revenue: 100 }),
            ])
        );
        expect(s.coachCount).toBe(2);
        expect(s.totalSessions).toBe(15);
        expect(s.totalDistinctPlayers).toBe(10);
        expect(s.totalLessonRevenue).toBe(300);
        expect(s.isEmpty).toBe(false);
    });

    it("computes return rate player-weighted, not a mean of per-coach rates", () => {
        // Coach A: 4/8 = 0.5; Coach B: 9/10 = 0.9. Mean of rates = 0.7.
        // Player-weighted: (4 + 9) / (8 + 10) = 13/18 ≈ 72.2%.
        const s = computeCoachPopularitySummary(
            board([
                row({ distinct_players: 8, repeat_players: 4 }),
                row({ distinct_players: 10, repeat_players: 9 }),
            ])
        );
        expect(s.avgReturnRatePct).toBeCloseTo((13 / 18) * 100, 5);
        expect(s.avgReturnRatePct).not.toBeCloseTo(70, 5);
    });

    it("guards divide-by-zero — no players returns 0, never NaN", () => {
        const s = computeCoachPopularitySummary(
            board([row({ distinct_players: 0, repeat_players: 0 })])
        );
        expect(s.avgReturnRatePct).toBe(0);
        expect(Number.isNaN(s.avgReturnRatePct)).toBe(false);
    });

    it("coerces string-decimal numeric fields", () => {
        const s = computeCoachPopularitySummary(
            board([
                row({
                    sessions: "7" as unknown as number,
                    lesson_revenue: "12.50" as unknown as number,
                }),
            ])
        );
        expect(s.totalSessions).toBe(7);
        expect(s.totalLessonRevenue).toBe(12.5);
    });
});

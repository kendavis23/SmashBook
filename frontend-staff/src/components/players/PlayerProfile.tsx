/**
 * PlayerProfile — full staff view
 *
 * Sections:
 *   - Account details (name, email, active/suspended toggle)
 *   - Skill level + change history table (SkillLevelHistory)
 *   - Skill level edit form (staff/ops_lead only) → PATCH /api/v1/players/:id/skill-level
 *   - Wallet balance + transaction history + manual adjustment
 *   - Booking history (upcoming + past)
 *   - Support tickets
 *
 * API: GET /api/v1/players/:id
 *      GET /api/v1/players/:id/skill-history
 *      GET /api/v1/payments/wallet (as :id)
 */
export function PlayerProfile() {}

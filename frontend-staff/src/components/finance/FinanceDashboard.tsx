/**
 * FinanceDashboard
 *
 * Panels:
 *   - KPI strip: today revenue / pending payments / pending refunds
 *   - Revenue trend chart (recharts LineChart) by week/month
 *   - Breakdown by booking_type + peak/off-peak (recharts BarChart)
 *   - Failed payment alerts with Retry / Mark Unpaid actions
 *   - Stripe payout reconciliation table
 *   - Export button → GET /api/v1/reports/export
 *
 * API: GET /api/v1/reports/dashboard
 *      GET /api/v1/reports/revenue
 *      GET /api/v1/reports/transactions
 *      GET /api/v1/reports/stripe-payouts
 */
export function FinanceDashboard() {}

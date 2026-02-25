/**
 * AppNavigator — React Native (Expo Router)
 *
 * (app)
 *   (auth)
 *     login.tsx
 *     register.tsx
 *     forgot-password.tsx
 *   (tabs)
 *     (home)
 *       index.tsx          → CourtSearch + OpenGamesFeed
 *       availability.tsx   → CourtAvailabilityScreen
 *     (book)
 *       index.tsx          → BookingFlowScreen (multi-step)
 *       confirmation.tsx   → BookingConfirmationScreen
 *     (my-games)
 *       index.tsx          → UpcomingBookingsScreen
 *       history.tsx        → MatchHistoryScreen
 *       waitlist.tsx       → WaitlistScreen
 *     (profile)
 *       index.tsx          → ProfileScreen
 *       payments.tsx       → PaymentsScreen (wallet + cards)
 *       invoices.tsx       → InvoicesScreen
 *       support.tsx        → SupportScreen
 *
 * Push Notifications (Firebase Cloud Messaging):
 *   - booking.confirmed    → "Your game is confirmed!"
 *   - booking.reminder_due → "You have a game in 24h at Court 1"
 *   - waitlist.slot_available → "A slot opened up — book now"
 *   - invite received      → "Ken invited you to join a game"
 *   - payment.failed       → "Payment issue — tap to resolve"
 */
export function AppNavigator() {}

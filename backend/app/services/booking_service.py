"""
BookingService — core booking business logic.

Responsibilities:
  - Validate slot availability against operating_hours, pricing_rules, court_blackouts
  - Enforce club_settings rules (advance booking window, notice period, weekly cap)
  - Calculate total_price and per-player amount_due based on pricing_rules + lighting surcharge
  - Create booking + booking_players in a single transaction
  - Publish booking.created event to Pub/Sub
  - Handle open game logic (is_open_game, min_players_to_confirm, auto-cancel)
  - Waitlist promotion when a booking is cancelled
"""
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.pubsub import publish_booking_event


class BookingService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_booking(self, club_id: str, court_id: str, booking_type: str,
                              start_datetime, end_datetime, created_by_user_id: str,
                              max_players: int, is_open_game: bool, **kwargs) -> dict:
        """
        Full booking creation flow:
          1. Fetch ClubSettings, OperatingHours, PricingRules for club
          2. Check court is active and not blacked out in the window
          3. Check slot is not already booked (no overlapping confirmed/pending booking on same court)
          4. Enforce min_booking_notice_hours and max_advance_booking_days
          5. Check player weekly booking cap (max_bookings_per_player_per_week)
          6. Calculate price: match pricing_rule by day_of_week + time window → price_per_slot
             Add lighting_surcharge if applicable
          7. Create Booking record (status=pending)
          8. Create BookingPlayer for organiser (role=organiser, amount_due=price/max_players)
          9. Publish 'booking.created' → Pub/Sub booking-events topic
         10. Return booking dict for API response
        """
        pass

    async def cancel_booking(self, booking_id: str, cancelled_by_user_id: str) -> dict:
        """
          1. Fetch booking, verify it belongs to the user or user is staff
          2. Check cancellation_notice_hours — determine refund_pct from ClubSettings
          3. For each BookingPlayer with payment_status=paid:
               - Calculate refund amount (amount_due * refund_pct / 100)
               - Publish 'payment.refund_required' to payment-events topic
          4. Update booking status → 'cancelled'
          5. Publish 'booking.cancelled' → Pub/Sub
          6. Trigger waitlist promotion: check for waitlisted players on this court/time
             and publish 'waitlist.slot_available' for the first in queue
        """
        pass

    async def join_open_game(self, booking_id: str, user_id: str) -> dict:
        """
          1. Fetch booking — verify is_open_game=True and status in (pending, confirmed)
          2. Verify current player count < max_players
          3. Check skill_range_allowed: compare user.skill_level against existing players
          4. Create BookingPlayer (role=player, amount_due=total_price/max_players)
          5. Re-calculate all players' amount_due if price is split equally
          6. If player count now >= min_players_to_confirm → update status to 'confirmed'
             and publish 'booking.confirmed'
          7. Return updated booking
        """
        pass

    async def add_to_waitlist(self, booking_id: str, user_id: str) -> dict:
        """Register player on waitlist. Waitlist is ordered by joined_at timestamp."""
        pass

    async def get_availability(self, club_id: str, court_id: str, date) -> list:
        """
        Returns list of available time slots for a court on a given date.
          1. Fetch OperatingHours for club on date.weekday()
          2. Generate slots of booking_duration_minutes within open/close window
          3. Remove slots overlapping existing bookings (confirmed or pending)
          4. Remove slots overlapping court_blackouts
          5. Remove slots that violate min_booking_notice_hours from now
          6. Annotate each slot with price from PricingRules
        """
        pass

    async def calculate_price(self, club_id: str, court_id: str, start_datetime, end_datetime) -> dict:
        """
        Returns { base_price, lighting_surcharge, total_price } by matching
        PricingRule for (club_id, day_of_week, start_time ≤ slot < end_time).
        Falls back to off-peak if no rule matches.
        """
        pass

    async def get_open_games(self, club_id: str, date=None, skill_level=None) -> list:
        """
        Returns bookings where is_open_game=True and status in (pending, confirmed)
        and player count < max_players. Optionally filtered by date and skill_level
        compatibility (skill_range_allowed from ClubSettings).
        """
        pass

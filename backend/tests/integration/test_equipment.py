"""
Integration tests for equipment endpoints.

Coverage
--------
GET    /equipment                              — list inventory for a club
POST   /bookings/{id}/equipment-rental         — add rental to a booking

For each endpoint:
  - role enforcement / auth
  - tenant isolation
  - happy path
  - validation / business-rule errors
"""

import uuid
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete, select

from app.core.security import create_access_token, get_password_hash
from app.db.models.booking import Booking, BookingPlayer, BookingStatus, PlayerRole, PaymentStatus, BookingType
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import Court
from app.db.models.equipment import EquipmentInventory, EquipmentRental, ItemType, ItemCondition
from app.db.models.user import TenantUserRole, User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _future(hours: int = 48) -> datetime:
    dt = datetime.now(tz=timezone.utc) + timedelta(hours=hours)
    return dt.replace(hour=10, minute=30, second=0, microsecond=0)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def court_with_hours(club, test_session_factory):
    """Court + operating hours Mon–Sun 06:00–23:00 + a pricing rule."""
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="Court EQ", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()

        for dow in range(7):
            session.add(OperatingHours(
                club_id=club.id,
                day_of_week=dow,
                open_time=time(6, 0),
                close_time=time(23, 0),
            ))

        session.add(PricingRule(
            club_id=club.id,
            label="Standard",
            day_of_week=_future().weekday(),
            start_time=time(0, 0),
            end_time=time(23, 59),
            is_active=True,
            price_per_slot=Decimal("20.00"),
        ))
        await session.commit()
        await session.refresh(court)

    yield court

    async with test_session_factory() as session:
        booking_ids = (
            await session.execute(select(Booking.id).where(Booking.court_id == court.id))
        ).scalars().all()
        if booking_ids:
            await session.execute(sql_delete(EquipmentRental).where(EquipmentRental.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.execute(sql_delete(PricingRule).where(PricingRule.club_id == club.id))
        await session.execute(sql_delete(OperatingHours).where(OperatingHours.club_id == club.id))
        await session.execute(sql_delete(Court).where(Court.id == court.id))
        await session.commit()


@pytest_asyncio.fixture
async def racket(club, test_session_factory):
    """One racket item in inventory with 3 units available."""
    async with test_session_factory() as session:
        item = EquipmentInventory(
            club_id=club.id,
            item_type=ItemType.racket,
            name="Wilson Pro Racket",
            quantity_total=3,
            quantity_available=3,
            rental_price=Decimal("5.00"),
            condition=ItemCondition.good,
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)

    yield item

    async with test_session_factory() as session:
        await session.execute(sql_delete(EquipmentRental).where(EquipmentRental.equipment_id == item.id))
        obj = await session.get(EquipmentInventory, item.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def booking_with_player(club, court_with_hours, player, test_session_factory):
    """
    A confirmed booking with `player` as the organiser.
    Returns (booking, booking_player).
    """
    async with test_session_factory() as session:
        booking = Booking(
            club_id=club.id,
            court_id=court_with_hours.id,
            booking_type=BookingType.regular,
            status=BookingStatus.confirmed,
            start_datetime=_future(),
            end_datetime=_future() + timedelta(minutes=90),
            created_by_user_id=player.id,
            max_players=4,
            total_price=Decimal("20.00"),
            is_open_game=False,
        )
        session.add(booking)
        await session.flush()

        bp = BookingPlayer(
            booking_id=booking.id,
            user_id=player.id,
            role=PlayerRole.organiser,
            payment_status=PaymentStatus.pending,
            amount_due=Decimal("20.00"),
        )
        session.add(bp)
        await session.commit()
        await session.refresh(booking)
        await session.refresh(bp)

    yield booking, bp

    async with test_session_factory() as session:
        await session.execute(sql_delete(EquipmentRental).where(EquipmentRental.booking_id == booking.id))
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id == booking.id))
        obj = await session.get(Booking, booking.id)
        if obj:
            await session.delete(obj)
        await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/equipment
# ---------------------------------------------------------------------------

class TestListEquipment:

    async def test_returns_inventory_for_club(self, client, tenant, club, racket):
        resp = await client.get(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200, resp.text
        items = resp.json()
        assert len(items) == 1
        item = items[0]
        assert item["id"] == str(racket.id)
        assert item["name"] == "Wilson Pro Racket"
        assert item["item_type"] == "racket"
        assert item["rental_price"] == "5.00"
        assert item["quantity_available"] == 3
        assert item["condition"] == "good"

    async def test_no_auth_required(self, client, tenant, club, racket):
        """Inventory listing is public (tenant-scoped only)."""
        resp = await client.get(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200

    async def test_unknown_club_returns_404(self, client, tenant):
        resp = await client.get(
            "/api/v1/equipment",
            params={"club_id": str(uuid.uuid4())},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 404

    async def test_tenant_isolation(self, client, club, racket):
        """Requesting with a different tenant's ID must not return data for this club."""
        other_tenant_id = uuid.uuid4()
        resp = await client.get(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            headers={"X-Tenant-ID": str(other_tenant_id)},
        )
        # Tenant middleware rejects unknown tenant (returns 422) or club doesn't belong to it (404)
        assert resp.status_code in (401, 404, 422)

    async def test_empty_when_no_inventory(self, client, tenant, club):
        """Club with no equipment returns an empty list."""
        resp = await client.get(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /api/v1/bookings/{booking_id}/equipment-rental
# ---------------------------------------------------------------------------

class TestAddEquipmentRental:

    async def test_player_adds_rental_happy_path(
        self, client, player_headers, club, racket, booking_with_player, test_session_factory
    ):
        booking, _ = booking_with_player
        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 2},
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["booking_id"] == str(booking.id)
        assert body["equipment_id"] == str(racket.id)
        assert body["equipment_name"] == "Wilson Pro Racket"
        assert body["item_type"] == "racket"
        assert body["quantity"] == 2
        assert body["charge"] == "10.00"  # 5.00 * 2

    async def test_inventory_decremented(
        self, client, player_headers, club, racket, booking_with_player, test_session_factory
    ):
        booking, _ = booking_with_player
        await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=player_headers,
        )
        async with test_session_factory() as session:
            item = await session.get(EquipmentInventory, racket.id)
            assert item.quantity_available == racket.quantity_available - 1

    async def test_amount_due_updated(
        self, client, player_headers, club, racket, booking_with_player, test_session_factory, player
    ):
        booking, bp = booking_with_player
        original_amount = bp.amount_due

        await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=player_headers,
        )
        async with test_session_factory() as session:
            result = await session.execute(
                select(BookingPlayer).where(
                    BookingPlayer.booking_id == booking.id,
                    BookingPlayer.user_id == player.id,
                )
            )
            updated_bp = result.scalar_one()
            assert updated_bp.amount_due == original_amount + racket.rental_price

    async def test_422_when_insufficient_stock(
        self, client, player_headers, club, racket, booking_with_player
    ):
        booking, _ = booking_with_player
        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 99},
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_403_when_player_not_in_booking(
        self, client, tenant, club, racket, booking_with_player, test_session_factory
    ):
        """A player who is not a booking participant cannot add a rental."""
        booking, _ = booking_with_player
        outsider = User(
            tenant_id=tenant.id,
            email=f"outsider-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Outsider",
            hashed_password=get_password_hash("Test1234!"),
            is_active=True,
            role=TenantUserRole.player,
        )
        async with test_session_factory() as session:
            session.add(outsider)
            await session.commit()
            await session.refresh(outsider)

        token = create_access_token({"sub": str(outsider.id), "tid": str(tenant.id)})
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=headers,
        )
        assert resp.status_code == 403

        async with test_session_factory() as session:
            obj = await session.get(User, outsider.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_404_when_equipment_not_in_club(
        self, client, player_headers, club, booking_with_player
    ):
        """Equipment from a different club must return 404."""
        booking, _ = booking_with_player
        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(uuid.uuid4()), "quantity": 1},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_422_when_booking_is_cancelled(
        self, client, player_headers, club, racket, court_with_hours, player, test_session_factory, tenant
    ):
        async with test_session_factory() as session:
            booking = Booking(
                club_id=club.id,
                court_id=court_with_hours.id,
                booking_type=BookingType.regular,
                status=BookingStatus.cancelled,
                start_datetime=_future(),
                end_datetime=_future() + timedelta(minutes=90),
                created_by_user_id=player.id,
                max_players=4,
                total_price=Decimal("20.00"),
                is_open_game=False,
            )
            session.add(booking)
            await session.flush()
            bp = BookingPlayer(
                booking_id=booking.id,
                user_id=player.id,
                role=PlayerRole.organiser,
                payment_status=PaymentStatus.pending,
                amount_due=Decimal("20.00"),
            )
            session.add(bp)
            await session.commit()
            await session.refresh(booking)

        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=player_headers,
        )
        assert resp.status_code == 422

        async with test_session_factory() as session:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id == booking.id))
            obj = await session.get(Booking, booking.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_staff_can_add_rental_without_being_participant(
        self, client, staff_headers, club, racket, booking_with_player
    ):
        """Staff bypass: staff not in the booking can still add a rental."""
        booking, _ = booking_with_player
        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text

    async def test_unauthenticated_returns_401(
        self, client, club, racket, booking_with_player, tenant
    ):
        booking, _ = booking_with_player
        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code in (401, 403)

    async def test_tenant_isolation(
        self, client, club, racket, booking_with_player, player
    ):
        """Token tenant_id that doesn't match X-Tenant-ID header must be rejected."""
        booking, _ = booking_with_player
        other_tenant_id = uuid.uuid4()
        token = create_access_token({"sub": str(player.id), "tid": str(other_tenant_id)})
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(other_tenant_id)}

        resp = await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=headers,
        )
        assert resp.status_code in (401, 404)


# ---------------------------------------------------------------------------
# POST /api/v1/equipment  (staff create)
# ---------------------------------------------------------------------------

class TestCreateEquipment:

    async def test_staff_creates_item(self, client, staff_headers, club, test_session_factory):
        resp = await client.post(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            json={
                "item_type": "racket",
                "name": "Head Pro Racket",
                "quantity_total": 5,
                "rental_price": "7.50",
                "condition": "good",
            },
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["name"] == "Head Pro Racket"
        assert body["quantity_total"] == 5
        assert body["quantity_available"] == 5  # all available on creation
        assert body["rental_price"] == "7.50"
        assert body["condition"] == "good"

        # cleanup
        async with test_session_factory() as session:
            obj = await session.get(EquipmentInventory, uuid.UUID(body["id"]))
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_player_cannot_create(self, client, player_headers, club):
        resp = await client.post(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            json={"item_type": "racket", "name": "X", "quantity_total": 1, "rental_price": "5.00"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unauthenticated_cannot_create(self, client, club, tenant):
        resp = await client.post(
            "/api/v1/equipment",
            params={"club_id": str(club.id)},
            json={"item_type": "racket", "name": "X", "quantity_total": 1, "rental_price": "5.00"},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# PATCH /api/v1/equipment/{item_id}  (staff update)
# ---------------------------------------------------------------------------

class TestUpdateEquipment:

    async def test_update_name_and_price(self, client, staff_headers, club, racket):
        resp = await client.patch(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            json={"name": "Updated Racket", "rental_price": "8.00"},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["name"] == "Updated Racket"
        assert body["rental_price"] == "8.00"
        assert body["quantity_total"] == racket.quantity_total  # unchanged

    async def test_restock_increases_available(self, client, staff_headers, club, racket):
        """Increasing quantity_total by N adds N to quantity_available."""
        resp = await client.patch(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            json={"quantity_total": racket.quantity_total + 2},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["quantity_total"] == racket.quantity_total + 2
        assert body["quantity_available"] == racket.quantity_available + 2

    async def test_reduce_total_within_available(self, client, staff_headers, club, racket):
        """Can reduce total as long as available covers the reduction."""
        resp = await client.patch(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            json={"quantity_total": racket.quantity_total - 1},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["quantity_total"] == racket.quantity_total - 1
        assert body["quantity_available"] == racket.quantity_available - 1

    async def test_reduce_total_beyond_available_is_rejected(
        self, client, staff_headers, player_headers, club, racket, court_with_hours,
        booking_with_player, test_session_factory
    ):
        """Cannot reduce total below units currently out on rental."""
        booking, _ = booking_with_player
        # Rent all 3 units so quantity_available = 0
        await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 3},
            headers=player_headers,
        )
        resp = await client.patch(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            json={"quantity_total": 1},  # 3 out, can't drop to 1
            headers=staff_headers,
        )
        assert resp.status_code == 422

    async def test_player_cannot_update(self, client, player_headers, club, racket):
        resp = await client.patch(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            json={"name": "Sneaky Rename"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unknown_item_returns_404(self, client, staff_headers, club):
        resp = await client.patch(
            f"/api/v1/equipment/{uuid.uuid4()}",
            params={"club_id": str(club.id)},
            json={"name": "Ghost"},
            headers=staff_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/equipment/{item_id}  (staff retire)
# ---------------------------------------------------------------------------

class TestRetireEquipment:

    async def test_staff_retires_item(self, client, staff_headers, club, test_session_factory, tenant):
        """Retiring sets condition=retired and quantity_available=0."""
        async with test_session_factory() as session:
            item = EquipmentInventory(
                club_id=club.id,
                item_type=ItemType.racket,
                name="Retiring Racket",
                quantity_total=2,
                quantity_available=2,
                rental_price=Decimal("5.00"),
                condition=ItemCondition.good,
            )
            session.add(item)
            await session.commit()
            await session.refresh(item)

        resp = await client.delete(
            f"/api/v1/equipment/{item.id}",
            params={"club_id": str(club.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 204

        async with test_session_factory() as session:
            obj = await session.get(EquipmentInventory, item.id)
            assert obj.condition == ItemCondition.retired
            assert obj.quantity_available == 0
            await session.delete(obj)
            await session.commit()

    async def test_cannot_retire_while_units_out(
        self, client, staff_headers, player_headers, club, racket, booking_with_player
    ):
        """Retire blocked when units are out on active rentals."""
        booking, _ = booking_with_player
        await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": 1},
            headers=player_headers,
        )
        resp = await client.delete(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 422

    async def test_player_cannot_retire(self, client, player_headers, club, racket):
        resp = await client.delete(
            f"/api/v1/equipment/{racket.id}",
            params={"club_id": str(club.id)},
            headers=player_headers,
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Inventory restore on booking cancellation
# ---------------------------------------------------------------------------

class TestInventoryRestoreOnCancel:

    async def test_cancel_restores_quantity_available(
        self, client, player_headers, club, racket, booking_with_player, test_session_factory
    ):
        """Cancelling a booking with rentals restores quantity_available."""
        booking, _ = booking_with_player
        quantity_rented = 2

        await client.post(
            f"/api/v1/bookings/{booking.id}/equipment-rental",
            params={"club_id": str(club.id)},
            json={"equipment_id": str(racket.id), "quantity": quantity_rented},
            headers=player_headers,
        )

        # Confirm inventory was decremented
        async with test_session_factory() as session:
            item = await session.get(EquipmentInventory, racket.id)
            assert item.quantity_available == racket.quantity_available - quantity_rented

        # Cancel the booking
        resp = await client.delete(
            f"/api/v1/bookings/{booking.id}",
            params={"club_id": str(club.id)},
            headers=player_headers,
        )
        assert resp.status_code == 200

        # Inventory should be restored
        async with test_session_factory() as session:
            item = await session.get(EquipmentInventory, racket.id)
            assert item.quantity_available == racket.quantity_available

    async def test_cancel_without_rentals_does_not_change_inventory(
        self, client, player_headers, club, racket, booking_with_player, test_session_factory
    ):
        """Cancelling a booking with no rentals leaves inventory unchanged."""
        booking, _ = booking_with_player

        resp = await client.delete(
            f"/api/v1/bookings/{booking.id}",
            params={"club_id": str(club.id)},
            headers=player_headers,
        )
        assert resp.status_code == 200

        async with test_session_factory() as session:
            item = await session.get(EquipmentInventory, racket.id)
            assert item.quantity_available == racket.quantity_available

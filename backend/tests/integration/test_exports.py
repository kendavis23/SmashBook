"""
Integration tests for the async report-export endpoint (G7).

POST /analytics/exports — role 403, tenant 404, and the happy path (202 +
``analytics.export_requested`` published). The endpoint only validates and
enqueues; file generation lives in the worker, so ``publish_analytics_export`` is
patched to capture the event rather than hitting Pub/Sub.
"""
import uuid

import pytest

import app.analytics.api.exports as exports_api


@pytest.fixture
def captured_publish(monkeypatch):
    """Patch the Pub/Sub publish so no GCP call is made; capture the call."""
    calls = []

    def _fake(event_type, payload):
        calls.append((event_type, payload))

    monkeypatch.setattr(exports_api, "publish_analytics_export", _fake)
    return calls


class TestRoleEnforcement:
    async def test_player_forbidden(self, client, player_headers, club, captured_publish):
        resp = await client.post(
            "/api/v1/analytics/exports",
            headers=player_headers,
            json={"report_type": "revenue_summary", "club_id": str(club.id)},
        )
        assert resp.status_code == 403
        assert captured_publish == []  # nothing enqueued on a rejected request


class TestTenantIsolation:
    async def test_other_tenants_club_returns_404(
        self, client, staff_headers, test_session_factory, plan, captured_publish
    ):
        from app.db.models.club import Club
        from app.db.models.tenant import Tenant as TenantModel

        subdomain = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Tenant", trading_name="Other Tenant",
                player_subdomain=subdomain, staff_subdomain=f"{subdomain}-staff",
                plan_id=plan.id, is_active=True,
            )
            session.add(t2)
            await session.flush()
            other_club = Club(tenant_id=t2.id, name="Other Club", currency="GBP")
            session.add(other_club)
            await session.commit()
            other_club_id, t2_id = other_club.id, t2.id

        try:
            resp = await client.post(
                "/api/v1/analytics/exports",
                headers=staff_headers,
                json={"report_type": "revenue_summary", "club_id": str(other_club_id)},
            )
            assert resp.status_code == 404
            assert captured_publish == []
        finally:
            from sqlalchemy import delete as sql_delete

            async with test_session_factory() as session:
                await session.execute(sql_delete(Club).where(Club.id == other_club_id))
                obj = await session.get(TenantModel, t2_id)
                if obj:
                    await session.delete(obj)
                await session.commit()


class TestHappyPath:
    async def test_accepts_and_enqueues(self, client, staff_headers, club, captured_publish):
        resp = await client.post(
            "/api/v1/analytics/exports",
            headers=staff_headers,
            json={
                "report_type": "player_value",
                "club_id": str(club.id),
                "format": "csv",
            },
        )
        assert resp.status_code == 202
        body = resp.json()
        assert body["status"] == "queued"
        assert body["report_type"] == "player_value"
        assert body["format"] == "csv"

        assert len(captured_publish) == 1
        event_type, payload = captured_publish[0]
        assert event_type == "analytics.export_requested"
        assert payload["club_id"] == str(club.id)
        assert payload["report_type"] == "player_value"
        assert payload["recipient_email"]  # caller's email is attached for delivery

    async def test_unknown_report_type_rejected(self, client, staff_headers, club, captured_publish):
        resp = await client.post(
            "/api/v1/analytics/exports",
            headers=staff_headers,
            json={"report_type": "not_a_report", "club_id": str(club.id)},
        )
        assert resp.status_code == 422  # enum validation, before any publish
        assert captured_publish == []

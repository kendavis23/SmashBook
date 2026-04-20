"""
Unit tests for password reset token logic in app.core.security.

No DB or network required — pure JWT behaviour.

Coverage
--------
- create_reset_token embeds type="reset" and a sub claim
- decode_token returns payload for a valid reset token
- decode_token returns None for a tampered token
- decode_token returns None for an expired reset token
- access and refresh tokens are rejected by the type check used in confirm endpoint
"""
from datetime import datetime, timedelta
from unittest.mock import patch

from jose import jwt

from app.core.security import (
    create_reset_token,
    decode_token,
    create_access_token,
    create_refresh_token,
)
from app.core.config import get_settings

settings = get_settings()


class TestCreateResetToken:
    def test_token_has_reset_type(self):
        token = create_reset_token({"sub": "user-123"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["type"] == "reset"

    def test_token_carries_sub_claim(self):
        token = create_reset_token({"sub": "user-abc"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "user-abc"

    def test_token_expires_within_15_minutes(self):
        token = create_reset_token({"sub": "user-123"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        now = datetime.utcnow()
        assert exp > now
        assert exp <= now + timedelta(minutes=16)


class TestDecodeToken:
    def test_valid_reset_token_decoded(self):
        token = create_reset_token({"sub": "user-xyz"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-xyz"
        assert payload["type"] == "reset"

    def test_tampered_token_returns_none(self):
        token = create_reset_token({"sub": "user-123"})
        tampered = token[:-4] + "xxxx"
        assert decode_token(tampered) is None

    def test_garbage_string_returns_none(self):
        assert decode_token("not.a.valid.token") is None

    def test_expired_token_returns_none(self):
        with patch("app.core.security.datetime") as mock_dt:
            mock_dt.utcnow.return_value = datetime.utcnow() - timedelta(minutes=30)
            token = create_reset_token({"sub": "user-123"})
        assert decode_token(token) is None


class TestTokenTypeRejection:
    """
    The confirm endpoint checks payload.get("type") != "reset".
    Verify access and refresh tokens fail that check.
    """

    def test_access_token_has_wrong_type(self):
        token = create_access_token({"sub": "user-123", "tid": "tenant-456"})
        payload = decode_token(token)
        assert payload is not None
        assert payload.get("type") != "reset"

    def test_refresh_token_has_wrong_type(self):
        token = create_refresh_token({"sub": "user-123", "tid": "tenant-456"})
        payload = decode_token(token)
        assert payload is not None
        assert payload.get("type") != "reset"

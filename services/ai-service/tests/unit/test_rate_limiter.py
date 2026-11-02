import pytest
from fastapi import HTTPException

from app.rate_limiter import UserRateLimiter


def test_rate_limiter_allows_under_quota():
    limiter = UserRateLimiter(max_requests=3, window_seconds=60)
    user_id = "test-user-1"

    headers1 = limiter.check(user_id)
    assert headers1["X-RateLimit-Limit"] == "3"
    assert headers1["X-RateLimit-Remaining"] == "2"

    headers2 = limiter.check(user_id)
    assert headers2["X-RateLimit-Remaining"] == "1"

    headers3 = limiter.check(user_id)
    assert headers3["X-RateLimit-Remaining"] == "0"


def test_rate_limiter_blocks_when_exceeded():
    limiter = UserRateLimiter(max_requests=2, window_seconds=60)
    user_id = "test-user-2"

    limiter.check(user_id)
    limiter.check(user_id)

    with pytest.raises(HTTPException) as exc_info:
        limiter.check(user_id)

    assert exc_info.value.status_code == 429
    assert "Vượt quá giới hạn" in exc_info.value.detail
    assert "Retry-After" in exc_info.value.headers
    assert exc_info.value.headers["X-RateLimit-Remaining"] == "0"


def test_rate_limiter_isolates_users():
    limiter = UserRateLimiter(max_requests=1, window_seconds=60)
    user_a = "user-a"
    user_b = "user-b"

    limiter.check(user_a)
    with pytest.raises(HTTPException):
        limiter.check(user_a)

    # user_b should still be allowed
    headers_b = limiter.check(user_b)
    assert headers_b["X-RateLimit-Remaining"] == "0"


def test_rate_limiter_reset():
    limiter = UserRateLimiter(max_requests=1, window_seconds=60)
    user_id = "reset-user"

    limiter.check(user_id)
    with pytest.raises(HTTPException):
        limiter.check(user_id)

    limiter.reset(user_id)
    headers = limiter.check(user_id)
    assert headers["X-RateLimit-Remaining"] == "0"


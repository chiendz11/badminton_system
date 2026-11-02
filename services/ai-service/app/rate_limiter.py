import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException


class UserRateLimiter:
    """Sliding-window in-memory rate limiter per actor user_id."""

    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._records: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, user_id: str) -> dict[str, str]:
        """Check rate limit for user_id.

        Raises HTTPException(429) if exceeded.
        Returns rate limit headers if allowed.
        """
        now = time.monotonic()
        with self._lock:
            timestamps = self._records[user_id]
            cutoff = now - self.window_seconds
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= self.max_requests:
                oldest = timestamps[0]
                retry_after = max(1, int(oldest + self.window_seconds - now) + 1)
                raise HTTPException(
                    status_code=429,
                    detail=f"Vượt quá giới hạn {self.max_requests} yêu cầu AI mỗi {self.window_seconds} giây. Thử lại sau.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.max_requests),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(retry_after),
                    },
                )

            timestamps.append(now)
            remaining = self.max_requests - len(timestamps)
            return {
                "X-RateLimit-Limit": str(self.max_requests),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(self.window_seconds),
            }

    def reset(self, user_id: str | None = None) -> None:
        """Reset records for testing."""
        with self._lock:
            if user_id:
                self._records.pop(user_id, None)
            else:
                self._records.clear()


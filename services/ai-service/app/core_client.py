from dataclasses import dataclass
from typing import Any

import httpx


@dataclass
class CoreError(Exception):
    status: int
    message: str


class BookingCoreClient:
    def __init__(self, client: httpx.AsyncClient, token: str, request_id: str):
        self.client, self.token, self.request_id = client, token, request_id

    async def call(
        self, method: str, path: str, body: dict | None = None, key: str | None = None
    ) -> Any:
        headers = {"Authorization": "Bearer " + self.token, "X-Request-Id": self.request_id}
        if key:
            headers["Idempotency-Key"] = key
        try:
            r = await self.client.request(method, path, json=body, headers=headers)
            if not r.is_success:
                raise CoreError(r.status_code, "Booking Core từ chối yêu cầu")
            return r.json()
        except httpx.TimeoutException:
            raise CoreError(504, "Booking Core chậm; kết quả chưa xác định") from None
        except (httpx.HTTPError, ValueError):
            raise CoreError(502, "Booking Core không sẵn sàng") from None

    async def centers(self):
        items = []
        for page in range(1, 6):
            d = await self.call("GET", f"/api/v1/centers?limit=100&page={page}")
            items.extend(d["items"])
            if len(items) >= d["total"] or not d["items"]:
                break
        return items

    async def availability(self, center_id, date):
        return await self.call("GET", f"/api/v1/centers/{center_id}/availability?date={date}")

    async def reserve(self, o, key):
        return await self.call(
            "POST",
            "/api/v1/reservations",
            {
                "centerId": o["center_id"],
                "date": o["date"],
                "selections": [{"courtId": o["court_id"], "slots": o["slots"]}],
            },
            key,
        )

    async def confirm(self, id):
        return await self.call("POST", f"/api/v1/reservations/{id}/confirm")

    async def release(self, id):
        return await self.call("DELETE", f"/api/v1/reservations/{id}")

    async def booking(self, id):
        return await self.call("GET", f"/api/v1/bookings/{id}")

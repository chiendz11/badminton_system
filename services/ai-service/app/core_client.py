from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

import httpx


@dataclass
class CoreError(Exception):
    status: int
    message: str


@dataclass
class CenterDiscovery:
    items: list[dict]
    total: int
    complete: bool


class BookingCoreClient:
    def __init__(self, client: httpx.AsyncClient, token: str, request_id: str):
        self.client, self.token, self.request_id = client, token, request_id
        self.calls = 0

    async def call(
        self, method: str, path: str, body: dict | None = None, key: str | None = None
    ) -> Any:
        headers = {"Authorization": "Bearer " + self.token, "X-Request-Id": self.request_id}
        if key:
            headers["Idempotency-Key"] = key
        self.calls += 1
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
        return (await self.discover_centers()).items

    async def discover_centers(self, max_pages=5):
        items = []
        total = 0
        for page in range(1, max_pages + 1):
            d = await self.call("GET", f"/api/v1/centers?limit=100&page={page}")
            if (
                not isinstance(d, dict)
                or not isinstance(d.get("items"), list)
                or type(d.get("total")) is not int
                or d["total"] < 0
            ):
                raise CoreError(502, "Core trả danh sách trung tâm không hợp lệ")
            total = d["total"]
            items.extend(d["items"])
            if len(items) >= d["total"] or not d["items"]:
                break
        if len({c.get("id") for c in items if isinstance(c, dict)}) != len(items):
            raise CoreError(502, "Core trả danh sách trung tâm trùng hoặc không hợp lệ")
        return CenterDiscovery(items, total, len(items) >= total)

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
        return await self.call("GET", f"/api/v1/bookings/{UUID(id)}")

    async def my_bookings(self, params):
        allowed = {"page", "limit", "dateFrom", "dateTo", "status", "search"}
        if set(params) - allowed:
            raise ValueError("Unsupported personal booking filter")
        return await self.call("GET", "/api/v1/bookings/me?" + urlencode(params))

    async def find_centers(self, term, page=1):
        return await self.call(
            "GET", "/api/v1/centers?" + urlencode({"search": term, "page": page, "limit": 10})
        )

    async def cancel_booking(self, booking_id):
        return await self.call("POST", f"/api/v1/bookings/{UUID(booking_id)}/cancel")

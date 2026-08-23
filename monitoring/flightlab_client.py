"""HTTP adapter for deployment probing and real FlightLab journeys."""

import httpx

from .lifecycle import Journey


class HttpFlightLabClient:
    def __init__(self, base_url: str, *, client: httpx.AsyncClient | None = None):
        self.client = client or httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=15)

    async def get_version(self) -> dict:
        response = await self.client.get("/api/version")
        response.raise_for_status()
        return response.json()

    async def exercise(self, journey: Journey) -> int:
        response = await self.client.post(
            journey.route,
            json=journey.body,
            headers={"X-Request-ID": journey.request_id},
        )
        return response.status_code

    async def aclose(self) -> None:
        await self.client.aclose()

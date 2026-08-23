"""Modular ASGI application for webhooks, runtime ingress, replay SSE, and MCP mounts."""

import asyncio
from contextlib import AsyncExitStack, asynccontextmanager
import hmac
import json
from typing import Any

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse, StreamingResponse
from starlette.routing import Mount, Route

from .config import Settings
from .flightlab_client import HttpFlightLabClient
from .github import WebhookError, WebhookService
from .github_client import GitHubSnapshotter
from .lifecycle import LifecycleCoordinator
from .prometheus import render_metrics
from .replay import ReplayService
from .runtime_ingress import IngressError, RuntimeIngress
from .store import SessionStore
from opssemble_mcp.profiles import ToolServices, create_profiles


class BearerProtected:
    """Small ASGI auth boundary shared by all four MCP profile apps."""

    def __init__(self, app: Any, token: str):
        self.app = app
        self.token = token

    async def __call__(self, scope, receive, send):
        headers = {key.decode().lower(): value.decode() for key, value in scope.get("headers", [])}
        expected = f"Bearer {self.token}"
        if not self.token or not hmac.compare_digest(headers.get("authorization", ""), expected):
            await JSONResponse(
                {"error": {"code": "UNAUTHORIZED"}}, status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )(scope, receive, send)
            return
        await self.app(scope, receive, send)


def create_app(settings: Settings | None = None, *, store: SessionStore | None = None,
               replay: ReplayService | None = None, flightlab: Any = None,
               snapshotter: Any = None) -> Starlette:
    settings = settings or Settings.from_env()
    store = store or SessionStore(
        ttl_seconds=settings.session_ttl_seconds,
        max_sessions=settings.max_sessions,
    )
    replay = replay or ReplayService(store, replay_speed=settings.replay_speed)
    flightlab = flightlab or HttpFlightLabClient(settings.flightlab_base_url)
    snapshotter = snapshotter or GitHubSnapshotter(settings.github_repository, settings.github_token)
    coordinator = LifecycleCoordinator(store, flightlab)
    ingress = RuntimeIngress(store, secret=settings.ingest_secret)
    lifecycle_tasks: set[asyncio.Task] = set()

    async def on_session(session_id: str) -> None:
        task = asyncio.create_task(coordinator.run(session_id))
        lifecycle_tasks.add(task)
        task.add_done_callback(lifecycle_tasks.discard)

    tool_services = ToolServices(
        store,
        replay,
        repository_url=f"https://github.com/{settings.github_repository}",
        on_repair_session=on_session,
    )
    mcp_servers = create_profiles(tool_services)
    mcp_apps = {
        name: server.http_app(path="/", stateless_http=True, json_response=True)
        for name, server in mcp_servers.items()
    }

    webhook = WebhookService(
        store=store,
        repository=settings.github_repository,
        webhook_secret=settings.github_webhook_secret,
        snapshotter=snapshotter,
        on_session=on_session,
        repair_tracker=tool_services.actions,
    )

    async def github_webhook(request: Request):
        body = await request.body()
        try:
            result = await webhook.handle(request.headers, body)
        except WebhookError as error:
            return JSONResponse({"error": {"code": error.code}}, status_code=error.status_code)
        return JSONResponse(result, status_code=202)

    async def runtime_trigger(request: Request):
        body = await request.body()
        try:
            result = ingress.ingest(request.headers, body)
        except IngressError as error:
            return JSONResponse({"error": {"code": error.code}}, status_code=error.status_code)
        return JSONResponse(result, status_code=200 if result["duplicate"] else 202)

    async def session_events(request: Request):
        session_id = request.path_params["session_id"]
        if store.get_session(session_id) is None:
            return JSONResponse({"error": {"code": "SESSION_NOT_FOUND"}}, status_code=404)
        last_id = request.headers.get("Last-Event-ID") or request.query_params.get("cursor")

        async def stream():
            nonlocal last_id
            while True:
                replay.materialize_session_events(session_id)
                session = store.get_session(session_id)
                if session is None:
                    return
                events = store.events_after(session_id, last_id)
                for event in events:
                    last_id = event.id
                    data = json.dumps(event.data, sort_keys=True, separators=(",", ":"))
                    yield f"id: {event.id}\nevent: {event.type}\ndata: {data}\n\n"
                if session.state == "complete" or session.completion_status == "incomplete":
                    return
                if not events:
                    yield ": keepalive\n\n"
                await asyncio.sleep(0.25)

        return StreamingResponse(stream(), media_type="text/event-stream")

    async def metrics(_request: Request):
        return PlainTextResponse(
            render_metrics(store, replay),
            media_type="text/plain; version=0.0.4; charset=utf-8",
        )

    async def health(_request: Request):
        return JSONResponse({"status": "ok"})

    async def ready(_request: Request):
        missing = settings.missing()
        body = {
            "status": "ready" if not missing else "not_ready",
            "storage": "memory",
            "replicaLimit": 1,
            "sessionTtlSeconds": settings.session_ttl_seconds,
            "maxSessions": settings.max_sessions,
        }
        if missing:
            body["missing"] = missing
        return JSONResponse(body, status_code=200 if not missing else 503)

    @asynccontextmanager
    async def lifespan(_app: Starlette):
        async with AsyncExitStack() as stack:
            for mcp_app in mcp_apps.values():
                await stack.enter_async_context(mcp_app.lifespan(mcp_app))
            yield
            for task in lifecycle_tasks:
                task.cancel()
            if lifecycle_tasks:
                await asyncio.gather(*lifecycle_tasks, return_exceptions=True)
            for resource in (flightlab, snapshotter):
                close = getattr(resource, "aclose", None)
                if close:
                    await close()

    app = Starlette(routes=[
        Route("/integrations/github/webhook", github_webhook, methods=["POST"]),
        Route("/monitoring/v1/ingest/runtime", runtime_trigger, methods=["POST"]),
        Route("/monitoring/v1/sessions/{session_id}/events", session_events, methods=["GET"]),
        Route("/metrics", metrics, methods=["GET"]),
        Route("/healthz", health, methods=["GET"]),
        Route("/readyz", ready, methods=["GET"]),
        *(Mount(f"/mcp/{name}", app=BearerProtected(mcp_apps[name], settings.mcp_token))
          for name in ("control", "planner", "agent", "actions")),
    ], lifespan=lifespan)
    app.state.settings = settings
    app.state.store = store
    app.state.replay = replay
    app.state.webhook = webhook
    app.state.coordinator = coordinator
    app.state.runtime_ingress = ingress
    app.state.tool_services = tool_services
    app.state.mcp_servers = mcp_servers
    return app


app = create_app()

"""Mechanical GitHub REST snapshotting with no risk or outcome inference."""

import asyncio
import base64
from typing import Any

import httpx


DOC_PATHS = ("README.md", "docs/ARCHITECTURE.md", "docs/RUNBOOK.md", "docs/PRODUCT_METRICS.md")


class GitHubSnapshotter:
    def __init__(self, repository: str, token: str, *, client: httpx.AsyncClient | None = None):
        self.repository = repository
        self.client = client or httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=15,
        )

    async def _document(self, path: str, ref: str) -> tuple[str, str] | None:
        response = await self.client.get(f"/repos/{self.repository}/contents/{path}", params={"ref": ref})
        if response.status_code == 404:
            return None
        response.raise_for_status()
        body = response.json()
        if body.get("encoding") != "base64":
            return None
        return path, base64.b64decode(body["content"]).decode(errors="replace")

    async def snapshot(self, payload: dict[str, Any]) -> dict[str, Any]:
        pull = payload["pull_request"]
        number = int(pull["number"])
        head_sha = pull["head"]["sha"]
        files_response, checks_response, *documents = await asyncio.gather(
            self.client.get(f"/repos/{self.repository}/pulls/{number}/files", params={"per_page": 100}),
            self.client.get(
                f"/repos/{self.repository}/commits/{head_sha}/check-runs",
                headers={"Accept": "application/vnd.github+json"},
            ),
            *(self._document(path, head_sha) for path in DOC_PATHS),
        )
        files_response.raise_for_status()
        checks_response.raise_for_status()
        files = files_response.json()
        checks = checks_response.json().get("check_runs", [])
        if not checks or any(check.get("status") != "completed" for check in checks):
            check_state = "pending"
        elif all(check.get("conclusion") in {"success", "neutral", "skipped"} for check in checks):
            check_state = "success"
        else:
            check_state = "failure"
        diff_parts = []
        for file in files:
            filename = file["filename"]
            diff_parts.append(f"diff --git a/{filename} b/{filename}\n{file.get('patch', '')}\n")
        merged = pull.get("merged") is True
        return {
            "changeId": f"{self.repository}#{number}",
            "dataMode": "live",
            "repository": self.repository,
            "repositoryUrl": payload["repository"].get("html_url"),
            "number": number,
            "title": pull.get("title", ""),
            "body": pull.get("body") or "",
            "url": pull.get("html_url"),
            "state": "merged" if merged else pull.get("state"),
            "headSha": head_sha,
            "baseSha": pull.get("base", {}).get("sha"),
            "mergeSha": pull.get("merge_commit_sha") if merged else None,
            "releaseSha": None,
            "changedFiles": [{
                "path": file["filename"],
                "additions": file.get("additions", 0),
                "deletions": file.get("deletions", 0),
                "status": file.get("status", "modified"),
            } for file in files],
            "diff": "".join(diff_parts),
            "repositoryDocs": dict(document for document in documents if document is not None),
            "checks": {
                "state": check_state,
                "required": [{
                    "name": check.get("name"),
                    "status": check.get("status"),
                    "conclusion": check.get("conclusion"),
                    "url": check.get("html_url"),
                } for check in checks],
            },
            "deployment": {"state": "pending" if merged else "not_started", "url": None},
        }

    async def aclose(self) -> None:
        await self.client.aclose()

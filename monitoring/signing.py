"""Shared HMAC verification without coupling GitHub and runtime secrets."""

from hashlib import sha256
import hmac
from typing import Mapping


def verify_sha256(headers: Mapping[str, str], header_name: str, body: bytes, secret: str) -> bool:
    normalized = {key.lower(): value for key, value in headers.items()}
    supplied = normalized.get(header_name.lower(), "")
    if not supplied.startswith("sha256=") or not secret:
        return False
    expected = hmac.new(secret.encode(), body, sha256).hexdigest()
    return hmac.compare_digest(supplied, f"sha256={expected}")

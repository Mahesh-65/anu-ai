import logging
from typing import Any, Dict, Optional

import httpx

from src.config import settings

logger = logging.getLogger(__name__)


async def _post_purge(url: str, payload: Dict[str, Any]) -> Optional[dict]:
    if not url:
        return None
    endpoint = f"{url.rstrip('/')}/api/internal/purge-user"
    headers = {"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning("User purge failed for %s: %s", endpoint, exc)
        return None


async def purge_user_data(user: dict) -> dict:
    """Remove a user's records from auth and downstream services."""
    from src.database import get_collection

    email = user["email"]
    payload = {
        "email": email,
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
    }

    token_col = get_collection("refresh_tokens")
    tokens_deleted = (await token_col.delete_many({"user_email": email})).deleted_count

    hr_result = await _post_purge(settings.HR_SERVICE_URL, payload)
    project_result = await _post_purge(settings.PROJECT_SERVICE_URL, payload)
    finance_result = await _post_purge(settings.FINANCE_SERVICE_URL, payload)

    return {
        "refresh_tokens_deleted": tokens_deleted,
        "hr": hr_result,
        "projects": project_result,
        "finance": finance_result,
    }

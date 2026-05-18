from __future__ import annotations

import json
import re
from typing import Optional

import httpx

from backend.config import settings


async def enrich_report(item_type: str, draft_name: str, draft_loc: str, draft_desc: str) -> dict:
    if settings.openai_api_key:
        llm = await _enrich_with_openai(item_type, draft_name, draft_loc, draft_desc)
        if llm:
            return llm

    local = _local_enrich(item_type, draft_name, draft_loc, draft_desc)
    return {"source": "local", **local}


async def _enrich_with_openai(item_type: str, draft_name: str, draft_loc: str, draft_desc: str) -> Optional[dict]:
    system = (
        "You help a university lost-and-found office. "
        "Return only valid JSON with keys: name, loc, description, emoji. "
        "Write specific, discriminative details that increase matching quality "
        "(color, brand, unique marks, where/when seen) but never invent identity data."
    )
    payload = {
        "report_type": item_type,
        "item_name_draft": draft_name or "",
        "location_draft": draft_loc or "",
        "details_draft": draft_desc or "",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": json.dumps(payload)},
                    ],
                },
            )
            r.raise_for_status()
        content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        parsed = _try_json(content)
        if not parsed:
            return None
        return {
            "source": "openai",
            "name": str(parsed.get("name", "")).strip()[:200],
            "loc": str(parsed.get("loc", "")).strip()[:300],
            "description": str(parsed.get("description", "")).strip()[:2000],
            "emoji": _pick_emoji(str(parsed.get("emoji", ""))) or _heuristic_emoji(draft_name, draft_desc),
        }
    except Exception:
        return None


def _try_json(content: str) -> Optional[dict]:
    try:
        return json.loads(content)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", content)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except Exception:
            return None


def _pick_emoji(text: str) -> str:
    for ch in text:
        if ord(ch) > 10000:
            return ch
    return ""


def _local_enrich(item_type: str, name: str, loc: str, desc: str) -> dict:
    title = name.strip() if name.strip() else ("Lost item" if item_type == "lost" else "Found item")
    location = loc.strip() if loc.strip() else "PUP campus"
    description = desc.strip()
    if not description:
        description = (
            "Please contact campus lost and found if this is your item."
            if item_type == "found"
            else "Please help identify and return this item through campus lost and found."
        )
    return {
        "name": title[:200],
        "loc": location[:300],
        "description": description[:2000],
        "emoji": _heuristic_emoji(name, desc),
    }


def _heuristic_emoji(name: str, desc: str) -> str:
    t = f"{name} {desc}".lower()
    if "id" in t or "card" in t:
        return "🪪"
    if "umbrella" in t:
        return "☂️"
    if "charger" in t or "cable" in t:
        return "🔌"
    if "glass" in t:
        return "👓"
    if "bottle" in t:
        return "🍶"
    return "📦"

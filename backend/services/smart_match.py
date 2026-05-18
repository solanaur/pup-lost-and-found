from collections import Counter
from difflib import SequenceMatcher
import math
import re

from backend.models import Item


TOKEN_RE = re.compile(r"[a-z0-9]+")
STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "for",
    "at",
    "in",
    "on",
    "of",
    "this",
    "that",
    "item",
    "lost",
    "found",
    "campus",
    "pup",
}
LOCATION_HINTS = {
    "library",
    "canteen",
    "gymnasium",
    "registrar",
    "engineering",
    "computer",
    "lab",
    "court",
    "hallway",
    "faculty",
    "room",
}


def smart_matches(query: dict, candidates: list[Item], top_k: int = 5) -> list[dict]:
    q_name = (query.get("name") or "").lower().strip()
    q_loc = (query.get("loc") or "").lower().strip()
    q_desc = (query.get("description") or "").lower().strip()
    q_all_tokens = _tokens(f"{q_name} {q_desc}")
    q_tokens = {t for t in q_all_tokens if t not in STOPWORDS}
    q_loc_tokens = {t for t in _tokens(q_loc) if t not in STOPWORDS}

    rarity = _build_token_rarity(candidates)

    scored = []
    for item in candidates:
        i_name = (item.name or "").lower()
        i_loc = (item.loc or "").lower()
        i_desc = (item.description or "").lower()
        i_tokens = {t for t in _tokens(f"{i_name} {i_desc}") if t not in STOPWORDS}
        i_loc_tokens = {t for t in _tokens(i_loc) if t not in STOPWORDS}

        weighted_overlap = _weighted_overlap(q_tokens, i_tokens, rarity)
        name_sim = SequenceMatcher(None, q_name, i_name).ratio()
        loc_sim = SequenceMatcher(None, q_loc, i_loc).ratio()
        desc_sim = SequenceMatcher(None, q_desc, i_desc).ratio()
        loc_keyword_match = _location_keyword_match(q_loc_tokens, i_loc_tokens)
        exact_keyword_match = _exact_keyword_match(q_tokens, i_tokens)

        score = (
            0.35 * weighted_overlap
            + 0.23 * name_sim
            + 0.15 * loc_sim
            + 0.10 * desc_sim
            + 0.12 * loc_keyword_match
            + 0.05 * exact_keyword_match
        )
        score = min(1.0, score + _time_decay_boost(item.id))
        if score < 0.28:
            continue

        reason = _build_reason(q_tokens, i_tokens, q_loc_tokens, i_loc_tokens, name_sim, loc_sim)
        scored.append((score, item, reason))

    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, item, reason in scored[:top_k]:
        out.append(
            {
                "item_id": item.id,
                "score": round(score, 3),
                "confidence": _confidence(score),
                "reason": reason,
                "type": item.type,
                "name": item.name,
                "loc": item.loc,
                "description": item.description or "",
                "date": item.created_at.strftime("%b %-d") if hasattr(item.created_at, "strftime") else "",
            }
        )
    return out


def _tokens(text: str) -> set:
    return set(TOKEN_RE.findall(text or ""))


def _build_token_rarity(candidates: list[Item]) -> dict:
    counts = Counter()
    for item in candidates:
        toks = {t for t in _tokens(f"{item.name or ''} {item.description or ''}") if t not in STOPWORDS}
        for tok in toks:
            counts[tok] += 1
    total = max(1, len(candidates))
    return {tok: math.log(1 + (total / freq)) for tok, freq in counts.items()}


def _weighted_overlap(a: set, b: set, rarity: dict) -> float:
    if not a or not b:
        return 0.0
    inter = a & b
    union = a | b
    inter_w = sum(rarity.get(t, 1.0) for t in inter)
    union_w = sum(rarity.get(t, 1.0) for t in union)
    return inter_w / union_w if union_w else 0.0


def _location_keyword_match(a: set, b: set) -> float:
    ah = {x for x in a if x in LOCATION_HINTS}
    bh = {x for x in b if x in LOCATION_HINTS}
    if not ah or not bh:
        return 0.0
    return len(ah & bh) / len(ah | bh)


def _exact_keyword_match(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    # Requires at least one meaningful shared keyword.
    shared = [x for x in (a & b) if len(x) >= 4]
    return 1.0 if shared else 0.0


def _build_reason(q_tokens: set, i_tokens: set, q_loc: set, i_loc: set, name_sim: float, loc_sim: float) -> str:
    shared_keywords = [x for x in sorted(q_tokens & i_tokens) if len(x) >= 4][:3]
    shared_places = [x for x in sorted(q_loc & i_loc) if len(x) >= 3][:2]
    reasons = []
    if shared_keywords:
        reasons.append("shared item traits: " + ", ".join(shared_keywords))
    if shared_places:
        reasons.append("similar location: " + ", ".join(shared_places))
    if name_sim >= 0.6:
        reasons.append("very similar item name")
    elif loc_sim >= 0.6:
        reasons.append("high location similarity")
    return "; ".join(reasons) if reasons else "overall textual similarity across report details"


def _time_decay_boost(item_id: int) -> float:
    return (math.sin(item_id) + 1.0) * 0.015


def _confidence(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.52:
        return "medium"
    return "low"

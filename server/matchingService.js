const TOKEN_RE = /[a-z0-9]+/g;
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'for', 'at', 'in', 'on', 'of',
  'this', 'that', 'item', 'lost', 'found', 'campus', 'pup', 'near', 'with',
]);
const LOCATION_HINTS = new Set([
  'library', 'canteen', 'gymnasium', 'registrar', 'engineering', 'computer',
  'lab', 'court', 'hallway', 'faculty', 'room', 'building', 'gym', 'lobby', 'floor',
]);
const COLORS = ['black', 'white', 'blue', 'red', 'green', 'navy', 'brown', 'gray', 'grey', 'yellow', 'pink', 'purple', 'silver', 'gold'];

const WEIGHTS = {
  category: 0.20,
  name: 0.20,
  color: 0.15,
  description: 0.20,
  location: 0.10,
  date: 0.10,
  tags: 0.05,
};

function tokens(text) {
  return new Set(String(text || '').toLowerCase().match(TOKEN_RE) || []);
}

function tokenList(text) {
  return [...tokens(text)].filter((t) => !STOPWORDS.has(t) && t.length >= 2);
}

function seqRatio(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return (2 * dp[m][n]) / (m + n);
}

function parseColors(text) {
  const t = String(text || '').toLowerCase();
  return COLORS.filter((c) => t.includes(c));
}

function colorScore(a, b) {
  const ca = new Set(parseColors(`${a.color || ''} ${a.ai_detected_colors || ''}`));
  const cb = new Set(parseColors(`${b.color || ''} ${b.ai_detected_colors || ''}`));
  if (!ca.size && !cb.size) return 0.5;
  if (!ca.size || !cb.size) return 0.35;
  const inter = [...ca].filter((c) => cb.has(c));
  if (!inter.length) return 0;
  return inter.length / new Set([...ca, ...cb]).size;
}

function categoryScore(a, b) {
  const ca = (a.ai_detected_category || a.item_category || '').toLowerCase();
  const cb = (b.ai_detected_category || b.item_category || '').toLowerCase();
  if (!ca || !cb) return 0.4;
  if (ca === cb) return 1;
  return seqRatio(ca, cb);
}

function tagScore(a, b) {
  const ta = new Set((a.ai_tags || []).map((t) => String(t).toLowerCase()));
  const tb = new Set((b.ai_tags || []).map((t) => String(t).toLowerCase()));
  if (!ta.size && !tb.size) {
    const fallbackA = tokenList(`${a.name} ${a.description} ${a.ai_description || ''}`);
    const fallbackB = tokenList(`${b.name} ${b.description} ${b.ai_description || ''}`);
    if (!fallbackA.length || !fallbackB.length) return 0.3;
    const inter = fallbackA.filter((t) => fallbackB.includes(t));
    return inter.length / new Set([...fallbackA, ...fallbackB]).size;
  }
  if (!ta.size || !tb.size) return 0.25;
  const inter = [...ta].filter((t) => tb.has(t));
  return inter.length / new Set([...ta, ...tb]).size;
}

function locationScore(a, b) {
  const la = `${a.loc || ''} ${a.building || ''} ${a.floor || ''} ${a.room || ''}`.toLowerCase();
  const lb = `${b.loc || ''} ${b.building || ''} ${b.floor || ''} ${b.room || ''}`.toLowerCase();
  const sim = seqRatio(la, lb);
  const ta = tokens(la);
  const tb = tokens(lb);
  const ah = [...ta].filter((x) => LOCATION_HINTS.has(x));
  const bh = [...tb].filter((x) => LOCATION_HINTS.has(x));
  let kw = 0;
  if (ah.length && bh.length) {
    kw = ah.filter((x) => bh.includes(x)).length / new Set([...ah, ...bh]).size;
  }
  if (a.building && b.building && a.building === b.building) kw = Math.max(kw, 0.85);
  return Math.min(1, sim * 0.55 + kw * 0.45);
}

function dateScore(a, b) {
  const da = new Date(a.date_lost || a.created_at || 0).getTime();
  const db = new Date(b.date_lost || b.created_at || 0).getTime();
  if (!da || !db) return 0.5;
  const days = Math.abs(da - db) / (1000 * 60 * 60 * 24);
  if (days <= 1) return 1;
  if (days <= 3) return 0.85;
  if (days <= 7) return 0.7;
  if (days <= 14) return 0.5;
  if (days <= 30) return 0.35;
  return 0.15;
}

function descriptionScore(a, b) {
  const da = `${a.description || ''} ${a.ai_description || ''}`.toLowerCase().trim();
  const db = `${b.description || ''} ${b.ai_description || ''}`.toLowerCase().trim();
  if (!da && !db) return 0.4;
  const sim = seqRatio(da, db);
  const ta = new Set(tokenList(da));
  const tb = new Set(tokenList(db));
  const overlap = ta.size && tb.size
    ? [...ta].filter((t) => tb.has(t)).length / new Set([...ta, ...tb]).size
    : 0;
  return Math.min(1, sim * 0.6 + overlap * 0.4);
}

function photoScore(a, b) {
  if (!a.photo_data || !b.photo_data) return 0.5;
  if (a.photo_data === b.photo_data) return 1;
  const ua = a.photo_data.slice(0, 120);
  const ub = b.photo_data.slice(0, 120);
  return seqRatio(ua, ub) > 0.9 ? 0.95 : 0.55;
}

function buildMatchReason(lost, found, breakdown, score) {
  const parts = [];
  if (breakdown.category >= 0.8) parts.push('same category');
  if (breakdown.name >= 0.65) parts.push('similar item name');
  if (breakdown.color >= 0.7) parts.push('matching color');
  if (breakdown.description >= 0.6) parts.push('similar description');
  if (breakdown.location >= 0.6) parts.push('similar location');
  if (breakdown.date >= 0.7) parts.push('close report dates');
  if (breakdown.tags >= 0.5) parts.push('overlapping AI tags');
  const detail = parts.length ? parts.join(', ') : 'overall attribute similarity';
  if (score >= 90) {
    return `High match because both reports describe a ${found.color || lost.color || ''} ${found.item_category || lost.item_category || 'item'}, ${detail}.`.replace(/\s+/g, ' ').trim();
  }
  return `Possible match based on ${detail}.`;
}

function compareLostAndFound(lost, found) {
  const breakdown = {
    category: categoryScore(lost, found),
    name: seqRatio((lost.name || '').toLowerCase(), (found.name || '').toLowerCase()),
    color: colorScore(lost, found),
    description: descriptionScore(lost, found),
    location: locationScore(lost, found),
    date: dateScore(lost, found),
    tags: tagScore(lost, found),
  };

  let score =
    WEIGHTS.category * breakdown.category +
    WEIGHTS.name * breakdown.name +
    WEIGHTS.color * breakdown.color +
    WEIGHTS.description * breakdown.description +
    WEIGHTS.location * breakdown.location +
    WEIGHTS.date * breakdown.date +
    WEIGHTS.tags * breakdown.tags;

  const photoBoost = photoScore(lost, found);
  score = Math.min(1, score * 0.92 + photoBoost * 0.08);

  const matchScore = Math.round(score * 100);
  const matchReason = buildMatchReason(lost, found, breakdown, matchScore);

  return {
    match_score: matchScore,
    match_reason: matchReason,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 100)])
    ),
    confidence: matchScore >= 90 ? 'strong' : matchScore >= 75 ? 'good' : matchScore >= 50 ? 'possible' : 'weak',
    confidence_label: matchScore >= 90 ? 'Strong Match' : matchScore >= 75 ? 'Good Match' : matchScore >= 50 ? 'Possible Match' : 'Weak Match',
  };
}

function normalizePair(itemA, itemB) {
  if (itemA.type === 'lost' && itemB.type === 'found') {
    return { lost: itemA, found: itemB };
  }
  if (itemA.type === 'found' && itemB.type === 'lost') {
    return { lost: itemB, found: itemA };
  }
  return null;
}

function smartMatches(query, candidates, topK = 8) {
  const queryItem = {
    name: query.name || '',
    loc: query.loc || '',
    description: query.description || '',
    item_category: query.item_category || '',
    color: query.color || '',
    ai_tags: query.ai_tags || [],
    ai_description: query.ai_description || '',
    ai_detected_category: query.ai_detected_category || '',
    ai_detected_colors: query.ai_detected_colors || '',
    building: query.building || '',
    floor: query.floor || '',
    room: query.room || '',
    date_lost: query.date_lost || '',
    created_at: query.created_at || '',
    photo_data: query.photo_data || '',
    type: query.type || 'lost',
  };

  const scored = [];
  for (const candidate of candidates) {
    const pair = normalizePair(
      { ...queryItem, type: queryItem.type || 'lost' },
      candidate
    );
    if (!pair) continue;
    const result = compareLostAndFound(pair.lost, pair.found);
    if (result.match_score < 50) continue;
    const item = candidate;
    scored.push({
      score: result.match_score / 100,
      item,
      reason: result.match_reason,
      breakdown: result.breakdown,
      confidence_label: result.confidence_label,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ score, item, reason, breakdown, confidence_label }) => ({
    item_id: item.id,
    found_report_id: item.type === 'found' ? item.id : undefined,
    lost_report_id: item.type === 'lost' ? item.id : undefined,
    score: Math.round(score * 1000) / 1000,
    confidence_pct: Math.round(score * 100),
    confidence: score >= 0.9 ? 'high' : score >= 0.75 ? 'medium' : score >= 0.5 ? 'low' : 'weak',
    confidence_label,
    reason,
    breakdown,
    type: item.type,
    code: item.code,
    name: item.name,
    loc: item.loc,
    description: item.description || '',
    item_category: item.item_category || 'General',
    color: item.color || '',
    building: item.building || '',
    photo_data: item.photo_data || '',
    emoji: item.emoji || '📦',
    status: item.status,
    date: item.date || '',
    created_at: item.created_at,
  }));
}

module.exports = {
  compareLostAndFound,
  smartMatches,
  WEIGHTS,
};

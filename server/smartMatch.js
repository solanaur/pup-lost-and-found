const TOKEN_RE = /[a-z0-9]+/g;
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'for', 'at', 'in', 'on', 'of',
  'this', 'that', 'item', 'lost', 'found', 'campus', 'pup', 'near', 'with',
]);
const LOCATION_HINTS = new Set([
  'library', 'canteen', 'gymnasium', 'registrar', 'engineering', 'computer',
  'lab', 'court', 'hallway', 'faculty', 'room', 'building', 'gym',
]);

function tokens(text) {
  return new Set(String(text || '').toLowerCase().match(TOKEN_RE) || []);
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

function buildRarity(candidates) {
  const counts = {};
  for (const item of candidates) {
    const toks = tokens(`${item.name || ''} ${item.description || ''}`);
    for (const t of toks) {
      if (!STOPWORDS.has(t)) counts[t] = (counts[t] || 0) + 1;
    }
  }
  const total = Math.max(1, candidates.length);
  const rarity = {};
  for (const [tok, freq] of Object.entries(counts)) {
    rarity[tok] = Math.log(1 + total / freq);
  }
  return rarity;
}

function weightedOverlap(a, b, rarity) {
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter((t) => b.has(t));
  const union = new Set([...a, ...b]);
  let interW = 0;
  let unionW = 0;
  for (const t of inter) interW += rarity[t] || 1;
  for (const t of union) unionW += rarity[t] || 1;
  return unionW ? interW / unionW : 0;
}

function smartMatches(query, candidates, topK = 8) {
  const qName = (query.name || '').toLowerCase().trim();
  const qLoc = (query.loc || '').toLowerCase().trim();
  const qDesc = (query.description || '').toLowerCase().trim();
  const qAll = tokens(`${qName} ${qDesc} ${qLoc}`);
  const qTokens = new Set([...qAll].filter((t) => !STOPWORDS.has(t)));
  const qLocTokens = new Set([...tokens(qLoc)].filter((t) => !STOPWORDS.has(t)));
  const rarity = buildRarity(candidates);
  const scored = [];

  for (const item of candidates) {
    const iName = (item.name || '').toLowerCase();
    const iLoc = (item.loc || '').toLowerCase();
    const iDesc = (item.description || '').toLowerCase();
    const iTokens = new Set([...tokens(`${iName} ${iDesc}`)].filter((t) => !STOPWORDS.has(t)));
    const iLocTokens = new Set([...tokens(iLoc)].filter((t) => !STOPWORDS.has(t)));

    const overlap = weightedOverlap(qTokens, iTokens, rarity);
    const nameSim = seqRatio(qName, iName);
    const locSim = seqRatio(qLoc, iLoc);
    const descSim = seqRatio(qDesc, iDesc);
    const locKw = locationMatch(qLocTokens, iLocTokens);
    const shared = [...qTokens].filter((t) => iTokens.has(t) && t.length >= 4);
    const exactKw = shared.length ? 1 : 0;

    let score =
      0.35 * overlap +
      0.23 * nameSim +
      0.15 * locSim +
      0.1 * descSim +
      0.12 * locKw +
      0.05 * exactKw;
    score = Math.min(1, score + (Math.sin(item.id) + 1) * 0.015);
    if (score < 0.22) continue;

    scored.push({
      score,
      item,
      reason: buildReason(qTokens, iTokens, qLocTokens, iLocTokens, nameSim, locSim),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ score, item, reason }) => ({
    item_id: item.id,
    score: Math.round(score * 1000) / 1000,
    confidence_pct: Math.round(score * 100),
    confidence: score >= 0.75 ? 'high' : score >= 0.52 ? 'medium' : 'low',
    reason,
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
  }));
}

function locationMatch(a, b) {
  const ah = [...a].filter((x) => LOCATION_HINTS.has(x));
  const bh = [...b].filter((x) => LOCATION_HINTS.has(x));
  if (!ah.length || !bh.length) return 0;
  const inter = ah.filter((x) => bh.includes(x));
  return inter.length / new Set([...ah, ...bh]).size;
}

function buildReason(qTokens, iTokens, qLoc, iLoc, nameSim, locSim) {
  const shared = [...qTokens].filter((t) => iTokens.has(t) && t.length >= 4).slice(0, 3);
  const places = [...qLoc].filter((t) => iLoc.has(t) && t.length >= 3).slice(0, 2);
  const parts = [];
  if (shared.length) parts.push(`shared traits: ${shared.join(', ')}`);
  if (places.length) parts.push(`similar location: ${places.join(', ')}`);
  if (nameSim >= 0.6) parts.push('very similar item name');
  else if (locSim >= 0.6) parts.push('high location similarity');
  return parts.length ? parts.join('; ') : 'overall textual similarity';
}

function categorizeFromText(text) {
  const t = String(text || '').toLowerCase();
  if (/wallet|purse|coin/.test(t)) return 'Accessories';
  if (/id|card|license/.test(t)) return 'IDs/Documents';
  if (/phone|charger|cable|laptop|calculator|usb|flash/.test(t)) return 'Electronics';
  if (/bottle|flask|tumbler/.test(t)) return 'Personal Items';
  if (/hoodie|shirt|jacket|umbrella|glass|shoe/.test(t)) return 'Clothing';
  if (/key|lanyard/.test(t)) return 'Accessories';
  return 'General';
}

function extractColor(text) {
  const colors = ['black', 'white', 'blue', 'red', 'green', 'navy', 'brown', 'gray', 'grey', 'yellow', 'pink', 'purple', 'silver', 'gold'];
  const t = String(text || '').toLowerCase();
  return colors.find((c) => t.includes(c)) || '';
}

module.exports = { smartMatches, categorizeFromText, extractColor };

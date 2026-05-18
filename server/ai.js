/**
 * Optional OpenAI-compatible JSON suggestion. Falls back to keyword heuristics.
 */
async function enrichReport({ type, draftName, draftLoc, draftDesc }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  const system =
    'You help a campus lost-and-found desk. Reply with ONLY valid JSON, no markdown. ' +
    'Keys: name (short item title), loc (campus location phrase), description (1-2 sentences, factual), emoji (single unicode emoji). ' +
    'Do not invent owner identity. If info is missing, use reasonable generic campus phrasing.';

  const userMsg = JSON.stringify({
    report_type: type,
    item_name_draft: draftName || '',
    location_draft: draftLoc || '',
    details_draft: draftDesc || '',
  });

  if (apiKey) {
    try {
      const r = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || r.statusText);
      }
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content?.trim() || '';
      const parsed = tryParseJson(text);
      if (parsed && parsed.name && parsed.loc) {
        return {
          source: 'openai',
          name: String(parsed.name).slice(0, 120),
          loc: String(parsed.loc).slice(0, 200),
          description: String(parsed.description || '').slice(0, 500),
          emoji: pickEmoji(parsed.emoji) || heuristicEmoji(draftName, draftDesc),
        };
      }
    } catch (e) {
      console.warn('[ai] OpenAI failed, using fallback:', e.message);
    }
  }

  return { source: 'local', ...localEnrich(type, draftName, draftLoc, draftDesc) };
}

function tryParseJson(text) {
  const direct = safeJson(text);
  if (direct) return direct;
  const m = text.match(/\{[\s\S]*\}/);
  return m ? safeJson(m[0]) : null;
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function pickEmoji(e) {
  if (!e || typeof e !== 'string') return '';
  const g = e.match(/\p{Extended_Pictographic}/u);
  return g ? g[0] : '';
}

function localEnrich(type, name, loc, desc) {
  const combined = `${name || ''} ${loc || ''} ${desc || ''}`.toLowerCase();
  const emoji = heuristicEmoji(name, desc);
  const title = (name && name.trim()) || guessTitle(combined, type);
  const location = (loc && loc.trim()) || 'Campus (see description)';
  const description =
    (desc && desc.trim()) ||
    (type === 'lost'
      ? 'Please contact campus lost & found if you find this item.'
      : 'Held at campus lost & found pending claim.');
  return { name: title, loc: location, description, emoji };
}

function guessTitle(combined, type) {
  if (combined.includes('id')) return type === 'lost' ? 'Lost ID / card' : 'Found ID / card';
  if (combined.includes('phone') || combined.includes('charger')) return 'Phone accessory';
  if (combined.includes('umbrella')) return 'Umbrella';
  if (combined.includes('bottle')) return 'Water bottle';
  if (combined.includes('glass')) return 'Eyeglasses';
  return type === 'lost' ? 'Lost item' : 'Found item';
}

function heuristicEmoji(name, desc) {
  const t = `${name || ''} ${desc || ''}`.toLowerCase();
  if (t.includes('umbrella')) return '☂️';
  if (t.includes('id') || t.includes('card')) return '🪪';
  if (t.includes('calculator')) return '🔢';
  if (t.includes('bottle')) return '🍶';
  if (t.includes('charger') || t.includes('cable')) return '🔌';
  if (t.includes('glass')) return '👓';
  if (t.includes('usb') || t.includes('flash')) return '💾';
  if (t.includes('hoodie') || t.includes('shirt') || t.includes('jacket')) return '👕';
  return '📦';
}

module.exports = { enrichReport };

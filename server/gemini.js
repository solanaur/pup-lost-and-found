const DEFAULT_MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function geminiApiKey() {
  return String(process.env.GEMINI_API_KEY || '').trim();
}

function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function isGeminiEnabled() {
  return Boolean(geminiApiKey());
}

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) return null;
  return { mimeType: m[1], data: m[2].slice(0, 4_000_000) };
}

function tryParseJson(text) {
  const direct = safeJson(String(text || '').trim());
  if (direct) return direct;
  const m = String(text || '').match(/\{[\s\S]*\}/);
  return m ? safeJson(m[0]) : null;
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function geminiGenerateContent({ prompt, imageDataUrl, jsonMode = true, temperature = 0.2 }) {
  const apiKey = geminiApiKey();
  if (!apiKey) return null;

  const parts = [{ text: prompt }];
  if (imageDataUrl) {
    const image = parseDataUrl(imageDataUrl);
    if (!image) throw new Error('Invalid image data URL');
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
  }

  const model = geminiModel();
  const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  if (!r.ok) {
    const err = await r.text().catch(() => r.statusText);
    throw new Error(`Gemini HTTP ${r.status}: ${err.slice(0, 300)}`);
  }

  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return tryParseJson(text) || (text.trim() ? { _raw: text.trim() } : null);
}

const VISION_PROMPT =
  'You analyze photos for a university lost-and-found desk. Look at the actual image. ' +
  'Reply with JSON keys: name, category, colors (comma string), material, brand, ' +
  'description (2 factual sentences), tags (array of 3-6 lowercase strings), ' +
  'confidence_item, confidence_category, confidence_color (integers 0-100). ' +
  'Do not guess ID card unless an ID is clearly visible.';

const ENRICH_PROMPT =
  'You help a campus lost-and-found desk. Reply with JSON keys: ' +
  'name (short item title), loc (campus location phrase), description (1-2 factual sentences), ' +
  'emoji (single unicode emoji). Do not invent owner identity. ' +
  'If info is missing, use reasonable generic campus phrasing.';

async function analyzeImageWithGemini(photoDataUrl) {
  const parsed = await geminiGenerateContent({
    prompt: VISION_PROMPT,
    imageDataUrl: photoDataUrl,
    temperature: 0.2,
  });
  if (!parsed || parsed._raw) return null;
  return parsed;
}

async function enrichReportWithGemini({ type, draftName, draftLoc, draftDesc }) {
  const userMsg = JSON.stringify({
    report_type: type,
    item_name_draft: draftName || '',
    location_draft: draftLoc || '',
    details_draft: draftDesc || '',
  });
  const parsed = await geminiGenerateContent({
    prompt: `${ENRICH_PROMPT}\n\nInput:\n${userMsg}`,
    temperature: 0.3,
  });
  if (!parsed || !parsed.name || !parsed.loc) return null;
  return parsed;
}

module.exports = {
  isGeminiEnabled,
  geminiModel,
  analyzeImageWithGemini,
  enrichReportWithGemini,
  tryParseJson,
};

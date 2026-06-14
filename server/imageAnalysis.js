const { categorizeFromText, extractColor } = require('./smartMatch');

const DEMO_PHOTO_SIGNATURES = [
  { pattern: /1627123424574|photo-1627123424574/i, profile: 'wallet' },
  { pattern: /1551836022|photo-1551836022/i, profile: 'id' },
  { pattern: /1587148220147|photo-1587148220147/i, profile: 'calculator' },
  { pattern: /1602143407151|photo-1602143407151/i, profile: 'bottle' },
  { pattern: /1591290619762|photo-1591290619762/i, profile: 'charger' },
  { pattern: /1574258495973|photo-1574258495973/i, profile: 'glasses' },
  { pattern: /1534308143481|photo-1534308143481/i, profile: 'umbrella' },
];

const PROFILES = {
  wallet: {
    name: 'Black Leather Wallet',
    category: 'Accessories',
    colors: 'Black, Brown',
    material: 'Leather',
    brand: 'Unknown',
    tags: ['wallet', 'leather', 'black', 'accessory', 'folded'],
    description: 'A black leather wallet with visible stitching and a foldable rectangular design. The item appears moderately used and may contain cards, IDs, receipts, or cash.',
    confidence: { item: 97, category: 94, color: 99 },
  },
  id: {
    name: 'Student ID Card',
    category: 'IDs/Documents',
    colors: 'White, Blue',
    material: 'Plastic',
    brand: 'Unknown',
    tags: ['id', 'card', 'document', 'school', 'plastic'],
    description: 'A campus identification card in a plastic holder, likely containing student credentials.',
    confidence: { item: 95, category: 96, color: 88 },
  },
  calculator: {
    name: 'Scientific Calculator',
    category: 'Electronics',
    colors: 'Black, Gray',
    material: 'Plastic',
    brand: 'Unknown',
    tags: ['calculator', 'electronics', 'device', 'scientific'],
    description: 'A handheld scientific calculator with a hard plastic casing and numeric keypad.',
    confidence: { item: 93, category: 95, color: 90 },
  },
  bottle: {
    name: 'Water Bottle',
    category: 'Personal Items',
    colors: 'Silver, Blue',
    material: 'Metal',
    brand: 'Unknown',
    tags: ['bottle', 'container', 'personal', 'hydration'],
    description: 'A reusable water bottle or tumbler suitable for campus use.',
    confidence: { item: 91, category: 92, color: 86 },
  },
  charger: {
    name: 'Phone Charger',
    category: 'Electronics',
    colors: 'White, Black',
    material: 'Plastic',
    brand: 'Unknown',
    tags: ['charger', 'cable', 'electronics', 'usb'],
    description: 'A phone charging cable or adapter found on campus.',
    confidence: { item: 90, category: 92, color: 85 },
  },
  glasses: {
    name: 'Eyeglasses',
    category: 'Accessories',
    colors: 'Black',
    material: 'Plastic, Metal',
    brand: 'Unknown',
    tags: ['glasses', 'eyewear', 'accessory'],
    description: 'A pair of prescription or reading eyeglasses.',
    confidence: { item: 91, category: 93, color: 87 },
  },
  umbrella: {
    name: 'Umbrella',
    category: 'Accessories',
    colors: 'Black, Navy',
    material: 'Fabric, Metal',
    brand: 'Unknown',
    tags: ['umbrella', 'accessory', 'rain'],
    description: 'A compact or full-size umbrella.',
    confidence: { item: 90, category: 91, color: 84 },
  },
};

const TAG_RULES = [
  [/wallet|purse/i, ['wallet', 'leather', 'accessory', 'folded']],
  [/\b(id card|student id|school id|identification)\b/i, ['id', 'card', 'document', 'school']],
  [/calculator/i, ['calculator', 'electronics', 'device']],
  [/bottle|flask|tumbler|hydro/i, ['bottle', 'container', 'personal', 'hydration']],
  [/charger|cable|usb|phone/i, ['charger', 'electronics', 'cable']],
  [/umbrella/i, ['umbrella', 'accessory', 'rain']],
  [/hoodie|jacket|shirt|clothing/i, ['clothing', 'fabric', 'apparel']],
  [/glass|eyewear|spectacle/i, ['glasses', 'eyewear', 'accessory']],
  [/key|lanyard/i, ['keys', 'lanyard', 'accessory']],
];

function inferFromText(text) {
  const t = String(text || '').toLowerCase();
  let tags = [];
  for (const [re, list] of TAG_RULES) {
    if (re.test(t)) tags = [...tags, ...list];
  }
  const color = extractColor(t);
  if (color) tags.push(color);
  const category = categorizeFromText(t);
  tags.push(category.toLowerCase().split('/')[0]);
  return { tags: [...new Set(tags)].slice(0, 8), category, color };
}

/** Only match known demo/stock photo URLs — never run on base64 uploads. */
function inferFromPhotoUrl(photo) {
  const p = String(photo || '');
  if (!/^https?:\/\//i.test(p)) return null;
  for (const { pattern, profile } of DEMO_PHOTO_SIGNATURES) {
    if (pattern.test(p) && PROFILES[profile]) {
      return { ...PROFILES[profile] };
    }
  }
  return null;
}

function uploadFallback({ name, description, type, hintText, client_hints }) {
  const fromClient = inferFromClientHints(client_hints);
  if (fromClient) {
    if (name && name.trim()) fromClient.name = name;
    if (description && description.trim()) {
      fromClient.description = description;
    }
    return fromClient;
  }

  const fromText = inferFromText(hintText);
  const hasHints = Boolean(String(hintText || '').trim());
  const conf = hasHints
    ? { item: 72, category: 70, color: 65 }
    : { item: 48, category: 45, color: 42 };

  return {
    name: name || (type === 'lost' ? 'Lost Item (confirm from photo)' : 'Found Item (confirm from photo)'),
    category: fromText.category || 'General',
    colors: fromText.color || 'Unknown — verify from photo',
    material: 'Unknown',
    brand: 'Unknown',
    tags: fromText.tags.length ? fromText.tags : ['campus', 'item', 'photo-upload'],
    description: description
      || (hasHints
        ? `Reported campus ${type || 'lost'} item. Add OPENAI_API_KEY for richer AI descriptions.`
        : 'Photo uploaded. Describe this item manually (name, color, unique marks) before submitting.'),
    confidence: conf,
    needs_manual_review: !hasHints,
  };
}

function inferFromClientHints(hints) {
  if (!hints || !hints.dominant_colors || !hints.dominant_colors.length) return null;
  const primary = hints.dominant_colors[0];
  if (primary === 'unknown') return null;

  const colorStr = hints.suggested_colors
    || hints.dominant_colors.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
  const tags = hints.suggested_tags || hints.dominant_colors;
  const objectType = hints.object_type || 'general';

  let conf = { item: 76, category: 74, color: 80 };
  if (objectType === 'bottle') conf = { item: 84, category: 82, color: 86 };
  if (objectType === 'wallet') conf = { item: 80, category: 78, color: 79 };

  return {
    name: hints.suggested_name || `${primary.charAt(0).toUpperCase() + primary.slice(1)} Item`,
    category: hints.suggested_category || categorizeFromText(hints.suggested_name || primary),
    colors: colorStr,
    material: hints.material || 'Unknown',
    brand: 'Unknown',
    tags,
    description: hints.description
      || `Locally detected ${objectType.replace('-', ' ')} with dominant color ${primary}. Verify details before submitting.`,
    confidence: conf,
    needs_manual_review: false,
    source: 'client-vision',
  };
}

async function analyzeImage({ photo_data, name, description, type, client_hints }) {
  const hint = `${name || ''} ${description || ''}`.trim();
  const isUpload = String(photo_data || '').startsWith('data:image');

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && isUpload) {
    try {
      const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
      const r = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You analyze photos for a university lost-and-found desk. Look at the actual image. Reply ONLY valid JSON with keys: name, category, colors (comma string), material, brand, description (2 factual sentences), tags (array of 3-6 lowercase strings), confidence_item, confidence_category, confidence_color (integers 0-100). Do not guess ID card unless an ID is clearly visible.',
              },
              { type: 'image_url', image_url: { url: photo_data.slice(0, 4_000_000) } },
            ],
          }],
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const text = data.choices?.[0]?.message?.content || '';
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          return formatAnalysis(parsed, 'openai');
        }
      } else {
        console.warn('[ai] vision HTTP', r.status, await r.text().catch(() => ''));
      }
    } catch (e) {
      console.warn('[ai] vision failed:', e.message);
    }
  }

  const fromUrl = inferFromPhotoUrl(photo_data);
  if (fromUrl) {
    return formatAnalysis(fromUrl, 'demo-photo');
  }

  if (isUpload) {
    const raw = uploadFallback({ name, description, type, hintText: hint, client_hints });
    const src = raw.source || (client_hints?.dominant_colors?.length ? 'client-vision' : 'upload-fallback');
    return formatAnalysis(raw, src);
  }

  const fromText = inferFromText(hint);
  const base = {
    name: name || (type === 'lost' ? 'Lost Item' : 'Found Item'),
    category: fromText.category,
    colors: fromText.color || 'Unknown',
    material: /leather/i.test(hint) ? 'Leather' : /plastic/i.test(hint) ? 'Plastic' : 'Unknown',
    brand: 'Unknown',
    tags: fromText.tags,
    description: description || `Campus ${type || 'found'} item reported through iBALIK.`,
    confidence: { item: 72, category: 70, color: 68 },
  };

  return formatAnalysis(base, hint ? 'text-heuristic' : 'generic-fallback');
}

function formatAnalysis(raw, source) {
  const tags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const confItem = raw.confidence_item ?? raw.confidence?.item ?? 85;
  const confCat = raw.confidence_category ?? raw.confidence?.category ?? 88;
  const confColor = raw.confidence_color ?? raw.confidence?.color ?? 80;
  const avg = Math.round((confItem + confCat + confColor) / 3);

  return {
    source,
    needs_manual_review: Boolean(raw.needs_manual_review) && source !== 'client-vision' && source !== 'openai',
    name: String(raw.name || 'Unknown Item').slice(0, 120),
    item_category: String(raw.category || raw.item_category || categorizeFromText(raw.description || raw.name || '')).slice(0, 80),
    color: String(raw.colors || raw.color || extractColor(`${raw.name} ${raw.description}`) || 'Unknown').slice(0, 60),
    brand: String(raw.brand || 'Unknown').slice(0, 80),
    material: String(raw.material || 'Unknown').slice(0, 40),
    description: String(raw.description || '').slice(0, 800),
    ai_description: String(raw.description || raw.ai_description || '').slice(0, 800),
    ai_tags: tags.slice(0, 12),
    ai_detected_category: String(raw.category || raw.item_category || 'General').slice(0, 80),
    ai_detected_colors: String(raw.colors || raw.color || '').slice(0, 60),
    ai_confidence_score: avg,
    confidence: {
      item_detection: confItem,
      category_detection: confCat,
      color_detection: confColor,
    },
  };
}

module.exports = { analyzeImage, inferFromText };

const express = require('express');
const { listItems } = require('../db');
const { authOptional, requireAuth, requireRole } = require('../auth');
const { enrichReport } = require('../ai');
const { smartMatches, categorizeFromText, extractColor } = require('../smartMatch');
const { analyzeImage } = require('../imageAnalysis');
const { listAdminMatches, matchToResponse } = require('../db');

const router = express.Router();

function parseQuery(body) {
  const text = String(body.query || body.description || body.name || '').trim();
  const name = String(body.name || text).trim();
  const loc = String(body.loc || '').trim();
  const description = String(body.description || text).trim();
  const type = String(body.type || 'lost').toLowerCase();
  return { name, loc, description, type };
}

router.post('/analyze-image', authOptional, async (req, res) => {
  try {
    const { photo_data, name, description, type, client_hints } = req.body || {};
    if (!photo_data || String(photo_data).length < 30) {
      return res.status(400).json({ error: 'Valid photo_data required' });
    }
    const analysis = await analyzeImage({ photo_data, name, description, type: type || 'lost', client_hints });
    res.json(analysis);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Image analysis failed' });
  }
});

router.get('/monitor', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = listAdminMatches()
    .filter((m) => m.status === 'pending' || m.status === 'approved')
    .slice(0, 50)
    .map((m) => {
      const r = matchToResponse(m, true);
      return {
        id: m.id,
        lost_id: m.lost_report_id,
        found_id: m.found_report_id,
        lost: r.lost_name,
        found: r.found_name,
        confidence: r.match_score,
        status: r.status,
        reason: r.match_reason,
        match: r,
      };
    });
  res.json(rows);
});

router.post('/smart-match', authOptional, (req, res) => {
  const body = req.body || {};
  const { name, loc, description, type } = parseQuery(body);
  const itemType = ['lost', 'found'].includes(type) ? type : 'lost';
  const opposite = itemType === 'lost' ? 'found' : 'lost';
  const candidates = listItems(
    (i) => i.type === opposite && ['approved', 'claimed'].includes(i.status)
  ).map((i) => ({
    ...i,
    date: new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
  const query = {
    name,
    loc,
    description,
    type: itemType,
    item_category: body.item_category,
    color: body.color,
    ai_tags: body.ai_tags,
    ai_description: body.ai_description,
    ai_detected_category: body.ai_detected_category,
    ai_detected_colors: body.ai_detected_colors,
    building: body.building,
    photo_data: body.photo_data,
    created_at: body.created_at,
    date_lost: body.date_lost,
  };
  const matches = smartMatches(query, candidates, 12);
  res.json({ matches, query: { name, loc, description, type: itemType } });
});

router.post('/enrich', requireAuth, requireRole('student', 'admin'), async (req, res) => {
  try {
    const { type, name, loc, description } = req.body || {};
    if (!type || !['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'type must be lost or found' });
    }
    const out = await enrichReport({ type, draftName: name, draftLoc: loc, draftDesc: description });
    const combined = `${out.name} ${out.description} ${out.loc}`;
    res.json({
      ...out,
      item_category: categorizeFromText(combined),
      color: extractColor(combined),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI enrich failed' });
  }
});

router.post('/categorize', (req, res) => {
  const text = String((req.body && req.body.text) || '').trim();
  res.json({
    item_category: categorizeFromText(text),
    color: extractColor(text),
  });
});

module.exports = router;

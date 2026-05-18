const express = require('express');
const { listItems } = require('../db');
const { authOptional, requireAuth, requireRole } = require('../auth');
const { enrichReport } = require('../ai');
const { smartMatches, categorizeFromText, extractColor } = require('../smartMatch');

const router = express.Router();

function parseQuery(body) {
  const text = String(body.query || body.description || body.name || '').trim();
  const name = String(body.name || text).trim();
  const loc = String(body.loc || '').trim();
  const description = String(body.description || text).trim();
  const type = String(body.type || 'lost').toLowerCase();
  return { name, loc, description, type };
}

router.post('/smart-match', authOptional, (req, res) => {
  const { name, loc, description, type } = parseQuery(req.body || {});
  const itemType = ['lost', 'found'].includes(type) ? type : 'lost';
  const opposite = itemType === 'lost' ? 'found' : 'lost';
  const candidates = listItems(
    (i) => i.type === opposite && ['approved', 'claimed'].includes(i.status)
  ).map((i) => ({
    ...i,
    date: new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
  const matches = smartMatches({ name, loc, description }, candidates, 12);
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

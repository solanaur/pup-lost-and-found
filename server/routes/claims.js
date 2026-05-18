const express = require('express');
const {
  createClaim,
  listClaims,
  claimToResponse,
  updateClaimStatus,
  getItem,
  addNotification,
  mem,
} = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

router.get('/mine', requireAuth, requireRole('student'), (req, res) => {
  const rows = listClaims((c) => c.user_id === req.user.sub);
  res.json(rows.map((c) => claimToResponse(c, false)));
});

router.get('/pending', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = listClaims((c) => c.status === 'pending');
  res.json(rows.map((c) => claimToResponse(c, true)));
});

router.post('/', requireAuth, requireRole('student'), (req, res) => {
  const { item_id, description, proof_data, id_photo_data } = req.body || {};
  const item = getItem(Number(item_id));
  if (!item || item.status !== 'approved') {
    return res.status(400).json({ error: 'Item not available for claim' });
  }
  if (!description || !proof_data) {
    return res.status(400).json({ error: 'description and proof required' });
  }
  const existing = listClaims(
    (c) => c.item_id === item.id && c.user_id === req.user.sub && c.status === 'pending'
  );
  if (existing.length) {
    return res.status(409).json({ error: 'You already have a pending claim for this item' });
  }
  const claim = createClaim({
    item_id: item.id,
    user_id: req.user.sub,
    description: String(description).slice(0, 2000),
    proof_data,
    id_photo_data: id_photo_data || '',
  });
  mem.users
    .filter((u) => u.role === 'admin')
    .forEach((a) => addNotification(a.id, 'New claim request', `${item.name} — review required.`));
  res.status(201).json(claimToResponse(claim, false));
});

router.patch('/:id/approve', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!updateClaimStatus(id, ['pending'], 'approved', 'Verified by admin.', req.user.sub)) {
    return res.status(404).json({ error: 'Claim not found or not pending' });
  }
  res.json({ ok: true });
});

router.patch('/:id/reject', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const feedback = (req.body && req.body.feedback) || 'Could not verify ownership.';
  if (!updateClaimStatus(id, ['pending'], 'rejected', feedback, req.user.sub)) {
    return res.status(404).json({ error: 'Claim not found or not pending' });
  }
  res.json({ ok: true });
});

module.exports = router;

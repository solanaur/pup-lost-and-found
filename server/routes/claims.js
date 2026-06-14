const express = require('express');
const db = require('../db');
const {
  createClaim,
  listClaims,
  claimToResponse,
  updateClaimStatus,
  getItem,
  addNotification,
  parseClaimantFields,
} = db;
const { requireAuth, requireRole } = require('../auth');
const { sendClaimReceivedNotification, isEmailConfigured, emailWasSent, summarizeEmailResults } = require('../email');

const router = express.Router();

router.get('/mine', requireAuth, requireRole('student'), (req, res) => {
  const rows = listClaims((c) => c.user_id === req.user.sub);
  res.json(rows.map((c) => claimToResponse(c, false)));
});

router.get('/pending', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = listClaims((c) => c.status === 'pending');
  res.json(rows.map((c) => claimToResponse(c, true)));
});

router.get('/all', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = listClaims(() => true);
  res.json(rows.map((c) => claimToResponse(c, true)));
});

router.get('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const claim = db.mem.claims.find((c) => c.id === Number(req.params.id));
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  res.json(claimToResponse(claim, true));
});

router.post('/guest', async (req, res) => {
  const body = req.body || {};
  const item = getItem(Number(body.item_id));
  if (!item || item.status !== 'approved') {
    return res.status(400).json({ error: 'Item not available for claim' });
  }
  const claimant = parseClaimantFields(body);
  if (claimant.error) return res.status(400).json({ error: claimant.error });
  const description = String(body.description || '').trim();
  if (!description || !body.proof_data) {
    return res.status(400).json({ error: 'Description and proof photo required' });
  }
  const existing = listClaims(
    (c) => c.item_id === item.id
      && c.claimant_email === claimant.claimant_email
      && c.status === 'pending'
  );
  if (existing.length) {
    return res.status(409).json({ error: 'You already have a pending claim for this item' });
  }
  const claim = createClaim({
    item_id: item.id,
    user_id: null,
    ...claimant,
    description: description.slice(0, 2000),
    proof_data: body.proof_data,
    id_photo_data: body.id_photo_data || '',
  });
  db.mem.users
    .filter((u) => u.role === 'admin')
    .forEach((a) => addNotification(a.id, 'New claim request', `${item.name} — ${claimant.claimant_name} (guest)`));
  let emailMeta = { email_sent: false, email_configured: isEmailConfigured(), email_error: null };
  try {
    const emailResult = await sendClaimReceivedNotification(claim, item);
    emailMeta = {
      email_sent: emailWasSent(emailResult),
      email_configured: isEmailConfigured(),
      email_error: emailResult?.error || emailResult?.reason || null,
    };
  } catch (e) {
    emailMeta.email_error = e.message;
    console.warn('[email] guest claim confirm:', e.message);
  }
  res.status(201).json({ ...claimToResponse(claim, false), ...emailMeta });
});

router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const body = req.body || {};
  const { item_id, description, proof_data, id_photo_data } = body;
  const item = getItem(Number(item_id));
  if (!item || item.status !== 'approved') {
    return res.status(400).json({ error: 'Item not available for claim' });
  }
  const claimant = parseClaimantFields(body);
  if (claimant.error) return res.status(400).json({ error: claimant.error });
  if (!description || !proof_data) {
    return res.status(400).json({ error: 'Description and proof photo required' });
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
    ...claimant,
    description: String(description).slice(0, 2000),
    proof_data,
    id_photo_data: id_photo_data || '',
  });
  db.mem.users
    .filter((a) => a.role === 'admin')
    .forEach((a) => addNotification(a.id, 'New claim request', `${item.name} — review required.`));
  let emailMeta = { email_sent: false, email_configured: isEmailConfigured(), email_error: null };
  try {
    const emailResult = await sendClaimReceivedNotification(claim, item);
    emailMeta = {
      email_sent: emailWasSent(emailResult),
      email_configured: isEmailConfigured(),
      email_error: emailResult?.error || emailResult?.reason || null,
    };
  } catch (e) {
    emailMeta.email_error = e.message;
    console.warn('[email] student claim confirm:', e.message);
  }
  res.status(201).json({ ...claimToResponse(claim, false), ...emailMeta });
});

router.patch('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const verification = (req.body && req.body.checklist) || null;
  const ok = await updateClaimStatus(id, ['pending'], 'approved', 'Verified by admin.', req.user.sub, verification);
  if (!ok) {
    return res.status(404).json({ error: 'Claim not found or not pending' });
  }
  const claim = db.mem.claims.find((c) => c.id === id);
  const emailMeta = claim?._emailMeta || {};
  if (claim) delete claim._emailMeta;
  res.json({
    ok: true,
    claim: claim ? claimToResponse(claim, true) : null,
    ...emailMeta,
  });
});

router.patch('/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const feedback = (req.body && req.body.feedback) || 'Could not verify ownership.';
  const ok = await updateClaimStatus(id, ['pending'], 'rejected', feedback, req.user.sub);
  if (!ok) {
    return res.status(404).json({ error: 'Claim not found or not pending' });
  }
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const db = require('../db');
const {
  listItemsWithUser,
  listItems,
  insertItem,
  updateItemStatus,
  getItem,
  getItemByCode,
  itemToResponse,
  trackToResponse,
  addNotification,
  addLog,
  deleteItem,
  runMatchingForReport,
  parseClaimantFields,
  markItemClaimedWithClaimer,
  claimToResponse,
} = db;
const { authOptional, requireAuth, requireRole } = require('../auth');
const { categorizeFromText, extractColor } = require('../smartMatch');
const { analyzeImage } = require('../imageAnalysis');
const { sendReportConfirmation, sendItemClaimedNotification } = require('../email');

const router = express.Router();

router.get('/stats', (_req, res) => {
  const { getStats } = require('../db');
  res.json(getStats());
});

router.get('/', authOptional, (req, res) => {
  const rows = listItemsWithUser(
    (i) => i.status === 'approved' || i.status === 'claimed',
    req.user && req.user.role === 'admin'
  );
  res.json(rows);
});

router.get('/mine', requireAuth, requireRole('student', 'admin'), (req, res) => {
  if (req.user.role === 'admin') return res.json([]);
  const rows = listItemsWithUser(
    (i) => i.submitted_by === req.user.sub,
    true
  );
  res.json(rows);
});

router.get('/pending', requireAuth, requireRole('admin'), (_req, res) => {
  res.json(listItemsWithUser((i) => i.status === 'pending', true));
});

router.get('/live', requireAuth, requireRole('admin'), (_req, res) => {
  res.json(listItemsWithUser((i) => ['approved', 'claimed'].includes(i.status), true));
});

router.get('/admin/all', requireAuth, requireRole('admin'), (_req, res) => {
  res.json(listItemsWithUser(() => true, true));
});

router.get('/track/:code', (req, res) => {
  const item = getItemByCode(req.params.code);
  if (!item) return res.status(404).json({ error: 'Report not found' });
  res.json(trackToResponse(item));
});

router.get('/admin/tracker', requireAuth, requireRole('admin'), (_req, res) => {
  const { getStats } = require('../db');
  const s = getStats();
  res.json({
    total_users: s.total_users,
    pending_approvals: s.pending_approvals,
    approved_students: s.approved_students,
    total_items: s.total_reports,
    pending_items: s.pending_items,
    approvals_today: listItems((i) => i.status === 'approved').filter((i) => {
      const d = new Date(i.created_at);
      const t = new Date();
      return d.toDateString() === t.toDateString();
    }).length,
    pending_claims: s.pending_claims,
  });
});

router.get('/:id', authOptional, (req, res) => {
  const item = getItem(Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  const isPublic = ['approved', 'claimed'].includes(item.status);
  const isOwner = req.user && item.submitted_by === req.user.sub;
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isPublic && !isOwner && !isAdmin) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(itemToResponse(item, isAdmin));
});

router.post('/', authOptional, async (req, res) => {
  const body = req.body || {};
  const type = String(body.type || '').toLowerCase();
  if (!['lost', 'found'].includes(type)) {
    return res.status(400).json({ error: 'type must be lost or found' });
  }
  if (!body.name || !body.loc) {
    return res.status(400).json({ error: 'name and loc are required' });
  }

  const isStudent = req.user && req.user.role === 'student';
  const isAdmin = req.user && req.user.role === 'admin';
  if (isAdmin) {
    return res.status(403).json({ error: 'Administrators cannot submit reports via this form' });
  }

  let reporter_name = String(body.reporter_name || '').trim();
  let reporter_email = String(body.reporter_email || '').trim();
  let reporter_phone = String(body.reporter_phone || '').trim();
  let submitted_by = null;

  if (isStudent) {
    const u = db.mem.users.find((x) => x.id === req.user.sub);
    submitted_by = req.user.sub;
    reporter_name = reporter_name || u?.full_name || u?.username || '';
    reporter_email = reporter_email || u?.email || '';
  } else {
    if (!reporter_name || !reporter_email) {
      return res.status(400).json({ error: 'reporter_name and reporter_email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporter_email)) {
      return res.status(400).json({ error: 'Valid email address required' });
    }
  }
  if (reporter_phone) {
    reporter_phone = reporter_phone.replace(/\D/g, '');
    if (reporter_phone.length !== 11) {
      return res.status(400).json({ error: 'Contact number must be exactly 11 digits' });
    }
  }

  const combined = `${body.name} ${body.description || ''} ${body.loc}`;
  let aiFields = {
    ai_description: body.ai_description || '',
    ai_tags: body.ai_tags || [],
    ai_detected_category: body.ai_detected_category || '',
    ai_detected_colors: body.ai_detected_colors || '',
    ai_confidence_score: body.ai_confidence_score || 0,
  };
  if (body.photo_data && !body.ai_description) {
    try {
      const analysis = await analyzeImage({
        photo_data: body.photo_data,
        name: body.name,
        description: body.description,
        type,
      });
      aiFields = {
        ai_description: analysis.ai_description || analysis.description,
        ai_tags: analysis.ai_tags,
        ai_detected_category: analysis.ai_detected_category,
        ai_detected_colors: analysis.ai_detected_colors,
        ai_confidence_score: analysis.ai_confidence_score,
      };
      if (!body.item_category) body.item_category = analysis.item_category;
      if (!body.color) body.color = analysis.color;
      if (!body.brand) body.brand = analysis.brand;
      if (!body.description && analysis.description) body.description = analysis.description;
      if (!body.name && analysis.name) body.name = analysis.name;
    } catch (e) {
      console.warn('[items] image analysis skipped:', e.message);
    }
  }
  const item = insertItem({
    type,
    name: String(body.name).trim().slice(0, 200),
    loc: String(body.loc).trim().slice(0, 300),
    description: String(body.description || aiFields.ai_description || '').slice(0, 2000),
    emoji: String(body.emoji || '📦').slice(0, 8),
    item_category: (body.item_category || aiFields.ai_detected_category || categorizeFromText(combined)).slice(0, 80),
    color: (body.color || aiFields.ai_detected_colors || extractColor(combined)).slice(0, 60),
    brand: String(body.brand || '').slice(0, 80),
    building: String(body.building || '').slice(0, 40),
    floor: String(body.floor || '').slice(0, 20),
    room: String(body.room || '').slice(0, 40),
    photo_data: body.photo_data || '',
    date_lost: body.date_lost || '',
    time_lost: body.time_lost || '',
    condition: body.condition || '',
    holder: body.holder || 'Campus Security',
    status: type === 'lost' ? 'approved' : 'pending',
    submitted_by,
    reporter_name,
    reporter_email,
    reporter_phone,
    ...aiFields,
  });
  const admins = db.mem.users.filter((u) => u.role === 'admin');
  if (type === 'found') {
    admins.forEach((a) => {
      addNotification(a.id, 'New found report pending', `${item.code} — ${item.name} needs review.`);
    });
  }
  if (type === 'lost') {
    runMatchingForReport(item.id, { notify: true, notifyThreshold: 85 });
  }
  sendReportConfirmation(item).catch((err) => console.error('[email]', err.message));
  const response = itemToResponse(item, Boolean(submitted_by));
  res.status(201).json({ ...response, track: trackToResponse(item) });
});

router.patch('/:id/approve', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const item = getItem(id);
  if (!updateItemStatus(id, ['pending'], 'approved')) {
    return res.status(404).json({ error: 'Not found or not pending' });
  }
  if (item) {
    if (item.submitted_by) {
      addNotification(item.submitted_by, 'Item approved', `Your report ${item.code} is now live on the board.`);
    }
    addLog('item_approved', 'item', id, item.code, req.user.sub);
    runMatchingForReport(id, { notify: true, notifyThreshold: 85 });
  }
  res.json({ ok: true });
});

router.patch('/:id/reject', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const item = getItem(id);
  if (!updateItemStatus(id, ['pending'], 'rejected')) {
    return res.status(404).json({ error: 'Not found or not pending' });
  }
  if (item) {
    addNotification(item.submitted_by, 'Item rejected', `Your report ${item.code} was rejected by admin.`);
    addLog('item_rejected', 'item', id, item.code, req.user.sub);
  }
  res.json({ ok: true });
});

router.patch('/:id/claim', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const item = getItem(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const claimant = parseClaimantFields(req.body || {});
  if (claimant.error) return res.status(400).json({ error: claimant.error });
  const claim = markItemClaimedWithClaimer(id, {
    ...claimant,
    description: String(req.body?.description || '').trim() || 'Claim recorded by administrator.',
    proof_data: req.body?.proof_data || '',
    id_photo_data: req.body?.id_photo_data || '',
  }, req.user.sub);
  if (!claim) {
    return res.status(404).json({ error: 'Not found or not approved' });
  }
  try {
    await sendItemClaimedNotification(item);
  } catch (e) {
    console.warn('[email] item claimed notify:', e.message);
  }
  res.json({ ok: true, claim: claimToResponse(claim, true) });
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const item = getItem(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (!deleteItem(id, req.user.sub)) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (item.submitted_by) {
    addNotification(item.submitted_by, 'Report removed', `Your report ${item.code} was removed by an administrator.`);
  }
  res.json({ ok: true });
});

module.exports = router;

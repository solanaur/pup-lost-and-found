const express = require('express');
const {
  listItemsWithUser,
  listItems,
  insertItem,
  updateItemStatus,
  getItem,
  itemToResponse,
  addNotification,
  addLog,
  mem,
} = require('../db');
const { authOptional, requireAuth, requireRole } = require('../auth');
const { categorizeFromText, extractColor } = require('../smartMatch');

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

router.post('/', requireAuth, requireRole('student'), (req, res) => {
  const body = req.body || {};
  const type = String(body.type || '').toLowerCase();
  if (!['lost', 'found'].includes(type)) {
    return res.status(400).json({ error: 'type must be lost or found' });
  }
  if (!body.name || !body.loc) {
    return res.status(400).json({ error: 'name and loc are required' });
  }
  const combined = `${body.name} ${body.description || ''} ${body.loc}`;
  const item = insertItem({
    type,
    name: String(body.name).trim().slice(0, 200),
    loc: String(body.loc).trim().slice(0, 300),
    description: String(body.description || '').slice(0, 2000),
    emoji: String(body.emoji || '📦').slice(0, 8),
    item_category: (body.item_category || categorizeFromText(combined)).slice(0, 80),
    color: (body.color || extractColor(combined)).slice(0, 60),
    brand: String(body.brand || '').slice(0, 80),
    building: String(body.building || '').slice(0, 40),
    floor: String(body.floor || '').slice(0, 20),
    room: String(body.room || '').slice(0, 40),
    photo_data: body.photo_data || '',
    date_lost: body.date_lost || '',
    time_lost: body.time_lost || '',
    condition: body.condition || '',
    holder: body.holder || 'Campus Security',
    status: 'pending',
    submitted_by: req.user.sub,
  });
  const admins = mem.users.filter((u) => u.role === 'admin');
  admins.forEach((a) => {
    addNotification(a.id, 'New report pending', `${item.code} — ${item.name} needs review.`);
  });
  res.status(201).json(itemToResponse(item, true));
});

router.patch('/:id/approve', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const item = getItem(id);
  if (!updateItemStatus(id, ['pending'], 'approved')) {
    return res.status(404).json({ error: 'Not found or not pending' });
  }
  if (item) {
    addNotification(item.submitted_by, 'Item approved', `Your report ${item.code} is now live on the board.`);
    addLog('item_approved', 'item', id, item.code, req.user.sub);
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

router.patch('/:id/claim', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const item = getItem(id);
  if (!updateItemStatus(id, ['approved'], 'claimed')) {
    return res.status(404).json({ error: 'Not found or not approved' });
  }
  if (item) {
    addNotification(item.submitted_by, 'Item marked claimed', `Report ${item.code} is now marked as claimed.`);
    addLog('item_claimed', 'item', id, item.code, req.user.sub);
  }
  res.json({ ok: true });
});

module.exports = router;

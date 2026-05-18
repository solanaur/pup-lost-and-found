const express = require('express');
const { mem, persist, formatDateTime, getAnalytics } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

router.get('/notifications', requireAuth, (req, res) => {
  const rows = mem.notifications
    .filter((n) => n.user_id === req.user.sub)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(
    rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      is_read: Boolean(n.is_read),
      date: formatDateTime(n.created_at),
    }))
  );
});

router.patch('/notifications/:id/read', requireAuth, (req, res) => {
  const row = mem.notifications.find(
    (n) => n.id === Number(req.params.id) && n.user_id === req.user.sub
  );
  if (row) {
    row.is_read = 1;
    persist();
  }
  res.json({ ok: true });
});

router.patch('/notifications/read-all', requireAuth, (req, res) => {
  mem.notifications
    .filter((n) => n.user_id === req.user.sub)
    .forEach((n) => { n.is_read = 1; });
  persist();
  res.json({ ok: true });
});

router.get('/settings', (_req, res) => {
  res.json(mem.settings);
});

router.get('/admin/activity', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = [...mem.activity_logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
  res.json(
    rows.map((r) => ({
      id: r.id,
      action: r.action,
      target_type: r.target_type,
      target_id: r.target_id,
      detail: r.detail,
      date: formatDateTime(r.created_at),
    }))
  );
});

router.get('/admin/users', requireAuth, requireRole('admin'), (_req, res) => {
  res.json(
    mem.users.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      approval_status: u.approval_status,
      login_count: u.login_count || 0,
      last_login_at: u.last_login_at ? formatDateTime(u.last_login_at) : '-',
      created_at: formatDateTime(u.created_at),
    }))
  );
});

router.get('/admin/analytics', requireAuth, requireRole('admin'), (_req, res) => {
  res.json(getAnalytics());
});

module.exports = router;

const express = require('express');
const {
  getItem,
  getUserById,
  listMatchesForUser,
  listAdminMatches,
  updateMatchStatus,
  runMatchingForReport,
  matchToResponse,
} = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

router.post('/run/:reportId', requireAuth, requireRole('student', 'admin'), (req, res) => {
  const reportId = Number(req.params.reportId);
  const item = getItem(reportId);
  if (!item) return res.status(404).json({ error: 'Report not found' });
  if (req.user.role !== 'admin' && item.submitted_by !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const matches = runMatchingForReport(reportId);
  res.json({ ok: true, count: matches.length, matches: matches.map((m) => matchToResponse(m, true)) });
});

router.get('/user/:userId', requireAuth, (req, res) => {
  const userId = Number(req.params.userId);
  if (req.user.role !== 'admin' && req.user.sub !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const rows = listMatchesForUser(userId).map((m) => matchToResponse(m, true));
  res.json(rows);
});

router.get('/mine', requireAuth, requireRole('student', 'admin'), (req, res) => {
  const rows = listMatchesForUser(req.user.sub).map((m) => matchToResponse(m, true));
  res.json(rows);
});

router.get('/admin/matches', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = listAdminMatches().map((m) => matchToResponse(m, true));
  res.json(rows);
});

router.patch('/admin/matches/:matchId/status', requireAuth, requireRole('admin'), (req, res) => {
  const matchId = Number(req.params.matchId);
  const { status } = req.body || {};
  const allowed = ['pending', 'approved', 'dismissed', 'claimed', 'rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  const updated = updateMatchStatus(matchId, status, req.user.sub);
  if (!updated) return res.status(404).json({ error: 'Match not found' });
  res.json(matchToResponse(updated, true));
});

module.exports = router;

const express = require('express');
const { login, signToken, verifyToken, requireAuth, requireRole, meFromToken, bcrypt } = require('../auth');
const db = require('../db');
const {
  getUserByUsername,
  createUser,
  userPublic,
  addNotification,
  addLog,
  persist,
  getUserById,
} = db;

const router = express.Router();

router.post('/signup', (req, res) => {
  const { full_name, username, email, course, year_level, password, id_photo_data, avatar_data } = req.body || {};
  if (!full_name || !username || !password) {
    return res.status(400).json({ error: 'full_name, username, and password required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!id_photo_data || String(id_photo_data).length < 30) {
    return res.status(400).json({ error: 'Valid school ID photo required' });
  }
  if (getUserByUsername(String(username).trim())) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const user = createUser({
    username: String(username).trim(),
    full_name: String(full_name).trim(),
    email: String(email || '').trim(),
    course: String(course || '').trim(),
    year_level: String(year_level || '').trim(),
    password_hash: bcrypt.hashSync(password, 10),
    id_photo_data,
    avatar_data: avatar_data || '',
  });
  res.status(201).json({
    ok: true,
    message: 'Signup submitted. Wait for admin approval before logging in.',
    user: userPublic(user),
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const result = login(String(username).trim(), password);
  if (!result) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (result.error === 'pending') {
    return res.status(403).json({ error: result.message });
  }
  if (result.error === 'suspended') {
    return res.status(403).json({ error: result.message });
  }
  addLog('login', 'user', result.id, result.username, result.id);
  const token = signToken(result);
  res.json({ token, user: userPublic(result) });
});

router.get('/me', (req, res) => {
  const h = req.headers.authorization;
  const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  res.json({ user: meFromToken(payload) });
});

router.patch('/profile', requireAuth, (req, res) => {
  const user = getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { full_name, email, course, year_level, avatar_data } = req.body || {};
  if (full_name) user.full_name = String(full_name).trim();
  if (email !== undefined) user.email = String(email).trim();
  if (course !== undefined) user.course = String(course).trim();
  if (year_level !== undefined) user.year_level = String(year_level).trim();
  if (avatar_data !== undefined) user.avatar_data = String(avatar_data).slice(0, 4_000_000);
  persist();
  res.json(userPublic(user));
});

router.get('/pending-users', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = db.mem.users
    .filter((u) => u.approval_status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(
    rows.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      course: u.course,
      year_level: u.year_level,
      id_photo_data: u.id_photo_data,
      date: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  );
});

router.patch('/users/:id/approve', requireAuth, requireRole('admin'), (req, res) => {
  const user = getUserById(Number(req.params.id));
  if (!user || user.approval_status !== 'pending') {
    return res.status(404).json({ error: 'User not found or already reviewed' });
  }
  user.approval_status = 'approved';
  addNotification(user.id, 'Account approved', 'Your account is now approved. You may log in.');
  addLog('user_approved', 'user', user.id, user.username, req.user.sub);
  persist();
  res.json({ ok: true });
});

router.patch('/users/:id/reject', requireAuth, requireRole('admin'), (req, res) => {
  const user = getUserById(Number(req.params.id));
  if (!user || user.approval_status !== 'pending') {
    return res.status(404).json({ error: 'User not found or already reviewed' });
  }
  user.approval_status = 'rejected';
  addNotification(user.id, 'Account requires re-submission', 'Your signup was rejected. Contact admin with a valid school ID.');
  addLog('user_rejected', 'user', user.id, user.username, req.user.sub);
  persist();
  res.json({ ok: true });
});

router.patch('/users/:id/suspend', requireAuth, requireRole('admin'), (req, res) => {
  const user = getUserById(Number(req.params.id));
  if (!user || user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot suspend this user' });
  }
  user.approval_status = 'suspended';
  addLog('user_suspended', 'user', user.id, user.username, req.user.sub);
  persist();
  res.json({ ok: true });
});

router.patch('/users/:id/activate', requireAuth, requireRole('admin'), (req, res) => {
  const user = getUserById(Number(req.params.id));
  if (!user || user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot modify this user' });
  }
  if (user.approval_status === 'pending') {
    return res.status(400).json({ error: 'Approve pending registration first' });
  }
  user.approval_status = 'approved';
  addLog('user_activated', 'user', user.id, user.username, req.user.sub);
  persist();
  res.json({ ok: true });
});

module.exports = router;

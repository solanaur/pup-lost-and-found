const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const aiRoutes = require('./routes/ai');
const claimsRoutes = require('./routes/claims');
const systemRoutes = require('./routes/system');
const matchesRoutes = require('./routes/matches');
const { listAdminMatches, matchToResponse, updateMatchStatus, hydrate, flush, resetStore } = require('./db');
const { requireAuth, requireRole } = require('./auth');
const { useSupabase } = require('./supabase');
const { isEmailConfigured, verifySmtpConnection, getPublicBaseUrl } = require('./email');

function createApp(options = {}) {
  const { serveStatic = true } = options;
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '8mb' }));

  app.use(async (req, res, next) => {
    try {
      await hydrate();
    } catch (err) {
      console.error('[db] hydrate failed:', err.message);
      return res.status(503).json({ error: 'Database unavailable. Please try again.' });
    }

    if (!useSupabase()) return next();

    let committed = false;
    const commit = async () => {
      if (committed) return;
      committed = true;
      await flush();
      resetStore();
    };

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (isMutation) {
      const wrapSend = (sender) => async function sendWithCommit(...args) {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          try {
            await commit();
          } catch (err) {
            console.error('[db] flush failed:', err.message);
            if (!res.headersSent) {
              return res.status(500).json({ error: 'Failed to save data. Please try again.' });
            }
            return undefined;
          }
        }
        return sender.apply(res, args);
      };
      res.json = wrapSend(res.json.bind(res));
      res.send = wrapSend(res.send.bind(res));
    }
    // Keep hydrated mem on GET so warm Netlify functions skip re-fetching Supabase.

    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/items', itemsRoutes);
  app.use('/api/claims', claimsRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/matches', matchesRoutes);

  app.get('/api/health', async (_req, res) => {
    const smtp = isEmailConfigured() ? await verifySmtpConnection() : { ok: false, reason: 'SMTP_PASS not set' };
    res.json({
      ok: true,
      service: 'ibalik',
      storage: useSupabase() ? 'supabase' : 'file',
      email: smtp.ok ? 'smtp' : 'off',
      email_error: smtp.ok ? null : smtp.reason,
      public_base_url: getPublicBaseUrl(),
    });
  });

  app.get('/api/admin/matches', requireAuth, requireRole('admin'), (_req, res) => {
    res.json(listAdminMatches().map((m) => matchToResponse(m, true)));
  });

  app.patch('/api/admin/matches/:matchId/status', requireAuth, requireRole('admin'), (req, res) => {
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

  if (serveStatic) {
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error('[api]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };

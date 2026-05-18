const TOKEN_KEY = 'ibalik_token';
const LEGACY_TOKEN_KEY = 'pup_lf_token';

const Api = {
  token: localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '',

  setToken(t) {
    this.token = t || '';
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  },

  async request(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const method = (opts.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}
    if (!res.ok) {
      const msg = (data && (data.error || data.detail)) || res.statusText || 'Request failed';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  },

  login(body) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }); },
  signup(body) { return this.request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }); },
  me() { return this.request('/auth/me'); },
  updateProfile(body) { return this.request('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }); },
  pendingUsers() { return this.request('/auth/pending-users'); },
  approveUser(id) { return this.request(`/auth/users/${id}/approve`, { method: 'PATCH' }); },
  rejectUser(id) { return this.request(`/auth/users/${id}/reject`, { method: 'PATCH' }); },

  stats() { return this.request('/items/stats'); },
  items() { return this.request('/items'); },
  item(id) { return this.request(`/items/${id}`); },
  myItems() { return this.request('/items/mine'); },
  pendingItems() { return this.request('/items/pending'); },
  liveItems() { return this.request('/items/live'); },
  createItem(body) { return this.request('/items', { method: 'POST', body: JSON.stringify(body) }); },
  approveItem(id) { return this.request(`/items/${id}/approve`, { method: 'PATCH' }); },
  rejectItem(id) { return this.request(`/items/${id}/reject`, { method: 'PATCH' }); },
  claimItemAdmin(id) { return this.request(`/items/${id}/claim`, { method: 'PATCH' }); },
  adminTracker() { return this.request('/items/admin/tracker'); },

  smartMatch(body) { return this.request('/ai/smart-match', { method: 'POST', body: JSON.stringify(body) }); },
  enrich(body) { return this.request('/ai/enrich', { method: 'POST', body: JSON.stringify(body) }); },
  categorize(text) { return this.request('/ai/categorize', { method: 'POST', body: JSON.stringify({ text }) }); },

  myClaims() { return this.request('/claims/mine'); },
  pendingClaims() { return this.request('/claims/pending'); },
  submitClaim(body) { return this.request('/claims', { method: 'POST', body: JSON.stringify(body) }); },
  approveClaim(id) { return this.request(`/claims/${id}/approve`, { method: 'PATCH' }); },
  rejectClaim(id, feedback) { return this.request(`/claims/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ feedback }) }); },

  notifications() { return this.request('/system/notifications'); },
  readNotification(id) { return this.request(`/system/notifications/${id}/read`, { method: 'PATCH' }); },
  readAllNotifications() { return this.request('/system/notifications/read-all', { method: 'PATCH' }); },
  settings() { return this.request('/system/settings'); },
  adminActivity() { return this.request('/system/admin/activity'); },
  adminUsers() { return this.request('/system/admin/users'); },
  adminAnalytics() { return this.request('/system/admin/analytics'); },
};

window.Api = Api;

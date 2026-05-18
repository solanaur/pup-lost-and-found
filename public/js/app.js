/* iBalik — SPA */
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const state = {
  user: null,
  items: [],
  stats: null,
  notifications: [],
  settings: null,
  matches: [],
  wizard: {},
  reportType: 'lost',
  filters: { q: '', type: 'all', category: 'all', building: 'all', status: 'all', sort: 'newest' },
  aiQuery: '',
  activeTab: 'all',
  adminTab: 'dashboard',
};

const ICONS = {
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>',
  spark: '✦',
};

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [path, id] = hash.split('/').filter(Boolean);
  return { path: path || 'home', id };
}

function nav(path) {
  location.hash = `#/${path}`;
}

function isAuthed() { return Boolean(state.user); }
function isAdmin() { return state.user && state.user.role === 'admin'; }
function isStudent() { return state.user && state.user.role === 'student'; }

function userInitials() {
  if (!state.user) return 'G';
  const n = state.user.full_name || state.user.username;
  return n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function itemThumb(item) {
  if (item.photo_data) return `<img src="${esc(item.photo_data)}" alt="" loading="lazy">`;
  return `<div class="emoji-fallback">${esc(item.emoji || '📦')}</div>`;
}

function itemCard(item, opts = {}) {
  const pct = opts.confidence_pct;
  const badge = pct != null
    ? `<span class="confidence-badge ${pct >= 80 ? '' : pct >= 60 ? 'med' : 'low'}">${pct}% Match</span>`
    : '';
  const typeChip = item.type === 'found' ? 'chip-found' : 'chip-lost';
  return `<article class="item-card" data-action="open-item" data-id="${item.id}">
    <div class="thumb">${badge}${itemThumb(item)}</div>
    <div class="body">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
        <span class="chip ${typeChip}">${esc(item.type)}</span>
        <span class="chip chip-${esc(item.status)}">${esc(item.status)}</span>
      </div>
      <div class="title">${esc(item.name)}</div>
      <div class="meta">${esc(item.loc)}</div>
      <div class="meta">${esc(item.date)} · ${esc(item.item_category || 'General')}</div>
    </div>
  </article>`;
}

function publicNav() {
  const authed = isAuthed();
  return `<header class="pub-nav">
    <a href="#/home" class="brand" data-action="nav" data-path="home">
      <span class="brand-mark">${ICONS.spark}</span>
      <span><strong>iBalik</strong><span class="brand-sub">PUP Parañaque</span></span>
    </a>
    <nav class="nav-links">
      <a href="#/browse" data-action="nav" data-path="browse">Browse Items</a>
      <a href="#/ai-search" data-action="nav" data-path="ai-search">AI Search</a>
      <a href="#/report-lost" data-action="nav" data-path="report-lost">Report Item</a>
      ${authed
    ? `<button class="btn btn-soft btn-sm" data-action="nav" data-path="${isAdmin() ? 'admin' : 'dashboard'}">Dashboard</button>
         <button class="btn btn-ghost btn-sm" data-action="logout">Logout</button>`
    : `<button class="btn btn-ghost btn-sm" data-action="nav" data-path="login">Login</button>
         <button class="btn btn-primary btn-sm" data-action="nav" data-path="register">Register</button>`}
    </nav>
  </header>`;
}

function sidebarNav(active) {
  const unread = state.notifications.filter((n) => !n.is_read).length;
  const studentLinks = [
    ['dashboard', 'Home', ICONS.home],
    ['ai-search', 'AI Search', ICONS.search],
    ['browse', 'Browse Items', '📋'],
    ['report-lost', 'Report Lost Item', '🔍'],
    ['report-found', 'Report Found Item', '✅'],
    ['my-reports', 'My Reports', '📝'],
    ['my-claims', 'My Claims', '🤝'],
    ['notifications', 'Notifications', '🔔', unread],
    ['profile', 'Profile', '👤'],
  ];
  const adminLinks = [
    ['admin', 'Dashboard', ICONS.home],
    ['admin/reports', 'Pending Reports', '📋'],
    ['admin/claims', 'Claims Verification', '🤝'],
    ['admin/users', 'User Management', '👥'],
    ['admin/ai', 'AI Match Monitoring', '✦'],
    ['admin/analytics', 'Analytics', '📊'],
    ['admin/settings', 'Settings', '⚙️'],
    ['notifications', 'Notifications', '🔔', unread],
  ];
  const links = isAdmin() ? adminLinks : studentLinks;
  return `<aside class="sidebar">
    <a href="#/${isAdmin() ? 'admin' : 'dashboard'}" class="brand">
      <span class="brand-mark">${ICONS.spark}</span>
      <span><strong>iBalik</strong><span class="brand-sub">PUP Parañaque</span></span>
    </a>
    <nav class="sidebar-nav">
      ${links.map(([p, label, icon, badge]) => `
        <button class="nav-item ${active === p ? 'active' : ''}" data-action="nav" data-path="${p}">
          <span>${icon}</span> ${esc(label)}
          ${badge ? `<span class="badge">${badge}</span>` : ''}
        </button>`).join('')}
    </nav>
    ${!isAdmin() ? `<div class="sidebar-ai-card glass">
      <strong>AI Assistant</strong> <span class="chip chip-pending" style="font-size:10px">BETA</span>
      <p>Describe lost items naturally and get smart matches instantly.</p>
      <button class="btn btn-primary btn-sm btn-block" data-action="nav" data-path="ai-search">Try AI Search</button>
    </div>` : ''}
    <button class="nav-item" style="margin-top:12px" data-action="logout">🚪 Logout</button>
  </aside>`;
}

function appTopbar() {
  return `<header class="topbar">
    <div class="search-global">
      ${ICONS.search}
      <input type="search" placeholder="Search items, locations, or keywords..." id="globalSearch" value="${esc(state.filters.q)}">
    </div>
    <div class="topbar-actions">
      <button class="icon-btn" data-action="nav" data-path="notifications" title="Notifications">
        🔔 ${state.notifications.some((n) => !n.is_read) ? '<span class="dot"></span>' : ''}
      </button>
      <div class="user-chip" data-action="nav" data-path="profile">
        <span class="avatar">${state.user.avatar_data ? `<img src="${esc(state.user.avatar_data)}">` : esc(userInitials())}</span>
        <div><strong style="font-size:13px">${esc(state.user.full_name || state.user.username)}</strong><br><span style="font-size:11px;color:var(--muted)">${esc(state.user.role)}</span></div>
      </div>
    </div>
  </header>`;
}

function appShell(content, active) {
  return `<div class="app-shell">
    ${sidebarNav(active)}
    <div class="main-wrap">
      ${appTopbar()}
      <main class="page">${content}</main>
    </div>
  </div>`;
}

function viewHome() {
  const s = state.stats || {};
  const items = (state.items || []).slice(0, 8);
  return `${publicNav()}
  <section class="hero-grad" style="margin:24px 28px 0;max-width:1200px;margin-left:auto;margin-right:auto">
    <h1>Lost Something on Campus?</h1>
    <p>AI helps match lost and found items across PUP Parañaque. Describe what you lost naturally — our engine analyzes descriptions, colors, categories, and locations.</p>
    <div class="ai-search-box">
      <input type="text" id="heroAiInput" placeholder="Describe what you lost naturally… e.g. Black wallet near engineering building with school ID" value="${esc(state.aiQuery)}">
      <button class="btn btn-primary" data-action="hero-search">Search with AI</button>
    </div>
    <div class="hero-actions">
      <button class="btn btn-ghost" data-action="nav" data-path="report-lost">Report Lost Item</button>
      <button class="btn btn-ghost" data-action="demo-upload">Upload Photo</button>
      <button class="btn btn-ghost" data-action="fill-example">Use Example</button>
    </div>
    <p style="font-size:12px;opacity:0.85;margin-top:14px">AI analyzes descriptions, colors, categories, and locations to suggest possible matches.</p>
  </section>

  ${state.matches.length ? `<section style="max-width:1200px;margin:20px auto;padding:0 28px">
    <div class="section-title"><h2>AI Match Preview</h2></div>
    <div class="match-scroll">${state.matches.slice(0, 4).map((m) => itemCard({ ...m, id: m.item_id }, { confidence_pct: m.confidence_pct })).join('')}</div>
  </section>` : ''}

  <section style="max-width:1200px;margin:0 auto;padding:0 28px">
    <div class="stats-row">
      <div class="stat-card"><div class="icon" style="background:#e8f7ee">📦</div><div class="label">Items Returned</div><div class="value">${s.items_returned || 328}</div></div>
      <div class="stat-card"><div class="icon" style="background:#eef2fa">📋</div><div class="label">Active Reports</div><div class="value">${s.active_reports || 54}</div></div>
      <div class="stat-card"><div class="icon" style="background:#fef3f2">✓</div><div class="label">Claims Resolved</div><div class="value">${s.claims_resolved_pct || 91}%</div></div>
      <div class="stat-card"><div class="icon" style="background:#f3e8ff">📍</div><div class="label">Most Common Location</div><div class="value" style="font-size:18px">${esc(s.top_location || 'Engineering Bldg')}</div></div>
    </div>

    <div class="section-title"><h2>Quick Actions</h2></div>
    <div class="grid-4">
      ${[
        ['report-lost', 'Report Lost Item', 'Submit a detailed lost item report with AI assistance.', '🔍'],
        ['report-found', 'Report Found Item', 'Found something? Help return it to its owner.', '✅'],
        ['browse', 'Browse Found Items', 'Explore approved campus lost & found listings.', '📋'],
        ['ai-search', 'AI Match Search', 'Natural language search with confidence scoring.', '✦'],
      ].map(([p, t, d, ic]) => `<article class="action-card" data-action="nav" data-path="${p}"><div class="icon-wrap">${ic}</div><h3>${esc(t)}</h3><p>${esc(d)} →</p></article>`).join('')}
    </div>

    <div class="section-title"><h2>Powered by AI</h2></div>
    <div class="grid-4">
      ${[
        ['Smart Matching', 'Cross-reference lost & found reports with confidence scores.'],
        ['Image Recognition', 'Upload photos for visual similarity hints (beta).'],
        ['Instant Notifications', 'Get alerted when AI finds a possible match.'],
        ['Secure Verification', 'Admin-verified claims protect item owners.'],
      ].map(([t, d]) => `<article class="feature-card"><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}
    </div>

    <div class="section-title"><h2>Recently Found Items</h2><a href="#/browse" data-action="nav" data-path="browse" style="color:var(--brand);font-weight:700">View all →</a></div>
    <div class="grid-auto">${items.length ? items.map((i) => itemCard(i)).join('') : '<p class="muted">Loading items…</p>'}</div>
  </section>
  ${siteFooter()}`;
}

function siteFooter() {
  return `<footer class="site-footer">
    <div class="footer-grid">
      <div><div class="brand" style="margin-bottom:12px"><span class="brand-mark">${ICONS.spark}</span><strong>iBalik</strong></div>
      <p style="color:var(--muted);font-size:13px;line-height:1.6">AI-powered Lost & Found for PUP Parañaque. Recover what matters — smarter and faster.</p></div>
      <div><h4>Platform</h4><a href="#/browse" data-action="nav" data-path="browse">Browse Items</a><a href="#/ai-search" data-action="nav" data-path="ai-search">AI Search</a></div>
      <div><h4>Support</h4><a href="#">FAQ</a><a href="#">Contact</a><a href="#">Privacy Policy</a></div>
      <div><h4>Campus</h4><p>PUP Parañaque</p><p>Lost & Found Office</p></div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} iBalik · PUP Parañaque Lost and Found</div>
  </footer>`;
}

function viewLogin() {
  return `${publicNav()}
  <div class="auth-page">
    <div class="auth-visual">
      <h1>Welcome Back to iBalik</h1>
      <p>Recover lost items smarter with AI-powered matching, secure claims, and real-time campus notifications.</p>
    </div>
    <div class="auth-form-wrap">
      <form class="auth-card glass" data-action="login-submit">
        <h2 style="margin:0 0 8px">Sign in</h2>
        <p style="color:var(--muted);margin:0 0 20px;font-size:14px">Student or admin account</p>
        <div class="field"><label>Student Number / Admin ID</label><input name="username" required placeholder="2021-00001-PQ-0"></div>
        <div class="field"><label>Password</label><input name="password" type="password" required></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:16px"><input type="checkbox" name="remember"> Remember me</label>
        <button type="submit" class="btn btn-primary btn-block">Login</button>
        <button type="button" class="btn btn-ghost btn-block" style="margin-top:10px" data-action="nav" data-path="home">Continue as Guest</button>
        <p style="text-align:center;margin-top:18px;font-size:14px">Don't have an account? <a href="#/register" data-action="nav" data-path="register" style="color:var(--brand);font-weight:700">Register</a></p>
        <p style="font-size:12px;color:var(--muted);margin-top:12px;text-align:center">Demo: student <code>2021-00001-PQ-0</code> / admin <code>admin</code> — password <code>password</code></p>
      </form>
    </div>
  </div>`;
}

function viewRegister() {
  return `${publicNav()}
  <div class="auth-page">
    <div class="auth-visual"><h1>Join iBalik</h1><p>Create your student account. Admin approval and school ID verification keep the platform secure.</p></div>
    <div class="auth-form-wrap">
      <form class="auth-card glass" data-action="register-submit" style="max-width:480px">
        <h2 style="margin:0 0 20px">Create Account</h2>
        <div class="field"><label>Full Name</label><input name="full_name" required></div>
        <div class="field"><label>Student Number</label><input name="username" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Email</label><input name="email" type="email"></div>
          <div class="field"><label>Course</label><input name="course"></div>
        </div>
        <div class="field"><label>Year Level</label><select name="year_level"><option>1st Year</option><option>2nd Year</option><option selected>3rd Year</option><option>4th Year</option></select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Password</label><input name="password" type="password" required minlength="6"></div>
          <div class="field"><label>Confirm Password</label><input name="password2" type="password" required></div>
        </div>
        <div class="field"><label>Upload School ID (required)</label><input type="file" accept="image/*" data-action="id-upload" required></div>
        <div class="field"><label>Profile Picture (optional)</label><input type="file" accept="image/*" data-action="avatar-upload"></div>
        <button type="submit" class="btn btn-primary btn-block">Create Account</button>
        <p style="text-align:center;margin-top:14px">Already have an account? <a href="#/login" data-action="nav" data-path="login" style="color:var(--brand);font-weight:700">Login</a></p>
      </form>
    </div>
  </div>`;
}

function viewDashboard() {
  const s = state.stats || {};
  const found = state.items.filter((i) => i.type === 'found').slice(0, 5);
  const matches = state.matches.slice(0, 4);
  return appShell(`
    <section class="hero-grad">
      <h1>Lost something? Let AI help you find it.</h1>
      <p>Describe your lost item naturally and our AI will find possible matches for you.</p>
      <div class="ai-search-box">
        <input type="text" id="dashAiInput" placeholder="Black wallet near gym with PUP ID" value="${esc(state.aiQuery)}">
        <button class="btn btn-primary" data-action="dash-ai-search">Search</button>
        <button class="btn btn-soft" data-action="demo-upload">Upload Image</button>
      </div>
    </section>

    <div class="stats-row">
      <div class="stat-card"><div class="icon" style="background:#e8f7ee">📦</div><div class="label">Items Returned</div><div class="value">${s.items_returned || 0}</div></div>
      <div class="stat-card"><div class="icon" style="background:#eef2fa">📋</div><div class="label">Active Reports</div><div class="value">${s.active_reports || 0}</div></div>
      <div class="stat-card"><div class="icon" style="background:#fef3f2">✓</div><div class="label">Claims Resolved</div><div class="value">${s.claims_resolved_pct || 0}%</div></div>
      <div class="stat-card"><div class="icon" style="background:#f3e8ff">📍</div><div class="label">Top Location</div><div class="value" style="font-size:16px">${esc(s.top_location || '—')}</div></div>
    </div>

    <div class="section-title"><h2>Quick Actions</h2></div>
    <div class="grid-4">
      ${[['report-lost','Report Lost Item','🔍'],['report-found','Report Found Item','✅'],['ai-search','View AI Matches','✦'],['browse','Browse All Items','📋']]
        .map(([p,t,ic]) => `<article class="action-card" data-action="nav" data-path="${p}"><div class="icon-wrap">${ic}</div><h3>${t}</h3><p>Go →</p></article>`).join('')}
    </div>

    <div class="dash-grid">
      <div>
        <div class="section-title"><h2>AI Suggested Matches</h2><button class="btn btn-soft btn-sm" data-action="dash-ai-search">Refresh</button></div>
        <div class="match-scroll">${matches.length ? matches.map((m) => itemCard({ ...m, id: m.item_id }, { confidence_pct: m.confidence_pct })).join('') : '<div class="empty-state"><div class="big">✦</div><p>Run a search above to see AI matches</p></div>'}</div>
      </div>
      <div>
        <div class="section-title"><h2>Recently Found</h2></div>
        <div class="recent-list">${found.map((i) => `
          <div class="recent-row" data-action="open-item" data-id="${i.id}">
            <div class="mini-thumb">${itemThumb(i)}</div>
            <div style="flex:1;min-width:0"><strong style="font-size:14px">${esc(i.name)}</strong><br><span style="font-size:12px;color:var(--muted)">${esc(i.loc)} · ${esc(i.date)}</span></div>
            <span class="chip chip-${esc(i.status)}">${esc(i.status)}</span>
          </div>`).join('')}</div>
      </div>
    </div>

    <div class="grid-4" style="margin-top:28px">
      ${['AI-Powered Matching','Secure & Verified','Fast Notifications','Easy Recovery'].map((t) => `<article class="feature-card" style="text-align:center"><div style="font-size:28px;margin-bottom:8px">✦</div><strong>${t}</strong></article>`).join('')}
    </div>
  `, 'dashboard');
}

function viewAiSearch() {
  return appShell(`
    <h1 style="margin:0 0 8px;font-size:28px">AI Search</h1>
    <p style="color:var(--muted);margin:0 0 20px">Type naturally or upload a photo description. AI extracts keywords, colors, categories, and locations.</p>
    <section class="hero-grad" style="padding:28px">
      <div class="ai-search-box">
        <input type="text" id="aiSearchInput" placeholder="Blue Aquaflask left near gym…" value="${esc(state.aiQuery)}">
        <button class="btn btn-primary" data-action="run-ai-search">AI Search</button>
      </div>
    </section>
    <div class="section-title"><h2>${state.matches.length ? 'Possible Matches Found' : 'Results'}</h2><span class="muted">${state.matches.length} matches</span></div>
    <div class="grid-auto">${state.matches.length
    ? state.matches.map((m) => {
      const card = itemCard({ ...m, id: m.item_id }, { confidence_pct: m.confidence_pct });
      return card.replace('</article>', `<div style="padding:0 16px 14px"><p style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(m.reason)}</p><button class="btn btn-primary btn-sm btn-block" data-action="open-item" data-id="${m.item_id}">View & Claim</button></div></article>`);
    }).join('')
    : '<div class="empty-state glass" style="border-radius:var(--radius);padding:60px"><div class="big">🔍</div><p>Enter a description and click AI Search</p></div>'}</div>
  `, 'ai-search');
}

function viewBrowse() {
  const filtered = filterItems(state.items);
  return appShell(`
    <h1 style="margin:0 0 8px">Browse Items</h1>
    <p style="color:var(--muted);margin:0 0 16px">Marketplace-style campus lost & found board</p>
    <div class="filters-bar">
      <input type="search" id="browseSearch" placeholder="Live search…" value="${esc(state.filters.q)}" style="flex:1;min-width:180px">
      <select id="filterType"><option value="all">All types</option><option value="lost">Lost</option><option value="found">Found</option></select>
      <select id="filterCategory"><option value="all">Category</option>${[...new Set(state.items.map((i) => i.item_category).filter(Boolean))].map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
      <select id="filterBuilding"><option value="all">Building</option>${[...new Set(state.items.map((i) => i.building).filter(Boolean))].map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select>
      <select id="filterStatus"><option value="all">Status</option><option value="approved">Approved</option><option value="claimed">Claimed</option></select>
      <select id="filterSort"><option value="newest">Newest</option><option value="name">Name A-Z</option></select>
    </div>
    <div class="grid-auto" id="browseGrid">${filtered.length ? filtered.map((i) => itemCard(i)).join('') : '<div class="empty-state"><p>No items match your filters</p></div>'}</div>
  `, 'browse');
}

function filterItems(items) {
  let rows = [...items];
  const f = state.filters;
  if (f.type !== 'all') rows = rows.filter((i) => i.type === f.type);
  if (f.category !== 'all') rows = rows.filter((i) => i.item_category === f.category);
  if (f.building !== 'all') rows = rows.filter((i) => i.building === f.building);
  if (f.status !== 'all') rows = rows.filter((i) => i.status === f.status);
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter((i) => `${i.name} ${i.loc} ${i.description} ${i.item_category} ${i.color}`.toLowerCase().includes(q));
  }
  if (f.sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function viewItemDetail(id) {
  const item = state.currentItem;
  if (!item) return appShell('<div class="empty-state"><p>Loading…</p></div>', 'browse');
  const similar = state.matches.filter((m) => m.item_id !== item.id).slice(0, 3);
  return appShell(`
    <button class="btn btn-soft btn-sm" data-action="nav" data-path="browse" style="margin-bottom:16px">← Back</button>
    <div class="detail-layout">
      <div>
        <div class="detail-gallery">${item.photo_data ? `<img src="${esc(item.photo_data)}">` : `<div style="display:grid;place-items:center;height:100%;font-size:80px">${esc(item.emoji || '📦')}</div>`}</div>
      </div>
      <div class="glass" style="padding:24px;border-radius:var(--radius-lg)">
        <span class="chip chip-${esc(item.type)}">${esc(item.type)}</span>
        <span class="chip chip-${esc(item.status)}" style="margin-left:6px">${esc(item.status)}</span>
        <p style="font-size:12px;color:var(--muted);font-weight:700;margin:12px 0 4px">${esc(item.code)}</p>
        <h1 style="margin:0 0 12px;font-size:26px">${esc(item.name)}</h1>
        <p><strong>Category:</strong> ${esc(item.item_category)} · <strong>Color:</strong> ${esc(item.color || 'N/A')}</p>
        <p style="line-height:1.6;color:var(--muted)">${esc(item.description)}</p>
        <p style="margin-top:16px"><strong>📍 Location:</strong> ${esc(item.loc)}</p>
        <p><strong>🏢 Building:</strong> ${esc(item.building || '—')}</p>
        <p><strong>📅 Reported:</strong> ${esc(item.date)}</p>
        ${item.type === 'found' && item.status === 'approved' && isStudent()
    ? `<button class="btn btn-primary btn-block" style="margin-top:20px" data-action="open-claim-modal" data-id="${item.id}">Claim Item</button>`
    : ''}
        ${isAdmin() ? `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" data-action="admin-approve-item" data-id="${item.id}">Approve</button>
          <button class="btn btn-soft btn-sm" data-action="admin-claim-item" data-id="${item.id}">Mark Claimed</button>
        </div>` : ''}
        <div class="ai-panel">
          <strong>✦ Possible Similar Reports</strong>
          <div style="margin-top:12px">${similar.length ? similar.map((m) => `<p style="font-size:13px;margin:8px 0"><strong>${m.confidence_pct}%</strong> — ${esc(m.name)} (${esc(m.loc)})</p>`).join('') : '<p style="font-size:13px;color:var(--muted)">Run AI search from dashboard for suggestions</p>'}</div>
        </div>
      </div>
    </div>
  `, 'browse');
}

function viewReport(type) {
  const w = state.wizard;
  const step = w.step || 1;
  const steps = ['Basic Info', 'Location & Date', 'Photos', 'AI Assist', 'Submit'];
  return appShell(`
    <h1 style="margin:0 0 8px">Report ${type === 'lost' ? 'Lost' : 'Found'} Item</h1>
    <p style="color:var(--muted);margin:0 0 20px">Multi-step report with AI auto-categorization</p>
    <div class="wizard-steps">${steps.map((s, i) => `<div class="wizard-step ${i + 1 < step ? 'done' : ''} ${i + 1 === step ? 'active' : ''}">${i + 1}. ${s}</div>`).join('')}</div>
    <form class="glass" style="padding:28px;border-radius:var(--radius-lg);max-width:640px" data-action="report-submit" data-type="${type}">
      ${step === 1 ? `
        <div class="field"><label>Item name</label><input name="name" value="${esc(w.name || '')}" required></div>
        <div class="field"><label>Category</label><select name="item_category">${(state.settings?.categories || []).map((c) => `<option ${w.item_category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Color</label><input name="color" value="${esc(w.color || '')}"></div>
          <div class="field"><label>Brand</label><input name="brand" value="${esc(w.brand || '')}"></div>
        </div>
        <div class="field"><label>Description</label><textarea name="description">${esc(w.description || '')}</textarea></div>
      ` : step === 2 ? `
        <div class="field"><label>${type === 'lost' ? 'Last seen location' : 'Found location'}</label><input name="loc" value="${esc(w.loc || '')}" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div class="field"><label>Building</label><select name="building">${(state.settings?.buildings || []).map((b) => `<option ${w.building === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
          <div class="field"><label>Floor</label><input name="floor" value="${esc(w.floor || '')}"></div>
          <div class="field"><label>Room / Area</label><input name="room" value="${esc(w.room || '')}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Date</label><input name="date_lost" type="date" value="${esc(w.date_lost || '')}"></div>
          <div class="field"><label>Time</label><input name="time_lost" type="time" value="${esc(w.time_lost || '')}"></div>
        </div>
        ${type === 'found' ? `<div class="field"><label>Item condition</label><select name="condition"><option>Good</option><option>Fair</option><option>Needs repair</option></select></div>` : ''}
      ` : step === 3 ? `
        <div class="field"><label>Upload item photo</label><input type="file" accept="image/*" data-action="report-photo"></div>
        ${w.photo_data ? '<p style="font-size:13px;color:var(--success)">✓ Photo attached</p>' : ''}
      ` : step === 4 ? `
        <div class="ai-panel">
          <strong>✦ AI Assistance</strong>
          <p style="font-size:14px;color:var(--muted)">Click analyze to auto-detect category, color, and find possible duplicates.</p>
          <button type="button" class="btn btn-primary btn-sm" data-action="report-ai-enrich" style="margin-top:12px">Analyze with AI</button>
          ${w.aiMatches && w.aiMatches.length ? `<div style="margin-top:16px"><strong>Possible matches detected:</strong>${w.aiMatches.map((m) => `<p style="font-size:13px">${m.confidence_pct}% — ${esc(m.name)}</p>`).join('')}</div>` : ''}
          ${w.aiEnriched ? `<p style="margin-top:12px;font-size:13px">Suggested: ${esc(w.name)} · ${esc(w.item_category)} · ${esc(w.color)}</p>` : ''}
        </div>
      ` : `
        <div class="glass" style="padding:20px;background:var(--grad-soft)">
          <h3 style="margin:0 0 12px">Review & Submit</h3>
          <p><strong>${esc(w.name)}</strong> — ${esc(w.item_category)}</p>
          <p style="color:var(--muted);font-size:14px">${esc(w.loc)}</p>
          <p style="font-size:13px">Status after submit: <span class="chip chip-pending">Pending Review</span></p>
        </div>
      `}
      <div style="display:flex;gap:10px;margin-top:24px">
        ${step > 1 ? '<button type="button" class="btn btn-soft" data-action="wizard-prev">Back</button>' : ''}
        ${step < 5 ? '<button type="button" class="btn btn-primary" data-action="wizard-next">Continue</button>' : '<button type="submit" class="btn btn-primary">Submit Report</button>'}
      </div>
    </form>
  `, type === 'lost' ? 'report-lost' : 'report-found');
}

function viewMyReports() {
  const items = state.myItems || [];
  const tabs = ['all', 'lost', 'found', 'pending', 'claimed'];
  const tab = state.activeTab;
  let rows = items;
  if (tab === 'lost') rows = items.filter((i) => i.type === 'lost');
  if (tab === 'found') rows = items.filter((i) => i.type === 'found');
  if (tab === 'pending') rows = items.filter((i) => i.status === 'pending');
  if (tab === 'claimed') rows = items.filter((i) => i.status === 'claimed');
  return appShell(`
    <h1 style="margin:0 0 16px">My Reports</h1>
    <div class="tabs">${tabs.map((t) => `<button class="tab ${tab === t ? 'active' : ''}" data-action="set-tab" data-tab="${t}">${t}</button>`).join('')}</div>
    <div class="grid-auto">${rows.length ? rows.map((i) => itemCard(i)).join('') : '<div class="empty-state"><p>No reports in this tab</p></div>'}</div>
  `, 'my-reports');
}

function viewMyClaims() {
  const claims = state.myClaims || [];
  return appShell(`
    <h1 style="margin:0 0 16px">My Claims</h1>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${claims.length ? claims.map((c) => `
        <article class="glass" style="padding:20px;border-radius:var(--radius)">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
            <div><strong>${esc(c.item?.name || 'Item')}</strong><br><span style="font-size:13px;color:var(--muted)">${esc(c.date)}</span></div>
            <span class="chip chip-${esc(c.status)}">${esc(c.status)}</span>
          </div>
          <p style="font-size:14px;margin:12px 0 0">${esc(c.description)}</p>
          ${c.admin_feedback ? `<p style="font-size:13px;color:var(--muted)"><strong>Admin:</strong> ${esc(c.admin_feedback)}</p>` : ''}
        </article>`).join('') : '<div class="empty-state"><p>No claims yet</p></div>'}
    </div>
  `, 'my-claims');
}

function viewNotifications() {
  return appShell(`
    <div class="section-title"><h1 style="margin:0">Notifications</h1>
      <button class="btn btn-soft btn-sm" data-action="read-all-notif">Mark all read</button></div>
    <div class="notif-list">${state.notifications.length ? state.notifications.map((n) => `
      <article class="notif-item ${n.is_read ? '' : 'unread'}" data-action="read-notif" data-id="${n.id}">
        <div style="font-size:24px">🔔</div>
        <div><h4>${esc(n.title)}</h4><p>${esc(n.message)}</p><span style="font-size:11px;color:var(--muted)">${esc(n.date)}</span></div>
      </article>`).join('') : '<div class="empty-state"><p>No notifications</p></div>'}
  `, 'notifications');
}

function viewProfile() {
  const u = state.user;
  return appShell(`
    <h1 style="margin:0 0 20px">Profile Settings</h1>
    <form class="glass" style="padding:28px;border-radius:var(--radius-lg);max-width:520px" data-action="profile-save">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <span class="avatar" style="width:64px;height:64px;font-size:22px">${u.avatar_data ? `<img src="${esc(u.avatar_data)}">` : esc(userInitials())}</span>
        <div><input type="file" accept="image/*" data-action="avatar-upload-profile"></div>
      </div>
      <div class="field"><label>Full Name</label><input name="full_name" value="${esc(u.full_name || '')}"></div>
      <div class="field"><label>Email</label><input name="email" value="${esc(u.email || '')}"></div>
      <div class="field"><label>Course</label><input name="course" value="${esc(u.course || '')}"></div>
      <div class="field"><label>Year Level</label><input name="year_level" value="${esc(u.year_level || '')}"></div>
      <button type="submit" class="btn btn-primary">Save Changes</button>
    </form>
  `, 'profile');
}

function viewAdmin(path) {
  const tracker = state.tracker || {};
  const analytics = state.analytics || {};
  if (path === 'admin/reports') {
    const pending = state.pendingItems || [];
    return appShell(`
      <h1>Pending Reports</h1>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:20px">
        ${pending.map((i) => `
          <article class="glass" style="padding:18px;border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
            <div><strong>${esc(i.name)}</strong> <span class="chip chip-${esc(i.type)}">${esc(i.type)}</span><br><span style="font-size:13px;color:var(--muted)">${esc(i.loc)} · by ${esc(i.by)}</span></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" data-action="admin-approve-item" data-id="${i.id}">Approve</button>
              <button class="btn btn-soft btn-sm" data-action="admin-reject-item" data-id="${i.id}">Reject</button>
            </div>
          </article>`).join('') || '<div class="empty-state"><p>No pending reports</p></div>'}
      </div>
    `, path);
  }
  if (path === 'admin/claims') {
    const claims = state.pendingClaims || [];
    return appShell(`
      <h1>Claim Verification</h1>
      ${claims.map((c) => `
        <article class="glass" style="padding:20px;border-radius:var(--radius);margin-top:14px">
          <strong>${esc(c.item?.name)}</strong> — ${esc(c.user?.full_name || c.user?.username)}<br>
          <p style="font-size:14px;margin:12px 0">${esc(c.description)}</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" data-action="admin-approve-claim" data-id="${c.id}">Approve</button>
            <button class="btn btn-soft btn-sm" data-action="admin-reject-claim" data-id="${c.id}">Reject</button>
          </div>
        </article>`).join('') || '<div class="empty-state"><p>No pending claims</p></div>'}
    `, path);
  }
  if (path === 'admin/users') {
    const pending = state.pendingUsers || [];
    const users = state.adminUsers || [];
    return appShell(`
      <h1>User Management</h1>
      <h2 style="margin-top:24px;font-size:18px">Pending Approvals (${pending.length})</h2>
      ${pending.map((u) => `
        <article class="glass" style="padding:16px;margin-top:10px;border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div><strong>${esc(u.full_name)}</strong> (${esc(u.username)})<br><span style="font-size:13px;color:var(--muted)">${esc(u.course)} ${esc(u.year_level)}</span></div>
          <div><button class="btn btn-primary btn-sm" data-action="approve-user" data-id="${u.id}">Approve</button>
          <button class="btn btn-soft btn-sm" data-action="reject-user" data-id="${u.id}">Reject</button></div>
        </article>`).join('') || '<p class="muted">No pending signups</p>'}
      <h2 style="margin-top:32px;font-size:18px">All Users</h2>
      <div style="overflow-x:auto;margin-top:12px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="text-align:left;color:var(--muted)"><th>Name</th><th>Role</th><th>Status</th><th>Logins</th></tr></thead>
          <tbody>${users.map((u) => `<tr style="border-top:1px solid var(--line)"><td style="padding:12px 8px">${esc(u.full_name)}</td><td>${esc(u.role)}</td><td><span class="chip chip-${esc(u.approval_status)}">${esc(u.approval_status)}</span></td><td>${u.login_count}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    `, path);
  }
  if (path === 'admin/ai') {
    return appShell(`
      <h1>AI Match Monitoring</h1>
      <p style="color:var(--muted)">Run test queries and review match confidence distribution</p>
      <div class="ai-search-box" style="margin-top:20px;background:#fff">
        <input type="text" id="adminAiTest" placeholder="Test query…">
        <button class="btn btn-primary" data-action="admin-ai-test">Test Match</button>
      </div>
      <div class="grid-auto" style="margin-top:20px">${state.matches.map((m) => itemCard({ ...m, id: m.item_id }, { confidence_pct: m.confidence_pct })).join('') || '<p class="muted">No test results yet</p>'}</div>
    `, path);
  }
  if (path === 'admin/analytics') {
    const cats = analytics.by_category || [];
    const max = Math.max(...cats.map((c) => c.count), 1);
    return appShell(`
      <h1>Analytics</h1>
      <div class="stats-row" style="margin-top:20px">
        <div class="stat-card"><div class="label">AI Accuracy</div><div class="value">${analytics.ai_accuracy_pct || 87}%</div></div>
        <div class="stat-card"><div class="label">Avg Recovery</div><div class="value">${analytics.avg_recovery_days || 4.2}d</div></div>
        <div class="stat-card"><div class="label">Claim Success</div><div class="value">${analytics.claim_success_pct || 91}%</div></div>
      </div>
      <div class="glass" style="padding:24px;border-radius:var(--radius);margin-top:20px">
        <h3>Most Lost Categories</h3>
        <div class="chart-bars" style="margin-top:16px">${cats.map((c) => `
          <div class="chart-row"><span style="width:120px">${esc(c.name)}</span>
          <div class="chart-bar-wrap"><div class="chart-bar" style="width:${(c.count / max) * 100}%"></div></div>
          <span class="chart-val">${c.count}</span></div>`).join('')}</div>
      </div>
    `, path);
  }
  if (path === 'admin/settings') {
    const s = state.settings || {};
    return appShell(`
      <h1>System Settings</h1>
      <div class="glass" style="padding:24px;border-radius:var(--radius);margin-top:20px;max-width:560px">
        <p><strong>Branding:</strong> ${esc(s.branding_name)}</p>
        <p><strong>AI threshold:</strong> ${s.ai_threshold}</p>
        <p style="margin-top:16px"><strong>Categories:</strong> ${(s.categories || []).join(', ')}</p>
        <p><strong>Buildings:</strong> ${(s.buildings || []).join(', ')}</p>
      </div>
    `, path);
  }
  return appShell(`
    <h1 style="margin:0 0 8px">Admin Dashboard</h1>
    <p style="color:var(--muted)">Analytics overview & recent activity</p>
    <div class="stats-row" style="margin-top:20px">
      <div class="stat-card"><div class="label">Total Reports</div><div class="value">${tracker.total_items || 0}</div></div>
      <div class="stat-card"><div class="label">Pending Reports</div><div class="value">${tracker.pending_items || 0}</div></div>
      <div class="stat-card"><div class="label">Pending Claims</div><div class="value">${tracker.pending_claims || 0}</div></div>
      <div class="stat-card"><div class="label">Pending Users</div><div class="value">${tracker.pending_approvals || 0}</div></div>
    </div>
    <div class="section-title"><h2>Recent Activity</h2></div>
    <div class="glass" style="padding:16px;border-radius:var(--radius)">
      ${(state.activity || []).slice(0, 12).map((a) => `<p style="font-size:13px;margin:8px 0;border-bottom:1px solid var(--line);padding-bottom:8px"><strong>${esc(a.action)}</strong> — ${esc(a.detail)} <span style="color:var(--muted)">${esc(a.date)}</span></p>`).join('') || '<p class="muted">No activity</p>'}
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">
      <button class="btn btn-primary" data-action="nav" data-path="admin/reports">Moderate Reports</button>
      <button class="btn btn-soft" data-action="nav" data-path="admin/claims">Verify Claims</button>
      <button class="btn btn-soft" data-action="nav" data-path="admin/users">Manage Users</button>
    </div>
  `, 'admin');
}

async function loadCore() {
  try {
    const [stats, items, settings] = await Promise.all([
      Api.stats(),
      Api.items(),
      Api.settings(),
    ]);
    state.stats = stats;
    state.items = items;
    state.settings = settings;
  } catch (e) {
    console.warn(e);
  }
}

async function loadAuthed() {
  if (!isAuthed()) return;
  try {
    const tasks = [Api.notifications().then((n) => { state.notifications = n; })];
    if (isStudent()) {
      tasks.push(Api.myItems().then((i) => { state.myItems = i; }));
      tasks.push(Api.myClaims().then((c) => { state.myClaims = c; }));
    }
    if (isAdmin()) {
      tasks.push(Api.adminTracker().then((t) => { state.tracker = t; }));
      tasks.push(Api.pendingItems().then((i) => { state.pendingItems = i; }));
      tasks.push(Api.pendingClaims().then((c) => { state.pendingClaims = c; }));
      tasks.push(Api.pendingUsers().then((u) => { state.pendingUsers = u; }));
      tasks.push(Api.adminUsers().then((u) => { state.adminUsers = u; }));
      tasks.push(Api.adminActivity().then((a) => { state.activity = a; }));
      tasks.push(Api.adminAnalytics().then((a) => { state.analytics = a; }));
    }
    await Promise.all(tasks);
  } catch (e) {
    console.warn(e);
  }
}

async function runAiSearch(query, type = 'lost') {
  state.aiQuery = query;
  try {
    const res = await Api.smartMatch({ query, type, description: query, name: query });
    state.matches = res.matches || [];
    if (state.matches.length) toast(`Found ${state.matches.length} possible matches`);
    else toast('No strong matches yet — try more details');
  } catch (e) {
    toast(e.message);
  }
}

async function render() {
  const { path, id } = parseRoute();
  const app = document.getElementById('app');

  if (['dashboard', 'my-reports', 'my-claims', 'report-lost', 'report-found', 'profile'].includes(path) && !isAuthed()) {
    nav('login');
    return;
  }
  if (path.startsWith('admin') && !isAdmin()) {
    nav(isAuthed() ? 'dashboard' : 'login');
    return;
  }
  if (isAuthed() && (path === 'home' || path === 'login' || path === 'register')) {
    nav(isAdmin() ? 'admin' : 'dashboard');
    return;
  }

  await loadCore();
  if (isAuthed()) await loadAuthed();

  if (path === 'item' && id) {
    try {
      state.currentItem = await Api.item(id);
      const res = await Api.smartMatch({
        name: state.currentItem.name,
        loc: state.currentItem.loc,
        description: state.currentItem.description,
        type: state.currentItem.type === 'lost' ? 'found' : 'lost',
      });
      state.matches = res.matches || [];
    } catch (_) {}
  }

  let html = '';
  switch (path) {
    case 'home': html = viewHome(); break;
    case 'login': html = viewLogin(); break;
    case 'register': html = viewRegister(); break;
    case 'dashboard': html = viewDashboard(); break;
    case 'ai-search': html = viewAiSearch(); break;
    case 'browse': html = viewBrowse(); break;
    case 'item': html = viewItemDetail(id); break;
    case 'report-lost': state.reportType = 'lost'; html = viewReport('lost'); break;
    case 'report-found': state.reportType = 'found'; html = viewReport('found'); break;
    case 'my-reports': html = viewMyReports(); break;
    case 'my-claims': html = viewMyClaims(); break;
    case 'notifications': html = viewNotifications(); break;
    case 'profile': html = viewProfile(); break;
    case 'admin':
    case 'admin/reports':
    case 'admin/claims':
    case 'admin/users':
    case 'admin/ai':
    case 'admin/analytics':
    case 'admin/settings':
      html = viewAdmin(path);
      break;
    default:
      html = viewHome();
  }

  app.innerHTML = html;
  bindEvents();
  if (path === 'dashboard' && isStudent() && !state.matches.length && state.aiQuery) {
    runAiSearch(state.aiQuery);
  }
}

let idPhotoData = '';
let avatarData = '';

function readFile(input, cb) {
  const f = input.files && input.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => cb(fr.result || '');
  fr.readAsDataURL(f);
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach((el) => {
    el.onclick = async (e) => {
      const action = el.dataset.action;
      if (action === 'nav') { nav(el.dataset.path); return; }
      if (action === 'logout') { Api.setToken(''); state.user = null; nav('home'); return; }
      if (action === 'open-item') { nav(`item/${el.dataset.id}`); return; }
      if (action === 'hero-search' || action === 'dash-ai-search' || action === 'run-ai-search') {
        const inp = document.getElementById('heroAiInput') || document.getElementById('dashAiInput') || document.getElementById('aiSearchInput');
        await runAiSearch(inp?.value || state.aiQuery);
        render();
        return;
      }
      if (action === 'fill-example') {
        state.aiQuery = 'Black wallet near engineering building with school ID';
        render();
        return;
      }
      if (action === 'demo-upload') { toast('Photo upload opens in Report flow — try Report Lost Item'); return; }
      if (action === 'wizard-next') {
        collectWizardFields();
        state.wizard.step = Math.min(5, (state.wizard.step || 1) + 1);
        render();
        return;
      }
      if (action === 'wizard-prev') {
        state.wizard.step = Math.max(1, (state.wizard.step || 1) - 1);
        render();
        return;
      }
      if (action === 'set-tab') { state.activeTab = el.dataset.tab; render(); return; }
      if (action === 'admin-approve-item') {
        await Api.approveItem(el.dataset.id); toast('Approved'); render();
        return;
      }
      if (action === 'admin-reject-item') {
        await Api.rejectItem(el.dataset.id); toast('Rejected'); render();
        return;
      }
      if (action === 'admin-claim-item') {
        await Api.claimItemAdmin(el.dataset.id); toast('Marked claimed'); render();
        return;
      }
      if (action === 'approve-user') {
        await Api.approveUser(el.dataset.id); toast('User approved'); render();
        return;
      }
      if (action === 'reject-user') {
        await Api.rejectUser(el.dataset.id); toast('User rejected'); render();
        return;
      }
      if (action === 'admin-approve-claim') {
        await Api.approveClaim(el.dataset.id); toast('Claim approved'); render();
        return;
      }
      if (action === 'admin-reject-claim') {
        await Api.rejectClaim(el.dataset.id, 'Could not verify ownership.'); toast('Claim rejected'); render();
        return;
      }
      if (action === 'read-notif') {
        await Api.readNotification(el.dataset.id);
        render();
        return;
      }
      if (action === 'read-all-notif') {
        await Api.readAllNotifications();
        render();
        return;
      }
      if (action === 'open-claim-modal') {
        openClaimModal(el.dataset.id);
        return;
      }
      if (action === 'report-ai-enrich') {
        await enrichWizard();
        render();
        return;
      }
      if (action === 'admin-ai-test') {
        const inp = document.getElementById('adminAiTest');
        await runAiSearch(inp?.value || 'wallet engineering');
        render();
        return;
      }
    };
  });

  const loginForm = document.querySelector('[data-action="login-submit"]');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      try {
        const res = await Api.login({ username: fd.get('username'), password: fd.get('password') });
        Api.setToken(res.token);
        state.user = res.user;
        toast('Welcome back!');
        nav(res.user.role === 'admin' ? 'admin' : 'dashboard');
      } catch (err) { toast(err.message); }
    };
  }

  const regForm = document.querySelector('[data-action="register-submit"]');
  if (regForm) {
    regForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(regForm);
      if (fd.get('password') !== fd.get('password2')) return toast('Passwords do not match');
      if (!idPhotoData) return toast('Upload school ID photo');
      try {
        const res = await Api.signup({
          full_name: fd.get('full_name'),
          username: fd.get('username'),
          email: fd.get('email'),
          course: fd.get('course'),
          year_level: fd.get('year_level'),
          password: fd.get('password'),
          id_photo_data: idPhotoData,
          avatar_data: avatarData,
        });
        toast(res.message || 'Signup submitted');
        nav('login');
      } catch (err) { toast(err.message); }
    };
  }

  document.querySelectorAll('[data-action="id-upload"]').forEach((inp) => {
    inp.onchange = () => readFile(inp, (d) => { idPhotoData = d; });
  });
  document.querySelectorAll('[data-action="avatar-upload"],[data-action="avatar-upload-profile"]').forEach((inp) => {
    inp.onchange = () => readFile(inp, async (d) => {
      avatarData = d;
      if (inp.dataset.action === 'avatar-upload-profile' && isAuthed()) {
        try {
          state.user = await Api.updateProfile({ avatar_data: d });
          toast('Avatar updated');
          render();
        } catch (e) { toast(e.message); }
      }
    });
  });

  document.querySelectorAll('[data-action="report-photo"]').forEach((inp) => {
    inp.onchange = () => readFile(inp, (d) => { state.wizard.photo_data = d; toast('Photo attached'); });
  });

  const reportForm = document.querySelector('[data-action="report-submit"]');
  if (reportForm) {
    reportForm.onsubmit = async (e) => {
      e.preventDefault();
      if ((state.wizard.step || 1) < 5) {
        collectWizardFields();
        state.wizard.step = 5;
        render();
        return;
      }
      collectWizardFields();
      const type = reportForm.dataset.type;
      try {
        await Api.createItem({
          type,
          name: state.wizard.name,
          item_category: state.wizard.item_category,
          color: state.wizard.color,
          brand: state.wizard.brand,
          building: state.wizard.building,
          floor: state.wizard.floor,
          room: state.wizard.room,
          loc: state.wizard.loc,
          description: state.wizard.description,
          photo_data: state.wizard.photo_data || '',
          date_lost: state.wizard.date_lost,
          time_lost: state.wizard.time_lost,
          condition: state.wizard.condition,
          emoji: state.wizard.emoji || '📦',
        });
        state.wizard = { step: 1 };
        toast('Report submitted — pending admin review');
        nav('my-reports');
      } catch (err) { toast(err.message); }
    };
  }

  const profileForm = document.querySelector('[data-action="profile-save"]');
  if (profileForm) {
    profileForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(profileForm);
      try {
        state.user = await Api.updateProfile({
          full_name: fd.get('full_name'),
          email: fd.get('email'),
          course: fd.get('course'),
          year_level: fd.get('year_level'),
        });
        toast('Profile saved');
      } catch (err) { toast(err.message); }
    };
  }

  const gs = document.getElementById('globalSearch');
  if (gs) {
    gs.oninput = () => {
      state.filters.q = gs.value;
      if (parseRoute().path === 'browse') {
        document.getElementById('browseGrid').innerHTML = filterItems(state.items).map((i) => itemCard(i)).join('') || '<div class="empty-state"><p>No items</p></div>';
      }
    };
    gs.onkeydown = (ev) => {
      if (ev.key === 'Enter') { nav('browse'); state.filters.q = gs.value; render(); }
    };
  }

  ['browseSearch', 'filterType', 'filterCategory', 'filterBuilding', 'filterStatus', 'filterSort'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => {
      if (id === 'browseSearch') state.filters.q = el.value;
      if (id === 'filterType') state.filters.type = el.value;
      if (id === 'filterCategory') state.filters.category = el.value;
      if (id === 'filterBuilding') state.filters.building = el.value;
      if (id === 'filterStatus') state.filters.status = el.value;
      if (id === 'filterSort') state.filters.sort = el.value;
      const grid = document.getElementById('browseGrid');
      if (grid) grid.innerHTML = filterItems(state.items).map((i) => itemCard(i)).join('') || '<div class="empty-state"><p>No items</p></div>';
    };
    el.addEventListener(id === 'browseSearch' ? 'input' : 'change', handler);
  });
}

function collectWizardFields() {
  const form = document.querySelector('[data-action="report-submit"]');
  if (!form) return;
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) state.wizard[k] = v;
}

async function enrichWizard() {
  collectWizardFields();
  const type = state.reportType;
  try {
    if (isAuthed()) {
      const en = await Api.enrich({
        type,
        name: state.wizard.name,
        loc: state.wizard.loc,
        description: state.wizard.description,
      });
      state.wizard.name = en.name || state.wizard.name;
      state.wizard.loc = en.loc || state.wizard.loc;
      state.wizard.description = en.description || state.wizard.description;
      state.wizard.item_category = en.item_category || state.wizard.item_category;
      state.wizard.color = en.color || state.wizard.color;
      state.wizard.emoji = en.emoji;
    } else {
      const en = await Api.categorize(`${state.wizard.name} ${state.wizard.description}`);
      state.wizard.item_category = en.item_category;
      state.wizard.color = en.color;
    }
    const match = await Api.smartMatch({
      type,
      name: state.wizard.name,
      loc: state.wizard.loc,
      description: state.wizard.description,
    });
    state.wizard.aiMatches = match.matches || [];
    state.wizard.aiEnriched = true;
    toast('AI analysis complete');
  } catch (e) { toast(e.message); }
}

function openClaimModal(itemId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal glass">
    <h3 style="margin:0 0 12px">Claim Item</h3>
    <form id="claimForm">
      <div class="field"><label>Describe unique features</label><textarea name="description" required></textarea></div>
      <div class="field"><label>Upload proof photo</label><input type="file" accept="image/*" id="proofFile" required></div>
      <div class="field"><label>Student ID photo</label><input type="file" accept="image/*" id="claimIdFile"></div>
      <button type="submit" class="btn btn-primary btn-block">Submit Claim</button>
      <button type="button" class="btn btn-ghost btn-block" style="margin-top:8px" id="closeClaim">Cancel</button>
    </form>
  </div>`;
  document.body.appendChild(overlay);
  let proof = '';
  let idp = '';
  overlay.querySelector('#proofFile').onchange = (e) => readFile(e.target, (d) => { proof = d; });
  overlay.querySelector('#claimIdFile').onchange = (e) => readFile(e.target, (d) => { idp = d; });
  overlay.querySelector('#closeClaim').onclick = () => overlay.remove();
  overlay.querySelector('#claimForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!proof) return toast('Upload proof photo');
    try {
      await Api.submitClaim({ item_id: Number(itemId), description: new FormData(e.target).get('description'), proof_data: proof, id_photo_data: idp });
      toast('Claim submitted — pending verification');
      overlay.remove();
      nav('my-claims');
    } catch (err) { toast(err.message); }
  };
}

async function init() {
  Api.token = localStorage.getItem('ibalik_token') || '';
  try {
    const me = await Api.me();
    state.user = me.user;
  } catch (_) {
    state.user = null;
  }
  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/home';
  render();
}

init();

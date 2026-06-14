/**
 * iBALIK — PUP institutional UI views (all 20 modules)
 */
(function () {
  const A = () => window.__APP__;
  const esc = (v) => A().esc(v);
  const icon = (n, s) => window.icon(n, s);
  const state = () => A().state;

  function pupSeal(sm) {
    return `<img src="/images/pup-logo.png" alt="Polytechnic University of the Philippines" class="pup-seal${sm ? ' sm' : ''}" width="${sm ? 40 : 52}" height="${sm ? 40 : 52}">`;
  }

  function statusClass(st) {
    const s = String(st || '').toLowerCase();
    if (s === 'approved' || s === 'found') return 'status-found';
    if (s === 'pending') return 'status-pending';
    if (s === 'claimed') return 'status-claimed';
    if (s === 'matched') return 'status-matched';
    if (s === 'rejected' || s === 'closed') return 'status-closed';
    return 'status-archived';
  }

  function statusLabel(st) {
    const s = String(st || '').toLowerCase();
    if (s === 'approved' && state().currentItem?.type === 'found') return 'Found';
    if (s === 'approved') return 'Active';
    if (s === 'pending') return 'Pending Review';
    if (s === 'claimed') return 'Claimed';
    return st;
  }

  function itemThumb(item) {
    if (item.photo_data) return `<img src="${esc(item.photo_data)}" alt="">`;
    return `<span class="placeholder">${icon('image', 32)}</span>`;
  }

  function confClass(pct) {
    if (pct >= 90) return 'conf-high';
    if (pct >= 75) return 'conf-med';
    if (pct >= 50) return 'conf-blue';
    return 'conf-gray';
  }

  function matchTierLabel(pct) {
    if (pct >= 90) return 'Strong Match';
    if (pct >= 75) return 'Good Match';
    if (pct >= 50) return 'Possible Match';
    return 'Weak Match';
  }

  function browseGridCard(item) {
    const isFound = item.type === 'found';
    const badge = isFound ? 'FOUND' : 'LOST';
    const badgeCls = isFound ? 'browse-badge-found' : 'browse-badge-lost';
    const cat = item.item_category || 'General';
    const isResolved = item.status === 'claimed';
    const canClaim = item.status === 'approved';
    const claimBtn = canClaim
      ? `<button type="button" class="btn ${isFound ? 'btn-primary' : 'btn-outline'} btn-sm btn-block browse-claim-btn" data-action="open-claim-modal" data-id="${item.id}">${icon(isFound ? 'shield-check' : 'package-check', 14)} ${isFound ? 'Claim Item' : 'Mark Recovered'}</button>`
      : isResolved
        ? `<span class="browse-resolved-tag">${icon('check-circle', 14)} Resolved</span>`
        : '';
    return `<article class="browse-grid-card browse-grid-card-${isFound ? 'found' : 'lost'}">
      <div class="browse-grid-thumb">
        ${itemThumb(item)}
        <span class="browse-type-badge ${badgeCls}">${badge}</span>
        <button type="button" class="browse-save-btn" data-action="browse-save" data-id="${item.id}" aria-label="Save item">${icon('bookmark', 16)}</button>
      </div>
      <div class="browse-grid-body">
        ${item.code ? `<span class="browse-grid-code">${esc(item.code)}</span>` : ''}
        <h3 class="browse-grid-title">${esc(item.name)}</h3>
        <p class="browse-grid-meta">${icon('map-pin', 14)} ${esc(item.loc)}</p>
        <p class="browse-grid-meta">${icon('calendar', 14)} ${esc(item.date)}</p>
        <span class="browse-cat-tag">${esc(cat)}</span>
        ${claimBtn}
        <button type="button" class="browse-grid-link" data-action="open-item" data-id="${item.id}">View Details ${icon('arrow-right', 14)}</button>
      </div>
    </article>`;
  }

  function browseHero(activeCount, resolvedCount, recoveryRate) {
    return `<header class="browse-hero">
      <div class="browse-hero-content">
        <p class="browse-hero-kicker">PUP Parañaque · iBALIK</p>
        <h1 class="browse-hero-title">Browse Items</h1>
        <p class="browse-hero-desc">Search campus reports, claim found belongings, or review items already returned to their owners.</p>
        <div class="browse-hero-stats">
          <div class="browse-hero-stat"><strong>${activeCount}</strong><span>Active reports</span></div>
          <div class="browse-hero-stat"><strong>${resolvedCount}</strong><span>Resolved</span></div>
          <div class="browse-hero-stat"><strong>${recoveryRate}%</strong><span>Recovery rate</span></div>
        </div>
      </div>
      <div class="browse-hero-photo" aria-hidden="true"></div>
    </header>`;
  }

  function browseEmptyState(view, hasSearch) {
    const title = view === 'resolved'
      ? 'No resolved items yet'
      : hasSearch ? 'No matching items' : 'No active items right now';
    const desc = view === 'resolved'
      ? 'Items marked as claimed will appear here once owners are reunited with their belongings.'
      : hasSearch
        ? 'Try a different search term or switch to resolved items.'
        : 'New lost and found reports will show up here once submitted.';
    return `<div class="browse-empty">
      ${icon('package-search', 40)}
      <h3>${title}</h3>
      <p>${desc}</p>
      ${view === 'active' && !hasSearch ? `<button type="button" class="btn btn-primary btn-sm" data-action="nav" data-path="report-lost">${icon('file-plus', 16)} Report Lost Item</button>` : ''}
    </div>`;
  }

  function browseStatsStrip(s, itemCount, buildingCount) {
    const stats = [
      { icon: 'package', value: itemCount || s.active_reports || 0, label: 'Active Items', sub: 'Currently listed on the portal' },
      { icon: 'check-circle', value: s.items_returned || 0, label: 'Items Returned', sub: 'Successfully reunited with owners' },
      { icon: 'map-pin', value: buildingCount || 7, label: 'Buildings Covered', sub: 'Campus locations tracked' },
      { icon: 'trending-up', value: `${s.recovery_rate || 91}%`, label: 'Recovery Rate', sub: 'AI-assisted matches' },
    ];
    return `<details class="browse-stats-fold">
      <summary class="browse-stats-fold-head">${icon('bar-chart-3', 18)} <span>Campus statistics</span><span class="browse-stats-fold-hint">Click to expand</span></summary>
      <div class="browse-stats-row">${stats.map((st) => `
        <div class="browse-stat-card">
          <div class="browse-stat-icon">${icon(st.icon, 20)}</div>
          <div class="browse-stat-value">${st.value}</div>
          <div class="browse-stat-label">${st.label}</div>
          <div class="browse-stat-sub">${st.sub}</div>
        </div>`).join('')}</div>
    </details>`;
  }

  function browseCategoryPills(active) {
    const pills = [
      ['all', 'All Items'],
      ['Personal Items', 'Personal Items'],
      ['Accessories', 'Accessories'],
      ['Electronics', 'Electronics'],
      ['IDs/Documents', 'Documents'],
      ['Clothing', 'Clothing'],
      ['General', 'More'],
    ];
    return `<div class="browse-cat-pills">${pills.map(([val, label]) => `
      <button type="button" class="browse-cat-pill ${active === val ? 'active' : ''}" data-action="browse-cat-pill" data-cat="${esc(val)}">${esc(label)}</button>`).join('')}</div>`;
  }

  function browsePagination(page, totalPages) {
    if (totalPages <= 1) return '';
    const pages = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i);
    return `<nav class="browse-pagination" aria-label="Pagination">
      <button type="button" class="browse-page-btn" data-action="browse-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${icon('chevron-left', 18)}</button>
      ${pages.map((p) => `<button type="button" class="browse-page-num ${p === page ? 'active' : ''}" data-action="browse-page" data-page="${p}">${p}</button>`).join('')}
      ${totalPages > 5 ? `<span class="browse-page-ellipsis">…</span><button type="button" class="browse-page-num" data-action="browse-page" data-page="${totalPages}">${totalPages}</button>` : ''}
      <button type="button" class="browse-page-btn" data-action="browse-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>${icon('chevron-right', 18)}</button>
    </nav>`;
  }

  function browseCard(item) {
    return browseGridCard(item);
  }

  function recentItemCard(item) {
    const st = item.status === 'pending' ? 'pending' : 'found';
    const label = st === 'pending' ? 'Pending Claim' : 'Found';
    return `<article class="recent-item-card">
      <div class="recent-item-thumb">${itemThumb(item)}</div>
      <div class="recent-item-body">
        <span class="status ${statusClass(st === 'found' ? 'found' : 'pending')}">${label}</span>
        <div class="recent-item-title">${esc(item.name)}</div>
        <div class="recent-item-meta">${icon('map-pin', 13)} ${esc(item.loc)}</div>
        <div class="recent-item-meta">${icon('calendar', 13)} ${esc(item.date)}</div>
        <button type="button" class="btn btn-outline btn-sm btn-block recent-item-btn" data-action="open-item" data-id="${item.id}">View Details</button>
      </div>
    </article>`;
  }

  function portalHero() {
    return `<div class="portal-hero">
      <div class="portal-hero-content">
        <p class="portal-hero-kicker">Welcome to iBalik!</p>
        <p class="portal-hero-campus">PUP PARAÑAQUE</p>
        <h1 class="portal-hero-title">LOST &amp; FOUND PORTAL</h1>
        <p class="portal-hero-desc">Lost something? Found something? Submit a report in minutes and let iBALIK help reconnect owners with their belongings through AI-powered matching and campus verification.</p>
        <div class="portal-hero-actions">
          <button type="button" class="btn btn-primary" data-action="nav" data-path="report-lost">${icon('file-plus', 18)} Report Lost Item</button>
          <button type="button" class="btn btn-found-primary" data-action="nav" data-path="report-found">${icon('package', 18)} Report Found Item</button>
          <button type="button" class="btn btn-outline" data-action="nav" data-path="browse">${icon('search', 18)} Browse Items</button>
        </div>
      </div>
      <div class="portal-hero-photo" aria-hidden="true"></div>
    </div>`;
  }

  function portalStats(s) {
    const stats = [
      { icon: 'package', cls: 'stat-icon-maroon', value: s.items_returned || 412, label: 'Items Recovered', desc: 'Total items successfully returned to owners' },
      { icon: 'clipboard-list', cls: 'stat-icon-gold', value: s.active_cases || s.active_reports || 36, label: 'Active Cases', desc: 'Currently pending verification' },
      { icon: 'trending-up', cls: 'stat-icon-green', value: `${s.recovery_rate || 92}%`, label: 'Recovery Rate', desc: 'Successfully returned items' },
      { icon: 'clock', cls: 'stat-icon-brown', value: `${s.avg_resolution_days || 3.2} Days`, label: 'Avg. Resolution Time', desc: 'Average time to return an item' },
    ];
    return `<div class="stats-row stats-row-rich">${stats.map((st) => `
      <div class="stat-card stat-card-rich">
        <div class="stat-icon ${st.cls}">${icon(st.icon, 22)}</div>
        <div class="stat-card-body">
          <div class="stat-card-value">${st.value}</div>
          <div class="stat-card-label">${st.label}</div>
          <div class="stat-card-desc">${st.desc}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  function portalHowItWorks() {
    const steps = [
      { n: 1, ic: 'file-text', title: 'Report Item', desc: 'Submit lost or found report' },
      { n: 2, ic: 'cpu', title: 'AI Match', desc: 'System compares reports' },
      { n: 3, ic: 'shield-check', title: 'Verify Ownership', desc: 'Admin reviews claim' },
      { n: 4, ic: 'package-check', title: 'Claim Item', desc: 'Recover at L&amp;F office' },
    ];
    return `<div class="how-it-works">
      <h2 class="section-label">HOW IT WORKS</h2>
      <div class="how-steps">${steps.map((st, i) => `
        <div class="how-step">
          <div class="how-step-icon">${icon(st.ic, 28)}</div>
          <div class="how-step-num">${st.n}</div>
          <strong>${st.title}</strong>
          <span>${st.desc}</span>
        </div>${i < steps.length - 1 ? '<div class="how-step-arrow">→</div>' : ''}`).join('')}
      </div>
    </div>`;
  }

  function portalRecentItems(items) {
    return `<div class="recent-panel">
      <div class="section-head section-head-tight">
        <h2 class="section-label" style="margin:0">RECENTLY FOUND ITEMS</h2>
        <a href="#/browse" class="view-all-link" data-action="nav" data-path="browse">View All ${icon('arrow-right', 16)}</a>
      </div>
      <div class="recent-items-row">${items.length
    ? items.map(recentItemCard).join('')
    : '<div class="empty-state">No items listed yet.</div>'}</div>
    </div>`;
  }

  function pubHeader() {
    const authed = A().isAuthed();
    return `<header class="pub-header">
      <a href="#/home" class="brand" data-action="nav" data-path="home">
        ${pupSeal()}
        <span class="brand-text"><span class="brand-title">iBALIK</span><span class="brand-sub">PUP Parañaque Lost &amp; Found Portal</span></span>
      </a>
      <button type="button" class="pub-menu-toggle" data-action="toggle-pub-nav" aria-expanded="false" aria-label="Open navigation menu">${icon('menu', 22)}</button>
      <nav class="nav-links pub-nav-links" aria-label="Main navigation">
        <a href="#/browse" data-action="nav" data-path="browse">Browse Items</a>
        <a href="#/office" data-action="nav" data-path="office">Lost &amp; Found Office</a>
        <a href="#/faq" data-action="nav" data-path="faq">Help</a>
        ${authed
      ? `<button type="button" class="btn btn-soft btn-sm" data-action="nav" data-path="${A().isAdmin() ? 'admin' : 'dashboard'}">Portal</button>
           <button type="button" class="btn btn-outline btn-sm" data-action="logout">Logout</button>`
      : `<button type="button" class="btn btn-ghost btn-sm" data-action="nav" data-path="login">Login</button>
           <button type="button" class="btn btn-primary btn-sm" data-action="nav" data-path="register">Register</button>`}
      </nav>
    </header>`;
  }

  function siteFooter() {
    return `<footer class="site-footer">
      <div class="footer-inner">
        <div>
          ${pupSeal(true)}
          <p style="margin-top:12px;font-size:14px;color:rgba(255,255,255,.9)"><strong>iBALIK</strong> Lost and Found System</p>
          <p style="font-size:13px">Polytechnic University of the Philippines<br>Parañaque Campus</p>
        </div>
        <div><h4>Office of Student Affairs</h4><a href="#/office" data-action="nav" data-path="office">Office Location</a><a href="#/faq" data-action="nav" data-path="faq">FAQ</a></div>
        <div><h4>Legal</h4><a href="#/faq">Privacy Policy</a><a href="#/faq">Terms of Use</a></div>
        <div><h4>Contact</h4><p>lostfound@pup.edu.ph</p><p>Campus Security Desk</p></div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Polytechnic University of the Philippines — Parañaque Campus</div>
    </footer>`;
  }

  function shellWrap(content, active) {
    const path = A().parseRoute().path;
    if (!A().isAuthed() && A().guestPublicPaths().includes(path)) {
      return `${pubHeader()}<main class="public-page">${content}</main>${siteFooter()}`;
    }
    return appShell(content, active);
  }

  function sidebarNav(active) {
    const unread = state().notifications.filter((n) => !n.is_read).length;
    const tracker = state().tracker || {};
    const pendingReports = tracker.pending_items || (state().pendingItems || []).length;
    const pendingClaims = tracker.pending_claims || (state().pendingClaims || []).length;
    const links = A().isAdmin() ? [
      ['admin', 'Dashboard', 'layout-dashboard'],
      ['admin/reports', 'Reports', 'clipboard-list', pendingReports || undefined],
      ['admin/claims', 'Claims', 'shield-check', pendingClaims || undefined],
      ['admin/users', 'Users', 'users'],
      ['admin/ai', 'AI Matches', 'git-compare'],
      ...(unread > 0 ? [['notifications', 'Notifications', 'bell', unread]] : []),
      ['admin/more', 'More', 'more-horizontal'],
    ] : [
      ['dashboard', 'Home', 'home'],
      ['browse', 'Browse Items', 'search'],
      ['ai-search', 'AI Match Results', 'git-compare', (() => { const n = (state().userMatches || []).filter((m) => m.status !== 'dismissed').length; return n > 0 ? n : undefined; })()],
      ['report-lost', 'Report Lost Item', 'file-plus'],
      ['report-found', 'Report Found Item', 'package-check'],
      null,
      ['my-reports', 'My Reports', 'clipboard-list'],
      ['my-claims', 'My Claims', 'shield-check'],
      ['notifications', 'Notifications', 'bell', unread],
      ['profile', 'Profile Settings', 'user'],
      ['faq', 'FAQ / Help Center', 'help-circle'],
      ['office', 'Contact Us', 'phone'],
    ];
    return `<aside class="sidebar">
      <div class="sidebar-brand">
        ${pupSeal(true)}
        <span><span class="brand-title" style="font-size:16px">iBALIK</span><span class="brand-sub sidebar-brand-sub">PUP Parañaque Lost and Found System</span></span>
      </div>
      <nav class="sidebar-nav">
        ${links.map((entry) => {
    if (!entry) return '<div class="sidebar-divider"></div>';
    const [p, label, ic, badge] = entry;
    const isActive = active === p || (p === 'admin/more' && ['admin/more', 'admin/analytics', 'admin/audit', 'admin/settings'].includes(active));
    return `<button type="button" class="nav-item ${isActive ? 'active' : ''}" data-action="nav" data-path="${p}">
            ${icon(ic, 18)} ${label}${badge ? `<span class="badge-count">${badge}</span>` : ''}
          </button>`;
  }).join('')}
      </nav>
      <button type="button" class="nav-item nav-item-logout" data-action="logout">${icon('log-out', 18)} Logout</button>
    </aside>`;
  }

  function appShell(content, active) {
    const u = state().user;
    const unread = state().notifications.filter((n) => !n.is_read).length;
    const roleLabel = u?.role === 'admin' ? 'Administrator' : 'Student';
    return `<div class="app-shell">
      ${sidebarNav(active)}
      <div class="main-wrap">
        <header class="topbar topbar-maroon">
          <div class="topbar-brand">
            ${pupSeal(true)}
            <span class="topbar-portal-title">PUP PARAÑAQUE LOST AND FOUND PORTAL</span>
          </div>
          <div class="topbar-actions">
            <button type="button" class="topbar-icon-btn" data-action="nav" data-path="notifications" aria-label="Notifications">
              ${icon('bell', 20)}
              ${unread ? `<span class="topbar-badge">${unread}</span>` : ''}
            </button>
            <button type="button" class="topbar-user" data-action="nav" data-path="profile">
              <span class="topbar-avatar">${u?.avatar_data ? `<img src="${esc(u.avatar_data)}" alt="">` : icon('user', 18)}</span>
              <span class="topbar-user-meta">
                <span class="topbar-user-name">${esc(u?.full_name || u?.username || 'Account')}</span>
                <span class="topbar-user-role">${roleLabel}</span>
              </span>
              ${icon('chevron-down', 16)}
            </button>
          </div>
        </header>
        <main class="page page-dashboard${active === 'admin/reports' ? ' page-admin-reports' : ''}">${content}</main>
      </div>
    </div>`;
  }

  function viewHome() {
    const s = state().stats || {};
    const items = (state().items || []).filter((i) => i.type === 'found' && i.status === 'approved').slice(0, 4);
    return `${pubHeader()}
    <main class="public-page">
      ${portalHero()}
      ${portalStats(s)}
      <div class="dashboard-split">
        ${portalHowItWorks()}
        ${portalRecentItems(items)}
      </div>
    </main>${siteFooter()}`;
  }

  function browseToolbar(filteredCount) {
    const st = state();
    const view = st.browseView || 'active';
    const activeCount = st.items.filter((i) => i.status === 'approved').length;
    const resolvedCount = st.items.filter((i) => i.status === 'claimed').length;
    return `<div class="browse-toolbar">
      <div class="browse-search-wrap">
        ${icon('search', 16)}
        <input type="search" id="browseMainSearch" class="browse-search-input" value="${esc(st.browseSearch || '')}" placeholder="Search items…" aria-label="Search items">
      </div>
      <div class="browse-view-tabs" role="tablist" aria-label="Item status">
        <button type="button" role="tab" class="browse-view-tab${view === 'active' ? ' is-active' : ''}" data-action="set-browse-view" data-view="active" aria-selected="${view === 'active'}">Active <span class="browse-view-count">${activeCount}</span></button>
        <button type="button" role="tab" class="browse-view-tab${view === 'resolved' ? ' is-active' : ''}" data-action="set-browse-view" data-view="resolved" aria-selected="${view === 'resolved'}">Resolved <span class="browse-view-count">${resolvedCount}</span></button>
      </div>
      <span class="browse-result-count">${filteredCount} item${filteredCount === 1 ? '' : 's'}</span>
    </div>`;
  }

  function viewBrowse() {
    const st = state();
    const s = st.stats || {};
    const view = st.browseView || 'active';
    const filtered = A().filterItems(st.items);
    const activePool = st.items.filter((i) => i.status === 'approved');
    const PAGE_SIZE = 12;
    const page = st.browsePage || 1;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const body = `
      <div class="browse-page">
        ${browseHero(activePool.length, st.items.filter((i) => i.status === 'claimed').length, s.recovery_rate || 91)}

        <section class="browse-content-panel">
          ${browseToolbar(filtered.length)}

          <div class="browse-grid" id="browseGrid">${pageItems.length
    ? pageItems.map(browseGridCard).join('')
    : browseEmptyState(view, Boolean(st.browseSearch))}</div>

          ${browsePagination(safePage, totalPages)}
        </section>
      </div>`;
    return shellWrap(body, 'browse');
  }

  function viewLogin() {
    return `${pubHeader()}
    <div class="auth-page">
      <div class="auth-visual">
        ${pupSeal()}
        <h1 style="margin:16px 0 12px;font-size:28px">iBALIK Portal</h1>
        <p style="opacity:.9;max-width:360px;line-height:1.65">Sign in with your PUP credentials to report items, submit claims, and track verification status.</p>
      </div>
      <div class="auth-form-wrap">
        <form class="auth-card" data-action="login-submit">
          <h2 style="margin:0 0 8px;color:var(--pup-maroon)">Login</h2>
          <p class="muted" style="margin:0 0 20px">Student or administrator account</p>
          <div class="field"><label>Student Number / Admin ID</label><input name="username" required placeholder="2021-00001-PQ-0"></div>
          <div class="field"><label>Password</label><input name="password" type="password" required></div>
          <button type="submit" class="btn btn-primary btn-block">Sign In</button>
          <button type="button" class="btn btn-ghost btn-block" style="margin-top:10px" data-action="nav" data-path="home">Continue as Guest</button>
          <p class="muted" style="text-align:center;margin-top:16px;font-size:12px">Demo: student <code>2021-00001-PQ-0</code> · admin <code>admin</code> · password <code>password</code></p>
        </form>
      </div>
    </div>`;
  }

  function viewRegister() {
    return `${pubHeader()}
    <div class="auth-page">
      <div class="auth-visual"><h1 style="margin:0 0 12px">Student Registration</h1><p style="opacity:.9">Register with a valid PUP student ID for verification by the Office of Student Affairs.</p></div>
      <div class="auth-form-wrap">
        <form class="auth-card" data-action="register-submit" style="max-width:440px">
          <h2 style="margin:0 0 20px;color:var(--pup-maroon)">Create Account</h2>
          <div class="field"><label>Full Name</label><input name="full_name" required></div>
          <div class="field"><label>Student Number</label><input name="username" required></div>
          <div class="field"><label>PUP Email</label><input name="email" type="email"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="field"><label>Course</label><input name="course"></div>
            <div class="field"><label>Year Level</label><select name="year_level"><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></div>
          </div>
          <div class="field"><label>Password</label><input name="password" type="password" required minlength="6"></div>
          <div class="field"><label>Confirm Password</label><input name="password2" type="password" required></div>
          <div class="field"><label>Upload School ID (required)</label><input type="file" accept="image/*" data-action="id-upload" required></div>
          <button type="submit" class="btn btn-primary btn-block">Submit Registration</button>
        </form>
      </div>
    </div>`;
  }

  function viewDashboard() {
    const s = state().stats || {};
    const found = state().items.filter((i) => i.type === 'found' && i.status === 'approved').slice(0, 4);
    return appShell(`
      ${portalHero()}
      ${portalStats(s)}
      <div class="dashboard-split">
        ${portalHowItWorks()}
        ${portalRecentItems(found)}
      </div>
    `, 'dashboard');
  }

  function viewAiSearch() {
    const matches = (state().userMatches || []).filter((m) => m.status !== 'dismissed' && m.status !== 'rejected');
    const strong = matches.filter((m) => (m.match_score || m.confidence_pct) >= 75).length;
    const inner = `
      <button type="button" class="btn btn-soft btn-sm" data-action="nav" data-path="dashboard" style="margin-bottom:16px">${icon('arrow-left', 16)} Back to Dashboard</button>
      ${matches.length ? `<div class="match-alert-banner">${icon('check-circle', 20)} We found possible matches for your lost item! Here are the most relevant matches based on our AI analysis.</div>` : ''}
      <h1 class="page-title">AI Match Results</h1>
      <p class="page-sub">${matches.length ? `${matches.length} possible match(es) found` : 'No saved matches yet. Submit a lost item report to run smart matching.'}${strong ? ` · ${strong} strong match(es)` : ''}</p>
      <div class="user-match-list">
        ${matches.length ? matches.map((m) => userMatchCard(m)).join('') : '<div class="empty-state">No matches yet. Report a lost item with a photo to enable AI matching.</div>'}
      </div>
      <p class="muted" style="margin-top:24px;font-size:14px">Can't find your item? <button type="button" class="btn btn-ghost btn-sm" data-action="nav" data-path="report-lost" style="color:var(--pup-maroon);font-weight:600">Report Again</button></p>`;
    return shellWrap(inner, 'ai-search');
  }

  function userMatchCard(m) {
    const pct = m.match_score || m.confidence_pct || 0;
    const found = m.found_item || m;
    const photo = found.photo_data || m.photo_data;
    const loc = found.loc || m.loc || '';
    const date = found.date || m.date || '';
    const time = found.time_lost || '';
    return `<article class="user-match-card">
      <div class="user-match-thumb">${photo ? `<img src="${esc(photo)}" alt="">` : icon('image', 32)}</div>
      <div class="user-match-body">
        <h3>${esc(found.name || m.found_name || m.name)}</h3>
        <p class="muted" style="font-size:13px;margin:6px 0">${icon('map-pin', 14)} Found in ${esc(loc)}</p>
        <p class="muted" style="font-size:13px">${icon('calendar', 14)} ${esc(date)}${time ? ` · ${esc(time)}` : ''}</p>
        <div class="user-match-reason"><strong>Why it matches:</strong> ${esc(m.match_reason || m.reason || '')}</div>
        <div class="user-match-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="open-item" data-id="${found.id || m.found_report_id || m.item_id}">View Details</button>
          <button type="button" class="btn btn-outline btn-sm" data-action="claim-item" data-id="${found.id || m.found_report_id || m.item_id}">Claim This Item</button>
        </div>
      </div>
      <div class="user-match-score">
        <div class="${confClass(pct)} user-match-pct">${pct}%</div>
        <div class="user-match-tier">${esc(m.confidence_label || matchTierLabel(pct))}</div>
      </div>
    </article>`;
  }

  function cleanAiDesc(text) {
    return String(text || '').replace(/\s*Add unique details in the description field\.?\s*/gi, '').trim();
  }

  function aiAnalysisPanel(analysis) {
    if (!analysis) return '';
    const a = analysis;
    const tags = (a.ai_tags || []).map((t) => `<span class="ai-tag">${esc(t)}</span>`).join('');
    const conf = a.confidence || {};
    const desc = cleanAiDesc(a.ai_description || a.description);
    const fact = (label, value) => `<div class="ai-fact-row"><span class="ai-fact-label">${label}</span><strong class="ai-fact-value">${esc(value || 'Unknown')}</strong></div>`;
    return `<div class="ai-analysis-card">
      <div class="ai-analysis-head">
        <span class="ai-analysis-title">${icon('sparkles', 18)} AI Analysis Results</span>
        <span class="ai-conf-badge">AI Confidence ${a.ai_confidence_score || 85}%</span>
      </div>
      <div class="ai-analysis-body">
        <div class="ai-analysis-facts">
          ${fact('Detected Item', a.name)}
          ${fact('Category', a.item_category || a.ai_detected_category)}
          ${fact('Colors', a.color || a.ai_detected_colors)}
          ${fact('Material', a.material)}
          ${fact('Brand', a.brand)}
        </div>
        <div class="ai-analysis-desc">
          <span class="ai-fact-label">Description</span>
          <p class="ai-desc-text">${esc(desc)}</p>
          ${tags ? `<span class="ai-fact-label">Tags</span><div class="ai-tags">${tags}</div>` : ''}
        </div>
        <div class="ai-analysis-confidence">
          ${aiProgressBar('Item Detection', conf.item_detection || 90)}
          ${aiProgressBar('Category Detection', conf.category_detection || 88)}
          ${aiProgressBar('Color Detection', conf.color_detection || 85)}
        </div>
      </div>
      <div class="ai-analysis-actions">
        <button type="button" class="btn btn-outline btn-sm" data-action="regenerate-ai">Regenerate Analysis</button>
        <button type="button" class="btn btn-primary btn-sm" data-action="use-ai-suggestions">Use AI Suggestions</button>
      </div>
    </div>`;
  }

  function formatDetailDate(item) {
    if (item.created_at) {
      return new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return item.date || '—';
  }

  function galleryViews(item) {
    const src = item.photo_data || '';
    if (!src) return [];
    return [
      { pos: '50% 50%', label: 'Front view' },
      { pos: '50% 20%', label: 'Top detail' },
      { pos: '50% 80%', label: 'Bottom detail' },
      { pos: '75% 50%', label: 'Side detail' },
    ].map((v) => ({ ...v, src }));
  }

  function aiSimilarityBreakdown(item, matches) {
    const top = matches[0];
    const base = top ? top.confidence_pct : 0;
    const jitter = (n) => Math.min(99, Math.max(45, Math.round(base + n)));
    return {
      overall: base,
      color: jitter(5),
      category: jitter(10),
      location: jitter(-3),
      description: jitter(2),
      topMatch: top || null,
    };
  }

  function itemTimeline(item) {
    const foundDate = formatDetailDate(item);
    const d = item.created_at ? new Date(item.created_at) : new Date();
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    const storedDate = nextDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (item.type === 'found') {
      return [
        { date: foundDate, title: 'Item Found', desc: `Located at ${item.loc}` },
        { date: foundDate, title: 'Submitted to System', desc: 'Report logged in iBALIK portal' },
        { date: foundDate, title: 'Approved by Admin', desc: 'Verified and published for matching' },
        { date: storedDate, title: 'Stored in Lost & Found Office', desc: 'Secured at campus L&F office' },
      ];
    }
    return [
      { date: foundDate, title: 'Report Submitted', desc: 'Lost item report received' },
      { date: foundDate, title: 'AI Matching Active', desc: 'System scanning found item database' },
      { date: storedDate, title: 'Under Review', desc: 'Campus staff monitoring potential matches' },
    ];
  }

  function campusMapHtml(building) {
    const spots = [
      { name: 'Engineering Building', x: 68, y: 38 },
      { name: 'Library', x: 28, y: 52 },
      { name: 'Canteen', x: 48, y: 62 },
      { name: 'Gymnasium', x: 78, y: 58 },
      { name: 'Registrar', x: 38, y: 28 },
      { name: 'New Building', x: 58, y: 42 },
      { name: 'Old Building', x: 42, y: 48 },
    ];
    const active = spots.find((s) => s.name === building) || spots[0];
    return `<div class="campus-map" aria-label="Campus map">
      <div class="campus-map-grid">
        ${spots.map((s) => `<div class="campus-map-block${s.name === active.name ? ' active' : ''}" style="left:${s.x}%;top:${s.y}%">${esc(s.name.split(' ')[0])}</div>`).join('')}
        <div class="campus-map-pin" style="left:${active.x}%;top:${active.y}%">${icon('map-pin', 18)}</div>
      </div>
      <p class="campus-map-caption">${icon('map-pin', 14)} ${esc(building || 'Campus')}</p>
    </div>`;
  }

  function metaField(label, value) {
    return `<div class="meta-field"><span class="meta-field-label">${label}</span><span class="meta-field-value">${esc(value || '—')}</span></div>`;
  }

  function aiProgressBar(label, pct) {
    return `<div class="ai-bar-row">
      <div class="ai-bar-head"><span>${label}</span><strong>${pct}%</strong></div>
      <div class="ai-bar-track"><div class="ai-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function relatedReportCard(m) {
    return `<article class="related-report-card">
      <div class="related-report-head">
        <span class="${confClass(m.confidence_pct)}">${m.confidence_pct}% Match</span>
        <span class="muted" style="font-size:12px">${esc(m.date || '')}</span>
      </div>
      <strong>${esc(m.name)}</strong>
      <p class="muted" style="font-size:13px;margin:6px 0">${icon('map-pin', 13)} ${esc(m.loc)}</p>
      <button type="button" class="btn btn-outline btn-sm" data-action="open-item" data-id="${m.item_id}">View Report</button>
    </article>`;
  }

  function itemDetailSection(title, iconName, content, opts = {}) {
    const open = opts.open ? ' open' : '';
    const badge = opts.badge ? `<span class="item-section-badge">${esc(opts.badge)}</span>` : '';
    return `<details class="item-detail-section"${open}>
      <summary class="item-detail-section-head">${icon(iconName, 18)} <span>${esc(title)}</span>${badge}</summary>
      <div class="item-detail-section-body">${content}</div>
    </details>`;
  }

  function itemAdminStatusLabel(status) {
    const labels = { pending: 'Pending Review', approved: 'Active', rejected: 'Rejected', claimed: 'Claimed' };
    return labels[status] || status;
  }

  function itemAdminActionButtons(item, btnClass = 'btn-sm') {
    return `
      ${item.status === 'pending' ? `<button type="button" class="btn btn-primary ${btnClass}" data-action="admin-approve-item" data-id="${item.id}">${icon('check-circle', btnClass.includes('lg') ? 18 : 16)} Approve</button>` : ''}
      ${item.status === 'pending' ? `<button type="button" class="btn btn-soft ${btnClass}" data-action="admin-reject-item" data-id="${item.id}">${icon('x-circle', btnClass.includes('lg') ? 18 : 16)} Reject</button>` : ''}
      ${item.status === 'approved' ? `<button type="button" class="btn btn-soft ${btnClass}" data-action="admin-claim-item" data-id="${item.id}" data-type="${esc(item.type)}">${icon('package-check', btnClass.includes('lg') ? 18 : 16)} Mark Claimed</button>` : ''}
      <button type="button" class="btn btn-danger ${btnClass}" data-action="admin-delete-item" data-id="${item.id}" data-name="${esc(item.name)}">${icon('trash-2', btnClass.includes('lg') ? 18 : 16)} Delete</button>
      <button type="button" class="btn btn-outline ${btnClass}" data-action="nav" data-path="admin/reports">${icon('clipboard-list', btnClass.includes('lg') ? 18 : 16)} All Reports</button>`;
  }

  function itemDetailPhoto(item, gallery) {
    if (!gallery.length) {
      return `<div class="detail-gallery-main detail-gallery-empty">${icon('image', 36)}<span>No photo uploaded</span></div>`;
    }
    return `<button type="button" class="detail-gallery-main" data-action="gallery-lightbox" data-src="${esc(gallery[0].src)}" aria-label="Open photo">
      <img id="detailMainImg" src="${esc(gallery[0].src)}" alt="${esc(item.name)}" style="object-position:${gallery[0].pos}">
    </button>`;
  }

  function itemDetailActionsBar(item, opts) {
    const { isAdmin, primaryBtn, secondaryActions, showShare } = opts;
    if (isAdmin) {
      return `<footer class="item-detail-actions-bar item-detail-actions-admin">
        <div class="item-detail-actions-label">
          <span class="item-admin-status item-admin-status-${esc(item.status)}">${esc(itemAdminStatusLabel(item.status))}</span>
          <span class="muted">Admin actions</span>
        </div>
        <div class="item-detail-actions-buttons">${itemAdminActionButtons(item, 'btn-sm')}</div>
      </footer>`;
    }
    if (!primaryBtn && !secondaryActions && !showShare) return '';
    return `<footer class="item-detail-actions-bar">
      ${primaryBtn ? `<div class="item-detail-actions-primary">${primaryBtn}</div>` : ''}
      <div class="item-detail-actions-secondary">
        ${secondaryActions || ''}
        ${showShare ? `<button type="button" class="btn btn-soft btn-sm" data-action="share-item">${icon('share-2', 16)} Share</button>` : ''}
      </div>
    </footer>`;
  }

  function viewItemDetail() {
    const item = state().currentItem;
    if (!item) return shellWrap('<div class="empty-state">Loading…</div>', 'browse');
    const matches = state().matches || [];
    const similar = matches.filter((m) => m.item_id !== item.id).slice(0, 4);
    const topMatch = matches[0];
    const ai = aiSimilarityBreakdown(item, matches);
    const gallery = galleryViews(item);
    const isFound = item.type === 'found';
    const isClaimable = item.status === 'approved';
    const timeline = itemTimeline(item);
    const dateLabel = isFound ? 'Date Found' : 'Date Lost';
    const locationLine = [item.building, item.floor, item.room].filter(Boolean).join(' · ') || item.loc;

    const statusPill = isFound && item.status === 'approved'
      ? `<span class="item-hero-status item-hero-status-found">${icon('check-circle', 16)} Available for claim</span>`
      : isFound
        ? `<span class="item-hero-status item-hero-status-pending">${icon('clock', 16)} Pending verification</span>`
        : item.status === 'approved'
          ? `<span class="item-hero-status item-hero-status-lost">${icon('search', 16)} Active lost report — mark recovered when found</span>`
          : `<span class="item-hero-status item-hero-status-lost">${icon('search', 16)} Lost item report</span>`;

    const galleryMain = itemDetailPhoto(item, gallery);

    const isAdmin = A().isAdmin();

    const primaryBtn = isAdmin
      ? ''
      : isClaimable
        ? `<button type="button" class="btn btn-primary" data-action="open-claim-modal" data-id="${item.id}">${icon('shield-check', 18)} ${isFound ? 'Claim This Item' : 'Mark as Recovered'}</button>`
        : `<button type="button" class="btn btn-primary" data-action="nav" data-path="${isFound ? 'report-found' : 'report-lost'}">${icon('file-plus', 18)} Report Similar Item</button>`;

    const secondaryActions = isAdmin
      ? ''
      : isClaimable
        ? `<button type="button" class="btn btn-outline btn-sm" data-action="nav" data-path="report-lost">${icon('file-plus', 16)} Report Similar</button>`
        : '';

    const aiSectionContent = `
      ${topMatch ? `<div class="item-match-inline">
        <strong>${topMatch.confidence_pct}% potential match</strong>
        <span>Similar to <em>${esc(topMatch.name)}</em>${topMatch.code ? ` (${esc(topMatch.code)})` : ''}</span>
      </div>` : ''}
      <p class="muted" style="font-size:13px;margin:0 0 16px">${ai.overall
    ? `Match confidence against active ${isFound ? 'lost' : 'found'} reports`
    : 'Analysis based on item attributes and campus report patterns'}</p>
      ${aiProgressBar('Color Match', ai.color)}
      ${aiProgressBar('Category Match', ai.category)}
      ${aiProgressBar('Location Match', ai.location)}
      ${aiProgressBar('Description Match', ai.description)}
      <div class="related-reports-grid" style="margin-top:20px">${similar.length
    ? similar.map(relatedReportCard).join('')
    : '<p class="muted" style="font-size:13px;margin:0">No related reports identified yet.</p>'}</div>`;

    const claimHelpContent = `
      <ol class="item-claim-steps">
        <li>Bring your valid PUP School ID</li>
        <li>Describe unique item contents and features</li>
        <li>Visit the Lost &amp; Found Office during office hours</li>
        <li>Wait for staff verification before release</li>
      </ol>
      <p class="muted" style="font-size:13px;margin:12px 0 0">${icon('lock', 14)} Certain identifying details are hidden until ownership is verified.</p>`;

    const locationContent = `
      <p class="item-loc-text">${icon('map-pin', 16)} ${esc(item.loc)}</p>
      ${campusMapHtml(item.building)}
      <div class="context-rows" style="margin-top:16px">
        <div><span>Campus area</span><strong>${esc(locationLine)}</strong></div>
        ${isFound ? `<div><span>Stored at</span><strong>${esc(item.holder || 'Lost & Found Office')}</strong></div>` : ''}
      </div>`;

    const timelineContent = `<ol class="item-timeline">${timeline.map((ev) => `
      <li><span class="item-timeline-date">${esc(ev.date)}</span><strong>${esc(ev.title)}</strong><span>${esc(ev.desc)}</span></li>`).join('')}
    </ol>`;

    const officeContent = `
      <p><strong>PUP Parañaque Campus — Lost &amp; Found Office</strong></p>
      <p class="muted">Mon – Fri · 8:00 AM – 5:00 PM</p>
      <p class="muted">Phone: <a href="tel:09123456789">09123456789</a></p>
      <p class="muted">Email: <a href="mailto:lostfound@pup.edu.ph">lostfound@pup.edu.ph</a></p>`;

    const sections = [
      isClaimable && !isAdmin ? itemDetailSection('How to Claim', 'clipboard-check', claimHelpContent) : '',
      itemDetailSection('Location & Map', 'map-pin', locationContent),
      itemDetailSection('Timeline & History', 'history', timelineContent),
      itemDetailSection('AI & Related Reports', 'sparkles', aiSectionContent, {
        badge: topMatch ? `${topMatch.confidence_pct}%` : undefined,
      }),
      itemDetailSection('Lost & Found Office', 'building-2', officeContent),
    ].filter(Boolean).join('');

    const body = `
      <div class="item-detail-page item-detail-focused">
        <div class="item-detail-header">
          <button type="button" class="btn btn-soft btn-sm item-detail-back" data-action="nav" data-path="${isAdmin ? 'admin/reports' : 'browse'}">${icon('arrow-left', 16)} ${isAdmin ? 'Back to Reports' : 'Back to Browse'}</button>
        </div>

        <article class="item-detail-card">
          <div class="item-detail-hero">
            <div class="item-detail-media">${galleryMain}</div>
            <div class="item-detail-main">
              ${statusPill}
              <h1 class="item-detail-title">${esc(item.name)}</h1>
              <p class="item-detail-sub">${esc(item.item_category || 'General')}${item.color ? ` · ${esc(item.color)}` : ''}${item.brand && item.brand !== 'Unknown' ? ` · ${esc(item.brand)}` : ''}</p>
              <dl class="item-essentials">
                <div><dt>${icon('map-pin', 15)} Location</dt><dd>${esc(item.loc)}${item.building ? `<small>${esc(locationLine)}</small>` : ''}</dd></div>
                <div><dt>${icon('calendar', 15)} ${dateLabel}</dt><dd>${esc(formatDetailDate(item))}</dd></div>
                <div><dt>${icon('tag', 15)} Report ID</dt><dd>${esc(item.code || `#${item.id}`)}</dd></div>
              </dl>
              ${item.description ? `<p class="item-detail-desc">${esc(item.description)}</p>` : ''}
            </div>
          </div>
          ${itemDetailActionsBar(item, { isAdmin, primaryBtn, secondaryActions, showShare: !isAdmin })}
        </article>

        <div class="item-detail-sections">${sections}</div>
      </div>`;
    return shellWrap(body, 'browse');
  }

  function reportShell(content, type) {
    const active = type === 'found' ? 'report-found' : 'report-lost';
    if (A().isAuthed()) return appShell(content, active);
    return `${pubHeader()}<main class="public-page page-report">${content}</main>${siteFooter()}`;
  }

  function guestReporterFields(w) {
    if (A().isAuthed()) return '';
    return `<div class="report-guest-fields">
      <h3 class="report-guest-title">Your Contact Information</h3>
      <p class="muted report-guest-note">No account required. We'll email you a confirmation and tracking link.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field" style="grid-column:1/-1"><label>Full Name</label><input name="reporter_name" value="${esc(w.reporter_name || '')}" required placeholder="Juan Dela Cruz"></div>
        <div class="field"><label>Email Address</label><input name="reporter_email" type="email" value="${esc(w.reporter_email || '')}" required placeholder="you@iskolarngbayan.pup.edu.ph"></div>
        <div class="field"><label>Contact Number</label><input name="reporter_phone" value="${esc(w.reporter_phone || '')}" placeholder="09123456789" maxlength="11" inputmode="numeric" pattern="[0-9]{11}"></div>
      </div>
    </div>`;
  }

  function viewTrack() {
    const r = state().trackReport;
    const { id } = A().parseRoute();
    if (!r) {
      return shellWrap(`<div class="empty-state" style="padding:48px">
        <h2 style="color:var(--pup-maroon)">Report Not Found</h2>
        <p class="muted">No report matches <code>${esc(id || '')}</code>. If you just submitted, wait a moment and try again.</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" data-action="retry-track">Try Again</button>
          <button type="button" class="btn btn-soft" data-action="nav" data-path="home">Back to Home</button>
        </div>
      </div>`, 'browse');
    }
    const trackUrl = r.tracking_url || `${location.origin}${location.pathname}#/track/${encodeURIComponent(r.code)}`;
    const matchBlock = r.top_match_score
      ? `<div class="track-match-banner">${icon('sparkles', 18)} <div><strong>Possible match found (${r.top_match_score}%)</strong><span>${esc(r.top_match_reason || '')}</span></div></div>`
      : '';
    const body = `<div class="track-page">
      <h1 class="page-title">Track Your Report</h1>
      <p class="page-sub">Report ID: <strong>${esc(r.code)}</strong></p>
      <div class="card track-card">
        <div class="track-card-head">
          <span class="status ${statusClass(r.status)}">${esc(r.status_label || r.status)}</span>
          <span class="muted">${esc(r.type === 'lost' ? 'Lost Item' : 'Found Item')}</span>
        </div>
        <h2 style="margin:12px 0 8px;color:var(--pup-maroon)">${esc(r.name)}</h2>
        <p class="muted">${esc(r.item_category || '')}${r.color ? ` · ${esc(r.color)}` : ''}</p>
        <dl class="item-essentials" style="margin-top:16px">
          <div><dt>${icon('map-pin', 15)} Location</dt><dd>${esc(r.loc)}${r.building ? `<small>${esc(r.building)}</small>` : ''}</dd></div>
          <div><dt>${icon('calendar', 15)} Date</dt><dd>${esc(r.date_lost || r.date)}</dd></div>
        </dl>
        ${r.description ? `<p style="font-size:14px;line-height:1.6;margin-top:12px">${esc(r.description)}</p>` : ''}
        ${matchBlock}
        <div class="track-actions">
          <button type="button" class="btn btn-soft btn-sm" data-action="copy-track-link" data-url="${esc(trackUrl)}">${icon('link', 16)} Copy Tracking Link</button>
          ${r.type === 'found' && r.status === 'approved' ? `<button type="button" class="btn btn-primary btn-sm" data-action="nav" data-path="browse">${icon('search', 16)} Browse Items</button>` : ''}
        </div>
        <p class="track-email-note">${icon('mail', 16)} A confirmation was sent to ${esc(r.reporter_name || 'your email')}. Save this link to check status anytime.</p>
      </div>
    </div>`;
    return shellWrap(body, 'browse');
  }

  function reportItemStep1(w, analysis) {
    return `
      <div class="report-ai-layout">
        <div class="report-ai-upload">
          <div class="dropzone report-dropzone" data-action="trigger-photo">
            ${w.photo_data ? `<img src="${esc(w.photo_data)}" alt="Preview" class="report-preview-img">` : `${icon('upload-cloud', 36)}<p>Drag and drop your image here or click to browse</p><small>JPG, PNG, WEBP up to 5MB</small>`}
          </div>
          <input type="file" accept="image/*" data-action="report-photo" id="reportPhotoInput" style="display:none">
          ${w.photo_data ? `<button type="button" class="btn btn-soft btn-sm btn-block" data-action="trigger-photo" style="margin-top:10px">${icon('camera', 16)} Change Photo</button>` : ''}
          <div class="report-ai-hint">${icon('sparkles', 16)} AI will analyze your photo and suggest item details to save you time.</div>
        </div>
        <div class="report-ai-fields">
          <div class="field"><label>Item Name ${icon('sparkles', 14)}</label><input name="name" value="${esc(w.name || '')}" required placeholder="e.g. Black Leather Wallet"></div>
          <div class="field"><label>Category</label><select name="item_category">${categoriesPlaceholder(w)}</select></div>
          <div class="report-field-row report-field-row-2">
            <div class="field"><label>Color</label><input name="color" value="${esc(w.color || '')}" placeholder="Black, Brown"></div>
            <div class="field"><label>Brand (if applicable)</label><input name="brand" value="${esc(w.brand || 'Unknown')}"></div>
          </div>
          <div class="field"><label>Description</label><textarea name="description" rows="4" placeholder="Describe unique features…">${esc(w.description || '')}</textarea></div>
        </div>
      </div>
      ${aiAnalysisPanel(analysis)}`;
  }

  function categoriesPlaceholder(w) {
    const categories = state().settings?.categories || [];
    return categories.map((c) => `<option ${w.item_category === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
  }

  function reportLocationStep(w, isFound, buildings) {
    const buildingOpts = buildings.map((b) => `<option ${w.building === b ? 'selected' : ''}>${esc(b)}</option>`).join('');
    return `
      <div class="field"><label>${isFound ? 'Exact Location Found' : 'Last Known Location'}</label><input name="loc" value="${esc(w.loc || '')}" required placeholder="${isFound ? 'e.g. Canteen entrance, New Building' : 'e.g. Engineering Building, Room 301'}"></div>
      <div class="report-field-row report-field-row-3">
        <div class="field"><label>Building</label><select name="building">${buildingOpts}</select></div>
        <div class="field"><label>Floor</label><input name="floor" value="${esc(w.floor || '')}"></div>
        <div class="field"><label>Room / Area</label><input name="room" value="${esc(w.room || '')}"></div>
      </div>
      <div class="report-field-row report-field-row-2">
        <div class="field"><label>${isFound ? 'Date Found' : 'Date Lost'}</label><input name="date_lost" type="date" value="${esc(w.date_lost || '')}"></div>
        <div class="field"><label>Time</label><input name="time_lost" type="time" value="${esc(w.time_lost || '')}"></div>
      </div>
      ${isFound ? `
        <div class="report-field-row report-field-row-2">
          <div class="field"><label>Condition</label><select name="condition"><option${w.condition === 'Good' || !w.condition ? ' selected' : ''}>Good</option><option${w.condition === 'Fair' ? ' selected' : ''}>Fair</option><option${w.condition === 'Needs repair' ? ' selected' : ''}>Needs repair</option></select></div>
          <div class="field"><label>Stored At</label><input name="holder" placeholder="Campus Security" value="${esc(w.holder || 'Campus Security')}"></div>
        </div>
      ` : ''}`;
  }

  function reportReviewStep(w, isFound) {
    return `
      <div class="card card-flat" style="background:#fafafa">
        <h3 style="margin:0 0 12px">Summary</h3>
        ${w.photo_data ? `<img src="${esc(w.photo_data)}" alt="" style="max-height:120px;border-radius:8px;margin-bottom:12px">` : ''}
        <p><strong>${esc(w.name)}</strong> — ${esc(w.item_category)}</p>
        <p class="muted">${esc(w.loc)} · ${esc(w.building || '')}</p>
        <p class="muted">${esc(w.description || '')}</p>
        ${w.ai_confidence_score ? `<p class="muted">AI confidence: ${w.ai_confidence_score}%</p>` : ''}
        <p style="margin-top:12px"><span class="status ${statusClass(isFound ? 'pending' : 'approved')}">${isFound ? 'Pending Review' : 'Active'}</span></p>
      </div>`;
  }

  function viewReport(type) {
    const w = state().wizard;
    const step = w.step || 1;
    const isFound = type === 'found';
    const steps = isFound
      ? ['Item Information', 'Found Details', 'Review & Submit']
      : ['Item Information', 'Location & Time', 'Review & Submit'];
    const maxStep = steps.length;
    const analysis = w.aiAnalysis || null;
    const buildings = state().settings?.buildings || [];

    let stepBody = '';
    if (step === 1) {
      stepBody = `${guestReporterFields(w)}${reportItemStep1(w, analysis)}`;
    } else if (step === 2) {
      stepBody = reportLocationStep(w, isFound, buildings);
    } else {
      stepBody = reportReviewStep(w, isFound);
    }

    return reportShell(`
      <div class="report-page-head">
        <h1 class="page-title">Report ${isFound ? 'Found' : 'Lost'} Item</h1>
        <span class="report-ai-badge">With AI Description Generator</span>
      </div>
      <p class="page-sub">${isFound
    ? 'No login required. Upload a photo, describe where you found the item, and submit for admin review before it appears on the public board.'
    : 'No login required. Lost reports become active immediately and enter AI matching.'}</p>
      <div class="wizard-steps">${steps.map((s, i) => `<div class="wizard-step ${i + 1 < step ? 'done' : ''} ${i + 1 === step ? 'active' : ''}">${i + 1}. ${s}</div>`).join('')}</div>
      <form class="card report-form" data-action="report-submit" data-type="${type}">
        ${stepBody}
        <div class="report-form-nav">
          ${step > 1 ? '<button type="button" class="btn btn-soft" data-action="wizard-prev">Back</button>' : '<span></span>'}
          ${step < maxStep ? `<button type="button" class="btn btn-primary" data-action="wizard-next">${step === maxStep - 1 ? 'Review' : 'Next'} ${icon('arrow-right', 16)}</button>` : '<button type="submit" class="btn btn-primary">Submit Report</button>'}
        </div>
      </form>
    `, type);
  }

  function viewMyReports() {
    const items = state().myItems || [];
    const tab = state().activeTab || 'lost';
    let rows = items;
    if (tab === 'lost') rows = items.filter((i) => i.type === 'lost');
    if (tab === 'found') rows = items.filter((i) => i.type === 'found');
    if (tab === 'closed') rows = items.filter((i) => ['claimed', 'rejected'].includes(i.status));
    const tabs = [['lost', 'Lost Reports'], ['found', 'Found Reports'], ['closed', 'Closed Reports']];
    return appShell(`
      <h1 class="page-title">My Reports</h1>
      <div class="tabs">${tabs.map(([k, l]) => `<button type="button" class="tab ${tab === k ? 'active' : ''}" data-action="set-tab" data-tab="${k}">${l}</button>`).join('')}</div>
      <table class="data-table">
        <thead><tr><th>Item</th><th>Date</th><th>Status</th><th>Matches</th><th>Action</th></tr></thead>
        <tbody>${rows.length ? rows.map((i) => {
          const mc = i.type === 'lost' ? (state().reportMatches[i.id] ?? '—') : '—';
          const st = mc > 0 && i.status === 'approved' ? 'matched' : i.status;
          return `<tr>
            <td><strong>${esc(i.name)}</strong></td>
            <td>${esc(i.date)}</td>
            <td><span class="status ${statusClass(st)}">${esc(st === 'matched' ? 'Matched' : statusLabel(i.status))}</span></td>
            <td>${mc !== '—' && mc > 0 ? `<button type="button" class="btn btn-soft btn-sm" data-action="nav" data-path="ai-search">${mc} match(es)</button>` : mc}</td>
            <td><button type="button" class="btn btn-soft btn-sm" data-action="open-item" data-id="${i.id}">View</button></td>
          </tr>`;
        }).join('') : '<tr><td colspan="5" style="text-align:center;padding:32px" class="muted">No reports</td></tr>'}
        </tbody>
      </table>
    `, 'my-reports');
  }

  function viewMyClaims() {
    const claims = state().myClaims || [];
    const tab = state().claimsTab || 'active';
    let rows = claims;
    if (tab === 'active') rows = claims.filter((c) => c.status === 'pending');
    if (tab === 'approved') rows = claims.filter((c) => c.status === 'approved');
    if (tab === 'rejected') rows = claims.filter((c) => c.status === 'rejected');
    const tabs = [['active', 'Active Claims'], ['approved', 'Approved'], ['rejected', 'Rejected']];
    return appShell(`
      <h1 class="page-title">My Claims</h1>
      <div class="tabs">${tabs.map(([k, l]) => `<button type="button" class="tab ${tab === k ? 'active' : ''}" data-action="set-claims-tab" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="progress-track">
        <div class="progress-step done">Submitted</div>
        <div class="progress-step ${tab === 'active' ? 'active' : 'done'}">Under Review</div>
        <div class="progress-step ${tab === 'approved' ? 'done' : ''}">Approved</div>
        <div class="progress-step ${tab === 'approved' ? 'done' : ''}">Claimed</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Item</th><th>Claim Date</th><th>Verification Status</th><th>Action</th></tr></thead>
        <tbody>${rows.length ? rows.map((c) => `<tr>
          <td><strong>${esc(c.item?.name || '—')}</strong></td>
          <td>${esc(c.date)}</td>
          <td><span class="status ${statusClass(c.status)}">${esc(c.status)}</span></td>
          <td><button type="button" class="btn btn-soft btn-sm" data-action="open-item" data-id="${c.item_id}">View Item</button></td>
        </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:32px" class="muted">No claims</td></tr>'}
        </tbody>
      </table>
    `, 'my-claims');
  }

  function groupNotifications(list) {
    const today = [];
    const week = [];
    const earlier = [];
    const now = new Date();
    list.forEach((n) => {
      /* simplified grouping by read order */
      if (today.length < 2) today.push(n);
      else if (week.length < 3) week.push(n);
      else earlier.push(n);
    });
    return { today, week, earlier };
  }

  function notifRow(n) {
    const typeIcon = /match/i.test(n.title) ? 'git-compare' : /claim/i.test(n.title) ? 'shield-check' : 'bell';
    return `<article class="notif-item ${n.is_read ? '' : 'unread'}" data-action="read-notif" data-id="${n.id}">
      <div class="notif-icon">${icon(typeIcon, 20)}</div>
      <div><strong style="font-size:14px">${esc(n.title)}</strong><p style="margin:4px 0;font-size:13px;color:var(--muted)">${esc(n.message)}</p><span style="font-size:11px;color:var(--muted)">${esc(n.date)}</span></div>
    </article>`;
  }

  function viewNotifications() {
    const g = groupNotifications(state().notifications);
    return appShell(`
      <div class="section-head"><h1 class="page-title" style="margin:0">Notifications</h1>
        <button type="button" class="btn btn-soft btn-sm" data-action="read-all-notif">Mark all read</button></div>
      ${g.today.length ? `<div class="notif-group"><h3>Today</h3>${g.today.map(notifRow).join('')}</div>` : ''}
      ${g.week.length ? `<div class="notif-group"><h3>This Week</h3>${g.week.map(notifRow).join('')}</div>` : ''}
      ${g.earlier.length ? `<div class="notif-group"><h3>Earlier</h3>${g.earlier.map(notifRow).join('')}</div>` : ''}
      ${!state().notifications.length ? '<div class="empty-state">No notifications</div>' : ''}
    `, 'notifications');
  }

  function viewProfile() {
    const u = state().user;
    return appShell(`
      <h1 class="page-title">User Profile</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
        <form class="card" data-action="profile-save">
          <h3 style="margin:0 0 16px;color:var(--pup-maroon)">Personal Information</h3>
          <div class="field"><label>Student Number</label><input value="${esc(u.username)}" disabled></div>
          <div class="field"><label>Full Name</label><input name="full_name" value="${esc(u.full_name || '')}"></div>
          <div class="field"><label>Course</label><input name="course" value="${esc(u.course || '')}"></div>
          <div class="field"><label>Year Level</label><input name="year_level" value="${esc(u.year_level || '')}"></div>
          <div class="field"><label>PUP Email</label><input name="email" type="email" value="${esc(u.email || '')}"></div>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </form>
        <div class="card">
          <h3 style="margin:0 0 16px;color:var(--pup-maroon)">Settings</h3>
          <div class="field"><label>Change Password</label><input type="password" placeholder="New password (demo)" disabled></div>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:12px"><input type="checkbox" checked disabled> Email notifications for matches</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" checked disabled> Claim status updates</label>
          <p class="muted" style="font-size:12px;margin-top:16px">Privacy settings managed by Office of Student Affairs.</p>
        </div>
      </div>
    `, 'profile');
  }

  function viewFaq() {
    const faqs = [
      { q: 'How do I claim an item?', a: 'Locate the item under Browse Items, open the details page, and submit a claim with proof of ownership and your student ID. An administrator will verify your claim before release.' },
      { q: 'How long are items kept?', a: 'Unclaimed items are retained for 90 days per campus policy, then archived or disposed of according to OSA guidelines.' },
      { q: 'What proof is needed?', a: 'Valid student ID, accurate description of unique features, and supporting photos. For high-value items, additional verification may be required.' },
      { q: 'Where is the Lost and Found Office?', a: 'PUP Parañaque — Office of Student Affairs / Campus Security, ground floor admin building. See the Lost & Found Office page for hours and map.' },
    ];
    const body = `
      <h1 class="page-title">FAQ &amp; Help Center</h1>
      <div style="max-width:720px;margin-top:20px">${faqs.map((f) => `
        <details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`;
    if (A().isAuthed()) return appShell(body, 'faq');
    return `${pubHeader()}<main class="public-page">${body}</main>${siteFooter()}`;
  }

  function viewOffice() {
    const body = `
      <h1 class="page-title">Lost &amp; Found Office</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
        <div class="card">
          <h3 style="margin:0 0 16px;color:var(--pup-maroon)">Office Information</h3>
          <p><strong>Location:</strong> Ground Floor, Admin Building, PUP Parañaque</p>
          <p><strong>Office Hours:</strong> Monday – Friday, 8:00 AM – 5:00 PM</p>
          <p><strong>Contact:</strong> (02) 0000-0000</p>
          <p><strong>Email:</strong> lostfound@pup.edu.ph</p>
        </div>
        <div class="card" style="min-height:200px;background:#f3f4f6;display:grid;place-items:center;color:var(--muted)">
          ${icon('map', 48)}<p style="margin-top:12px">Campus map — Parañaque City Campus</p>
        </div>
      </div>`;
    if (A().isAuthed()) return appShell(body, 'office');
    return `${pubHeader()}<main class="public-page">${body}</main>${siteFooter()}`;
  }

  function lineChartSvg(monthly) {
    const data = (monthly && monthly.length) ? monthly : [
      { name: 'Jan', count: 8 }, { name: 'Feb', count: 12 }, { name: 'Mar', count: 10 },
      { name: 'Apr', count: 15 }, { name: 'May', count: 18 },
    ];
    const w = 520; const h = 140;
    const max = Math.max(...data.map((d) => d.count), 1);
    const pts = data.map((d, i) => {
      const x = 40 + (i / Math.max(data.length - 1, 1)) * (w - 60);
      const y = h - 24 - (d.count / max) * (h - 44);
      return `${x},${y}`;
    }).join(' ');
    return `<svg class="line-chart" viewBox="0 0 ${w} ${h}"><polyline points="${pts}"/></svg>`;
  }

  function heatmapHtml(locs) {
    const items = (locs && locs.length) ? locs.slice(0, 8) : [{ name: 'Engineering', count: 5 }, { name: 'Library', count: 3 }];
    const max = Math.max(...items.map((i) => i.count), 1);
    return `<div class="heatmap-grid">${items.map((l) => {
      const op = 0.15 + (l.count / max) * 0.55;
      return `<div class="heatmap-cell" style="background:rgba(128,0,0,${op});color:${op > 0.35 ? '#fff' : 'var(--text)'}">${esc(l.name)}<br><small>${l.count}</small></div>`;
    }).join('')}</div>`;
  }

  function adminTabs(tabs, activeKey, action) {
    return `<div class="tabs">${tabs.map(([k, l]) => `<button type="button" class="tab ${activeKey === k ? 'active' : ''}" data-action="${action}" data-tab="${k}">${l}</button>`).join('')}</div>`;
  }

  function adminReportsMatchMap() {
    const map = {};
    (state().adminMatches || []).forEach((m) => {
      [m.lost_report_id, m.found_report_id].filter(Boolean).forEach((id) => {
        if (!map[id]) map[id] = { count: 0, matches: [] };
        const already = map[id].matches.some((x) => x.id === m.id);
        if (!already) {
          map[id].count += 1;
          map[id].matches.push(m);
        }
      });
    });
    Object.values(map).forEach((entry) => {
      entry.matches.sort((a, b) => (b.match_score || b.confidence_pct || 0) - (a.match_score || a.confidence_pct || 0));
      entry.topScore = entry.matches[0]?.match_score || entry.matches[0]?.confidence_pct || 0;
    });
    return map;
  }

  function adminReportsFilterItems(all) {
    const st = state();
    const tab = st.adminReportsTab || 'all';
    let rows = [...all];
    if (tab === 'pending') rows = rows.filter((i) => i.status === 'pending');
    if (tab === 'approved') rows = rows.filter((i) => i.status === 'approved');
    if (tab === 'rejected') rows = rows.filter((i) => i.status === 'rejected');
    if (tab === 'claimed') rows = rows.filter((i) => i.status === 'claimed');

    const q = (st.adminReportsSearch || '').trim().toLowerCase();
    if (q) {
      rows = rows.filter((i) => [
        i.name, i.code, i.loc, i.reporter_name, i.reporter_email, i.by, i.item_category,
      ].some((v) => String(v || '').toLowerCase().includes(q)));
    }
    if (st.adminReportsFilterType && st.adminReportsFilterType !== 'all') {
      rows = rows.filter((i) => i.type === st.adminReportsFilterType);
    }
    if (st.adminReportsFilterStatus && st.adminReportsFilterStatus !== 'all') {
      rows = rows.filter((i) => i.status === st.adminReportsFilterStatus);
    }
    if (st.adminReportsFilterLocation && st.adminReportsFilterLocation !== 'all') {
      rows = rows.filter((i) => (i.building || i.loc || '') === st.adminReportsFilterLocation);
    }
    return rows;
  }

  function adminReportsStatusLabel(status) {
    const labels = { pending: 'Pending', approved: 'Active', rejected: 'Rejected', claimed: 'Claimed' };
    return labels[status] || status;
  }

  function adminReportsTabCounts(all) {
    return {
      all: all.length,
      pending: all.filter((i) => i.status === 'pending').length,
      approved: all.filter((i) => i.status === 'approved').length,
      rejected: all.filter((i) => i.status === 'rejected').length,
      claimed: all.filter((i) => i.status === 'claimed').length,
    };
  }

  function adminReportsFormatDate(item) {
    if (item.created_at) {
      return new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return item.date || '—';
  }

  function adminReportsFormatSubmitted(item) {
    if (item.created_at) {
      return new Date(item.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    }
    return item.date || '—';
  }

  function adminReportRelatedClaims(itemId) {
    return (state().adminAllClaims || state().pendingClaims || []).filter((c) => c.item_id === itemId);
  }

  function adminReportsListRow(item, selectedId) {
    const thumb = item.photo_data
      ? `<img src="${esc(item.photo_data)}" alt="">`
      : icon('image', 22);
    const typeWord = item.type === 'found' ? 'Found' : 'Lost';
    const status = adminReportsStatusLabel(item.status);
    const typeCls = item.type === 'found' ? 'found' : 'lost';
    return `<button type="button" class="ar-card${Number(selectedId) === item.id ? ' is-active' : ''}" data-action="select-admin-report" data-id="${item.id}">
      <span class="ar-card-thumb">${thumb}</span>
      <span class="ar-card-body">
        <span class="ar-card-top">
          <span class="ar-card-title">${esc(item.name)}</span>
          <span class="ar-card-type ar-card-type-${typeCls}">${typeWord}</span>
        </span>
        <span class="ar-card-meta">${esc(item.code || `#${item.id}`)} · ${esc(adminReportsFormatDate(item))}</span>
      </span>
      <span class="ar-card-end">
        <span class="ar-status-pill ar-status-${esc(item.status)}">${esc(status)}</span>
        <span class="ar-card-date">${esc(adminReportsFormatDate(item))}</span>
      </span>
    </button>`;
  }

  function arFactRow(ico, label, value) {
    if (!value && value !== 0) return '';
    return `<div class="ar-fact-row">${icon(ico, 14)}<div><span>${label}</span><strong>${value}</strong></div></div>`;
  }

  function adminReportGallery(item) {
    const gallery = galleryViews(item);
    if (!gallery.length) {
      return `<div class="ar-gallery">
        <div class="ar-gallery-main ar-gallery-empty">${icon('image', 40)}<span>No photo</span></div>
      </div>`;
    }
    const thumbs = gallery.map((v, i) => `
      <button type="button" class="ar-gallery-thumb${i === 0 ? ' is-active' : ''}" data-action="admin-detail-thumb" data-src="${esc(v.src)}" data-pos="${esc(v.pos)}" aria-label="${esc(v.label)}">
        <img src="${esc(v.src)}" alt="" style="object-position:${v.pos}">
      </button>`).join('');
    return `
      <div class="ar-gallery">
        <div class="ar-gallery-main">
          <img id="adminDetailPhoto" src="${esc(gallery[0].src)}" alt="${esc(item.name)}" style="object-position:${gallery[0].pos}">
        </div>
        <div class="ar-gallery-nav">
          <button type="button" class="ar-gallery-arrow" data-action="admin-gallery-prev" aria-label="Previous photo">${icon('chevron-left', 18)}</button>
          <div class="ar-gallery-thumbs">${thumbs}</div>
          <button type="button" class="ar-gallery-arrow" data-action="admin-gallery-next" aria-label="Next photo">${icon('chevron-right', 18)}</button>
        </div>
      </div>`;
  }

  function adminReporterDisplay(item) {
    if (item.reporter_name) return item.reporter_name;
    if (item.by && item.by.includes('@')) return item.by;
    return item.by || 'Guest';
  }

  function adminReportTopBar(item) {
    const id = item.id;
    return `
      <button type="button" class="ar-toolbar-btn" data-action="open-item" data-id="${id}">${icon('external-link', 14)} View Page</button>
      <button type="button" class="ar-toolbar-btn" data-action="admin-edit-report" data-id="${id}">${icon('pencil', 14)} Edit Report</button>
      <button type="button" class="ar-toolbar-btn ar-toolbar-btn-danger" data-action="admin-delete-item" data-id="${id}" data-name="${esc(item.name)}">${icon('trash-2', 14)} Delete Report</button>`;
  }

  function adminReportAdminActions(item, matchInfo) {
    const id = item.id;
    const pending = item.status === 'pending';
    const approved = item.status === 'approved';
    const pendingClaimCount = adminReportRelatedClaims(item.id).filter((c) => c.status === 'pending').length;
    const moreItems = [];
    if (matchInfo.count) {
      moreItems.push(`<button type="button" class="ar-more-item" data-action="nav" data-path="admin/ai">${icon('sparkles', 14)} View ${matchInfo.count} AI Match${matchInfo.count === 1 ? '' : 'es'}</button>`);
    }
    const moreMenu = moreItems.length ? `
      <div class="admin-more-menu">
        <button type="button" class="ar-admin-btn ar-admin-btn-more" data-action="toggle-admin-more-menu">${icon('more-horizontal', 14)} More Actions ${icon('chevron-down', 14)}</button>
        <div class="ar-more-dropdown">${moreItems.join('')}</div>
      </div>` : '';
    const claimAction = approved
      ? (pendingClaimCount
        ? `<button type="button" class="ar-admin-btn ar-admin-btn-approve" data-action="nav" data-path="admin/claims">${icon('shield-check', 14)} Review ${pendingClaimCount} Pending Claim${pendingClaimCount === 1 ? '' : 's'}</button>`
        : `<button type="button" class="ar-admin-btn ar-admin-btn-approve" data-action="admin-claim-item" data-id="${id}" data-type="${esc(item.type)}">${icon('package-check', 14)} Mark Claimed</button>`)
      : '';
    const actionBtns = [
      pending ? `<button type="button" class="ar-admin-btn ar-admin-btn-approve" data-action="admin-approve-item" data-id="${id}">${icon('check', 14)} Approve Report</button>` : '',
      pending ? `<button type="button" class="ar-admin-btn ar-admin-btn-changes" data-action="admin-request-changes" data-id="${id}">${icon('pencil', 14)} Request Changes</button>` : '',
      pending ? `<button type="button" class="ar-admin-btn ar-admin-btn-reject" data-action="admin-reject-item" data-id="${id}">${icon('x', 14)} Reject Report</button>` : '',
      claimAction,
      moreMenu,
    ].filter(Boolean).join('');
    if (!actionBtns) return '';
    return `
      <section class="ar-admin-actions">
        <h3>Admin Actions</h3>
        <div class="ar-admin-actions-row">${actionBtns}</div>
      </section>`;
  }

  function adminReportInspector(item, matchMap) {
    if (!item) {
      return `<aside class="ar-inspector ar-inspector-empty"><p>Select a report from the list</p></aside>`;
    }

    const matchInfo = matchMap[item.id] || { count: 0, matches: [] };
    const desc = item.description || item.ai_description || '';
    const reporter = adminReporterDisplay(item);
    const typeWord = item.type === 'found' ? 'FOUND' : 'LOST';
    const dateLabel = item.type === 'found' ? 'Date Found' : 'Date Lost';
    const statusKey = item.status === 'approved' ? 'active' : item.status;
    const statusLabel = item.status === 'approved' ? 'ACTIVE' : adminReportsStatusLabel(item.status).toUpperCase();
    const locationLine = [item.building, item.floor, item.room].filter(Boolean).join(' · ');
    const isStudent = !item.is_guest && item.by;
    const reporterType = isStudent ? 'Student' : 'Guest';
    const reporterTypeIcon = isStudent ? 'graduation-cap' : 'user';
    const relatedClaims = adminReportRelatedClaims(item.id);
    const timeline = itemTimeline(item);
    const adminActions = adminReportAdminActions(item, matchInfo);

    return `<aside class="ar-inspector">
      <header class="ar-inspector-toolbar">${adminReportTopBar(item)}</header>
      <div class="ar-inspector-scroll">
        <article class="ar-inspector-card">
          <div class="ar-inspector-hero">
            ${adminReportGallery(item)}
            <div class="ar-inspector-head">
              <div class="ar-inspector-badges">
                <span class="ar-badge ar-badge-${item.type === 'found' ? 'found' : 'lost'}">${typeWord}</span>
                <span class="ar-badge ar-badge-${esc(statusKey)}">${esc(statusLabel)}</span>
              </div>
              <h2 class="ar-inspector-title">${esc(item.name)}</h2>
              <p class="ar-inspector-sub">${esc(item.code || `#${item.id}`)} · ${esc(adminReportsFormatDate(item))}</p>
              ${desc ? `<p class="ar-inspector-desc">${esc(desc)}</p>` : ''}
            </div>
          </div>

          <div class="ar-detail-grid">
            <section class="ar-detail-block">
              <h3>Item Details</h3>
              ${arFactRow('tag', 'Category', esc(item.item_category || 'General'))}
              ${arFactRow('droplet', 'Color', item.color ? esc(item.color) : '')}
              ${arFactRow('map-pin', 'Location', esc(item.loc))}
              ${arFactRow('building-2', 'Building', locationLine ? esc(locationLine) : (item.building ? esc(item.building) : ''))}
              ${arFactRow('calendar', dateLabel, esc(formatDetailDate(item)))}
              ${item.type === 'found' ? arFactRow('archive', 'Held at', esc(item.holder || 'Lost & Found Office')) : ''}
            </section>
            <section class="ar-detail-block">
              <h3>Reported By</h3>
              ${arFactRow('user', 'Name', esc(reporter))}
              ${arFactRow(reporterTypeIcon, 'Type', esc(reporterType))}
              ${arFactRow('mail', 'Email', item.reporter_email ? `<a class="ar-email-link" href="mailto:${esc(item.reporter_email)}">${esc(item.reporter_email)}</a>` : '')}
              ${arFactRow('phone', 'Phone', item.reporter_phone ? esc(item.reporter_phone) : '')}
              ${isStudent ? arFactRow('id-card', 'Student ID', esc(item.by)) : ''}
              ${arFactRow('calendar-check', 'Submitted', esc(adminReportsFormatSubmitted(item)))}
            </section>
          </div>

          ${adminActions}
        </article>

        <div class="ar-accordions">
          <div class="ar-accordion">
            <button type="button" class="ar-accordion-head" data-action="toggle-ar-accordion">${icon('history', 16)} Activity Log ${icon('chevron-down', 16)}</button>
            <div class="ar-accordion-body">
              <ol class="ar-activity-log">${timeline.map((ev) => `
                <li><strong>${esc(ev.title)}</strong><span>${esc(ev.date)}</span><p>${esc(ev.desc)}</p></li>`).join('')}
              </ol>
            </div>
          </div>
          <div class="ar-accordion">
            <button type="button" class="ar-accordion-head" data-action="toggle-ar-accordion">${icon('users', 16)} Related Claims (${relatedClaims.length}) ${icon('chevron-down', 16)}</button>
            <div class="ar-accordion-body">
              <div class="ar-related-claims">${relatedClaims.length
    ? relatedClaims.map((c) => `
                <div class="ar-claim-row">
                  <strong>${esc(c.claimant_name || c.user?.full_name || c.user?.username || 'Claimant')}</strong>
                  <span class="ar-status-pill ar-status-${esc(c.status || 'pending')}">${esc(c.status || 'pending')}</span>
                  ${c.claimant_student_number ? `<span class="ar-claim-meta">${esc(c.claimant_student_number)}${c.claimant_program_section ? ` · ${esc(c.claimant_program_section)}` : ''}</span>` : ''}
                  ${c.claimant_email ? `<span class="ar-claim-meta">${esc(c.claimant_email)}${c.claimant_phone ? ` · ${esc(c.claimant_phone)}` : ''}</span>` : ''}
                  <p>${esc(c.description || '')}</p>
                  ${c.status === 'pending' ? `<button type="button" class="ar-text-btn" data-action="nav" data-path="admin/claims">Review in Claims module</button>` : ''}
                </div>`).join('')
    : '<p class="ar-claim-empty">No claims for this item yet.</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>`;
  }

  function adminReportsPager(page, totalPages, total, pageSize) {
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = Math.min(page * pageSize, total);
    const range = total ? `Showing ${start} to ${end} of ${total} report${total === 1 ? '' : 's'}` : 'No reports';
    if (totalPages <= 1) {
      return `<div class="ar-pager"><span class="ar-pager-range">${range}</span></div>`;
    }
    return `<div class="ar-pager">
      <span class="ar-pager-range">${range}</span>
      <div class="ar-pager-nav">
        <button type="button" class="ar-pager-btn" data-action="admin-reports-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span class="ar-pager-num">${page}</span>
        <button type="button" class="ar-pager-btn" data-action="admin-reports-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>`;
  }

  function adminReportsFilterPanel(all) {
    if (!state().adminReportsFilterOpen) return '';
    const buildings = [...new Set(all.map((i) => i.building || i.loc).filter(Boolean))].sort();
    return `<div class="ar-filter-panel">
      <label>Type
        <select id="adminReportsFilterType">
          <option value="all"${state().adminReportsFilterType === 'all' ? ' selected' : ''}>All types</option>
          <option value="lost"${state().adminReportsFilterType === 'lost' ? ' selected' : ''}>Lost</option>
          <option value="found"${state().adminReportsFilterType === 'found' ? ' selected' : ''}>Found</option>
        </select>
      </label>
      <label>Status
        <select id="adminReportsFilterStatus">
          <option value="all"${state().adminReportsFilterStatus === 'all' ? ' selected' : ''}>All statuses</option>
          <option value="pending"${state().adminReportsFilterStatus === 'pending' ? ' selected' : ''}>Pending</option>
          <option value="approved"${state().adminReportsFilterStatus === 'approved' ? ' selected' : ''}>Active</option>
          <option value="claimed"${state().adminReportsFilterStatus === 'claimed' ? ' selected' : ''}>Claimed</option>
          <option value="rejected"${state().adminReportsFilterStatus === 'rejected' ? ' selected' : ''}>Rejected</option>
        </select>
      </label>
      <label>Location
        <select id="adminReportsFilterLocation">
          <option value="all"${state().adminReportsFilterLocation === 'all' ? ' selected' : ''}>All locations</option>
          ${buildings.map((b) => `<option value="${esc(b)}"${state().adminReportsFilterLocation === b ? ' selected' : ''}>${esc(b)}</option>`).join('')}
        </select>
      </label>
    </div>`;
  }

  function viewAdminReports() {
    const all = state().adminAllItems || state().pendingItems || [];
    const tab = state().adminReportsTab || 'all';
    const matchMap = adminReportsMatchMap();
    const counts = adminReportsTabCounts(all);
    const segments = [
      ['all', 'All', counts.all],
      ['pending', 'Pending', counts.pending],
      ['approved', 'Active', counts.approved],
      ['rejected', 'Rejected', counts.rejected],
      ['claimed', 'Claimed', counts.claimed],
    ];
    const filtered = adminReportsFilterItems(all);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(state().adminReportsPage || 1, totalPages);
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

    let selectedId = state().adminReportsSelectedId;
    if (!selectedId || !all.some((i) => i.id === Number(selectedId))) {
      selectedId = filtered[0]?.id ?? null;
    }
    const selected = selectedId
      ? (all.find((i) => i.id === Number(selectedId)) || filtered.find((i) => i.id === Number(selectedId)))
      : null;

    return appShell(`
      <div class="admin-reports-page">
        <section class="ar-list">
          <header class="ar-list-head">
            <h1>Reports</h1>
            <div class="ar-search-wrap">
              ${icon('search', 16)}
              <input type="search" id="adminReportsSearch" class="ar-search" value="${esc(state().adminReportsSearch || '')}" placeholder="Search reports…" aria-label="Search reports">
            </div>
            <button type="button" class="ar-filter-btn${state().adminReportsFilterOpen ? ' is-active' : ''}" data-action="toggle-admin-reports-filter" aria-label="Filter reports">${icon('sliders-horizontal', 18)}</button>
          </header>
          ${adminReportsFilterPanel(all)}
          <div class="ar-segments">${segments.map(([k, label, n]) => `
            <button type="button" class="ar-segment${tab === k ? ' is-active' : ''}" data-action="set-admin-reports-tab" data-tab="${k}">${label} (${n})</button>`).join('')}
          </div>
          <div class="ar-rows">${pageRows.length
    ? pageRows.map((i) => adminReportsListRow(i, selectedId)).join('')
    : '<p class="ar-empty">No reports found</p>'}
          </div>
          ${adminReportsPager(page, totalPages, filtered.length, pageSize)}
        </section>
        ${adminReportInspector(selected, matchMap)}
      </div>
    `, 'admin/reports');
  }

  function claimantInfo(c) {
    const u = c.user;
    return {
      name: c.claimant_name || u?.full_name || '—',
      studentNumber: c.claimant_student_number || u?.username || '—',
      programSection: c.claimant_program_section || (u?.course ? `${u.course}${u.year_level ? ` ${u.year_level}` : ''}` : '—'),
      phone: c.claimant_phone || '—',
      email: c.claimant_email || u?.email || '—',
    };
  }

  function adminClaimProofSection(c) {
    const proof = c.proof_data
      ? `<button type="button" class="user-id-thumb user-id-thumb-sm" data-action="open-lightbox" data-src="${esc(c.proof_data)}"><img src="${esc(c.proof_data)}" alt="Proof of ownership"></button>`
      : '<span class="muted" style="font-size:12px">No proof uploaded</span>';
    const idPhoto = c.id_photo_data
      ? `<button type="button" class="user-id-thumb user-id-thumb-sm" data-action="open-lightbox" data-src="${esc(c.id_photo_data)}"><img src="${esc(c.id_photo_data)}" alt="Valid ID"></button>`
      : '<span class="muted" style="font-size:12px">No ID uploaded</span>';
    return `
      <div class="verify-panel">
        <h4>Verification Photos</h4>
        <p style="margin:12px 0 6px"><strong>Proof of ownership</strong></p>
        ${proof}
        <p style="margin:16px 0 6px"><strong>Valid ID</strong></p>
        ${idPhoto}
      </div>`;
  }

  function adminClaimCard(c) {
    const info = claimantInfo(c);
    const guestTag = c.is_guest ? `<span class="status status-pending" style="margin-left:8px;font-size:11px">Guest</span>` : '';
    return `<article class="card" style="margin-top:20px" id="admin-claim-${c.id}">
      <div class="verify-grid">
        <div class="verify-panel">
          <h4>Claimed Item</h4>
          <div style="display:flex;gap:12px;margin-top:12px">
            <div style="width:80px;height:80px;border-radius:8px;overflow:hidden;background:#eee">${c.item?.photo_data ? `<img src="${esc(c.item.photo_data)}" style="width:100%;height:100%;object-fit:cover">` : icon('image', 32)}</div>
            <div>
              <strong>${esc(c.item?.name)}</strong>
              <p class="muted" style="font-size:13px;margin-top:6px">${esc(c.item?.description || '')}</p>
              <p class="muted" style="font-size:12px;margin-top:6px">${esc(c.item?.code || '')} · ${esc(c.item?.loc || '')}</p>
              <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;padding:0" data-action="open-item" data-id="${c.item_id}">View item page</button>
            </div>
          </div>
        </div>
        <div class="verify-panel">
          <h4>Claimant Information${guestTag}</h4>
          <p><strong>Name:</strong> ${esc(info.name)}</p>
          <p><strong>Student Number:</strong> ${esc(info.studentNumber)}</p>
          <p><strong>Program and Section:</strong> ${esc(info.programSection)}</p>
          <p><strong>Contact Number:</strong> ${esc(info.phone)}</p>
          <p><strong>Email:</strong> ${esc(info.email)}</p>
          <p style="margin-top:8px;font-size:14px"><strong>Owner description:</strong> ${esc(c.description)}</p>
        </div>
        ${adminClaimProofSection(c)}
      </div>
      <ul class="verify-checklist">
        <li><input type="checkbox" id="chk-desc-${c.id}"> Correct description</li>
        <li><input type="checkbox" id="chk-loc-${c.id}"> Correct location</li>
        <li><input type="checkbox" id="chk-date-${c.id}"> Correct date</li>
        <li><input type="checkbox" id="chk-proof-${c.id}"> Uploaded proof</li>
        <li><input type="checkbox" id="chk-id-${c.id}"> Student ID verified</li>
      </ul>
      <div style="display:flex;gap:8px">
        <button type="button" class="btn btn-primary btn-sm" data-action="admin-approve-claim" data-id="${c.id}">Approve Claim</button>
        <button type="button" class="btn btn-soft btn-sm" data-action="admin-reject-claim" data-id="${c.id}">Reject Claim</button>
      </div>
    </article>`;
  }

  function adminClaimRow(c) {
    const st = c.status || 'pending';
    const itemSt = c.item?.status || '—';
    const info = claimantInfo(c);
    return `<tr>
      <td><strong>${esc(c.item?.name || '—')}</strong></td>
      <td>${esc(info.name)}<br><span class="muted" style="font-size:12px">${esc(info.studentNumber)}</span></td>
      <td>${esc(c.date)}</td>
      <td><span class="status ${statusClass(st)}">${esc(st)}</span></td>
      <td><span class="status ${statusClass(itemSt)}">${esc(itemSt)}</span></td>
      <td><button type="button" class="btn btn-ghost btn-sm" data-action="open-item" data-id="${c.item_id}">View</button></td>
    </tr>`;
  }

  function viewAdmin(path) {
    const tracker = state().tracker || {};
    const analytics = state().analytics || {};
    if (path === 'admin/reports') {
      return viewAdminReports();
    }
    if (path === 'admin/claims') {
      const all = state().adminAllClaims || state().pendingClaims || [];
      const tab = state().adminClaimsTab || 'pending';
      let rows = all;
      if (tab === 'pending') rows = all.filter((c) => c.status === 'pending');
      if (tab === 'approved') rows = all.filter((c) => c.status === 'approved');
      if (tab === 'rejected') rows = all.filter((c) => c.status === 'rejected');
      if (tab === 'claimed') rows = all.filter((c) => c.status === 'approved' && c.item?.status === 'claimed');
      const tabs = [
        ['pending', 'Pending Claims'],
        ['approved', 'Approved'],
        ['rejected', 'Rejected'],
        ['claimed', 'Claimed'],
      ];
      const body = tab === 'pending'
        ? (rows.length ? rows.map(adminClaimCard).join('') : '<div class="empty-state">No pending claims</div>')
        : `<table class="data-table">
          <thead><tr><th>Item</th><th>Claimant</th><th>Date</th><th>Claim Status</th><th>Item Status</th><th>Action</th></tr></thead>
          <tbody>${rows.length ? rows.map(adminClaimRow).join('') : '<tr><td colspan="6" style="text-align:center;padding:32px">No claims in this view</td></tr>'}
          </tbody>
        </table>`;
      return appShell(`
        <h1 class="page-title">Claims</h1>
        <p class="page-sub">Verify ownership and release recovered items</p>
        ${adminTabs(tabs, tab, 'set-admin-claims-tab')}
        ${body}
      `, path);
    }
    if (path === 'admin/users') {
      const users = state().adminUsers || [];
      const pending = state().pendingUsers || [];
      return appShell(`
        <h1 class="page-title">Users</h1>
        <p class="page-sub">Manage student accounts and registration approvals</p>
        ${pending.length ? `<h3 style="font-size:16px;margin:24px 0 12px">Pending Registration (${pending.length})</h3>
          ${pending.map((u) => {
    const hasId = (u.id_photo_data || '').length >= 30;
    return `<article class="card admin-pending-user">
      <div class="admin-pending-user-grid">
        <div>
          <p><strong>${esc(u.full_name)}</strong></p>
          <p class="muted" style="font-size:13px;margin-top:4px">${esc(u.username)}${u.course ? ` · ${esc(u.course)}` : ''}${u.year_level ? ` · ${esc(u.year_level)}` : ''}</p>
          ${u.email ? `<p class="muted" style="font-size:13px;margin-top:4px">${esc(u.email)}</p>` : ''}
        </div>
        <div class="admin-pending-user-id">
          <span class="admin-pending-user-id-label">School ID</span>
          ${hasId
      ? `<button type="button" class="user-id-thumb user-id-thumb-sm" data-action="open-lightbox" data-src="${esc(u.id_photo_data)}"><img src="${esc(u.id_photo_data)}" alt="School ID"></button>`
      : '<span class="muted" style="font-size:12px">Not uploaded</span>'}
        </div>
        <div class="admin-pending-user-actions">
          <button type="button" class="btn btn-soft btn-sm" data-action="view-user" data-id="${u.id}">Review</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="approve-user" data-id="${u.id}">Activate</button>
          <button type="button" class="btn btn-soft btn-sm" data-action="reject-user" data-id="${u.id}">Reject</button>
        </div>
      </div>
    </article>`;
  }).join('')}` : ''}
        <table class="data-table" style="margin-top:20px">
          <thead><tr><th>Name</th><th>Student Number</th><th>Role</th><th>Status</th><th>Last Login</th><th>Action</th></tr></thead>
          <tbody>${users.map((u) => `<tr>
            <td>${esc(u.full_name)}</td>
            <td>${esc(u.username)}</td>
            <td>${esc(u.role)}</td>
            <td><span class="status ${statusClass(u.approval_status)}">${esc(u.approval_status)}</span></td>
            <td>${esc(u.last_login_at || '—')}</td>
            <td><button type="button" class="btn btn-soft btn-sm" data-action="view-user" data-id="${u.id}">View</button></td>
          </tr>`).join('')}
          </tbody>
        </table>
      `, path);
    }
    if (path === 'admin/ai') {
      const pairs = state().adminMatches || state().aiMonitor || [];
      return appShell(`
        <h1 class="page-title">AI Matches</h1>
        <p class="page-sub">Review smart matches between lost and found reports</p>
        <table class="data-table">
          <thead><tr><th>Lost Item</th><th>Found Item</th><th>Match Score</th><th>Match Reason</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${pairs.length ? pairs.map((p) => {
    const score = p.match_score || p.confidence || 0;
    const id = p.id;
    return `<tr>
            <td><strong>${esc(p.lost_name || p.lost || p.lost_item?.name || '—')}</strong></td>
            <td><strong>${esc(p.found_name || p.found || p.found_item?.name || '—')}</strong></td>
            <td><span class="${confClass(score)}">${score}%</span></td>
            <td style="max-width:240px;font-size:13px">${esc(p.match_reason || p.reason || '')}</td>
            <td><span class="status ${statusClass(p.status === 'approved' ? 'approved' : p.status === 'claimed' ? 'claimed' : 'pending')}">${esc(p.status || 'pending')}</span></td>
            <td>
              <div class="admin-match-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-action="open-ai-match" data-found-id="${p.found_report_id || p.found_id || ''}" data-lost-id="${p.lost_report_id || p.lost_id || ''}">Review</button>
                <button type="button" class="btn btn-primary btn-sm" data-action="admin-match-status" data-id="${id}" data-status="approved">Approve</button>
                <button type="button" class="btn btn-soft btn-sm" data-action="admin-match-status" data-id="${id}" data-status="dismissed">Dismiss</button>
                <button type="button" class="btn btn-outline btn-sm" data-action="admin-match-status" data-id="${id}" data-status="claimed">Claimed</button>
              </div>
            </td>
          </tr>`;
  }).join('') : '<tr><td colspan="6" style="text-align:center;padding:32px">No matches recorded yet</td></tr>'}
          </tbody>
        </table>
      `, path);
    }
    if (path === 'admin/more') {
      const tab = state().adminMoreTab || 'analytics';
      const tabs = [['analytics', 'Analytics'], ['audit', 'Audit Logs'], ['settings', 'Settings']];
      const cats = analytics.by_category || [];
      const locs = analytics.by_building || [];
      const logs = state().activity || [];
      const s = state().settings || {};
      let panel = '';
      if (tab === 'analytics') {
        panel = `
          <div class="stats-row">
            <div class="stat-card"><div class="label">Recovery Rate</div><div class="value">${analytics.claim_success_pct || 92}%</div></div>
            <div class="stat-card"><div class="label">AI Accuracy</div><div class="value">${analytics.ai_accuracy_pct || 87}%</div></div>
            <div class="stat-card"><div class="label">Avg Recovery</div><div class="value">${analytics.avg_recovery_days || 3.2}d</div></div>
          </div>
          <div class="chart-card"><h3>Monthly Trends</h3>${lineChartSvg(analytics.monthly)}</div>
          <div class="chart-card"><h3>Most Lost Items (by category)</h3>
            <div class="chart-bars">${cats.slice(0, 6).map((c) => `<div class="chart-row"><span style="width:120px">${esc(c.name)}</span><div class="chart-bar-wrap"><div class="chart-bar" style="width:${(c.count / Math.max(...cats.map((x) => x.count), 1)) * 100}%"></div></div><span>${c.count}</span></div>`).join('')}</div>
          </div>
          <div class="chart-card"><h3>Campus Location Heat Map</h3>${heatmapHtml(locs)}</div>`;
      } else if (tab === 'audit') {
        panel = `
          <table class="data-table">
            <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>${logs.map((a) => `<tr>
              <td>${esc(a.date)}</td>
              <td>System</td>
              <td><strong>${esc(a.action)}</strong></td>
              <td>${esc(a.detail)}</td>
            </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:32px">No entries</td></tr>'}
            </tbody>
          </table>`;
      } else {
        panel = `
          <div class="card" style="max-width:560px;margin-top:4px">
            <div class="field"><label>AI Match Threshold</label><input value="${s.ai_threshold || 0.52}" disabled></div>
            <div class="field"><label>Item Retention Period (days)</label><input value="90" disabled></div>
            <div class="field"><label>Email Notifications</label><select disabled><option enabled>Enabled for matches and claims</option></select></div>
            <div class="field"><label>Email Template — Claim Approved</label><textarea disabled rows="3">Your claim has been verified. Visit the Lost & Found Office during office hours.</textarea></div>
            <p class="muted" style="font-size:13px">Categories: ${(s.categories || []).join(', ')}</p>
          </div>`;
      }
      return appShell(`
        <h1 class="page-title">More</h1>
        <p class="page-sub">Analytics, audit history, and system configuration</p>
        ${adminTabs(tabs, tab, 'set-admin-more-tab')}
        ${panel}
      `, path);
    }
    return appShell(`
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">Overview of campus lost & found activity</p>
      <div class="stats-row">
        <div class="stat-card"><div class="label">Total Reports</div><div class="value">${tracker.total_items || 0}</div></div>
        <div class="stat-card"><div class="label">Pending Reports</div><div class="value">${tracker.pending_items || 0}</div></div>
        <div class="stat-card"><div class="label">Pending Claims</div><div class="value">${tracker.pending_claims || 0}</div></div>
      </div>
      <div class="section-head" style="margin-top:28px"><h2>Recent Activity</h2></div>
      <table class="data-table">
        <thead><tr><th>Action</th><th>Details</th><th>Date</th></tr></thead>
        <tbody>${(state().activity || []).slice(0, 8).map((a) => `<tr>
          <td>${esc(a.action)}</td>
          <td>${esc(a.detail)}</td>
          <td>${esc(a.date)}</td>
        </tr>`).join('') || '<tr><td colspan="3">No activity</td></tr>'}
        </tbody>
      </table>
    `, 'admin');
  }

  window.Views = {
    pubHeader,
    siteFooter,
    shellWrap,
    appShell,
    viewHome,
    viewBrowse,
    viewLogin,
    viewRegister,
    viewDashboard,
    viewAiSearch,
    viewItemDetail,
    viewReport,
    viewTrack,
    viewMyReports,
    viewMyClaims,
    viewNotifications,
    viewProfile,
    viewFaq,
    viewOffice,
    viewAdmin,
    browseCard,
  };
})();

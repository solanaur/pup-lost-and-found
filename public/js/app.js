/* iBALIK — app core (routing, data, events) */
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const state = {
  user: null,
  items: [],
  stats: null,
  notifications: [],
  settings: null,
  matches: [],
  wizard: { step: 1 },
  reportType: 'lost',
  filters: { q: '', type: 'all', category: 'all', building: 'all', status: 'all', sort: 'newest' },
  browseView: 'active',
  browseSearch: '',
  browsePage: 1,
  aiQuery: '',
  activeTab: 'lost',
  claimsTab: 'active',
  adminReportsTab: 'all',
  adminReportsSelectedId: null,
  adminReportsSearch: '',
  adminReportsFilterType: 'all',
  adminReportsFilterStatus: 'all',
  adminReportsFilterLocation: 'all',
  adminReportsFilterOpen: false,
  adminReportsPage: 1,
  adminClaimsTab: 'pending',
  adminMoreTab: 'analytics',
  reportMatches: {},
  userMatches: [],
  adminMatches: [],
  aiMonitor: [],
  trackReport: null,
  lastSubmittedReport: null,
  aiAnalysis: null,
};

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const parts = hash.split('/').filter(Boolean);
  if (!parts.length) return { path: 'home', id: undefined };
  if (parts[0] === 'item' && parts[1]) {
    return { path: 'item', id: parts[1] };
  }
  if (parts[0] === 'track' && parts[1]) {
    return { path: 'track', id: parts[1] };
  }
  if (parts[0] === 'admin') {
    if (parts.length === 1) return { path: 'admin', id: undefined };
    return { path: `admin/${parts.slice(1).join('/')}`, id: undefined };
  }
  return { path: parts[0], id: parts[1] };
}

function isAdminRoute(path) {
  return path === 'admin' || path.startsWith('admin/');
}

function nav(path) {
  location.hash = `#/${path}`;
}

function isAuthed() { return Boolean(state.user); }
function isAdmin() { return state.user && state.user.role === 'admin'; }
function isStudent() { return state.user && state.user.role === 'student'; }

function guestPublicPaths() {
  return ['browse', 'ai-search', 'item', 'faq', 'office', 'report-lost', 'report-found', 'track', 'home'];
}

function filterItems(items) {
  let rows = [...items];
  const view = state.browseView || 'active';
  if (view === 'resolved') {
    rows = rows.filter((i) => i.status === 'claimed');
  } else {
    rows = rows.filter((i) => i.status === 'approved');
  }
  const q = (state.browseSearch || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter((i) => `${i.name} ${i.loc} ${i.description} ${i.item_category} ${i.color}`.toLowerCase().includes(q));
  }
  rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return rows;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function buildAiMonitor() {
  const lost = state.items.filter((i) => i.type === 'lost' && i.status === 'approved').slice(0, 5);
  const found = state.items.filter((i) => i.type === 'found' && i.status === 'approved');
  state.aiMonitor = lost.map((l, i) => {
    const f = found[i % found.length];
    return {
      lost: l.name,
      found: f ? f.name : '—',
      confidence: 70 + (i * 5) % 25,
      status: 'Pending Review',
    };
  });
  if (state.matches.length) {
    state.aiMonitor = state.matches.slice(0, 8).map((m) => ({
      lost: state.aiQuery || 'Lost report',
      found: m.name,
      confidence: m.confidence_pct,
      status: m.confidence_pct >= 80 ? 'Approved' : 'Pending Review',
    }));
  }
}

window.__APP__ = {
  state,
  esc,
  parseRoute,
  nav,
  isAuthed,
  isAdmin,
  isStudent,
  isAdminRoute,
  guestPublicPaths,
  filterItems,
  toast,
};

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

async function loadReportMatches() {
  try {
    const matches = await Api.myMatches();
    state.userMatches = matches;
    state.reportMatches = {};
    matches.forEach((m) => {
      const lid = m.lost_report_id;
      state.reportMatches[lid] = (state.reportMatches[lid] || 0) + 1;
    });
  } catch (_) {
    state.userMatches = [];
    state.reportMatches = {};
  }
}

async function loadAuthed() {
  if (!isAuthed()) return;
  try {
    const tasks = [Api.notifications().then((n) => { state.notifications = n; })];
    if (isStudent()) {
      tasks.push(Api.myItems().then(async (i) => {
        state.myItems = i;
        await loadReportMatches();
      }));
      tasks.push(Api.myClaims().then((c) => { state.myClaims = c; }));
    }
    if (isAdmin()) {
      tasks.push(Api.adminTracker().then((t) => { state.tracker = t; }));
      tasks.push(Api.pendingItems().then((i) => { state.pendingItems = i; }));
      tasks.push(Api.adminAllItems().then((i) => { state.adminAllItems = i; }).catch(() => { state.adminAllItems = state.pendingItems || []; }));
      tasks.push(Api.pendingClaims().then((c) => { state.pendingClaims = c; }));
      tasks.push(Api.adminAllClaims().then((c) => { state.adminAllClaims = c; }).catch(() => { state.adminAllClaims = state.pendingClaims || []; }));
      tasks.push(Api.pendingUsers().then((u) => { state.pendingUsers = u; }));
      tasks.push(Api.adminUsers().then((u) => { state.adminUsers = u; }));
      tasks.push(Api.adminActivity().then((a) => { state.activity = a; }));
      tasks.push(Api.adminAnalytics().then((a) => { state.analytics = a; }));
      tasks.push(Api.adminMatches().then((m) => { state.adminMatches = m; state.aiMonitor = m; }).catch(() => { state.adminMatches = []; }));
    }
    if (isStudent()) {
      tasks.push(Api.myMatches().then((m) => { state.userMatches = m; }).catch(() => { state.userMatches = []; }));
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
    buildAiMonitor();
    toast(state.matches.length ? `${state.matches.length} match(es) found` : 'No strong matches — add more details');
  } catch (e) {
    toast(e.message);
  }
}

async function render() {
  const V = window.Views;
  if (!V) return;
  const { path, id } = parseRoute();

  if (['dashboard', 'my-reports', 'my-claims', 'profile', 'notifications', 'ai-search'].includes(path) && !isAuthed()) {
    nav('login');
    return;
  }
  if (isAdminRoute(path) && !isAdmin()) {
    nav(isAuthed() ? 'dashboard' : 'login');
    return;
  }
  if (isAuthed() && (path === 'home' || path === 'login' || path === 'register')) {
    nav(isAdmin() ? 'admin' : 'dashboard');
    return;
  }

  if (path === 'ai-search' && isAuthed()) {
    try {
      state.userMatches = await Api.myMatches();
    } catch (_) {
      state.userMatches = state.userMatches || [];
    }
  }

  await loadCore();
  if (isAuthed()) await loadAuthed();

  if (path === 'track' && id) {
    try {
      state.trackReport = await Api.trackReport(id);
    } catch (_) {
      state.trackReport = null;
    }
  }

  if (path === 'admin/analytics') state.adminMoreTab = 'analytics';
  if (path === 'admin/audit') state.adminMoreTab = 'audit';
  if (path === 'admin/settings') state.adminMoreTab = 'settings';

  if (path === 'item' && id) {
    try {
      state.currentItem = await Api.item(id);
      const res = await Api.smartMatch({
        name: state.currentItem.name,
        loc: state.currentItem.loc,
        description: state.currentItem.description || state.currentItem.ai_description,
        type: state.currentItem.type,
        item_category: state.currentItem.item_category,
        color: state.currentItem.color,
        ai_tags: state.currentItem.ai_tags,
        ai_description: state.currentItem.ai_description,
        ai_detected_category: state.currentItem.ai_detected_category,
        ai_detected_colors: state.currentItem.ai_detected_colors,
        building: state.currentItem.building,
        photo_data: state.currentItem.photo_data,
        created_at: state.currentItem.created_at,
        date_lost: state.currentItem.date_lost,
      });
      state.matches = res.matches || [];
    } catch (_) {}
  }

  let html = '';
  switch (path) {
    case 'home': html = V.viewHome(); break;
    case 'login': html = V.viewLogin(); break;
    case 'register': html = V.viewRegister(); break;
    case 'dashboard': html = V.viewDashboard(); break;
    case 'ai-search': html = V.viewAiSearch(); break;
    case 'browse': html = V.viewBrowse(); break;
    case 'item': html = V.viewItemDetail(); break;
    case 'report-lost':
      if (state.reportType !== 'lost') state.wizard = { step: 1 };
      state.reportType = 'lost';
      html = V.viewReport('lost');
      break;
    case 'report-found':
      if (state.reportType !== 'found') state.wizard = { step: 1 };
      state.reportType = 'found';
      html = V.viewReport('found');
      break;
    case 'track': html = V.viewTrack(); break;
    case 'my-reports': html = V.viewMyReports(); break;
    case 'my-claims': html = V.viewMyClaims(); break;
    case 'notifications': html = V.viewNotifications(); break;
    case 'profile': html = V.viewProfile(); break;
    case 'faq': html = V.viewFaq(); break;
    case 'office': html = V.viewOffice(); break;
    case 'admin':
    case 'admin/reports':
    case 'admin/claims':
    case 'admin/users':
    case 'admin/ai':
    case 'admin/more':
    case 'admin/analytics':
    case 'admin/settings':
    case 'admin/audit':
      html = V.viewAdmin(path === 'admin/analytics' || path === 'admin/audit' || path === 'admin/settings' ? 'admin/more' : path);
      break;
    default:
      html = V.viewHome();
  }

  document.getElementById('app').innerHTML = html;
  bindEvents();
  syncAdminReportsFilters();
  hydrateIcons();
}

function collectAdminReportsFilters() {
  if (parseRoute().path !== 'admin/reports') return;
  const q = document.getElementById('adminReportsSearch');
  const type = document.getElementById('adminReportsFilterType');
  const status = document.getElementById('adminReportsFilterStatus');
  const loc = document.getElementById('adminReportsFilterLocation');
  if (q) state.adminReportsSearch = q.value;
  if (type) state.adminReportsFilterType = type.value;
  if (status) state.adminReportsFilterStatus = status.value;
  if (loc) state.adminReportsFilterLocation = loc.value;
}

function syncAdminReportsFilters() {
  if (parseRoute().path !== 'admin/reports') return;
  const el = document.getElementById('adminReportsSearch');
  if (el && state.adminReportsSearch != null) el.value = state.adminReportsSearch;
}

function exportAdminReportsCsv() {
  const all = state.adminAllItems || state.pendingItems || [];
  const headers = ['Code', 'Name', 'Type', 'Reporter', 'Email', 'Location', 'Date', 'Status'];
  const rows = all.map((i) => [
    i.code || i.id,
    i.name,
    i.type,
    i.reporter_name || i.by || '',
    i.reporter_email || '',
    i.loc,
    i.date,
    i.status,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ibalik-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast('Reports exported');
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

function closePubNav() {
  const header = document.querySelector('.pub-header');
  if (!header) return;
  header.classList.remove('is-nav-open');
  const toggle = header.querySelector('[data-action="toggle-pub-nav"]');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach((el) => {
    el.onclick = async (e) => {
      const action = el.dataset.action;
      if (action === 'toggle-pub-nav') {
        const header = el.closest('.pub-header');
        if (!header) return;
        const open = header.classList.toggle('is-nav-open');
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
        el.innerHTML = icon(open ? 'x' : 'menu', 22);
        hydrateIcons();
        return;
      }
      if (action === 'nav') {
        e.preventDefault();
        closePubNav();
        if (el.dataset.path === 'admin/claims') state.adminClaimsTab = 'pending';
        nav(el.dataset.path);
        return;
      }
      if (action === 'logout') { closePubNav(); Api.setToken(''); state.user = null; nav('home'); return; }
      if (action === 'open-item') { nav(`item/${el.dataset.id}`); return; }
      if (action === 'run-ai-search') {
        const inp = document.getElementById('aiSearchInput');
        await runAiSearch(inp?.value || state.aiQuery);
        render();
        return;
      }
      if (action === 'wizard-next') {
        collectWizardFields();
        const form = document.querySelector('[data-action="report-submit"]');
        const maxStep = 3;
        state.wizard.step = Math.min(maxStep, (state.wizard.step || 1) + 1);
        render();
        return;
      }
      if (action === 'wizard-prev') {
        state.wizard.step = Math.max(1, (state.wizard.step || 1) - 1);
        render();
        return;
      }
      if (action === 'trigger-photo') {
        document.getElementById('reportPhotoInput')?.click();
        return;
      }
      if (action === 'set-tab') { state.activeTab = el.dataset.tab; render(); return; }
      if (action === 'set-claims-tab') { state.claimsTab = el.dataset.tab; render(); return; }
      if (action === 'set-admin-reports-tab') {
        state.adminReportsTab = el.dataset.tab;
        state.adminReportsPage = 1;
        render();
        return;
      }
      if (action === 'select-admin-report') {
        state.adminReportsSelectedId = Number(el.dataset.id);
        render();
        return;
      }
      if (action === 'close-admin-report-panel') {
        state.adminReportsSelectedId = null;
        render();
        return;
      }
      if (action === 'admin-reports-page') {
        if (el.disabled) return;
        state.adminReportsPage = Number(el.dataset.page) || 1;
        render();
        return;
      }
      if (action === 'admin-export-reports') {
        exportAdminReportsCsv();
        return;
      }
      if (action === 'admin-request-changes') {
        toast('Change request noted — reporter will be notified when email templates are configured.');
        return;
      }
      if (action === 'toggle-admin-reports-filter') {
        state.adminReportsFilterOpen = !state.adminReportsFilterOpen;
        render();
        return;
      }
      if (action === 'toggle-ar-accordion') {
        const panel = el.closest('.ar-accordion');
        panel?.classList.toggle('is-open');
        return;
      }
      if (action === 'admin-edit-report') {
        nav(`item/${el.dataset.id}`);
        return;
      }
      if (action === 'toggle-admin-more-menu') {
        const menu = el.closest('.admin-more-menu');
        document.querySelectorAll('.admin-more-menu.open').forEach((m) => { if (m !== menu) m.classList.remove('open'); });
        menu?.classList.toggle('open');
        return;
      }
      if (action === 'admin-detail-thumb') {
        const src = el.dataset.src;
        const pos = el.dataset.pos;
        const main = document.getElementById('adminDetailPhoto');
        if (main && src) {
          main.src = src;
          if (pos) main.style.objectPosition = pos;
        }
        document.querySelectorAll('.ar-gallery-thumb').forEach((t) => t.classList.toggle('is-active', t === el));
        return;
      }
      if (action === 'admin-gallery-prev' || action === 'admin-gallery-next') {
        const thumbs = [...document.querySelectorAll('.ar-gallery-thumb')];
        if (!thumbs.length) return;
        const activeIdx = thumbs.findIndex((t) => t.classList.contains('is-active'));
        const nextIdx = action === 'admin-gallery-next'
          ? (activeIdx + 1) % thumbs.length
          : (activeIdx - 1 + thumbs.length) % thumbs.length;
        thumbs[nextIdx]?.click();
        return;
      }
      if (action === 'set-admin-claims-tab') { state.adminClaimsTab = el.dataset.tab; render(); return; }
      if (action === 'set-admin-more-tab') { state.adminMoreTab = el.dataset.tab; render(); return; }
      if (action === 'admin-approve-item') { await Api.approveItem(el.dataset.id); toast('Report approved'); render(); return; }
      if (action === 'admin-reject-item') { await Api.rejectItem(el.dataset.id); toast('Report rejected'); render(); return; }
      if (action === 'admin-delete-item') {
        const name = el.dataset.name || 'this item';
        if (!window.confirm(`Delete "${name}" permanently? This cannot be undone.`)) return;
        await Api.deleteItem(el.dataset.id);
        toast('Item deleted');
        if (Number(state.adminReportsSelectedId) === Number(el.dataset.id)) {
          state.adminReportsSelectedId = null;
        }
        if (parseRoute().path === 'item') nav('admin/reports');
        else render();
        return;
      }
      if (action === 'admin-claim-item') {
        openAdminClaimModal(Number(el.dataset.id));
        return;
      }
      if (action === 'approve-user') { await Api.approveUser(el.dataset.id); toast('User activated'); render(); return; }
      if (action === 'reject-user') { await Api.rejectUser(el.dataset.id); toast('Registration rejected'); render(); return; }
      if (action === 'admin-approve-claim') {
        const cid = el.dataset.id;
        const checklist = {
          student_id: Boolean(document.getElementById(`chk-id-${cid}`)?.checked),
          description: Boolean(document.getElementById(`chk-desc-${cid}`)?.checked),
          location: Boolean(document.getElementById(`chk-loc-${cid}`)?.checked),
          proof: Boolean(document.getElementById(`chk-proof-${cid}`)?.checked),
        };
        if (!checklist.student_id || !checklist.description) {
          toast('Complete verification checklist');
          return;
        }
        await Api.approveClaim(cid, { checklist });
        toast('Claim approved');
        render();
        return;
      }
      if (action === 'admin-reject-claim') {
        await Api.rejectClaim(el.dataset.id, 'Verification failed.');
        toast('Claim rejected');
        render();
        return;
      }
      if (action === 'read-notif') { await Api.readNotification(el.dataset.id); render(); return; }
      if (action === 'read-all-notif') { await Api.readAllNotifications(); render(); return; }
      if (action === 'open-claim-modal') { openClaimModal(el.dataset.id); return; }
      if (action === 'claim-item') {
        openClaimModal(el.dataset.id);
        return;
      }
      if (action === 'copy-track-link') {
        const url = el.dataset.url || location.href;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => toast('Tracking link copied'));
        } else toast(url);
        return;
      }
      if (action === 'set-browse-view') {
        state.browseView = el.dataset.view === 'resolved' ? 'resolved' : 'active';
        state.browsePage = 1;
        render();
        return;
      }
      if (action === 'browse-search') {
        const inp = document.getElementById('browseMainSearch');
        state.browseSearch = inp?.value || '';
        state.browsePage = 1;
        render();
        return;
      }
      if (action === 'browse-page') {
        const p = Number(el.dataset.page);
        if (p >= 1) { state.browsePage = p; render(); }
        return;
      }
      if (action === 'browse-map-view') {
        document.querySelector('.browse-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (action === 'browse-save') {
        el.classList.toggle('saved');
        toast(el.classList.contains('saved') ? 'Saved to bookmarks' : 'Removed from bookmarks');
        return;
      }
      if (action === 'gallery-pick') {
        const main = document.getElementById('detailMainImg');
        const lightboxBtn = document.querySelector('.detail-gallery-main[data-action="gallery-lightbox"]');
        if (main && el.dataset.src) {
          main.src = el.dataset.src;
          main.style.objectPosition = el.dataset.pos || '50% 50%';
        }
        if (lightboxBtn) lightboxBtn.dataset.src = el.dataset.src || '';
        document.querySelectorAll('.gallery-thumb').forEach((t) => t.classList.remove('active'));
        el.classList.add('active');
        return;
      }
      if (action === 'gallery-lightbox') {
        openLightbox(el.dataset.src || document.getElementById('detailMainImg')?.src, 'Item photo');
        return;
      }
      if (action === 'share-item') {
        const url = location.href;
        const title = state.currentItem ? `iBALIK — ${state.currentItem.name}` : 'iBALIK Item';
        if (navigator.share) {
          navigator.share({ title, url }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard'));
        } else {
          toast(url);
        }
        return;
      }
      if (action === 'admin-match-status') {
        await Api.updateMatchStatus(el.dataset.id, el.dataset.status);
        toast(`Match ${el.dataset.status}`);
        render();
        return;
      }
      if (action === 'use-ai-suggestions') {
        const a = state.wizard.aiAnalysis;
        if (!a) return toast('Upload a photo first');
        state.wizard.name = a.name || state.wizard.name;
        state.wizard.item_category = a.item_category || a.ai_detected_category;
        state.wizard.color = a.color || a.ai_detected_colors;
        state.wizard.brand = a.brand || state.wizard.brand;
        state.wizard.description = a.ai_description || a.description;
        toast('AI suggestions applied');
        render();
        return;
      }
      if (action === 'regenerate-ai') {
        if (!state.wizard.photo_data) return toast('Upload a photo first');
        try {
          await runPhotoAnalysis(state.wizard.photo_data, {
            name: state.wizard.name,
            description: state.wizard.description,
            type: document.querySelector('[data-action="report-submit"]')?.dataset.type || 'lost',
          });
          toast('Analysis regenerated');
          render();
        } catch (e) { toast(e.message); }
        return;
      }
      if (action === 'open-ai-match') {
        const target = el.dataset.foundId || el.dataset.lostId;
        if (target) nav(`item/${target}`);
        return;
      }
      if (action === 'view-user') {
        openUserModal(Number(el.dataset.id));
        return;
      }
      if (action === 'suspend-user') {
        await Api.suspendUser(el.dataset.id);
        toast('User suspended');
        render();
        return;
      }
      if (action === 'activate-user') {
        await Api.activateUser(el.dataset.id);
        toast('User activated');
        render();
        return;
      }
      if (action === 'go-login') {
        nav('login');
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
        toast('Signed in successfully');
        const claimItem = sessionStorage.getItem('ibalik_claim_item');
        if (claimItem && res.user.role === 'student') {
          sessionStorage.removeItem('ibalik_claim_item');
          nav(`item/${claimItem}`);
          return;
        }
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
        await Api.signup({
          full_name: fd.get('full_name'),
          username: fd.get('username'),
          email: fd.get('email'),
          course: fd.get('course'),
          year_level: fd.get('year_level'),
          password: fd.get('password'),
          id_photo_data: idPhotoData,
          avatar_data: avatarData,
        });
        toast('Registration submitted for verification');
        nav('login');
      } catch (err) { toast(err.message); }
    };
  }

  document.querySelectorAll('[data-action="id-upload"]').forEach((inp) => {
    inp.onchange = () => readFile(inp, (d) => { idPhotoData = d; });
  });

  document.querySelectorAll('[data-action="report-photo"]').forEach((inp) => {
    inp.onchange = async () => {
      readFile(inp, async (d) => {
        state.wizard.photo_data = d;
        toast('Photo attached — analyzing…');
        try {
          await runPhotoAnalysis(d);
        } catch (e) {
          toast(e.message || 'Analysis failed');
        }
        render();
      });
    };
  });

  const reportForm = document.querySelector('[data-action="report-submit"]');
  if (reportForm) {
    reportForm.onsubmit = async (e) => {
      e.preventDefault();
      const type = reportForm.dataset.type;
      const maxStep = 3;
      if ((state.wizard.step || 1) < maxStep) {
        collectWizardFields();
        state.wizard.step = maxStep;
        render();
        return;
      }
      collectWizardFields();
      try {
        const created = await Api.createItem({
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
          holder: state.wizard.holder,
          reporter_name: state.wizard.reporter_name,
          reporter_email: state.wizard.reporter_email,
          reporter_phone: state.wizard.reporter_phone,
          ai_description: state.wizard.ai_description,
          ai_tags: state.wizard.ai_tags,
          ai_detected_category: state.wizard.ai_detected_category,
          ai_detected_colors: state.wizard.ai_detected_colors,
          ai_confidence_score: state.wizard.ai_confidence_score,
        });
        state.wizard = { step: 1 };
        state.lastSubmittedReport = created;
        toast(type === 'found' ? 'Report submitted — pending admin review' : 'Lost report submitted — now active');
        nav(`track/${created.code}`);
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
        toast('Profile updated');
      } catch (err) { toast(err.message); }
    };
  }

  let browseSearchTimer;
  const browseSearch = document.getElementById('browseMainSearch');
  if (browseSearch) {
    browseSearch.addEventListener('input', () => {
      state.browseSearch = browseSearch.value;
      state.browsePage = 1;
      clearTimeout(browseSearchTimer);
      browseSearchTimer = setTimeout(() => render(), 250);
    });
  }

  let adminSearchTimer;
  const adminSearch = document.getElementById('adminReportsSearch');
  if (adminSearch) {
    adminSearch.addEventListener('input', () => {
      state.adminReportsSearch = adminSearch.value;
      state.adminReportsPage = 1;
      clearTimeout(adminSearchTimer);
      adminSearchTimer = setTimeout(() => render(), 250);
    });
  }
  ['adminReportsFilterType', 'adminReportsFilterStatus', 'adminReportsFilterLocation'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      if (id === 'adminReportsFilterType') state.adminReportsFilterType = el.value;
      if (id === 'adminReportsFilterStatus') state.adminReportsFilterStatus = el.value;
      if (id === 'adminReportsFilterLocation') state.adminReportsFilterLocation = el.value;
      state.adminReportsPage = 1;
      render();
    });
  });
}

function applyAiAnalysis(analysis) {
  state.wizard.aiAnalysis = analysis;
  state.wizard.ai_description = analysis.ai_description;
  state.wizard.ai_tags = analysis.ai_tags;
  state.wizard.ai_detected_category = analysis.ai_detected_category;
  state.wizard.ai_detected_colors = analysis.ai_detected_colors;
  state.wizard.ai_confidence_score = analysis.ai_confidence_score;
}

async function runPhotoAnalysis(photoData, opts = {}) {
  let client_hints = null;
  if (typeof window.analyzePhotoLocally === 'function') {
    try {
      client_hints = await window.analyzePhotoLocally(photoData);
    } catch (e) {
      console.warn('Local photo analysis failed', e);
    }
  }
  const form = document.querySelector('[data-action="report-submit"]');
  const analysis = await Api.analyzeImage({
    photo_data: photoData,
    client_hints,
    name: opts.name ?? state.wizard.name,
    description: opts.description ?? state.wizard.description,
    type: opts.type ?? form?.dataset.type ?? 'lost',
  });
  applyAiAnalysis(analysis);
  return analysis;
}

function collectWizardFields() {
  const form = document.querySelector('[data-action="report-submit"]');
  if (!form) return;
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) state.wizard[k] = v;
}

function openLightbox(src, alt) {
  if (!src) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay lightbox-overlay';
  overlay.innerHTML = `<div class="lightbox">
    <button type="button" class="lightbox-close" id="closeLightbox" aria-label="Close">${icon('x', 24)}</button>
    <img src="${esc(src)}" alt="${esc(alt || 'Photo')}">
  </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelector('#closeLightbox').onclick = () => overlay.remove();
  hydrateIcons();
}

function openUserModal(userId) {
  const fromAll = (state.adminUsers || []).find((x) => x.id === userId);
  const fromPending = (state.pendingUsers || []).find((x) => x.id === userId);
  const u = { ...fromAll, ...fromPending };
  if (!u.id) return toast('User not found');
  const idPhoto = u.id_photo_data || '';
  const hasId = idPhoto.length >= 30;
  const isPending = u.approval_status === 'pending' || Boolean(fromPending);
  const idBlock = hasId
    ? `<div class="user-id-section">
        <h4 class="user-id-label">Uploaded School ID</h4>
        <button type="button" class="user-id-thumb" data-action="open-lightbox" data-src="${idPhoto.replace(/"/g, '&quot;')}">
          <img src="${idPhoto.replace(/"/g, '&quot;')}" alt="School ID">
        </button>
        <p class="muted user-id-hint">Click image to enlarge</p>
      </div>`
    : `<div class="user-id-missing">No school ID on file. Ask the student to re-submit during registration.</div>`;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal modal-wide">
    <h3 style="margin:0 0 16px;color:var(--pup-maroon)">User Record</h3>
    <div class="user-record-grid">
      <div class="user-record-meta">
        <p><strong>Name:</strong> ${esc(u.full_name)}</p>
        <p><strong>Student #:</strong> ${esc(u.username)}</p>
        ${u.email ? `<p><strong>Email:</strong> ${esc(u.email)}</p>` : ''}
        ${u.course ? `<p><strong>Course:</strong> ${esc(u.course)}${u.year_level ? ` · ${esc(u.year_level)}` : ''}</p>` : ''}
        <p><strong>Role:</strong> ${esc(u.role || 'student')}</p>
        <p><strong>Status:</strong> ${esc(u.approval_status || 'pending')}</p>
        <p><strong>Last login:</strong> ${esc(u.last_login_at || '—')}</p>
      </div>
      ${idBlock}
    </div>
    <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap">
      ${isPending
    ? `<button type="button" class="btn btn-primary btn-sm" data-action="approve-user" data-id="${u.id}">Activate</button>
       <button type="button" class="btn btn-soft btn-sm" data-action="reject-user" data-id="${u.id}">Reject</button>`
    : u.approval_status === 'suspended'
      ? `<button type="button" class="btn btn-primary btn-sm" data-action="activate-user" data-id="${u.id}">Activate</button>`
      : u.role !== 'admin'
        ? `<button type="button" class="btn btn-soft btn-sm" data-action="suspend-user" data-id="${u.id}">Suspend</button>`
        : ''}
      <button type="button" class="btn btn-ghost btn-sm" id="closeUserModal">Close</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !overlay.contains(btn)) return;
    e.preventDefault();
    const act = btn.dataset.action;
    if (act === 'open-lightbox') {
      openLightbox(btn.dataset.src, 'School ID');
      return;
    }
    (async () => {
      if (act === 'suspend-user') { await Api.suspendUser(btn.dataset.id); toast('User suspended'); overlay.remove(); render(); }
      if (act === 'activate-user') { await Api.activateUser(btn.dataset.id); toast('User activated'); overlay.remove(); render(); }
      if (act === 'approve-user') { await Api.approveUser(btn.dataset.id); toast('User activated'); overlay.remove(); render(); }
      if (act === 'reject-user') { await Api.rejectUser(btn.dataset.id); toast('Registration rejected'); overlay.remove(); render(); }
    })();
  };
  overlay.querySelector('#closeUserModal').onclick = () => overlay.remove();
  hydrateIcons();
}

function openClaimLoginModal(itemId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">
    <h3 style="margin:0 0 12px;color:var(--pup-maroon)">Account Required</h3>
    <p style="font-size:14px;line-height:1.6;color:var(--muted);margin:0 0 20px">To protect ownership and prevent fraudulent claims, an account is required before claiming an item.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button type="button" class="btn btn-primary btn-block" id="claimLoginBtn">Login</button>
      <button type="button" class="btn btn-outline btn-block" id="claimRegisterBtn">Create Account</button>
      <button type="button" class="btn btn-ghost btn-block" id="closeClaimLogin">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#closeClaimLogin').onclick = () => overlay.remove();
  overlay.querySelector('#claimLoginBtn').onclick = () => {
    sessionStorage.setItem('ibalik_claim_item', String(itemId));
    overlay.remove();
    nav('login');
  };
  overlay.querySelector('#claimRegisterBtn').onclick = () => {
    sessionStorage.setItem('ibalik_claim_item', String(itemId));
    overlay.remove();
    nav('register');
  };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function claimPrefill(user) {
  if (!user) return {};
  const programSection = [user.course, user.year_level].filter(Boolean).join(' ');
  return {
    name: user.full_name || '',
    studentNumber: user.username || '',
    programSection,
    phone: user.phone || '',
    email: user.email || '',
  };
}

function claimIdentityFieldsHtml(prefill = {}) {
  return `
    <div class="claim-form-grid">
      <div class="field"><label>Full Name</label><input name="claimant_name" required placeholder="Juan Dela Cruz" value="${esc(prefill.name || '')}"></div>
      <div class="field"><label>Student Number</label><input name="claimant_student_number" required placeholder="2021-00001-PQ-0" value="${esc(prefill.studentNumber || '')}"></div>
      <div class="field" style="grid-column:1/-1"><label>Program and Section</label><input name="claimant_program_section" required placeholder="BSIT 3-1" value="${esc(prefill.programSection || '')}"></div>
      <div class="field"><label>Contact Number</label><input name="claimant_phone" required placeholder="09XX XXX XXXX" value="${esc(prefill.phone || '')}"></div>
      <div class="field"><label>Email Address</label><input name="claimant_email" type="email" required placeholder="you@iskolarngbayan.pup.edu.ph" value="${esc(prefill.email || '')}"></div>
    </div>`;
}

function readClaimIdentityFields(fd) {
  return {
    claimant_name: String(fd.get('claimant_name') || '').trim(),
    claimant_student_number: String(fd.get('claimant_student_number') || '').trim(),
    claimant_program_section: String(fd.get('claimant_program_section') || '').trim(),
    claimant_phone: String(fd.get('claimant_phone') || '').trim(),
    claimant_email: String(fd.get('claimant_email') || '').trim(),
  };
}

function findItemById(itemId) {
  const id = Number(itemId);
  if (state.currentItem?.id === id) return state.currentItem;
  const pools = [state.items, state.adminAllItems, state.myItems, state.pendingItems, state.liveItems];
  for (const pool of pools) {
    const hit = (pool || []).find((i) => i.id === id);
    if (hit) return hit;
  }
  return null;
}

function openAdminClaimModal(itemId) {
  const item = findItemById(itemId);
  const itemLabel = item?.name || 'this item';
  const isLost = item?.type === 'lost';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal modal-claim">
    <h3 style="margin:0 0 8px;color:var(--pup-maroon)">Mark as Claimed</h3>
    <p class="muted" style="font-size:14px;margin:0 0 16px">Record who claimed <strong>${esc(itemLabel)}</strong> before closing this ${isLost ? 'lost' : 'found'} report.</p>
    <form id="adminClaimForm">
      ${claimIdentityFieldsHtml()}
      <div class="field"><label>Notes (optional)</label><textarea name="description" rows="2" placeholder="Additional verification notes…"></textarea></div>
      <button type="submit" class="btn btn-primary btn-block">${icon('package-check', 16)} Mark as Claimed</button>
      <button type="button" class="btn btn-ghost btn-block" style="margin-top:8px" id="closeAdminClaim">Cancel</button>
    </form>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#closeAdminClaim').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelector('#adminClaimForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = readClaimIdentityFields(fd);
    payload.description = String(fd.get('description') || '').trim();
    try {
      await Api.claimItemAdmin(itemId, payload);
      toast('Item marked as claimed');
      overlay.remove();
      render();
    } catch (err) { toast(err.message); }
  };
  hydrateIcons();
}

function openClaimModal(itemId) {
  const user = state.user;
  const item = findItemById(Number(itemId));
  const isLost = item?.type === 'lost';
  const prefill = claimPrefill(user);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal modal-claim">
    <h3 style="margin:0 0 8px;color:var(--pup-maroon)">${isLost ? 'Mark as Recovered' : 'Submit Claim'}</h3>
    <p class="muted" style="font-size:14px;margin:0 0 16px">${isLost
    ? 'Confirm that you recovered this lost item. Campus staff will verify your details.'
    : 'Provide your student details and proof of ownership for the Lost &amp; Found Office.'}</p>
    <form id="claimForm">
      ${claimIdentityFieldsHtml(prefill)}
      <div class="field"><label>Describe unique features</label><textarea name="description" required placeholder="Contents, marks, or details only the owner would know"></textarea></div>
      <div class="field"><label>Upload proof photo</label><input type="file" accept="image/*" id="proofFile" required></div>
      <div class="field"><label>Valid ID photo (optional)</label><input type="file" accept="image/*" id="claimIdFile"></div>
      <button type="submit" class="btn btn-primary btn-block">${icon('shield-check', 16)} ${isLost ? 'Submit Recovery' : 'Submit Claim'}</button>
      <button type="button" class="btn btn-ghost btn-block" style="margin-top:8px" id="closeClaim">Cancel</button>
    </form>
  </div>`;
  document.body.appendChild(overlay);
  let proof = '';
  let idp = '';
  overlay.querySelector('#proofFile').onchange = (e) => readFile(e.target, (d) => { proof = d; });
  overlay.querySelector('#claimIdFile').onchange = (e) => readFile(e.target, (d) => { idp = d; });
  overlay.querySelector('#closeClaim').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelector('#claimForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!proof) return toast('Upload proof photo');
    const fd = new FormData(e.target);
    const payload = {
      item_id: Number(itemId),
      ...readClaimIdentityFields(fd),
      description: fd.get('description'),
      proof_data: proof,
      id_photo_data: idp,
    };
    try {
      if (user && user.role === 'student') await Api.submitClaim(payload);
      else await Api.submitGuestClaim(payload);
      toast(isLost ? 'Recovery submitted — pending verification' : 'Claim submitted — pending verification');
      overlay.remove();
      await loadAuthed();
      if (user && user.role === 'student') nav('my-claims');
      else nav(`item/${itemId}`);
    } catch (err) { toast(err.message); }
  };
  hydrateIcons();
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

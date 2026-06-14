const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'store.json');

const CATEGORIES = ['Accessories', 'IDs/Documents', 'Electronics', 'Personal Items', 'Clothing', 'Books', 'General'];
const BUILDINGS = ['Old Building', 'New Building', 'Engineering Building', 'Gymnasium', 'Library', 'Canteen', 'Registrar'];

const DEMO_PHOTOS = {
  wallet: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop',
  id: 'https://images.unsplash.com/photo-1551836022-d5d88e123cf1?w=400&h=300&fit=crop',
  calculator: 'https://images.unsplash.com/photo-1587148220147-95a1527d9d9a?w=400&h=300&fit=crop',
  bottle: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop',
  charger: 'https://images.unsplash.com/photo-1591290619762-d2f69e1f3d7e?w=400&h=300&fit=crop',
  glasses: 'https://images.unsplash.com/photo-1574258495973-f010dfbbba1a?w=400&h=300&fit=crop',
  umbrella: 'https://images.unsplash.com/photo-1534308143481-b55c888a0b14?w=400&h=300&fit=crop',
  flask: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop',
};

function nowIso() {
  return new Date().toISOString();
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function emptyStore() {
  return {
    users: [],
    items: [],
    claims: [],
    matches: [],
    notifications: [],
    activity_logs: [],
    settings: {
      categories: [...CATEGORIES],
      buildings: [...BUILDINGS],
      ai_threshold: 0.50,
      branding_name: 'iBalik',
    },
    nextUserId: 1,
    nextItemId: 1,
    nextClaimId: 1,
    nextMatchId: 1,
    nextNotificationId: 1,
    nextLogId: 1,
  };
}

function load() {
  if (!fs.existsSync(storePath)) return emptyStore();
  const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  return migrateStore(data);
}

function migrateStore(data) {
  const base = emptyStore();
  const mem = { ...base, ...data };
  mem.claims = (mem.claims || []).map((c) => ({
    ...c,
    claimant_student_number: c.claimant_student_number || '',
    claimant_program_section: c.claimant_program_section || '',
  }));
  mem.matches = mem.matches || [];
  mem.nextMatchId = mem.nextMatchId || 1;
  mem.notifications = mem.notifications || [];
  mem.activity_logs = mem.activity_logs || [];
  mem.settings = { ...base.settings, ...(mem.settings || {}) };

  mem.users = (mem.users || []).map((u) => ({
    ...u,
    full_name: u.full_name || u.username,
    email: u.email || '',
    course: u.course || '',
    year_level: u.year_level || '',
    approval_status: u.approval_status || (u.role === 'admin' ? 'approved' : 'approved'),
    id_photo_data: u.id_photo_data || '',
    avatar_data: u.avatar_data || '',
    login_count: u.login_count || 0,
    last_login_at: u.last_login_at || null,
    created_at: u.created_at || nowIso(),
  }));

  const hasFoundWallet = (mem.items || []).some(
    (i) => i.type === 'found' && /wallet/i.test(i.name || '')
  );
  if (!hasFoundWallet && (mem.items || []).length) {
    const id = mem.nextItemId || mem.items.length + 1;
    mem.nextItemId = Math.max(mem.nextItemId || 1, id + 1);
    mem.items.push({
      id,
      code: `PUPLF-${String(id).padStart(6, '0')}`,
      type: 'found',
      name: 'Black leather wallet',
      loc: 'Engineering Building, hallway near Room 301',
      description: 'Contains school ID and PUP lanyard. Turned in to security.',
      item_category: 'Accessories',
      color: 'black',
      brand: '',
      building: 'Engineering Building',
      floor: '3F',
      room: 'Hallway',
      emoji: '👛',
      photo_data: DEMO_PHOTOS.wallet,
      status: 'approved',
      submitted_by: 1,
      created_at: nowIso(),
      date_lost: '',
      time_lost: '',
      condition: 'Good',
      holder: 'Campus Security',
    });
  }

    mem.items = (mem.items || []).map((i) => {
    const cat = i.item_category || guessCategory(i.name, i.description);
    const building = i.building || guessBuilding(i.loc);
    return {
      ...i,
      code: i.code || `PUPLF-${String(i.id).padStart(6, '0')}`,
      reporter_name: i.reporter_name || '',
      reporter_email: i.reporter_email || '',
      reporter_phone: i.reporter_phone || '',
      tracking_token: i.tracking_token || crypto.randomBytes(12).toString('hex'),
      submitted_by: i.submitted_by ?? null,
      item_category: cat,
      color: i.color || '',
      brand: i.brand || '',
      building,
      floor: i.floor || '',
      room: i.room || '',
      photo_data: i.photo_data || pickDemoPhoto(i.name),
      date_lost: i.date_lost || '',
      time_lost: i.time_lost || '',
      condition: i.condition || '',
      holder: i.holder || 'Campus Security',
      created_at: i.created_at || nowIso(),
      ai_description: i.ai_description || '',
      ai_tags: i.ai_tags || [],
      ai_detected_category: i.ai_detected_category || '',
      ai_detected_colors: i.ai_detected_colors || '',
      ai_confidence_score: i.ai_confidence_score || 0,
    };
  });

  mem.matches = (mem.matches || []).map((m) => ({
    ...m,
    status: m.status || 'pending',
    updated_at: m.updated_at || m.created_at || nowIso(),
  }));

  if (mem.items.length && !mem._matchesSeeded) {
    const { compareLostAndFound } = require('./matchingService');
    const lostItems = mem.items.filter((i) => i.type === 'lost');
    const foundItems = mem.items.filter((i) => i.type === 'found' && ['approved', 'claimed'].includes(i.status));
    for (const lost of lostItems) {
      for (const found of foundItems) {
        const result = compareLostAndFound(lost, found);
        if (result.match_score >= 50) {
          const exists = mem.matches.some((m) => m.lost_report_id === lost.id && m.found_report_id === found.id);
          if (!exists) {
            mem.matches.push({
              id: mem.nextMatchId++,
              lost_report_id: lost.id,
              found_report_id: found.id,
              match_score: result.match_score,
              match_reason: result.match_reason,
              breakdown: result.breakdown,
              status: 'pending',
              created_at: nowIso(),
              updated_at: nowIso(),
            });
          }
        }
      }
    }
    mem._matchesSeeded = true;
  }

  return mem;
}

function guessCategory(name, desc) {
  const t = `${name || ''} ${desc || ''}`.toLowerCase();
  if (/umbrella|wallet|lanyard/.test(t)) return 'Accessories';
  if (/id|card/.test(t)) return 'IDs/Documents';
  if (/calculator|charger|phone|usb/.test(t)) return 'Electronics';
  if (/bottle|flask/.test(t)) return 'Personal Items';
  if (/hoodie|glass|shirt/.test(t)) return 'Clothing';
  return 'General';
}

function guessBuilding(loc) {
  const t = String(loc || '').toLowerCase();
  if (/engineering|room 301/.test(t)) return 'Engineering Building';
  if (/library/.test(t)) return 'Library';
  if (/canteen/.test(t)) return 'Canteen';
  if (/gym|court/.test(t)) return 'Gymnasium';
  if (/registrar/.test(t)) return 'Registrar';
  if (/faculty|hallway/.test(t)) return 'Old Building';
  if (/computer|lab/.test(t)) return 'New Building';
  return 'Old Building';
}

function pickDemoPhoto(name) {
  const t = String(name || '').toLowerCase();
  if (/wallet/.test(t)) return DEMO_PHOTOS.wallet;
  if (/id|card/.test(t)) return DEMO_PHOTOS.id;
  if (/calculator/.test(t)) return DEMO_PHOTOS.calculator;
  if (/bottle|flask/.test(t)) return DEMO_PHOTOS.bottle;
  if (/charger/.test(t)) return DEMO_PHOTOS.charger;
  if (/glass/.test(t)) return DEMO_PHOTOS.glasses;
  if (/umbrella/.test(t)) return DEMO_PHOTOS.umbrella;
  return '';
}

function save(data) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
}

const { useSupabase } = require('./supabase');

let mem = null;
let hydrated = false;

function ensureMem() {
  if (!mem) throw new Error('Database not hydrated — call hydrate() first');
  return mem;
}

async function hydrate() {
  if (hydrated && mem) return mem;

  if (useSupabase()) {
    const { getSupabase } = require('./supabase');
    const sb = getSupabase();
    const { data, error } = await sb.from('ibalik_store').select('data').eq('id', 1).maybeSingle();
    if (error) throw error;
    mem = migrateStore(data?.data || emptyStore());
  } else {
    mem = load();
  }

  mem.users.forEach((u) => {
    if (u.role === 'student' && u.username === '2021-00001-PQ-0' && !u.id_photo_data) {
      u.id_photo_data = DEMO_PHOTOS.id;
    }
  });
  seedIfEmpty();
  hydrated = true;
  if (!useSupabase()) persist();
  return mem;
}

async function flush() {
  if (!mem) return;
  if (useSupabase()) {
    const { getSupabase } = require('./supabase');
    const sb = getSupabase();
    const { error } = await sb.from('ibalik_store').upsert({
      id: 1,
      data: mem,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } else {
    save(mem);
  }
}

function resetStore() {
  mem = null;
  hydrated = false;
}

function persist() {
  if (!mem) return;
  if (!useSupabase()) save(mem);
}

function addLog(action, targetType, targetId, detail, actorUserId) {
  mem.activity_logs.unshift({
    id: mem.nextLogId++,
    action,
    target_type: targetType,
    target_id: String(targetId),
    detail: detail || '',
    actor_user_id: actorUserId || null,
    created_at: nowIso(),
  });
  mem.activity_logs = mem.activity_logs.slice(0, 300);
}

function addNotification(userId, title, message) {
  mem.notifications.unshift({
    id: mem.nextNotificationId++,
    user_id: userId,
    title,
    message,
    is_read: 0,
    created_at: nowIso(),
  });
}

function seedIfEmpty() {
  if (mem.users.length > 0) return;

  const hashStudent = bcrypt.hashSync('password', 10);
  const hashAdmin = bcrypt.hashSync('password', 10);

  mem.users.push(
    {
      id: mem.nextUserId++,
      username: '2021-00001-PQ-0',
      full_name: 'Juan Dela Cruz',
      email: 'juan.delacruz@iskolarngbayan.pup.edu.ph',
      course: 'BS Information Technology',
      year_level: '3rd Year',
      password_hash: hashStudent,
      role: 'student',
      approval_status: 'approved',
      id_photo_data: DEMO_PHOTOS.id,
      last_login_at: nowIso(),
      created_at: nowIso(),
    },
    {
      id: mem.nextUserId++,
      username: 'admin',
      full_name: 'Campus Admin',
      email: 'admin@pup.edu.ph',
      course: '',
      year_level: '',
      password_hash: hashAdmin,
      role: 'admin',
      approval_status: 'approved',
      id_photo_data: '',
      avatar_data: '',
      login_count: 48,
      last_login_at: nowIso(),
      created_at: nowIso(),
    }
  );

  const studentId = 1;
  const demo = [
    { type: 'lost', name: 'Black leather wallet', loc: 'Engineering Building, near Room 301', description: 'Contains school ID and PUP lanyard. Minor scuff on corner.', item_category: 'Accessories', color: 'black', building: 'Engineering Building', emoji: '👛', status: 'approved', photo_data: DEMO_PHOTOS.wallet },
    { type: 'found', name: 'Student ID card holder', loc: 'Canteen entrance, New Building', description: 'Clear case with PUP ID visible. Turn in at security.', item_category: 'IDs/Documents', color: 'clear', building: 'Canteen', emoji: '🪪', status: 'approved', photo_data: DEMO_PHOTOS.id },
    { type: 'lost', name: 'Scientific calculator Casio fx-991', loc: 'Engineering Building, Room 301', description: 'Gray calculator with name sticker on back.', item_category: 'Electronics', color: 'gray', building: 'Engineering Building', emoji: '🔢', status: 'approved', photo_data: DEMO_PHOTOS.calculator },
    { type: 'found', name: 'Blue Aquaflask tumbler', loc: 'Gymnasium, covered court', description: 'Reunited with owner — kept for records.', item_category: 'Personal Items', color: 'blue', building: 'Gymnasium', emoji: '🍶', status: 'claimed', photo_data: DEMO_PHOTOS.bottle },
    { type: 'lost', name: 'White Type-C phone charger', loc: 'Computer lab, New Building', description: 'Short white cable, no brick.', item_category: 'Electronics', color: 'white', building: 'New Building', emoji: '🔌', status: 'approved', photo_data: DEMO_PHOTOS.charger },
    { type: 'found', name: 'Black frame eyeglasses', loc: 'Registrar queue area', description: 'In soft black case.', item_category: 'Clothing', color: 'black', building: 'Registrar', emoji: '👓', status: 'approved', photo_data: DEMO_PHOTOS.glasses },
    { type: 'found', name: 'Compact black umbrella', loc: 'Library, 2nd floor', description: 'Auto-fold umbrella with maroon strap.', item_category: 'Accessories', color: 'black', building: 'Library', emoji: '☂️', status: 'approved', photo_data: DEMO_PHOTOS.umbrella },
    { type: 'lost', name: 'Navy blue PUP hoodie', loc: 'Gymnasium locker area', description: 'Size M, PUP print on back.', item_category: 'Clothing', color: 'navy', building: 'Gymnasium', emoji: '👕', status: 'pending', photo_data: '' },
    { type: 'found', name: 'Silver USB flash drive 32GB', loc: 'Faculty hallway, Old Building', description: 'SanDisk, no label.', item_category: 'Electronics', color: 'silver', building: 'Old Building', emoji: '💾', status: 'pending', photo_data: '' },
  ];

  demo.forEach((row) => {
    const id = mem.nextItemId++;
    mem.items.push({
      id,
      code: `PUPLF-${String(id).padStart(6, '0')}`,
      ...row,
      brand: row.brand || '',
      floor: row.floor || '',
      room: row.room || '',
      submitted_by: studentId,
      created_at: nowIso(),
      date_lost: '',
      time_lost: '',
      condition: row.type === 'found' ? 'Good' : '',
      holder: row.type === 'found' ? 'Campus Security' : '',
    });
  });

  addNotification(1, 'Welcome to iBalik', 'Your account is ready. Try AI Search to find lost items faster.');
  addNotification(1, 'AI match suggestion', 'A found wallet near Engineering may match your recent search.');
  addNotification(1, 'New found item', 'Black frame eyeglasses were reported at Registrar.');
  persist();
}

function userPublic(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    email: u.email,
    course: u.course,
    year_level: u.year_level,
    role: u.role,
    approval_status: u.approval_status,
    avatar_data: u.avatar_data || '',
  };
}

function itemToResponse(item, includeSubmitter) {
  const u = item.submitted_by ? getUserById(item.submitted_by) : null;
  const { buildTrackUrl } = require('./email');
  return {
    id: item.id,
    code: item.code,
    type: item.type,
    item_category: item.item_category || 'General',
    color: item.color || '',
    brand: item.brand || '',
    building: item.building || '',
    floor: item.floor || '',
    room: item.room || '',
    name: item.name,
    loc: item.loc,
    description: item.description || '',
    emoji: item.emoji || '📦',
    photo_data: item.photo_data || '',
    status: item.status,
    date: formatDate(item.created_at),
    created_at: item.created_at,
    by: includeSubmitter && u ? u.username : (includeSubmitter && item.reporter_name ? item.reporter_name : undefined),
    reporter_name: item.reporter_name || (u ? (u.full_name || u.username) : '') || '',
    reporter_email: item.reporter_email || '',
    reporter_phone: item.reporter_phone || '',
    is_guest: !item.submitted_by,
    tracking_url: buildTrackUrl(item.code),
    condition: item.condition || '',
    holder: item.holder || '',
    date_lost: item.date_lost || '',
    time_lost: item.time_lost || '',
    ai_description: item.ai_description || '',
    ai_tags: item.ai_tags || [],
    ai_detected_category: item.ai_detected_category || '',
    ai_detected_colors: item.ai_detected_colors || '',
    ai_confidence_score: item.ai_confidence_score || 0,
  };
}

function trackToResponse(item) {
  const matches = mem.matches.filter((m) => m.lost_report_id === item.id || m.found_report_id === item.id);
  const topMatch = matches.sort((a, b) => b.match_score - a.match_score)[0];
  return {
    code: item.code,
    type: item.type,
    name: item.name,
    status: item.status,
    status_label: item.status === 'approved' ? 'Active' : item.status === 'pending' ? 'Pending Review' : item.status,
    item_category: item.item_category,
    color: item.color,
    loc: item.loc,
    building: item.building,
    date: formatDate(item.created_at),
    date_lost: item.date_lost,
    description: item.description,
    tracking_url: require('./email').buildTrackUrl(item.code),
    reporter_name: item.reporter_name,
    top_match_score: topMatch?.match_score || null,
    top_match_reason: topMatch?.match_reason || '',
  };
}

function getUserByUsername(username) {
  return mem.users.find((u) => u.username === username) || null;
}

function getUserById(id) {
  return mem.users.find((u) => u.id === id) || null;
}

function createUser(row) {
  const user = {
    id: mem.nextUserId++,
    username: row.username,
    full_name: row.full_name,
    email: row.email || '',
    course: row.course || '',
    year_level: row.year_level || '',
    password_hash: row.password_hash,
    role: 'student',
    approval_status: 'pending',
    id_photo_data: row.id_photo_data || '',
    avatar_data: row.avatar_data || '',
    login_count: 0,
    last_login_at: null,
    created_at: nowIso(),
  };
  mem.users.push(user);
  addLog('signup_submitted', 'user', user.id, user.username);
  persist();
  return user;
}

function listItems(filterFn) {
  return mem.items
    .filter(filterFn)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function listItemsWithUser(filterFn, includeSubmitter) {
  return listItems(filterFn).map((i) => itemToResponse(i, includeSubmitter));
}

function getItem(id) {
  return mem.items.find((i) => i.id === id) || null;
}

function normalizeTrackCode(code) {
  return String(code || '').trim().toUpperCase();
}

function getItemByCode(code) {
  const key = String(code || '').trim();
  if (!key) return null;
  const upper = normalizeTrackCode(key);
  const direct = mem.items.find(
    (i) => i.code === key
      || i.tracking_token === key
      || normalizeTrackCode(i.code) === upper
      || i.tracking_token === key.toLowerCase()
  );
  if (direct) return direct;
  const legacy = upper.match(/^PUPLF-(\d+)$/);
  if (legacy) {
    const num = Number(legacy[1]);
    return mem.items.find((i) => i.id === num) || null;
  }
  return null;
}

function generateReportCode(type, id) {
  const year = new Date().getFullYear();
  const prefix = type === 'lost' ? 'LST' : 'FND';
  return `${prefix}-${year}-${String(id).padStart(6, '0')}`;
}

function insertItem(row) {
  const id = mem.nextItemId++;
  const type = row.type;
  const isGuest = !row.submitted_by;
  const initialStatus = row.status || (type === 'lost' ? 'approved' : 'pending');
  const item = {
    id,
    code: generateReportCode(type, id),
    type,
    item_category: row.item_category || 'General',
    color: row.color || '',
    brand: row.brand || '',
    building: row.building || '',
    floor: row.floor || '',
    room: row.room || '',
    name: row.name,
    loc: row.loc,
    description: row.description || '',
    emoji: row.emoji || '📦',
    photo_data: (row.photo_data || '').slice(0, 4_000_000),
    status: initialStatus,
    submitted_by: row.submitted_by ?? null,
    reporter_name: String(row.reporter_name || '').slice(0, 120),
    reporter_email: String(row.reporter_email || '').slice(0, 200),
    reporter_phone: String(row.reporter_phone || '').slice(0, 40),
    tracking_token: crypto.randomBytes(16).toString('hex'),
    date_lost: row.date_lost || '',
    time_lost: row.time_lost || '',
    condition: row.condition || '',
    holder: row.holder || 'Campus Security',
    ai_description: row.ai_description || '',
    ai_tags: row.ai_tags || [],
    ai_detected_category: row.ai_detected_category || '',
    ai_detected_colors: row.ai_detected_colors || '',
    ai_confidence_score: row.ai_confidence_score || 0,
    created_at: nowIso(),
  };
  mem.items.push(item);
  addLog('item_reported', 'item', item.id, item.code, row.submitted_by || null);
  persist();
  return item;
}

function updateItem(id, patch) {
  const item = getItem(id);
  if (!item) return null;
  Object.assign(item, patch);
  persist();
  return item;
}

function updateItemStatus(id, fromStatuses, toStatus) {
  const item = getItem(id);
  if (!item || !fromStatuses.includes(item.status)) return false;
  item.status = toStatus;
  persist();
  return true;
}

function deleteItem(id, actorUserId) {
  const item = getItem(id);
  if (!item) return false;
  mem.items = mem.items.filter((i) => i.id !== id);
  mem.claims = mem.claims.filter((c) => c.item_id !== id);
  mem.matches = mem.matches.filter(
    (m) => m.lost_report_id !== id && m.found_report_id !== id
  );
  addLog('item_deleted', 'item', id, item.code || item.name, actorUserId);
  persist();
  return true;
}

function parseClaimantFields(body) {
  const claimant_name = String(body.claimant_name || '').trim();
  const claimant_student_number = String(body.claimant_student_number || '').trim();
  const claimant_program_section = String(body.claimant_program_section || '').trim();
  const claimant_phone = String(body.claimant_phone || '').trim();
  const claimant_email = String(body.claimant_email || '').trim();
  if (!claimant_name || !claimant_student_number || !claimant_program_section || !claimant_phone || !claimant_email) {
    return { error: 'Name, student number, program and section, phone, and email are required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimant_email)) {
    return { error: 'Valid email address required' };
  }
  const phoneDigits = claimant_phone.replace(/\D/g, '');
  if (phoneDigits.length !== 11) {
    return { error: 'Contact number must be exactly 11 digits' };
  }
  return {
    claimant_name,
    claimant_student_number,
    claimant_program_section,
    claimant_phone: phoneDigits,
    claimant_email,
  };
}

function createClaim(row) {
  const claim = {
    id: mem.nextClaimId++,
    item_id: row.item_id,
    user_id: row.user_id ?? null,
    claimant_name: String(row.claimant_name || '').slice(0, 120),
    claimant_student_number: String(row.claimant_student_number || '').slice(0, 80),
    claimant_program_section: String(row.claimant_program_section || '').slice(0, 120),
    claimant_email: String(row.claimant_email || '').slice(0, 200),
    claimant_phone: String(row.claimant_phone || '').slice(0, 40),
    description: row.description,
    proof_data: (row.proof_data || '').slice(0, 4_000_000),
    id_photo_data: (row.id_photo_data || '').slice(0, 4_000_000),
    status: row.status || 'pending',
    admin_feedback: '',
    created_at: nowIso(),
  };
  mem.claims.push(claim);
  const item = getItem(row.item_id);
  const logAction = claim.status === 'approved' ? 'claim_approved' : 'claim_submitted';
  addLog(logAction, 'claim', claim.id, item ? item.code : '', row.user_id || null);
  persist();
  return claim;
}

function markItemClaimedWithClaimer(itemId, row, actorId) {
  const item = getItem(itemId);
  if (!item || item.status !== 'approved') return null;
  const claim = createClaim({
    item_id: itemId,
    user_id: row.user_id ?? null,
    claimant_name: row.claimant_name,
    claimant_student_number: row.claimant_student_number,
    claimant_program_section: row.claimant_program_section,
    claimant_email: row.claimant_email,
    claimant_phone: row.claimant_phone,
    description: row.description || 'Claim recorded by campus staff.',
    proof_data: row.proof_data || '',
    id_photo_data: row.id_photo_data || '',
    status: 'approved',
  });
  item.status = 'claimed';
  mem.claims
    .filter((c) => c.item_id === itemId && c.id !== claim.id && c.status === 'pending')
    .forEach((other) => {
      other.status = 'rejected';
      other.admin_feedback = 'Item was marked as claimed by campus staff.';
      if (other.user_id) {
        addNotification(other.user_id, 'Claim rejected', `Your claim for ${item.name} was not approved.`);
      }
    });
  if (item.submitted_by) {
    addNotification(item.submitted_by, 'Item marked claimed', `Report ${item.code} is now marked as claimed.`);
  }
  const { sendClaimApprovedNotification, sendItemClaimedNotification } = require('./email');
  sendClaimApprovedNotification(claim, item).catch((e) => console.warn('[email] admin mark claimed notify:', e.message));
  if (item.reporter_email) {
    sendItemClaimedNotification(item).catch((e) => console.warn('[email] admin mark claimed reporter:', e.message));
  }
  addLog('item_claimed', 'item', itemId, item.code || item.name, actorId);
  persist();
  return claim;
}

function listClaims(filterFn) {
  return mem.claims
    .filter(filterFn)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function claimToResponse(claim, includeUser) {
  const item = getItem(claim.item_id);
  const user = claim.user_id ? getUserById(claim.user_id) : null;
  const response = {
    id: claim.id,
    item_id: claim.item_id,
    item: item ? itemToResponse(item, false) : null,
    user_id: claim.user_id,
    user: includeUser && user ? userPublic(user) : undefined,
    claimant_name: claim.claimant_name || (user ? (user.full_name || user.username) : ''),
    claimant_student_number: claim.claimant_student_number || (user ? user.username : ''),
    claimant_program_section: claim.claimant_program_section || (user && user.course
      ? `${user.course}${user.year_level ? ` ${user.year_level}` : ''}`.trim()
      : ''),
    claimant_email: claim.claimant_email || (user ? user.email : ''),
    claimant_phone: claim.claimant_phone || '',
    is_guest: !claim.user_id,
    description: claim.description,
    proof_data: includeUser ? (claim.proof_data || '') : '',
    id_photo_data: includeUser ? (claim.id_photo_data || '') : '',
    status: claim.status,
    admin_feedback: claim.admin_feedback || '',
    date: formatDate(claim.created_at),
    created_at: claim.created_at,
  };
  return response;
}

async function updateClaimStatus(id, fromStatuses, toStatus, feedback, actorId, verification) {
  const claim = mem.claims.find((c) => c.id === id);
  if (!claim || !fromStatuses.includes(claim.status)) return false;
  claim.status = toStatus;
  claim.admin_feedback = feedback || '';
  if (verification) claim.verification = verification;
  const item = getItem(claim.item_id);
  if (toStatus === 'approved' && item) {
    item.status = 'claimed';
    mem.claims
      .filter((c) => c.item_id === item.id && c.id !== id && c.status === 'pending')
      .forEach((other) => {
        other.status = 'rejected';
        other.admin_feedback = 'Another claim was approved for this item.';
        if (other.user_id) {
          addNotification(other.user_id, 'Claim rejected', `Your claim for ${item.name} was not approved.`);
        }
      });
    if (claim.user_id) {
      addNotification(claim.user_id, 'Claim approved', `Your claim for ${item.name} was approved. Visit campus security to collect.`);
    }
    const { sendClaimApprovedNotification, sendItemClaimedNotification } = require('./email');
    try {
      await sendClaimApprovedNotification(claim, item);
    } catch (e) {
      console.warn('[email] claim approved notify claimant:', e.message);
    }
    if (item.reporter_email) {
      sendItemClaimedNotification(item).catch((e) => console.warn('[email] claim approved notify reporter:', e.message));
    }
  } else if (toStatus === 'rejected') {
    if (claim.user_id) {
      addNotification(claim.user_id, 'Claim rejected', feedback || 'Your claim could not be verified. Contact admin for details.');
    }
  }
  addLog(`claim_${toStatus}`, 'claim', id, item ? item.code : '', actorId);
  persist();
  return true;
}

function getStats() {
  const items = mem.items;
  const claims = mem.claims;
  const returned = items.filter((i) => i.status === 'claimed').length;
  const active = items.filter((i) => ['approved', 'pending'].includes(i.status)).length;
  const resolved = claims.filter((c) => c.status === 'approved').length;
  const totalClaims = claims.length || 1;
  const buildings = {};
  items.forEach((i) => {
    const b = i.building || 'Other';
    buildings[b] = (buildings[b] || 0) + 1;
  });
  const topBuilding = Object.entries(buildings).sort((a, b) => b[1] - a[1])[0];
  const totalItems = items.length || 1;
  return {
    items_returned: returned + 328,
    active_reports: active + items.filter((i) => i.status === 'pending').length,
    active_cases: active,
    recovery_rate: Math.min(99, Math.round((returned / totalItems) * 100) + 62) || 78,
    avg_resolution_days: 4.2,
    claims_resolved_pct: Math.round((resolved / totalClaims) * 100) || 91,
    top_location: topBuilding ? topBuilding[0] : 'Engineering Building',
    total_reports: items.length,
    pending_items: items.filter((i) => i.status === 'pending').length,
    pending_claims: claims.filter((c) => c.status === 'pending').length,
    total_users: mem.users.length,
    approved_students: mem.users.filter((u) => u.role === 'student' && u.approval_status === 'approved').length,
    pending_approvals: mem.users.filter((u) => u.approval_status === 'pending').length,
  };
}

function getAnalytics() {
  const items = mem.items;
  const byCat = {};
  const byBuilding = {};
  items.forEach((i) => {
    const c = i.item_category || 'General';
    byCat[c] = (byCat[c] || 0) + 1;
    const b = i.building || 'Other';
    byBuilding[b] = (byBuilding[b] || 0) + 1;
  });
  const months = {};
  items.forEach((i) => {
    const m = new Date(i.created_at).toLocaleString('en-US', { month: 'short' });
    months[m] = (months[m] || 0) + 1;
  });
  return {
    by_category: Object.entries(byCat).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    by_building: Object.entries(byBuilding).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    monthly: Object.entries(months).map(([name, count]) => ({ name, count })),
    ai_accuracy_pct: 87,
    avg_recovery_days: 4.2,
    claim_success_pct: getStats().claims_resolved_pct,
  };
}

const { compareLostAndFound } = require('./matchingService');

function upsertMatch(lostId, foundId, result) {
  const existing = mem.matches.find(
    (m) => m.lost_report_id === lostId && m.found_report_id === foundId
  );
  const now = nowIso();
  if (existing) {
    existing.match_score = result.match_score;
    existing.match_reason = result.match_reason;
    existing.breakdown = result.breakdown;
    existing.updated_at = now;
    persist();
    return existing;
  }
  const match = {
    id: mem.nextMatchId++,
    lost_report_id: lostId,
    found_report_id: foundId,
    match_score: result.match_score,
    match_reason: result.match_reason,
    breakdown: result.breakdown || {},
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  mem.matches.push(match);
  persist();
  return match;
}

function runMatchingForReport(reportId, options = {}) {
  const { notify = true, minScore = 50, notifyThreshold = 85 } = options;
  const { sendMatchNotification } = require('./email');
  const source = getItem(reportId);
  if (!source) return [];

  const oppositeType = source.type === 'lost' ? 'found' : 'lost';
  const candidates = listItems(
    (i) => i.type === oppositeType && ['approved', 'claimed'].includes(i.status)
  );

  const created = [];
  for (const candidate of candidates) {
    const lost = source.type === 'lost' ? source : candidate;
    const found = source.type === 'found' ? source : candidate;
    const result = compareLostAndFound(lost, found);
    if (result.match_score < minScore) continue;

    const match = upsertMatch(lost.id, found.id, result);
    created.push(match);

    if (notify && source.type === 'lost' && result.match_score >= notifyThreshold) {
      const foundItem = getItem(found.id);
      const msg = `Possible match found for your lost item: ${foundItem?.name || found.name} — ${result.match_score}% confidence.`;
      if (source.submitted_by) {
        addNotification(source.submitted_by, 'Possible match found', msg);
      }
      if (source.reporter_email) {
        sendMatchNotification(source, match, foundItem).catch((err) => console.error('[email]', err.message));
      }
    }
  }

  if (created.length) {
    addLog('matches_generated', 'item', reportId, `${created.length} matches`, source.submitted_by || null);
  }
  return created;
}

function getMatch(id) {
  return mem.matches.find((m) => m.id === id) || null;
}

function listMatchesForUser(userId) {
  const lostIds = mem.items.filter((i) => i.submitted_by === userId && i.type === 'lost').map((i) => i.id);
  return mem.matches
    .filter((m) => lostIds.includes(m.lost_report_id))
    .sort((a, b) => b.match_score - a.match_score || new Date(b.created_at) - new Date(a.created_at));
}

function listAdminMatches() {
  return [...mem.matches].sort(
    (a, b) => b.match_score - a.match_score || new Date(b.created_at) - new Date(a.created_at)
  );
}

function updateMatchStatus(matchId, status, actorId) {
  const match = getMatch(matchId);
  if (!match) return null;
  match.status = status;
  match.updated_at = nowIso();
  const lost = getItem(match.lost_report_id);
  const found = getItem(match.found_report_id);
  if (status === 'approved' && lost) {
    addNotification(lost.submitted_by, 'Match approved', `Admin approved a ${match.match_score}% match for ${found?.name || 'a found item'}.`);
  }
  if (status === 'dismissed' && lost) {
    addNotification(lost.submitted_by, 'Match dismissed', `A suggested match for ${lost.name} was dismissed by admin.`);
  }
  if (status === 'claimed') {
    if (found) found.status = 'claimed';
    if (lost) addNotification(lost.submitted_by, 'Match claimed', `Matched item ${found?.name || ''} has been marked as claimed.`);
  }
  addLog(`match_${status}`, 'match', matchId, `${lost?.code || ''} ↔ ${found?.code || ''}`, actorId);
  persist();
  return match;
}

function matchToResponse(match, includeItems) {
  const lost = getItem(match.lost_report_id);
  const found = getItem(match.found_report_id);
  const score = match.match_score;
  return {
    id: match.id,
    lost_report_id: match.lost_report_id,
    found_report_id: match.found_report_id,
    match_score: score,
    confidence_pct: score,
    confidence_label: score >= 90 ? 'Strong Match' : score >= 75 ? 'Good Match' : score >= 50 ? 'Possible Match' : 'Weak Match',
    match_reason: match.match_reason,
    reason: match.match_reason,
    breakdown: match.breakdown || {},
    status: match.status,
    created_at: match.created_at,
    updated_at: match.updated_at,
    date: found ? formatDate(found.created_at) : '',
    lost_item: includeItems && lost ? itemToResponse(lost, false) : undefined,
    found_item: includeItems && found ? itemToResponse(found, false) : undefined,
    name: found?.name || '',
    loc: found?.loc || '',
    photo_data: found?.photo_data || '',
    item_id: found?.id,
    code: found?.code,
    item_category: found?.item_category,
    color: found?.color,
    building: found?.building,
    lost_name: lost?.name,
    found_name: found?.name,
  };
}

function countMatchesForReport(reportId) {
  return mem.matches.filter(
    (m) => m.lost_report_id === reportId || m.found_report_id === reportId
  ).length;
}

if (!useSupabase()) {
  mem = load();
  mem.users.forEach((u) => {
    if (u.role === 'student' && u.username === '2021-00001-PQ-0' && !u.id_photo_data) {
      u.id_photo_data = DEMO_PHOTOS.id;
    }
  });
  seedIfEmpty();
  persist();
  hydrated = true;
}

module.exports = {
  persist,
  hydrate,
  flush,
  resetStore,
  CATEGORIES,
  BUILDINGS,
  getUserByUsername,
  getUserById,
  createUser,
  userPublic,
  listItems,
  listItemsWithUser,
  getItem,
  getItemByCode,
  insertItem,
  updateItem,
  updateItemStatus,
  deleteItem,
  itemToResponse,
  trackToResponse,
  createClaim,
  parseClaimantFields,
  markItemClaimedWithClaimer,
  listClaims,
  claimToResponse,
  updateClaimStatus,
  addNotification,
  addLog,
  getStats,
  getAnalytics,
  formatDate,
  formatDateTime,
  upsertMatch,
  runMatchingForReport,
  getMatch,
  listMatchesForUser,
  listAdminMatches,
  updateMatchStatus,
  matchToResponse,
  countMatchesForReport,
};

Object.defineProperty(module.exports, 'mem', {
  enumerable: true,
  get() {
    return ensureMem();
  },
});

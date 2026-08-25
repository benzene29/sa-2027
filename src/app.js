import { supabase, TRIP_ID } from './supabaseClient.js';
import { COUNTRY_SHAPES, MAP_VIEWBOX_STR } from './mapData.js';

// Same box the SVG uses (see .map-stage's aspect-ratio in style.css, which is
// this same width:height baked in as a CSS value) — reused so the scroll-focus
// math below always agrees with what's actually on screen.
const MAP_VB = MAP_VIEWBOX_STR.split(' ').map(Number);
const MAP_STAGE_RATIO = MAP_VB[2] / MAP_VB[3]; // width / height

// A small geometric jet silhouette — same shape as the favicon — used as a
// decorative mark next to the map heading.
const JET_ICON = '<svg class="jet-icon" viewBox="0 0 24 24" aria-hidden="true">' +
  '<polygon points="12,3 14.4,13.5 12,12 9.6,13.5"/>' +
  '<polygon points="12,10.5 3,17.5 9.6,15"/>' +
  '<polygon points="12,10.5 21,17.5 14.4,15"/>' +
  '<polygon points="10.3,15.8 8.6,20 11,18.2"/>' +
  '<polygon points="13.7,15.8 15.4,20 13,18.2"/>' +
'</svg>';

// Compass-rose watermark for the corner of the map card.
const COMPASS_ROSE =
  '<svg class="compass-rose" viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle class="compass-ring" cx="50" cy="50" r="45"/>' +
    '<line class="compass-tick" x1="50" y1="7" x2="50" y2="19"/>' +
    '<line class="compass-tick" x1="50" y1="81" x2="50" y2="93"/>' +
    '<line class="compass-tick" x1="7" y1="50" x2="19" y2="50"/>' +
    '<line class="compass-tick" x1="81" y1="50" x2="93" y2="50"/>' +
    '<polygon class="compass-needle" points="50,16 57,50 50,84 43,50"/>' +
    '<circle class="compass-hub" cx="50" cy="50" r="3"/>' +
    '<text class="compass-n" x="50" y="14" text-anchor="middle">N</text>' +
  '</svg>';

// Default trip content, carried over verbatim from the original artifact
// (votes reset to {} since votes are now keyed by Supabase user id, not typed names).
const DEFAULT_TRIP = {
  "title": "South America, full route.",
  "sub": "Toggle stops on/off, edit day counts, and add your own countries or activities — the tally at the top updates for everyone. Click “Place on map” on any stop to drop its pin. Changes sync live for anyone with this link.",
  "budget": 33,
  "moneyBudget": 0,
  "startDate": "2027-08-01",
  "votes": {},
  "pins": {"scl-arrival":{"x":24.03,"y":67.02},"bog":{"x":16.97,"y":12.28},"ctg":{"x":13.99,"y":4.13},"med":{"x":13.89,"y":10.07},"mindo":{"x":7.26,"y":18.96},"cotopaxi":{"x":7.94,"y":20.01},"banos":{"x":7.96,"y":21.03},"cuenca":{"x":6.79,"y":23.2},"cusco":{"x":21.3,"y":38.44},"rainbow":{"x":22.69,"y":38.9},"mp":{"x":20.1,"y":37.91},"santacruz":{"x":9.82,"y":32.71},"huayhuash":{"x":11.18,"y":33.77},"arequipa":{"x":22.19,"y":42.56},"colca":{"x":21.55,"y":41.41},"tambopata":{"x":26.81,"y":37.44},"ica":{"x":13.54,"y":39.22},"sucre":{"x":35.16,"y":46.36},"saltflats":{"x":30.55,"y":47.91},"atacama":{"x":29.09,"y":51.9},"chalten":{"x":19.4,"y":89.79},"ba":{"x":49.36,"y":68.67},"iguazu":{"x":57.5,"y":55.87},"rio":{"x":80.76,"y":51.9},"paraty":{"x":77.59,"y":52.34}},
  "regions": [
    {"country":"Chile","name":"Arrival from Auckland","deletable":false,"transitBefore":null,"stops":[{"id":"scl-arrival","name":"Santiago (landing)","note":"Long-haul from Auckland — set to 0 if it's a same-day connection, bump up if you want a night to recover","noteText":"","days":0,"included":true,"locked":true}]},
    {"country":"Colombia","name":"Caribbean & the Andes","deletable":false,"transitBefore":{"days":1,"label":"Santiago → Bogotá"},"stops":[{"id":"bog","name":"Bogotá (arrival)","note":"Gateway in, ease into altitude","noteText":"","days":1,"included":true,"locked":true},{"id":"ctg","name":"Cartagena","note":"Old town + Caribbean coast","noteText":"","days":2,"included":true,"locked":false},{"id":"med","name":"Medellín","note":"Vibrant city, day trips out","noteText":"","days":2,"included":true,"locked":false}]},
    {"country":"Ecuador","name":"Cloud Forest to Volcanoes","deletable":true,"transitBefore":{"days":1,"label":"Colombia → Ecuador"},"stops":[{"id":"mindo","name":"Mindo Cloud Forest","note":"Zipline / tubing, easy add-on","noteText":"","days":1,"included":true,"locked":false},{"id":"cotopaxi","name":"Cotopaxi Volcano","note":"2-day guided climb, ~$150pp — group mostly Maybe","noteText":"","days":2,"included":false,"locked":false},{"id":"banos","name":"Baños","note":"Adventure capital","noteText":"","days":2,"included":true,"locked":false},{"id":"cuenca","name":"Cuenca","note":"Colonial city, easy stop","noteText":"","days":1,"included":true,"locked":false}]},
    {"country":"Peru","name":"Andes & Amazon","deletable":true,"transitBefore":{"days":1,"label":"Ecuador → Peru"},"stops":[{"id":"cusco","name":"Cusco","note":"Base for the region, acclimatize here","noteText":"","days":3,"included":true,"locked":false},{"id":"rainbow","name":"Rainbow Mountain","note":"Day trip from Cusco","noteText":"","days":1,"included":true,"locked":false},{"id":"mp","name":"Machu Picchu","note":"Train + site — book early, gets pricey","noteText":"","days":2,"included":true,"locked":false},{"id":"santacruz","name":"Santa Cruz Trek","note":"4 days / 3 nights camping","noteText":"","days":4,"included":true,"locked":false},{"id":"huayhuash","name":"Mini Huayhuash Hike","note":"4 days / 3 nights, high altitude — mostly Maybe","noteText":"","days":4,"included":false,"locked":false},{"id":"arequipa","name":"Arequipa","note":"White city, culture","noteText":"","days":2,"included":true,"locked":false},{"id":"colca","name":"Colca Canyon","note":"Condors, flexible day/night","noteText":"","days":2,"included":true,"locked":false},{"id":"tambopata","name":"Tambopata","note":"Amazon rainforest — mostly Maybe","noteText":"","days":3,"included":false,"locked":false},{"id":"ica","name":"Ica + Nazca","note":"Lines + dunes, on the way from Lima","noteText":"","days":2,"included":true,"locked":false}]},
    {"country":"Bolivia","name":"Sucre & the Salt Flats","deletable":true,"transitBefore":{"days":1,"label":"Peru → Bolivia"},"stops":[{"id":"sucre","name":"Sucre","note":"White city, easy day or two","noteText":"","days":2,"included":true,"locked":false},{"id":"saltflats","name":"Salt Flats 4WD","note":"3 nights / 2 days, tour ends in Chile","noteText":"","days":3,"included":true,"locked":false}]},
    {"country":"Chile","name":"Atacama","deletable":true,"transitBefore":{"days":0,"label":"Bolivia → Chile (salt flat tour drops you in San Pedro)"},"stops":[{"id":"atacama","name":"San Pedro de Atacama","note":"Base for Valle de la Luna, desert & stargazing","noteText":"","days":3,"included":true,"locked":false}]},
    {"country":"Argentina","name":"Patagonia & Buenos Aires","deletable":true,"transitBefore":{"days":2,"label":"Chile → Patagonia (via Santiago)"},"stops":[{"id":"chalten","name":"El Chaltén + Los Glaciares","note":"Hiking capital + Perito Moreno area","noteText":"","days":3,"included":true,"locked":false},{"id":"ba","name":"Buenos Aires","note":"Boca Juniors game","noteText":"","days":2,"included":true,"locked":false}]},
    {"country":"Argentina / Brazil","name":"Iguazu Falls","deletable":true,"transitBefore":{"days":1,"label":"Buenos Aires → Iguazu"},"stops":[{"id":"iguazu","name":"Iguazu Falls","note":"Both sides if time allows","noteText":"","days":2,"included":true,"locked":false}]},
    {"country":"Brazil","name":"Atlantic Coast","deletable":true,"transitBefore":{"days":1,"label":"Iguazu → Rio"},"stops":[{"id":"rio","name":"Rio de Janeiro","note":"Christ the Redeemer + Maracanã","noteText":"","days":3,"included":true,"locked":false},{"id":"paraty","name":"Paraty","note":"Colonial coastal town","noteText":"","days":2,"included":true,"locked":false}]}
  ]
};

let app = null;
let saveBtn = null;
let state = null;
let currentUser = null;
let signOutFn = null;
let profiles = {}; // uid -> display name
let presence = {}; // uid -> { lastSeen: Date|null, activeStopId: string|null }
let myActiveStopId = null; // stop id the local person currently has focus inside, or null

let placingKey = null;
let dragState = null;
let stopDragState = null;
let saveTimer = null;
let saving = false;
let pendingResave = false;

let listenersBound = false;
let pollTimer = null;
let presenceTimer = null;
let countdownTimer = null;
let lastAppliedAt = null; // Date — newest trip_state.updated_at we've applied or saved ourselves

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function uid(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 9);
}

function myDisplayName() {
  if (profiles[currentUser.id]) return profiles[currentUser.id];
  return (currentUser.email || '').split('@')[0];
}

// A heartbeat lands roughly every 4s (see startPresenceHeartbeat) — anyone
// silent for 3 beats is treated as gone rather than merely between polls.
const PRESENCE_STALE_MS = 12000;

function isOnline(uid) {
  const p = presence[uid];
  return !!(p && p.lastSeen && (Date.now() - p.lastSeen.getTime()) < PRESENCE_STALE_MS);
}

function onlineUids() {
  return Object.keys(presence).filter(isOnline);
}

// Stable per-person color from their uid, so the same avatar reads the same
// color everywhere without needing to store one.
function presenceColor(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return 'hsl(' + (hash % 360) + ', 60%, 42%)';
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function renderAvatar(uid, extraClass) {
  const name = profiles[uid] || 'Someone';
  const label = uid === currentUser.id ? name + ' (you)' : name;
  return '<span class="avatar' + (extraClass ? ' ' + extraClass : '') + '" style="background:' + presenceColor(uid) + '" title="' + esc(label) + '">' +
    esc(initials(name)) + '</span>';
}

// Repaints presence (the header avatar cluster and each stop's "who's
// looking at this" badge) from the current `presence` map without touching
// the rest of the DOM — called after every poll so it stays live without
// forcing a full renderApp() (and the scroll/focus loss that'd cause) purely
// because someone's heartbeat ticked over.
function patchPresence() {
  const myUid = currentUser.id;
  const online = onlineUids();
  const globalUids = online.slice().sort((a, b) => (a === myUid ? -1 : b === myUid ? 1 : 0));
  const presenceRowEl = document.getElementById('presenceRow');
  if (presenceRowEl) presenceRowEl.innerHTML = globalUids.map((uid) => renderAvatar(uid)).join('');

  document.querySelectorAll('.stop').forEach((stopEl) => {
    const badge = stopEl.querySelector('[data-stop-presence]');
    if (!badge) return;
    const key = stopEl.dataset.key;
    const uids = online.filter((uid) => uid !== myUid && presence[uid] && presence[uid].activeStopId === key);
    badge.innerHTML = uids.map((uid) => renderAvatar(uid, 'small')).join('');
  });
}

function renderPresenceRow() {
  const myUid = currentUser.id;
  const uids = onlineUids().sort((a, b) => (a === myUid ? -1 : b === myUid ? 1 : 0));
  return '<div class="presence-row" id="presenceRow" title="Who has this open right now">' +
    uids.map((uid) => renderAvatar(uid)).join('') +
  '</div>';
}

async function sendPresence() {
  if (!currentUser) return;
  const now = new Date();
  presence[currentUser.id] = { lastSeen: now, activeStopId: myActiveStopId };
  patchPresence();
  const { error } = await supabase.from('profiles').update({ last_seen: now.toISOString(), active_stop_id: myActiveStopId }).eq('id', currentUser.id);
  if (error) console.error('presence heartbeat failed (has supabase/schema.sql been re-run for the last_seen/active_stop_id columns?):', error.message);
}

function startPresenceHeartbeat() {
  stopPresenceHeartbeat();
  sendPresence();
  presenceTimer = setInterval(() => {
    if (document.visibilityState === 'visible') sendPresence();
  }, 4000);
}

function stopPresenceHeartbeat() {
  if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
}

// Delegated on both focusin/focusout (app-level, survives renderApp's full
// innerHTML rebuilds) — the timeout lets focus land on its new target before
// we check where it ended up, which is simpler than reconciling the two
// events' relatedTarget separately.
function onFocusChange() {
  setTimeout(() => {
    const el = document.activeElement;
    const stopEl = el && el.closest ? el.closest('.stop') : null;
    const key = stopEl ? stopEl.dataset.key : null;
    if (key !== myActiveStopId) {
      myActiveStopId = key;
      sendPresence();
    }
  }, 0);
}

function findStopByKey(key) {
  for (const region of state.regions) {
    for (const stop of region.stops) {
      if (stop.id === key) return { stop, region };
    }
  }
  return null;
}

function computeGrandTotal() {
  let grand = 0;
  state.regions.forEach((region) => {
    region.stops.forEach((s) => { if (s.included) grand += Math.max(0, s.days || 0); });
    if (region.transitBefore) grand += Math.max(0, region.transitBefore.days || 0);
  });
  return grand;
}

function computeMoneyTotal() {
  let total = 0;
  state.regions.forEach((region) => {
    region.stops.forEach((s) => {
      if (s.included) {
        total += Math.max(0, s.price || 0);
        if (s.travelBefore) total += Math.max(0, s.travelBefore.price || 0);
      }
    });
    if (region.transitBefore) total += Math.max(0, region.transitBefore.price || 0);
  });
  return total;
}

function fmtMoney(n) {
  return '$' + Math.round(Math.max(0, n || 0)).toLocaleString('en-US');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseISODate(s) {
  if (!s) return null;
  const parts = String(s).split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysUTC(date, n) {
  return new Date(date.getTime() + n * 86400000);
}

function fmtDate(date) {
  return MONTH_NAMES[date.getUTCMonth()] + ' ' + date.getUTCDate();
}

function fmtRange(start, endInclusive) {
  if (!start) return '';
  if (start.getTime() === endInclusive.getTime()) return fmtDate(start);
  if (start.getUTCMonth() === endInclusive.getUTCMonth()) {
    return MONTH_NAMES[start.getUTCMonth()] + ' ' + start.getUTCDate() + '–' + endInclusive.getUTCDate();
  }
  return fmtDate(start) + ' – ' + fmtDate(endInclusive);
}

function computeSchedule() {
  const start = parseISODate(state.startDate);
  const stopDates = {}, transitDates = {}, regionSpans = {};
  if (!start) return { stopDates, transitDates, regionSpans, valid: false };
  let cursor = start;
  state.regions.forEach((region, idx) => {
    if (region.transitBefore) {
      const tdays = Math.max(0, region.transitBefore.days || 0);
      const tStart = cursor;
      const tEnd = addDaysUTC(cursor, Math.max(0, tdays - 1));
      transitDates[idx] = fmtRange(tStart, tEnd);
      cursor = addDaysUTC(cursor, tdays);
    }
    let regionStart = null, regionEnd = null;
    region.stops.forEach((stop) => {
      if (!stop.included) { stopDates[stop.id] = null; return; }
      const days = Math.max(0, stop.days || 0);
      const sStart = cursor;
      const sEnd = addDaysUTC(cursor, Math.max(0, days - 1));
      stopDates[stop.id] = { start: sStart, end: sEnd };
      if (!regionStart) regionStart = sStart;
      regionEnd = sEnd;
      cursor = addDaysUTC(cursor, days);
    });
    regionSpans[idx] = regionStart ? { start: regionStart, end: regionEnd } : null;
  });
  const grand = computeGrandTotal();
  const tripEnd = grand > 0 ? addDaysUTC(start, grand - 1) : start;
  return { stopDates, transitDates, regionSpans, valid: true, tripStart: start, tripEnd };
}

function computeCountdownParts() {
  const target = parseISODate(state.startDate);
  if (!target) return { valid: false };
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { valid: true, started: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    valid: true,
    started: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function countdownDisplay() {
  const p = computeCountdownParts();
  if (!p.valid) return { vals: { days: '–', hours: '–', minutes: '–', seconds: '–' }, note: 'Set a start date below to start the countdown' };
  if (p.started) return { vals: { days: 0, hours: 0, minutes: 0, seconds: 0 }, note: 'Bon voyage — the trip is underway!' };
  return { vals: { days: p.days, hours: p.hours, minutes: p.minutes, seconds: p.seconds }, note: '' };
}

const COUNTDOWN_UNITS = ['days', 'hours', 'minutes', 'seconds'];

function renderCountdown() {
  const { vals, note } = countdownDisplay();
  return '<section class="countdown-panel">' +
    '<div class="countdown-eyebrow">' + JET_ICON + 'Countdown to departure</div>' +
    '<div class="countdown-figures" id="countdownFigures">' +
      COUNTDOWN_UNITS.map((unit) =>
        '<div class="countdown-unit"><span class="countdown-num" data-cd="' + unit + '">' + esc(vals[unit]) + '</span>' +
          '<span class="countdown-unit-label">' + unit + '</span></div>'
      ).join('') +
    '</div>' +
    '<div class="countdown-note" id="countdownNote">' + esc(note) + '</div>' +
  '</section>';
}

function tickCountdown() {
  const figuresEl = document.getElementById('countdownFigures');
  if (!figuresEl) return;
  const { vals, note } = countdownDisplay();
  COUNTDOWN_UNITS.forEach((unit) => {
    const el = figuresEl.querySelector('[data-cd="' + unit + '"]');
    if (el) el.textContent = vals[unit];
  });
  const noteEl = document.getElementById('countdownNote');
  if (noteEl) noteEl.textContent = note;
}

const VOTE_CHOICES = ['yes', 'maybe', 'no'];
const VOTE_LABELS = { yes: 'Yes', maybe: 'Maybe', no: 'No' };

const TRAVEL_MODES = [
  { value: '', label: 'Mode…' },
  { value: 'flight', label: '✈ Flight' },
  { value: 'bus', label: '🚌 Bus' },
  { value: 'car', label: '🚗 Car' },
  { value: 'train', label: '🚆 Train' },
  { value: 'ferry', label: '⛴ Ferry' },
  { value: 'walk', label: '🚶 Walk' },
  { value: 'other', label: 'Other' },
];

// Ensures every stop after the first in a region carries a travelBefore
// object (and the first never does) — covers stops loaded from before this
// field existed, and re-establishes it after adds/removes/reorders. Also
// backfills price on stops and travelBefore for data saved before pricing
// existed.
function normalizeTravel(region) {
  region.stops.forEach((s, i) => {
    if (s.price == null) s.price = 0;
    if (i === 0) {
      s.travelBefore = null;
    } else if (!s.travelBefore) {
      s.travelBefore = { mode: '', duration: '', note: '', price: 0 };
    } else if (s.travelBefore.price == null) {
      s.travelBefore.price = 0;
    }
  });
}

function normalizeAllTravel() {
  state.regions.forEach(normalizeTravel);
  state.regions.forEach((r) => {
    if (!r.transitBefore) return;
    if (r.transitBefore.mode == null) r.transitBefore.mode = '';
    if (r.transitBefore.price == null) r.transitBefore.price = 0;
  });
}

function renderTravel(stop) {
  const t = stop.travelBefore;
  if (!t) return '';
  return '<div class="travel" data-key="' + esc(stop.id) + '">' +
    '<select class="travel-mode" data-travel-mode>' +
      TRAVEL_MODES.map((o) => '<option value="' + o.value + '"' + (t.mode === o.value ? ' selected' : '') + '>' + o.label + '</option>').join('') +
    '</select>' +
    '<input type="text" class="travel-duration" data-travel-duration placeholder="Time…" value="' + esc(t.duration) + '">' +
    '<span class="price-block"><input type="number" class="price-input small" min="0" step="1" value="' + esc(t.price || 0) + '" data-travel-price></span>' +
    '<span class="travel-note editable" contenteditable="true" data-placeholder="Travel notes…" data-travel-note>' + esc(t.note) + '</span>' +
  '</div>';
}

function renderVotes(stop) {
  const votes = state.votes[stop.id] || {};
  const myUid = currentUser.id;
  return '<div class="vote-row">' + VOTE_CHOICES.map((c) => {
    const uids = Object.keys(votes).filter((u) => votes[u] === c);
    const names = uids.map((u) => profiles[u] || 'Someone');
    const mine = votes[myUid] === c;
    return '<button type="button" class="vote-btn' + (mine ? ' mine' : '') + '" data-vote="' + c + '"' +
      (names.length ? ' title="' + esc(names.join(', ')) + '"' : '') + '>' +
      VOTE_LABELS[c] + ' <span class="vote-count">' + names.length + '</span>' +
    '</button>';
  }).join('') + '</div>';
}

function renderStop(stop, schedule) {
  const excludedClass = stop.included ? '' : ' excluded';
  const checked = stop.included ? ' checked' : '';
  const disabledDay = stop.included ? '' : ' disabled';
  const deleteBtn = stop.locked ? '' : '<button type="button" class="link-btn danger" data-delete>Remove</button>';
  const dateInfo = schedule.valid ? schedule.stopDates[stop.id] : null;
  const dateText = dateInfo ? fmtRange(dateInfo.start, dateInfo.end) : '';
  const handle = stop.locked
    ? '<span class="stop-handle locked" aria-hidden="true"></span>'
    : '<span class="stop-handle" aria-hidden="true" title="Drag to reorder">⠿</span>';
  return '<div class="stop' + excludedClass + '" data-key="' + esc(stop.id) + '">' +
    handle +
    '<input type="checkbox" data-toggle' + checked + (stop.locked ? ' disabled' : '') + '>' +
    '<div>' +
      '<div class="stop-name editable" contenteditable="true" data-placeholder="Name this activity…">' + esc(stop.name) + '</div>' +
      '<div class="stop-note editable" contenteditable="true" data-placeholder="Add a short description…">' + esc(stop.note) + '</div>' +
      '<div class="note-text editable" contenteditable="true" data-placeholder="Add a note…">' + esc(stop.noteText) + '</div>' +
      renderVotes(stop) +
      '<div class="stop-controls"><button type="button" class="link-btn" data-place>Place on map</button>' + deleteBtn +
        '<span class="stop-presence" data-stop-presence></span></div>' +
    '</div>' +
    '<div class="day-block">' +
      '<input type="number" class="day-input" min="0" value="' + esc(stop.days) + '" data-days' + disabledDay + '>' +
      '<div class="stop-date" data-dates>' + esc(dateText) + '</div>' +
      '<span class="price-block"><input type="number" class="price-input" min="0" step="1" value="' + esc(stop.price || 0) + '" data-price' + disabledDay + '></span>' +
    '</div>' +
  '</div>';
}

function renderRegionBlock(region, idx, schedule) {
  let html = '';
  if (region.transitBefore) {
    const t = region.transitBefore;
    const unit = (parseInt(t.days, 10) === 1) ? 'day' : 'days';
    const transitDateText = schedule.valid ? (schedule.transitDates[idx] || '') : '';
    html += '<div class="transit" data-region-idx="' + idx + '">' +
      '<span class="transit-line"><input type="number" min="0" value="' + esc(t.days) + '" data-transit> <span data-unit>' + unit + '</span></span>' +
      '<select class="transit-mode" data-transit-mode>' +
        TRAVEL_MODES.map((o) => '<option value="' + o.value + '"' + ((t.mode || '') === o.value ? ' selected' : '') + '>' + o.label + '</option>').join('') +
      '</select>' +
      '<span class="price-block"><input type="number" class="price-input small" min="0" step="1" value="' + esc(t.price || 0) + '" data-transit-price></span>' +
      '<span class="transit-label editable" contenteditable="true" data-placeholder="Flight / bus leg…">' + esc(t.label) + '</span>' +
      '<span class="transit-dates" data-transit-dates>' + esc(transitDateText) + '</span>' +
    '</div>';
  }
  const delRegionBtn = region.deletable ? '<button type="button" class="link-btn danger" data-delete-region>Remove country</button>' : '';
  const regionTotal = region.stops.reduce((sum, s) => sum + (s.included ? Math.max(0, s.days || 0) : 0), 0);
  const span = schedule.valid ? schedule.regionSpans[idx] : null;
  const regionDateText = span ? fmtRange(span.start, span.end) : '';
  html += '<section class="region" data-region-idx="' + idx + '">' +
    '<div class="region-head">' +
      '<div class="region-title-block">' +
        '<span class="region-country editable" contenteditable="true" data-placeholder="Country…">' + esc(region.country) + '</span>' +
        '<span class="region-name editable" contenteditable="true" data-placeholder="Region name…">' + esc(region.name) + '</span>' +
      '</div>' +
      '<div class="region-actions"><span class="region-tally"><b data-tally>' + regionTotal + '</b> days</span>' +
        '<span class="region-dates" data-region-dates>' + esc(regionDateText) + '</span>' + delRegionBtn + '</div>' +
    '</div>' +
    '<div class="stops">' + region.stops.map((s) => renderTravel(s) + renderStop(s, schedule)).join('') +
      '<button type="button" class="add-stop-btn" data-add-stop>+ Add activity</button>' +
    '</div>' +
  '</section>';
  return html;
}

function renderChipRow() {
  return state.regions.map((region, idx) => {
    const pinned = !region.deletable;
    return '<div class="country-chip' + (pinned ? ' pinned' : '') + '" data-region-idx="' + idx + '" data-pinned="' + (pinned ? '1' : '0') + '">' +
      (pinned ? '' : '<span class="chip-handle" aria-hidden="true" title="Drag to reorder">⠿</span>') +
      '<span class="chip-label"><span class="chip-country">' + esc(region.country) + '</span><span class="chip-region">' + esc(region.name) + '</span></span>' +
    '</div>';
  }).join('');
}

function fixTransitAdjacency(oldOrder) {
  const oldPrevCountry = new Map();
  oldOrder.forEach((r, i) => { oldPrevCountry.set(r, i > 0 ? oldOrder[i - 1].country : null); });
  state.regions.forEach((r, i) => {
    const newPrev = i > 0 ? state.regions[i - 1].country : null;
    if (i === 0) {
      r.transitBefore = null;
    } else if (newPrev !== oldPrevCountry.get(r)) {
      const days = (r.transitBefore && r.transitBefore.days != null) ? r.transitBefore.days : 1;
      const mode = (r.transitBefore && r.transitBefore.mode) || '';
      const price = (r.transitBefore && r.transitBefore.price) || 0;
      r.transitBefore = { days, mode, price, label: newPrev + ' → ' + r.country };
    }
  });
}

function chipSiblings(d) {
  return Array.prototype.slice.call(d.chipRowEl.children).filter((el) => el.classList.contains('country-chip') && el !== d.chipEl);
}

function onChipPointerDown(e) {
  const handle = e.target.closest('.chip-handle');
  if (!handle) return;
  const chipEl = handle.closest('.country-chip');
  if (!chipEl || chipEl.dataset.pinned === '1') return;
  const idx = parseInt(chipEl.dataset.regionIdx, 10);
  const region = state.regions[idx];
  if (!region) return;
  let minIdx = 0;
  while (minIdx < state.regions.length && !state.regions[minIdx].deletable) minIdx++;

  const chipRowEl = chipEl.parentElement;
  const rect = chipEl.getBoundingClientRect();

  const gap = document.createElement('div');
  gap.className = 'chip-gap';
  gap.style.width = rect.width + 'px';
  gap.style.height = rect.height + 'px';
  chipRowEl.insertBefore(gap, chipEl);

  document.body.appendChild(chipEl);
  chipEl.classList.add('dragging');
  chipEl.style.position = 'fixed';
  chipEl.style.left = rect.left + 'px';
  chipEl.style.top = rect.top + 'px';
  chipEl.style.width = rect.width + 'px';
  chipEl.style.zIndex = '60';
  chipEl.style.pointerEvents = 'none'; // so elementFromPoint below hits the chip underneath, not the dragged one

  dragState = {
    region, chipEl, chipRowEl, gap, minIdx,
    startClientX: e.clientX,
    startClientY: e.clientY,
    baseLeft: rect.left,
    baseTop: rect.top,
    currentIdx: Math.max(0, idx - minIdx),
    originalOrder: state.regions.slice(),
  };
  try { handle.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
}

function onChipPointerMove(e) {
  const d = dragState;
  if (!d) return;
  d.chipEl.style.left = (d.baseLeft + (e.clientX - d.startClientX)) + 'px';
  d.chipEl.style.top = (d.baseTop + (e.clientY - d.startClientY)) + 'px';

  const siblings = chipSiblings(d); // real chips excluding the dragged one and the gap
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const overChip = el ? el.closest('.country-chip') : null;
  if (!overChip || overChip.dataset.pinned === '1' || siblings.indexOf(overChip) === -1) return;
  const overIdx = siblings.indexOf(overChip);
  if (overIdx < d.minIdx) return;
  const r = overChip.getBoundingClientRect();
  const before = e.clientX < r.left + r.width / 2;
  let idx = before ? overIdx - d.minIdx : overIdx - d.minIdx + 1;
  idx = Math.max(0, Math.min(siblings.length - d.minIdx, idx));
  if (idx === d.currentIdx) return;
  d.currentIdx = idx;

  flipMove(siblings, () => {
    const beforeEl = siblings[d.minIdx + idx] || null;
    d.chipRowEl.insertBefore(d.gap, beforeEl);
  });
}

function onChipPointerUp() {
  const d = dragState;
  if (!d) return;
  dragState = null;
  d.chipEl.remove();
  d.gap.remove();

  const fromIdx = state.regions.indexOf(d.region);
  const others = state.regions.filter((r) => r !== d.region);
  const targetIdx = Math.min(d.minIdx + d.currentIdx, others.length);
  others.splice(targetIdx, 0, d.region);
  const oldOrder = d.originalOrder;
  state.regions = others;
  if (fromIdx !== targetIdx) fixTransitAdjacency(oldOrder);

  renderApp();
  if (fromIdx !== targetIdx) scheduleSave();
}

// Animates the elements in `items` from wherever they were before `mutate()` ran
// to wherever they end up after — a small FLIP (First-Last-Invert-Play) so a DOM
// reorder reads as a slide instead of a jump.
const REDUCE_MOTION = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function flipMove(items, mutate) {
  const first = items.map((el) => el.getBoundingClientRect());
  mutate();
  if (REDUCE_MOTION) return;
  items.forEach((el, i) => {
    const last = el.getBoundingClientRect();
    const dx = first[i].left - last.left;
    const dy = first[i].top - last.top;
    if (!dx && !dy) return;
    el.style.transition = 'none';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    el.getBoundingClientRect(); // force a layout flush so the transform above is committed
    requestAnimationFrame(() => {
      el.style.transition = 'transform .18s ease';
      el.style.transform = '';
    });
  });
}

function stopSiblings(d) {
  return Array.prototype.slice.call(d.stopsEl.children).filter((el) => el.classList.contains('stop') && el !== d.stopEl);
}

function onStopPointerDown(e) {
  const handle = e.target.closest('.stop-handle');
  if (!handle || handle.classList.contains('locked')) return;
  const stopEl = handle.closest('.stop');
  const regionEl = stopEl.closest('.region');
  const regionIdx = parseInt(regionEl.dataset.regionIdx, 10);
  const region = state.regions[regionIdx];
  const stop = region.stops.find((s) => s.id === stopEl.dataset.key);
  if (!stop) return;
  let minIdx = 0;
  while (minIdx < region.stops.length && region.stops[minIdx].locked) minIdx++;

  const stopsEl = stopEl.parentElement;
  const rect = stopEl.getBoundingClientRect();

  const gap = document.createElement('div');
  gap.className = 'stop-gap';
  gap.style.height = rect.height + 'px';
  stopsEl.insertBefore(gap, stopEl);

  document.body.appendChild(stopEl);
  stopEl.classList.add('dragging');
  stopEl.style.position = 'fixed';
  stopEl.style.left = rect.left + 'px';
  stopEl.style.top = rect.top + 'px';
  stopEl.style.width = rect.width + 'px';
  stopEl.style.zIndex = '60';

  stopDragState = {
    regionIdx, region, stop, stopEl, stopsEl, gap, minIdx,
    startClientY: e.clientY,
    baseTop: rect.top,
    currentIdx: region.stops.indexOf(stop) - minIdx >= 0 ? region.stops.indexOf(stop) - minIdx : 0,
  };
  try { handle.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
}

function onStopPointerMove(e) {
  const d = stopDragState;
  if (!d) return;
  d.stopEl.style.top = (d.baseTop + (e.clientY - d.startClientY)) + 'px';

  const siblings = stopSiblings(d); // real stops, excluding the dragged one and the gap
  let idx = siblings.length - d.minIdx;
  for (let i = d.minIdx; i < siblings.length; i++) {
    const r = siblings[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { idx = i - d.minIdx; break; }
  }
  if (idx === d.currentIdx) return;
  d.currentIdx = idx;

  flipMove(siblings, () => {
    const before = siblings[d.minIdx + idx] || null;
    d.stopsEl.insertBefore(d.gap, before);
  });
}

function onStopPointerUp() {
  const d = stopDragState;
  if (!d) return;
  stopDragState = null;
  d.stopEl.remove();
  d.gap.remove();

  const fromIdx = d.region.stops.indexOf(d.stop);
  const others = d.region.stops.filter((s) => s !== d.stop);
  const targetIdx = Math.min(d.minIdx + d.currentIdx, others.length);
  others.splice(targetIdx, 0, d.stop);
  d.region.stops = others;
  normalizeTravel(d.region);

  renderApp();
  if (fromIdx !== targetIdx) scheduleSave();
}

function onPointerDown(e) {
  if (e.target.closest('.chip-handle')) { onChipPointerDown(e); return; }
  if (e.target.closest('.stop-handle')) { onStopPointerDown(e); return; }
  if (e.target.closest('#mapViewport')) { onMapPointerDown(e); return; }
}

function onPointerMove(e) {
  if (dragState) { onChipPointerMove(e); return; }
  if (stopDragState) { onStopPointerMove(e); return; }
  if (mapDragState) { onMapPointerMove(e); return; }
}

function onPointerUp(e) {
  if (dragState) { onChipPointerUp(e); return; }
  if (stopDragState) { onStopPointerUp(e); return; }
  if (mapDragState) { onMapPointerUp(e); return; }
}

function renderPins() {
  let html = '';
  for (const key in state.pins) {
    if (!Object.prototype.hasOwnProperty.call(state.pins, key)) continue;
    const found = findStopByKey(key);
    if (!found) continue;
    const p = state.pins[key];
    html += '<div class="pin' + (found.stop.included ? '' : ' excluded-pin') + '" data-key="' + esc(key) + '" tabindex="0" style="left:' + p.x.toFixed(2) + '%;top:' + p.y.toFixed(2) + '%"><span class="pin-dot"></span><span class="pin-label">' + esc(found.stop.name) + '</span></div>';
  }
  return html;
}

function renderApp() {
  const grand = computeGrandTotal();
  const budget = Math.max(0, state.budget || 0);
  const over = grand > budget;
  const pct = budget > 0 ? Math.min((grand / budget) * 100, 100) : 0;
  const moneyTotal = computeMoneyTotal();
  const moneyBudget = Math.max(0, state.moneyBudget || 0);
  const moneyOver = moneyTotal > moneyBudget;
  const moneyPct = moneyBudget > 0 ? Math.min((moneyTotal / moneyBudget) * 100, 100) : 0;
  const schedule = computeSchedule();
  const tripDatesText = schedule.valid
    ? fmtRange(schedule.tripStart, schedule.tripEnd) + ', ' + schedule.tripEnd.getUTCFullYear()
    : 'Set a start date to see the calendar';
  app.innerHTML =
    '<header class="top">' +
      '<div class="eyebrow-row"><span class="eyebrow">Andes → Patagonia → Atlantic</span>' + renderPresenceRow() +
        '<span class="sync-badge" id="syncBadge">Live shared plan</span></div>' +
      '<h1 id="tripTitle" contenteditable="true" spellcheck="false">' + esc(state.title) + '</h1>' +
      '<p class="sub" id="tripSub" contenteditable="true" spellcheck="false">' + esc(state.sub) + '</p>' +
      '<div class="who-row">Signed in as <b>' + esc(currentUser.email) + '</b>, showing as ' +
        '<input type="text" id="displayNameInput" maxlength="24" value="' + esc(myDisplayName()) + '"> on the vote buttons below.' +
        '<button type="button" class="link-btn" id="signOutBtn">Sign out</button></div>' +
    '</header>' +
    renderCountdown() +
    '<div class="budget-panel">' +
      '<div class="budget-row"><span class="budget-label">Trip budget: <input id="budgetInput" class="budget-total-input" type="number" min="1" value="' + esc(budget) + '"> days</span>' +
      '<span id="budgetFigure" class="budget-figure ' + (over ? 'over' : 'under') + '">' + grand + ' / ' + budget + ' days</span></div>' +
      '<div class="bar-track"><div id="barFill" class="bar-fill' + (over ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
      '<div class="budget-row"><span class="budget-label">Money budget: $<input id="moneyBudgetInput" class="budget-total-input money" type="number" min="0" value="' + esc(moneyBudget) + '"></span>' +
      '<span id="moneyBudgetFigure" class="budget-figure ' + (moneyOver ? 'over' : 'under') + '">' + fmtMoney(moneyTotal) + ' / ' + fmtMoney(moneyBudget) + '</span></div>' +
      '<div class="bar-track"><div id="moneyBarFill" class="bar-fill' + (moneyOver ? ' over' : '') + '" style="width:' + moneyPct + '%"></div></div>' +
      '<div class="dates-row"><span class="budget-label">Trip starts: <input type="date" id="startDateInput" value="' + esc(state.startDate || '') + '"></span>' +
      '<span id="tripDatesFigure" class="trip-dates-figure">' + esc(tripDatesText) + '</span></div>' +
    '</div>' +
    '<section class="route-overview">' +
      '<div class="map-head"><h2 class="map-title">Route order</h2><p class="map-hint">Drag a country to reorder it — the map, dates, and directions all follow. The arrival leg stays fixed at the start.</p></div>' +
      '<div class="chip-row" id="chipRow">' + renderChipRow() + '</div>' +
    '</section>' +
    '<section class="map-section">' +
      '<div class="map-head"><h2 class="map-title">' + JET_ICON + 'Route map</h2><p class="map-hint">Click "Place on map" on a stop below, then click the map to drop its pin — works for stops you add too. Click a placed pin to jump to it in the list. Scroll or use the buttons to zoom, drag to pan once zoomed in.</p></div>' +
      '<div class="map-card">' +
        '<div class="map-toolbar">' +
          '<button type="button" class="map-zoom-btn" data-zoom-out aria-label="Zoom out">−</button>' +
          '<span class="map-zoom-figure" id="mapZoomFigure">100%</span>' +
          '<button type="button" class="map-zoom-btn" data-zoom-in aria-label="Zoom in">+</button>' +
          '<button type="button" class="link-btn map-reset-btn hidden" data-zoom-reset>Reset view</button>' +
        '</div>' +
        '<div class="map-viewport" id="mapViewport">' +
          '<div class="map-frame" id="mapFrame">' +
            '<div class="map-stage" id="mapStage">' +
              '<svg class="map-bg" viewBox="' + MAP_VIEWBOX_STR + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
                COUNTRY_SHAPES.map((c) => '<path class="landmass-outline" d="' + c.d + '"/>').join('') +
                COUNTRY_SHAPES.filter((c) => c.label).map((c) => '<text class="country-label" x="' + c.cx + '" y="' + c.cy + '">' + c.label + '</text>').join('') +
              '</svg>' +
              '<canvas class="map-route-canvas" id="mapRouteCanvas"></canvas>' +
              renderPins() +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="placeBanner" class="place-banner"></div>' +
        COMPASS_ROSE +
      '</div>' +
    '</section>' +
    '<div class="trail" id="trail">' +
      state.regions.map((r, i) => renderRegionBlock(r, i, schedule)).join('') +
      '<div class="add-country-row"><button type="button" class="add-country-btn" data-add-country>+ Add country</button></div>' +
    '</div>' +
    '<footer class="note">' +
      '<div class="footer-ornament" aria-hidden="true"><span class="footer-line"></span>' + JET_ICON + '<span class="footer-line"></span></div>' +
      'Day counts are starting estimates, not bookings — nudge them as you research. Transit days are rough guesses for flight/bus days including connections; pad them if you\'re not booking the tightest possible layover. Every checkbox, day count, note, added stop, and map pin here is shared — anyone signed in sees your changes live, and you\'ll see theirs.' +
    '</footer>';
  applyMapTransform();
  setupScrollFocus();
  patchPresence();
}

function drawRoute() {
  const canvas = document.getElementById('mapRouteCanvas');
  const stage = document.getElementById('mapStage');
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const pts = [];
  state.regions.forEach((region) => {
    region.stops.forEach((s) => {
      if (!s.included) return;
      const p = state.pins[s.id];
      if (!p) return;
      pts.push([p.x / 100 * rect.width, p.y / 100 * rect.height]);
    });
  });
  if (pts.length > 1) {
    const teal = getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#2F7A73';
    ctx.strokeStyle = teal;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
}

// Map zoom/pan is a personal viewing convenience, not trip data — kept out of
// `state` entirely so it never syncs or gets saved.
const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 4;
let mapZoom = 1;
let mapPanX = 0;
let mapPanY = 0;
let mapDragState = null;

function clampMapPan() {
  const vp = document.getElementById('mapViewport');
  if (!vp) return;
  const w = vp.clientWidth, h = vp.clientHeight;
  const minX = Math.min(0, w * (1 - mapZoom));
  const minY = Math.min(0, h * (1 - mapZoom));
  mapPanX = Math.max(minX, Math.min(0, mapPanX));
  mapPanY = Math.max(minY, Math.min(0, mapPanY));
}

function applyMapTransform() {
  const frame = document.getElementById('mapFrame');
  if (!frame) return;
  frame.style.transform = 'translate(' + mapPanX + 'px,' + mapPanY + 'px) scale(' + mapZoom + ')';
  const viewport = document.getElementById('mapViewport');
  if (viewport) viewport.classList.toggle('zoomed', mapZoom > 1);
  const figure = document.getElementById('mapZoomFigure');
  if (figure) figure.textContent = Math.round(mapZoom * 100) + '%';
  const resetBtn = document.querySelector('[data-zoom-reset]');
  if (resetBtn) resetBtn.classList.toggle('hidden', mapZoom === 1 && mapPanX === 0 && mapPanY === 0);
  drawRoute();
}

function zoomMapBy(factor, originX, originY) {
  markUserMapInteracting();
  const vp = document.getElementById('mapViewport');
  if (!vp) return;
  const cx = originX == null ? vp.clientWidth / 2 : originX;
  const cy = originY == null ? vp.clientHeight / 2 : originY;
  const nextZoom = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, mapZoom * factor));
  if (nextZoom === mapZoom) return;
  mapPanX = cx - (nextZoom / mapZoom) * (cx - mapPanX);
  mapPanY = cy - (nextZoom / mapZoom) * (cy - mapPanY);
  mapZoom = nextZoom;
  clampMapPan();
  applyMapTransform();
}

function resetMapView() {
  markUserMapInteracting();
  mapZoom = 1;
  mapPanX = 0;
  mapPanY = 0;
  applyMapTransform();
}

function onMapWheel(e) {
  const viewport = e.target.closest('#mapViewport');
  if (!viewport) return;
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const factor = Math.exp(-e.deltaY * 0.0015);
  zoomMapBy(factor, e.clientX - rect.left, e.clientY - rect.top);
}

function onMapPointerDown(e) {
  if (placingKey || e.target.closest('.pin')) return;
  const viewport = e.target.closest('#mapViewport');
  if (!viewport) return;
  markUserMapInteracting();
  mapDragState = {
    viewport,
    startClientX: e.clientX,
    startClientY: e.clientY,
    startPanX: mapPanX,
    startPanY: mapPanY,
    moved: false,
  };
  try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
}

function onMapPointerMove(e) {
  const d = mapDragState;
  if (!d) return;
  const dx = e.clientX - d.startClientX;
  const dy = e.clientY - d.startClientY;
  if (!d.moved) {
    if (Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    const viewport = document.getElementById('mapViewport');
    if (viewport) viewport.classList.add('panning');
  }
  markUserMapInteracting();
  mapPanX = d.startPanX + dx;
  mapPanY = d.startPanY + dy;
  clampMapPan();
  applyMapTransform();
}

function onMapPointerUp() {
  if (!mapDragState) return;
  mapDragState = null;
  const viewport = document.getElementById('mapViewport');
  if (viewport) viewport.classList.remove('panning');
  markUserMapInteracting();
}

// Scroll-driven map focus: on the two-column desktop layout, the map is
// pinned in view while the activity list scrolls past it. As each activity
// crosses the vertical center of the viewport, the map eases (with a light
// inertia, not a hard cut) toward a zoomed-in view centered on that
// activity's pin — and eases back out to the full route when nothing in
// view has one. It's a personal viewing convenience like manual zoom/pan,
// so it never touches `state` or fights a person who's manually zooming.
const AUTO_FOCUS_ZOOM = 2.6;
const FOLLOW_EASE = 0.045; // per-frame lerp fraction toward the target — lower = more inertia, slower to catch up
const USER_INTERACT_GRACE_MS = 1500;
let scrollFocusObserver = null;
let focusStopKey = null;
let followRaf = null;
let userMapInteracting = false;
let userInteractTimer = null;

function isDesktopLayout() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 980px)').matches;
}

function markUserMapInteracting() {
  userMapInteracting = true;
  clearTimeout(userInteractTimer);
  userInteractTimer = setTimeout(() => {
    userMapInteracting = false;
    nudgeFollow();
  }, USER_INTERACT_GRACE_MS);
}

function computeFocusTransform(key) {
  const pin = state.pins[key];
  if (!pin) return null;
  const vp = document.getElementById('mapViewport');
  if (!vp) return null;
  const vw = vp.clientWidth, vh = vp.clientHeight;
  if (!vw || !vh) return null;
  // #mapStage sits height:100% inside the (untransformed) frame, centered
  // horizontally — mirrors the .map-stage rules in style.css.
  const stageWidth = vh * MAP_STAGE_RATIO;
  const stageLeft = (vw - stageWidth) / 2;
  const localX = stageLeft + (pin.x / 100) * stageWidth;
  const localY = (pin.y / 100) * vh;
  const zoom = AUTO_FOCUS_ZOOM;
  let panX = vw / 2 - localX * zoom;
  let panY = vh / 2 - localY * zoom;
  const minX = Math.min(0, vw * (1 - zoom));
  const minY = Math.min(0, vh * (1 - zoom));
  panX = Math.max(minX, Math.min(0, panX));
  panY = Math.max(minY, Math.min(0, panY));
  return { panX, panY, zoom };
}

function currentFollowTarget() {
  if (userMapInteracting || !isDesktopLayout()) return null;
  if (!focusStopKey) return null; // nothing centered — hold the view where it is, don't zoom back out
  return computeFocusTransform(focusStopKey);
}

function stepFollow() {
  followRaf = null;
  const target = currentFollowTarget();
  if (!target) return;
  const dx = target.panX - mapPanX;
  const dy = target.panY - mapPanY;
  const dz = target.zoom - mapZoom;
  if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4 && Math.abs(dz) < 0.004) {
    mapPanX = target.panX; mapPanY = target.panY; mapZoom = target.zoom;
    applyMapTransform();
    return;
  }
  mapPanX += dx * FOLLOW_EASE;
  mapPanY += dy * FOLLOW_EASE;
  mapZoom += dz * FOLLOW_EASE;
  applyMapTransform();
  followRaf = requestAnimationFrame(stepFollow);
}

function nudgeFollow() {
  if (followRaf) return;
  followRaf = requestAnimationFrame(stepFollow);
}

function setupScrollFocus() {
  if (scrollFocusObserver) { scrollFocusObserver.disconnect(); scrollFocusObserver = null; }
  if (typeof IntersectionObserver !== 'function' || !isDesktopLayout()) {
    if (focusStopKey !== null) { focusStopKey = null; nudgeFollow(); }
    return;
  }
  const stopEls = Array.prototype.slice.call(document.querySelectorAll('.stop'));
  if (!stopEls.length) { focusStopKey = null; return; }
  const intersecting = new Map(); // key -> element, for whichever stops currently cross the center band
  scrollFocusObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const key = entry.target.dataset.key;
      if (entry.isIntersecting) intersecting.set(key, entry.target); else intersecting.delete(key);
    });
    // Tall stop cards can straddle the band on both sides of the true center
    // line at once — pick whichever candidate's own midpoint is nearest it,
    // rather than just the first one in DOM order.
    const viewportMid = window.innerHeight / 2;
    let next = null, bestDist = Infinity;
    intersecting.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs((r.top + r.bottom) / 2 - viewportMid);
      if (dist < bestDist) { bestDist = dist; next = key; }
    });
    if (next !== focusStopKey) {
      focusStopKey = next;
      nudgeFollow();
    }
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  stopEls.forEach((el) => scrollFocusObserver.observe(el));
}

function recomputeVoteHighlights() {
  const myUid = currentUser.id;
  document.querySelectorAll('.stop').forEach((stopEl) => {
    const votes = state.votes[stopEl.dataset.key] || {};
    stopEl.querySelectorAll('.vote-btn').forEach((btn) => {
      btn.classList.toggle('mine', votes[myUid] === btn.dataset.vote);
    });
  });
}

function recomputeDerived() {
  const grand = computeGrandTotal();
  const moneyTotal = computeMoneyTotal();
  const schedule = computeSchedule();
  document.querySelectorAll('.region').forEach((regionEl) => {
    const idx = parseInt(regionEl.dataset.regionIdx, 10);
    const region = state.regions[idx];
    if (!region) return;
    const regionTotal = region.stops.reduce((sum, s) => sum + (s.included ? Math.max(0, s.days || 0) : 0), 0);
    const tally = regionEl.querySelector('[data-tally]');
    if (tally) tally.textContent = regionTotal;
    const regionDatesEl = regionEl.querySelector('[data-region-dates]');
    if (regionDatesEl) {
      const span = schedule.valid ? schedule.regionSpans[idx] : null;
      regionDatesEl.textContent = span ? fmtRange(span.start, span.end) : '';
    }
    region.stops.forEach((stop) => {
      const stopEl = regionEl.querySelector('.stop[data-key="' + stop.id + '"]');
      if (!stopEl) return;
      const dateEl = stopEl.querySelector('[data-dates]');
      if (!dateEl) return;
      const info = schedule.valid ? schedule.stopDates[stop.id] : null;
      dateEl.textContent = info ? fmtRange(info.start, info.end) : '';
    });
  });
  document.querySelectorAll('.transit').forEach((transitEl) => {
    const idx = parseInt(transitEl.dataset.regionIdx, 10);
    const dEl = transitEl.querySelector('[data-transit-dates]');
    if (dEl) dEl.textContent = schedule.valid ? (schedule.transitDates[idx] || '') : '';
  });
  const tripDatesEl = document.getElementById('tripDatesFigure');
  if (tripDatesEl) {
    tripDatesEl.textContent = schedule.valid
      ? fmtRange(schedule.tripStart, schedule.tripEnd) + ', ' + schedule.tripEnd.getUTCFullYear()
      : 'Set a start date to see the calendar';
  }
  const budget = Math.max(0, state.budget || 0);
  const over = grand > budget;
  const fig = document.getElementById('budgetFigure');
  if (fig) { fig.textContent = grand + ' / ' + budget + ' days'; fig.className = 'budget-figure ' + (over ? 'over' : 'under'); }
  const bar = document.getElementById('barFill');
  if (bar) {
    const pct = budget > 0 ? Math.min((grand / budget) * 100, 100) : 0;
    bar.style.width = pct + '%';
    bar.className = 'bar-fill' + (over ? ' over' : '');
  }
  const moneyBudget = Math.max(0, state.moneyBudget || 0);
  const moneyOver = moneyTotal > moneyBudget;
  const moneyFig = document.getElementById('moneyBudgetFigure');
  if (moneyFig) { moneyFig.textContent = fmtMoney(moneyTotal) + ' / ' + fmtMoney(moneyBudget); moneyFig.className = 'budget-figure ' + (moneyOver ? 'over' : 'under'); }
  const moneyBar = document.getElementById('moneyBarFill');
  if (moneyBar) {
    const moneyPct = moneyBudget > 0 ? Math.min((moneyTotal / moneyBudget) * 100, 100) : 0;
    moneyBar.style.width = moneyPct + '%';
    moneyBar.className = 'bar-fill' + (moneyOver ? ' over' : '');
  }
  document.querySelectorAll('.pin').forEach((pin) => {
    const found = findStopByKey(pin.dataset.key);
    pin.classList.toggle('excluded-pin', !(found && found.stop.included));
  });
  drawRoute();
}

function addStop(regionIdx) {
  const region = state.regions[regionIdx];
  if (!region) return;
  const key = uid('stop');
  region.stops.push({ id: key, name: 'New activity', note: '', noteText: '', days: 1, included: true, locked: false });
  normalizeTravel(region);
  renderApp();
  scheduleSave();
  const nameEl = document.querySelector('.stop[data-key="' + key + '"] .stop-name');
  if (nameEl) nameEl.focus();
}

function removeStop(key) {
  for (const region of state.regions) {
    const idx = region.stops.findIndex((s) => s.id === key);
    if (idx > -1) { region.stops.splice(idx, 1); normalizeTravel(region); break; }
  }
  delete state.pins[key];
  delete state.votes[key];
  if (placingKey === key) stopPlacing();
  renderApp();
  scheduleSave();
}

function removeRegion(regionIdx) {
  const region = state.regions[regionIdx];
  if (!region) return;
  region.stops.forEach((s) => { delete state.pins[s.id]; if (placingKey === s.id) stopPlacing(); });
  state.regions.splice(regionIdx, 1);
  renderApp();
  scheduleSave();
}

function addCountry() {
  state.regions.push({ country: 'New Country', name: 'New Region', deletable: true, transitBefore: { days: 1, mode: '', price: 0, label: '' }, stops: [] });
  renderApp();
  scheduleSave();
  const idx = state.regions.length - 1;
  const el = document.querySelector('.region[data-region-idx="' + idx + '"] .region-country');
  if (el) el.focus();
}

function startPlacing(key) {
  placingKey = key;
  const stage = document.getElementById('mapStage');
  if (stage) stage.classList.add('placing');
  const found = findStopByKey(key);
  const banner = document.getElementById('placeBanner');
  if (banner) {
    banner.textContent = 'Click the map to place "' + (found ? found.stop.name : 'this stop') + '"';
    banner.classList.add('show');
  }
}

function stopPlacing() {
  placingKey = null;
  const stage = document.getElementById('mapStage');
  if (stage) stage.classList.remove('placing');
  const banner = document.getElementById('placeBanner');
  if (banner) banner.classList.remove('show');
}

function stagePoint(evt, stageEl) {
  const rect = stageEl.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((evt.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((evt.clientY - rect.top) / rect.height) * 100));
  return { x, y };
}

function onChange(e) {
  if (e.target.matches('[data-toggle]')) {
    const stopEl = e.target.closest('.stop');
    const found = findStopByKey(stopEl.dataset.key);
    if (!found) return;
    found.stop.included = e.target.checked;
    stopEl.classList.toggle('excluded', !found.stop.included);
    const dayInput = stopEl.querySelector('[data-days]');
    if (dayInput) dayInput.disabled = !found.stop.included;
    recomputeDerived();
    scheduleSave();
    return;
  }
  if (e.target.matches('[data-travel-mode]')) {
    const key = e.target.closest('.travel').dataset.key;
    const found = findStopByKey(key);
    if (found && found.stop.travelBefore) {
      found.stop.travelBefore.mode = e.target.value;
      scheduleSave();
    }
    return;
  }
  if (e.target.matches('[data-transit-mode]')) {
    const idx = parseInt(e.target.closest('.transit').dataset.regionIdx, 10);
    const region = state.regions[idx];
    if (region && region.transitBefore) {
      region.transitBefore.mode = e.target.value;
      scheduleSave();
    }
  }
}

function onInput(e) {
  const t = e.target;
  if (t.id === 'budgetInput') {
    state.budget = Math.max(0, parseInt(t.value, 10) || 0);
    recomputeDerived(); scheduleSave(); return;
  }
  if (t.id === 'moneyBudgetInput') {
    state.moneyBudget = Math.max(0, parseInt(t.value, 10) || 0);
    recomputeDerived(); scheduleSave(); return;
  }
  if (t.id === 'startDateInput') {
    state.startDate = t.value || null;
    recomputeDerived(); scheduleSave(); return;
  }
  if (t.id === 'displayNameInput') {
    const val = t.value.trim() || (currentUser.email || '').split('@')[0];
    profiles[currentUser.id] = val;
    supabase.from('profiles').upsert({ id: currentUser.id, display_name: val }).then(() => {});
    recomputeVoteHighlights();
    return;
  }
  if (t.matches('[data-days]')) {
    const stopEl = t.closest('.stop');
    const found = findStopByKey(stopEl.dataset.key);
    if (found) { found.stop.days = Math.max(0, parseInt(t.value, 10) || 0); recomputeDerived(); scheduleSave(); }
    return;
  }
  if (t.matches('[data-price]')) {
    const stopEl = t.closest('.stop');
    const found = findStopByKey(stopEl.dataset.key);
    if (found) { found.stop.price = Math.max(0, parseFloat(t.value) || 0); recomputeDerived(); scheduleSave(); }
    return;
  }
  if (t.matches('[data-travel-price]')) {
    const key = t.closest('.travel').dataset.key;
    const found = findStopByKey(key);
    if (found && found.stop.travelBefore) { found.stop.travelBefore.price = Math.max(0, parseFloat(t.value) || 0); recomputeDerived(); scheduleSave(); }
    return;
  }
  if (t.matches('[data-transit-price]')) {
    const idx = parseInt(t.closest('.transit').dataset.regionIdx, 10);
    const region = state.regions[idx];
    if (region && region.transitBefore) { region.transitBefore.price = Math.max(0, parseFloat(t.value) || 0); recomputeDerived(); scheduleSave(); }
    return;
  }
  if (t.matches('[data-transit]')) {
    const transitEl = t.closest('.transit');
    const idx = parseInt(transitEl.dataset.regionIdx, 10);
    const region = state.regions[idx];
    if (region && region.transitBefore) {
      region.transitBefore.days = Math.max(0, parseInt(t.value, 10) || 0);
      const unit = transitEl.querySelector('[data-unit]');
      if (unit) unit.textContent = (parseInt(t.value, 10) === 1 ? 'day' : 'days');
      recomputeDerived(); scheduleSave();
    }
    return;
  }
  if (t.id === 'tripTitle') { state.title = t.textContent; scheduleSave(); return; }
  if (t.id === 'tripSub') { state.sub = t.textContent; scheduleSave(); return; }
  if (t.matches('.stop-name.editable')) {
    const se = t.closest('.stop');
    const found = findStopByKey(se.dataset.key);
    if (found) {
      found.stop.name = t.textContent;
      const pinLabel = document.querySelector('.pin[data-key="' + se.dataset.key + '"] .pin-label');
      if (pinLabel) pinLabel.textContent = t.textContent;
      if (placingKey === se.dataset.key) {
        const banner = document.getElementById('placeBanner');
        if (banner) banner.textContent = 'Click the map to place "' + (t.textContent || 'this stop') + '"';
      }
    }
    scheduleSave(); return;
  }
  if (t.matches('.stop-note.editable')) {
    const se = t.closest('.stop'); const found = findStopByKey(se.dataset.key);
    if (found) found.stop.note = t.textContent;
    scheduleSave(); return;
  }
  if (t.matches('.note-text.editable')) {
    const se = t.closest('.stop'); const found = findStopByKey(se.dataset.key);
    if (found) found.stop.noteText = t.textContent;
    scheduleSave(); return;
  }
  if (t.matches('.region-country.editable')) {
    const ridx = parseInt(t.closest('.region').dataset.regionIdx, 10);
    if (state.regions[ridx]) state.regions[ridx].country = t.textContent;
    scheduleSave(); return;
  }
  if (t.matches('.region-name.editable')) {
    const ridx = parseInt(t.closest('.region').dataset.regionIdx, 10);
    if (state.regions[ridx]) state.regions[ridx].name = t.textContent;
    scheduleSave(); return;
  }
  if (t.matches('.transit-label.editable')) {
    const tidx = parseInt(t.closest('.transit').dataset.regionIdx, 10);
    if (state.regions[tidx] && state.regions[tidx].transitBefore) state.regions[tidx].transitBefore.label = t.textContent;
    scheduleSave(); return;
  }
  if (t.matches('[data-travel-duration]')) {
    const key = t.closest('.travel').dataset.key;
    const found = findStopByKey(key);
    if (found && found.stop.travelBefore) { found.stop.travelBefore.duration = t.value; scheduleSave(); }
    return;
  }
  if (t.matches('.travel-note.editable')) {
    const key = t.closest('.travel').dataset.key;
    const found = findStopByKey(key);
    if (found && found.stop.travelBefore) { found.stop.travelBefore.note = t.textContent; scheduleSave(); }
    return;
  }
}

function onClick(e) {
  const addStopBtn = e.target.closest('[data-add-stop]');
  if (addStopBtn) { addStop(parseInt(addStopBtn.closest('.region').dataset.regionIdx, 10)); return; }
  const delBtn = e.target.closest('[data-delete]');
  if (delBtn) {
    const key = delBtn.closest('.stop').dataset.key;
    const found = findStopByKey(key);
    const name = found ? found.stop.name || 'this activity' : 'this activity';
    if (window.confirm('Remove "' + name + '"? This can\'t be undone.')) removeStop(key);
    return;
  }
  const delRegionBtn = e.target.closest('[data-delete-region]');
  if (delRegionBtn) {
    const regionIdx = parseInt(delRegionBtn.closest('.region').dataset.regionIdx, 10);
    const region = state.regions[regionIdx];
    const label = region ? (region.name || region.country || 'this country') : 'this country';
    const stopCount = region ? region.stops.length : 0;
    const detail = stopCount > 0 ? ' and its ' + stopCount + ' ' + (stopCount === 1 ? 'activity' : 'activities') : '';
    if (window.confirm('Remove "' + label + '"' + detail + '? This can\'t be undone.')) removeRegion(regionIdx);
    return;
  }
  const addCountryBtn = e.target.closest('[data-add-country]');
  if (addCountryBtn) { addCountry(); return; }
  const placeBtn = e.target.closest('[data-place]');
  if (placeBtn) { startPlacing(placeBtn.closest('.stop').dataset.key); return; }
  const zoomInBtn = e.target.closest('[data-zoom-in]');
  if (zoomInBtn) { zoomMapBy(1.5); return; }
  const zoomOutBtn = e.target.closest('[data-zoom-out]');
  if (zoomOutBtn) { zoomMapBy(1 / 1.5); return; }
  const zoomResetBtn = e.target.closest('[data-zoom-reset]');
  if (zoomResetBtn) { resetMapView(); return; }
  const signOutBtn = e.target.closest('#signOutBtn');
  if (signOutBtn) { if (signOutFn) signOutFn(); return; }
  const voteBtn = e.target.closest('[data-vote]');
  if (voteBtn) {
    const stopEl = voteBtn.closest('.stop');
    const key = stopEl.dataset.key;
    const choice = voteBtn.dataset.vote;
    const myUid = currentUser.id;
    if (!state.votes[key]) state.votes[key] = {};
    if (state.votes[key][myUid] === choice) {
      delete state.votes[key][myUid];
    } else {
      state.votes[key][myUid] = choice;
    }
    renderApp();
    scheduleSave();
    return;
  }
  const pin = e.target.closest('.pin');
  if (pin) {
    if (placingKey) return;
    const row = document.querySelector('.stop[data-key="' + pin.dataset.key + '"]');
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const stage = e.target.closest('#mapStage');
  if (stage && placingKey) {
    const p = stagePoint(e, stage);
    state.pins[placingKey] = p;
    stopPlacing();
    renderApp();
    scheduleSave();
    return;
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && e.target.isContentEditable) { e.preventDefault(); e.target.blur(); }
}

const SAVE_DEBOUNCE_MS = 5000;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, SAVE_DEBOUNCE_MS);
  updateSaveButton('pending');
}

function setSyncStatus(text) {
  const badge = document.getElementById('syncBadge');
  if (badge) badge.textContent = text;
}

function updateSaveButton(uiState) {
  if (!saveBtn) return;
  saveBtn.classList.remove('hidden', 'pending', 'saving');
  saveBtn.disabled = false;
  if (uiState === 'pending') {
    saveBtn.classList.add('pending');
    saveBtn.textContent = 'Save now';
  } else if (uiState === 'saving') {
    saveBtn.classList.add('saving');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;
  } else {
    saveBtn.textContent = 'Saved';
  }
}

async function doSave() {
  if (saving) { pendingResave = true; return; }
  saving = true;
  clearTimeout(saveTimer);
  saveTimer = null;
  setSyncStatus('Saving…');
  updateSaveButton('saving');
  const now = new Date();
  const { error } = await supabase
    .from('trip_state')
    .update({ data: state, updated_by: currentUser.id, updated_at: now.toISOString() })
    .eq('id', TRIP_ID);
  if (error) {
    setSyncStatus('Save failed: ' + error.message);
    updateSaveButton('pending');
  } else {
    lastAppliedAt = now;
    setSyncStatus('Saved');
    updateSaveButton('idle');
  }
  saving = false;
  if (pendingResave) { pendingResave = false; saveTimer = setTimeout(doSave, 200); }
}

function onSaveNowClick() {
  if (!saveTimer && !saving) return;
  doSave();
}

async function loadProfiles() {
  const { data, error } = await supabase.from('profiles').select('id, display_name, last_seen, active_stop_id');
  if (error) console.error('loading profiles failed (has supabase/schema.sql been re-run for the last_seen/active_stop_id columns?):', error.message);
  profiles = {};
  presence = {};
  (data || []).forEach((p) => {
    profiles[p.id] = p.display_name;
    presence[p.id] = { lastSeen: p.last_seen ? new Date(p.last_seen) : null, activeStopId: p.active_stop_id || null };
  });
  if (!profiles[currentUser.id]) {
    const fallback = (currentUser.user_metadata && currentUser.user_metadata.full_name)
      || (currentUser.email || '').split('@')[0];
    profiles[currentUser.id] = fallback;
    presence[currentUser.id] = { lastSeen: null, activeStopId: null };
    await supabase.from('profiles').upsert({ id: currentUser.id, display_name: fallback });
  }
}

async function loadTripState() {
  const { data } = await supabase.from('trip_state').select('data, updated_at').eq('id', TRIP_ID).maybeSingle();
  if (data && data.data && Object.keys(data.data).length) {
    state = data.data;
    lastAppliedAt = data.updated_at ? new Date(data.updated_at) : new Date();
  } else {
    state = JSON.parse(JSON.stringify(DEFAULT_TRIP));
    lastAppliedAt = new Date();
    await supabase.from('trip_state').upsert({ id: TRIP_ID, data: state, updated_by: currentUser.id, updated_at: lastAppliedAt.toISOString() });
  }
  if (!state.votes) state.votes = {};
  if (!state.pins) state.pins = {};
  if (state.moneyBudget == null) state.moneyBudget = 0;
  normalizeAllTravel();
}

// True while the person is actively typing/editing something in the app —
// used to avoid a poll blowing away in-progress, not-yet-saved edits.
function isEditingLocally() {
  const el = document.activeElement;
  if (!el || !app.contains(el)) return false;
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
}

const POLL_INTERVAL_MS = 4000;

async function pollForUpdates() {
  if (saving || saveTimer || isEditingLocally()) return;
  const [tripRes, profilesRes] = await Promise.all([
    supabase.from('trip_state').select('data, updated_by, updated_at').eq('id', TRIP_ID).maybeSingle(),
    supabase.from('profiles').select('id, display_name, last_seen, active_stop_id'),
  ]);

  let changed = false;

  if (profilesRes.error) console.error('polling profiles failed:', profilesRes.error.message);
  if (profilesRes.data) {
    const nextProfiles = {};
    const nextPresence = {};
    profilesRes.data.forEach((p) => {
      nextProfiles[p.id] = p.display_name;
      nextPresence[p.id] = { lastSeen: p.last_seen ? new Date(p.last_seen) : null, activeStopId: p.active_stop_id || null };
    });
    presence = nextPresence;
    if (JSON.stringify(nextProfiles) !== JSON.stringify(profiles)) {
      profiles = nextProfiles;
      changed = true;
    }
  }

  const row = tripRes.data;
  if (row && row.updated_at) {
    const remoteAt = new Date(row.updated_at);
    if (!lastAppliedAt || remoteAt > lastAppliedAt) {
      lastAppliedAt = remoteAt;
      if (row.updated_by !== currentUser.id) {
        state = row.data;
        if (!state.votes) state.votes = {};
        if (!state.pins) state.pins = {};
        if (state.moneyBudget == null) state.moneyBudget = 0;
        normalizeAllTravel();
        changed = true;
      }
    }
  }

  if (changed) renderApp(); else patchPresence();
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollForUpdates, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function bindListeners() {
  if (saveBtn) saveBtn.addEventListener('click', onSaveNowClick);
  app.addEventListener('change', onChange);
  app.addEventListener('input', onInput);
  app.addEventListener('click', onClick);
  app.addEventListener('keydown', onKeydown);
  app.addEventListener('wheel', onMapWheel, { passive: false });
  app.addEventListener('pointerdown', onPointerDown);
  app.addEventListener('focusin', onFocusChange);
  app.addEventListener('focusout', onFocusChange);
  // move/up listen on window, not app: a grabbed stop is reparented to <body>
  // for the duration of the drag (see onStopPointerDown), which takes it out
  // of app's subtree — events would stop bubbling to an app-scoped listener.
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('lostpointercapture', onPointerUp);
  window.addEventListener('beforeunload', () => {
    if (saveTimer) doSave();
  });
  window.addEventListener('resize', () => { clampMapPan(); applyMapTransform(); setupScrollFocus(); nudgeFollow(); });
}

export async function startApp(container, user, onSignOut) {
  app = container;
  saveBtn = document.getElementById('saveNowBtn');
  currentUser = user;
  signOutFn = onSignOut;

  stopPolling();

  await loadProfiles();
  await loadTripState();

  if (!listenersBound) {
    bindListeners();
    listenersBound = true;
  }

  renderApp();
  setSyncStatus('Live shared plan');
  updateSaveButton('idle');
  startPolling();
  startPresenceHeartbeat();

  clearInterval(countdownTimer);
  countdownTimer = setInterval(tickCountdown, 1000);
}

export function stopApp() {
  stopPolling();
  stopPresenceHeartbeat();
  myActiveStopId = null;
  clearInterval(countdownTimer);
  countdownTimer = null;
  if (scrollFocusObserver) { scrollFocusObserver.disconnect(); scrollFocusObserver = null; }
  if (followRaf) { cancelAnimationFrame(followRaf); followRaf = null; }
  clearTimeout(userInteractTimer);
}

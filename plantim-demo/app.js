'use strict';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = (n) => String(n).padStart(2, '0');
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

const HOUR_PX = 112;
const SLOT_MIN = 30;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const toLocalISO = Recurrence.toLocalISO;
const clampDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMin = (d, n) => new Date(+d + n * 60000);
const mondayOffset = (d) => (d.getDay() + 6) % 7;
const startOfWeek = (d) => addDays(clampDay(d), -mondayOffset(d));
const startOfWorkWeek = startOfWeek;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isToday = (d) => sameDay(d, new Date());

function isoDate(date) { return toLocalISO(date).slice(0, 10); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { }
}
function overlapsRange(occ, start, end) { return occ.end > start && occ.start < end; }
function byAllDayThenStart(a, b) { return (b.allDay - a.allDay) || (a.start - b.start); }
function monthGridStart(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return addDays(first, -mondayOffset(first));
}

function shiftDateTime(date, minutes, days) {
  const x = new Date(date);
  if (days) x.setDate(x.getDate() + days);
  if (minutes) x.setMinutes(x.getMinutes() + minutes);
  return x;
}
function fmtTime(d) { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function fmtDateLong(d) { return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
function minutesInto(d) { return d.getHours() * 60 + d.getMinutes(); }
function fmtDueDate(isoDay) {
  return new Date(isoDay + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function hexToRgb(hex) {
  let c = String(hex || '#888').replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function shade(hex, pct) {
  const [r, g, b] = hexToRgb(hex);
  const target = pct < 0 ? 0 : 255;
  const p = Math.abs(pct);
  const mix = (v) => Math.round((target - v) * p + v);
  return '#' + [mix(r), mix(g), mix(b)].map((v) => pad(v.toString(16))).join('');
}
const darkMode = () => document.documentElement.dataset.mode === 'dark';
const tint = (hex) => (darkMode() ? shade(hex, -0.62) : shade(hex, 0.82));
const ink = (hex) => (darkMode() ? shade(hex, 0.72) : shade(hex, -0.55));

const ICON = {
  search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>',
  undo: '<path d="M5.5 3.5 2.5 6.5l3 3"/><path d="M2.5 6.5H10a3.5 3.5 0 0 1 0 7H7"/>',
  redo: '<path d="m10.5 3.5 3 3-3 3"/><path d="M13.5 6.5H6a3.5 3.5 0 0 0 0 7h3"/>',
  bell: '<path d="M4 11.5V7a4 4 0 0 1 8 0v4.5l1 1H3z"/><path d="M6.5 14a1.5 1.5 0 0 0 3 0"/>',
  panel: '<rect x="2" y="2.5" width="12" height="11" rx="2"/><path d="M10 2.5v11"/>',
  more: '<circle cx="3.5" cy="8" r=".8"/><circle cx="8" cy="8" r=".8"/><circle cx="12.5" cy="8" r=".8"/>',
  lock: '<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  chevL: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
  chevR: '<path d="M6 3.5 10.5 8 6 12.5"/>',
  x: '<path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/>',
  repeat: '<path d="M2.5 7.5V7A2.5 2.5 0 0 1 5 4.5h8.5"/><path d="m11 2 2.5 2.5L11 7"/><path d="M13.5 8.5V9a2.5 2.5 0 0 1-2.5 2.5H2.5"/><path d="M5 14l-2.5-2.5L5 9"/>',
  check: '<path d="m3 8.5 3 3 7-7"/>',
  checklist: '<path d="m2 4.5 1.3 1.3L5.5 3.5M2 10.5l1.3 1.3 2.2-2.3M8 4.5h6M8 10.5h6"/>',
  board: '<rect x="2" y="2.5" width="12" height="11" rx="2"/><path d="M5.5 5.5v5M8 5.5v3M10.5 5.5v6"/>',
  calendar: '<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/>',
  flag: '<path d="M3.5 14.5V2.5"/><path d="M3.5 2.5h8.5l-2 3 2 3H3.5"/>',
  sparkle: '<path d="M8 2.5 9.2 6.8 13.5 8l-4.3 1.2L8 13.5 6.8 9.2 2.5 8l4.3-1.2z"/>',
  notes: '<path d="M3 4h10M3 8h10M3 12h6"/>',
  grip: '<circle cx="6" cy="4" r=".8"/><circle cx="10" cy="4" r=".8"/><circle cx="6" cy="8" r=".8"/><circle cx="10" cy="8" r=".8"/><circle cx="6" cy="12" r=".8"/><circle cx="10" cy="12" r=".8"/>',
  edit: '<path d="M10.5 2.5l3 3L6 13H3v-3z"/>',
  folder: '<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.8l1.5 1.5h4.7A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"/>',
  folderPlus: '<path d="M14 7.5V6a1.5 1.5 0 0 0-1.5-1.5H7.8L6.3 3H3.5A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13H8"/><path d="M12 9.5v5M9.5 12h5"/>',
  note: '<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3M5.5 8h5M5.5 10.5h5"/>',
  trash: '<path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 9h6.6l.7-9"/>',
  collapse: '<path d="m5 2.5 3 3 3-3M5 13.5l3-3 3 3"/>',
};
const ic = (name) => `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${ICON[name]}</svg>`;
$$('[data-ic]').forEach((el) => el.insertAdjacentHTML('afterbegin', ic(el.dataset.ic)));

const REMINDER_PRESETS = [
  { v: 0, t: 'At start time' },
  { v: 5, t: '5 minutes before' },
  { v: 10, t: '10 minutes before' },
  { v: 15, t: '15 minutes before' },
  { v: 30, t: '30 minutes before' },
  { v: 60, t: '1 hour before' },
  { v: 120, t: '2 hours before' },
  { v: 1440, t: '1 day before' },
  { v: 2880, t: '2 days before' },
  { v: 10080, t: '1 week before' },
];
function reminderText(mins) {
  const preset = REMINDER_PRESETS.find((x) => x.v === mins);
  if (preset) return preset.t;
  return mins + ' minutes before';
}
function leadText(mins) {
  return mins === 0 ? 'starting now'
    : mins < 60 ? `in ${mins} min`
    : mins < 1440 ? `in ${Math.round(mins / 60)} h`
    : `in ${Math.round(mins / 1440)} day(s)`;
}

const THEMES = ['red', 'blue', 'green', 'frost', 'sunset', 'aurora', 'sakura', 'lagoon', 'night', 'custom'];
const CUSTOM_THEME_DEFAULT = { accent: '#2f6f73', bg: '#3a4a5c', image: '' };
const THEME_NAMES = {
  red: 'Red', blue: 'Ocean blue', green: 'Forest green', frost: 'Frost',
  sunset: 'Sunset', aurora: 'Aurora', sakura: 'Sakura', lagoon: 'Lagoon', night: 'Starry night', custom: 'Custom',
};
const THEME_SWATCH = {
  red: '#c4314b', blue: '#0f6cbd', green: '#107c41', frost: '#3a7ca5',
  sunset: '#b4501a', aurora: '#7b3fb8', sakura: '#c2367a', lagoon: '#0e7c86', night: '#4a5bc4',
};

const VIEW_META = {
  day:      { label: 'Day',       cols: 1 },
  '3day':   { label: '3 days',     cols: 3 },
  week:     { label: 'Week',      cols: 7 },
  workweek: { label: 'Work week', cols: 5 },
  month:    { label: 'Month' },
  agenda:   { label: 'Agenda' },
  boards:   { label: 'Boards' },
  apps:     { label: 'Apps' },
  notes:    { label: 'Notes' },
};

const BOARD_TEMPLATES = [
  { id: 'kanban',  name: 'Kanban',               lists: ['To do', 'Doing', 'Done'] },
  { id: 'project', name: 'Project',              lists: ['Backlog', 'To do', 'In progress', 'Review', 'Done'] },
  { id: 'week',    name: 'Week plan',            lists: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend', 'Done'] },
  { id: 'blank',   name: 'Blank',                lists: [] },
];
const DURATIONS = [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [90, '1.5 hours'],
  [120, '2 hours'], [180, '3 hours'], [240, '4 hours']];

const DEFAULT_PRESET_SPECS = [
  ['Meeting', 'Meeting', 'Work', 60, [10], ['Agenda', 'Notes', 'Next steps']],
  ['Focus block', 'Focus time', 'Work', 120, [], []],
  ['Bug fix', 'Bug fix', 'Work', 60, [], ['Reproduce', 'Fix', 'Test', 'Deploy']],
  ['Workout', 'Workout', 'Health', 60, [30], []],
  ['Errand', 'Errand', 'Personal', 30, [], []],
];
function labelIdByName(labels, name) {
  const label = labels.find((x) => x.name === name);
  return label ? label.id : null;
}
function defaultPresets(labels) {
  return DEFAULT_PRESET_SPECS.map(([name, title, label, duration, reminders, checklist]) => ({
    id: uid(), name, title, labelId: labelIdByName(labels, label), duration, allDay: false,
    reminders: [...reminders], checklist: [...checklist], notes: '',
  }));
}

function defaultLabels() {
  return [
    { id: uid(), name: 'Work',     color: '#d13438' },
    { id: uid(), name: 'Personal', color: '#2f9e44' },
    { id: uid(), name: 'Health',   color: '#1c7ed6' },
    { id: uid(), name: 'Social',   color: '#f08c00' },
  ];
}
function settingsDefaults() {
  return { theme: 'red', appearance: 'light', digest: false, digestTime: '08:00', lastDigest: null, autolock: 0, lastExport: 0, ambient: true };
}
const DEFAULT_DATA = () => {
  const labels = defaultLabels();
  return {
    labels,
    events: [], tasks: [], apps: [], notes: [], noteFolders: [], boards: [],
    presets: defaultPresets(labels),
    settings: { ...settingsDefaults(), customTheme: { ...CUSTOM_THEME_DEFAULT } },
  };
};

let DATA = DEFAULT_DATA();
let view = 'week';
let anchor = new Date();
let miniMonth = clampDay(new Date());
let hiddenLabels = new Set();
let notifiedKeys = new Set();
let gadgetMode = false;
let boardId = null;
let openAppId = null;
let openNoteId = null;
let noteMode = 'edit';
let openFolders = new Set();
let curCols = 7;
let dragCommittedAt = 0;
let idleTimer = null;
let _gridScrollKey = '';
const _undo = [];
const _redo = [];
let _histSnap = null;

const LS_DATA = 'plantim.data';
const LS_NOTIFIED = 'plantim.notified';
const LS_PREFS = 'plantim.prefs';

const LS_VERSION = 'plantim.version';
let _dataVersion = 0;
let _lastBlob = null;
let _dirty = false;
let _pushTimer = null;

function setVersion(v) {
  _dataVersion = +v || 0;
  Sync.setVersion(_dataVersion);
  safeSetItem(LS_VERSION, String(_dataVersion));
}
function syncReady() { return Sync.isOnline() && Sync.isLoggedIn(); }

async function saveData() {
  let blob;
  try { blob = await CryptoBox.encryptObject(DATA); }
  catch (err) { console.error('save failed', err); toast('Could not save', 'error'); return; }
  safeSetItem(LS_DATA, blob);
  _lastBlob = blob;
  _dirty = true;
  schedulePush();
}
function schedulePush() {
  clearTimeout(_pushTimer);
  if (!syncReady()) { setSyncBadge('offline'); return; }
  setSyncBadge('saving');
  _pushTimer = setTimeout(pushNow, 1200);
}
function markSynced(version) {
  setVersion(version);
  _dirty = false;
  setSyncBadge('synced');
}
function applyPushResult(result, clobberedMessage) {
  markSynced(result.version);
  if (result.clobbered) toast(clobberedMessage, 'info', 7000);
}
async function pushNow() {
  if (!_dirty || !_lastBlob || !syncReady()) return;
  try {
    applyPushResult(await Sync.push(_lastBlob), 'Saved. This replaced a newer copy from another device');
  } catch (e) {
    setSyncBadge(e.message === 'auth' ? 'signedout' : 'offline');
  }
}
async function loadData() {
  const blob = localStorage.getItem(LS_DATA);
  if (!blob) { DATA = DEFAULT_DATA(); await saveData(); return; }
  DATA = normalise(await CryptoBox.decryptObject(blob));
  setVersion(+localStorage.getItem(LS_VERSION) || 0);
}

function normalise(d) {
  d = d || {};
  normaliseCollections(d);
  normaliseNoteFolders(d);
  normaliseNotes(d);
  normaliseSettings(d);
  normaliseEventsAndTasks(d);
  normaliseBoardsAndPresets(d);
  return d;
}
function normaliseEventsAndTasks(d) {
  d.events.forEach((ev) => normaliseEvent(ev));
  d.tasks.forEach((task) => { if (task.done === undefined) task.done = false; });
}
function normaliseCollections(d) {
  d.labels = asArray(d.labels);
  d.events = asArray(d.events);
  d.tasks = asArray(d.tasks);
  d.apps = asArray(d.apps).filter((a) => a && a.id && appUrl(a.url));
  d.noteFolders = asArray(d.noteFolders).filter((f) => f && f.id);
}
function noteFolderIds(d) { return new Set(d.noteFolders.map((f) => f.id)); }
function normaliseNoteFolders(d) {
  const folderIds = noteFolderIds(d);
  d.noteFolders.forEach((folder) => {
    folder.name = String(folder.name || 'Folder');
    if (!folderIds.has(folder.parentId)) folder.parentId = null;
  });
  d.noteFolders.forEach((folder) => breakFolderCycle(d.noteFolders, folder));
}
function breakFolderCycle(folders, folder) {
  const seen = new Set([folder.id]);
  for (let parentId = folder.parentId; parentId; parentId = (folders.find((x) => x.id === parentId) || {}).parentId) {
    if (seen.has(parentId)) { folder.parentId = null; break; }
    seen.add(parentId);
  }
}
function normaliseNotes(d) {
  const folderIds = noteFolderIds(d);
  d.notes = asArray(d.notes).filter((n) => n && n.id);
  d.notes.forEach((note) => normaliseNote(note, folderIds));
}
function normaliseNote(note, folderIds) {
  note.title = String(note.title ?? '');
  note.body = String(note.body ?? '');
  if (!folderIds.has(note.folderId)) note.folderId = null;
  note.created = +note.created || Date.now();
  note.updated = +note.updated || note.created;
}
function normaliseSettings(d) {
  d.settings = Object.assign(settingsDefaults(), d.settings || {});
  d.settings.customTheme = Object.assign({ ...CUSTOM_THEME_DEFAULT }, d.settings.customTheme);
  if (!THEMES.includes(d.settings.theme)) d.settings.theme = 'red';
}
function normaliseEvent(ev) {
  ev.recurrence = ev.recurrence || NO_REPEAT();
  ev.recurrence.end = ev.recurrence.end || { type: 'never' };
  ev.exdates = ev.exdates || [];
  ev.checklist = asArray(ev.checklist);
  if (!Array.isArray(ev.reminders)) ev.reminders = legacyReminders(ev.notifyMinutes);
  delete ev.notifyMinutes;
}
function legacyReminders(minutes) {
  return (minutes === undefined || minutes === null) ? [] : [{ minutes }];
}
function normaliseBoardsAndPresets(d) {
  d.boards = asArray(d.boards);
  if (!Array.isArray(d.presets)) d.presets = defaultPresets(d.labels);
  d.presets.forEach((preset) => normalisePreset(preset));
  const cardIds = normaliseBoardCards(d.boards, new Set(d.events.map((e) => e.id)));
  d.events.forEach((e) => { if (e.cardId && !cardIds.has(e.cardId)) delete e.cardId; });
}
function normalisePreset(preset) {
  preset.checklist = asArray(preset.checklist);
  preset.reminders = asArray(preset.reminders);
  preset.duration = +preset.duration || 60;
}
function normaliseBoardCards(boards, eventIds) {
  const cardIds = new Set();
  boards.forEach((board) => {
    board.lists = asArray(board.lists);
    board.lists.forEach((list) => normaliseList(list, eventIds, cardIds));
  });
  return cardIds;
}
function normaliseList(list, eventIds, cardIds) {
  list.cards = asArray(list.cards);
  list.cards.forEach((card) => {
    normaliseCard(card, eventIds);
    cardIds.add(card.id);
  });
}
function normaliseCard(card, eventIds) {
  card.checklist = asArray(card.checklist);
  card.reminders = asArray(card.reminders);
  card.due = typeof card.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(card.due) ? card.due : null;
  card.repeat = card.repeat && card.repeat.freq && card.repeat.freq !== 'none' ? card.repeat : null;
  if (card.eventId && !eventIds.has(card.eventId)) card.eventId = null;
}

function loadPrefs() {
  try { applyPrefs(JSON.parse(localStorage.getItem(LS_PREFS) || '{}')); } catch (_) { }
  try { notifiedKeys = new Set(JSON.parse(localStorage.getItem(LS_NOTIFIED) || '[]')); }
  catch (_) { notifiedKeys = new Set(); }
}
function applyPrefs(prefs) {
  if (prefs.view && VIEW_META[prefs.view]) view = prefs.view;
  if (Array.isArray(prefs.hiddenLabels)) hiddenLabels = new Set(prefs.hiddenLabels);
  if (prefs.boardId) boardId = prefs.boardId;
  if (prefs.openAppId) openAppId = prefs.openAppId;
  if (prefs.openNoteId) openNoteId = prefs.openNoteId;
  if (prefs.noteMode === 'read') noteMode = 'read';
  if (Array.isArray(prefs.openFolders)) openFolders = new Set(prefs.openFolders);
}
function savePrefs() {
  localStorage.setItem(LS_PREFS, JSON.stringify({ view, hiddenLabels: [...hiddenLabels], boardId, openAppId, openNoteId, noteMode, openFolders: [...openFolders] }));
}
function saveNotified() {
  localStorage.setItem(LS_NOTIFIED, JSON.stringify([...notifiedKeys].slice(-800)));
}

function rerenderAndReschedule() {
  render();
  scheduleTick();
  swSchedule();
}
function applyDataLook() {
  applyTheme(DATA.settings.theme);
  applyAmbient(DATA.settings.ambient !== false);
}
function pushHistorySnapshot() {
  _undo.push(_histSnap);
  if (_undo.length > 60) _undo.shift();
  _redo.length = 0;
  _histSnap = JSON.stringify(DATA);
  updateUndoButtons();
}
async function commit({ save = true, history = true } = {}) {
  if (history && _histSnap != null) pushHistorySnapshot();
  if (save) await saveData();
  rerenderAndReschedule();
}

function updateUndoButtons() {
  const undoBtn = $('#undoBtn'), redoBtn = $('#redoBtn');
  if (undoBtn) undoBtn.classList.toggle('disabled', !_undo.length);
  if (redoBtn) redoBtn.classList.toggle('disabled', !_redo.length);
}
function restoreHistory(from, to, doneMessage) {
  to.push(JSON.stringify(DATA));
  DATA = normalise(JSON.parse(from.pop()));
  _histSnap = JSON.stringify(DATA);
  applyDataLook();
  updateUndoButtons();
  saveData();
  rerenderAndReschedule();
  toast(doneMessage, 'ok', 1800);
}
function undo() {
  if (!_undo.length) { toast('Nothing to undo', 'info', 2200); return; }
  restoreHistory(_undo, _redo, 'Undone');
}
function redo() {
  if (!_redo.length) { toast('Nothing to redo', 'info', 2200); return; }
  restoreHistory(_redo, _undo, 'Redone');
}

const labelById = (id) => DATA.labels.find((l) => l.id === id);
function labelColor(id) { const l = labelById(id); return l ? l.color : '#8a97a0'; }
function labelName(id) { const l = labelById(id); return l ? l.name : ''; }

function visibleEvents() { return DATA.events.filter((e) => !hiddenLabels.has(e.labelId)); }
function occurrencesBetween(start, end, all) {
  const src = all ? DATA.events : visibleEvents();
  const out = [];
  for (const ev of src) out.push(...Recurrence.expand(ev, start, end));
  return out.sort((a, b) => a.start - b.start);
}
function checklistProgress(ev) {
  if (!ev.checklist || !ev.checklist.length) return null;
  const done = ev.checklist.filter((i) => i.done).length;
  return { done, total: ev.checklist.length };
}
function hasReminders(ev) { return ev.reminders && ev.reminders.length; }
function eventTitleHtml(ev) { return escapeHtml(ev.title || '(untitled)'); }
function occurrenceIcons(o) {
  const progress = checklistProgress(o.event);
  return (o.isRecurring ? ic('repeat') : '')
    + (hasReminders(o.event) ? ic('bell') : '')
    + (progress ? ic('check') + progress.done + '/' + progress.total : '');
}

const NO_REPEAT = () => ({ freq: 'none', interval: 1, byDay: [], end: { type: 'never' } });
const boardById = (id) => DATA.boards.find((b) => b.id === id);
const presetById = (id) => DATA.presets.find((p) => p.id === id);
function currentBoard() { return boardById(boardId) || DATA.boards[0] || null; }
function findList(listId) {
  for (const board of DATA.boards) {
    const list = board.lists.find((l) => l.id === listId);
    if (list) return { board, list };
  }
  return null;
}
function findCard(cardId) {
  for (const board of DATA.boards) {
    for (const list of board.lists) {
      const index = list.cards.findIndex((c) => c.id === cardId);
      if (index >= 0) return { board, list, card: list.cards[index], index };
    }
  }
  return null;
}
function cardEvent(card) { return card && card.eventId ? DATA.events.find((e) => e.id === card.eventId) : null; }
const isDoneList = (l) => /^(done|finished|complete(d)?|klart?)$/i.test(String((l && l.name) || '').trim());
function eventCard(ev) { return ev && ev.cardId ? findCard(ev.cardId) : null; }
function eventDone(ev) { const f = eventCard(ev); return !!(f && isDoneList(f.list)); }

function copyShared(from, to) {
  to.title = from.title;
  to.notes = from.notes || '';
  to.labelId = from.labelId || null;
  to.checklist = (from.checklist || []).map((i) => ({ ...i }));
}
function moveCard(cardId, listId, index) {
  const found = findCard(cardId), target = findList(listId);
  if (!found || !target) return;
  found.list.cards.splice(found.index, 1);
  const cards = target.list.cards;
  const at = index == null ? cards.length : Math.max(0, Math.min(index, cards.length));
  cards.splice(at, 0, found.card);
  if (found.card.repeat && isDoneList(target.list) && !isDoneList(found.list)) spawnNextRoutine(found.card, target.board);
}
function spawnNextRoutine(card, board) {
  const next = spawnRoutine(card, board);
  if (next) toast(`Next “${next.title}” is due ${fmtDueDate(next.due)}`, 'ok', 5000);
}

function dueInfo(card, done) {
  if (!card.due) return null;
  const diff = Math.round((new Date(card.due + 'T00:00') - clampDay(new Date())) / 86400000);
  const text = diff === 0 ? 'Due today' : diff === 1 ? 'Due tomorrow' : diff === -1 ? 'Due yesterday'
    : 'Due ' + fmtDueDate(card.due);
  return { text, diff, cls: done ? 'ok' : diff < 0 ? 'late' : diff <= 1 ? 'soon' : '' };
}
function openCards() {
  const out = [];
  for (const b of DATA.boards) for (const l of b.lists) if (!isDoneList(l)) for (const c of l.cards) out.push([c, l, b]);
  return out;
}

const REPEAT_KINDS = [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Every weekday'],
  ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['yearly', 'Every year']];
function repeatRule(kind, base) {
  const r = (freq, interval, byDay) => ({ freq, interval, byDay, end: { type: 'never' } });
  const wd = base.getDay();
  return ({
    daily: r('daily', 1, []), weekdays: r('weekly', 1, [1, 2, 3, 4, 5]), weekly: r('weekly', 1, [wd]),
    biweekly: r('weekly', 2, [wd]), monthly: r('monthly', 1, []), yearly: r('yearly', 1, []),
  })[kind] || null;
}
function repeatKind(rule) {
  if (!rule) return 'none';
  const by = (rule.byDay || []).join();
  if (rule.freq === 'daily' && rule.interval === 1) return 'daily';
  if (rule.freq === 'weekly' && by === '1,2,3,4,5') return 'weekdays';
  if (rule.freq === 'weekly' && (rule.byDay || []).length <= 1) return rule.interval === 2 ? 'biweekly' : rule.interval === 1 ? 'weekly' : 'custom';
  if (rule.freq === 'monthly' && rule.interval === 1) return 'monthly';
  if (rule.freq === 'yearly' && rule.interval === 1) return 'yearly';
  return 'custom';
}
function nextRoutineDate(rule, ref) {
  const s = toLocalISO(clampDay(ref));
  const occ = Recurrence.expand({ id: 'r', start: s, end: s, allDay: true, recurrence: rule, exdates: [] },
    clampDay(ref), addDays(ref, 800));
  const floor = Math.max(+addDays(clampDay(ref), 1), +clampDay(new Date()));
  const hit = occ.find((o) => +clampDay(o.start) >= floor);
  return hit ? clampDay(hit.start) : null;
}
function routineRefDate(card, ev) {
  return card.due ? new Date(card.due + 'T00:00') : ev ? new Date(ev.start) : new Date();
}
function routineHomeList(card, board) {
  return board.lists.find((l) => l.id === card.homeListId && !isDoneList(l))
    || board.lists.find((l) => !isDoneList(l));
}
function cloneRoutineCard(card, next) {
  return Object.assign(JSON.parse(JSON.stringify(card)), {
    id: uid(), eventId: null, createdAt: Date.now(), due: isoDate(next),
    checklist: card.checklist.map((i) => ({ id: uid(), text: i.text, done: false })),
  });
}
function spawnRoutine(card, board) {
  const ev = cardEvent(card);
  const next = nextRoutineDate(card.repeat, routineRefDate(card, ev));
  const home = routineHomeList(card, board);
  if (!next || !home) return null;
  const copy = cloneRoutineCard(card, next);
  card.repeat = null;
  addRoutineCopy(copy, home, ev, next);
  return copy;
}
function addRoutineCopy(copy, home, ev, next) {
  home.cards.push(copy);
  if (ev && ev.recurrence.freq === 'none') scheduleRoutineCopy(copy, ev, next);
}
function scheduleRoutineCopy(copy, ev, next) {
  const evStart = new Date(ev.start);
  const start = new Date(next);
  start.setHours(evStart.getHours(), evStart.getMinutes(), 0, 0);
  if (!ev.allDay) copy.duration = Math.round((new Date(ev.end) - evStart) / 60000);
  copy.reminders = ev.reminders.map((r) => ({ ...r }));
  scheduleCard(copy, start, ev.allDay);
}
function cardEventRange(card, start, allDay) {
  if (!allDay) return [start, addMin(start, card.duration || 60)];
  const day = isoDate(start);
  return [new Date(day + 'T00:00'), new Date(day + 'T23:59')];
}
function newCardEvent(card, start, end, allDay) {
  return {
    id: uid(), title: card.title, notes: '', start: toLocalISO(start), end: toLocalISO(end), allDay,
    labelId: null, reminders: (card.reminders || []).map((r) => ({ ...r })),
    recurrence: NO_REPEAT(), exdates: [], checklist: [], cardId: card.id,
  };
}
function scheduleCard(card, start, allDay) {
  const [s, e] = cardEventRange(card, start, allDay);
  let ev = cardEvent(card);
  if (ev) { Object.assign(ev, { start: toLocalISO(s), end: toLocalISO(e), allDay }); return ev; }
  ev = newCardEvent(card, s, e, allDay);
  copyShared(card, ev);
  DATA.events.push(ev);
  card.eventId = ev.id;
  return ev;
}
function unlinkEvent(ev) {
  const f = eventCard(ev);
  if (f) f.card.eventId = null;
  delete ev.cardId;
}
function cardFromPreset(p, title) {
  return {
    id: uid(), title: title || p.title || p.name, notes: p.notes || '', labelId: p.labelId || null,
    checklist: p.checklist.map((text) => ({ id: uid(), text, done: false })),
    reminders: p.reminders.map((m) => ({ minutes: m })),
    duration: p.allDay ? 60 : p.duration, eventId: null, createdAt: Date.now(),
  };
}
function presetOptions() {
  return DATA.presets.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

const lockScreen = $('#lockScreen');
const shell = $('#shell');

let _bootMeta = undefined;

function isCreatingAccount() {
  const serverUp = _bootMeta !== null;
  const hasLocal = CryptoBox.hasLocalVault();
  return serverUp ? !_bootMeta.initialized : !hasLocal;
}
function showInsecureContext() {
  $('#lockMsg').textContent = 'Unavailable in this context';
  $('#lockError').hidden = false;
  $('#lockError').textContent =
    'Web Crypto needs a secure context. Open PlanTim over https or http://localhost.';
  $('#lockForm').hidden = true;
}
async function bootLock() {
  if (!CryptoBox.secureContextOK()) { showInsecureContext(); return; }
  $('#lockMsg').textContent = 'Checking…';
  _bootMeta = await Sync.meta();
  const serverUp = _bootMeta !== null;
  showLockForm(isCreatingAccount(), serverUp);
  $('#pw1').focus();
}
function showLockForm(creating, serverUp) {
  $('#lockForm').hidden = false;
  $('#resetForm').hidden = true;
  $('#pw2').hidden = !creating;
  $('#genPwBtn').hidden = !creating;
  $('#forgotBtn').hidden = creating || !serverUp || !_bootMeta.recovery;
  $('#lockSubmit').textContent = creating ? 'Create & open' : 'Sign in';
  showLockMessages(creating, serverUp);
}
function showLockMessages(creating, serverUp) {
  $('#lockMsg').textContent = creating
    ? 'Create your password'
    : (serverUp ? 'Sign in' : 'Unlock offline. Changes sync when you are back online');
  const note = $('#lockNote2');
  if (!note) return;
  note.textContent = creating && !serverUp
    ? 'No connection to the sync server, so this password will be for this device only until it can reach it.'
    : '';
}

$('#showPw').addEventListener('change', (e) => {
  const type = e.target.checked ? 'text' : 'password';
  $('#pw1').type = type;
  $('#pw2').type = type;
});
$('#genPwBtn').addEventListener('click', () => {
  const pw = strongPassword();
  $('#pw1').type = $('#pw2').type = 'text';
  $('#showPw').checked = true;
  $('#pw1').value = pw;
  $('#pw2').value = pw;
  toast('Generated a strong password. Save it in your password manager now.', 'info', 12000);
});
function strongPassword() {
  const sets = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';
  const rnd = crypto.getRandomValues(new Uint32Array(20));
  return [...rnd].map((n) => sets[n % sets.length]).join('');
}

const PASSWORD_ERRORS = {
  'too-short': 'Use at least 6 characters.',
  'mismatch': 'The two passwords do not match.',
  'rate-limited': 'Too many attempts. Wait about 15 minutes.',
};
const LOGIN_ERRORS = {
  ...PASSWORD_ERRORS,
  'wrong-password': 'Wrong password.',
  'need-online': 'Connect to the internet to set up PlanTim for the first time.',
  'already-initialized': 'This account already exists on the server. Enter its password to sign in.',
};
const RESET_ERRORS = {
  ...PASSWORD_ERRORS,
  'reset-not-enabled': 'The server has no open reset window. Run "node serve.js allow-reset" on the server, or create an empty file named allow-reset in its .plantim-data folder, then try again within 30 minutes.',
  'no-recovery': 'No recovery key was ever set up for this account, so the password cannot be reset.',
  'wrong-recovery': 'That recovery key is not correct.',
};
function errorMessage(messages, ex, fallback) {
  return messages[ex.message] || fallback + (ex.message || '');
}
async function withBusyButton(btn, busyText, restoreText, work) {
  btn.disabled = true;
  btn.textContent = busyText;
  try {
    await work();
  } finally {
    btn.disabled = false;
    btn.textContent = restoreText;
  }
}

$('#lockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#lockError').hidden = true;
  const pw = $('#pw1').value;
  const btn = $('#lockSubmit');
  await withBusyButton(btn, 'Working…', btn.textContent, async () => {
    try { await loginAndClear(pw); } catch (ex) { await showLoginError(ex); }
  });
});
async function loginAndClear(pw) {
  await doLogin(pw);
  $('#pw1').value = $('#pw2').value = '';
}
async function showLoginError(ex) {
  const err = $('#lockError');
  err.hidden = false;
  err.textContent = errorMessage(LOGIN_ERRORS, ex, 'Could not sign in. ');
  if (ex.message === 'already-initialized') await relockAfterConflict();
  $('#pw1').select();
}
async function relockAfterConflict() {
  CryptoBox.lock();
  await bootLock();
  $('#lockError').hidden = false;
}

function checkNewPassword(pw, repeated) {
  if (pw.length < 6) throw new Error('too-short');
  if (pw !== repeated) throw new Error('mismatch');
}
async function deriveFreshKeys(pw) {
  const { meta: saltMeta } = CryptoBox.freshSalt();
  const authKey = await CryptoBox.deriveAndHold(pw, saltMeta);
  const verifier = await CryptoBox.makeVerifier();
  return { saltMeta, authKey, verifier };
}
function storeVault(saltMeta, verifier, blob) {
  CryptoBox.cacheLocal(saltMeta, verifier);
  localStorage.setItem(LS_DATA, blob);
}
async function doLogin(pw) {
  const serverUp = _bootMeta !== null;
  const creating = isCreatingAccount();
  if (creating) return createAccount(pw, serverUp);
  if (serverUp) return loginOnline(pw);
  await CryptoBox.unlock(pw);
  return enterApp({});
}
async function createAccount(pw, serverUp) {
  checkNewPassword(pw, $('#pw2').value);
  const { saltMeta, authKey, verifier } = await deriveFreshKeys(pw);
  const blob = await CryptoBox.encryptObject(DEFAULT_DATA());
  if (serverUp) await Sync.setup(saltMeta, authKey, verifier, blob);
  storeVault(saltMeta, verifier, blob);
  return enterApp({ blob, version: Sync.getVersion(), offline: !serverUp });
}
async function loginOnline(pw) {
  const saltMeta = _bootMeta.salt;
  const authKey = await CryptoBox.deriveAndHold(pw, saltMeta);
  if (!_bootMeta.session) await Sync.login(authKey);
  const pulled = await pullWithRelogin(authKey);
  const obj = await decryptOrWrongPassword(pulled.blob);
  storeVault(saltMeta, await CryptoBox.makeVerifier(), pulled.blob);
  Sync.setVersion(pulled.version);
  return enterApp({ obj, version: pulled.version });
}
async function pullWithRelogin(authKey) {
  try {
    return await Sync.pull();
  } catch (ex) {
    if (ex.message !== 'auth') throw ex;
    await Sync.login(authKey);
    return Sync.pull();
  }
}
async function decryptOrWrongPassword(blob) {
  try { return await CryptoBox.decryptObject(blob); }
  catch (_) { CryptoBox.lock(); throw new Error('wrong-password'); }
}

$('#forgotBtn').addEventListener('click', () => {
  $('#lockForm').hidden = true;
  $('#resetForm').hidden = false;
  $('#rsError').hidden = true;
  $('#lockMsg').textContent = 'Reset your password';
  $('#rsCode').focus();
});
$('#rsBack').addEventListener('click', () => bootLock());
$('#resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#rsError').hidden = true;
  await withBusyButton($('#rsSubmit'), 'Working…', 'Reset password', async () => {
    try { await submitReset(); } catch (ex) { showResetError(ex); }
  });
});
async function submitReset() {
  await resetWithRecovery($('#rsCode').value, $('#rsPw1').value, $('#rsPw2').value);
  $('#rsCode').value = $('#rsPw1').value = $('#rsPw2').value = '';
  toast('Password reset. Your data is intact; other devices must sign in with the new password.', 'ok', 9000);
}
function showResetError(ex) {
  CryptoBox.lock();
  const err = $('#rsError');
  err.hidden = false;
  err.textContent = errorMessage(RESET_ERRORS, ex, 'Could not reset. ');
}

async function resetWithRecovery(code, pw, pw2) {
  checkNewPassword(pw, pw2);
  const recovery = await Sync.fetchRecovery();
  const recRaw = await CryptoBox.recoveryKeyFromCode(code);
  await Sync.login(await openRecoveryOrFail(recovery, recRaw));
  const obj = await pullAndDecrypt();
  await rekeyTo(pw, obj, recRaw);
  return enterApp({ obj, version: Sync.getVersion() });
}
async function openRecoveryOrFail(recovery, recRaw) {
  try { return await CryptoBox.openRecovery(recovery, recRaw); }
  catch (_) { throw new Error('wrong-recovery'); }
}
async function pullAndDecrypt() {
  const pulled = await Sync.pull();
  const obj = await CryptoBox.decryptObject(pulled.blob);
  Sync.setVersion(pulled.version);
  return obj;
}

async function rekeyTo(newPw, plain, recRaw) {
  const oldAuthKey = CryptoBox.getAuthKey();
  const keys = await deriveFreshKeys(newPw);
  const blob = await CryptoBox.encryptObject(plain);
  const rec = recRaw ? await CryptoBox.sealRecovery(recRaw) : null;
  if (syncReady()) await pushRekey(oldAuthKey, keys, blob, rec);
  storeVault(keys.saltMeta, keys.verifier, blob);
  _lastBlob = blob;
  return blob;
}
async function pushRekey(oldAuthKey, keys, blob, rec) {
  await Sync.rekey(oldAuthKey, keys.saltMeta, keys.authKey, keys.verifier, blob, rec);
  setVersion(Sync.getVersion());
}

async function lockNow({ signOut = false } = {}) {
  await flushPendingPush();
  if (signOut) await signOutDevice();
  CryptoBox.lock();
  stopBackgroundTimers();
  resetSessionState();
  showLockScreen();
  bootLock();
}
async function flushPendingPush() {
  clearTimeout(_pushTimer);
  if (!_lastBlob || !Sync.isLoggedIn()) return;
  try { await Sync.push(_lastBlob); } catch (_) { }
}
async function signOutDevice() {
  await Sync.logout();
  const sw = navigator.serviceWorker;
  if (sw && sw.controller) sw.controller.postMessage({ type: 'clear-reminders' });
}
function stopBackgroundTimers() {
  clearInterval(notifyTimer);
  clearInterval(_syncTimer);
  clearTimeout(idleTimer);
}
function resetSessionState() {
  DATA = DEFAULT_DATA();
  _lastBlob = null;
  _dataVersion = 0;
  _undo.length = _redo.length = 0;
  _histSnap = null;
  updateUndoButtons();
  gadgetMode = false;
}
function showLockScreen() {
  Particles.setUnlocked(false);
  document.body.classList.add('locked');
  shell.classList.remove('gadget', 'floating', 'maximized');
  shell.style.left = shell.style.top = shell.style.width = shell.style.height = '';
  shell.hidden = true;
  lockScreen.hidden = false;
  closeModal();
}

async function enterApp(src = {}) {
  if (!(await loadSessionData(src))) return;
  initSessionState(src);
  revealApp();
  refreshShellChrome();
  startAppServices();
}
async function loadSessionData(src) {
  try {
    await readSessionData(src);
    return true;
  } catch (ex) {
    reportUndecryptable(ex);
    return false;
  }
}
async function readSessionData(src) {
  if (src.obj) DATA = normalise(src.obj);
  else if (src.blob) DATA = normalise(await CryptoBox.decryptObject(src.blob));
  else await loadData();
}
function reportUndecryptable(ex) {
  console.error(ex);
  toast('Stored data could not be decrypted with this password.', 'error', 10000);
  CryptoBox.lock();
}
function initSessionState(src) {
  loadPrefs();
  _histSnap = JSON.stringify(DATA);
  _undo.length = _redo.length = 0;
  _lastBlob = localStorage.getItem(LS_DATA);
  _dirty = (src.offline === true);
  if (src.version != null) setVersion(src.version);
}
function revealApp() {
  document.body.classList.remove('locked');
  Particles.setUnlocked(true);
  applyAmbient(DATA.settings.ambient !== false);
  applyTheme(DATA.settings.theme);
  lockScreen.hidden = true;
  shell.hidden = false;
}
function refreshShellChrome() {
  syncViewSeg();
  refreshNotifyButton();
  updateUndoButtons();
  registerSW();
  render();
}
function startAppServices() {
  startNotifyLoop();
  startSyncLoop();
  armIdleLock();
  backupNudge();
  refreshPush();
  handleLaunch();
}

const _launch = (() => {
  const q = new URLSearchParams(location.search);
  const l = { do: q.get('do'), title: q.get('share-title'), text: q.get('share-text'), url: q.get('share-url') };
  if (location.search) history.replaceState(null, '', location.pathname);
  return (l.do || l.title || l.text || l.url) ? l : null;
})();
function handleLaunch() {
  if (!_launch) return;
  const launch = { ..._launch };
  for (const k of Object.keys(_launch)) delete _launch[k];
  if (launch.do === 'new-event') openEventModal(null, null);
  else if (launch.do === 'boards') setView('boards');
  else if (launch.do === 'quick') setTimeout(() => quickAdd.focus(), 50);
  else if (launch.title || launch.text || launch.url) openSharedModal(launch);
}
function parseSharedItem(shared) {
  const text = (shared.text || '').trim();
  const url = (shared.url || (text.match(/https?:\/\/\S+/) || [])[0] || '').trim();
  const body = text.replace(url, '').trim();
  const title = (shared.title || body.split('\n')[0] || url).slice(0, 200);
  const notes = [body && body !== title ? body : '', url].filter(Boolean).join('\n');
  return { title, notes };
}
function openSharedModal(l) {
  const { title, notes } = parseSharedItem(l);
  openModal('Save to PlanTim');
  modalBody.innerHTML = sharedFormHtml(title, notes);
  $('#sh-cancel').addEventListener('click', closeModal);
  $('#shForm').addEventListener('submit', saveSharedItem);
}
function sharedFormHtml(title, notes) {
  return `
    <form id="shForm" class="form">
      ${sharedFieldsHtml(title, notes)}
      ${sharedWhereHtml()}
      <div class="form-actions"><span class="spacer"></span>
        <button type="button" class="btn-secondary" id="sh-cancel">Discard</button>
        <button type="submit" class="btn-primary">Save</button></div>
    </form>`;
}
function sharedFieldsHtml(title, notes) {
  return `<label class="f-row"><span>Title</span><input class="field" id="sh-title" value="${escapeHtml(title)}" autofocus /></label>
      <label class="f-row"><span>Notes</span><textarea class="field" id="sh-notes" rows="3">${escapeHtml(notes)}</textarea></label>`;
}
function sharedWhereHtml() {
  return `<label class="f-row"><span>Save as</span>
        <select class="field" id="sh-where">
          <option value="task">A task (sidebar)</option>
          <option value="event">An event today (all day)</option>
          ${shareTargetOptions()}
        </select></label>`;
}
function shareTargetOptions() {
  const board = currentBoard();
  return DATA.boards.map((b) => `<optgroup label="${escapeHtml(b.name)}">${b.lists.map((li) =>
    shareListOption(b, li, b === board && li === b.lists[0])).join('')}</optgroup>`).join('');
}
function shareListOption(board, list, selected) {
  return `<option value="list:${list.id}" ${selected ? 'selected' : ''}>Card in ${escapeHtml(board.name)} › ${escapeHtml(list.name)}</option>`;
}
async function saveSharedItem(e) {
  e.preventDefault();
  const title = $('#sh-title').value.trim() || 'Shared item';
  const notes = $('#sh-notes').value.trim();
  storeSharedItem($('#sh-where').value, title, notes);
  closeModal();
  await commit();
  toast('Saved: ' + title, 'ok');
}
function storeSharedItem(where, title, notes) {
  if (where === 'task') DATA.tasks.push(sharedTask(title, notes));
  else if (where === 'event') DATA.events.push(sharedEvent(title, notes));
  else addSharedCard(where.slice(5), title, notes);
}
function sharedTask(title, notes) {
  const text = notes ? `${title}: ${notes.split('\n').pop()}` : title;
  return { id: uid(), title: text, done: false, labelId: null, createdAt: Date.now() };
}
function sharedEvent(title, notes) {
  const day = isoDate(new Date());
  return { id: uid(), title, notes, start: day + 'T00:00', end: day + 'T23:59', allDay: true,
    labelId: null, reminders: [], recurrence: NO_REPEAT(), exdates: [], checklist: [] };
}
function addSharedCard(listId, title, notes) {
  const found = findList(listId);
  if (!found) return;
  found.list.cards.push({ id: uid(), title, notes, labelId: null, checklist: [], reminders: [], duration: 60, eventId: null, createdAt: Date.now() });
}

let _installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _installPrompt = e; });
addEventListener('appinstalled', () => { _installPrompt = null; toast('PlanTim is installed as an app', 'ok'); });
const isInstalled = () => matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay)').matches
  || navigator.standalone === true;
const isAppleTouch = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IOS_INSTALL_NOTE = `<p class="set-note"><b>iPhone / iPad:</b> open PlanTim in Safari, tap <b>Share</b> ▸ <b>Add to Home Screen</b>.
          Then open it from the home screen and turn on push reminders in Settings.</p>`;
const DESKTOP_INSTALL_NOTES = `<p class="set-note"><b>Windows / Mac (Edge or Chrome):</b> click the install icon at the right of the address bar,
          or <b>⋯ ▸ Apps ▸ Install PlanTim</b> (Chrome: <b>⋮ ▸ Cast, save and share ▸ Install page as app</b>).
          It gets its own window, a Start-menu / Dock icon, and taskbar shortcuts (New event, Quick add, Boards).</p>
          <p class="set-note"><b>Android (Chrome):</b> <b>⋮ ▸ Add to Home screen / Install app</b>. Then you can share links and
          text from other apps straight into PlanTim.</p>`;
async function installApp() {
  if (isInstalled()) { toast('You are already using the installed app', 'info'); return; }
  if (await promptInstall()) return;
  const ios = isAppleTouch();
  openModal('Install PlanTim');
  modalBody.innerHTML = installHelpHtml(ios);
  $('#inst-ok').addEventListener('click', closeModal);
}
async function promptInstall() {
  if (!_installPrompt) return false;
  _installPrompt.prompt();
  const choice = await _installPrompt.userChoice;
  _installPrompt = null;
  return !!(choice && choice.outcome === 'accepted');
}
function installHelpHtml(ios) {
  return `
    <div class="form">
      ${ios ? IOS_INSTALL_NOTE : DESKTOP_INSTALL_NOTES}
      <p class="set-note">Installing needs the page served over https (or localhost).</p>
      <div class="form-actions"><span class="spacer"></span><button type="button" class="btn-primary" id="inst-ok">OK</button></div>
    </div>`;
}
if (isInstalled()) document.documentElement.classList.add('installed');

let _booted = false;
function bootOnce() { if (_booted) return; _booted = true; Demo.start(); }
document.addEventListener('DOMContentLoaded', bootOnce);
if (document.readyState !== 'loading') bootOnce();

const LS_MODE = 'plantim.appearance';
const _darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyAppearance(pref) {
  pref = ['light', 'dark', 'system'].includes(pref) ? pref : 'light';
  safeSetItem(LS_MODE, pref);
  const mode = pref === 'dark' || (pref === 'system' && _darkMQ.matches) ? 'dark' : 'light';
  if (document.documentElement.dataset.mode === mode) return;
  document.documentElement.dataset.mode = mode;
  applyFavicon();
  if (!shell.hidden) render();
}
_darkMQ.addEventListener('change', () => applyAppearance(localStorage.getItem(LS_MODE)));
applyAppearance(localStorage.getItem(LS_MODE));

function themeSwatch(t) {
  return t === 'custom' ? DATA.settings.customTheme.accent : THEME_SWATCH[t];
}
function applyCustomTheme() {
  const ct = DATA.settings.customTheme, st = document.documentElement.style;
  st.setProperty('--c-accent', ct.accent);
  st.setProperty('--c-accent-hover', shade(ct.accent, -0.12));
  st.setProperty('--c-accent-ink', shade(ct.accent, -0.4));
  st.setProperty('--c-bg', ct.bg);
  st.setProperty('--c-bg-image', ct.image ? `url("${ct.image.replace(/"/g, '%22')}")` : 'none');
}
function applyTheme(name) {
  document.documentElement.dataset.theme = THEMES.includes(name) ? name : 'red';
  applyCustomTheme();
  applyAppearance(DATA.settings.appearance);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themeSwatch(document.documentElement.dataset.theme);
  applyFavicon();
  Particles.retheme();
}
function faviconColors() {
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim() || '#c4314b';
  const inkColor = darkMode() ? shade(accent, -0.4) : css.getPropertyValue('--accent-ink').trim() || '#7d1d2e';
  return { accent, inkColor };
}
function faviconSvg(accent, inkColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="112" fill="${accent}"/>
  <rect x="112" y="128" width="288" height="264" rx="34" fill="#fff"/>
  <path d="M112 162a34 34 0 0 1 34-34h220a34 34 0 0 1 34 34v42H112z" fill="${inkColor}"/>
  <rect x="164" y="100" width="28" height="64" rx="14" fill="#fff"/>
  <rect x="320" y="100" width="28" height="64" rx="14" fill="#fff"/>
  ${faviconCells(accent)}
</svg>`;
}
function faviconCells(accent) {
  return `<g fill="${accent}">
    <rect x="152" y="236" width="52" height="40" rx="8"/><rect x="230" y="236" width="52" height="40" rx="8"/>
    <rect x="308" y="236" width="52" height="40" rx="8"/><rect x="152" y="306" width="52" height="40" rx="8"/>
    <rect x="230" y="306" width="52" height="40" rx="8"/>
  </g>`;
}
function applyFavicon() {
  const { accent, inkColor } = faviconColors();
  const src = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg(accent, inkColor));
  const svgLink = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  if (svgLink) svgLink.href = src;
  const pngLink = document.querySelector('link[rel="icon"][type="image/png"]');
  if (pngLink) rasterizeFavicon(src, pngLink);
}
function rasterizeFavicon(src, pngLink) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    canvas.getContext('2d').drawImage(img, 0, 0, 64, 64);
    try { pngLink.href = canvas.toDataURL('image/png'); } catch (_) {}
  };
  img.src = src;
}
function applyAmbient(on) {
  document.body.classList.toggle('calm', !on);
  Particles.setEnabled(on);
}
addEventListener('blur', () => document.body.classList.add('unfocused'));
addEventListener('focus', () => document.body.classList.remove('unfocused'));

function backupNudge() {
  if (Sync.isLoggedIn()) { nudgeRecoveryKey(); return; }
  if (!DATA.events.length && !DATA.tasks.length) return;
  const last = DATA.settings.lastExport || 0;
  if (Date.now() - last < 30 * 86400000) return;
  toast('No password reset exists. Export a backup so you never lose your agenda.',
    'info', 14000, null, [{ text: 'Export now', act: exportData }]);
}
function nudgeRecoveryKey() {
  if (Sync.hasRecovery()) return;
  if (Date.now() - readRecoveryNudgeTime() < 14 * 86400000) return;
  safeSetItem('plantim.recNudge', String(Date.now()));
  toast('Set up a recovery key so a forgotten password can be reset without losing data.',
    'info', 14000, null, [{ text: 'Set it up', act: openRecoveryModal }]);
}
function readRecoveryNudgeTime() {
  try { return +localStorage.getItem('plantim.recNudge') || 0; } catch (_) { return 0; }
}

let _syncTimer = null;

const SYNC_STATES = {
  synced:   { dot: '#2f9e44', text: 'Synced' },
  saving:   { dot: '#f08c00', text: 'Saving…' },
  offline:  { dot: '#8b959d', text: 'Offline' },
  signedout:{ dot: '#d13438', text: 'Signed out' },
  local:    { dot: '#8b959d', text: 'This device only' },
};
function setSyncBadge(state) {
  const badge = $('#syncBadge');
  if (!badge) return;
  if (!Sync.isOnline() && state !== 'saving') state = CryptoBox.hasLocalVault() && !Sync.isLoggedIn() ? 'local' : 'offline';
  const look = SYNC_STATES[state] || SYNC_STATES.offline;
  badge.dataset.state = state;
  badge.innerHTML = `<i style="background:${look.dot}"></i>${look.text}`;
  badge.title = syncBadgeTitle(state);
}
function syncBadgeTitle(state) {
  return state === 'signedout' ? 'Session expired. Click to sign in again'
    : state === 'offline' ? 'No connection to the sync server'
    : state === 'local' ? 'Not linked to the server yet'
    : 'Click to sync now';
}

function startSyncLoop() {
  clearInterval(_syncTimer);
  setSyncBadge(Sync.isLoggedIn() ? 'synced' : (Sync.isOnline() ? 'local' : 'offline'));
  _syncTimer = setInterval(() => { if (!document.hidden) syncNow(); }, 60000);
  setTimeout(syncNow, 3000);
}

let _syncing = false;
async function syncNow() {
  if (_syncing || !CryptoBox.isUnlocked()) return;
  _syncing = true;
  try { await _syncNow(); } finally { _syncing = false; }
}

async function _syncNow() {
  const meta = await Sync.meta();
  if (!meta) { setSyncBadge('offline'); return; }
  if (!meta.session && !(await ensureSyncSession(meta))) return;
  if (_dirty && _lastBlob) { await pushPendingChanges(); return; }
  if (Sync.getVersion() > _dataVersion || meta.version > _dataVersion) { await pullRemoteChanges(); return; }
  setSyncBadge('synced');
}
async function ensureSyncSession(meta) {
  const authKey = CryptoBox.getAuthKey();
  if (!authKey) { setSyncBadge(CryptoBox.hasLocalVault() ? 'signedout' : 'local'); return false; }
  if (!meta.initialized) { await linkLocalVault(authKey); return false; }
  try { await Sync.login(authKey); }
  catch (_) { setSyncBadge('signedout'); return false; }
  return true;
}
async function linkLocalVault(authKey) {
  const verifier = localStorage.getItem('plantim.verifier');
  const blob = _lastBlob || await CryptoBox.encryptObject(DATA);
  try {
    await Sync.setup(CryptoBox.localSaltMeta(), authKey, verifier, blob);
    markSynced(Sync.getVersion());
    toast('Linked to the server. Your calendar now syncs across devices', 'ok', 6000);
  } catch (_) { setSyncBadge('local'); }
}
async function pushPendingChanges() {
  try {
    applyPushResult(await Sync.push(_lastBlob), 'Your changes overwrote a newer copy from another device');
  } catch (_) { setSyncBadge('offline'); }
}
async function pullRemoteChanges() {
  try {
    const { blob, version } = await Sync.pull();
    await adoptRemoteData(blob, version);
    setSyncBadge('synced');
    toast('Updated from another device', 'info', 3000);
  } catch (_) { setSyncBadge('offline'); }
}
async function adoptRemoteData(blob, version) {
  DATA = normalise(await CryptoBox.decryptObject(blob));
  setVersion(version);
  _histSnap = JSON.stringify(DATA);
  _lastBlob = blob;
  _dirty = false;
  safeSetItem(LS_DATA, blob);
  applyDataLook();
  rerenderAndReschedule();
}

$('#syncBadge') && $('#syncBadge').addEventListener('click', () => {
  if (!Sync.isOnline()) { toast('Still no connection to the server', 'info', 2500); return; }
  syncNow();
});
addEventListener('online', () => syncNow());
addEventListener('offline', () => setSyncBadge('offline'));

let _renderQueued = false;
function render() {
  if (_renderQueued) return;
  _renderQueued = true;
  requestAnimationFrame(() => { _renderQueued = false; renderNow(); });
}
function renderNow() {
  if (shell.hidden) return;
  toggleMainPanelModes();
  if (gadgetMode) { renderGadget(); return; }
  renderChrome();
  renderMainView();
  savePrefs();
}
function isWideView() { return view === 'apps' || view === 'notes'; }
function toggleMainPanelModes() {
  const panel = $('#mainPanel');
  panel.classList.toggle('board-mode', view === 'boards' && !gadgetMode);
  panel.classList.toggle('wide-mode', isWideView() && !gadgetMode);
}
function renderChrome() {
  renderToolbar();
  renderMiniCal();
  renderLabels();
  renderTasks();
  renderSideCards();
  renderSideApps();
  renderUpcoming();
}
function renderMainView() {
  if (view === 'month') renderMonth();
  else if (view === 'agenda') renderAgenda();
  else if (view === 'boards') renderBoards();
  else if (view === 'apps') renderApps();
  else if (view === 'notes') renderNotes();
  else renderTimeGrid((VIEW_META[view] || VIEW_META.week).cols, gridStart());
}

function gridStart() {
  if (view === 'day' || view === '3day') return clampDay(anchor);
  if (view === 'workweek') return startOfWorkWeek(anchor);
  return startOfWeek(anchor);
}

function syncViewSeg() {
  $$('#viewSeg button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
}
function renderToolbar() {
  $('#periodLabel').textContent = periodLabelText();
}
function periodLabelText() {
  if (view === 'day') return fmtDateLong(anchor);
  if (view === 'boards' || isWideView()) return VIEW_META[view].label;
  if (view === 'agenda') return 'Agenda from ' + anchor.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (view === 'month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  return gridRangeLabel(gridStart(), VIEW_META[view].cols);
}
function gridRangeLabel(first, cols) {
  const last = addDays(first, cols - 1);
  if (first.getMonth() === last.getMonth()) {
    return `${MONTHS[first.getMonth()]} ${first.getDate()} to ${last.getDate()}, ${first.getFullYear()}`;
  }
  return `${MONTHS[first.getMonth()]} ${first.getDate()} to ${MONTHS[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
}

function renderMiniCal() {
  const gridFirst = monthGridStart(miniMonth);
  let html = miniCalHeadHtml();
  for (const d of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) html += `<div class="mc-dow">${d}</div>`;
  for (let i = 0; i < 42; i++) html += miniCalDayHtml(addDays(gridFirst, i));
  $('#miniCal').innerHTML = html + '</div>';
}
function miniCalHeadHtml() {
  return `<div class="mc-head">
      <button class="mini-btn" data-mc="prev" type="button">${ic('chevL')}</button>
      <span>${MONTHS[miniMonth.getMonth()]} ${miniMonth.getFullYear()}</span>
      <button class="mini-btn" data-mc="next" type="button">${ic('chevR')}</button>
    </div><div class="mc-grid">`;
}
function miniCalDayHtml(d) {
  const cls = ['mc-day'];
  if (d.getMonth() !== miniMonth.getMonth()) cls.push('muted');
  if (isToday(d)) cls.push('today');
  if (sameDay(d, anchor)) cls.push('sel');
  return `<button type="button" class="${cls.join(' ')}" data-date="${isoDate(d)}">${d.getDate()}</button>`;
}

function renderLabels() {
  const host = $('#labelList');
  if (!DATA.labels.length) { host.innerHTML = '<p class="empty">No labels yet.</p>'; return; }
  host.innerHTML = DATA.labels.map((l) => labelRowHtml(l)).join('');
}
function labelRowHtml(label) {
  const off = hiddenLabels.has(label.id);
  return `<div class="label-row ${off ? 'off' : ''}">
        <button class="label-eye" data-eye="${label.id}" type="button" title="Show / hide">
          <span class="swatch" style="background:${label.color};border-color:${shade(label.color, -0.3)}"></span>
        </button>
        <span class="label-name">${escapeHtml(label.name)}</span>
        <button class="label-edit" data-edit-label="${label.id}" type="button" title="Edit">${ic('edit')}</button>
      </div>`;
}

function renderTasks() {
  const host = $('#taskList');
  const tasks = [...DATA.tasks].sort((a, b) => (a.done - b.done) || (b.createdAt || 0) - (a.createdAt || 0));
  if (!tasks.length) { host.innerHTML = '<p class="empty">No tasks. Add one above.</p>'; return; }
  host.innerHTML = tasks.map((t) => taskRowHtml(t)).join('');
}
function taskRowHtml(task) {
  const color = task.labelId ? labelColor(task.labelId) : '#9aa4ac';
  return `<div class="task-row ${task.done ? 'done' : ''}" data-task="${task.id}">
        <button class="task-grip" data-grip="${task.id}" type="button" title="Drag onto the calendar">${ic('grip')}</button>
        <input type="checkbox" class="task-check" data-check="${task.id}" ${task.done ? 'checked' : ''} />
        <span class="task-dot" style="background:${color}"></span>
        <span class="task-title" data-edit-task="${task.id}">${escapeHtml(task.title)}</span>
        <button class="task-x" data-del-task="${task.id}" type="button" title="Delete">${ic('x')}</button>
      </div>`;
}

function renderUpcoming() {
  const host = $('#upcomingList');
  const now = new Date();
  const list = occurrencesBetween(now, addDays(now, 60)).filter((o) => o.end >= now).slice(0, 12);
  if (!list.length) { host.innerHTML = '<p class="empty">Nothing coming up.</p>'; return; }
  host.innerHTML = list.map((o) => upcomingRowHtml(o)).join('');
}
function upcomingRowHtml(o) {
  const color = labelColor(o.event.labelId);
  const when = o.start.toLocaleDateString([], { month: 'short', day: 'numeric' })
    + (o.allDay ? ' · all day' : ' · ' + fmtTime(o.start));
  return `<button type="button" class="up-row" data-occ="${o.id}">
        <span class="up-dot" style="background:${color}"></span>
        <span class="up-body"><span class="up-title">${eventTitleHtml(o.event)}</span>
        <span class="up-when">${when}${occurrenceIcons(o)}</span></span>
      </button>`;
}

function renderTimeGrid(cols, base) {
  curCols = cols;
  const cal = $('#calendar');
  const prevScroll = gridScrollTop(cal);
  const days = Array.from({ length: cols }, (_, i) => addDays(base, i));
  cal.className = 'calendar tg-view';
  cal.innerHTML = timeGridHtml(cols, base, days);
  restoreGridScroll($('.tg-scroll', cal), cols, base, prevScroll);
}
function gridScrollTop(cal) {
  const scroller = $('.tg-scroll', cal);
  return scroller ? scroller.scrollTop : null;
}
function timeGridHtml(cols, base, days) {
  return `
    <div class="tg-head" style="--tg-cols:${cols}">${timeGridHeadHtml(days)}</div>
    <div class="tg-allday" style="--tg-cols:${cols}">${allDayRowHtml(days, base, cols)}</div>
    <div class="tg-scroll"><div class="tg-body" style="--tg-cols:${cols}">${hourColumnHtml()}<div class="tg-cols">${days.map((d) => dayColumnHtml(d)).join('')}</div></div></div>`;
}
function timeGridHeadHtml(days) {
  return '<div class="tg-corner"></div>' + days.map((d) => dayHeadHtml(d)).join('');
}
function dayHeadHtml(d) {
  return `<button type="button" class="tg-dayhead ${isToday(d) ? 'today' : ''}" data-goto="${isoDate(d)}">
        <span class="tg-dow">${WEEKDAYS[d.getDay()]}</span><span class="tg-dnum">${d.getDate()}</span>
      </button>`;
}
function allDayRowHtml(days, base, cols) {
  const byCol = allDayByColumn(days, base, cols);
  return '<div class="tg-allday-label">All day</div>'
    + byCol.map((list) => '<div class="tg-allday-cell">' + list.map((o) => chip(o)).join('') + '</div>').join('');
}
function allDayByColumn(days, base, cols) {
  const byCol = days.map(() => []);
  for (const o of occurrencesBetween(base, addDays(base, cols))) {
    if (o.allDay) addToOverlappingDays(o, days, byCol);
  }
  return byCol;
}
function addToOverlappingDays(o, days, byCol) {
  days.forEach((d, i) => {
    const dayStart = clampDay(d);
    if (overlapsRange(o, dayStart, addDays(dayStart, 1))) byCol[i].push(o);
  });
}
function hourLabel(h) { return h === 0 ? '' : (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); }
function hourColumnHtml() {
  let html = '<div class="tg-hourcol">';
  for (let h = 0; h < 24; h++) {
    html += `<div class="tg-hour" style="height:${HOUR_PX}px"><span>${hourLabel(h)}</span></div>`;
  }
  return html + '</div>';
}
function dayColumnHtml(d) {
  const dayStart = clampDay(d), dayEnd = addDays(dayStart, 1);
  const timed = occurrencesBetween(dayStart, dayEnd).filter((o) => !o.allDay && overlapsRange(o, dayStart, dayEnd));
  const eventsHtml = layoutColumns(timed).map((placed) => gridEventHtml(placed, dayStart, dayEnd)).join('');
  return `<div class="tg-col ${isToday(d) ? 'today' : ''}" data-col-date="${isoDate(dayStart)}">
        <div class="tg-slots">${gridSlotsHtml()}</div>
        ${isToday(d) ? nowLine() : ''}${eventsHtml}
      </div>`;
}
function gridSlotsHtml() {
  return Array.from({ length: 1440 / SLOT_MIN }, (_, i) =>
    `<div class="tg-slot" data-hour="${i * SLOT_MIN / 60}" style="height:${HOUR_PX * SLOT_MIN / 60}px"></div>`).join('');
}
function gridEventBox(o, dayStart, dayEnd) {
  const startMin = Math.max(0, minutesInto(o.start < dayStart ? dayStart : o.start));
  const endMin = Math.min(1440, o.end > dayEnd ? 1440 : (minutesInto(o.end) || 1440));
  const top = startMin / 60 * HOUR_PX;
  const height = Math.max(18, (endMin - startMin) / 60 * HOUR_PX - 2);
  return { top, height, short: endMin - startMin < 45 };
}
function gridEventStyle(box, col, cols, color) {
  const width = 100 / cols;
  return `top:${box.top}px;height:${box.height}px;left:${col * width}%;width:calc(${width}% - 3px);
                 background:${tint(color)};border-color:${color};color:${ink(color)}`;
}
function gridEventHtml({ o, col, cols }, dayStart, dayEnd) {
  const box = gridEventBox(o, dayStart, dayEnd);
  const style = gridEventStyle(box, col, cols, labelColor(o.event.labelId));
  return `<div class="tg-event ${eventDone(o.event) ? 'ev-done' : ''} ${box.short ? 'short' : ''}" data-occ="${o.id}" data-start="${toLocalISO(o.start)}" data-end="${toLocalISO(o.end)}"
          style="${style}">
          <span class="tg-ev-time">${fmtTime(o.start)}${occurrenceIcons(o)}${o.event.cardId ? ic('board') : ''}</span>
          <span class="tg-ev-title">${eventTitleHtml(o.event)}</span>
          <span class="tg-ev-resize" title="Drag to resize"></span>
        </div>`;
}
function restoreGridScroll(scroller, cols, base, prevScroll) {
  const key = cols + '@' + isoDate(base);
  if (key === _gridScrollKey && prevScroll != null) { scroller.scrollTop = prevScroll; return; }
  _gridScrollKey = key;
  const targetHour = (isToday(base) || cols > 1) ? new Date().getHours() : 8;
  scroller.scrollTop = Math.max(0, (targetHour - 1) * HOUR_PX);
}

function nowLine() {
  return `<div class="tg-now" style="top:${minutesInto(new Date()) / 60 * HOUR_PX}px"></div>`;
}
function layoutColumns(occs) {
  const items = occs.map((o) => ({ o, s: +o.start, e: +o.end, col: 0, cols: 1 }))
    .sort((a, b) => a.s - b.s || a.e - b.e);
  let i = 0;
  while (i < items.length) i = layoutCluster(items, i);
  return items;
}
function layoutCluster(items, start) {
  const cluster = overlapCluster(items, start);
  assignClusterColumns(cluster);
  return start + cluster.length;
}
function overlapCluster(items, start) {
  const cluster = [items[start]];
  let clusterEnd = items[start].e;
  for (let j = start + 1; j < items.length && items[j].s < clusterEnd; j++) {
    cluster.push(items[j]);
    clusterEnd = Math.max(clusterEnd, items[j].e);
  }
  return cluster;
}
function assignClusterColumns(cluster) {
  const colEnds = [];
  for (const item of cluster) item.col = claimColumn(colEnds, item);
  for (const item of cluster) item.cols = colEnds.length;
}
function claimColumn(colEnds, item) {
  const col = colEnds.findIndex((end) => end <= item.s);
  if (col !== -1) { colEnds[col] = item.e; return col; }
  colEnds.push(item.e);
  return colEnds.length - 1;
}

function renderMonth() {
  const cal = $('#calendar');
  const gridFirst = monthGridStart(anchor);
  let html = monthHeadHtml();
  const occ = occurrencesBetween(gridFirst, addDays(gridFirst, 42));
  for (let i = 0; i < 42; i++) html += monthCellHtml(addDays(gridFirst, i), occ);
  cal.className = 'calendar mo-view';
  cal.innerHTML = html + '</div>';
}
function monthHeadHtml() {
  return '<div class="mo-head">' + WEEK_ORDER.map((i) => `<div class="mo-dow">${WEEKDAYS[i]}</div>`).join('')
    + '</div><div class="mo-grid">';
}
function monthCellClass(day) {
  const cls = ['mo-cell'];
  if (day.getMonth() !== anchor.getMonth()) cls.push('muted');
  if (isToday(day)) cls.push('today');
  return cls.join(' ');
}
function monthCellHtml(day, occ) {
  const ds = clampDay(day), de = addDays(ds, 1);
  const dayOcc = occ.filter((o) => overlapsRange(o, ds, de)).sort(byAllDayThenStart);
  const iso = isoDate(ds);
  return `<div class="${monthCellClass(day)}" data-col-date="${iso}">
        <button type="button" class="mo-datebtn" data-goto="${iso}">${day.getDate()}</button>
        ${monthEventsHtml(dayOcc, iso)}
      </div>`;
}
function monthEventsHtml(dayOcc, iso) {
  const shown = dayOcc.slice(0, 4);
  const more = dayOcc.length - shown.length;
  return `<div class="mo-events">
          ${shown.map((o) => chip(o, true)).join('')}
          ${more > 0 ? `<button type="button" class="mo-more" data-goto="${iso}">+${more} more</button>` : ''}
        </div>`;
}

function chip(o, month) {
  const c = labelColor(o.event.labelId);
  const time = o.allDay ? '' : `<b class="chip-time">${fmtTime(o.start)}</b> `;
  const dragAttr = month ? `data-start="${toLocalISO(o.start)}" data-end="${toLocalISO(o.end)}"` : '';
  return `<button type="button" class="chip ${o.allDay ? 'allday' : ''} ${eventDone(o.event) ? 'ev-done' : ''}" data-occ="${o.id}" ${dragAttr}
      style="--chip-bg:${tint(c)};--chip-ink:${ink(c)};${o.allDay ? `background:${tint(c)};border-color:${c};color:${ink(c)}` : ''}">
      ${o.allDay ? '' : `<span class="chip-dot" style="background:${c}"></span>`}${time}${eventTitleHtml(o.event)}
      ${o.isRecurring ? `<span class="chip-rep">${ic('repeat')}</span>` : ''}${o.event.cardId ? `<span class="chip-rep">${ic('board')}</span>` : ''}
    </button>`;
}

function renderAgenda() {
  const cal = $('#calendar');
  const from = clampDay(anchor);
  const occ = occurrencesBetween(from, addDays(from, 45)).filter((o) => o.end >= new Date(Math.min(+from, Date.now())));
  cal.className = 'calendar ag-view';
  if (!occ.length) { cal.innerHTML = '<div class="ag-empty">Nothing scheduled in the next 45 days.</div>'; return; }
  let html = '<div class="ag-scroll">';
  for (const [iso, list] of groupOccurrencesByDay(occ)) html += agendaDayHtml(iso, list);
  cal.innerHTML = html + '</div>';
}
function groupOccurrencesByDay(occ) {
  const byDay = new Map();
  for (const o of occ) {
    const key = isoDate(clampDay(o.start));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(o);
  }
  return byDay;
}
function agendaDayHtml(iso, list) {
  const d = new Date(iso + 'T00:00');
  list.sort(byAllDayThenStart);
  return `<div class="ag-day ${isToday(d) ? 'today' : ''}">
        ${agendaDateHtml(iso, d)}
        <div class="ag-items">` + list.map((o) => agendaItemHtml(o)).join('') + '</div></div>';
}
function agendaDateHtml(iso, d) {
  return `<div class="ag-date" data-goto="${iso}">
          <span class="ag-dow">${WEEKDAYS[d.getDay()]}</span>
          <span class="ag-dnum">${d.getDate()}</span>
          <span class="ag-mon">${MONTHS[d.getMonth()].slice(0, 3)}</span>
        </div>`;
}
function agendaItemHtml(o) {
  const color = labelColor(o.event.labelId);
  return `<button type="button" class="ag-item ${eventDone(o.event) ? 'ev-done' : ''}" data-occ="${o.id}">
          <span class="ag-time">${o.allDay ? 'all day' : fmtTime(o.start) + ' to ' + fmtTime(o.end)}</span>
          <span class="ag-bar" style="background:${color};border-color:${shade(color, -0.3)}"></span>
          <span class="ag-title">${eventTitleHtml(o.event)}
            ${agendaFlagsHtml(o)}</span>
        </button>`;
}
function agendaFlag(html) { return `<span class="ag-flag">${html}</span>`; }
function agendaCardListName(ev) {
  const found = eventCard(ev);
  return found && found.list ? found.list.name : '';
}
function agendaFlagsHtml(o) {
  const progress = checklistProgress(o.event);
  return `${o.isRecurring ? agendaFlag(ic('repeat')) : ''}
            ${hasReminders(o.event) ? agendaFlag(ic('bell')) : ''}
            ${progress ? agendaFlag(ic('check') + progress.done + '/' + progress.total) : ''}
            ${o.event.cardId ? agendaFlag(ic('board') + escapeHtml(agendaCardListName(o.event))) : ''}`;
}

function renderGadget() {
  shell.classList.add('gadget');
  const now = new Date();
  const cal = $('#calendar');
  cal.className = 'calendar gd-view';
  cal.innerHTML = gadgetHtml(now);
  $('#gd-exit').addEventListener('click', () => setGadget(false));
}
function gadgetHtml(now) {
  return `
    <div class="gd-head">
      <div class="gd-date">${now.toLocaleDateString([], { weekday: 'long' })}<b>${now.getDate()}</b>${MONTHS[now.getMonth()]}</div>
      <button type="button" class="btn-secondary" id="gd-exit">Full view</button>
    </div>
    ${gadgetNextHtml(now)}
    <div class="gd-list">${gadgetItemsHtml(now)}</div>`;
}
function gadgetNextHtml(now) {
  const next = occurrencesBetween(now, addDays(now, 3)).filter((o) => o.start > now)[0];
  if (!next) return '';
  return `<div class="gd-next">Next: <b>${escapeHtml(next.event.title)}</b> ${next.allDay ? 'today' : fmtTime(next.start)}</div>`;
}
function gadgetItemsHtml(now) {
  const dayStart = clampDay(now), dayEnd = addDays(dayStart, 1);
  const today = occurrencesBetween(dayStart, dayEnd).filter((o) => overlapsRange(o, dayStart, dayEnd))
    .sort(byAllDayThenStart);
  return today.map((o) => gadgetItemHtml(o, now)).join('') || '<p class="empty">Nothing today.</p>';
}
function gadgetItemHtml(o, now) {
  const color = labelColor(o.event.labelId);
  const live = !o.allDay && o.start <= now && o.end > now;
  return `<button type="button" class="gd-item ${live ? 'live' : ''}" data-occ="${o.id}">
        <span class="gd-time">${o.allDay ? '' : fmtTime(o.start)}</span>
        <span class="gd-bar" style="background:${color}"></span>
        <span class="gd-title">${eventTitleHtml(o.event)}</span>
      </button>`;
}
function setGadget(on) {
  gadgetMode = on;
  shell.classList.toggle('gadget', on);
  if (!on) { shell.style.width = shell.style.height = ''; }
  render();
}

const confirmBackdrop = $('#confirmBackdrop');
function confirmDialog(message, buttons) {
  return new Promise((resolve) => showConfirm(message, buttons, resolve));
}
function showConfirm(message, buttons, resolve) {
  $('#confirmMsg').textContent = message;
  const handlers = confirmDismissHandlers(() => close(null));
  const close = (id) => {
    unbindConfirm(handlers);
    resolve(id);
  };
  renderConfirmButtons(buttons, close);
  bindConfirm(handlers);
}
function confirmDismissHandlers(cancel) {
  return {
    key: (e) => { if (e.key === 'Escape') cancel(); },
    back: (e) => { if (e.target === confirmBackdrop) cancel(); },
  };
}
function bindConfirm(handlers) {
  document.addEventListener('keydown', handlers.key);
  confirmBackdrop.addEventListener('mousedown', handlers.back);
  confirmBackdrop.hidden = false;
}
function unbindConfirm(handlers) {
  confirmBackdrop.hidden = true;
  document.removeEventListener('keydown', handlers.key);
  confirmBackdrop.removeEventListener('mousedown', handlers.back);
}
function renderConfirmButtons(buttons, close) {
  const host = $('#confirmActions');
  host.innerHTML = '';
  buttons.forEach((b) => host.appendChild(confirmButton(b, () => close(b.id))));
}
function confirmButton(spec, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = spec.primary ? 'btn-primary' : 'btn-secondary' + (spec.danger ? ' danger' : '');
  el.textContent = spec.text;
  el.addEventListener('click', onClick);
  return el;
}

const backdrop = $('#modalBackdrop');
const modalBody = $('#modalBody');

function openModal(title) {
  $('#modalTitle').textContent = title;
  backdrop.hidden = false;
  document.addEventListener('keydown', escClose);
}
function closeModal() {
  backdrop.hidden = true;
  modalBody.innerHTML = '';
  document.removeEventListener('keydown', escClose);
}
function escClose(e) { if (e.key === 'Escape' && confirmBackdrop.hidden) closeModal(); }
$('#modalClose').addEventListener('click', closeModal);
backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeModal(); });

function newEventStart(dateISO, hour) {
  const d = dateISO ? new Date(dateISO + 'T00:00') : new Date();
  if (hour != null) d.setHours(0, Math.round(hour * 60), 0, 0);
  else d.setHours(new Date().getHours() + 1, 0, 0, 0);
  return d;
}
function newEventDefaults(dateISO, hour) {
  const d = newEventStart(dateISO, hour);
  return {
    id: null, title: '', notes: '',
    start: toLocalISO(d), end: toLocalISO(new Date(+d + 3600000)), allDay: false,
    labelId: DATA.labels[0] ? DATA.labels[0].id : null, reminders: [{ minutes: 10 }],
    recurrence: { freq: 'none', interval: 1, byDay: [d.getDay()], end: { type: 'never' } },
    exdates: [], checklist: [],
  };
}

function labelPillsHTML(selectedId) {
  const pill = (id, name, color) =>
    `<button type="button" class="lp-pill ${id === (selectedId || '') ? 'sel' : ''}" data-lid="${id}">
       <span class="lp-dot" style="background:${color}"></span>${escapeHtml(name)}</button>`;
  return pill('', 'None', '#8a97a0') + DATA.labels.map((l) => pill(l.id, l.name, l.color)).join('');
}
function reminderRowHTML(mins) {
  const opts = REMINDER_PRESETS.map((o) =>
    `<option value="${o.v}" ${o.v === mins ? 'selected' : ''}>${o.t}</option>`).join('');
  return `<div class="rem-row"><select class="field rem-sel">${opts}</select>
     <button type="button" class="rem-x" title="Remove">${ic('x')}</button></div>`;
}

function selectOptionsHTML(pairs, selected) {
  return pairs.map(([value, text]) =>
    `<option value="${value}" ${value === selected ? 'selected' : ''}>${text}</option>`).join('');
}
function listOptionsHTML(lists, selectedId) {
  return lists.map((l) =>
    `<option value="${l.id}" ${l.id === selectedId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('');
}
function durationOptionsHTML(minutes, markSelected) {
  const custom = DURATIONS.some(([v]) => v === minutes) ? ''
    : `<option value="${minutes}" ${markSelected ? 'selected' : ''}>${minutes} min</option>`;
  return selectOptionsHTML(DURATIONS, markSelected ? minutes : null) + custom;
}
function labelPickRowHTML(pickId, inputId, labelId) {
  return `<div class="f-row"><span>Label</span>
        <div class="label-pick" id="${pickId}">${labelPillsHTML(labelId)}</div>
        <input type="hidden" id="${inputId}" value="${labelId || ''}" /></div>`;
}
function dangerDeleteButtonHTML(id) {
  return `<button type="button" class="btn-secondary danger" id="${id}">Delete</button>`;
}
function submitButtonHTML(text) {
  return `<button type="submit" class="btn-primary">${text}</button>`;
}
function cancelSubmitHTML(cancelId, submitText) {
  return `<button type="button" class="btn-secondary" id="${cancelId}">Cancel</button>
        ${submitButtonHTML(submitText)}`;
}
function formActionsHTML(leadHTML, endHTML) {
  return `
      <div class="form-actions">
        ${leadHTML}
        <span class="spacer"></span>
        ${endHTML}
      </div>
    </form>`;
}
function dotColor(labelId) {
  return labelId ? labelColor(labelId) : '#9aa4ac';
}
function minutesBetween(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000);
}
function selectOnly(items, chosen) {
  items.forEach((item) => item.classList.toggle('sel', item === chosen));
}
function confirmDelete(message, buttonText = 'Delete') {
  return confirmDialog(message, [{ id: 'del', text: buttonText, danger: true }, { id: 'no', text: 'Cancel' }]);
}

function wireLabelPick(pick, inputSelector) {
  pick.addEventListener('click', (e) => {
    const pill = e.target.closest('.lp-pill');
    if (!pill) return;
    $(inputSelector).value = pill.dataset.lid;
    selectOnly($$('.lp-pill', pick), pill);
  });
}
function wireReminderList(addSelector, listSelector, defaultMinutes) {
  $(addSelector).addEventListener('click', () => {
    $(listSelector).insertAdjacentHTML('beforeend', reminderRowHTML(defaultMinutes));
  });
  $(listSelector).addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.rem-x');
    if (removeBtn) removeBtn.closest('.rem-row').remove();
  });
}
function readReminderMinutes(listSelector) {
  return [...new Set($$(listSelector + ' .rem-sel').map((s) => +s.value))];
}
function wirePresetSelect(selector, applyPreset) {
  const select = $(selector);
  if (select) select.addEventListener('change', (e) => onPresetSelected(e.target, applyPreset));
}
function onPresetSelected(select, applyPreset) {
  const preset = presetById(select.value);
  select.value = '';
  if (!preset) return;
  applyPreset(preset);
  toast('Applied preset “' + preset.name + '”', 'ok', 2000);
}
function applyPresetFields(preset, form) {
  const field = (name) => $(`#${form.prefix}-${name}`);
  if (!field('title').value.trim()) field('title').value = preset.title || preset.name;
  if (preset.notes && !field('notes').value.trim()) field('notes').value = preset.notes;
  field('label').value = preset.labelId || '';
  $(form.pickSelector).innerHTML = labelPillsHTML(preset.labelId);
  mergePresetChecklist(form.checklist, preset.checklist);
  form.renderChecklist();
}
function mergePresetChecklist(checklist, texts) {
  for (const text of texts) {
    if (!checklist.some((i) => i.text === text)) checklist.push({ id: uid(), text, done: false });
  }
}
function newCardObject(title, duration, eventId) {
  return {
    id: uid(), title, notes: '', labelId: null, checklist: [], reminders: [],
    duration, eventId, createdAt: Date.now(),
  };
}

function openEventModal(existing, occ) {
  const ctx = createEventContext(existing, occ);
  openModal(ctx.editing ? 'Edit event' : 'New event');
  modalBody.innerHTML = eventFormHTML(ctx);
  wireEventFields(ctx);
  wireEventTools(ctx);
  wireEventActions(ctx);
}
function createEventContext(existing, occ) {
  const ev = existing ? JSON.parse(JSON.stringify(existing)) : newEventDefaults(occ && occ.dateISO, occ && occ.hour);
  const editing = !!existing;
  return {
    existing, occ, ev, editing, prefix: 'ev', pickSelector: '#ev-labelpick',
    isSeries: editing && ev.recurrence && ev.recurrence.freq !== 'none',
    checklist: (ev.checklist || []).map((i) => ({ ...i })),
    linked: editing ? eventCard(existing) : null, unlink: false, nlColor: PALETTE[0],
  };
}

function eventFormHTML(ctx) {
  const { ev } = ctx;
  return `
    <form id="evForm" class="form">` + eventTitleHTML(ev) + eventAllDayHTML(ev) + eventTimesHTML(ev)
    + eventLabelHTML(ev) + '\n' + eventBoardRowHTML(ctx.linked) + eventRemindersHTML(ev)
    + eventRepeatHTML(ev.recurrence) + eventChecklistHTML() + eventNotesHTML(ev)
    + eventScopeHTML(ctx.isSeries) + eventActionsHTML(ctx.editing);
}
function eventTitleHTML(ev) {
  return `
      <label class="f-row"><span>Title</span>
        <input class="field" id="ev-title" value="${escapeHtml(ev.title)}" placeholder="What is happening?" autofocus />
      </label>
      ${DATA.presets.length ? `<div class="f-inline"><span>Preset</span>
        <select class="field" id="ev-preset"><option value="">Apply a preset</option>${presetOptions()}</select></div>` : ''}`;
}
function eventAllDayHTML(ev) {
  return `

      <label class="f-check"><input type="checkbox" id="ev-allday" ${ev.allDay ? 'checked' : ''}/> All day</label>`;
}
function eventTimesHTML(ev) {
  return `

      <div class="f-grid">
        <label class="f-row"><span>Starts</span>
          <input class="field" type="datetime-local" id="ev-start" value="${ev.start}" /></label>
        <label class="f-row"><span>Ends</span>
          <input class="field" type="datetime-local" id="ev-end" value="${ev.end}" /></label>
      </div>`;
}
function eventLabelHTML(ev) {
  return `

      <div class="f-row"><span>Label</span>
        <div class="label-pick" id="ev-labelpick">${labelPillsHTML(ev.labelId)}</div>
        <input type="hidden" id="ev-label" value="${ev.labelId || ''}" />${newLabelFormHTML()}
      </div>`;
}
function newLabelFormHTML() {
  return `
        <div class="newlabel">
          <input class="field" id="ev-nl-name" placeholder="New label name" maxlength="24" />
          <div class="nl-swatches" id="ev-nl-sw">${newLabelSwatchesHTML()}</div>
          <button type="button" class="btn-secondary" id="ev-nl-add">Add</button>
        </div>`;
}
function newLabelSwatchesHTML() {
  return PALETTE.map((c, i) =>
    `<button type="button" class="nl-sw ${i === 0 ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('');
}
function eventBoardRowHTML(linked) {
  if (linked) return linkedCardRowHTML(linked);
  return DATA.boards.length ? boardPickerRowHTML() : '';
}
function linkedCardRowHTML(linked) {
  return `
      <div class="f-row"><span>Board card</span>
        <div class="f-inline"><span class="ev-board">${ic('board')}${escapeHtml(linked.board.name)}</span>
          <select class="field" id="ev-list">${listOptionsHTML(linked.board.lists, linked.list.id)}</select>
          <button type="button" class="link-btn" id="ev-opencard">Open card</button>
          <button type="button" class="link-btn" id="ev-unlink">Unlink</button>
        </div></div>`;
}
function boardPickerRowHTML() {
  return `
      <label class="f-row"><span>Board</span>
        <select class="field" id="ev-board"><option value="">Not on a board</option>${boardListOptgroupsHTML()}</select>
      </label>`;
}
function boardListOptgroupsHTML() {
  return DATA.boards.map((b) =>
    `<optgroup label="${escapeHtml(b.name)}">${b.lists.map((l) =>
      `<option value="${l.id}">${escapeHtml(b.name)} › ${escapeHtml(l.name)}</option>`).join('')}</optgroup>`).join('');
}
function eventRemindersHTML(ev) {
  return `
      <div class="f-row"><span>Reminders</span>
        <div class="reminders" id="ev-reminders">
          ${(ev.reminders || []).map((r) => reminderRowHTML(r.minutes)).join('')}
        </div>
        <button type="button" class="link-btn" id="ev-add-rem">+ Add a reminder</button>
      </div>`;
}
function eventRepeatHTML(rec) {
  return `

      <label class="f-row"><span>Repeat</span>
        <select class="field" id="ev-freq">${freqOptionsHTML(rec.freq)}</select>
      </label>
      <div id="rec-detail" class="rec-detail" ${rec.freq === 'none' ? 'hidden' : ''}>` + recIntervalHTML(rec) + recWeekdaysHTML(rec) + recEndHTML(rec) + `
        <div class="rec-summary" id="rec-summary"></div>
      </div>`;
}
function freqOptionsHTML(freq) {
  return selectOptionsHTML([['none', 'Does not repeat'], ['daily', 'Daily'], ['weekly', 'Weekly'],
    ['monthly', 'Monthly'], ['yearly', 'Yearly']], freq);
}
function recIntervalHTML(rec) {
  return `
        <div class="f-inline"><span>Every</span>
          <input class="field tiny" type="number" min="1" max="99" id="rec-interval" value="${rec.interval || 1}" />
          <span id="rec-unit"></span>
        </div>`;
}
function recWeekdaysHTML(rec) {
  return `
        <div class="f-weekdays" id="rec-weekdays" ${rec.freq === 'weekly' ? '' : 'hidden'}>
          ${WEEK_ORDER.map((day) => weekdayCheckboxHTML(day, rec.byDay || [])).join('')}
        </div>`;
}
function weekdayCheckboxHTML(day, byDay) {
  return `<label><input type="checkbox" value="${day}" ${byDay.includes(day) ? 'checked' : ''}/><span>${WEEKDAYS[day][0]}</span></label>`;
}
function recEndHTML(rec) {
  return `
        <div class="f-inline"><span>Ends</span>
          <select class="field" id="rec-endtype">${recEndOptionsHTML(rec.end.type)}
          </select>
          <input class="field" type="date" id="rec-endon" value="${rec.end.on || ''}" ${rec.end.type === 'on' ? '' : 'hidden'} />
          <input class="field tiny" type="number" min="1" max="999" id="rec-endafter" value="${rec.end.after || 10}" ${rec.end.type === 'after' ? '' : 'hidden'} />
        </div>`;
}
function recEndOptionsHTML(type) {
  return [['never', 'Never'], ['on', 'On date'], ['after', 'After N times']].map(([value, text]) => `
            <option value="${value}" ${type === value ? 'selected' : ''}>${text}</option>`).join('');
}
function eventChecklistHTML() {
  return `

      <div class="f-row"><span>Checklist <b id="cl-count"></b></span>
        <div class="checklist" id="ev-checklist"></div>
        <input class="field flush" id="cl-input" placeholder="Add an item, press Enter" />
      </div>`;
}
function eventNotesHTML(ev) {
  return `

      <label class="f-row"><span>Notes</span>
        <textarea class="field" id="ev-notes" rows="2" placeholder="Optional details">${escapeHtml(ev.notes || '')}</textarea>
      </label>`;
}
function eventScopeHTML(isSeries) {
  return `

      ${isSeries ? `<div class="f-scope"><span>Apply to</span>
        <label><input type="radio" name="scope" value="series" checked/> Whole series</label>
        <label><input type="radio" name="scope" value="single"/> Just this event</label></div>` : ''}`;
}
function eventActionsHTML(editing) {
  const lead = `${editing ? dangerDeleteButtonHTML('ev-delete') : '<span></span>'}
        <button type="button" class="link-btn" id="ev-savepreset" title="Save these settings as a reusable preset">Save as preset</button>`;
  return '\n' + formActionsHTML(lead, cancelSubmitHTML('ev-cancel', editing ? 'Save' : 'Create'));
}

function wireEventFields(ctx) {
  wireEventRecurrence(ctx);
  wireReminderList('#ev-add-rem', '#ev-reminders', 30);
  ctx.renderChecklist = wireChecklist(ctx.checklist);
  wireLabelPick($('#ev-labelpick'), '#ev-label');
}
function wireEventTools(ctx) {
  wirePresetSelect('#ev-preset', (preset) => applyEventPreset(ctx, preset));
  $('#ev-savepreset').addEventListener('click', () => saveEventAsPreset(ctx));
  wireLinkedCard(ctx);
  wireInlineLabel(ctx);
}
function wireEventActions(ctx) {
  $('#ev-cancel').addEventListener('click', closeModal);
  if (ctx.editing) $('#ev-delete').addEventListener('click', () => deleteEventFlow(ctx.existing, ctx.occ));
  $('#evForm').addEventListener('submit', (e) => submitEventForm(e, ctx));
}

function wireEventRecurrence(ctx) {
  $('#ev-allday').addEventListener('change', syncEventAllDay);
  $('#ev-freq').addEventListener('change', syncEventRepeat);
  $('#rec-endtype').addEventListener('change', syncEventEndType);
  $('#evForm').addEventListener('input', updateRecurrenceSummary);
  if (ctx.ev.recurrence.freq !== 'none') syncEventRepeat();
  updateRecurrenceSummary();
  $('#ev-start').addEventListener('change', keepEventEndAfterStart);
}
function syncEventAllDay() {
  const on = $('#ev-allday').checked;
  const inputs = [$('#ev-start'), $('#ev-end')];
  inputs.forEach((inp) => { inp.type = on ? 'date' : 'datetime-local'; });
  if (on) inputs.forEach((inp) => { inp.value = inp.value.slice(0, 10); });
  else padDateInputs(inputs[0], inputs[1]);
}
function padDateInputs(startInput, endInput) {
  if (startInput.value.length === 10) startInput.value += 'T09:00';
  if (endInput.value.length === 10) endInput.value += 'T10:00';
}
function repeatUnitName(freq) {
  return { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' }[freq] || '';
}
function syncEventRepeat() {
  const freq = $('#ev-freq').value;
  $('#rec-detail').hidden = freq === 'none';
  $('#rec-weekdays').hidden = freq !== 'weekly';
  $('#rec-unit').textContent = repeatUnitName(freq);
  updateRecurrenceSummary();
}
function syncEventEndType() {
  const type = $('#rec-endtype').value;
  $('#rec-endon').hidden = type !== 'on';
  $('#rec-endafter').hidden = type !== 'after';
  updateRecurrenceSummary();
}
function collectEventRule() {
  const freq = $('#ev-freq').value;
  if (freq === 'none') return NO_REPEAT();
  return {
    freq,
    interval: Math.max(1, +$('#rec-interval').value || 1),
    byDay: freq === 'weekly' ? selectedWeekdays() : [],
    end: readRecurrenceEnd(),
  };
}
function selectedWeekdays() {
  const byDay = $$('#rec-weekdays input:checked').map((c) => +c.value);
  return byDay.length ? byDay : [new Date($('#ev-start').value).getDay()];
}
function readRecurrenceEnd() {
  return { type: $('#rec-endtype').value, on: $('#rec-endon').value || null, after: +$('#rec-endafter').value || null };
}
function updateRecurrenceSummary() {
  $('#rec-summary').textContent = Recurrence.describe(collectEventRule());
}
function keepEventEndAfterStart() {
  const startI = $('#ev-start'), endI = $('#ev-end');
  if (endI.value && endI.value <= startI.value) {
    endI.value = toLocalISO(new Date(+new Date(startI.value) + 3600000)).slice(0, $('#ev-allday').checked ? 10 : 16);
  }
}

function applyEventPreset(ctx, preset) {
  applyPresetFields(preset, ctx);
  $('#ev-reminders').innerHTML = preset.reminders.map((m) => reminderRowHTML(m)).join('');
  $('#ev-allday').checked = !!preset.allDay;
  syncEventAllDay();
  const startI = $('#ev-start');
  if (!preset.allDay && startI.value) $('#ev-end').value = toLocalISO(addMin(new Date(startI.value), preset.duration)).slice(0, 16);
}
async function saveEventAsPreset(ctx) {
  const title = $('#ev-title').value.trim();
  if (!title) { $('#ev-title').focus(); toast('Give it a title first; that becomes the preset name', 'info'); return; }
  DATA.presets.push(eventPresetFromForm(title, ctx.checklist));
  await saveData();
  toast('Saved preset “' + title + '”. Rename or edit it under More › Presets', 'ok', 5000);
}
function eventPresetFromForm(title, checklist) {
  const allDay = $('#ev-allday').checked;
  const mins = allDay ? 60 : Math.max(15, minutesBetween($('#ev-start').value, $('#ev-end').value) || 60);
  return {
    id: uid(), name: title, title, labelId: $('#ev-label').value || null,
    duration: mins, allDay, notes: $('#ev-notes').value.trim(),
    reminders: readReminderMinutes('#ev-reminders'),
    checklist: checklist.map((i) => i.text),
  };
}

function wireLinkedCard(ctx) {
  if (!ctx.linked) return;
  $('#ev-unlink').addEventListener('click', () => markEventUnlink(ctx));
  $('#ev-opencard').addEventListener('click', () => openLinkedCard(ctx.linked.card.id));
}
function markEventUnlink(ctx) {
  ctx.unlink = true;
  $('#ev-unlink').closest('.f-row').innerHTML = '<span>Board card</span><span class="set-note">Will be unlinked when you save (the card stays on the board).</span>';
}
function openLinkedCard(cardId) {
  closeModal();
  openCardModal(cardId);
}
function wireInlineLabel(ctx) {
  $('#ev-nl-sw').addEventListener('click', (e) => pickNewLabelColor(e, ctx));
  $('#ev-nl-add').addEventListener('click', () => addEventInlineLabel(ctx));
  $('#ev-nl-name').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addEventInlineLabel(ctx);
  });
}
function pickNewLabelColor(e, ctx) {
  const swatch = e.target.closest('.nl-sw');
  if (!swatch) return;
  ctx.nlColor = swatch.dataset.c;
  selectOnly($$('#ev-nl-sw .nl-sw'), swatch);
}
async function addEventInlineLabel(ctx) {
  const name = $('#ev-nl-name').value.trim();
  if (!name) { $('#ev-nl-name').focus(); return; }
  const label = { id: uid(), name, color: ctx.nlColor };
  DATA.labels.push(label);
  await saveData();
  showInlineLabel(label.id);
  toast('Label “' + name + '” added', 'ok');
}
function showInlineLabel(labelId) {
  $('#ev-labelpick').innerHTML = labelPillsHTML(labelId);
  $('#ev-label').value = labelId;
  $('#ev-nl-name').value = '';
  renderLabels();
}

async function submitEventForm(e, ctx) {
  e.preventDefault();
  const patch = readEventPatch(ctx.checklist);
  if (!patch.title) { $('#ev-title').focus(); return; }
  const saved = storeEventPatch(ctx, patch, collectEventRule());
  const boardMsg = syncEventBoard(ctx, saved);
  closeModal();
  await commit();
  toast((ctx.editing ? 'Event saved' : 'Event created') + boardMsg, 'ok');
}
function readEventPatch(checklist) {
  const allDay = $('#ev-allday').checked;
  const startValue = $('#ev-start').value;
  return {
    title: $('#ev-title').value.trim(), notes: $('#ev-notes').value.trim(), allDay,
    start: normStart(startValue, allDay), end: normEnd(startValue, $('#ev-end').value, allDay),
    labelId: $('#ev-label').value || null, reminders: readEventReminders(), checklist,
  };
}
function readEventReminders() {
  return readReminderMinutes('#ev-reminders').sort((a, b) => a - b).map((m) => ({ minutes: m }));
}
function eventSaveScope(ctx) {
  return ctx.isSeries ? $('#evForm').querySelector('input[name=scope]:checked').value : 'series';
}
function storeEventPatch(ctx, patch, rule) {
  if (!ctx.editing) return addNewEvent(patch, rule);
  if (eventSaveScope(ctx) === 'series') return updateEventSeries(ctx.existing.id, patch, rule);
  excludeOccurrence(ctx.existing.id, ctx.occ);
  DATA.events.push({ id: uid(), ...patch, recurrence: NO_REPEAT(), exdates: [] });
  return null;
}
function addNewEvent(patch, rule) {
  const saved = { id: uid(), ...patch, recurrence: rule, exdates: [] };
  DATA.events.push(saved);
  return saved;
}
function updateEventSeries(eventId, patch, rule) {
  const saved = DATA.events.find((x) => x.id === eventId);
  Object.assign(saved, patch, { recurrence: rule });
  return saved;
}
function excludeOccurrence(eventId, occ) {
  const target = DATA.events.find((x) => x.id === eventId);
  if (occ && occ.occStartISO && !target.exdates.includes(occ.occStartISO)) target.exdates.push(occ.occStartISO);
}
function syncEventBoard(ctx, saved) {
  if (saved && ctx.linked) return syncLinkedCard(ctx, saved);
  const boardSelect = $('#ev-board');
  if (saved && boardSelect && boardSelect.value) return addEventCardToList(saved, boardSelect.value);
  return '';
}
function syncLinkedCard(ctx, saved) {
  const found = findCard(ctx.linked.card.id);
  if (!found) return '';
  if (ctx.unlink) {
    unlinkEvent(saved);
    return ' · unlinked from board';
  }
  copyShared(saved, found.card);
  return moveLinkedCard(found, $('#ev-list').value);
}
function moveLinkedCard(found, listId) {
  if (listId === found.list.id) return '';
  moveCard(found.card.id, listId);
  return ' · moved to ' + findList(listId).list.name;
}
function addEventCardToList(saved, listId) {
  const target = findList(listId);
  const card = newCardObject('', saved.allDay ? 60 : minutesBetween(saved.start, saved.end), saved.id);
  copyShared(saved, card);
  target.list.cards.push(card);
  saved.cardId = card.id;
  return ' · added to ' + target.board.name + ' › ' + target.list.name;
}

function wireChecklist(checklist) {
  const render = () => renderChecklistItems(checklist);
  $('#ev-checklist').addEventListener('change', (e) => toggleChecklistItem(e, checklist, render));
  $('#ev-checklist').addEventListener('click', (e) => removeChecklistItem(e, checklist, render));
  $('#cl-input').addEventListener('keydown', (e) => addChecklistItemOnEnter(e, checklist, render));
  render();
  return render;
}
function renderChecklistItems(checklist) {
  $('#ev-checklist').innerHTML = checklist.map(checklistItemHTML).join('');
  const done = checklist.filter((i) => i.done).length;
  $('#cl-count').textContent = checklist.length ? `${done}/${checklist.length}` : '';
}
function checklistItemHTML(item, idx) {
  return `
      <label class="cl-item ${item.done ? 'done' : ''}">
        <input type="checkbox" data-cl="${idx}" ${item.done ? 'checked' : ''}/>
        <span>${escapeHtml(item.text)}</span>
        <button type="button" class="cl-x" data-clx="${idx}" title="Remove">${ic('x')}</button>
      </label>`;
}
function toggleChecklistItem(e, checklist, render) {
  const box = e.target.closest('[data-cl]');
  if (!box) return;
  checklist[+box.dataset.cl].done = box.checked;
  render();
}
function removeChecklistItem(e, checklist, render) {
  const removeBtn = e.target.closest('[data-clx]');
  if (!removeBtn) return;
  e.preventDefault();
  checklist.splice(+removeBtn.dataset.clx, 1);
  render();
}
function addChecklistItemOnEnter(e, checklist, render) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const text = e.target.value.trim();
  if (!text) return;
  checklist.push({ id: uid(), text, done: false });
  e.target.value = '';
  render();
}

function normStart(v, allDay) { return allDay ? v.slice(0, 10) + 'T00:00' : v; }
function normEnd(startV, endV, allDay) {
  if (allDay) {
    const e = endV && endV >= startV.slice(0, 10) ? endV.slice(0, 10) : startV.slice(0, 10);
    return e + 'T23:59';
  }
  if (!endV || endV <= startV) return toLocalISO(new Date(+new Date(startV) + 3600000));
  return endV;
}

async function deleteEventFlow(ev, occ) {
  const isSeries = ev.recurrence && ev.recurrence.freq !== 'none';
  const deleted = isSeries ? await deleteRepeatingEvent(ev, occ) : await deleteSingleEvent(ev);
  if (!deleted) return;
  closeModal();
  await commit();
  toast('Deleted', 'ok');
}
async function deleteSingleEvent(ev) {
  const choice = await confirmDelete(`Delete “${ev.title || 'this event'}”?`);
  if (choice !== 'del') return false;
  removeEventSeries(ev);
  return true;
}
async function deleteRepeatingEvent(ev, occ) {
  const choice = await confirmDialog(`“${ev.title}” repeats. What do you want to delete?`, [
    { id: 'one', text: 'Only this one' },
    { id: 'all', text: 'The whole series', danger: true },
    { id: 'no', text: 'Cancel' },
  ]);
  if (choice === 'all') removeEventSeries(ev);
  else if (choice === 'one') excludeOccurrence(ev.id, occ);
  return choice === 'all' || choice === 'one';
}
function removeEventSeries(ev) {
  unlinkEvent(DATA.events.find((x) => x.id === ev.id) || ev);
  DATA.events = DATA.events.filter((x) => x.id !== ev.id);
}

const PALETTE = ['#d13438', '#e8590c', '#f08c00', '#f5b400', '#2f9e44', '#12b886',
  '#1c7ed6', '#4263eb', '#7048e8', '#ae3ec9', '#e64980', '#868e96'];

function openLabelModal(label, onSaved) {
  const editing = !!label;
  const model = editing ? { ...label } : { id: null, name: '', color: PALETTE[0] };
  openModal(editing ? 'Edit label' : 'New label');
  modalBody.innerHTML = labelFormHTML(model, editing);
  wireLabelForm(label, onSaved);
}
function labelFormHTML(model, editing) {
  return `
    <form id="lbForm" class="form">
      <label class="f-row"><span>Name</span>
        <input class="field" id="lb-name" value="${escapeHtml(model.name)}" placeholder="e.g. Family" autofocus /></label>
      <div class="f-row"><span>Colour</span>
        <div class="swatch-grid" id="lb-swatches">
          ${labelSwatchesHTML(model.color)}
        </div></div>` + labelFormEndHTML(model.color, editing);
}
function labelFormEndHTML(color, editing) {
  return `
      <input type="hidden" id="lb-color" value="${color}" />` + formActionsHTML(
    editing ? dangerDeleteButtonHTML('lb-delete') : '<span></span>',
    cancelSubmitHTML('lb-cancel', editing ? 'Save' : 'Create'));
}
function labelSwatchesHTML(selected) {
  return PALETTE.map((c) => `<button type="button" class="sw ${c === selected ? 'sel' : ''}" data-c="${c}"
             style="background:${c};border-color:${shade(c, -0.3)}"></button>`).join('');
}
function wireLabelForm(label, onSaved) {
  $('#lb-swatches').addEventListener('click', pickLabelSwatch);
  $('#lb-cancel').addEventListener('click', closeModal);
  if (label) $('#lb-delete').addEventListener('click', () => deleteLabelFlow(label));
  $('#lbForm').addEventListener('submit', (e) => submitLabelForm(e, label, onSaved));
}
function pickLabelSwatch(e) {
  const swatch = e.target.closest('.sw');
  if (!swatch) return;
  selectOnly($$('#lb-swatches .sw'), swatch);
  $('#lb-color').value = swatch.dataset.c;
}
async function deleteLabelFlow(label) {
  const allCards = allBoardCards();
  const choice = await confirmLabelDelete(label, countLabelUses(label.id, allCards));
  if (choice !== 'del') return;
  DATA.labels = DATA.labels.filter((l) => l.id !== label.id);
  clearLabelFromItems(label.id, allCards);
  hiddenLabels.delete(label.id);
  closeModal();
  await commit();
}
function confirmLabelDelete(label, used) {
  return confirmDelete(`Delete label “${label.name}”?` + (used ? ` ${used} item(s) will lose their colour.` : ''));
}
function allBoardCards() {
  return DATA.boards.flatMap((b) => b.lists.flatMap((l) => l.cards));
}
function countLabelUses(labelId, allCards) {
  const hasLabel = (item) => item.labelId === labelId;
  return DATA.events.filter(hasLabel).length
    + DATA.tasks.filter(hasLabel).length
    + allCards.filter(hasLabel).length;
}
function clearLabelFromItems(labelId, allCards) {
  const clear = (item) => { if (item.labelId === labelId) item.labelId = null; };
  DATA.events.forEach(clear);
  DATA.tasks.forEach(clear);
  allCards.forEach(clear);
  DATA.presets.forEach(clear);
}
async function submitLabelForm(e, label, onSaved) {
  e.preventDefault();
  const name = $('#lb-name').value.trim();
  if (!name) { $('#lb-name').focus(); return; }
  const saved = label ? updateLabel(label.id, name) : createLabel(name);
  closeModal();
  await commit();
  if (onSaved) onSaved(saved);
}
function updateLabel(labelId, name) {
  const saved = DATA.labels.find((l) => l.id === labelId);
  saved.name = name;
  saved.color = $('#lb-color').value;
  return saved;
}
function createLabel(name) {
  const saved = { id: uid(), name, color: $('#lb-color').value };
  DATA.labels.push(saved);
  return saved;
}

function openTaskModal(task) {
  openModal('Edit task');
  modalBody.innerHTML = taskFormHTML(task);
  wireLabelPick($('#tk-pick'), '#tk-label');
  $('#tk-cancel').addEventListener('click', closeModal);
  $('#tk-del').addEventListener('click', () => deleteTaskFromModal(task.id));
  $('#tkForm').addEventListener('submit', (e) => submitTaskForm(e, task.id));
}
function taskFormHTML(task) {
  return `
    <form id="tkForm" class="form">
      <label class="f-row"><span>Task</span>
        <input class="field" id="tk-title" value="${escapeHtml(task.title)}" autofocus /></label>
      ${labelPickRowHTML('tk-pick', 'tk-label', task.labelId)}`
    + formActionsHTML(dangerDeleteButtonHTML('tk-del'), cancelSubmitHTML('tk-cancel', 'Save'));
}
async function deleteTaskFromModal(taskId) {
  DATA.tasks = DATA.tasks.filter((t) => t.id !== taskId);
  closeModal();
  await commit();
}
async function submitTaskForm(e, taskId) {
  e.preventDefault();
  const task = DATA.tasks.find((x) => x.id === taskId);
  task.title = $('#tk-title').value.trim() || task.title;
  task.labelId = $('#tk-label').value || null;
  closeModal();
  await commit();
}

let _boardFocus = null;
let boardFilter = 'all';
function dueMatchesFilter(due, done, filter) {
  if (!due || done) return false;
  return filter === 'late' ? due.diff < 0 : due.diff <= 7;
}
function cardPasses(card, done) {
  if (boardFilter === 'all') return true;
  return dueMatchesFilter(dueInfo(card, done), done, boardFilter);
}

function cardWhen(card) {
  const ev = cardEvent(card);
  const o = ev ? nextOccurrence(ev) : null;
  if (!o) return null;
  return {
    text: o.start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + (o.allDay ? '' : ' ' + fmtTime(o.start)),
    late: o.end < new Date(), rec: o.isRecurring,
  };
}
function cardHTML(card, done) {
  const color = card.labelId ? labelColor(card.labelId) : null;
  return `<div class="bd-card ${done ? 'done' : ''}" data-card="${card.id}">
      ${color ? `<span class="bd-card-label" style="background:${color};border-color:${shade(color, -0.3)}" title="${escapeHtml(labelName(card.labelId))}"></span>` : ''}
      <span class="bd-card-title">${escapeHtml(card.title || '(untitled)')}</span>
      ${cardMetaHTML(card, done)}
    </div>`;
}
function cardMetaHTML(card, done) {
  const meta = { when: cardWhen(card), progress: checklistProgress(card), due: dueInfo(card, done), done };
  if (!(meta.when || meta.progress || card.notes || meta.due || card.repeat)) return '';
  return `<span class="bd-card-meta">
        ${meta.due ? `<span class="bd-due ${meta.due.cls}">${ic('flag')}${escapeHtml(meta.due.text)}</span>` : ''}
        ${card.repeat ? `<span title="${escapeHtml(Recurrence.describe(card.repeat))}">${ic('repeat')}</span>` : ''}` + cardMetaTailHTML(card, meta);
}
function cardMetaTailHTML(card, { when, progress, done }) {
  return `
        ${when ? `<span class="bd-when ${when.late && !done ? 'late' : ''}">${ic('calendar')}${escapeHtml(when.text)}${when.rec ? ic('repeat') : ''}</span>` : ''}
        ${progress ? `<span class="${progress.done === progress.total ? 'bd-all' : ''}">${ic('checklist')}${progress.done}/${progress.total}</span>` : ''}
        ${card.notes ? `<span title="Has notes">${ic('notes')}</span>` : ''}</span>`;
}

function renderBoards() {
  const cal = $('#calendar');
  cal.className = 'calendar bd-view';
  const board = currentBoard();
  if (!board) { cal.innerHTML = boardsEmptyHTML(); return; }
  boardId = board.id;
  renderBoardInto(cal, board);
  focusPendingBoardInput(cal);
}
function renderBoardInto(cal, board) {
  const prevScroll = $('.bd-lists', cal) ? $('.bd-lists', cal).scrollLeft : 0;
  cal.innerHTML = boardHeadHTML(board) + boardListsHTML(board);
  $('.bd-lists', cal).scrollLeft = prevScroll;
}
function focusPendingBoardInput(cal) {
  if (!_boardFocus) return;
  const el = $(_boardFocus, cal);
  _boardFocus = null;
  if (el) el.focus();
}
function boardsEmptyHTML() {
  return `<div class="bd-empty">
        <h2>Boards</h2>
        <p>Keep work in lists of cards, then put cards on the calendar: drag them from the sidebar's
          Board panel onto a time slot, or onto a day in the mini calendar.</p>
        <div class="bd-templates">${BOARD_TEMPLATES.map((t) => boardTemplateButtonHTML(t)).join('')}</div>
      </div>`;
}
function boardTemplateButtonHTML(template) {
  return `
          <button type="button" class="theme-sw bd-tpl" data-board-template="${template.id}">
            ${templateSummaryHTML(template)}</button>`;
}
function templateSummaryHTML(template) {
  return `<b>${escapeHtml(template.name)}</b><small>${template.lists.length ? escapeHtml(template.lists.join(' · ')) : 'Start empty'}</small>`;
}
function boardHeadHTML(board) {
  return `
    <div class="bd-head">
      <div class="bd-tabs">${boardTabsHTML(board)}
        <button type="button" class="mini-btn" data-board-new title="New board">${ic('plus')}</button></div>
      <span class="spacer"></span>
      <div class="seg bd-filter" title="Filter cards by due date">${boardFilterButtonsHTML(board)}</div>` + boardHeadToolsHTML(board);
}
function boardHeadToolsHTML(board) {
  return `
      <input class="field bd-name" data-board-name value="${escapeHtml(board.name)}" title="Rename this board" maxlength="40" />
      <button type="button" class="btn-secondary" data-open-presets>Presets</button>
      <button type="button" class="btn-secondary danger" data-board-del>Delete board</button>
    </div>`;
}
function boardTabsHTML(board) {
  return DATA.boards.map((x) =>
    `<button type="button" class="bd-tab ${x.id === board.id ? 'sel' : ''}" data-board-tab="${x.id}">${escapeHtml(x.name)}</button>`).join('');
}
function boardFilterButtonsHTML(board) {
  return [['all', 'All'], ['week', 'Next 7 days'], ['late', 'Overdue']]
    .map(([key, text]) => boardFilterButtonHTML(board, key, text)).join('');
}
function boardFilterButtonHTML(board, key, text) {
  const n = key === 'all' ? 0 : countFilteredCards(board, key);
  const badge = n ? ` <b class="${key === 'late' ? 'bd-late-n' : ''}">${n}</b>` : '';
  return `<button type="button" data-bd-filter="${key}" class="${boardFilter === key ? 'active' : ''}">${text}${badge}</button>`;
}
function countFilteredCards(board, key) {
  return board.lists.reduce((sum, list) =>
    sum + list.cards.filter((c) => dueMatchesFilter(dueInfo(c, isDoneList(list)), isDoneList(list), key)).length, 0);
}
function boardListsHTML(board) {
  return `
    <div class="bd-lists">
      ${board.lists.map((list, i) => boardListHTML(board, list, i)).join('')}
      <form class="bd-list bd-newlist" data-add-list>
        <input class="field" placeholder="+ Add a list" maxlength="40" />
      </form>
    </div>`;
}
function boardListHTML(board, list, index) {
  const done = isDoneList(list);
  return `
        <section class="bd-list ${done ? 'done' : ''}" data-list="${list.id}">` + boardListHeadHTML(list, index, board.lists.length) + `
          <div class="bd-cards" data-cards="${list.id}">${list.cards.filter((c) => cardPasses(c, done)).map((c) => cardHTML(c, done)).join('')}</div>`
    + boardAddCardFormHTML(list.id) + `
        </section>`;
}
function boardListHeadHTML(list, index, count) {
  return `
          <header class="bd-list-head">
            <input class="bd-list-name" data-list-name="${list.id}" value="${escapeHtml(list.name)}" maxlength="40" title="Rename list" />
            <span class="bd-count">${list.cards.length}</span>
            <button type="button" class="bd-list-btn" data-list-move="${list.id}" data-dir="-1" title="Move list left" ${index === 0 ? 'disabled' : ''}>${ic('chevL')}</button>
            <button type="button" class="bd-list-btn" data-list-move="${list.id}" data-dir="1" title="Move list right" ${index === count - 1 ? 'disabled' : ''}>${ic('chevR')}</button>
            <button type="button" class="bd-list-btn" data-list-del="${list.id}" title="Delete list">${ic('x')}</button>
          </header>`;
}
function boardAddCardFormHTML(listId) {
  return `
          <form class="bd-add" data-add-card="${listId}">
            <input class="field flush" placeholder="+ Add a card" maxlength="200" />
            ${DATA.presets.length ? `<select class="field bd-preset" title="Add a card from a preset"><option value="">Preset</option>${presetOptions()}</select>` : ''}
          </form>`;
}

function addCardInputSelector(listId) {
  return `[data-add-card="${listId}"] input`;
}
async function createBoard(tplId, name) {
  const board = boardFromTemplate(tplId, name);
  DATA.boards.push(board);
  boardId = board.id;
  if (view !== 'boards') { view = 'boards'; syncViewSeg(); }
  _boardFocus = board.lists.length ? addCardInputSelector(board.lists[0].id) : '[data-add-list] input';
  await commit();
  toast('Board “' + board.name + '” created', 'ok');
}
function boardFromTemplate(tplId, name) {
  const t = BOARD_TEMPLATES.find((x) => x.id === tplId) || BOARD_TEMPLATES[0];
  return {
    id: uid(), name: name || (t.id === 'blank' ? 'New board' : t.name),
    lists: t.lists.map((n) => ({ id: uid(), name: n, cards: [] })),
  };
}
function openBoardModal() {
  openModal('New board');
  modalBody.innerHTML = boardFormHTML();
  const state = { tpl: BOARD_TEMPLATES[0].id };
  $('#bd-tpls').addEventListener('click', (e) => pickBoardTemplate(e, state));
  $('#bd-cancel').addEventListener('click', closeModal);
  $('#bdForm').addEventListener('submit', (e) => submitBoardForm(e, state.tpl));
}
function boardFormHTML() {
  return `
    <form id="bdForm" class="form">
      <label class="f-row"><span>Name</span><input class="field" id="bd-name" placeholder="e.g. Website relaunch" maxlength="40" autofocus /></label>
      <div class="f-row"><span>Start from</span>
        <div class="bd-templates" id="bd-tpls">${BOARD_TEMPLATES.map((t, i) => boardTemplateOptionHTML(t, i === 0)).join('')}</div></div>
      <div class="form-actions"><span class="spacer"></span>
        ${cancelSubmitHTML('bd-cancel', 'Create board')}</div>
    </form>`;
}
function boardTemplateOptionHTML(template, selected) {
  return `
          <button type="button" class="theme-sw bd-tpl ${selected ? 'sel' : ''}" data-tpl="${template.id}">
            ${templateSummaryHTML(template)}</button>`;
}
function pickBoardTemplate(e, state) {
  const option = e.target.closest('[data-tpl]');
  if (!option) return;
  state.tpl = option.dataset.tpl;
  selectOnly($$('#bd-tpls .bd-tpl'), option);
}
function submitBoardForm(e, tplId) {
  e.preventDefault();
  const name = $('#bd-name').value.trim();
  closeModal();
  createBoard(tplId, name);
}
function detachCardEvents(cards) {
  cards.forEach((card) => {
    const ev = cardEvent(card);
    if (ev) delete ev.cardId;
  });
}
async function deleteBoardFlow(b) {
  if (!b) return;
  const n = b.lists.reduce((s, l) => s + l.cards.length, 0);
  const r = await confirmDelete(`Delete board “${b.name}”${n ? ` and its ${n} card(s)` : ''}? Calendar events made from its cards stay on the calendar.`, 'Delete board');
  if (r !== 'del') return;
  b.lists.forEach((l) => detachCardEvents(l.cards));
  DATA.boards = DATA.boards.filter((x) => x.id !== b.id);
  boardId = null;
  await commit();
}
async function deleteListFlow(listId) {
  const f = findList(listId); if (!f) return;
  if (f.list.cards.length && !(await confirmListDelete(f.list))) return;
  detachCardEvents(f.list.cards);
  f.board.lists = f.board.lists.filter((l) => l.id !== listId);
  await commit();
}
async function confirmListDelete(list) {
  const r = await confirmDelete(`Delete list “${list.name}” and its ${list.cards.length} card(s)? Their calendar events stay.`, 'Delete list');
  return r === 'del';
}

$('#calendar').addEventListener('click', (e) => {
  if (view !== 'boards') return;
  handleBoardClick(e.target);
});
function handleBoardClick(target) {
  const tpl = target.closest('[data-board-template]');
  if (tpl) return createBoard(tpl.dataset.boardTemplate);
  const tab = target.closest('[data-board-tab]');
  if (tab) return showBoardTab(tab.dataset.boardTab);
  const flt = target.closest('[data-bd-filter]');
  if (flt) return setBoardFilter(flt.dataset.bdFilter);
  handleBoardButtonClick(target);
}
function showBoardTab(id) {
  boardId = id;
  savePrefs();
  render();
}
function setBoardFilter(filter) {
  boardFilter = filter;
  render();
}
function handleBoardButtonClick(target) {
  if (target.closest('[data-board-new]')) return openBoardModal();
  if (target.closest('[data-open-presets]')) return openPresetsModal();
  if (target.closest('[data-board-del]')) return deleteBoardFlow(currentBoard());
  const mv = target.closest('[data-list-move]');
  if (mv) return moveBoardList(mv.dataset.listMove, +mv.dataset.dir);
  const del = target.closest('[data-list-del]');
  if (del) deleteListFlow(del.dataset.listDel);
}
function moveBoardList(listId, dir) {
  const b = currentBoard();
  const i = b.lists.findIndex((l) => l.id === listId), j = i + dir;
  if (i < 0 || j < 0 || j >= b.lists.length) return;
  [b.lists[i], b.lists[j]] = [b.lists[j], b.lists[i]];
  commit();
}
$('#calendar').addEventListener('change', (e) => {
  if (view !== 'boards') return;
  handleBoardChange(e.target);
});
function handleBoardChange(t) {
  if (t.matches('[data-board-name]')) renameFromInput(t, currentBoard());
  else if (t.matches('[data-list-name]')) {
    const found = findList(t.dataset.listName);
    renameFromInput(t, found && found.list);
  } else if (t.matches('.bd-preset')) addCardFromPresetSelect(t);
}
function renameFromInput(input, item) {
  const value = input.value.trim();
  if (!item) return;
  if (!value) {
    input.value = item.name;
    return;
  }
  item.name = value;
  commit();
}
function addCardFromPresetSelect(select) {
  const p = presetById(select.value);
  const form = select.closest('[data-add-card]');
  const f = findList(form.dataset.addCard);
  if (!p || !f) return;
  f.list.cards.push(cardFromPreset(p, $('input', form).value.trim()));
  _boardFocus = addCardInputSelector(f.list.id);
  commit();
}
$('#calendar').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-board-name], [data-list-name]')) e.target.blur();
});
$('#calendar').addEventListener('submit', (e) => {
  if (view !== 'boards') return;
  e.preventDefault();
  const form = e.target;
  const v = $('input', form).value.trim();
  if (!v) return;
  if (form.matches('[data-add-card]')) addCardToList(form.dataset.addCard, v);
  else if (form.matches('[data-add-list]')) addListToBoard(v);
});
function addCardToList(listId, title) {
  const f = findList(listId); if (!f) return;
  f.list.cards.push(newCardObject(title, 60, null));
  _boardFocus = addCardInputSelector(f.list.id);
  commit();
}
function addListToBoard(name) {
  currentBoard().lists.push({ id: uid(), name, cards: [] });
  _boardFocus = '[data-add-list] input';
  commit();
}

function openCardModal(cardId) {
  const f = findCard(cardId); if (!f) return;
  const ctx = createCardContext(f);
  openModal('Card');
  modalBody.innerHTML = cardFormHTML(ctx);
  wireCardForm(ctx);
}
function createCardContext(found) {
  const ev = cardEvent(found.card);
  return {
    found, card: found.card, ev, prefix: 'cd', pickSelector: '#cd-pick',
    rec: !!(ev && ev.recurrence && ev.recurrence.freq !== 'none'),
    checklist: found.card.checklist.map((i) => ({ ...i })),
    presetReminders: null,
  };
}
function cardFormHTML(ctx) {
  return `
    <form id="cdForm" class="form">
      <label class="f-row"><span>Title</span>
        <input class="field" id="cd-title" value="${escapeHtml(ctx.card.title)}" autofocus /></label>` + cardListPresetHTML(ctx.found) + `
      ${labelPickRowHTML('cd-pick', 'cd-label', ctx.card.labelId)}` + cardDueRepeatHTML(ctx.card) + cardCalendarHTML(ctx)
    + cardChecklistNotesHTML(ctx.card) + formActionsHTML(cardLeadButtonsHTML(), cancelSubmitHTML('cd-cancel', 'Save'));
}
function cardListPresetHTML(found) {
  return `
      <div class="f-grid">
        <label class="f-row"><span>List on “${escapeHtml(found.board.name)}”</span>
          <select class="field" id="cd-list">${listOptionsHTML(found.board.lists, found.list.id)}</select></label>
        ${DATA.presets.length ? `<label class="f-row"><span>Preset</span>
          <select class="field" id="cd-preset"><option value="">Apply a preset</option>${presetOptions()}</select></label>` : '<span></span>'}
      </div>`;
}
function cardDueRepeatHTML(card) {
  return `
      <div class="f-grid">
        <label class="f-row"><span>Due date</span>
          <input class="field" type="date" id="cd-due" value="${card.due || ''}" /></label>
        <label class="f-row"><span>Repeat (next copy appears when it's moved to Done)</span>
          <select class="field" id="cd-repeat">${cardRepeatOptionsHTML(card.repeat)}</select></label>
      </div>`;
}
function cardRepeatOptionsHTML(rule) {
  const kind = repeatKind(rule);
  return selectOptionsHTML(REPEAT_KINDS, kind) + `
            ${kind === 'custom' ? `<option value="custom" selected>${escapeHtml(Recurrence.describe(rule))}</option>` : ''}`;
}
function cardCalendarHTML(ctx) {
  const { ev } = ctx;
  return `
      <div class="f-row"><span>On the calendar</span>
        ${ctx.rec ? `<div class="set-note">Repeats (${escapeHtml(Recurrence.describe(ev.recurrence))}). Change its times in the calendar.</div>` : cardScheduleHTML(ev, cardDurationMinutes(ctx))}
        ${ev ? cardEventLinksHTML() : '<span class="set-note">Pick a date to put this card on the calendar, or drag it there from the sidebar.</span>'}
      </div>`;
}
function cardDurationMinutes(ctx) {
  return ctx.ev && !ctx.ev.allDay ? minutesBetween(ctx.ev.start, ctx.ev.end) : (ctx.card.duration || 60);
}
function cardScheduleHTML(ev, duration) {
  return `
        <div class="f-inline cd-sched">
          <input class="field" type="date" id="cd-date" value="${ev ? ev.start.slice(0, 10) : ''}" />
          <input class="field" type="time" id="cd-time" value="${ev && !ev.allDay ? ev.start.slice(11, 16) : '09:00'}" />
          <select class="field" id="cd-dur">${durationOptionsHTML(duration, true)}</select>
          <label class="f-check"><input type="checkbox" id="cd-allday" ${ev && ev.allDay ? 'checked' : ''}/> All day</label>
        </div>`;
}
function cardEventLinksHTML() {
  return `<div class="f-inline"><button type="button" class="link-btn" id="cd-goto">Open in calendar</button>
            <button type="button" class="link-btn danger" id="cd-unsched">Remove from calendar</button></div>`;
}
function cardChecklistNotesHTML(card) {
  return `
      <div class="f-row"><span>Checklist <b id="cl-count"></b></span>
        <div class="checklist" id="ev-checklist"></div>
        <input class="field flush" id="cl-input" placeholder="Add an item, press Enter" /></div>
      <label class="f-row"><span>Notes</span>
        <textarea class="field" id="cd-notes" rows="3" placeholder="Details and links">${escapeHtml(card.notes || '')}</textarea></label>`;
}
function cardLeadButtonsHTML() {
  return `${dangerDeleteButtonHTML('cd-del')}
        <button type="button" class="link-btn" id="cd-savepreset">Save as preset</button>`;
}

function wireCardForm(ctx) {
  ctx.renderChecklist = wireChecklist(ctx.checklist);
  wireLabelPick($('#cd-pick'), '#cd-label');
  if (!ctx.rec) wireCardAllDay();
  wirePresetSelect('#cd-preset', (preset) => applyCardPreset(ctx, preset));
  $('#cd-savepreset').addEventListener('click', () => saveCardAsPreset(ctx));
  if (ctx.ev) wireCardEventLinks(ctx);
  wireCardActions(ctx);
}
function syncCardAllDay() {
  const on = $('#cd-allday').checked;
  $('#cd-time').disabled = $('#cd-dur').disabled = on;
}
function wireCardAllDay() {
  $('#cd-allday').addEventListener('change', syncCardAllDay);
  syncCardAllDay();
}
function applyCardPreset(ctx, preset) {
  applyPresetFields(preset, ctx);
  if (!ctx.rec) applyCardPresetTiming(preset);
  ctx.presetReminders = preset.reminders;
}
function applyCardPresetTiming(preset) {
  $('#cd-allday').checked = !!preset.allDay;
  if (!preset.allDay) selectDurationOption($('#cd-dur'), preset.duration);
  syncCardAllDay();
}
function selectDurationOption(select, minutes) {
  if (![...select.options].some((o) => +o.value === minutes)) select.insertAdjacentHTML('beforeend', `<option value="${minutes}">${minutes} min</option>`);
  select.value = String(minutes);
}
async function saveCardAsPreset(ctx) {
  const title = $('#cd-title').value.trim();
  if (!title) { $('#cd-title').focus(); return; }
  DATA.presets.push(cardPresetFromForm(ctx, title));
  await saveData();
  toast('Saved preset “' + title + '”. Edit it under More › Presets', 'ok', 5000);
}
function cardPresetFromForm(ctx, title) {
  const { rec, ev, card } = ctx;
  return {
    id: uid(), name: title, title, labelId: $('#cd-label').value || null,
    duration: rec ? (card.duration || 60) : +$('#cd-dur').value || 60, allDay: !rec && $('#cd-allday').checked,
    reminders: (ev ? ev.reminders : card.reminders).map((r) => r.minutes),
    checklist: ctx.checklist.map((i) => i.text), notes: $('#cd-notes').value.trim(),
  };
}
function wireCardEventLinks(ctx) {
  $('#cd-goto').addEventListener('click', () => openCardEventInCalendar(ctx.ev));
  $('#cd-unsched').addEventListener('click', () => unscheduleCard(ctx));
}
function openCardEventInCalendar(ev) {
  const o = nextOccurrence(ev);
  closeModal();
  anchor = o ? new Date(o.start) : new Date(ev.start);
  miniMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  setView('day');
  openEventModal(ev, { occStartISO: o ? o.occStartISO : ev.start });
}
async function unscheduleCard(ctx) {
  DATA.events = DATA.events.filter((x) => x.id !== ctx.ev.id);
  ctx.card.eventId = null;
  closeModal();
  await commit();
  toast('Removed from the calendar (card kept)', 'ok');
}
function wireCardActions(ctx) {
  $('#cd-del').addEventListener('click', () => deleteCardFlow(ctx.card.id));
  $('#cd-cancel').addEventListener('click', closeModal);
  $('#cdForm').addEventListener('submit', (e) => submitCardForm(e, ctx));
}

async function submitCardForm(e, ctx) {
  e.preventDefault();
  const found = findCard(ctx.card.id);
  if (!found) { closeModal(); return; }
  const msg = updateCardFromForm(found, ctx);
  closeModal();
  await commit();
  toast(msg, 'ok');
}
function updateCardFromForm(found, ctx) {
  const card = found.card;
  applyCardFields(card, ctx);
  applyCardRepeat(card, ctx.rec);
  const msg = ctx.rec ? 'Card saved' : applyCardSchedule(card);
  const linkedEv = cardEvent(card);
  if (linkedEv) copyShared(card, linkedEv);
  if ($('#cd-list').value !== found.list.id) moveCard(card.id, $('#cd-list').value);
  return msg;
}
function applyCardFields(card, ctx) {
  card.title = $('#cd-title').value.trim() || card.title;
  card.labelId = $('#cd-label').value || null;
  card.notes = $('#cd-notes').value.trim();
  card.checklist = ctx.checklist;
  if (ctx.presetReminders) applyPresetReminders(card, ctx.presetReminders);
  card.due = $('#cd-due').value || null;
}
function applyPresetReminders(card, minutesList) {
  card.reminders = minutesList.map((m) => ({ minutes: m }));
  const linkedEv = cardEvent(card);
  if (linkedEv) linkedEv.reminders = card.reminders.map((r) => ({ ...r }));
}
function applyCardRepeat(card, rec) {
  const kind = $('#cd-repeat').value;
  if (kind === 'none') card.repeat = null;
  else if (kind !== 'custom') card.repeat = repeatRule(kind, cardRepeatBase(card, rec));
  if (card.repeat) applyRoutineDefaults(card);
}
function cardRepeatBase(card, rec) {
  if (card.due) return new Date(card.due + 'T12:00');
  return !rec && $('#cd-date').value ? new Date($('#cd-date').value + 'T12:00') : new Date();
}
function applyRoutineDefaults(card) {
  const target = findList($('#cd-list').value);
  if (target && !isDoneList(target.list)) card.homeListId = target.list.id;
  if (!card.due) card.due = toLocalISO(nextRoutineDate(card.repeat, addDays(new Date(), -1)) || new Date()).slice(0, 10);
}
function applyCardSchedule(card) {
  const date = $('#cd-date').value, allDay = $('#cd-allday').checked;
  card.duration = +$('#cd-dur').value || 60;
  if (date) return scheduleCardFromForm(card, date, allDay);
  if (!cardEvent(card)) return 'Card saved';
  DATA.events = DATA.events.filter((x) => x.id !== card.eventId);
  card.eventId = null;
  return 'Card saved and removed from the calendar';
}
function scheduleCardFromForm(card, date, allDay) {
  const had = !!cardEvent(card);
  scheduleCard(card, new Date(date + 'T' + (allDay ? '00:00' : ($('#cd-time').value || '09:00'))), allDay);
  return had ? 'Card saved' : 'Card saved and put on the calendar';
}

async function deleteCardFlow(cardId) {
  const before = findCard(cardId);
  if (!before) return;
  const ev = cardEvent(before.card);
  const choice = await confirmCardDelete(before.card.title, ev);
  if (!applyCardDeletion(cardId, ev, choice)) return;
  closeModal();
  await commit();
  toast('Card deleted', 'ok');
}
function confirmCardDelete(title, ev) {
  return confirmDialog(`Delete card “${title}”?`, ev
    ? [{ id: 'both', text: 'Delete card + calendar event', danger: true }, { id: 'card', text: 'Card only' }, { id: 'no', text: 'Cancel' }]
    : [{ id: 'card', text: 'Delete', danger: true }, { id: 'no', text: 'Cancel' }]);
}
function applyCardDeletion(cardId, ev, choice) {
  if (choice !== 'both' && choice !== 'card') return false;
  const found = findCard(cardId);
  if (!found) return false;
  found.list.cards.splice(found.index, 1);
  if (ev && choice === 'both') DATA.events = DATA.events.filter((x) => x.id !== ev.id);
  else if (ev) delete ev.cardId;
  return true;
}

function renderSideCards() {
  const host = $('#sideCards');
  const b = currentBoard();
  renderSideBoardSelect(b);
  if (!b) { host.innerHTML = '<p class="empty">No boards yet. <button type="button" class="link-btn" data-goto-boards>Make one</button></p>'; return; }
  const rows = unscheduledCardRows(b);
  if (!rows.length) { host.innerHTML = '<p class="empty">Every open card is on the calendar.</p>'; return; }
  host.innerHTML = rows.map(([c, l]) => sideCardRowHTML(c, l)).join('');
}
function renderSideBoardSelect(board) {
  const sel = $('#sideBoard');
  sel.hidden = !board;
  sel.innerHTML = DATA.boards.map((x) =>
    `<option value="${x.id}" ${board && x.id === board.id ? 'selected' : ''}>${escapeHtml(x.name)}</option>`).join('');
}
function unscheduledCardRows(board) {
  const rows = [];
  for (const l of board.lists) {
    if (isDoneList(l)) continue;
    for (const c of l.cards) if (!cardEvent(c)) rows.push([c, l]);
  }
  return rows;
}
function sideCardRowHTML(card, list) {
  const due = dueInfo(card, false);
  return `<div class="task-row">
      <button class="task-grip" data-card-grip="${card.id}" type="button" title="Drag onto the calendar">${ic('grip')}</button>
      <span class="task-dot" style="background:${dotColor(card.labelId)}"></span>
      <span class="task-title" data-card="${card.id}">${escapeHtml(card.title)}</span>
      ${due ? `<span class="side-list bd-due ${due.cls}">${escapeHtml(due.text.replace('Due ', ''))}</span>`
        : `<span class="side-list">${escapeHtml(list.name)}</span>`}
    </div>`;
}
$('#sideBoard').addEventListener('change', (e) => { boardId = e.target.value; savePrefs(); render(); });

function durationText(p) {
  if (p.allDay) return 'all day';
  const d = DURATIONS.find(([v]) => v === p.duration);
  return d ? d[1] : p.duration + ' min';
}
function openPresetsModal() {
  closeModal();
  openModal('Card & event presets');
  modalBody.innerHTML = presetsModalHTML();
  $('#pr-close').addEventListener('click', closeModal);
  $('#pr-new').addEventListener('click', () => openPresetEditor(null));
  $('.pr-list').addEventListener('click', handlePresetListClick);
}
function presetsModalHTML() {
  return `
    <div class="form">
      <p class="set-note">A preset fills in a card or an event in one click: title, label, length, reminders
        and a checklist. Use them from the Preset box under each board list, the “Preset” box in the event and
        card dialogs, or make one with “Save as preset” in either dialog.</p>
      <div class="pr-list">${DATA.presets.map((p) => presetRowHTML(p)).join('') || '<p class="empty">No presets yet.</p>'}</div>`
    + presetsModalActionsHTML();
}
function presetsModalActionsHTML() {
  return `
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="pr-new">${ic('plus')}New preset</button>
        <span class="spacer"></span>
        <button type="button" class="btn-primary" id="pr-close">Done</button>
      </div>
    </div>`;
}
function presetRowHTML(p) {
  return `<div class="pr-row">
        <span class="task-dot" style="background:${dotColor(p.labelId)}"></span>
        <span class="pr-main"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(presetSummaryBits(p).join(' · '))}</small></span>
        <button type="button" class="btn-secondary" data-pr-edit="${p.id}">Edit</button>
        <button type="button" class="rem-x" data-pr-del="${p.id}" title="Delete preset">${ic('x')}</button>
      </div>`;
}
function presetSummaryBits(p) {
  const bits = [durationText(p)];
  if (p.labelId) bits.unshift(labelName(p.labelId));
  if (p.checklist.length) bits.push(`${p.checklist.length} checklist item${p.checklist.length > 1 ? 's' : ''}`);
  if (p.reminders.length) bits.push('reminder ' + p.reminders.map(reminderText).join(', '));
  return bits;
}
function handlePresetListClick(e) {
  const ed = e.target.closest('[data-pr-edit]');
  if (ed) { openPresetEditor(presetById(ed.dataset.prEdit)); return; }
  const del = e.target.closest('[data-pr-del]');
  if (del) deletePresetFlow(presetById(del.dataset.prDel));
}
async function deletePresetFlow(p) {
  const r = await confirmDelete(`Delete preset “${p.name}”? Cards and events made from it are not affected.`);
  if (r !== 'del') return;
  DATA.presets = DATA.presets.filter((x) => x.id !== p.id);
  await commit();
  openPresetsModal();
}

function openPresetEditor(preset) {
  const p = preset ? JSON.parse(JSON.stringify(preset)) : blankPreset();
  openModal(preset ? 'Edit preset' : 'New preset');
  modalBody.innerHTML = presetFormHTML(p);
  wireLabelPick($('#pr-pick'), '#pr-label');
  wireReminderList('#pr-add-rem', '#pr-reminders', 10);
  $('#pr-back').addEventListener('click', openPresetsModal);
  $('#prForm').addEventListener('submit', (e) => submitPresetForm(e, p));
}
function blankPreset() {
  return { id: null, name: '', title: '', labelId: null, duration: 60, allDay: false, reminders: [], checklist: [], notes: '' };
}
function presetFormHTML(p) {
  return `
    <form id="prForm" class="form">
      <div class="f-grid">
        <label class="f-row"><span>Preset name</span>
          <input class="field" id="pr-name" value="${escapeHtml(p.name)}" placeholder="e.g. Client call" maxlength="40" autofocus /></label>
        <label class="f-row"><span>Title it fills in</span>
          <input class="field" id="pr-title" value="${escapeHtml(p.title)}" placeholder="Same as the name" /></label>
      </div>` + presetFormFieldsHTML(p) + presetFormEndHTML(p);
}
function presetFormFieldsHTML(p) {
  return `
      ${labelPickRowHTML('pr-pick', 'pr-label', p.labelId)}
      <label class="f-row"><span>Length</span>
        <select class="field" id="pr-dur" style="max-width:180px"><option value="allday" ${p.allDay ? 'selected' : ''}>All day</option>${durationOptionsHTML(p.duration, !p.allDay)}</select></label>
      <div class="f-row"><span>Reminders</span>
        <div class="reminders" id="pr-reminders">${p.reminders.map((m) => reminderRowHTML(m)).join('')}</div>
        <button type="button" class="link-btn" id="pr-add-rem">+ Add a reminder</button></div>`;
}
function presetFormEndHTML(p) {
  return `
      <label class="f-row"><span>Checklist (one item per line)</span>
        <textarea class="field" id="pr-cl" rows="4" placeholder="Agenda&#10;Notes&#10;Next steps">${escapeHtml(p.checklist.join('\n'))}</textarea></label>
      <label class="f-row"><span>Notes</span>
        <textarea class="field" id="pr-notes" rows="2">${escapeHtml(p.notes || '')}</textarea></label>`
    + formActionsHTML('<button type="button" class="btn-secondary" id="pr-back">Back</button>', submitButtonHTML('Save preset'));
}
async function submitPresetForm(e, p) {
  e.preventDefault();
  const name = $('#pr-name').value.trim();
  if (!name) { $('#pr-name').focus(); return; }
  storePreset(presetFromForm(p, name));
  await commit();
  openPresetsModal();
  toast('Preset “' + name + '” saved', 'ok', 2500);
}
function presetFromForm(p, name) {
  const dur = $('#pr-dur').value;
  return {
    id: p.id || uid(), name, title: $('#pr-title').value.trim(), labelId: $('#pr-label').value || null,
    allDay: dur === 'allday', duration: dur === 'allday' ? (p.duration || 60) : +dur,
    reminders: readReminderMinutes('#pr-reminders').sort((a, b) => a - b),
    checklist: $('#pr-cl').value.split('\n').map((s) => s.trim()).filter(Boolean),
    notes: $('#pr-notes').value.trim(),
  };
}
function storePreset(preset) {
  const i = DATA.presets.findIndex((x) => x.id === preset.id);
  if (i >= 0) DATA.presets[i] = preset; else DATA.presets.push(preset);
}

function shrinkImage(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(drawScaledImage(img, maxW, quality));
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
function drawScaledImage(img, maxW, quality) {
  const k = Math.min(1, maxW / img.naturalWidth);
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * k);
  cv.height = Math.round(img.naturalHeight * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  URL.revokeObjectURL(img.src);
  return cv.toDataURL('image/jpeg', quality);
}
function openSettings() {
  openModal('Settings');
  modalBody.innerHTML = settingsFormHTML(DATA.settings);
  bindSettingsThemeGrid();
  bindSettingsCustomTheme();
  bindSettingsToggles();
  bindPushControls();
  paintPushStatus();
}
function settingsFormHTML(s) {
  return `
    <form id="setForm" class="form">
      ${settingsThemeRowHTML(s)}
      ${settingsGeneralHTML(s)}
      ${settingsPushRowHTML()}
      ${settingsFooterHTML()}
    </form>`;
}
function settingsThemeRowHTML(s) {
  return `<div class="f-row"><span>Theme</span>
        ${settingsThemeGridHTML(s)}
        ${settingsCustomThemeHTML(s)}
      </div>`;
}
function settingsThemeGridHTML(s) {
  return `<div class="theme-grid" id="set-themes">
          ${THEMES.map((theme) => settingsThemeButtonHTML(theme, s.theme)).join('')}
        </div>`;
}
function settingsThemeButtonHTML(theme, current) {
  return `<button type="button" class="theme-sw ${theme === current ? 'sel' : ''}" data-theme="${theme}">
             <span class="ts-dot" style="background:${themeSwatch(theme)}"></span>
             ${THEME_NAMES[theme]}</button>`;
}
function settingsCustomThemeHTML(s) {
  return `<div class="custom-theme" id="set-custom" ${s.theme === 'custom' ? '' : 'hidden'}>
          <label class="ct-row"><span>Accent color</span><input type="color" id="ct-accent" value="${s.customTheme.accent}" /></label>
          <label class="ct-row"><span>Background color</span><input type="color" id="ct-bg" value="${s.customTheme.bg}" /></label>
          ${settingsImageRowsHTML(s.customTheme.image)}
        </div>`;
}
function settingsImageRowsHTML(image) {
  return `<label class="ct-row"><span>Background image URL</span>
            <input class="field" type="url" id="ct-url" placeholder="https://" value="${image.startsWith('data:') ? '' : escapeHtml(image)}" /></label>
          <div class="ct-row"><span>Upload image</span>
            <div class="f-inline"><input type="file" id="ct-file" accept="image/*" />
              <button type="button" class="link-btn" id="ct-clear">Remove image</button></div></div>`;
}
function settingsGeneralHTML(s) {
  return `${settingsAppearanceRowHTML(s)}
      ${settingsChecksHTML(s)}
      ${settingsAutolockRowHTML(s)}`;
}
function settingsAppearanceRowHTML(s) {
  return `<div class="f-row"><span>Appearance</span>
        <div class="seg set-mode" id="set-mode">${settingsModeButtonsHTML(s.appearance || 'light')}</div>
      </div>`;
}
function settingsModeButtonsHTML(current) {
  return [['light', 'Light'], ['dark', 'Dark'], ['system', 'Match system']].map(([value, text]) =>
    `<button type="button" data-mode="${value}" class="${current === value ? 'active' : ''}">${text}</button>`).join('');
}
function settingsChecksHTML(s) {
  return `<label class="f-check"><input type="checkbox" id="set-ambient" ${s.ambient !== false ? 'checked' : ''}/>
        Ambient background effects (snow, orbs)</label>
      <label class="f-check"><input type="checkbox" id="set-digest" ${s.digest ? 'checked' : ''}/>
        Morning digest notification</label>
      <label class="f-row"><span>Digest time</span>
        <input class="field" type="time" id="set-digest-time" value="${s.digestTime || '08:00'}" style="max-width:130px" />
      </label>`;
}
function settingsAutolockRowHTML(s) {
  return `<label class="f-row"><span>Lock when idle</span>
        <select class="field" id="set-autolock" style="max-width:150px">
          ${settingsAutolockOptionsHTML(+s.autolock)}
        </select>
      </label>`;
}
function settingsAutolockOptionsHTML(current) {
  return [[0, 'Never'], [5, 'After 5 min'], [15, 'After 15 min'], [30, 'After 30 min'], [60, 'After 1 hour']]
    .map(([value, text]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${text}</option>`).join('');
}
function settingsPushRowHTML() {
  return `<div class="f-row"><span>Reminders when PlanTim is closed (this device)</span>
        <div class="f-inline"><span id="push-status" class="push-status">Checking</span>
          <button type="button" class="btn-secondary" id="push-toggle" hidden></button>
          <button type="button" class="link-btn" id="push-test" hidden>Send a test</button></div>
        <p class="set-note push-health" id="push-health" hidden></p>
        ${settingsPushNoteHTML()}
      </div>`;
}
function settingsPushNoteHTML() {
  return `<p class="set-note">The sync server wakes this device when a reminder is due. It only learns <i>when</i>
          (“Reminder · 2:00 PM”); the real title comes from a copy of the next week's reminders kept on this
          device, which is cleared when you sign out. iPhone/iPad: install PlanTim to the home screen first.</p>`;
}
function settingsFooterHTML() {
  return `<p class="set-note">Without push, reminders fire while PlanTim is open or in the background, and
        anything you missed is shown when you open it again. A forgotten password can only be reset with a recovery key (More &rsaquo; Recovery key).</p>
      <div class="form-actions"><span class="spacer"></span>
        <button type="button" class="btn-secondary" id="set-close">Done</button></div>`;
}
function bindSettingsThemeGrid() {
  $('#set-themes').addEventListener('click', (e) => {
    const button = e.target.closest('.theme-sw'); if (!button) return;
    $$('#set-themes .theme-sw').forEach((other) => other.classList.toggle('sel', other === button));
    DATA.settings.theme = button.dataset.theme;
    $('#set-custom').hidden = button.dataset.theme !== 'custom';
    applyTheme(button.dataset.theme);
    saveData();
  });
}
function updateCustomTheme(patch) {
  Object.assign(DATA.settings.customTheme, patch);
  $('#set-themes [data-theme="custom"] .ts-dot').style.background = DATA.settings.customTheme.accent;
  applyTheme(DATA.settings.theme);
  saveData();
}
function bindSettingsCustomTheme() {
  $('#ct-accent').addEventListener('input', (e) => updateCustomTheme({ accent: e.target.value }));
  $('#ct-bg').addEventListener('input', (e) => updateCustomTheme({ bg: e.target.value }));
  $('#ct-url').addEventListener('change', (e) => updateCustomTheme({ image: e.target.value.trim() }));
  $('#ct-clear').addEventListener('click', clearCustomThemeImage);
  $('#ct-file').addEventListener('change', onCustomThemeFile);
}
function clearCustomThemeImage() {
  $('#ct-url').value = '';
  $('#ct-file').value = '';
  updateCustomTheme({ image: '' });
}
async function onCustomThemeFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  $('#ct-url').value = '';
  updateCustomTheme({ image: await shrinkImage(file, 1920, 0.82) });
}
function bindSettingsToggles() {
  $('#set-mode').addEventListener('click', onSettingsModeClick);
  $('#set-ambient').addEventListener('change', (e) => { DATA.settings.ambient = e.target.checked; applyAmbient(e.target.checked); saveData(); });
  $('#set-digest').addEventListener('change', (e) => { DATA.settings.digest = e.target.checked; saveData(); scheduleTick(); });
  $('#set-digest-time').addEventListener('change', (e) => { DATA.settings.digestTime = e.target.value || '08:00'; saveData(); });
  $('#set-autolock').addEventListener('change', (e) => { DATA.settings.autolock = +e.target.value || 0; saveData(); armIdleLock(); });
  $('#set-close').addEventListener('click', closeModal);
}
function onSettingsModeClick(e) {
  const button = e.target.closest('[data-mode]'); if (!button) return;
  $$('#set-mode button').forEach((other) => other.classList.toggle('active', other === button));
  DATA.settings.appearance = button.dataset.mode;
  applyAppearance(button.dataset.mode);
  saveData();
}
function bindPushControls() {
  $('#push-toggle').addEventListener('click', onPushToggleClick);
  $('#push-test').addEventListener('click', sendPushTest);
}
function pushUnavailableReason() {
  return !('PushManager' in window) ? 'Not supported in this browser'
    : !Sync.isLoggedIn() ? 'Needs the sync server'
    : !Sync.pushKey() ? 'This server can’t send pushes' : '';
}
async function paintPushStatus() {
  const status = $('#push-status'), toggle = $('#push-toggle'), test = $('#push-test');
  if (!status) return;
  const reason = pushUnavailableReason();
  if (reason) { status.textContent = reason; toggle.hidden = test.hidden = true; return; }
  const sub = await pushSubscription();
  showPushState(status, toggle, test, !!sub);
}
function showPushState(status, toggle, test, on) {
  status.textContent = on ? 'On' : 'Off';
  status.classList.toggle('on', on);
  toggle.hidden = false;
  toggle.textContent = on ? 'Turn off' : 'Turn on';
  test.hidden = !on;
  paintPushServerHealth(on);
}
function paintPushServerHealth(on) {
  const el = $('#push-health');
  const health = Sync.pushHealth();
  if (!el || !on || !health) { if (el) el.hidden = true; return; }
  const report = pushHealthReport(health);
  el.textContent = report.lines.join(' ');
  el.classList.toggle('warn', report.bad);
  el.hidden = false;
}
function timeAgoText(time) {
  const minutes = Math.round((Date.now() - time) / 60000);
  return minutes < 1 ? 'just now' : minutes < 120 ? minutes + ' min ago' : Math.round(minutes / 60) + ' h ago';
}
function pushHealthReport(health) {
  const report = { lines: [], bad: false };
  addPushTickLine(report, health.tick);
  report.lines.push(health.queued + ' reminder' + (health.queued === 1 ? '' : 's') + ' queued on the server for the next week.');
  if (health.last && health.last.codes && health.last.codes.length) addLastPushLine(report, health.last);
  return report;
}
function flagPushProblem(report, line) {
  report.lines.push(line);
  report.bad = true;
}
function addPushTickLine(report, tick) {
  if (!tick) flagPushProblem(report, 'The server has never checked for due reminders on its own: its background job (cron) isn’t running, so pushes only go out while PlanTim is open somewhere. See DEPLOY.md › Push reminders.');
  else if (Date.now() - tick > 5 * 60000) flagPushProblem(report, 'The server last checked for due reminders ' + timeAgoText(tick) + '. Its background job (cron) has stopped, so pushes only go out while PlanTim is open.');
  else report.lines.push('Server background check: running (' + timeAgoText(tick) + ').');
}
function addLastPushLine(report, last) {
  const fails = last.codes.filter((code) => code < 200 || code >= 300);
  if (fails.length) flagPushProblem(report, 'Last push (' + timeAgoText(last.at) + ') was refused by the push service: ' + fails.join(', ') + '. Turn push off and on again on each device.');
  else report.lines.push('Last push delivered ' + timeAgoText(last.at) + '.');
}
async function onPushToggleClick(e) {
  e.target.disabled = true;
  try {
    await togglePushSubscription();
  } catch (ex) { toast(ex.message || 'Could not change push reminders', 'error', 8000); }
  e.target.disabled = false;
  paintPushStatus();
}
async function togglePushSubscription() {
  if (await pushSubscription()) { await disablePush(); toast('Push reminders off on this device', 'ok'); }
  else { await enablePush(); toast('Push reminders on. They arrive even with PlanTim closed.', 'ok', 6000); }
}
async function sendPushTest() {
  try {
    const result = await Sync.pushTest();
    toast(`Test sent to ${result.subs} device(s). It can take a few seconds.`, 'ok');
  } catch (_) { toast('The server could not send a test push', 'error'); }
}

function armIdleLock() {
  clearTimeout(idleTimer);
  const mins = +(DATA.settings && DATA.settings.autolock) || 0;
  if (mins > 0 && CryptoBox.isUnlocked()) idleTimer = setTimeout(lockNow, mins * 60000);
}
let _idlePoke = 0;
['pointerdown', 'keydown'].forEach((ev) =>
  document.addEventListener(ev, () => {
    if (shell.hidden || Date.now() - _idlePoke < 20000) return;
    _idlePoke = Date.now();
    armIdleLock();
  }, { passive: true }));

function nextOccurrence(ev) {
  const now = new Date();
  const list = Recurrence.expand(ev, addDays(now, -370), addDays(now, 730));
  return list.find((o) => o.end >= now) || list[list.length - 1] || null;
}
function highlight(text, q) {
  const s = String(text || '');
  const i = s.toLowerCase().indexOf(q);
  if (i < 0) return escapeHtml(s);
  return escapeHtml(s.slice(0, i)) + '<span class="srch-hit">' + escapeHtml(s.slice(i, i + q.length))
    + '</span>' + escapeHtml(s.slice(i + q.length));
}

function openSearch() {
  openModal('Search');
  modalBody.innerHTML = `
    <div class="search-box"><input class="field" id="srch-input" placeholder="Search events, tasks, cards and notes" autocomplete="off" /></div>
    <div class="search-results" id="srch-results"></div>`;
  const state = { input: $('#srch-input'), host: $('#srch-results'), rows: [], sel: -1, timer: undefined };
  bindSearchEvents(state);
  runSearch(state);
}
function bindSearchEvents(state) {
  state.input.addEventListener('input', () => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => runSearch(state), 120);
  });
  state.input.addEventListener('keydown', (e) => onSearchKey(state, e));
  state.host.addEventListener('click', (e) => {
    const row = e.target.closest('.srch-row'); if (row) openSearchHit(state, +row.dataset.i);
  });
}
function onSearchKey(state, e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); state.sel = Math.min(state.rows.length - 1, state.sel + 1); paintSearchSel(state); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); state.sel = Math.max(0, state.sel - 1); paintSearchSel(state); }
  else if (e.key === 'Enter') { e.preventDefault(); openSearchHit(state, state.sel); }
}
function paintSearchSel(state) {
  $$('.srch-row', state.host).forEach((row, i) => row.classList.toggle('sel', i === state.sel));
  const el = $$('.srch-row', state.host)[state.sel];
  if (el) el.scrollIntoView({ block: 'nearest' });
}
function runSearch(state) {
  const q = state.input.value.trim().toLowerCase();
  if (!q) { state.host.innerHTML = '<p class="empty">Start typing to search everything.</p>'; state.rows = []; return; }
  state.rows = collectSearchHits(q).slice(0, 50);
  state.sel = state.rows.length ? 0 : -1;
  if (!state.rows.length) { state.host.innerHTML = `<p class="empty">No matches for "${escapeHtml(q)}".</p>`; return; }
  state.host.innerHTML = state.rows.map((hit, i) => searchRowHTML(hit, i, state.sel, q)).join('');
}
function collectSearchHits(q) {
  const hits = [...searchEventHits(q), ...searchTaskHits(q), ...searchCardHits(q), ...searchNoteHits(q)];
  hits.sort((a, b) => (a.kind !== 'event') - (b.kind !== 'event') || (a.date && b.date ? a.date - b.date : 0));
  return hits;
}
function searchHitColor(labelId) {
  return labelId ? labelColor(labelId) : '#9aa4ac';
}
function searchEventHits(q) {
  const hits = [];
  for (const ev of DATA.events) {
    const checklist = (ev.checklist || []).map((c) => c.text).join(' · ');
    const hay = `${ev.title}\n${ev.notes || ''}\n${checklist}\n${labelName(ev.labelId)}`.toLowerCase();
    if (hay.includes(q)) hits.push(eventSearchHit(ev, checklist, q));
  }
  return hits;
}
function eventSearchHit(ev, checklist, q) {
  const occ = nextOccurrence(ev);
  return {
    kind: 'event', id: ev.id, occIso: occ ? occ.occStartISO : ev.start,
    date: occ ? occ.start : new Date(ev.start),
    color: labelColor(ev.labelId), title: ev.title || '(untitled)',
    sub: ev.notes && ev.notes.toLowerCase().includes(q) ? ev.notes
      : checklist && checklist.toLowerCase().includes(q) ? checklist : '',
  };
}
function searchTaskHits(q) {
  return DATA.tasks.filter((task) => (task.title || '').toLowerCase().includes(q))
    .map((task) => ({ kind: 'task', id: task.id, color: searchHitColor(task.labelId), title: task.title, sub: task.done ? 'done' : 'to do' }));
}
function searchCardHits(q) {
  const hits = [];
  DATA.boards.forEach((board) => board.lists.forEach((list) => list.cards.forEach((card) => {
    if (cardMatchesSearch(card, q)) hits.push({ kind: 'card', id: card.id, color: searchHitColor(card.labelId), title: card.title, sub: `${board.name} › ${list.name}` });
  })));
  return hits;
}
function cardMatchesSearch(card, q) {
  const checklist = card.checklist.map((item) => item.text).join(' · ');
  return `${card.title}\n${card.notes || ''}\n${checklist}\n${labelName(card.labelId)}`.toLowerCase().includes(q);
}
function searchNoteHits(q) {
  return DATA.notes.filter((note) => `${note.title}\n${note.body}`.toLowerCase().includes(q)).map((note) => noteSearchHit(note, q));
}
function noteSearchHit(note, q) {
  const line = note.body.split('\n').find((l) => l.toLowerCase().includes(q)) || '';
  return { kind: 'note', id: note.id, color: '#9aa4ac', title: note.title || 'Untitled',
    sub: line.trim() || folderPathText(note.folderId) || 'Notes' };
}
function searchRowHTML(hit, i, sel, q) {
  return `<button type="button" class="srch-row ${i === sel ? 'sel' : ''}" data-i="${i}">
          <span class="srch-bar" style="background:${hit.color};border-color:${shade(hit.color, -0.3)}"></span>
          <span class="srch-main">
            <span class="srch-title">${highlight(hit.title, q)}</span>
            <span class="srch-sub">${searchSubHTML(hit, q)}</span>
          </span>
          <span class="srch-badge">${hit.kind}</span>
        </button>`;
}
function searchSubHTML(hit, q) {
  if (hit.kind !== 'event') return escapeHtml(hit.sub);
  return searchWhenText(hit.date) + (hit.sub ? ' · ' + highlight(hit.sub, q) : '');
}
function searchWhenText(date) {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    + (date.getHours() || date.getMinutes() ? ' · ' + fmtTime(date) : '');
}
function openSearchHit(state, i) {
  const hit = state.rows[i]; if (!hit) return;
  closeModal();
  if (hit.kind === 'task') { openTaskModal(DATA.tasks.find((t) => t.id === hit.id)); return; }
  if (hit.kind === 'card') { openCardModal(hit.id); return; }
  if (hit.kind === 'note') { openNote(hit.id); return; }
  const ev = DATA.events.find((e) => e.id === hit.id); if (!ev) return;
  openEventHitInDayView(ev, hit);
}
function openEventHitInDayView(ev, hit) {
  anchor = new Date(hit.date);
  anchor.setHours(12, 0, 0, 0);
  miniMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  setView('day');
  openEventModal(ev, { occStartISO: hit.occIso });
}

const quickAdd = $('#quickAdd');
const qbPreview = $('#qbPreview');
let qbParsed = null;
let _qbTimer;
const normName = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function findByNormName(items, want) {
  return items.find((item) => normName(item.name) === want) || items.find((item) => normName(item.name).startsWith(want));
}
function resolveList(tok) {
  const [boardTok, listTok] = tok.includes('/') ? tok.split('/') : [null, tok];
  const want = normName(listTok);
  if (!want) return null;
  for (const board of quickBoardsFor(boardTok)) {
    const list = findByNormName(board.lists, want);
    if (list) return { board, list };
  }
  return null;
}
function quickBoardsFor(boardTok) {
  const cur = currentBoard();
  return boardTok ? DATA.boards.filter((b) => normName(b.name).startsWith(normName(boardTok)))
    : [cur, ...DATA.boards.filter((b) => b !== cur)].filter(Boolean);
}
function resolvePreset(tok) {
  const want = normName(tok);
  return want ? findByNormName(DATA.presets, want) : null;
}
function quickParse(text) {
  const q = { target: null, preset: null, err: null };
  const rest = takeQuickPresetToken(q, takeQuickListToken(q, ' ' + text + ' ')).trim();
  parseQuickWhen(q, rest);
  q.title = (q.p && q.p.title) || (q.preset ? q.preset.title || q.preset.name : '');
  if (!q.err && !q.title) q.err = 'Type a title';
  return q;
}
function takeQuickListToken(q, text) {
  const match = text.match(/\s>\s?(?:"([^"]+)"|([^\s#@!*>]+))/);
  if (!match) return text;
  q.target = resolveList(match[1] || match[2]);
  if (!q.target) q.err = `No board list matches “>${match[1] || match[2]}”`;
  return text.replace(match[0], ' ');
}
function takeQuickPresetToken(q, text) {
  const match = text.match(/\s\*(?:"([^"]+)"|([^\s#@!*>]+))/);
  if (!match) return text;
  q.preset = resolvePreset(match[1] || match[2]);
  if (!q.preset) q.err = q.err || `No preset matches “*${match[1] || match[2]}”`;
  return text.replace(match[0], ' ');
}
function parseQuickWhen(q, rest) {
  q.p = rest ? NLP.parse(rest, DATA.labels) : null;
  if (q.p || !rest || !q.preset) return;
  q.p = NLP.parse('_ ' + rest, DATA.labels);
  if (q.p) q.p.title = '';
}
function quickPreview(q) {
  if (q.err) return q.err;
  const p = q.p;
  const star = q.preset ? ` · preset ${q.preset.name}` : '';
  if (!q.target) return p ? (p.title ? p.preview : p.preview.replace('“”', `“${q.title}”`)) + star : `“${q.title}” · today${star}`;
  const when = p && p.timed ? ' · on the calendar ' + new Date(p.start).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : p && p.dated ? ' · due ' + new Date(p.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  return `Card “${q.title}” in ${q.target.board.name} › ${q.target.list.name}${when}${p && p.recurrence ? ' · repeats ' + p.recurrence.freq : ''}${star}`;
}
function quickCard(q) {
  const card = q.preset ? cardFromPreset(q.preset, q.title) : blankQuickCard(q.title);
  if (q.p) applyQuickCardParse(card, q.p, q.target);
  q.target.list.cards.push(card);
  setQuickCardDate(card, q.p);
  return card;
}
function blankQuickCard(title) {
  return { id: uid(), title, notes: '', labelId: null, checklist: [], reminders: [], duration: 60, eventId: null, createdAt: Date.now() };
}
function applyQuickCardParse(card, p, target) {
  if (p.labelId) card.labelId = p.labelId;
  if (p.reminders.length) card.reminders = p.reminders;
  if (p.durMin) card.duration = p.durMin;
  if (p.recurrence) { card.repeat = p.recurrence; card.homeListId = target.list.id; }
}
function setQuickCardDate(card, p) {
  if (p && p.timed) scheduleCard(card, new Date(p.start), false);
  else if (p && p.dated) card.due = p.start.slice(0, 10);
  else if (card.repeat) card.due = toLocalISO(nextRoutineDate(card.repeat, addDays(new Date(), -1)) || new Date()).slice(0, 10);
}
function quickEvent(q) {
  const ev = buildQuickEvent(q.p, q.preset, q.title);
  DATA.events.push(ev);
  return ev;
}
function buildQuickEvent(p, pre, title) {
  const start = p ? new Date(p.start) : clampDay(new Date());
  return {
    id: uid(), title, notes: pre ? pre.notes || '' : '',
    start: toLocalISO(start), end: toLocalISO(quickEventEnd(p, pre, start)), allDay: p ? p.allDay : true,
    labelId: (p && p.labelId) || (pre && pre.labelId) || null, reminders: quickEventReminders(p, pre),
    recurrence: (p && p.recurrence) || NO_REPEAT(),
    exdates: [], checklist: pre ? pre.checklist.map((text) => ({ id: uid(), text, done: false })) : [],
  };
}
function quickEventEnd(p, pre, start) {
  if (pre && p && p.timed && !p.durMin) return addMin(start, pre.duration);
  return p ? new Date(p.end) : new Date(toLocalISO(start).slice(0, 10) + 'T23:59');
}
function quickEventReminders(p, pre) {
  return p && p.reminders.length ? p.reminders : pre ? pre.reminders.map((m) => ({ minutes: m })) : [];
}

quickAdd.addEventListener('input', () => {
  clearTimeout(_qbTimer);
  _qbTimer = setTimeout(() => {
    qbParsed = quickAdd.value.trim() ? quickParse(quickAdd.value) : null;
    qbPreview.textContent = qbParsed ? quickPreview(qbParsed) : '';
    qbPreview.classList.toggle('bad', !!qbParsed && !!qbParsed.err);
  }, 140);
});
quickAdd.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (quickAdd.value.trim()) await submitQuickAdd();
});
async function submitQuickAdd() {
  const q = quickParse(quickAdd.value);
  if (q.err) { toast(quickErrorText(q.err), 'error'); return; }
  const msg = addQuickItem(q);
  clearQuickAdd();
  await commit();
  toast(msg, 'ok');
}
function quickErrorText(err) {
  return err === 'Type a title' ? 'Could not read that. Try “Lunch tomorrow 1pm 1h” or “Fix bug fri >todo”' : err;
}
function addQuickItem(q) {
  if (q.target) { quickCard(q); return `Card added to ${q.target.board.name} › ${q.target.list.name}: ${q.title}`; }
  quickEvent(q);
  return 'Added: ' + q.title;
}
function clearQuickAdd() {
  quickAdd.value = '';
  qbPreview.textContent = '';
  qbParsed = null;
}

let notifyTimer = null;

function refreshNotifyButton() {
  const btn = $('#notifyBtn');
  if (!('Notification' in window)) { btn.hidden = true; return; }
  btn.hidden = Notification.permission === 'granted';
  btn.classList.toggle('alert-off', Notification.permission !== 'granted');
}
$('#notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { toast('This browser has no Notification API', 'error'); return; }
  const res = await Notification.requestPermission();
  refreshNotifyButton();
  swSchedule();
  toast(res === 'granted' ? 'Desktop notifications enabled' : 'Blocked. Alerts inside PlanTim still work', res === 'granted' ? 'ok' : 'info');
});

function startNotifyLoop() {
  clearInterval(notifyTimer);
  scheduleTick();
  swSchedule();
  notifyTimer = setInterval(() => { scheduleTick(); }, 30000);
}

function reminderBody(ev, occ, mins) {
  return `${ev.title || 'Event'} ${leadText(mins)} · ${occ.allDay ? 'today' : fmtTime(occ.start)}`;
}
function digestBody() {
  const now = new Date();
  const dayStart = clampDay(now);
  const list = occurrencesBetween(dayStart, addDays(dayStart, 1)).filter((o) => o.end > now);
  const cards = digestCardsText();
  if (!list.length) return 'Nothing scheduled today.' + cards;
  return digestEventsText(list) + cards;
}
function digestCardsText() {
  const dues = openCards().map(([card]) => dueInfo(card, false)).filter(Boolean);
  const late = dues.filter((d) => d.diff < 0).length, today = dues.filter((d) => d.diff === 0).length;
  return (today ? ` ${today} card${today > 1 ? 's' : ''} due today.` : '') + (late ? ` ${late} overdue.` : '');
}
function digestEventsText(list) {
  const first = list[0];
  const names = list.slice(0, 3).map((o) => o.event.title).join(', ');
  return `${list.length} event${list.length > 1 ? 's' : ''} today. First: ${first.allDay ? names : fmtTime(first.start) + ' ' + first.event.title}.`;
}
function digestTimeOn(day) {
  const [h, m] = (DATA.settings.digestTime || '08:00').split(':').map(Number);
  const at = new Date(day);
  at.setHours(h, m, 0, 0);
  return at;
}
function nextDigestAt() {
  if (!DATA.settings.digest) return null;
  const now = new Date();
  let at = digestTimeOn(now);
  if (+at <= +now) at = addDays(at, 1);
  return +at;
}

function eachEventReminder(from, to, visit) {
  for (const ev of DATA.events) {
    if (!ev.reminders || !ev.reminders.length) continue;
    for (const occ of Recurrence.expand(ev, from, to)) {
      for (const r of ev.reminders) visit(ev, occ, r.minutes);
    }
  }
}
function scheduleTick() {
  if (!CryptoBox.isUnlocked()) return;
  const now = new Date();
  const horizon = new Date(+now + 26 * 3600000);
  eachEventReminder(new Date(+now - 3 * 3600000), horizon, (ev, occ, minutes) => checkReminderDue(ev, occ, minutes, now));
  maybeDigest(now);
}
function checkReminderDue(ev, occ, minutes, now) {
  const triggerTs = +occ.start - minutes * 60000;
  const key = occ.id + '@' + minutes;
  if (triggerTs <= +now && +occ.start > +now - 30 * 60000 && !notifiedKeys.has(key)) {
    notifiedKeys.add(key);
    saveNotified();
    fireAlert(ev, occ, minutes, key);
  }
}

function maybeDigest(now) {
  if (!DATA.settings.digest) return;
  const key = now.toDateString();
  if (+now >= +digestTimeOn(now) && DATA.settings.lastDigest !== key) sendDigest(key);
}
function sendDigest(key) {
  DATA.settings.lastDigest = key;
  saveData();
  const body = digestBody();
  showNotif('PlanTim today', body, 'digest-' + key);
  toast(body, 'info', 20000);
}

function showNotif(title, body, tag) {
  if ('Notification' in window && Notification.permission === 'granted') {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'notify', item: { title, body, key: tag } });
    } else {
      try { new Notification(title, { body, tag }); } catch (_) { }
    }
  }
}

function reminderToastActions(ev, occ) {
  return [
    { text: 'Open', act: () => openEventModal(DATA.events.find((x) => x.id === ev.id), { occStartISO: occ.occStartISO }) },
    { text: 'Snooze 10m', act: () => snooze(ev, occ, 10) },
  ];
}
function fireAlert(ev, occ, mins, key) {
  const body = reminderBody(ev, occ, mins);
  showNotif('PlanTim', body, key);
  toast(body, 'remind', 16000, null, reminderToastActions(ev, occ));
}
function snooze(ev, occ, minutes) {
  toast(`Snoozed “${ev.title}” for ${minutes} min`, 'ok', 4000);
  setTimeout(() => showSnoozedReminder(ev, occ), minutes * 60000);
}
function showSnoozedReminder(ev, occ) {
  showNotif('PlanTim', `${ev.title} (snoozed) · ${fmtTime(occ.start)}`, occ.id + '@snooze' + Date.now());
  toast(`${ev.title} · ${fmtTime(occ.start)}`, 'remind', 16000, null, reminderToastActions(ev, occ));
}

async function registerSW() {
  if (Demo.active || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    swSchedule();
  } catch (e) { console.warn('SW registration failed', e); }
}
function reminderItems(days) {
  const now = Date.now();
  const items = upcomingReminderItems(now, now + days * 86400000);
  addDigestItem(items, now);
  return items.sort((a, b) => a.at - b.at).slice(0, 400);
}
function upcomingReminderItems(now, horizon) {
  const items = [];
  eachEventReminder(new Date(now), new Date(horizon), (ev, occ, minutes) => {
    const at = +occ.start - minutes * 60000;
    if (at > now && at <= horizon) items.push(reminderItem(ev, occ, minutes, at));
  });
  return items;
}
function reminderItem(ev, occ, minutes, at) {
  return { key: occ.id + '@' + minutes, at, title: 'PlanTim', body: reminderBody(ev, occ, minutes),
    generic: 'Reminder · ' + (occ.allDay ? occ.start.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : fmtTime(occ.start)) };
}
function addDigestItem(items, now) {
  const digestAt = nextDigestAt();
  if (digestAt && digestAt > now && digestAt <= now + 86400000) {
    items.push({ key: 'digest@' + new Date(digestAt).toDateString(), at: digestAt, title: 'PlanTim today', body: digestBody(), generic: 'Your day in PlanTim' });
  }
}
function swSchedule() {
  pushScheduleSoon();
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  navigator.serviceWorker.controller.postMessage({ type: 'schedule', items: reminderItems(7) });
}

let _pushSchedTimer = 0;
function pushScheduleSoon() {
  clearTimeout(_pushSchedTimer);
  _pushSchedTimer = setTimeout(pushScheduleNow, 2500);
}
async function pushScheduleNow() {
  if (!CryptoBox.isUnlocked() || !Sync.isLoggedIn() || !Sync.pushKey() || !Sync.pushSubs()) return;
  const items = reminderItems(7).map((i) => ({ key: i.key, at: i.at, title: 'PlanTim', body: i.generic }));
  try { await Sync.pushSchedule(items); } catch (_) { }
}
const b64uBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function swReady() {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 4000))]);
}
async function pushSubscription() {
  if (!('PushManager' in window)) return null;
  const reg = await swReady();
  return reg ? reg.pushManager.getSubscription() : null;
}
async function enablePush() {
  assertPushAvailable();
  const reg = await readyPushRegistration();
  const sub = await matchingPushSubscription(reg, b64uBytes(Sync.pushKey()));
  await Sync.pushSubscribe(sub.toJSON());
  refreshNotifyButton();
  swSchedule();
  await pushScheduleNow();
}
function assertPushAvailable() {
  if (!('PushManager' in window)) throw new Error('This browser has no push support. On iPhone, install PlanTim to the home screen first.');
  if (!Sync.isLoggedIn() || !Sync.pushKey()) throw new Error('Push needs the sync server, and this server can’t send pushes.');
}
async function readyPushRegistration() {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are blocked for this site.');
  const reg = await swReady();
  if (!reg) throw new Error('The service worker isn’t running yet. Reload and try again.');
  return reg;
}
async function matchingPushSubscription(reg, key) {
  let sub = await reg.pushManager.getSubscription();
  if (sub && !pushKeyMatches(sub, key)) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  return sub;
}
function pushKeyMatches(sub, key) {
  return sub.options.applicationServerKey
    && new Uint8Array(sub.options.applicationServerKey).every((b, i) => b === key[i]);
}
async function disablePush() {
  const sub = await pushSubscription();
  if (!sub) return;
  try { await Sync.pushUnsubscribe(sub.endpoint); } catch (_) { }
  await sub.unsubscribe();
}
async function refreshPush() {
  try {
    const sub = await pushSubscription();
    if (sub && Sync.isLoggedIn() && Sync.pushKey()) await Sync.pushSubscribe(sub.toJSON());
  } catch (_) { }
  pushScheduleSoon();
}

const toastStack = $('#toastStack');
function toast(msg, kind = 'info', ttl = 6000, onClick, actions) {
  const el = createToastElement(msg, kind);
  addToastActions(el, actions);
  if (onClick) { el.classList.add('clickable'); el.addEventListener('click', () => { onClick(); el.remove(); }); }
  toastStack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  if (ttl) setTimeout(() => dismissToast(el), ttl);
}
function createToastElement(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast t-' + kind;
  el.innerHTML = `<span class="toast-ico"></span>
    <div class="toast-main"><span class="toast-msg">${escapeHtml(msg)}</span>
      <div class="toast-actions"></div></div>
    <button class="toast-x" type="button" aria-label="Dismiss">${ic('x')}</button>`;
  el.querySelector('.toast-x').addEventListener('click', (e) => { e.stopPropagation(); el.remove(); });
  return el;
}
function addToastActions(el, actions) {
  const actHost = el.querySelector('.toast-actions');
  (actions || []).forEach((action) => actHost.appendChild(toastActionButton(el, action)));
}
function toastActionButton(el, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toast-act';
  button.textContent = action.text;
  button.addEventListener('click', (e) => { e.stopPropagation(); action.act(); el.remove(); });
  return button;
}
function dismissToast(el) {
  el.classList.remove('in');
  setTimeout(() => el.remove(), 250);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const APP_GLYPHS = ['★', '✉', '☁', '♫', '⚙', '✎', '☎', '⌂', '✈', '☕', '⚡', '♥', '☀', '✓', '⚑', '⌘', '∞', '§', '♞', '☰',
  '📧', '📅', '📁', '💬', '📊', '🛒', '💼', '🏠', '🔧', '📝', '🎵', '🎮', '📰', '🧾', '🗺️', '🤖'];
const APP_INKS = ['#ffffff', '#242424', '#fff3bf', '#d0ebff', '#d3f9d8', '#ffe3e3'];
let _appShown = '';

const appById = (id) => DATA.apps.find((a) => a.id === id);
const hexOr = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
function appUrl(raw) {
  let v = String(raw || '').trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname ? u.href : null; } catch (_) { return null; }
}
const appHost = (a) => { try { return new URL(a.url).host; } catch (_) { return ''; } };
function graphemes(s) {
  return typeof Intl !== 'undefined' && Intl.Segmenter
    ? [...new Intl.Segmenter().segment(String(s))].map((x) => x.segment) : Array.from(String(s));
}
function appIconHTML(a) {
  const i = a.icon || {};
  if (i.type === 'image' && /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(i.data || '')) {
    return `<span class="ap-ico img"><img src="${i.data}" alt="" draggable="false" /></span>`;
  }
  const ch = graphemes(i.char || (a.name || '?').trim().charAt(0).toUpperCase() || '?').slice(0, 2).join('');
  return `<span class="ap-ico ${graphemes(ch).length > 1 ? 'two' : ''}" style="background:${hexOr(i.bg, '#4263eb')};color:${hexOr(i.fg, '#ffffff')}">${escapeHtml(ch)}</span>`;
}

function renderSideApps() {
  const host = $('#sideApps');
  if (!DATA.apps.length) { host.innerHTML = '<p class="empty">Pin the sites you use most. They open right here.</p>'; return; }
  host.innerHTML = DATA.apps.map((a) => `<button type="button" class="ap-tile sm ${view === 'apps' && a.id === openAppId ? 'sel' : ''}"
      data-app-open="${a.id}" title="${escapeHtml(a.name)}${a.newTab ? ' (opens in a new tab)' : ''}">${appIconHTML(a)}<span>${escapeHtml(a.name)}</span></button>`).join('');
}

function renderApps() {
  const cal = $('#calendar');
  const a = appById(openAppId);
  if (!a) { renderAppLauncher(cal); return; }
  const head = `${appIconHTML(a)}<b>${escapeHtml(a.name)}</b><small>${escapeHtml(appHost(a))}</small>`;
  if (_appShown === a.id + '|' + a.url && $('.ap-frame', cal)) { $('.ap-title', cal).innerHTML = head; return; }
  _appShown = a.id + '|' + a.url;
  cal.className = 'calendar ap-view';
  cal.innerHTML = appFrameHTML(a, head);
}
function renderAppLauncher(cal) {
  openAppId = null;
  _appShown = '';
  cal.className = 'calendar ap-view';
  cal.innerHTML = appLauncherHTML();
}
function appLauncherHTML() {
  return `<div class="ap-launch">
        <div class="ap-grid">${DATA.apps.map(appLauncherCellHTML).join('')}
          <div class="ap-cell"><button type="button" class="ap-tile add" data-app-new><span class="ap-ico add">${ic('plus')}</span><span>Add app</span></button></div>
        </div>
        ${appLauncherNoteHTML()}
      </div>`;
}
function appLauncherCellHTML(app) {
  return `
          <div class="ap-cell">
            <button type="button" class="ap-tile" data-app-open="${app.id}" title="${escapeHtml(appHost(app))}">${appIconHTML(app)}<span>${escapeHtml(app.name)}</span></button>
            <button type="button" class="ap-edit" data-app-edit="${app.id}" title="Edit">${ic('edit')}</button>
          </div>`;
}
function appLauncherNoteHTML() {
  return DATA.apps.length ? '<p class="ap-note">Right-click an app (or use its pencil) to edit it.</p>'
    : '<p class="ap-note">Paste a link to a site you use every day and give it an icon. It opens inside PlanTim, next to your calendar.</p>';
}
function appFrameHTML(a, head) {
  return `
    ${appHeadBarHTML(a, head)}
    ${appIframeHTML(a)}`;
}
function appHeadBarHTML(a, head) {
  return `<div class="ap-head">
      <button type="button" class="btn-secondary" data-app-home>${ic('chevL')}All apps</button>
      <span class="ap-title">${head}</span>
      <span class="spacer"></span>
      <button type="button" class="icon-btn" data-app-reload title="Reload">${ic('repeat')}</button>
      <button type="button" class="icon-btn" data-app-edit="${a.id}" title="Edit app">${ic('edit')}</button>
      <button type="button" class="btn-secondary" data-app-ext="${a.id}">Open in new tab</button>
    </div>`;
}
function appIframeHTML(a) {
  return `<iframe class="ap-frame" src="${escapeHtml(a.url)}" title="${escapeHtml(a.name)}" referrerpolicy="strict-origin-when-cross-origin"
      allow="clipboard-read; clipboard-write; fullscreen; camera; microphone; geolocation" allowfullscreen></iframe>
    <p class="ap-tip">Blank or “refused to connect”? Some sites (Google, Microsoft 365, banks) don't allow being shown inside
      another app. Use <b>Open in new tab</b>, or tick “Always open in a new tab” in this app's settings.</p>`;
}

function openApp(id) {
  const a = appById(id); if (!a) return;
  if (a.newTab) { window.open(a.url, '_blank', 'noopener'); return; }
  openAppId = id;
  if (gadgetMode) setGadget(false);
  setView('apps');
}

async function shrinkIcon(file) {
  const src = URL.createObjectURL(file);
  try {
    return drawIconPng(await loadIconImage(src));
  } finally { URL.revokeObjectURL(src); }
}
function loadIconImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function drawIconPng(img) {
  const size = 128, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const w = img.naturalWidth || size, hgt = img.naturalHeight || size, k = Math.min(size / w, size / hgt);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (size - w * k) / 2, (size - hgt * k) / 2, w * k, hgt * k);
  return canvas.toDataURL('image/png');
}

function openAppModal(app) {
  const ed = appEditorState(app);
  openModal(ed.editing ? 'Edit app' : 'Add app');
  modalBody.innerHTML = appFormHTML(ed);
  bindAppIconPickers(ed);
  bindAppFormFields(ed);
  bindAppFormActions(ed);
  refreshAppEditor(ed);
}
function appEditorState(app) {
  const icon = Object.assign({ type: 'glyph', char: '', bg: PALETTE[Math.floor(Math.random() * PALETTE.length)], fg: '#ffffff' },
    app ? app.icon : {});
  const mode = icon.type === 'image' && icon.data ? 'image' : 'glyph';
  return { app, editing: !!app, icon, mode, img: mode === 'image' ? icon.data : null,
    bg: hexOr(icon.bg, PALETTE[6]), fg: hexOr(icon.fg, '#ffffff') };
}
function appFormHTML(ed) {
  return `
    <form id="apForm" class="form">
      ${appFormTopHTML(ed.app)}
      ${appFormOptionsHTML(ed.app)}
      ${appGlyphPanelHTML(ed)}
      ${appImagePanelHTML()}
      ${appFormActionsHTML(ed.editing)}
    </form>`;
}
function appFormTopHTML(app) {
  return `<div class="ap-ed-top">
        <div class="ap-preview" id="ap-preview" title="Drop an image here"></div>
        ${appFormFieldsHTML(app)}
      </div>`;
}
function appFormFieldsHTML(app) {
  return `<div class="ap-ed-fields">
          <label class="f-row"><span>Link</span>
            <input class="field" id="ap-url" value="${escapeHtml(app ? app.url : '')}" placeholder="Paste a link, e.g. https://github.com" inputmode="url" spellcheck="false" autofocus /></label>
          <label class="f-row"><span>Name</span>
            <input class="field" id="ap-name" value="${escapeHtml(app ? app.name : '')}" maxlength="30" placeholder="Taken from the link if left empty" /></label>
        </div>`;
}
function appFormOptionsHTML(app) {
  return `<label class="f-check"><input type="checkbox" id="ap-newtab" ${app && app.newTab ? 'checked' : ''} />
        Always open in a new tab (for sites that refuse to load inside PlanTim)</label>
      <div class="f-row"><span>Icon</span>
        <div class="seg ap-mode" id="ap-mode"><button type="button" data-mode="glyph">Character</button><button type="button" data-mode="image">Image</button></div></div>`;
}
function appGlyphPanelHTML(ed) {
  return `<div class="ap-sub" id="ap-glyph">
        <div class="f-inline"><input class="field ap-char" id="ap-char" value="${escapeHtml(ed.icon.char || '')}" maxlength="12" placeholder="Auto" />
          <span class="set-note">Any letter, symbol or emoji, or pick one:</span></div>
        <div class="ap-glyphs" id="ap-glyphs">${APP_GLYPHS.map((g) => `<button type="button" class="ap-g" data-g="${g}">${g}</button>`).join('')}</div>
        ${appColorRowHTML('Background', 'ap-bg', PALETTE, 'nl-sw', ed.bg)}
        ${appColorRowHTML('Symbol colour', 'ap-fg', APP_INKS, 'nl-sw ink', ed.fg)}
      </div>`;
}
function appColorRowHTML(label, id, colors, swatchClass, value) {
  return `<div class="f-row"><span>${label}</span><div class="ap-colors" id="${id}">${colors.map((c) =>
          `<button type="button" class="${swatchClass}" data-c="${c}" style="background:${c}"></button>`).join('')}
          <label class="ap-custom" title="Any colour"><input type="color" id="${id}-any" value="${value}" /></label></div></div>`;
}
function appImagePanelHTML() {
  return `<div class="ap-sub" id="ap-image">
        <div class="f-inline"><button type="button" class="btn-secondary" id="ap-upload">Upload image…</button>
          <span class="set-note" id="ap-img-note">PNG, JPG, SVG, WebP or ICO. It's shrunk to a small icon and synced with your data.</span></div>
        <input type="file" id="ap-file" accept="image/*,.ico" hidden />
      </div>`;
}
function appFormActionsHTML(editing) {
  return `<div class="form-actions">
        ${editing ? '<button type="button" class="btn-secondary danger" id="ap-delete">Delete</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn-secondary" id="ap-cancel">Cancel</button>
        <button type="submit" class="btn-primary">${editing ? 'Save' : 'Add app'}</button>
      </div>`;
}
function appAutoName() {
  const url = appUrl($('#ap-url').value);
  if (!url) return '';
  const parts = appHost({ url }).replace(/:\d+$/, '').split('.');
  let name = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  if (parts.length > 2 && name.length <= 3) name = parts[parts.length - 3];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function appEditorModel(ed) {
  return {
    name: $('#ap-name').value.trim() || appAutoName(),
    icon: ed.mode === 'image' && ed.img ? { type: 'image', data: ed.img }
      : { type: 'glyph', char: graphemes($('#ap-char').value.trim()).slice(0, 2).join(''), bg: ed.bg, fg: ed.fg },
  };
}
function paintAppPreview(ed) {
  const model = appEditorModel(ed);
  $('#ap-preview').innerHTML = appIconHTML(model) + `<span>${escapeHtml(model.name || 'App')}</span>`;
}
function markSelectedSwatch(hostSel, color) {
  $$(hostSel + ' .nl-sw').forEach((b) => b.classList.toggle('sel', b.dataset.c === color));
}
function refreshAppEditor(ed) {
  paintAppPreview(ed);
  $$('#ap-mode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === ed.mode));
  $('#ap-glyph').hidden = ed.mode !== 'glyph';
  $('#ap-image').hidden = ed.mode !== 'image';
  markSelectedSwatch('#ap-bg', ed.bg);
  markSelectedSwatch('#ap-fg', ed.fg);
  $('#ap-upload').textContent = ed.img ? 'Replace image…' : 'Upload image…';
}
async function useAppIconFile(ed, file) {
  if (!file) return;
  try {
    ed.img = await shrinkIcon(file);
    ed.mode = 'image';
    $('#ap-img-note').textContent = 'Looks good. Save to keep it.';
  } catch (_) { $('#ap-img-note').textContent = 'That file could not be read as an image. Try a PNG or JPG.'; }
  refreshAppEditor(ed);
}
function bindAppIconPickers(ed) {
  $('#ap-mode').addEventListener('click', (e) => onAppModeClick(ed, e));
  $('#ap-glyphs').addEventListener('click', (e) => pickAppGlyph(ed, e));
  bindAppColorPicker(ed, 'bg');
  bindAppColorPicker(ed, 'fg');
}
function onAppModeClick(ed, e) {
  const button = e.target.closest('[data-mode]'); if (!button) return;
  ed.mode = button.dataset.mode;
  refreshAppEditor(ed);
  if (ed.mode === 'image' && !ed.img) $('#ap-file').click();
}
function pickAppGlyph(ed, e) {
  const button = e.target.closest('[data-g]'); if (!button) return;
  $('#ap-char').value = button.dataset.g;
  refreshAppEditor(ed);
}
function bindAppColorPicker(ed, key) {
  const anyInput = $(`#ap-${key}-any`);
  $(`#ap-${key}`).addEventListener('click', (e) => {
    const button = e.target.closest('[data-c]'); if (!button) return;
    ed[key] = button.dataset.c;
    anyInput.value = ed[key];
    refreshAppEditor(ed);
  });
  anyInput.addEventListener('input', (e) => { ed[key] = e.target.value; refreshAppEditor(ed); });
}
function bindAppFormFields(ed) {
  ['#ap-char', '#ap-name', '#ap-url'].forEach((sel) => $(sel).addEventListener('input', () => {
    $('#ap-url').classList.remove('bad');
    refreshAppEditor(ed);
  }));
  $('#ap-upload').addEventListener('click', () => $('#ap-file').click());
  $('#ap-file').addEventListener('change', (e) => useAppIconFile(ed, e.target.files[0]));
  bindAppIconDrop(ed, $('#ap-preview'));
}
function bindAppIconDrop(ed, preview) {
  preview.addEventListener('dragover', (e) => { e.preventDefault(); preview.classList.add('drop'); });
  preview.addEventListener('dragleave', () => preview.classList.remove('drop'));
  preview.addEventListener('drop', (e) => {
    e.preventDefault();
    preview.classList.remove('drop');
    useAppIconFile(ed, e.dataTransfer.files[0]);
  });
}
function bindAppFormActions(ed) {
  $('#ap-cancel').addEventListener('click', closeModal);
  if (ed.editing) $('#ap-delete').addEventListener('click', () => deleteAppAfterConfirm(ed.app));
  $('#apForm').addEventListener('submit', (e) => saveAppFromForm(ed, e));
}
async function deleteAppAfterConfirm(app) {
  const choice = await confirmDialog(`Remove “${app.name}” from your apps?`, [{ id: 'del', text: 'Remove', danger: true }, { id: 'no', text: 'Cancel' }]);
  if (choice !== 'del') return;
  DATA.apps = DATA.apps.filter((a) => a.id !== app.id);
  closeModal();
  await commit();
}
async function saveAppFromForm(ed, e) {
  e.preventDefault();
  const url = appUrl($('#ap-url').value);
  if (!url) { $('#ap-url').classList.add('bad'); $('#ap-url').focus(); return; }
  storeEditedApp(ed, url);
  closeModal();
  await commit();
}
function storeEditedApp(ed, url) {
  const model = appEditorModel(ed);
  const saved = { id: ed.editing ? ed.app.id : uid(), name: model.name || 'App', url, newTab: $('#ap-newtab').checked, icon: model.icon };
  if (ed.editing) DATA.apps[DATA.apps.findIndex((a) => a.id === ed.app.id)] = saved;
  else DATA.apps.push(saved);
}

let noteFolderSel = null;
let noteFilter = '';
let _noteTimer = null;

const noteById = (id) => DATA.notes.find((n) => n.id === id);
const folderById = (id) => DATA.noteFolders.find((f) => f.id === id);
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
function folderPath(id) {
  const out = [];
  for (let f = folderById(id); f && out.length < 50; f = folderById(f.parentId)) out.unshift(f);
  return out;
}
function folderPathText(id) {
  return folderPath(id).map((f) => f.name).join(' / ');
}
function folderDescendants(id) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    DATA.noteFolders.forEach((f) => { if (ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
  }
  return ids;
}
function firstFreeName(base, taken) {
  let name = base, i = 2;
  while (taken.has(name.toLowerCase())) name = `${base} ${i++}`;
  return name;
}
function uniqueNoteTitle(base, folderId) {
  const taken = new Set(DATA.notes.filter((n) => n.folderId === folderId).map((n) => n.title.toLowerCase()));
  return firstFreeName(base, taken);
}
const noteByTitle = (title) => {
  const t = title.trim().toLowerCase();
  return DATA.notes.find((n) => n.title.trim().toLowerCase() === t);
};

function mdInline(s) {
  const codes = [];
  s = escapeHtml(s).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = mdInlineFormat(s);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}
function mdInlineFormat(s) {
  return mdInlineLinks(s)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<i>$2</i>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');
}
function mdInlineLinks(s) {
  return s
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, mdWikiLinkHTML)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
function mdWikiLinkHTML(_, t, alias) {
  const n = noteByTitle(unescapeBasicHtml(t));
  return `<a href="#" class="nt-link ${n ? '' : 'new'}" data-nt-link="${t}" title="${n ? 'Open note' : 'Create this note'}">${alias || t}</a>`;
}
function unescapeBasicHtml(s) {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function mdToHtml(src, offset = 0) {
  const st = { lines: String(src || '').replace(/\r/g, '').split('\n'), out: [], para: [], list: null, quote: [], quoteAt: 0, offset, i: 0 };
  for (st.i = 0; st.i < st.lines.length; st.i++) mdBlockLine(st, st.lines[st.i]);
  mdFlush(st);
  return st.out.join('');
}
function mdBlockLine(st, ln) {
  let m;
  if (/^\s*```/.test(ln)) mdCodeBlock(st);
  else if (/^\s*>/.test(ln)) mdQuoteLine(st, ln);
  else if ((m = ln.match(/^(#{1,6})\s+(.*)$/))) mdHeading(st, m);
  else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(ln)) mdRule(st);
  else if ((m = ln.match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/))) mdListItem(st, m);
  else if (!ln.trim()) mdFlush(st);
  else mdParaLine(st, ln);
}
function mdFlushPara(st) {
  if (st.para.length) st.out.push(`<p>${st.para.map(mdInline).join('<br>')}</p>`);
  st.para = [];
}
function mdFlushList(st) {
  if (st.list) st.out.push(`<${st.list.tag}>${st.list.items.join('')}</${st.list.tag}>`);
  st.list = null;
}
function mdFlushQuote(st) {
  if (st.quote.length) st.out.push(`<blockquote>${mdToHtml(st.quote.join('\n'), st.quoteAt)}</blockquote>`);
  st.quote = [];
}
function mdFlush(st) {
  mdFlushPara(st);
  mdFlushList(st);
  mdFlushQuote(st);
}
function mdCodeBlock(st) {
  mdFlush(st);
  const body = [];
  while (++st.i < st.lines.length && !/^\s*```/.test(st.lines[st.i])) body.push(st.lines[st.i]);
  st.out.push(`<pre><code>${escapeHtml(body.join('\n'))}</code></pre>`);
}
function mdQuoteLine(st, ln) {
  mdFlushPara(st);
  mdFlushList(st);
  if (!st.quote.length) st.quoteAt = st.offset + st.i;
  st.quote.push(ln.replace(/^\s*> ?/, ''));
}
function mdHeading(st, m) {
  mdFlush(st);
  st.out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`);
}
function mdRule(st) {
  mdFlush(st);
  st.out.push('<hr>');
}
function mdListItem(st, m) {
  mdFlushPara(st);
  mdFlushQuote(st);
  const tag = m[1] ? 'ul' : 'ol';
  if (!st.list || st.list.tag !== tag) { mdFlushList(st); st.list = { tag, items: [] }; }
  st.list.items.push(mdListItemHTML(m[3], st.offset + st.i));
}
function mdListItemHTML(text, lineNo) {
  const task = text.match(/^\[([ xX])\]\s*(.*)$/);
  return task
    ? `<li class="nt-task"><input type="checkbox" data-nt-check="${lineNo}" ${task[1] !== ' ' ? 'checked' : ''} /><span>${mdInline(task[2])}</span></li>`
    : `<li>${mdInline(text)}</li>`;
}
function mdParaLine(st, ln) {
  mdFlushList(st);
  mdFlushQuote(st);
  st.para.push(ln);
}
function backlinks(note) {
  const t = note.title.trim().toLowerCase();
  if (!t) return [];
  const re = /\[\[([^\]|]+)/g;
  return DATA.notes.filter((n) => n.id !== note.id && [...(n.body || '').matchAll(re)].some((m) => m[1].trim().toLowerCase() === t));
}

function noteTreeHTML(parentId, depth) {
  const folders = DATA.noteFolders.filter((f) => f.parentId === parentId).sort((a, b) => byName(a.name, b.name));
  const notes = DATA.notes.filter((n) => n.folderId === parentId).sort((a, b) => byName(a.title || 'Untitled', b.title || 'Untitled'));
  return folders.map((f) => noteFolderRowHTML(f, depth)).join('') + notes.map((n) => noteRowHTML(n, depth)).join('');
}
function noteFolderRowHTML(f, depth) {
  const open = openFolders.has(f.id);
  return `<div class="nt-row nt-folder ${noteFolderSel === f.id ? 'cur' : ''}" data-nt-folder="${f.id}" draggable="true" tabindex="0" style="--d:${depth}">
        <span class="nt-chev ${open ? 'open' : ''}">${ic('chevR')}</span>${ic('folder')}<span class="nt-name">${escapeHtml(f.name)}</span>
        ${noteFolderActionsHTML(f.id)}</div>${open ? noteTreeHTML(f.id, depth + 1) : ''}`;
}
function noteFolderActionsHTML(id) {
  return `<span class="nt-acts">
          <button type="button" class="mini-btn" data-nt-new-in="${id}" title="New note in this folder">${ic('plus')}</button>
          <button type="button" class="mini-btn" data-nt-sub="${id}" title="New folder inside">${ic('folderPlus')}</button>
          <button type="button" class="mini-btn" data-nt-rename="${id}" title="Rename (F2)">${ic('edit')}</button>
          <button type="button" class="mini-btn" data-nt-del-folder="${id}" title="Delete folder">${ic('trash')}</button>
        </span>`;
}
function noteRowHTML(n, depth) {
  return `<div class="nt-row nt-note ${n.id === openNoteId ? 'sel' : ''}" data-nt-note="${n.id}" draggable="true" tabindex="0" style="--d:${depth}">
      <span class="nt-chev"></span>${ic('note')}<span class="nt-name">${escapeHtml(n.title || 'Untitled')}</span></div>`;
}
function noteFilterHTML() {
  const q = noteFilter.toLowerCase();
  const hits = DATA.notes.filter((n) => `${n.title}\n${n.body}`.toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
  if (!hits.length) return `<p class="empty">No notes match “${escapeHtml(noteFilter)}”.</p>`;
  return hits.map((n) => `<div class="nt-row nt-note ${n.id === openNoteId ? 'sel' : ''}" data-nt-note="${n.id}" tabindex="0" style="--d:0">
      ${ic('note')}<span class="nt-name">${highlight(n.title || 'Untitled', q)}<small>${escapeHtml(folderPathText(n.folderId) || 'Top level')}</small></span></div>`).join('');
}
function renderNoteTree() {
  const host = $('#ntTree'); if (!host) return;
  host.innerHTML = noteFilter ? noteFilterHTML()
    : (DATA.notes.length || DATA.noteFolders.length) ? noteTreeHTML(null, 0)
      : '<p class="empty">No notes yet. Make one with <b>New note</b>, or a folder to sort them into.</p>';
}

function renderNotes() {
  const cal = $('#calendar');
  const n = normalizeNoteSelection();
  const ed = $('.nt-main', cal);
  if (isNoteEditorCurrent(cal, ed)) refreshNoteView(ed, n);
  else buildNotesView(cal, n);
}
function normalizeNoteSelection() {
  const n = noteById(openNoteId);
  if (!n) openNoteId = null;
  if (noteFolderSel && !folderById(noteFolderSel)) noteFolderSel = null;
  return n;
}
function isNoteEditorCurrent(cal, ed) {
  return ed && cal.classList.contains('nt-view') && ed.dataset.note === (openNoteId || '') && ed.dataset.mode === noteMode;
}
function refreshNoteView(ed, n) {
  renderNoteTree();
  if (!n) return;
  if (!ed.contains(document.activeElement)) syncNoteFields(ed, n);
  if (noteMode === 'read') $('.nt-read', ed).innerHTML = noteReadHTML(n);
  $('.nt-crumbs', ed).innerHTML = noteCrumbs(n);
  $('.nt-foot', ed).innerHTML = noteFoot(n);
}
function syncNoteFields(ed, n) {
  const title = $('.nt-title', ed), body = $('.nt-body', ed);
  if (title && title.value !== n.title) title.value = n.title;
  if (body && body.value !== n.body) body.value = n.body;
}
function noteReadHTML(n) {
  return mdToHtml(n.body) || '<p class="empty">This note is empty.</p>';
}
function buildNotesView(cal, n) {
  cal.className = 'calendar nt-view';
  cal.innerHTML = notesLayoutHTML(n);
  renderNoteTree();
}
function notesLayoutHTML(n) {
  return `<div class="nt-wrap">
      ${notesSidebarHTML()}
      <section class="nt-main" data-note="${openNoteId || ''}" data-mode="${noteMode}">${n ? noteEditorHTML(n) : notesEmptyHTML()}</section>
    </div>`;
}
function notesSidebarHTML() {
  return `<aside class="nt-side">
        ${notesSidebarHeadHTML()}
        <input type="search" class="field nt-filter" id="ntFilter" placeholder="Filter notes" value="${escapeHtml(noteFilter)}" autocomplete="off" />
        <div class="nt-tree" id="ntTree" data-nt-root></div>
      </aside>`;
}
function notesSidebarHeadHTML() {
  return `<div class="nt-side-head">
          <button type="button" class="btn-primary" data-nt-new>${ic('plus')}New note</button>
          <span class="spacer"></span>
          <button type="button" class="icon-btn" data-nt-new-folder title="New folder">${ic('folderPlus')}</button>
          <button type="button" class="icon-btn" data-nt-collapse title="Collapse all folders">${ic('collapse')}</button>
        </div>`;
}
function notesEmptyHTML() {
  return `
        <div class="nt-empty">${ic('note')}
          <p>${DATA.notes.length ? 'Pick a note on the left, or start a new one.' : 'Your notes live here: markdown, sorted into folders.'}</p>
          <button type="button" class="btn-primary" data-nt-new>${ic('plus')}New note</button>
          <p class="nt-hint">Drag notes and folders to reorganise them. Link notes with <code>[[Note title]]</code>.
            <kbd>Ctrl</kbd>+<kbd>E</kbd> switches between editing and reading.</p>
        </div>`;
}
function noteCrumbs(n) {
  const path = folderPath(n.folderId);
  return path.length ? path.map((f) => `<button type="button" class="nt-crumb" data-nt-folder-open="${f.id}">${escapeHtml(f.name)}</button>`)
    .join('<span class="nt-sep">/</span>') : '<span class="nt-crumb top">Top level</span>';
}
function noteFoot(n) {
  const words = (n.body.match(/\S+/g) || []).length;
  const back = backlinks(n);
  return `<span>${words} word${words === 1 ? '' : 's'} · edited ${new Date(n.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
    ${back.length ? `<span class="nt-back">Linked from ${back.map((b) => `<a href="#" data-nt-open="${b.id}">${escapeHtml(b.title || 'Untitled')}</a>`).join(', ')}</span>` : ''}`;
}
function noteEditorHTML(n) {
  return `
    ${noteEditorHeadHTML(n)}
    ${noteEditorDocHTML(n)}
    <div class="nt-foot">${noteFoot(n)}</div>`;
}
function noteEditorHeadHTML(n) {
  return `<div class="nt-head">
      <span class="nt-crumbs">${noteCrumbs(n)}</span>
      <span class="spacer"></span>
      <div class="seg nt-mode"><button type="button" data-nt-mode="edit" class="${noteMode === 'edit' ? 'active' : ''}">Edit</button><button type="button" data-nt-mode="read" class="${noteMode === 'read' ? 'active' : ''}">Read</button></div>
      <button type="button" class="icon-btn" data-nt-del="${n.id}" title="Delete note">${ic('trash')}</button>
    </div>`;
}
function noteEditorDocHTML(n) {
  return `<div class="nt-doc">
      <input class="nt-title" value="${escapeHtml(n.title)}" placeholder="Untitled" maxlength="120" spellcheck="false" />
      ${noteMode === 'edit'
        ? `<textarea class="nt-body" placeholder="Start writing. Markdown works: # heading, **bold**, - [ ] to-do, [[Another note]]">${escapeHtml(n.body)}</textarea>`
        : `<div class="nt-read">${noteReadHTML(n)}</div>`}
    </div>`;
}

function openNote(id) {
  const n = noteById(id); if (!n) return;
  openNoteId = id;
  noteFolderSel = n.folderId;
  folderPath(n.folderId).forEach((f) => openFolders.add(f.id));
  if (gadgetMode) setGadget(false);
  if (view !== 'notes') setView('notes'); else render();
}
async function newNote(folderId, title) {
  flushNoteEdit();
  folderId = folderId && folderById(folderId) ? folderId : null;
  const n = createNote(folderId, title);
  noteMode = 'edit';
  noteFilter = '';
  openNote(n.id);
  await commit();
  requestAnimationFrame(() => focusNewNote(title));
}
function createNote(folderId, title) {
  const now = Date.now();
  const n = { id: uid(), title: title || uniqueNoteTitle('Untitled', folderId), body: '', folderId, created: now, updated: now };
  DATA.notes.push(n);
  return n;
}
function focusNewNote(title) {
  const titleInput = $('.nt-title'), body = $('.nt-body');
  if (titleInput && !title) { titleInput.focus(); titleInput.select(); } else if (body) body.focus();
}
async function newFolder(parentId) {
  parentId = parentId && folderById(parentId) ? parentId : null;
  const f = addNoteFolder(parentId);
  if (parentId) openFolders.add(parentId);
  noteFolderSel = f.id;
  noteFilter = '';
  await commit();
  requestAnimationFrame(() => requestAnimationFrame(() => renameFolderInline(f.id)));
}
function addNoteFolder(parentId) {
  const taken = new Set(DATA.noteFolders.filter((f) => f.parentId === parentId).map((f) => f.name.toLowerCase()));
  const f = { id: uid(), name: firstFreeName('New folder', taken), parentId };
  DATA.noteFolders.push(f);
  return f;
}
function renameFolderInline(id) {
  const row = $(`.nt-folder[data-nt-folder="${id}"]`), f = folderById(id);
  if (!row || !f) return;
  const input = showFolderRenameInput(row, f);
  row.draggable = false;
  input.focus();
  input.select();
  bindFolderRename(input, f);
}
function showFolderRenameInput(row, f) {
  const name = $('.nt-name', row);
  name.innerHTML = `<input class="field nt-rename" value="${escapeHtml(f.name)}" maxlength="60" />`;
  return $('input', name);
}
function bindFolderRename(input, f) {
  let done = false;
  const finish = (keep) => {
    if (done) return;
    done = true;
    return finishFolderRename(f, input.value.trim(), keep);
  };
  input.addEventListener('keydown', (e) => onFolderRenameKey(e, finish));
  input.addEventListener('blur', () => finish(true));
}
function onFolderRenameKey(e, finish) {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') finish(false);
}
async function finishFolderRename(f, value, keep) {
  if (keep && value && value !== f.name) {
    f.name = value;
    await commit();
  } else renderNoteTree();
}
function deleteConfirmButtons() {
  return [{ id: 'del', text: 'Delete', danger: true }, { id: 'no', text: 'Cancel' }];
}
function deleteFolderQuestion(f, count) {
  return count
    ? `Delete the folder “${f.name}” and the ${count} note${count === 1 ? '' : 's'} in it? Ctrl+Z brings it back.`
    : `Delete the empty folder “${f.name}”?`;
}
async function deleteFolder(id) {
  const f = folderById(id); if (!f) return;
  const ids = folderDescendants(id);
  const count = DATA.notes.filter((n) => ids.has(n.folderId)).length;
  const choice = await confirmDialog(deleteFolderQuestion(f, count), deleteConfirmButtons());
  if (choice !== 'del') return;
  flushNoteEdit();
  removeFoldersAndNotes(ids);
  await commit();
}
function removeFoldersAndNotes(ids) {
  DATA.noteFolders = DATA.noteFolders.filter((x) => !ids.has(x.id));
  DATA.notes = DATA.notes.filter((n) => !ids.has(n.folderId));
}
async function deleteNote(id) {
  const n = noteById(id); if (!n) return;
  flushNoteEdit();
  const choice = await confirmDialog(`Delete the note “${n.title || 'Untitled'}”? Ctrl+Z brings it back.`, deleteConfirmButtons());
  if (choice !== 'del') return;
  DATA.notes = DATA.notes.filter((x) => x.id !== id);
  if (openNoteId === id) openNoteId = null;
  await commit();
}
async function moveNoteItem(kind, id, folderId) {
  const moved = kind === 'note' ? moveNoteTo(id, folderId) : moveFolderTo(id, folderId);
  if (!moved) return;
  if (folderId) openFolders.add(folderId);
  flushNoteEdit();
  await commit();
}
function moveNoteTo(id, folderId) {
  const n = noteById(id); if (!n || n.folderId === folderId) return false;
  n.folderId = folderId;
  return true;
}
function moveFolderTo(id, folderId) {
  const f = folderById(id);
  if (!f || f.parentId === folderId || (folderId && folderDescendants(id).has(folderId))) return false;
  f.parentId = folderId;
  return true;
}
function flushNoteEdit() {
  if (!_noteTimer) return;
  clearTimeout(_noteTimer); _noteTimer = null;
  commit();
}
function noteEdited() {
  const note = noteById(openNoteId); if (!note) return;
  const titleEl = $('.nt-title'), bodyEl = $('.nt-body');
  if (titleEl) note.title = titleEl.value;
  if (bodyEl) note.body = bodyEl.value;
  note.updated = Date.now();
  clearTimeout(_noteTimer);
  _noteTimer = setTimeout(() => { _noteTimer = null; commit(); }, 700);
}
function setNoteMode(m) {
  if (m === noteMode) return;
  flushNoteEdit();
  noteMode = m;
  render();
  if (m === 'edit') requestAnimationFrame(() => requestAnimationFrame(focusNoteBody));
}
function focusNoteBody() {
  const bodyEl = $('.nt-body');
  if (bodyEl) bodyEl.focus();
}

function toggleSetMember(set, value) {
  set.has(value) ? set.delete(value) : set.add(value);
}
function isNotesEvent(e) {
  return view === 'notes' && e.target.closest && e.target.closest('.nt-view');
}
function decodeNoteLinkTitle(raw) {
  return raw.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}
function followNoteLink(el, e) {
  e.preventDefault();
  const title = decodeNoteLinkTitle(el.dataset.ntLink);
  const target = noteByTitle(title), current = noteById(openNoteId);
  flushNoteEdit();
  if (target) openNote(target.id); else newNote(current ? current.folderId : noteFolderSel, title);
}
async function toggleNoteCheck(el) {
  const note = noteById(openNoteId); if (!note) return;
  const lines = note.body.split('\n'), index = +el.dataset.ntCheck;
  if (lines[index] == null) return;
  lines[index] = lines[index].replace(/\[([ xX])\]/, (_, mark) => (mark === ' ' ? '[x]' : '[ ]'));
  note.body = lines.join('\n');
  note.updated = Date.now();
  await commit();
}
function revealNoteFolder(el) {
  const id = el.dataset.ntFolderOpen;
  folderPath(id).forEach((folder) => openFolders.add(folder.id));
  noteFolderSel = id; noteFilter = '';
  const filterInput = $('#ntFilter'); if (filterInput) filterInput.value = '';
  renderNoteTree(); savePrefs();
  const row = $(`[data-nt-folder="${id}"]`); if (row) row.scrollIntoView({ block: 'nearest' });
}
function toggleNoteFolder(el) {
  const id = el.dataset.ntFolder;
  toggleSetMember(openFolders, id);
  noteFolderSel = id;
  renderNoteTree(); savePrefs();
}
function collapseNoteFolders() {
  openFolders.clear();
  renderNoteTree();
  savePrefs();
}
function openNoteFromEl(id, e) {
  if (e) e.preventDefault();
  flushNoteEdit();
  openNote(id);
}
const NOTE_CLICK_ROUTES = [
  ['[data-nt-new]', () => newNote(noteFolderSel)],
  ['[data-nt-new-in]', (el) => newNote(el.dataset.ntNewIn)],
  ['[data-nt-new-folder]', () => newFolder(noteFolderSel)],
  ['[data-nt-sub]', (el) => newFolder(el.dataset.ntSub)],
  ['[data-nt-rename]', (el) => renameFolderInline(el.dataset.ntRename)],
  ['[data-nt-del-folder]', (el) => deleteFolder(el.dataset.ntDelFolder)],
  ['[data-nt-del]', (el) => deleteNote(el.dataset.ntDel)],
  ['[data-nt-mode]', (el) => setNoteMode(el.dataset.ntMode)],
  ['[data-nt-collapse]', collapseNoteFolders],
  ['[data-nt-open]', (el, e) => openNoteFromEl(el.dataset.ntOpen, e)],
  ['[data-nt-link]', followNoteLink],
  ['[data-nt-check]', toggleNoteCheck],
  ['[data-nt-folder-open]', revealNoteFolder],
  ['[data-nt-folder]', toggleNoteFolder],
  ['[data-nt-note]', (el) => openNoteFromEl(el.dataset.ntNote)],
  ['[data-nt-root]', () => { noteFolderSel = null; renderNoteTree(); }],
];
async function onNotesClick(e) {
  if (!isNotesEvent(e) || e.target.closest('.nt-rename')) return;
  for (const [selector, action] of NOTE_CLICK_ROUTES) {
    const el = e.target.closest(selector);
    if (el) return action(el, e);
  }
}
function onNotesDblClick(e) {
  const el = isNotesEvent(e) && e.target.closest('[data-nt-folder]');
  if (el && !e.target.closest('.nt-acts, .nt-rename')) renameFolderInline(el.dataset.ntFolder);
}
function onNotesInput(e) {
  if (!isNotesEvent(e)) return;
  if (e.target.matches('.nt-title, .nt-body')) { noteEdited(); return; }
  if (e.target.id === 'ntFilter') { noteFilter = e.target.value.trim(); renderNoteTree(); }
}
function focusNoteBodyStart(e) {
  e.preventDefault();
  const bodyEl = $('.nt-body'); if (bodyEl) { bodyEl.focus(); bodyEl.setSelectionRange(0, 0); }
}
function insertNoteIndent(e) {
  e.preventDefault();
  document.execCommand('insertText', false, '  ');
}
function isPlainTabKey(e) {
  return e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.shiftKey;
}
function handleNoteRowKey(e, row) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
  else if (e.key === 'F2' && row.dataset.ntFolder) { e.preventDefault(); renameFolderInline(row.dataset.ntFolder); }
  else if (e.key === 'Delete') row.dataset.ntFolder ? deleteFolder(row.dataset.ntFolder) : deleteNote(row.dataset.ntNote);
}
function onNotesKeydown(e) {
  if (!isNotesEvent(e)) return;
  const target = e.target;
  if (target.matches('.nt-title') && e.key === 'Enter') { focusNoteBodyStart(e); return; }
  if (target.matches('.nt-body') && isPlainTabKey(e)) { insertNoteIndent(e); return; }
  if (target.matches('.nt-row')) handleNoteRowKey(e, target);
}
function onNotesFocusOut(e) {
  if (isNotesEvent(e) && e.target.matches('.nt-title, .nt-body')) flushNoteEdit();
}

let noteDragItem = null;
function clearNoteDropMarks() {
  $$('.nt-view .drop').forEach((el) => el.classList.remove('drop'));
}
function onNoteDragStart(e) {
  const row = isNotesEvent(e) && e.target.closest('.nt-row[draggable="true"]'); if (!row) return;
  noteDragItem = row.dataset.ntNote ? { kind: 'note', id: row.dataset.ntNote } : { kind: 'folder', id: row.dataset.ntFolder };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', row.textContent.trim());
  row.classList.add('dragging');
}
function noteRowDropTarget(row) {
  const folderId = row.dataset.ntFolder || (noteById(row.dataset.ntNote) || {}).folderId || null;
  if (noteDragItem.kind === 'folder' && folderId && folderDescendants(noteDragItem.id).has(folderId)) return null;
  return { el: folderId ? $(`.nt-folder[data-nt-folder="${folderId}"]`) : $('#ntTree'), fid: folderId };
}
function noteDropTarget(e) {
  if (!noteDragItem || !isNotesEvent(e)) return null;
  const row = e.target.closest('.nt-row');
  if (row) return noteRowDropTarget(row);
  return e.target.closest('#ntTree') ? { el: $('#ntTree'), fid: null } : null;
}
function onNoteDragOver(e) {
  const drop = noteDropTarget(e); if (!drop) return;
  e.preventDefault();
  clearNoteDropMarks(); if (drop.el) drop.el.classList.add('drop');
}
function onNoteDrop(e) {
  const drop = noteDropTarget(e); if (!drop) return;
  e.preventDefault(); clearNoteDropMarks();
  const item = noteDragItem; noteDragItem = null;
  moveNoteItem(item.kind, item.id, drop.fid);
}
function onNoteDragEnd() {
  noteDragItem = null;
  clearNoteDropMarks();
  $$('.nt-row.dragging').forEach((el) => el.classList.remove('dragging'));
}
function onNotesEditShortcut(e) {
  if (view !== 'notes' || shell.hidden || !backdrop.hidden || gadgetMode) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'e' && openNoteId) {
    e.preventDefault(); setNoteMode(noteMode === 'edit' ? 'read' : 'edit');
  }
}
function bindNotesEditing(host) {
  host.addEventListener('click', onNotesClick);
  host.addEventListener('dblclick', onNotesDblClick);
  host.addEventListener('input', onNotesInput);
  host.addEventListener('keydown', onNotesKeydown);
  host.addEventListener('focusout', onNotesFocusOut);
}
function bindNotesDragDrop(host) {
  host.addEventListener('dragstart', onNoteDragStart);
  host.addEventListener('dragover', onNoteDragOver);
  host.addEventListener('drop', onNoteDrop);
  host.addEventListener('dragend', onNoteDragEnd);
}

(() => {
  const host = $('#calendar');
  bindNotesEditing(host);
  bindNotesDragDrop(host);
  document.addEventListener('keydown', onNotesEditShortcut);
})();

function setView(v) {
  if (!VIEW_META[v]) return;
  view = v;
  syncViewSeg();
  render();
}
$('#viewSeg').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-view]'); if (button) setView(button.dataset.view);
});
$('#todayBtn').addEventListener('click', () => { anchor = new Date(); miniMonth = clampDay(new Date()); render(); });
$('#prevBtn').addEventListener('click', () => shiftAnchor(-1));
$('#nextBtn').addEventListener('click', () => shiftAnchor(1));
function shiftAnchor(dir) {
  if (view === 'boards' || view === 'apps' || view === 'notes') return;
  anchor = anchorShiftedBy(dir);
  if (view === 'month') miniMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  render();
}
function anchorShiftedBy(dir) {
  if (view === 'day') return addDays(anchor, dir);
  if (view === '3day') return addDays(anchor, dir * 3);
  if (view === 'week' || view === 'workweek') return addDays(anchor, dir * 7);
  if (view === 'agenda') return addDays(anchor, dir * 14);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

function openSearchFromKey(e) {
  e.preventDefault();
  if (backdrop.hidden) openSearch();
}
function handleUndoRedoKey(e) {
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
}
document.addEventListener('keydown', (e) => {
  if (shell.hidden) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === 'f' || e.key === 'k')) { openSearchFromKey(e); return; }
  if (mod && !e.target.matches('input, textarea, select') && backdrop.hidden && confirmBackdrop.hidden) handleUndoRedoKey(e);
});

const CALENDAR_VIEW_KEYS = new Map([
  ['d', 'day'], ['w', 'week'], ['m', 'month'], ['a', 'agenda'], ['b', 'boards'], ['o', 'notes'],
]);
function isCalendarShortcutAllowed(e) {
  if (!backdrop.hidden || !confirmBackdrop.hidden || shell.hidden || gadgetMode) return false;
  if (e.target.matches('input, textarea, select')) return false;
  if (view === 'apps' || view === 'notes') return false;
  return !(e.ctrlKey || e.metaKey || e.altKey);
}
function handleCalendarShortcut(e) {
  const key = e.key;
  if (key === 't' || key === 'T') $('#todayBtn').click();
  else if (key === 'ArrowLeft') $('#prevBtn').click();
  else if (key === 'ArrowRight') $('#nextBtn').click();
  else if (CALENDAR_VIEW_KEYS.has(key)) setView(CALENDAR_VIEW_KEYS.get(key));
  else if (key === 'n' || key === 'c') { e.preventDefault(); openEventModal(null, null); }
  else if (key === '/') { e.preventDefault(); quickAdd.focus(); }
}
document.addEventListener('keydown', (e) => {
  if (isCalendarShortcutAllowed(e)) handleCalendarShortcut(e);
});

$('#newEventBtn').addEventListener('click', () => openEventModal(null, null));
$('#addLabelBtn').addEventListener('click', () => openLabelModal(null));
$('#gadgetBtn').addEventListener('click', () => setGadget(!gadgetMode));
$('#searchBtn').addEventListener('click', () => openSearch());
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);

$('#taskAddForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#taskAddInput').value.trim();
  if (!title) return;
  DATA.tasks.push({ id: uid(), title, done: false, labelId: null, createdAt: Date.now() });
  $('#taskAddInput').value = '';
  await commit();
});

function findTaskById(id) {
  return DATA.tasks.find((task) => task.id === id);
}
function parseOccurrence(el) {
  const [eid, iso] = el.dataset.occ.split('::');
  return { ev: DATA.events.find((x) => x.id === eid), iso };
}
function handleCardClick(target) {
  const cardEl = target.closest('[data-card]');
  if (cardEl) { openCardModal(cardEl.dataset.card); return true; }
  if (target.closest('[data-goto-boards]')) { setView('boards'); return true; }
  return false;
}
function handleAppLaunchClick(target) {
  const appOpen = target.closest('[data-app-open]');
  if (appOpen) { openApp(appOpen.dataset.appOpen); return true; }
  if (target.closest('[data-app-new]')) { openAppModal(null); return true; }
  const appEdit = target.closest('[data-app-edit]');
  if (!appEdit) return false;
  const app = appById(appEdit.dataset.appEdit);
  if (app) openAppModal(app);
  return true;
}
function handleAppToolbarClick(target) {
  if (target.closest('[data-app-home]')) { openAppId = null; render(); return true; }
  if (target.closest('[data-app-reload]')) { const frame = $('.ap-frame'); if (frame) frame.src = frame.src; return true; }
  const appExt = target.closest('[data-app-ext]');
  if (!appExt) return false;
  const app = appById(appExt.dataset.appExt);
  if (app) window.open(app.url, '_blank', 'noopener');
  return true;
}
function handleOccurrenceClick(target) {
  const occBtn = target.closest('[data-occ]');
  if (!occBtn) return false;
  const occ = parseOccurrence(occBtn);
  if (occ.ev) openEventModal(occ.ev, { occStartISO: occ.iso });
  return true;
}
function handleGotoClick(target) {
  const goto = target.closest('[data-goto]');
  if (!goto) return false;
  anchor = new Date(goto.dataset.goto + 'T12:00');
  miniMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  if (view === 'month' || view === 'agenda') setView('day'); else render();
  return true;
}
function handleSlotClick(target) {
  const slot = target.closest('.tg-slot');
  if (!slot) return false;
  openEventModal(null, { dateISO: slot.closest('[data-col-date]').dataset.colDate, hour: +slot.dataset.hour });
  return true;
}
function handleMonthCellClick(target) {
  const moCell = target.closest('.mo-cell');
  if (!moCell || target.closest('.chip') || target.closest('[data-goto]')) return false;
  openEventModal(null, { dateISO: moCell.dataset.colDate });
  return true;
}
function handleMiniCalClick(target) {
  const monthBtn = target.closest('[data-mc]');
  if (monthBtn) { stepMiniMonth(monthBtn.dataset.mc === 'prev' ? -1 : 1); return true; }
  const mcDay = target.closest('.mc-day');
  if (!mcDay) return false;
  anchor = new Date(mcDay.dataset.date + 'T12:00');
  render();
  return true;
}
function stepMiniMonth(dir) {
  miniMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth() + dir, 1);
  renderMiniCal();
}
function handleLabelClick(target) {
  const eye = target.closest('[data-eye]');
  if (eye) { toggleSetMember(hiddenLabels, eye.dataset.eye); savePrefs(); render(); return true; }
  const editLabel = target.closest('[data-edit-label]');
  if (!editLabel) return false;
  openLabelModal(labelById(editLabel.dataset.editLabel));
  return true;
}
function handleTaskClick(target) {
  const editTask = target.closest('[data-edit-task]');
  if (editTask) { openTaskModal(findTaskById(editTask.dataset.editTask)); return; }
  const delTask = target.closest('[data-del-task]');
  if (delTask) { DATA.tasks = DATA.tasks.filter((task) => task.id !== delTask.dataset.delTask); commit(); }
}
document.addEventListener('click', (e) => {
  if (Date.now() - dragCommittedAt < 350) return;
  const target = e.target;
  if (handleCardClick(target) || handleAppLaunchClick(target) || handleAppToolbarClick(target)) return;
  if (handleOccurrenceClick(target) || handleGotoClick(target)) return;
  if (handleSlotClick(target) || handleMonthCellClick(target) || handleMiniCalClick(target)) return;
  if (handleLabelClick(target)) return;
  handleTaskClick(target);
});
document.addEventListener('contextmenu', (e) => {
  const appEl = e.target.closest('[data-app-open]');
  if (appEl && appById(appEl.dataset.appOpen)) { e.preventDefault(); openAppModal(appById(appEl.dataset.appOpen)); }
});
document.addEventListener('change', (e) => {
  const checkbox = e.target.closest('[data-check]');
  if (!checkbox) return;
  const task = findTaskById(checkbox.dataset.check);
  if (task) { task.done = checkbox.checked; commit(); }
});

$('#lockBtn').addEventListener('click', () => lockNow());

const menuPop = $('#menuPopover');
$('#menuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  menuPop.style.top = rect.bottom + 6 + 'px';
  menuPop.style.right = (innerWidth - rect.right) + 'px';
  menuPop.hidden = !menuPop.hidden;
});
document.addEventListener('click', () => { menuPop.hidden = true; });

async function confirmYes(message, yesButton) {
  return (await confirmDialog(message, [{ id: 'y', ...yesButton }, { id: 'n', text: 'Cancel' }])) === 'y';
}
async function confirmSignOut() {
  const yes = await confirmYes('Sign out on this device? Other devices stay signed in until their session expires.',
    { text: 'Sign out' });
  if (yes) lockNow({ signOut: true });
}
const MENU_ACTIONS = {
  settings: openSettings,
  gadget: () => setGadget(!gadgetMode),
  'change-pw': changePasswordFlow,
  recovery: openRecoveryModal,
  presets: openPresetsModal,
  export: exportData,
  import: () => $('#importFile').click(),
  ics: () => $('#icsFile').click(),
  install: installApp,
  lock: () => lockNow(),
  signout: confirmSignOut,
};
menuPop.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-act]'); if (!button) return;
  MENU_ACTIONS[button.dataset.act]();
});

const CHANGE_PW_FORM_HTML = `
    <form id="pwForm" class="form">
      <label class="f-row"><span>Current password</span><input class="field" type="password" id="pw-old" autofocus /></label>
      <label class="f-row"><span>New password (min 6)</span><input class="field" type="password" id="pw-new" /></label>
      <div class="form-actions"><span class="spacer"></span>
        <button type="button" class="btn-secondary" id="pw-cancel">Cancel</button>
        <button type="submit" class="btn-primary">Change</button></div>
    </form>`;
async function changePasswordFlow() {
  closeModal();
  openModal('Change password');
  modalBody.innerHTML = CHANGE_PW_FORM_HTML;
  $('#pw-cancel').addEventListener('click', closeModal);
  $('#pwForm').addEventListener('submit', submitPasswordChange);
}
async function submitPasswordChange(e) {
  e.preventDefault();
  const oldPw = $('#pw-old').value, newPw = $('#pw-new').value;
  if (newPw.length < 6) { toast('New password too short', 'error'); return; }
  if (!(await CryptoBox.checkPassword(oldPw))) { toast('Current password was wrong', 'error'); return; }
  try { await applyPasswordChange(newPw); }
  catch (_) { toast('Could not change the password (no change was made on the server)', 'error'); }
}
async function applyPasswordChange(newPw) {
  const recRaw = await fetchRecoveryRaw();
  await rekeyTo(newPw, DATA, recRaw);
  _dirty = false;
  closeModal();
  toast(passwordChangedMessage(recRaw), 'ok', 8000);
}
async function fetchRecoveryRaw() {
  if (!(Sync.isOnline() && Sync.isLoggedIn())) return null;
  try { await Sync.pull(); } catch (_) { }
  const wrap = Sync.getRecoveryWrap();
  if (!wrap) return null;
  try { return await CryptoBox.openRecoveryWrap(wrap); } catch (_) { return null; }
}
function passwordChangedMessage(recRaw) {
  if (!Sync.isLoggedIn()) return 'Password changed on this device.';
  return 'Password changed. Other devices will need to sign in again.' + (recRaw ? ' Your recovery key still works.' : '');
}

const RECOVERY_NOTE_HTML = `<p class="set-note">If you forget your password, the recovery key lets you choose a new one
        <b>without losing any data</b>. It only works while you (with access to the server) have opened a
        reset window there, so someone who reads the code on GitHub or steals the key alone still can't use it.
        Keep the key offline: a password manager entry, or printed.</p>`;
function recoveryActionsHTML(has) {
  return `<div class="form-actions">
        ${has ? '<button type="button" class="btn-secondary danger" id="rec-remove">Remove</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn-secondary" id="rec-close">Close</button>
        <button type="button" class="btn-primary" id="rec-make">${has ? 'Replace key' : 'Create recovery key'}</button>
      </div>`;
}
function recoveryModalHTML(has) {
  return `
    <div class="form">
      <p class="rec-status ${has ? 'ok' : ''}">${has ? 'A recovery key is set up.' : 'No recovery key yet.'}</p>
      ${RECOVERY_NOTE_HTML}
      <div id="rec-out"></div>
      ${recoveryActionsHTML(has)}
    </div>`;
}
function ensureRecoveryServer() {
  if (Sync.isOnline() && Sync.isLoggedIn()) return true;
  toast('Recovery keys live on the sync server. Connect to it first.', 'info', 6000);
  return false;
}
async function openRecoveryModal() {
  closeModal();
  if (!ensureRecoveryServer()) return;
  await Sync.meta();
  openModal('Recovery key');
  const has = Sync.hasRecovery();
  modalBody.innerHTML = recoveryModalHTML(has);
  bindRecoveryButtons(has);
}
function bindRecoveryButtons(has) {
  $('#rec-close').addEventListener('click', closeModal);
  if (has) $('#rec-remove').addEventListener('click', removeRecoveryKey);
  $('#rec-make').addEventListener('click', () => makeRecoveryKey(has));
}
async function removeRecoveryKey() {
  const yes = await confirmYes('Remove the recovery key? A forgotten password will then mean lost data.',
    { text: 'Remove', danger: true });
  if (!yes) return;
  try { await Sync.setRecovery(null); closeModal(); toast('Recovery key removed', 'ok'); }
  catch (_) { toast('Could not reach the server', 'error'); }
}
function confirmReplaceRecovery() {
  return confirmYes('Make a new recovery key? The old one stops working.', { text: 'Replace', primary: true });
}
async function makeRecoveryKey(has) {
  if (has && !(await confirmReplaceRecovery())) return;
  const code = CryptoBox.newRecoveryCode();
  try {
    await Sync.setRecovery(await CryptoBox.sealRecovery(await CryptoBox.recoveryKeyFromCode(code)));
  } catch (_) { toast('Could not save it on the server', 'error'); return; }
  showNewRecoveryCode(code);
}
function showNewRecoveryCode(code) {
  $('.rec-status').textContent = 'A recovery key is set up.';
  $('.rec-status').classList.add('ok');
  $('#rec-make').hidden = true;
  $('#rec-out').innerHTML = `
      <div class="rec-code" id="rec-code">${code}</div>
      <p class="set-note">This is the only time it is shown. Save it now.</p>
      <button type="button" class="btn-secondary" id="rec-copy">Copy</button>`;
  $('#rec-copy').addEventListener('click', () => copyRecoveryCode(code));
}
async function copyRecoveryCode(code) {
  try { await navigator.clipboard.writeText(code); toast('Copied', 'ok', 2000); }
  catch (_) { toast('Select the key and copy it by hand', 'info'); }
}

function saveBlobAs(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
function exportData() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  saveBlobAs(blob, `plantim-backup-${toLocalISO(new Date()).slice(0, 10)}.json`);
  DATA.settings.lastExport = Date.now();
  saveData();
  toast('Exported (plain JSON, keep it somewhere safe)', 'info');
}
function parseBackupText(text) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.events) || !Array.isArray(parsed.labels)) throw new Error('bad');
  return parsed;
}
function confirmReplaceAllData() {
  return confirmYes('Replace all current PlanTim data with the imported file?', { text: 'Replace', danger: true });
}
async function importBackupFile(file) {
  const parsed = parseBackupText(await file.text());
  if (!(await confirmReplaceAllData())) return false;
  DATA = normalise(parsed);
  applyTheme(DATA.settings.theme);
  await commit();
  toast('Imported', 'ok');
  return true;
}
$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (!(await importBackupFile(file))) return;
  } catch (_) { toast('That file is not a PlanTim backup', 'error'); }
  e.target.value = '';
});

$('#icsFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let parsed;
  try { parsed = ICS.parse(await file.text()); } catch (_) { parsed = null; }
  if (!parsed || !parsed.events.length) { toast('No events found in that file', 'error'); return; }
  openIcsImport(file.name, parsed.events);
});
function isOldIcsEvent(ev, cutoff) {
  if (ev.recurrence.freq === 'none') return new Date(ev.end) < cutoff;
  return ev.recurrence.end.type === 'on' && new Date(ev.recurrence.end.on + 'T23:59') < cutoff;
}
function icsImportStats(events) {
  const cutoff = Date.now() - 60 * 86400000;
  const old = events.filter((ev) => isOldIcsEvent(ev, cutoff)).length;
  const rep = events.filter((ev) => ev.recurrence.freq !== 'none').length;
  const known = new Set(DATA.events.filter((x) => x.icsKey).map((x) => x.icsKey));
  const again = events.filter((ev) => known.has(ev.icsKey)).length;
  return { cutoff, old, rep, again };
}
function icsSummaryHTML(fileName, events, stats) {
  return `<p class="ics-sum"><b>${events.length}</b> event${events.length > 1 ? 's' : ''} in <b>${escapeHtml(fileName)}</b>${stats.rep ? ` (${stats.rep} repeating)` : ''}.
        ${stats.again ? `<br>${stats.again} were imported before and will be <b>updated</b>, not duplicated.` : ''}</p>`;
}
function icsSkipOldHTML(old) {
  return `<label class="f-check"><input type="checkbox" id="ics-skipold" checked /> Skip ${old} event${old > 1 ? 's' : ''} that ended more than 60 days ago</label>`;
}
const ICS_IMPORT_TAIL_HTML = `<p class="set-note">Reminders in the file aren't imported. Export from Outlook: File ▸ Save Calendar
        (or Outlook on the web: Settings ▸ Calendar ▸ Shared calendars ▸ Publish ▸ ICS). Google: Settings ▸ Import &amp; export ▸ Export.</p>
      <div class="form-actions"><span class="spacer"></span>
        <button type="button" class="btn-secondary" id="ics-cancel">Cancel</button>
        <button type="submit" class="btn-primary">Import</button></div>`;
function icsImportHTML(fileName, events, stats) {
  return `
    <form id="icsForm" class="form">
      ${icsSummaryHTML(fileName, events, stats)}
      ${stats.old ? icsSkipOldHTML(stats.old) : ''}
      ${icsLabelPickHTML()}
      ${ICS_IMPORT_TAIL_HTML}
    </form>`;
}
function icsLabelPickHTML() {
  return `<div class="f-row"><span>Label for imported events</span>
        <div class="label-pick" id="ics-pick">${labelPillsHTML('')}</div>
        <input type="hidden" id="ics-label" value="" /></div>`;
}
function openIcsImport(fileName, events) {
  const stats = icsImportStats(events);
  openModal('Import calendar');
  modalBody.innerHTML = icsImportHTML(fileName, events, stats);
  $('#ics-pick').addEventListener('click', pickIcsLabel);
  $('#ics-cancel').addEventListener('click', closeModal);
  $('#icsForm').addEventListener('submit', (e) => submitIcsImport(e, events, stats.cutoff));
}
function pickIcsLabel(e) {
  const pill = e.target.closest('.lp-pill'); if (!pill) return;
  $('#ics-label').value = pill.dataset.lid;
  $$('#ics-pick .lp-pill').forEach((p) => p.classList.toggle('sel', p === pill));
}
async function submitIcsImport(e, events, cutoff) {
  e.preventDefault();
  const skipOld = $('#ics-skipold') ? $('#ics-skipold').checked : false;
  const labelId = $('#ics-label').value || null;
  const { added, updated } = mergeIcsEvents(events, { labelId, skipOld, cutoff });
  closeModal();
  await commit();
  toast(`Imported ${added} new event${added === 1 ? '' : 's'}${updated ? `, updated ${updated}` : ''}`, 'ok', 6000);
}
function mergeIcsEvents(events, opts) {
  const byKey = new Map(DATA.events.filter((x) => x.icsKey).map((x) => [x.icsKey, x]));
  const counts = { added: 0, updated: 0 };
  for (const ev of events) {
    if (opts.skipOld && isOldIcsEvent(ev, opts.cutoff)) continue;
    counts[mergeIcsEvent(byKey.get(ev.icsKey), ev, opts.labelId)]++;
  }
  return counts;
}
function mergeIcsEvent(existing, ev, labelId) {
  if (!existing) {
    DATA.events.push({ id: uid(), ...ev, labelId, reminders: [], checklist: [] });
    return 'added';
  }
  Object.assign(existing, { title: ev.title, notes: ev.notes, start: ev.start, end: ev.end, allDay: ev.allDay,
    recurrence: ev.recurrence, exdates: ev.exdates });
  if (labelId) existing.labelId = labelId;
  return 'updated';
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && CryptoBox.isUnlocked()) { scheduleTick(); render(); syncNow(); }
});
addEventListener('focus', () => { if (CryptoBox.isUnlocked()) syncNow(); });

let drag = null;
const cal = $('#calendar');

cal.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const evEl = e.target.closest('.tg-event');
  const chipEl = e.target.closest('.mo-view .chip[data-occ]');
  const cardEl = e.target.closest('.bd-card');
  if (evEl) startEventDrag(e, evEl);
  else if (chipEl) startChipDrag(e, chipEl);
  else if (cardEl) startCardDrag(e, cardEl);
});

function trackPointer(move, up) {
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  addEventListener('blur', up);
}
function untrackPointer(move, up) {
  window.removeEventListener('pointermove', move);
  window.removeEventListener('pointerup', up);
  window.removeEventListener('pointercancel', up);
  removeEventListener('blur', up);
}

function startCardDrag(e, el) {
  e.preventDefault();
  const state = newCardDragState(e, el);
  state.move = (ev) => moveCardDrag(state, ev);
  state.up = () => endCardDrag(state);
  trackPointer(state.move, state.up);
}
function newCardDragState(e, el) {
  return {
    el, id: el.dataset.card, startX: e.clientX, startY: e.clientY, rect: el.getBoundingClientRect(),
    ghost: null, placeholder: null, overDay: null,
  };
}
function moveCardDrag(state, ev) {
  if (!state.ghost && !liftCard(state, ev)) return;
  state.ghost.style.left = ev.clientX - (state.startX - state.rect.left) + 'px';
  state.ghost.style.top = ev.clientY - (state.startY - state.rect.top) + 'px';
  clearCardDropDay(state);
  const under = document.elementFromPoint(ev.clientX, ev.clientY);
  if (markCardDropDay(state, under)) return;
  const list = under && under.closest('.bd-list[data-list]');
  if (list) placeCardPlaceholder(state, list, ev.clientY);
}
function liftCard(state, ev) {
  if (Math.abs(ev.clientX - state.startX) < 5 && Math.abs(ev.clientY - state.startY) < 5) return false;
  state.ghost = createCardGhost(state.el, state.rect);
  state.placeholder = createCardPlaceholder(state.el, state.rect);
  state.el.classList.add('bd-lifted');
  return true;
}
function createCardGhost(el, rect) {
  const ghost = el.cloneNode(true);
  ghost.classList.add('bd-ghost');
  ghost.style.width = rect.width + 'px';
  document.body.appendChild(ghost);
  return ghost;
}
function createCardPlaceholder(el, rect) {
  const placeholder = document.createElement('div');
  placeholder.className = 'bd-ph';
  placeholder.style.height = rect.height + 'px';
  el.after(placeholder);
  return placeholder;
}
function clearCardDropDay(state) {
  if (state.overDay) state.overDay.classList.remove('drop');
  state.overDay = null;
}
function markCardDropDay(state, under) {
  const day = under && under.closest('.mc-day');
  if (!day) return false;
  state.overDay = day;
  day.classList.add('drop');
  return true;
}
function placeCardPlaceholder(state, list, y) {
  const cards = $('.bd-cards', list);
  const after = [...cards.children].find((c) => c.classList.contains('bd-card') && c !== state.el
    && y < c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2);
  if (after) cards.insertBefore(state.placeholder, after); else cards.appendChild(state.placeholder);
}
async function endCardDrag(state) {
  untrackPointer(state.move, state.up);
  if (!state.ghost) return;
  dragCommittedAt = Date.now();
  state.ghost.remove();
  const day = state.overDay;
  clearCardDropDay(state);
  if (day) { await scheduleDroppedCard(state.id, day); return; }
  await reorderDroppedCard(state);
}
async function scheduleDroppedCard(id, day) {
  const found = findCard(id);
  if (!found) return;
  scheduleCard(found.card, new Date(day.dataset.date + 'T00:00'), true);
  await commit();
  toast(`Scheduled “${found.card.title}” on ${new Date(day.dataset.date + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`, 'ok');
}
async function reorderDroppedCard(state) {
  const cards = state.placeholder.parentElement;
  const siblings = [...cards.children];
  const nextEl = siblings.slice(siblings.indexOf(state.placeholder) + 1).find((c) => c.classList.contains('bd-card') && c !== state.el);
  const target = findList(cards.dataset.cards);
  const rest = target ? target.list.cards.filter((c) => c.id !== state.id) : [];
  const index = nextEl ? rest.findIndex((c) => c.id === nextEl.dataset.card) : rest.length;
  moveCard(state.id, cards.dataset.cards, index < 0 ? rest.length : index);
  await commit();
}

function dragLabel(el, s, en, copy) {
  let tip = el.querySelector('.drag-tip');
  if (!tip) { tip = document.createElement('span'); tip.className = 'drag-tip'; el.appendChild(tip); }
  tip.textContent = (copy ? 'copy · ' : '') + fmtTime(s) + ' to ' + fmtTime(en);
}

function startEventDrag(e, el) {
  const resize = !!e.target.closest('.tg-ev-resize');
  const occ = parseOccurrence(el);
  if (!occ.ev) return;
  drag = newEventDragState(e, el, occ, resize);
  try { el.setPointerCapture(e.pointerId); } catch (_) { }
  el.classList.add('dragging');
  trackPointer(onEventDragMove, onEventDragUp);
}
function newEventDragState(e, el, occ, resize) {
  const colRect = el.closest('.tg-col').getBoundingClientRect();
  return {
    kind: resize ? 'resize' : 'move', ev: occ.ev, iso: occ.iso, el,
    startX: e.clientX, startY: e.clientY,
    origStart: new Date(el.dataset.start), origEnd: new Date(el.dataset.end),
    baseTop: parseFloat(el.style.top) || 0, baseHeight: parseFloat(el.style.height) || HOUR_PX,
    colWidth: colRect.width, moved: false, dMin: 0, dDays: 0,
  };
}
function onEventDragMove(e) {
  if (!drag) return;
  const dy = e.clientY - drag.startY, dx = e.clientX - drag.startX;
  if (Math.abs(dy) > 3 || Math.abs(dx) > 3) drag.moved = true;
  drag.copy = drag.kind === 'move' && (e.ctrlKey || e.metaKey);
  drag.el.classList.toggle('copying', !!drag.copy);
  drag.dMin = Math.round(dy / HOUR_PX * 60 / SLOT_MIN) * SLOT_MIN;
  drag.dDays = (drag.kind === 'move' && curCols > 1) ? Math.round(dx / drag.colWidth) : 0;
  if (drag.kind === 'move') previewEventMove(drag); else previewEventResize(drag);
}
function previewEventMove(state) {
  state.el.style.top = (state.baseTop + state.dMin / 60 * HOUR_PX) + 'px';
  state.el.style.transform = `translateX(${state.dDays * state.colWidth}px)`;
  dragLabel(state.el, addMin(state.origStart, state.dMin), addMin(state.origEnd, state.dMin), state.copy);
}
function previewEventResize(state) {
  state.el.style.height = Math.max(HOUR_PX * SLOT_MIN / 60, state.baseHeight + state.dMin / 60 * HOUR_PX) + 'px';
  dragLabel(state.el, state.origStart, addMin(state.origEnd, Math.max(SLOT_MIN - (state.origEnd - state.origStart) / 60000, state.dMin)));
}
function releaseEventDrag() {
  untrackPointer(onEventDragMove, onEventDragUp);
  drag.el.classList.remove('dragging', 'copying');
  const finished = drag;
  drag = null;
  return finished;
}
function onEventDragUp() {
  if (!drag) return;
  const finished = releaseEventDrag();
  if (!finished.moved) { render(); return; }
  dragCommittedAt = Date.now();
  const range = eventDragRange(finished);
  placeDroppedEvent(finished, range.start, range.end, finished.kind === 'move' && finished.copy);
}
function eventDragRange(state) {
  if (state.kind === 'move') {
    return { start: shiftDateTime(state.origStart, state.dMin, state.dDays), end: shiftDateTime(state.origEnd, state.dMin, state.dDays) };
  }
  let end = addMin(state.origEnd, state.dMin);
  if (end - state.origStart < SLOT_MIN * 60000) end = new Date(+state.origStart + SLOT_MIN * 60000);
  return { start: state.origStart, end };
}
function placeDroppedEvent(state, start, end, copy) {
  if (copy) duplicateEventAt(state.ev, start, end);
  else applyReschedule(state.ev, state.iso, start, end);
}

function startChipDrag(e, el) {
  const occ = parseOccurrence(el);
  if (!occ.ev) return;
  drag = { kind: 'chip', ev: occ.ev, iso: occ.iso, el, startX: e.clientX, startY: e.clientY, moved: false };
  try { el.setPointerCapture(e.pointerId); } catch (_) { }
  trackPointer(onChipMove, onChipUp);
}
function clearMonthCellDrop() {
  $$('.mo-cell.drop').forEach((c) => c.classList.remove('drop'));
}
function highlightMonthCell(e) {
  clearMonthCellDrop();
  const cell = elCellUnder(e);
  if (cell) cell.classList.add('drop');
}
function onChipMove(e) {
  if (!drag) return;
  if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
  if (!drag.moved) return;
  drag.copy = e.ctrlKey || e.metaKey;
  drag.el.classList.add('dragging');
  drag.el.classList.toggle('copying', !!drag.copy);
  drag.el.style.transform = `translate(${e.clientX - drag.startX}px,${e.clientY - drag.startY}px)`;
  highlightMonthCell(e);
}
function onChipUp(e) {
  untrackPointer(onChipMove, onChipUp);
  clearMonthCellDrop();
  const finished = drag;
  drag = null;
  if (!finished || !finished.moved) { render(); return; }
  dragCommittedAt = Date.now();
  dropChipAt(finished, e);
}
function dropChipAt(state, e) {
  const cell = e && e.clientX != null ? elCellUnder(e) : null;
  if (!cell) { render(); return; }
  const occStart = new Date(state.iso);
  const dayDelta = Math.round((+new Date(cell.dataset.colDate + 'T00:00') - +clampDay(occStart)) / 86400000);
  if (!dayDelta && !state.copy) { render(); return; }
  const start = shiftDateTime(occStart, 0, dayDelta);
  const end = new Date(+start + (+new Date(state.ev.end) - +new Date(state.ev.start)));
  placeDroppedEvent(state, start, end, state.copy);
}
function elCellUnder(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  return el && el.closest ? el.closest('.mo-cell') : null;
}

function detachedEventCopy(ev, start, end) {
  const copy = JSON.parse(JSON.stringify(ev));
  Object.assign(copy, { id: uid(), start: toLocalISO(start), end: toLocalISO(end), recurrence: NO_REPEAT(), exdates: [] });
  delete copy.cardId;
  return copy;
}
async function duplicateEventAt(ev, ns, ne) {
  const copy = detachedEventCopy(ev, ns, ne);
  copy.checklist = (copy.checklist || []).map((item) => ({ id: uid(), text: item.text, done: false }));
  DATA.events.push(copy);
  await commit();
  toast('Duplicated “' + (ev.title || 'event') + '”', 'ok');
}

async function applyReschedule(ev, iso, newStart, newEnd) {
  const isSeries = ev.recurrence && ev.recurrence.freq !== 'none';
  if (!isSeries) Object.assign(ev, { start: toLocalISO(newStart), end: toLocalISO(newEnd) });
  else splitOccurrence(ev, iso, newStart, newEnd);
  await commit();
}
function splitOccurrence(ev, iso, newStart, newEnd) {
  if (iso && !ev.exdates.includes(iso)) ev.exdates.push(iso);
  DATA.events.push(detachedEventCopy(ev, newStart, newEnd));
  toast('Moved this occurrence (series unchanged)', 'info');
}

const DROP_SEL = '.tg-slot.drop, .mo-cell.drop, .mc-day.drop';
function sideDrag(e, title, onDrop) {
  e.preventDefault();
  const state = { ghost: createDragGhost(title), onDrop };
  state.move = (ev) => moveSideDrag(state.ghost, ev);
  state.up = (ev) => endSideDrag(state, ev);
  state.move(e);
  trackPointer(state.move, state.up);
}
function createDragGhost(title) {
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.textContent = title;
  document.body.appendChild(ghost);
  return ghost;
}
function clearSideDrop() {
  $$(DROP_SEL).forEach((el) => el.classList.remove('drop'));
}
function moveSideDrag(ghost, ev) {
  ghost.style.left = ev.clientX + 12 + 'px';
  ghost.style.top = ev.clientY + 8 + 'px';
  clearSideDrop();
  const target = targetUnder(ev);
  if (target) target.classList.add('drop');
}
async function endSideDrag(state, ev) {
  untrackPointer(state.move, state.up);
  state.ghost.remove();
  clearSideDrop();
  const target = ev && ev.clientX != null ? targetUnder(ev) : null;
  if (!target) return;
  dragCommittedAt = Date.now();
  const { start, allDay } = sideDropPoint(target);
  await state.onDrop(start, allDay);
}
function sideDropPoint(target) {
  if (!target.classList.contains('tg-slot')) {
    return { start: new Date((target.dataset.colDate || target.dataset.date) + 'T00:00'), allDay: true };
  }
  const start = new Date(target.closest('[data-col-date]').dataset.colDate + 'T00:00');
  start.setHours(0, Math.round(+target.dataset.hour * 60), 0, 0);
  return { start, allDay: false };
}
function eventFromTask(task, start, end, allDay) {
  return {
    id: uid(), title: task.title, notes: '',
    start: toLocalISO(start), end: toLocalISO(end), allDay,
    labelId: task.labelId || null, reminders: [],
    recurrence: NO_REPEAT(), exdates: [], checklist: [],
  };
}
async function scheduleTaskAt(task, start, allDay) {
  const end = allDay ? new Date(toLocalISO(start).slice(0, 10) + 'T23:59') : new Date(+start + 3600000);
  DATA.events.push(eventFromTask(task, start, end, allDay));
  DATA.tasks = DATA.tasks.filter((x) => x.id !== task.id);
  await commit();
  toast('Scheduled: ' + task.title, 'ok');
}
async function scheduleSideCard(card, start, allDay) {
  scheduleCard(card, start, allDay);
  await commit();
  toast('Scheduled: ' + card.title + ' (stays on the board)', 'ok');
}
$('#taskList').addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('[data-grip]');
  if (!grip) return;
  const task = findTaskById(grip.dataset.grip);
  if (!task) return;
  sideDrag(e, task.title, (start, allDay) => scheduleTaskAt(task, start, allDay));
});
$('#sideCards').addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('[data-card-grip]');
  if (!grip) return;
  const found = findCard(grip.dataset.cardGrip);
  if (!found) return;
  sideDrag(e, found.card.title, (start, allDay) => scheduleSideCard(found.card, start, allDay));
});
function targetUnder(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.closest) return null;
  return el.closest('.tg-slot') || el.closest('.mo-cell') || el.closest('.mc-day');
}

const PARTICLE_FRAME_MS = 1000 / 24;
const PARTICLE_RES_CAP = 1200;
const PARTICLE_THEMES = {
  red:   { color: 'rgba(255,255,255,0.85)', dir: 1,  dens: 44000, spd: 1.0, rMax: 2.4, sway: 0.6 },
  frost: { color: 'rgba(255,255,255,0.92)', dir: 1,  dens: 30000, spd: 1.15, rMax: 2.6, sway: 0.7 },
  blue:  { color: 'rgba(255,255,255,0.5)',  dir: -1, dens: 52000, spd: 0.5, rMax: 3.0, sway: 0.5 },
  green: { color: 'rgba(255,246,205,0.72)', dir: -1, dens: 50000, spd: 0.4, rMax: 1.9, sway: 1.0 },
  sunset: { color: 'rgba(255,196,120,0.7)', dir: -1, dens: 56000, spd: 0.55, rMax: 1.7, sway: 0.8 },
  aurora: { color: 'rgba(170,255,214,0.6)', dir: -1, dens: 60000, spd: 0.3, rMax: 1.6, sway: 0.4 },
  sakura: { color: 'rgba(255,196,218,0.85)', dir: 1, dens: 48000, spd: 0.6, rMax: 3.2, sway: 1.4 },
  lagoon: { color: 'rgba(255,255,255,0.55)', dir: -1, dens: 50000, spd: 0.45, rMax: 2.6, sway: 0.6 },
  night:  { color: 'rgba(235,240,255,0.8)', dir: 1, dens: 70000, spd: 0.15, rMax: 1.3, sway: 0.2 },
};
function disabledParticles(canvas) {
  if (canvas) canvas.style.display = 'none';
  return { retheme() {}, setEnabled() {}, setUnlocked() {} };
}
function createParticleField(canvas) {
  const field = {
    canvas, ctx: canvas.getContext('2d', { alpha: true, desynchronized: true }), cfg: PARTICLE_THEMES.red,
    w: 0, h: 0, scale: 1, parts: [], last: 0, raf: 0, enabled: true, unlocked: false, focused: !document.hidden,
    resizeTimer: undefined, tick: null,
  };
  field.tick = (now) => tickParticles(field, now);
  return field;
}
function spawnParticle(field, anywhere) {
  return {
    x: Math.random() * field.w,
    y: anywhere ? Math.random() * field.h : (field.cfg.dir > 0 ? -10 : field.h + 10),
    r: Math.random() * field.cfg.rMax + 0.7,
    d: Math.random() * 0.7 + 0.25,
    sway: (Math.random() * field.cfg.sway + 0.15),
    phase: Math.random() * Math.PI * 2,
  };
}
function resetParticles(field) {
  field.scale = Math.min(1, PARTICLE_RES_CAP / Math.max(1, innerWidth));
  field.w = field.canvas.width = Math.round(innerWidth * field.scale);
  field.h = field.canvas.height = Math.round(innerHeight * field.scale);
  const count = Math.min(130, Math.round(field.w * field.h / field.cfg.dens));
  field.parts = Array.from({ length: count }, () => spawnParticle(field, true));
}
function tickParticles(field, now) {
  if (!particlesRunning(field)) { field.raf = 0; return; }
  field.raf = requestAnimationFrame(field.tick);
  if (now - field.last < PARTICLE_FRAME_MS) return;
  const dt = Math.min(2.5, (now - field.last) / PARTICLE_FRAME_MS);
  field.last = now;
  drawParticles(field, dt);
}
function drawParticles(field, dt) {
  const ctx = field.ctx;
  ctx.clearRect(0, 0, field.w, field.h);
  ctx.fillStyle = field.cfg.color;
  ctx.beginPath();
  for (const particle of field.parts) stepParticle(field, particle, dt);
  ctx.fill();
}
function stepParticle(field, particle, dt) {
  const cfg = field.cfg;
  particle.y += cfg.dir * (particle.d + particle.r * 0.3) * cfg.spd * dt;
  particle.phase += 0.012 * dt;
  particle.x += Math.sin(particle.phase) * particle.sway * dt;
  if (cfg.dir > 0 ? particle.y > field.h + 8 : particle.y < -8) Object.assign(particle, spawnParticle(field, false));
  field.ctx.moveTo(particle.x, particle.y);
  field.ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
}
function particlesRunning(field) {
  return field.enabled && field.unlocked && field.focused && !document.hidden;
}
function kickParticles(field) {
  if (particlesRunning(field) && !field.raf) { field.last = performance.now(); field.raf = requestAnimationFrame(field.tick); }
  if (!particlesRunning(field) && field.raf) { cancelAnimationFrame(field.raf); field.raf = 0; field.ctx.clearRect(0, 0, field.w, field.h); }
}
function scheduleParticleReset(field) {
  clearTimeout(field.resizeTimer);
  field.resizeTimer = setTimeout(() => { resetParticles(field); kickParticles(field); }, 200);
}
function bindParticleEvents(field) {
  const kick = () => kickParticles(field);
  addEventListener('resize', () => scheduleParticleReset(field));
  document.addEventListener('visibilitychange', kick);
  addEventListener('blur', () => { field.focused = false; kick(); });
  addEventListener('focus', () => { field.focused = true; kick(); });
}
function rethemeParticles(field) {
  field.cfg = PARTICLE_THEMES[document.documentElement.dataset.theme || 'red'] || PARTICLE_THEMES.red;
  resetParticles(field);
  kickParticles(field);
}
function setParticlesEnabled(field, on) {
  field.enabled = on;
  field.canvas.style.display = on ? '' : 'none';
  kickParticles(field);
}
function particleControls(field) {
  return {
    retheme() { rethemeParticles(field); },
    setEnabled(on) { setParticlesEnabled(field, on); },
    setUnlocked(on) { field.unlocked = on; kickParticles(field); },
  };
}

const Particles = (() => {
  const canvas = $('#snow');
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return disabledParticles(canvas);
  const field = createParticleField(canvas);
  bindParticleEvents(field);
  resetParticles(field);
  kickParticles(field);
  return particleControls(field);
})();

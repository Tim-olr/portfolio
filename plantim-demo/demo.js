'use strict';

(() => {
  const mem = new Map();
  const memoryStorage = {
    get length() { return mem.size; },
    key: (i) => [...mem.keys()][i] ?? null,
    getItem: (k) => (mem.has(String(k)) ? mem.get(String(k)) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); },
    removeItem: (k) => { mem.delete(String(k)); },
    clear: () => { mem.clear(); },
  };
  try { Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true }); } catch (_) { }
  try { Object.defineProperty(window, 'sessionStorage', { value: memoryStorage, configurable: true }); } catch (_) { }
})();

const CryptoBox = (() => {
  const none = async () => null;
  return {
    secureContextOK: () => true,
    hasLocalVault: () => false,
    isUnlocked: () => true,
    lock() { },
    unlock: none,
    checkPassword: async () => true,
    encryptObject: async (obj) => JSON.stringify(obj),
    decryptObject: async (blob) => JSON.parse(blob),
    deriveAndHold: none,
    freshSalt: () => ({ meta: '' }),
    makeVerifier: none,
    cacheLocal() { },
    localSaltMeta: () => '',
    getAuthKey: () => null,
    newRecoveryCode: () => '',
    recoveryKeyFromCode: none,
    sealRecovery: none,
    openRecovery: none,
    openRecoveryWrap: none,
  };
})();

const Sync = (() => {
  let version = 0;
  const offline = async () => { throw new Error('demo'); };
  return {
    isOnline: () => false,
    isLoggedIn: () => false,
    hasRecovery: () => false,
    getVersion: () => version,
    setVersion(v) { version = +v || 0; },
    meta: async () => null,
    getRecoveryWrap: () => null,
    pushKey: () => null,
    pushSubs: () => 0,
    pushHealth: () => null,
    setup: offline, login: offline, logout: async () => { }, pull: offline, push: offline,
    rekey: offline, fetchRecovery: offline, setRecovery: offline,
    pushTest: offline, pushSchedule: offline, pushSubscribe: offline, pushUnsubscribe: offline,
  };
})();

const Demo = (() => {
  const VIEWS = ['day', '3day', 'workweek', 'week', 'month', 'agenda', 'boards', 'notes', 'apps'];

  function at(dayOffset, hour, minute = 0) {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  }
  function timed(title, dayOffset, hour, minute, minutes, label, extra = {}) {
    const start = at(dayOffset, hour, minute);
    return {
      id: uid(), title, notes: '', start: toLocalISO(start), end: toLocalISO(addMin(start, minutes)),
      allDay: false, labelId: label, reminders: [], checklist: [], exdates: [],
      recurrence: NO_REPEAT(), ...extra,
    };
  }
  function allDay(title, dayOffset, label) {
    const day = isoDate(at(dayOffset, 12));
    return {
      id: uid(), title, notes: '', start: day + 'T00:00', end: day + 'T23:59', allDay: true,
      labelId: label, reminders: [], checklist: [], exdates: [], recurrence: NO_REPEAT(),
    };
  }
  const items = (...texts) => texts.map((text, i) => ({ id: uid(), text, done: i === 0 }));
  const card = (title, label, extra = {}) => ({
    id: uid(), title, notes: '', labelId: label, checklist: [], reminders: [],
    duration: 60, eventId: null, due: null, repeat: null, createdAt: Date.now(), ...extra,
  });
  const dueIn = (days) => isoDate(addDays(new Date(), days));

  function build() {
    const data = DEFAULT_DATA();
    const [work, personal, health, social] = data.labels.map((l) => l.id);

    data.events = [
      timed('Standup', 0, 9, 0, 15, work, {
        recurrence: { freq: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5], end: { type: 'never' } },
        reminders: [{ minutes: 5 }],
      }),
      timed('Focus time: PlanTim sync', 0, 10, 0, 120, work),
      timed('Lunch with Sam', 1, 12, 30, 60, social, { notes: 'The new place around the corner' }),
      timed('Sprint planning', 1, 14, 0, 90, work, { checklist: items('Agenda', 'Estimate stories', 'Next steps') }),
      timed('Gym', 0, 18, 0, 60, health, {
        recurrence: { freq: 'weekly', interval: 1, byDay: [1, 3, 5], end: { type: 'never' } },
      }),
      timed('Client sync', 2, 10, 30, 60, work, { reminders: [{ minutes: 10 }] }),
      timed('Dentist', 2, 15, 0, 45, personal),
      timed('Code review', 3, 13, 0, 60, work),
      timed('Dinner with friends', 3, 19, 0, 120, social),
      timed('Demo day', 4, 11, 0, 90, work, { checklist: items('Slides', 'Live demo', 'Q&A') }),
      timed('Groceries', 5, 10, 0, 45, personal),
      timed('Long run', 6, 9, 30, 75, health),
      allDay('Release v2.0', 4, work),
      allDay('Weekend trip', 12, personal),
    ];

    data.tasks = [
      { id: uid(), title: 'Book train tickets', done: false, labelId: personal, createdAt: Date.now() },
      { id: uid(), title: 'Write release notes', done: false, labelId: work, createdAt: Date.now() },
      { id: uid(), title: 'Call the bank', done: false, labelId: null, createdAt: Date.now() },
      { id: uid(), title: 'Renew gym card', done: true, labelId: health, createdAt: Date.now() },
    ];

    const planned = card('Natural-language quick add', work, { due: dueIn(1), checklist: items('Dates', 'Times', 'Labels', 'Repeats') });
    const plannedEvent = timed(planned.title, 2, 13, 0, 60, work, { cardId: planned.id });
    planned.eventId = plannedEvent.id;
    data.events.push(plannedEvent);
    data.boards = [{
      id: uid(), name: 'PlanTim roadmap',
      lists: [
        { id: uid(), name: 'To do', cards: [
          card('Dark mode polish', work, { due: dueIn(5) }),
          card('Weekly review', personal, { due: dueIn(4), repeat: { freq: 'weekly', interval: 1, byDay: [], end: { type: 'never' } } }),
          card('ICS export', work),
        ] },
        { id: uid(), name: 'Doing', cards: [planned, card('Drag to resize events', work, { due: dueIn(-1) })] },
        { id: uid(), name: 'Done', cards: [card('Encrypted sync', work), card('Undo / redo', work)] },
      ],
    }];

    const projects = { id: uid(), name: 'Projects', parentId: null };
    const life = { id: uid(), name: 'Personal', parentId: null };
    data.noteFolders = [projects, life];
    const now = Date.now();
    data.notes = [
      { id: uid(), title: 'Welcome to PlanTim', folderId: null, created: now, updated: now, body:
        'This is a **demo**: nothing you do here is saved. Refresh the page to start over.\n\n'
        + '## Things to try\n- [x] Open the demo\n- [ ] Type `Lunch with Sam tomorrow 1pm #social` in the quick add bar\n'
        + '- [ ] Drag an event to move it, or drag its bottom edge to resize\n- [ ] Drag a task from the sidebar onto the calendar\n'
        + '- [ ] Move a card to ==Done== on the board\n- [ ] Press `Ctrl K` to search\n\nSee also [[Release plan]].' },
      { id: uid(), title: 'Release plan', folderId: projects.id, created: now, updated: now, body:
        '> Ship small, ship often.\n\n1. Finish the roadmap cards\n2. Write release notes\n3. Demo day\n\nBack to [[Welcome to PlanTim]].' },
      { id: uid(), title: 'Reading list', folderId: life.id, created: now, updated: now, body:
        '- *Atomic Habits*\n- *Deep Work*\n- *The Pragmatic Programmer*' },
    ];

    data.apps = [
      { id: uid(), name: 'Wikipedia', url: 'https://www.wikipedia.org/', newTab: false, icon: { type: 'glyph', char: 'W', bg: '#343a40', fg: '#ffffff' } },
      { id: uid(), name: 'GitHub', url: 'https://github.com/', newTab: true, icon: { type: 'glyph', char: '🐙', bg: '#24292f', fg: '#ffffff' } },
      { id: uid(), name: 'Maps', url: 'https://www.openstreetmap.org/', newTab: false, icon: { type: 'glyph', char: '🗺️', bg: '#2f9e44', fg: '#ffffff' } },
    ];

    data.settings.lastExport = now;
    return data;
  }

  function disableAccountFeatures() {
    armIdleLock = () => { };
    lockNow = async () => toast('Locking is turned off in the demo', 'info', 2500);
    settingsPushRowHTML = () => '';
    settingsAutolockRowHTML = () => '';
    bindPushControls = () => { };
    paintPushStatus = () => { };
    refreshPush = () => { };
  }
  const params = new URLSearchParams(location.hash.slice(1));
  function startView() {
    const wanted = params.get('view');
    return VIEWS.includes(wanted) ? wanted : 'week';
  }

  async function start() {
    disableAccountFeatures();
    const data = build();
    openNoteId = data.notes[0].id;
    noteMode = 'read';
    await enterApp({ obj: data });
    setView(startView());
    if (params.has('shot')) { document.querySelector('.demo-pill').hidden = true; return; }
    toast('Demo mode: nothing is saved. Refresh to start over.', 'info', 6000);
  }

  return { active: true, start };
})();

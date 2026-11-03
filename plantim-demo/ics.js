const ICS = (() => {
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalISO = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const datePart = (d) => toLocalISO(d).slice(0, 10);
  const occurrenceISO = (d, allDay) => (allDay ? datePart(d) + 'T00:00' : toLocalISO(d));

  const WIN_TZ = {
    'W. Europe Standard Time': 'Europe/Berlin', 'Central Europe Standard Time': 'Europe/Budapest',
    'Central European Standard Time': 'Europe/Warsaw', 'Romance Standard Time': 'Europe/Paris',
    'GMT Standard Time': 'Europe/London', 'Greenwich Standard Time': 'Atlantic/Reykjavik',
    'FLE Standard Time': 'Europe/Helsinki', 'E. Europe Standard Time': 'Europe/Chisinau',
    'GTB Standard Time': 'Europe/Bucharest', 'Russian Standard Time': 'Europe/Moscow',
    'UTC': 'UTC', 'Coordinated Universal Time': 'UTC',
    'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago',
    'Mountain Standard Time': 'America/Denver', 'Pacific Standard Time': 'America/Los_Angeles',
    'India Standard Time': 'Asia/Kolkata', 'China Standard Time': 'Asia/Shanghai',
    'Tokyo Standard Time': 'Asia/Tokyo', 'AUS Eastern Standard Time': 'Australia/Sydney',
  };
  const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const FREQS = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };
  const TZ_FORMAT = {
    hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  };
  const DATE_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/;

  function zonedParts(tz, t) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, ...TZ_FORMAT }).formatToParts(new Date(t));
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function tzOffset(tz, t) {
    try {
      const v = zonedParts(tz, t);
      return Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour % 24, +v.minute, +v.second) - t;
    } catch (_) { return null; }
  }

  function resolveTz(params) {
    const tzid = params.TZID && params.TZID.replace(/^"|"$/g, '');
    return tzid && (WIN_TZ[tzid] || tzid);
  }

  function zonedWallTime(params, wall) {
    const tz = resolveTz(params);
    if (!tz) return null;
    const firstOffset = tzOffset(tz, wall);
    if (firstOffset == null) return null;
    const secondOffset = tzOffset(tz, wall - firstOffset);
    return new Date(wall - (secondOffset != null ? secondOffset : firstOffset));
  }

  function parseDate(value, params) {
    const m = String(value).trim().match(DATE_RE);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    if (h == null || params.VALUE === 'DATE') return { date: new Date(+y, +mo - 1, +d), allDay: true };
    const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
    if (z) return { date: new Date(wall), allDay: false };
    const zoned = zonedWallTime(params, wall);
    return { date: zoned || new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
  }

  function parseDuration(s) {
    const m = String(s).match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) return 0;
    const ms = ((+m[2] || 0) * 7 * 86400 + (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
    return m[1] === '-' ? -ms : ms;
  }
  const unescape = (s) => String(s).replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

  function headEnd(raw) {
    let i = 0;
    let inQuotes = false;
    for (; i < raw.length; i++) {
      if (raw[i] === '"') inQuotes = !inQuotes;
      else if (raw[i] === ':' && !inQuotes) break;
    }
    return i;
  }

  function parseParams(parts) {
    const params = {};
    for (const part of parts) {
      const [key, ...rest] = part.split('=');
      params[key.toUpperCase()] = rest.join('=');
    }
    return params;
  }

  function parseLine(raw) {
    const colon = headEnd(raw);
    const head = raw.slice(0, colon).split(';');
    return { name: head[0].toUpperCase(), params: parseParams(head.slice(1)), value: raw.slice(colon + 1) };
  }

  const unfold = (text) => String(text).replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');

  function lines(text) {
    const out = [];
    for (const raw of unfold(text)) {
      if (raw.trim()) out.push(parseLine(raw));
    }
    return out;
  }

  function ruleParts(value) {
    return Object.fromEntries(value.split(';').map((kv) => {
      const [k, v] = kv.split('=');
      return [k.toUpperCase(), v];
    }));
  }

  function weeklyByDay(freq, r) {
    if (freq !== 'weekly' || !r.BYDAY) return [];
    return r.BYDAY.split(',').map((d) => WD[d.replace(/^[+-]?\d+/, '')]).filter((d) => d != null);
  }

  function ruleEnd(r) {
    if (r.COUNT) return { type: 'after', after: +r.COUNT };
    if (!r.UNTIL) return { type: 'never' };
    const until = parseDate(r.UNTIL, {});
    return until ? { type: 'on', on: datePart(until.date) } : { type: 'never' };
  }

  function dailyByDayRule(r, end) {
    const byDay = r.BYDAY.split(',').map((d) => WD[d]).filter((d) => d != null);
    return { freq: 'weekly', interval: 1, byDay, end };
  }

  const defaultByDay = (freq, startDate) => (freq === 'weekly' ? [startDate.getDay()] : []);

  function parseRule(value, startDate) {
    const r = ruleParts(value);
    const freq = FREQS[r.FREQ];
    if (!freq) return null;
    const byDay = weeklyByDay(freq, r);
    const end = ruleEnd(r);
    if (freq === 'daily' && r.BYDAY) return dailyByDayRule(r, end);
    return { freq, interval: Math.max(1, +r.INTERVAL || 1), byDay: byDay.length ? byDay : defaultByDay(freq, startDate), end };
  }

  function addExdates(cur, line) {
    for (const value of line.value.split(',')) {
      const parsed = parseDate(value, line.params);
      if (parsed) cur.exdates.push(parsed.date);
    }
  }

  const setField = (field, convert) => (cur, line) => { cur[field] = convert(line); };
  const rawValue = (line) => line.value;
  const textValue = (line) => unescape(line.value);
  const dateValue = (line) => parseDate(line.value, line.params);

  const PROPERTY_HANDLERS = new Map([
    ['UID', setField('uid', rawValue)],
    ['SUMMARY', setField('title', textValue)],
    ['DESCRIPTION', setField('notes', textValue)],
    ['LOCATION', setField('location', textValue)],
    ['STATUS', setField('status', (line) => line.value.toUpperCase())],
    ['DTSTART', setField('start', dateValue)],
    ['DTEND', setField('end', dateValue)],
    ['DURATION', setField('duration', (line) => parseDuration(line.value))],
    ['RRULE', setField('rrule', rawValue)],
    ['EXDATE', addExdates],
    ['RECURRENCE-ID', setField('recurrenceId', dateValue)],
  ]);

  function finishEvent(state) {
    if (state.cur.start && state.cur.status !== 'CANCELLED') state.events.push(state.cur);
    else state.skipped++;
    state.cur = null;
  }

  function handleTopLevelLine(state, line) {
    if (line.name === 'END' && line.value.toUpperCase() === 'VEVENT') return finishEvent(state);
    const handler = PROPERTY_HANDLERS.get(line.name);
    if (handler) handler(state.cur, line);
  }

  function handleEventLine(state, line) {
    if (line.name === 'BEGIN') state.depth++;
    else if (line.name === 'END' && state.depth) state.depth--;
    else if (!state.depth) handleTopLevelLine(state, line);
  }

  function handleLine(state, line) {
    if (line.name === 'BEGIN' && line.value.toUpperCase() === 'VEVENT') {
      state.cur = { exdates: [] };
      state.depth = 0;
    } else if (state.cur) {
      handleEventLine(state, line);
    }
  }

  function readEvents(text) {
    const state = { events: [], cur: null, depth: 0, skipped: 0 };
    for (const line of lines(text)) handleLine(state, line);
    return state;
  }

  function rawEnd(e, start, allDay) {
    if (e.end) return e.end.date;
    if (e.duration) return new Date(+start + e.duration);
    return new Date(+start + (allDay ? 86400000 : 3600000));
  }

  function eventEnd(e, start, allDay) {
    let end = rawEnd(e, start, allDay);
    if (allDay) end = new Date(+end - 86400000);
    if (end < start) end = new Date(+start + (allDay ? 0 : 3600000));
    return end;
  }

  const endISO = (end, allDay) => (allDay ? datePart(end) + 'T23:59' : toLocalISO(end));

  function eventNotes(e) {
    return [e.location ? 'Location: ' + e.location : '', e.notes || ''].filter(Boolean).join('\n').slice(0, 4000);
  }

  function eventRecurrence(e, start) {
    return (e.rrule && !e.recurrenceId && parseRule(e.rrule, start)) || { freq: 'none', interval: 1, byDay: [], end: { type: 'never' } };
  }

  function icsKey(e, startISO) {
    return (e.uid || startISO + e.title) + (e.recurrenceId ? '@' + toLocalISO(e.recurrenceId.date) : '');
  }

  function toEvent(e) {
    const { allDay, date: start } = e.start;
    const startISO = occurrenceISO(start, allDay);
    return {
      title: e.title || '(untitled)', notes: eventNotes(e), start: startISO,
      end: endISO(eventEnd(e, start, allDay), allDay), allDay,
      recurrence: eventRecurrence(e, start), exdates: e.exdates.map((d) => occurrenceISO(d, allDay)),
      icsKey: icsKey(e, startISO),
    };
  }

  function collectEvents(events) {
    const out = [];
    const masters = new Map();
    for (const e of events) {
      const ev = toEvent(e);
      if (e.uid && !e.recurrenceId) masters.set(e.uid, ev);
      out.push({ ev, uid: e.uid, recurrenceId: e.recurrenceId });
    }
    return { out, masters };
  }

  function addExdate(master, iso) {
    if (!master.exdates.includes(iso)) master.exdates.push(iso);
  }

  function excludeOverrides(entries, masters) {
    for (const entry of entries) {
      const master = entry.recurrenceId && masters.get(entry.uid);
      if (master) addExdate(master, occurrenceISO(entry.recurrenceId.date, entry.recurrenceId.allDay));
    }
  }

  function parse(text) {
    const { events, skipped } = readEvents(text);
    const { out, masters } = collectEvents(events);
    excludeOverrides(out, masters);
    return { events: out.map((o) => o.ev), skipped };
  }

  return { parse };
})();

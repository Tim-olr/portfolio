const NLP = (() => {
  const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const MO = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december'];
  const MONTH_ABBR = MO.map((name) => name.slice(0, 3)).join('|');
  const DATE_OPTS = { weekday: 'short', month: 'short', day: 'numeric' };
  const TIME_OPTS = { hour: 'numeric', minute: '2-digit' };

  const pad = (n) => String(n).padStart(2, '0');
  const toLocalISO = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  function cut(text, re) {
    const m = text.match(re);
    if (!m) return [text, null];
    return [(text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(), m];
  }

  function take(ctx, re) {
    const [text, match] = cut(ctx.text, re);
    ctx.text = text;
    return match;
  }

  const rule = (re, value) => ({ re, value });
  const hoursAndMinutes = (m) => +m[1] * 60 + +m[2];

  const DURATION_RULES = [
    rule(/\b(?:for\s+)?(\d+)\s*h(?:ours?|rs?)?\s*(\d{1,2})\s*m(?:in)?\b/i, hoursAndMinutes),
    rule(/\b(\d+)h(\d{2})\b/i, hoursAndMinutes),
    rule(/\b(?:for\s+)?(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\b/i, (m) => Math.round(parseFloat(m[1]) * 60)),
    rule(/\b(?:for\s+)?(\d+)\s*m(?:in(?:ute)?s?)?\b/i, (m) => +m[1]),
  ];

  const TIME_RULES = [
    rule(/\b(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)\b/i, (m) => to24(+m[1], +m[2], m[3])),
    rule(/\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i, (m) => to24(+m[1], 0, m[2])),
    rule(/\b(?:at\s+)(\d{1,2}):(\d{2})\b/, (m) => clampMin(hoursAndMinutes(m))),
    rule(/\b(\d{1,2}):(\d{2})\b/, (m) => clampMin(hoursAndMinutes(m))),
    rule(/\b(?:at\s+)(\d{1,2})\b/, (m) => (+m[1] <= 23 ? +m[1] * 60 : undefined)),
    rule(/\bnoon\b/i, () => 12 * 60),
    rule(/\bmidnight\b/i, () => 0),
    rule(/\bmorning\b/i, () => 9 * 60),
    rule(/\bafternoon\b/i, () => 14 * 60),
    rule(/\b(?:evening|tonight)\b/i, eveningTime),
  ];

  const DATE_RULES = [
    rule(/\btoday\b/i, (m, ctx) => ymd(ctx.now)),
    rule(/\b(?:tomorrow|tmr|tmrw)\b/i, (m, ctx) => ymd(addDays(ctx.now, 1))),
    rule(/\bnext\s+(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i, (m, ctx) => ymd(nextWeekday(ctx.now, wdIndex(m[1]), true))),
    rule(/\bthis\s+(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i, (m, ctx) => ymd(nextWeekday(ctx.now, wdIndex(m[1]), false))),
    rule(/\b(sun|mon|tue|wed|thu|fri|sat)(?:day|nesday|rsday|urday)?\b/i,
      (m, ctx) => ymd(nextWeekday(ctx.now, wdIndex(m[1]), false))),
    rule(/\bin\s+(\d+)\s+(day|week)s?\b/i, (m, ctx) => ymd(addDays(ctx.now, relativeDays(m)))),
    rule(new RegExp('\\b(' + MONTH_ABBR + ')[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b', 'i'),
      (m, ctx) => monthDay(ctx.now, moIndex(m[1]), +m[2])),
    rule(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(' + MONTH_ABBR + ')[a-z]*\\b', 'i'),
      (m, ctx) => monthDay(ctx.now, moIndex(m[2]), +m[1])),
    rule(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/, (m, ctx) => numericDate(m, ctx.now)),
    rule(/\b(?:on\s+the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i, (m, ctx) => monthDay(ctx.now, ctx.now.getMonth(), +m[1])),
  ];

  function eveningTime(m, ctx) {
    if (!ctx.date) ctx.date = ymd(ctx.now);
    return 19 * 60;
  }

  const relativeDays = (m) => +m[1] * (m[2].toLowerCase() === 'week' ? 7 : 1);

  function numericDate(m, now) {
    let day = +m[1];
    let month = +m[2];
    if (month > 12 && day <= 12) [day, month] = [month, day];
    const year = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
    return { y: year, m: month - 1, d: day };
  }

  function applyRule(ctx, field, { re, value }) {
    const match = take(ctx, re);
    if (!match) return;
    const result = value(match, ctx);
    if (result !== undefined) ctx[field] = result;
  }

  function applyRules(ctx, field, rules) {
    applyRule(ctx, field, rules[0]);
    for (let i = 1; i < rules.length; i++) {
      if (ctx[field] == null) applyRule(ctx, field, rules[i]);
    }
  }

  function findLabel(labels, want) {
    return labels.find((l) => l.name.toLowerCase() === want)
      || labels.find((l) => l.name.toLowerCase().startsWith(want));
  }

  function parseLabel(ctx, labels) {
    const m = ctx.text.match(/[#@]([a-z0-9][a-z0-9 _-]*)/i);
    if (!m) return;
    const hit = findLabel(labels, m[1].trim().toLowerCase());
    if (hit) ctx.labelId = hit.id;
    take(ctx, /[#@][a-z0-9][a-z0-9 _-]*/i);
  }

  function parseReminder(ctx) {
    let m = take(ctx, /!\s*(\d+)\s*(m|min|h|hr|hour|d|day)s?/i);
    if (!m) m = take(ctx, /\bremind(?:er)?\s+(\d+)\s*(m|min|h|hr|hour|d|day)s?\b/i);
    if (!m) return;
    const amount = +m[1];
    const unit = m[2][0].toLowerCase();
    ctx.reminderMin = unit === 'd' ? amount * 1440 : unit === 'h' ? amount * 60 : amount;
  }

  const makeRepeat = (freq, byDay) => ({ freq, interval: 1, byDay, end: { type: 'never' } });
  const REPEAT_FREQ = { day: 'daily', morning: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' };

  function repeatFor(word) {
    if (REPEAT_FREQ[word]) return makeRepeat(REPEAT_FREQ[word], []);
    if (word === 'weekday') return makeRepeat('weekly', [1, 2, 3, 4, 5]);
    return makeRepeat('weekly', [WD.indexOf(word)]);
  }

  function parseRepeat(ctx) {
    const m = take(ctx, /\bevery\s+(day|morning|week|month|year|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (!m) return;
    const word = m[1].toLowerCase();
    ctx.repeat = repeatFor(word);
    if (word === 'morning' && ctx.time == null) ctx.time = 9 * 60;
  }

  function createContext(text) {
    return {
      text, now: new Date(),
      date: null, time: null, durMin: null, labelId: null, reminderMin: null, repeat: null,
    };
  }

  function extractFields(ctx, labels) {
    parseLabel(ctx, labels);
    parseReminder(ctx);
    parseRepeat(ctx);
    applyRules(ctx, 'durMin', DURATION_RULES);
    applyRules(ctx, 'time', TIME_RULES);
    applyRules(ctx, 'date', DATE_RULES);
  }

  function baseDay({ date, now }) {
    return date ? new Date(date.y, date.m, date.d) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function allDayRange(base) {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 0, 0);
    return { start, end };
  }

  function timedRange(ctx, base) {
    let start = new Date(base);
    start.setHours(Math.floor(ctx.time / 60), ctx.time % 60, 0, 0);
    if (!ctx.date && start < ctx.now) start = new Date(+start + 86400000);
    return { start, end: new Date(+start + (ctx.durMin || 60) * 60000) };
  }

  function eventRange(ctx) {
    const base = baseDay(ctx);
    if (ctx.time == null) return allDayRange(base);
    return timedRange(ctx, base);
  }

  function buildResult(ctx, title, labels) {
    const allDay = ctx.time == null;
    const { start, end } = eventRange(ctx);
    return {
      title, start: toLocalISO(start), end: toLocalISO(end), allDay, labelId: ctx.labelId,
      reminders: ctx.reminderMin == null ? [] : [{ minutes: ctx.reminderMin }],
      recurrence: ctx.repeat, dated: !!ctx.date, timed: !allDay, durMin: ctx.durMin,
      preview: summarise(title, start, end, allDay, ctx.labelId, labels, ctx.reminderMin, ctx.repeat),
    };
  }

  function parse(input, labels = []) {
    const text = ' ' + String(input || '').trim() + ' ';
    if (!text.trim()) return null;
    const ctx = createContext(text);
    extractFields(ctx, labels);
    const title = ctx.text.replace(/\s+/g, ' ').trim().replace(/^[-–,:]\s*/, '');
    if (!title) return null;
    return buildResult(ctx, title, labels);
  }

  function to24(h, min, ap) {
    h = h % 12;
    if (/pm/i.test(ap)) h += 12;
    return clampMin(h * 60 + min);
  }
  const clampMin = (n) => Math.max(0, Math.min(1439, n));
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  const ymd = (d) => ({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
  const wdIndex = (s) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(s.slice(0, 3).toLowerCase());
  const moIndex = (s) => MO.findIndex((x) => x.startsWith(s.slice(0, 3).toLowerCase()));
  function nextWeekday(from, wd, forceNext) {
    const day = new Date(from);
    day.setHours(0, 0, 0, 0);
    let add = (wd - day.getDay() + 7) % 7;
    if (add === 0 && forceNext) add = 7;
    return addDays(day, add);
  }
  function monthDay(now, mo, day) {
    let y = now.getFullYear();
    const cand = new Date(y, mo, day);
    if (cand < new Date(now.getFullYear(), now.getMonth(), now.getDate())) y += 1;
    return { y, m: mo, d: day };
  }
  function reminderText(rem) {
    if (rem < 60) return rem + 'm';
    return rem < 1440 ? rem / 60 + 'h' : rem / 1440 + 'd';
  }
  function timeText(start, end, allDay) {
    if (allDay) return ' · all day';
    return ` · ${start.toLocaleTimeString([], TIME_OPTS)} to ${end.toLocaleTimeString([], TIME_OPTS)}`;
  }
  function labelText(labelId, labels) {
    if (!labelId) return '';
    const label = labels.find((x) => x.id === labelId);
    return label ? ` · ${label.name}` : '';
  }
  function summarise(title, start, end, allDay, labelId, labels, rem, rep) {
    let s = `“${title}” · ${start.toLocaleDateString([], DATE_OPTS)}`;
    s += timeText(start, end, allDay);
    s += labelText(labelId, labels);
    if (rem != null) s += ` · reminder ${reminderText(rem)} before`;
    if (rep) s += ` · repeats ${rep.freq}`;
    return s;
  }

  return { parse };
})();

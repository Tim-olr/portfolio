const Recurrence = (() => {
  const pad = (n) => String(n).padStart(2, '0');
  const GUARD_MAX = 6000;
  const YEARLY_GUARD_MAX = 800;
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function toLocalISO(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  function addMonths(from, n, anchorDay) {
    const x = new Date(from);
    x.setDate(1);
    x.setMonth(x.getMonth() + n);
    const daysInMonth = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(anchorDay, daysInMonth));
    return x;
  }

  function startOfWeek(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }

  function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  const isRecurringRule = (rec) => (rec.freq && rec.freq !== 'none');

  function createExpansion(ev, rangeStart, rangeEnd) {
    const start = new Date(ev.start);
    return {
      ev, rangeStart, rangeEnd, start, out: [], produced: 0,
      durationMs: Math.max(0, new Date(ev.end || ev.start) - start),
      rec: ev.recurrence || { freq: 'none' },
      skip: new Set(ev.exdates || []),
    };
  }

  function makeOccurrence(ev, iso, start, end, isRecurring) {
    return {
      id: ev.id + '::' + iso, eventId: ev.id, occStartISO: iso, start, end,
      allDay: !!ev.allDay, event: ev, isRecurring,
    };
  }

  function emitOccurrence(state, start) {
    const iso = toLocalISO(start);
    if (state.skip.has(iso)) return;
    const end = new Date(+start + state.durationMs);
    if (end >= state.rangeStart && start <= state.rangeEnd) {
      state.out.push(makeOccurrence(state.ev, iso, start, end, isRecurringRule(state.rec)));
    }
  }

  function countAndEmit(state, occ) {
    state.produced++;
    emitOccurrence(state, occ);
  }

  function applyRuleLimits(state) {
    const rec = state.rec;
    const endRule = rec.end || { type: 'never' };
    state.interval = Math.max(1, parseInt(rec.interval, 10) || 1);
    state.until = endRule.type === 'on' && endRule.on ? endOfDay(new Date(endRule.on)) : null;
    state.maxCount = endRule.type === 'after' && endRule.after > 0 ? parseInt(endRule.after, 10) : Infinity;
  }

  function shouldStop(state, probe) {
    return probe > state.rangeEnd || (state.until && probe > state.until) || state.produced >= state.maxCount;
  }

  function withStartTime(state, occ) {
    occ.setHours(state.start.getHours(), state.start.getMinutes(), 0, 0);
    return occ;
  }

  function expandDaily(state) {
    let cur = new Date(state.start);
    let guard = 0;
    while (guard++ < GUARD_MAX) {
      if (shouldStop(state, cur)) break;
      countAndEmit(state, new Date(cur));
      cur = addDays(cur, state.interval);
    }
  }

  function weekDays(rec, start) {
    if (rec.byDay && rec.byDay.length) return [...new Set(rec.byDay)].sort((a, b) => a - b);
    return [start.getDay()];
  }

  function emitWeek(state, week, days) {
    for (const dow of days) {
      const occ = withStartTime(state, addDays(week, dow));
      if (occ < state.start) continue;
      if (state.until && occ > state.until) continue;
      if (state.produced >= state.maxCount) break;
      countAndEmit(state, occ);
    }
  }

  function expandWeekly(state) {
    const days = weekDays(state.rec, state.start);
    let week = startOfWeek(state.start);
    let guard = 0;
    while (guard++ < GUARD_MAX) {
      if (shouldStop(state, week)) break;
      emitWeek(state, week, days);
      week = addDays(week, 7 * state.interval);
    }
  }

  function expandStepped(state, maxSteps, occurrenceAt) {
    let i = 0;
    let guard = 0;
    while (guard++ < maxSteps) {
      const occ = occurrenceAt(i);
      if (shouldStop(state, occ)) break;
      if (occ >= state.start) countAndEmit(state, occ);
      i++;
    }
  }

  function expandMonthly(state) {
    const anchorDay = state.start.getDate();
    const occurrenceAt = (step) => withStartTime(state, addMonths(state.start, step * state.interval, anchorDay));
    expandStepped(state, GUARD_MAX, occurrenceAt);
  }

  function yearlyOccurrence(state, step) {
    const occ = new Date(state.start);
    occ.setFullYear(state.start.getFullYear() + step * state.interval);
    return occ;
  }

  function expandYearly(state) {
    expandStepped(state, YEARLY_GUARD_MAX, (step) => yearlyOccurrence(state, step));
  }

  const EXPANDERS = new Map([
    ['daily', expandDaily], ['weekly', expandWeekly], ['monthly', expandMonthly], ['yearly', expandYearly],
  ]);

  function expandRule(state) {
    applyRuleLimits(state);
    const expander = EXPANDERS.get(state.rec.freq);
    if (expander) expander(state);
  }

  function expand(ev, rangeStart, rangeEnd) {
    const state = createExpansion(ev, rangeStart, rangeEnd);
    if (isRecurringRule(state.rec)) expandRule(state);
    else emitOccurrence(state, state.start);
    return state.out;
  }

  function describeEvery(rec) {
    const n = Math.max(1, parseInt(rec.interval, 10) || 1);
    const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[rec.freq];
    return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
  }

  function describeWeekdays(rec) {
    if (rec.freq !== 'weekly' || !rec.byDay || !rec.byDay.length) return '';
    const sorted = [...rec.byDay].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    return ' on ' + sorted.map((d) => DAY_NAMES[d]).join(', ');
  }

  function describeEnd(rec) {
    const endRule = rec.end || { type: 'never' };
    let text = '';
    if (endRule.type === 'on' && endRule.on) text += `, until ${endRule.on}`;
    if (endRule.type === 'after' && endRule.after) text += `, ${endRule.after} times`;
    return text;
  }

  function describe(rec) {
    if (!rec || !rec.freq || rec.freq === 'none') return 'Does not repeat';
    return describeEvery(rec) + describeWeekdays(rec) + describeEnd(rec);
  }

  return { expand, describe, toLocalISO };
})();

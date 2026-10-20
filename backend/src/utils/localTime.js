'use strict';
const env = require('../config/env');

/* The server's own clock zone is whatever the host uses (UTC on Vercel), but
   opening hours, weekend pricing and "valid 14:00-17:00" discount codes are
   all meant in the lounge's local time. Always read dates through here. */
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: env.businessTz,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
});
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** { ymd: '2026-10-19', hm: '14:05', day: 0-6 (0 = Sunday) } in the business time zone. */
function localParts(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, day: WEEKDAYS[p.weekday] };
}

module.exports = { localParts };

/**
 * Week helpers. Weeks run Monday 00:00 → next Monday 00:00 in the given IANA time zone.
 */

// Offset (ms) of `timeZone` from UTC at the given instant.
const tzOffsetMs = (date, timeZone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
};

// Convert a wall-clock time in `timeZone` (given as UTC fields) to a real instant.
const zonedToUtc = (y, m, d, timeZone) => {
  const guess = new Date(Date.UTC(y, m, d));
  const first = new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
  // Re-check once to handle DST transitions.
  return new Date(guess.getTime() - tzOffsetMs(first, timeZone));
};

/** Returns { start, end } instants of the Mon–Sun week containing `date`; end is exclusive. */
export const weekRange = (date = new Date(), timeZone = 'UTC') => {
  const local = new Date(date.getTime() + tzOffsetMs(date, timeZone));
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate() - daysSinceMonday;
  return { start: zonedToUtc(y, m, d, timeZone), end: zonedToUtc(y, m, d + 7, timeZone) };
};

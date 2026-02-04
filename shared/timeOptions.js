// Shared utility to generate time options based on a window and interval.
// Note: Times are treated as local wall-clock times; no timezone math is applied.

function toDate(input, baseDate = new Date()) {
  if (input instanceof Date) return new Date(input.getTime());
  const str = String(input || '').trim();
  const parts = str.split(':');
  if (parts.length >= 2) {
    const [hhRaw, mmRaw] = parts;
    const hh = Number.parseInt(hhRaw, 10);
    const mm = Number.parseInt(mmRaw, 10) || 0;
    const d = new Date(baseDate);
    d.setHours(hh, mm, 0, 0);
    return d;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLabel(d) {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const minuteStr = minutes.toString().padStart(2, '0');
  return `${displayHour}:${minuteStr} ${ampm}`;
}

export function generateTimeOptions({ startTime, endTime, intervalMinutes, baseDate, timezone, includeEndIfAligned = true }) {
  const interval = Number(intervalMinutes);
  if (!Number.isFinite(interval) || interval <= 0) return [];

  // We intentionally treat times as local wall-clock values; timezone param is reserved for future use
  const base = baseDate instanceof Date ? baseDate : new Date();
  const start = toDate(startTime, base);
  const end = toDate(endTime, base);
  if (!start || !end) return [];

  // If the window is invalid, return the start time as the sole option
  if (end <= start) {
    return [{ label: formatLabel(start), value: start.toISOString() }];
  }

  const options = [];
  let cursor = new Date(start.getTime());
  let safety = 0;

  while (cursor < end && safety < 1000) {
    const slotStart = new Date(cursor.getTime());
    const slotEnd = new Date(slotStart.getTime() + interval * 60 * 1000);

    if (slotEnd > end && !(includeEndIfAligned && slotEnd.getTime() === end.getTime())) {
      break;
    }

    options.push({ label: formatLabel(slotStart), value: slotStart.toISOString() });
    cursor = new Date(cursor.getTime() + interval * 60 * 1000);
    safety += 1;
  }

  // Fallback to at least one option (start) if loop produced nothing
  if (options.length === 0) {
    options.push({ label: formatLabel(start), value: start.toISOString() });
  }

  return options;
}

export default generateTimeOptions;

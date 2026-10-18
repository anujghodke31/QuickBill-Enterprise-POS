import { STORE } from '../config/store';

const DAY_MS = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date (YYYY-MM-DD) in the store's timezone. */
export function localDate(at: Date = new Date()): string {
  return dateFormatter.format(at);
}

/** Offset of the store timezone from UTC at a given instant, in minutes. */
function offsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE.timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** UTC instant at which a store-local calendar day starts. */
export function startOfLocalDay(date: string): Date {
  const naive = new Date(`${date}T00:00:00Z`);
  return new Date(naive.getTime() - offsetMinutes(naive) * 60_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Half-open UTC range [from, to) covering whole local days from `start` to `end` inclusive.
 */
export function localDayRange(start: string, end: string): { from: Date; to: Date } {
  return { from: startOfLocalDay(start), to: startOfLocalDay(addDays(end, 1)) };
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / DAY_MS,
  );
}

/** Every date from start to end inclusive. */
export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

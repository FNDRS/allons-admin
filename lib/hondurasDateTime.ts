/**
 * The admin date pickers are clock time in Honduras, not the server's zone.
 * Vercel (and most CI) is UTC, so `new Date("2026-09-26T17:30")` becomes
 * 17:30 UTC instead of 5:30 p.m. in San Pedro Sula. The API then thinks the
 * sale closed the next calendar day.
 *
 * Honduras is UTC-6 all year (no DST). Same bound the API uses in
 * `endOfEventDay`.
 */

const HN_OFFSET = "-06:00";
const HN_TZ = "America/Tegucigalpa";

export function hondurasDateTimeToIso(
  date: string,
  time: string,
): string | null {
  const day = date.trim();
  const clock = time.trim().slice(0, 5);
  if (!day || !clock) return null;
  const parsed = new Date(`${day}T${clock}:00${HN_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function hondurasInputToIso(
  value: string | null | undefined,
): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const [date, time] = raw.split("T");
  if (!date || !time) return null;
  return hondurasDateTimeToIso(date, time);
}

export function isoToHondurasDateTime(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!iso) return { date: "", time: "" };
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** First instant of the next Honduras calendar day. Sale must be strictly before this. */
export function endOfHondurasEventDay(eventStartsAt: string): Date | null {
  const { date } = isoToHondurasDateTime(eventStartsAt);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0, 0));
}

export function addHoursIso(iso: string, hours: number): string {
  return new Date(
    new Date(iso).getTime() + hours * 60 * 60 * 1000,
  ).toISOString();
}

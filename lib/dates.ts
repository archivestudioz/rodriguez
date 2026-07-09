import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  format,
  getQuarter,
} from "date-fns";

export type Period = "day" | "week" | "month" | "quarter";

export const PERIODS: { key: Period; label: string; noun: string }[] = [
  { key: "day", label: "Daily", noun: "Today" },
  { key: "week", label: "Weekly", noun: "Last 7 days" },
  { key: "month", label: "Monthly", noun: "Last 30 days" },
  { key: "quarter", label: "Quarterly", noun: "Last 90 days" },
];

export function isPeriod(v: unknown): v is Period {
  return v === "day" || v === "week" || v === "month" || v === "quarter";
}

/** Length of each reporting window in days. Trailing windows always contain a
 *  full period, so the figures scale sensibly (day → week → month → quarter). */
export function windowDays(p: Period): number {
  switch (p) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
  }
}

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday

export function periodStart(d: Date, p: Period): Date {
  switch (p) {
    case "day":
      return startOfDay(d);
    case "week":
      return startOfWeek(d, WEEK_OPTS);
    case "month":
      return startOfMonth(d);
    case "quarter":
      return startOfQuarter(d);
  }
}

export function periodEnd(d: Date, p: Period): Date {
  switch (p) {
    case "day":
      return endOfDay(d);
    case "week":
      return endOfWeek(d, WEEK_OPTS);
    case "month":
      return endOfMonth(d);
    case "quarter":
      return endOfQuarter(d);
  }
}

/** The current trailing window, e.g. the last 7 days including today. */
export function currentRange(p: Period, now = new Date()): { start: Date; end: Date } {
  const d = windowDays(p);
  return { start: startOfDay(subDays(now, d - 1)), end: endOfDay(now) };
}

/** The window of equal length immediately before the current one, for deltas. */
export function previousRange(p: Period, now = new Date()): { start: Date; end: Date } {
  const d = windowDays(p);
  return {
    start: startOfDay(subDays(now, 2 * d - 1)),
    end: endOfDay(subDays(now, d)),
  };
}

export function bucketLabel(d: Date, p: Period): string {
  switch (p) {
    case "day":
      return format(d, "MMM d");
    case "week":
      return format(startOfWeek(d, WEEK_OPTS), "MMM d");
    case "month":
      return format(d, "MMM yyyy");
    case "quarter":
      return `Q${getQuarter(d)} ${format(d, "yyyy")}`;
  }
}

/** Stable key for grouping a date into its period bucket. */
export function bucketKey(d: Date, p: Period): string {
  return periodStart(d, p).toISOString();
}

/** The last `count` buckets ending at `now` (oldest first), as start dates. */
export function recentBuckets(p: Period, count: number, now = new Date()): Date[] {
  const end = periodStart(now, p);
  switch (p) {
    case "day":
      return eachDayOfInterval({ start: subDays(end, count - 1), end });
    case "week":
      return eachWeekOfInterval(
        { start: subWeeks(end, count - 1), end },
        WEEK_OPTS,
      );
    case "month":
      return eachMonthOfInterval({ start: subMonths(end, count - 1), end });
    case "quarter":
      return eachQuarterOfInterval({ start: subQuarters(end, count - 1), end });
  }
}

/** How many buckets to show on the trend chart for each period. */
export function trendCount(p: Period): number {
  switch (p) {
    case "day":
      return 30;
    case "week":
      return 12;
    case "month":
      return 12;
    case "quarter":
      return 8;
  }
}

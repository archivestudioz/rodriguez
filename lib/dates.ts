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
  { key: "week", label: "Weekly", noun: "This week" },
  { key: "month", label: "Monthly", noun: "This month" },
  { key: "quarter", label: "Quarterly", noun: "This quarter" },
];

export function isPeriod(v: unknown): v is Period {
  return v === "day" || v === "week" || v === "month" || v === "quarter";
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

export function currentRange(p: Period, now = new Date()): { start: Date; end: Date } {
  return { start: periodStart(now, p), end: periodEnd(now, p) };
}

export function previousRange(p: Period, now = new Date()): { start: Date; end: Date } {
  const prev =
    p === "day"
      ? subDays(now, 1)
      : p === "week"
        ? subWeeks(now, 1)
        : p === "month"
          ? subMonths(now, 1)
          : subQuarters(now, 1);
  return { start: periodStart(prev, p), end: periodEnd(prev, p) };
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

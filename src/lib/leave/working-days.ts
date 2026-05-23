import "server-only";
import { prisma } from "@/lib/prisma";

// UAE default: Sun-Thu working week (days 0-4 where 0=Sun)
const UAE_GOV_WORKING_DAYS = [0, 1, 2, 3, 4];
const UAE_PRIVATE_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

export interface WorkingDaysConfig {
  workingDays: number[];
  workHoursPerDay: number;
}

export async function getWorkingDaysConfig(
  companyId: string
): Promise<WorkingDaysConfig> {
  const config = await prisma.workingDaysConfig.findUnique({
    where: { companyId },
  });
  return {
    workingDays: config?.workingDays ?? UAE_PRIVATE_WORKING_DAYS,
    workHoursPerDay: config?.workHoursPerDay ?? 8,
  };
}

// Returns the set of holiday dates (as ISO date strings yyyy-mm-dd) for a date range
async function getHolidaySet(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<Set<string>> {
  const holidays = await prisma.holidayCalendar.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true },
  });
  const set = new Set<string>();
  for (const h of holidays) {
    set.add(h.date.toISOString().slice(0, 10));
  }
  return set;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates working days between startDate and endDate (inclusive), excluding:
 * - weekends (based on company WorkingDaysConfig)
 * - UAE public holidays registered in HolidayCalendar
 *
 * Returns 0.5 for a half-day.
 */
export async function calculateWorkingDays(
  companyId: string,
  startDate: Date,
  endDate: Date,
  isHalfDay = false
): Promise<number> {
  if (isHalfDay) return 0.5;

  const config = await getWorkingDaysConfig(companyId);
  const holidays = await getHolidaySet(companyId, startDate, endDate);

  let count = 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay(); // 0=Sun, 6=Sat
    const dateStr = toDateString(cursor);
    if (config.workingDays.includes(dayOfWeek) && !holidays.has(dateStr)) {
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

/**
 * Returns all non-working days (weekends + holidays) between two dates.
 * Used by the calendar to shade non-working days.
 */
export async function getNonWorkingDays(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; reason: "WEEKEND" | "HOLIDAY"; name?: string }>> {
  const config = await getWorkingDaysConfig(companyId);
  const holidays = await prisma.holidayCalendar.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true, name: true },
  });

  const holidayMap = new Map(
    holidays.map((h) => [h.date.toISOString().slice(0, 10), h.name])
  );

  const result: Array<{ date: string; reason: "WEEKEND" | "HOLIDAY"; name?: string }> = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    const dateStr = toDateString(cursor);
    if (!config.workingDays.includes(dayOfWeek)) {
      result.push({ date: dateStr, reason: "WEEKEND" });
    } else if (holidayMap.has(dateStr)) {
      result.push({ date: dateStr, reason: "HOLIDAY", name: holidayMap.get(dateStr) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

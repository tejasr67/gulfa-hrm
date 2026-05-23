import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getLeaveCalendar } from "@/modules/leave/queries";
import { startOfMonth, endOfMonth } from "date-fns";
import { CalendarClient } from "./CalendarClient";

export const metadata: Metadata = { title: "Leave Calendar" };

export default async function CalendarPage() {
  const session = await requireSession();
  const now = new Date();
  const entries = await getLeaveCalendar(
    session.companyId,
    startOfMonth(now),
    endOfMonth(now)
  );
  return <CalendarClient initialEntries={entries} />;
}

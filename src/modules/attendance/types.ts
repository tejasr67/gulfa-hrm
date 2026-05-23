import type { Prisma, AttendanceStatus, AttendanceMethod } from "@prisma/client";

export type AttendanceRecordRow = Prisma.AttendanceRecordGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        photo: true;
        employeeId: true;
        department: { select: { name: true } };
        position: { select: { title: true } };
      };
    };
    shift: { select: { id: true; name: true; startTime: true; endTime: true } };
  };
}>;

export type ShiftScheduleRow = Prisma.ShiftScheduleGetPayload<{}>;

export type AttendancePolicyRow = Prisma.AttendancePolicyGetPayload<{}>;

export type AttendanceDayStats = {
  date: string;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  remote: number;
  totalEmployees: number;
  attendanceRate: number;
};

export type AttendanceSummary = {
  today: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    remote: number;
    holiday: number;
    weekend: number;
    totalEmployees: number;
    attendanceRate: number;
    totalOvertimeHours: number;
  };
  thisMonth: {
    totalWorkDays: number;
    avgAttendanceRate: number;
    totalOvertimeHours: number;
    totalAbsences: number;
  };
};

export type DepartmentAttendanceStat = {
  departmentId: string;
  departmentName: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
};

export type AttendanceFilters = {
  search?: string;
  status?: AttendanceStatus;
  employeeId?: string;
  departmentId?: string;
  shiftId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

export type AttendanceTrend = {
  date: string;
  present: number;
  absent: number;
  late: number;
  overtimeHours: number;
};

export { AttendanceStatus, AttendanceMethod };

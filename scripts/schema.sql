-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'FREELANCE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'PROBATION');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND', 'REMOTE');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('MANUAL', 'BIOMETRIC', 'MOBILE', 'WEB');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'PENDING_RELIEVER', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RelieverStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "HalfDayPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "LeaveGender" AS ENUM ('ALL', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('DIRECT_MANAGER', 'DEPARTMENT_HEAD', 'HR_MANAGER', 'SPECIFIC_ROLE', 'SPECIFIC_USER');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'REJECTED', 'ESCALATED', 'DELEGATED');

-- CreateEnum
CREATE TYPE "EncashmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('BASIC', 'ALLOWANCE', 'DEDUCTION', 'BONUS', 'OVERTIME', 'COMMISSION');

-- CreateEnum
CREATE TYPE "SalaryCalcType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "SalaryAdvanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DEDUCTED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RESERVED', 'DISPOSED', 'LOST');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AssetMaintenanceType" AS ENUM ('ROUTINE', 'REPAIR', 'INSPECTION', 'REPLACEMENT', 'CALIBRATION');

-- CreateEnum
CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('VILLA', 'APARTMENT', 'LABOR_CAMP', 'HOTEL');

-- CreateEnum
CREATE TYPE "DisciplinarySeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DisciplinaryStatus" AS ENUM ('OPEN', 'CLOSED', 'APPEALED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CareerEventType" AS ENUM ('PROMOTION', 'DEMOTION', 'TRANSFER', 'ROLE_CHANGE', 'SALARY_REVISION', 'PROBATION_COMPLETION', 'MANAGER_CHANGE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_EXPIRY', 'LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYSLIP_READY', 'BIRTHDAY', 'ANNIVERSARY', 'DISCIPLINARY', 'PROBATION_REMINDER', 'PAYROLL_COMPLETE', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_TERMINATED', 'LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYROLL_RUN_COMPLETED', 'PAYSLIP_GENERATED', 'ATTENDANCE_RECORDED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayCalendar" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "date" DATE NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidayCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingDaysConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workingDays" INTEGER[],
    "workHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingDaysConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "trn" TEXT,
    "logo" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'UAE',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "code" TEXT,
    "managerId" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "grade" TEXT,
    "level" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'UAE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "positionId" TEXT,
    "locationId" TEXT,
    "managerId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstNameAr" TEXT,
    "lastNameAr" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "nationality" TEXT,
    "religion" TEXT,
    "maritalStatus" "MaritalStatus",
    "bloodGroup" TEXT,
    "photo" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "altPhone" TEXT,
    "personalEmail" TEXT,
    "emiratesId" TEXT,
    "emiratesIdExpiry" TIMESTAMP(3),
    "visaNumber" TEXT,
    "visaExpiry" TIMESTAMP(3),
    "passportNumber" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "laborCardNumber" TEXT,
    "laborCardExpiry" TIMESTAMP(3),
    "uaeEntryDate" TIMESTAMP(3),
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "confirmationDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "bankName" TEXT,
    "bankAccount" TEXT,
    "iban" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEmergencyContact" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeEmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT true,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuedBy" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "storagePath" TEXT,
    "uploadedBy" TEXT,
    "notes" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "workDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "overtimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakTime" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "checkInMethod" "AttendanceMethod",
    "checkOutMethod" "AttendanceMethod",
    "workHours" DOUBLE PRECISION,
    "overtime" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "code" TEXT NOT NULL,
    "maxDaysPerYear" DOUBLE PRECISION NOT NULL,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryForward" DOUBLE PRECISION,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "minDaysNotice" INTEGER NOT NULL DEFAULT 1,
    "allowedDuringProbation" BOOLEAN NOT NULL DEFAULT false,
    "probationDaysLimit" DOUBLE PRECISION,
    "minServiceMonths" INTEGER NOT NULL DEFAULT 0,
    "genderRestriction" "LeaveGender" NOT NULL DEFAULT 'ALL',
    "halfDayAllowed" BOOLEAN NOT NULL DEFAULT false,
    "maxConsecutiveDays" DOUBLE PRECISION,
    "requiresReliever" BOOLEAN NOT NULL DEFAULT false,
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "encashable" BOOLEAN NOT NULL DEFAULT false,
    "maxEncashDays" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carried" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "halfDayPeriod" "HalfDayPeriod",
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "currentApprovalStep" INTEGER NOT NULL DEFAULT 1,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "relieverId" TEXT,
    "relieverStatus" "RelieverStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "relieverNote" TEXT,
    "relieverApprovedAt" TIMESTAMP(3),
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApprovalConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leaveTypeId" TEXT,
    "step" INTEGER NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "approverRoleId" TEXT,
    "approverId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "timeoutHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveApprovalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApprovalAction" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverName" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveEncashmentRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" "EncashmentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveEncashmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveCarryForwardLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "fromYear" INTEGER NOT NULL,
    "toYear" INTEGER NOT NULL,
    "daysCarried" DOUBLE PRECISION NOT NULL,
    "daysExpired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT,

    CONSTRAINT "LeaveCarryForwardLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryComponent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" "SalaryComponentType" NOT NULL,
    "calculationType" "SalaryCalcType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalary" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "housingAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "foodAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobileAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSalary" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "EmployeeSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "housingAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "foodAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobileAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unpaidLeaveDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "paidDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayslipLineItem" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PayslipLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "SalaryAdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deductedIn" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serialNumber" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "depreciationRate" DOUBLE PRECISION,
    "warrantyExpiry" TIMESTAMP(3),
    "replacementCycleMonths" INTEGER,
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "returnCondition" "AssetCondition",
    "notes" TEXT,
    "returnNotes" TEXT,
    "assignedBy" TEXT,
    "returnedBy" TEXT,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMaintenance" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "AssetMaintenanceType" NOT NULL,
    "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "vendor" TEXT,
    "description" TEXT,
    "outcome" TEXT,
    "performedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "capacity" INTEGER NOT NULL,
    "type" "AccommodationType" NOT NULL,
    "amenities" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vacatedAt" TIMESTAMP(3),
    "monthlyRent" DOUBLE PRECISION,
    "notes" TEXT,
    "vacateNotes" TEXT,
    "assignedBy" TEXT,

    CONSTRAINT "AccommodationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBenefit" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "benefitTypeId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" "DisciplinarySeverity" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisciplinaryType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionDate" TIMESTAMP(3),
    "issuedBy" TEXT,
    "appealStatus" "AppealStatus",
    "appealDate" TIMESTAMP(3),
    "appealReason" TEXT,
    "attachments" TEXT[],
    "status" "DisciplinaryStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "CareerEventType" NOT NULL,
    "fromPosition" TEXT,
    "toPosition" TEXT,
    "fromDepartment" TEXT,
    "toDepartment" TEXT,
    "fromManagerId" TEXT,
    "toManagerId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "fromSalary" DOUBLE PRECISION,
    "toSalary" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "CareerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "companyId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReminderConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentTypeId" TEXT,
    "reminderDays" INTEGER[],
    "notifyEmployee" BOOLEAN NOT NULL DEFAULT true,
    "notifyManager" BOOLEAN NOT NULL DEFAULT false,
    "notifyHR" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReminderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReminderLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reminderDays" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "companyId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" "WebhookEvent"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationQueue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipientEmail" TEXT,
    "recipientId" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_employeeId_key" ON "UserProfile"("employeeId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_companyId_idx" ON "UserProfile"("companyId");

-- CreateIndex
CREATE INDEX "HolidayCalendar_companyId_date_idx" ON "HolidayCalendar"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayCalendar_companyId_date_key" ON "HolidayCalendar"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDaysConfig_companyId_key" ON "WorkingDaysConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_trn_key" ON "Company"("trn");

-- CreateIndex
CREATE INDEX "Department_companyId_idx" ON "Department"("companyId");

-- CreateIndex
CREATE INDEX "Department_companyId_isActive_idx" ON "Department"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "Position_companyId_idx" ON "Position"("companyId");

-- CreateIndex
CREATE INDEX "Location_companyId_idx" ON "Location"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_emiratesId_key" ON "Employee"("emiratesId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_employeeId_idx" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEmergencyContact_employeeId_idx" ON "EmployeeEmergencyContact"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_expiryDate_idx" ON "EmployeeDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "EmployeeDocument_status_idx" ON "EmployeeDocument"("status");

-- CreateIndex
CREATE INDEX "AttendancePolicy_companyId_idx" ON "AttendancePolicy"("companyId");

-- CreateIndex
CREATE INDEX "ShiftSchedule_companyId_idx" ON "ShiftSchedule"("companyId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeId_idx" ON "AttendanceRecord"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_status_idx" ON "AttendanceRecord"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE INDEX "LeaveType_companyId_idx" ON "LeaveType"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_companyId_code_key" ON "LeaveType"("companyId", "code");

-- CreateIndex
CREATE INDEX "LeaveBalance_employeeId_idx" ON "LeaveBalance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveTypeId_year_key" ON "LeaveBalance"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_relieverId_idx" ON "LeaveRequest"("relieverId");

-- CreateIndex
CREATE INDEX "LeaveApprovalConfig_companyId_idx" ON "LeaveApprovalConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveApprovalConfig_companyId_leaveTypeId_step_key" ON "LeaveApprovalConfig"("companyId", "leaveTypeId", "step");

-- CreateIndex
CREATE INDEX "LeaveApprovalAction_leaveRequestId_idx" ON "LeaveApprovalAction"("leaveRequestId");

-- CreateIndex
CREATE INDEX "LeaveApprovalAction_approverId_idx" ON "LeaveApprovalAction"("approverId");

-- CreateIndex
CREATE INDEX "LeaveEncashmentRequest_employeeId_idx" ON "LeaveEncashmentRequest"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveEncashmentRequest_status_idx" ON "LeaveEncashmentRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveEncashmentRequest_employeeId_leaveTypeId_year_key" ON "LeaveEncashmentRequest"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveCarryForwardLog_companyId_fromYear_idx" ON "LeaveCarryForwardLog"("companyId", "fromYear");

-- CreateIndex
CREATE INDEX "LeaveCarryForwardLog_employeeId_idx" ON "LeaveCarryForwardLog"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveCarryForwardLog_employeeId_leaveTypeId_fromYear_key" ON "LeaveCarryForwardLog"("employeeId", "leaveTypeId", "fromYear");

-- CreateIndex
CREATE INDEX "SalaryComponent_companyId_idx" ON "SalaryComponent"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryComponent_companyId_name_key" ON "SalaryComponent"("companyId", "name");

-- CreateIndex
CREATE INDEX "EmployeeSalary_employeeId_idx" ON "EmployeeSalary"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollRun_companyId_idx" ON "PayrollRun"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_companyId_month_year_key" ON "PayrollRun"("companyId", "month", "year");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE INDEX "Payslip_payrollRunId_idx" ON "Payslip"("payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollRunId_employeeId_key" ON "Payslip"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "PayslipLineItem_payslipId_idx" ON "PayslipLineItem"("payslipId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_companyId_idx" ON "SalaryAdvance"("companyId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_employeeId_idx" ON "SalaryAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "AssetCategory_companyId_idx" ON "AssetCategory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_companyId_name_key" ON "AssetCategory"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_code_key" ON "Asset"("code");

-- CreateIndex
CREATE INDEX "Asset_companyId_idx" ON "Asset"("companyId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- CreateIndex
CREATE INDEX "Asset_nextMaintenanceAt_idx" ON "Asset"("nextMaintenanceAt");

-- CreateIndex
CREATE INDEX "AssetAssignment_assetId_idx" ON "AssetAssignment"("assetId");

-- CreateIndex
CREATE INDEX "AssetAssignment_employeeId_idx" ON "AssetAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "AssetAssignment_returnedAt_idx" ON "AssetAssignment"("returnedAt");

-- CreateIndex
CREATE INDEX "AssetMaintenance_assetId_idx" ON "AssetMaintenance"("assetId");

-- CreateIndex
CREATE INDEX "AssetMaintenance_companyId_idx" ON "AssetMaintenance"("companyId");

-- CreateIndex
CREATE INDEX "AssetMaintenance_scheduledAt_idx" ON "AssetMaintenance"("scheduledAt");

-- CreateIndex
CREATE INDEX "AssetMaintenance_status_idx" ON "AssetMaintenance"("status");

-- CreateIndex
CREATE INDEX "Accommodation_companyId_idx" ON "Accommodation"("companyId");

-- CreateIndex
CREATE INDEX "Room_accommodationId_idx" ON "Room"("accommodationId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_accommodationId_roomNumber_key" ON "Room"("accommodationId", "roomNumber");

-- CreateIndex
CREATE INDEX "AccommodationAssignment_employeeId_idx" ON "AccommodationAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "AccommodationAssignment_roomId_idx" ON "AccommodationAssignment"("roomId");

-- CreateIndex
CREATE INDEX "AccommodationAssignment_vacatedAt_idx" ON "AccommodationAssignment"("vacatedAt");

-- CreateIndex
CREATE INDEX "BenefitType_companyId_idx" ON "BenefitType"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_employeeId_idx" ON "EmployeeBenefit"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_benefitTypeId_idx" ON "EmployeeBenefit"("benefitTypeId");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_employeeId_isActive_idx" ON "EmployeeBenefit"("employeeId", "isActive");

-- CreateIndex
CREATE INDEX "DisciplinaryType_companyId_idx" ON "DisciplinaryType"("companyId");

-- CreateIndex
CREATE INDEX "DisciplinaryRecord_employeeId_idx" ON "DisciplinaryRecord"("employeeId");

-- CreateIndex
CREATE INDEX "DisciplinaryRecord_status_idx" ON "DisciplinaryRecord"("status");

-- CreateIndex
CREATE INDEX "CareerHistory_employeeId_idx" ON "CareerHistory"("employeeId");

-- CreateIndex
CREATE INDEX "CareerHistory_type_idx" ON "CareerHistory"("type");

-- CreateIndex
CREATE INDEX "CareerHistory_effectiveDate_idx" ON "CareerHistory"("effectiveDate");

-- CreateIndex
CREATE INDEX "Notification_employeeId_idx" ON "Notification"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "DocumentReminderConfig_companyId_idx" ON "DocumentReminderConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReminderConfig_companyId_documentTypeId_key" ON "DocumentReminderConfig"("companyId", "documentTypeId");

-- CreateIndex
CREATE INDEX "DocumentReminderLog_documentId_idx" ON "DocumentReminderLog"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReminderLog_employeeId_idx" ON "DocumentReminderLog"("employeeId");

-- CreateIndex
CREATE INDEX "DocumentReminderLog_companyId_sentAt_idx" ON "DocumentReminderLog"("companyId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReminderLog_documentId_reminderDays_channel_key" ON "DocumentReminderLog"("documentId", "reminderDays", "channel");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_entityId_idx" ON "AuditLog"("module", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_createdAt_idx" ON "AuditLog"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_name_key" ON "Role"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_module_action_key" ON "Permission"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_companyId_idx" ON "ApiKey"("companyId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_companyId_idx" ON "WebhookEndpoint"("companyId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_idx" ON "WebhookDelivery"("endpointId");

-- CreateIndex
CREATE INDEX "NotificationQueue_status_scheduledAt_idx" ON "NotificationQueue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationQueue_companyId_idx" ON "NotificationQueue"("companyId");

-- CreateIndex
CREATE INDEX "NotificationQueue_type_idx" ON "NotificationQueue"("type");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEmergencyContact" ADD CONSTRAINT "EmployeeEmergencyContact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalConfig" ADD CONSTRAINT "LeaveApprovalConfig_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalAction" ADD CONSTRAINT "LeaveApprovalAction_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashmentRequest" ADD CONSTRAINT "LeaveEncashmentRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashmentRequest" ADD CONSTRAINT "LeaveEncashmentRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveCarryForwardLog" ADD CONSTRAINT "LeaveCarryForwardLog_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipLineItem" ADD CONSTRAINT "PayslipLineItem_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationAssignment" ADD CONSTRAINT "AccommodationAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationAssignment" ADD CONSTRAINT "AccommodationAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitType" ADD CONSTRAINT "BenefitType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBenefit" ADD CONSTRAINT "EmployeeBenefit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBenefit" ADD CONSTRAINT "EmployeeBenefit_benefitTypeId_fkey" FOREIGN KEY ("benefitTypeId") REFERENCES "BenefitType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryType" ADD CONSTRAINT "DisciplinaryType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryRecord" ADD CONSTRAINT "DisciplinaryRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryRecord" ADD CONSTRAINT "DisciplinaryRecord_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DisciplinaryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerHistory" ADD CONSTRAINT "CareerHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

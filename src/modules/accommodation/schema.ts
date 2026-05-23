import { z } from "zod";

export const createAccommodationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  capacity: z.number().int().positive("Capacity must be positive"),
  type: z.enum(["APARTMENT", "VILLA", "LABOR_CAMP", "HOTEL"]),
  amenities: z.array(z.string()).optional(),
});

export const updateAccommodationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
});

export const createRoomSchema = z.object({
  accommodationId: z.string().min(1),
  roomNumber: z.string().min(1, "Room number is required"),
  floor: z.string().optional(),
  capacity: z.number().int().min(1).default(1),
});

export const assignRoomSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  roomId: z.string().min(1, "Room is required"),
  monthlyRent: z.number().optional(),
  notes: z.string().optional(),
});

export const vacateRoomSchema = z.object({
  assignmentId: z.string().min(1),
  vacateNotes: z.string().optional(),
  vacatedAt: z.string().optional(),
});

export type CreateAccommodationInput = z.infer<typeof createAccommodationSchema>;
export type UpdateAccommodationInput = z.infer<typeof updateAccommodationSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type AssignRoomInput = z.infer<typeof assignRoomSchema>;
export type VacateRoomInput = z.infer<typeof vacateRoomSchema>;

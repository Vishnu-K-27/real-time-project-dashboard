import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const idParam = z.object({ id: z.string().uuid() });

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  since: z.string().datetime().optional(),
});

export const clientSchema = z.object({
  name: z.string().min(2).max(120),
  company: z.string().min(2).max(160),
  email: z.string().email(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]),
});

export const userPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]).optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2).max(120),
  key: z.string().min(2).max(6).regex(/^[A-Z]+$/),
  description: z.string().min(1).max(2000),
  clientId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
});

export const projectPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  clientId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().min(1).max(4000),
  assignedToId: z.string().uuid().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  startDate: z.string().optional(),
  dueDate: z.string(),
});

export const taskPatchSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  description: z.string().min(1).max(4000).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const taskFilterQuery = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

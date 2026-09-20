import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { forbidden, notFound } from "../utils/errors";

export async function assertProjectAccess(user: AuthUser, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, createdBy: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!project) throw notFound("Project");
  if (user.role === "ADMIN") return project;
  if (user.role === "PROJECT_MANAGER") {
    if (project.createdById !== user.id) throw forbidden("You can only access projects you created");
    return project;
  }
  const assigned = await prisma.task.findFirst({
    where: { projectId, assignedToId: user.id },
    select: { id: true },
  });
  if (!assigned) throw forbidden("You can only access projects that contain your assigned tasks");
  return project;
}

export function assertCanManageProject(user: AuthUser, createdById: string) {
  if (user.role === "ADMIN") return;
  if (user.role === "PROJECT_MANAGER" && createdById === user.id) return;
  throw forbidden("You cannot manage this project");
}

export function assertDeveloperAssigned(user: AuthUser, assignedToId: string | null) {
  if (user.role !== "DEVELOPER") return;
  if (assignedToId !== user.id) throw forbidden("You can only view or update tasks assigned to you");
}

export function projectScopeWhere(user: AuthUser) {
  if (user.role === "ADMIN") return {};
  if (user.role === "PROJECT_MANAGER") return { createdById: user.id };
  return { tasks: { some: { assignedToId: user.id } } };
}

export function taskScopeWhere(user: AuthUser) {
  if (user.role === "ADMIN") return {};
  if (user.role === "PROJECT_MANAGER") return { project: { createdById: user.id } };
  return { assignedToId: user.id };
}

export function activityScopeWhere(user: AuthUser) {
  if (user.role === "ADMIN") return {};
  if (user.role === "PROJECT_MANAGER") return { project: { createdById: user.id } };
  return { task: { assignedToId: user.id } };
}

export function isManager(role: Role) {
  return role === "ADMIN" || role === "PROJECT_MANAGER";
}

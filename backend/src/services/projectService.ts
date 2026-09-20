import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { conflict, forbidden, notFound } from "../utils/errors";
import { assertCanManageProject, assertProjectAccess, projectScopeWhere } from "./access";

export async function listProjects(user: AuthUser) {
  return prisma.project.findMany({
    where: projectScopeWhere(user),
    include: {
      client: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(user: AuthUser, id: string) {
  return assertProjectAccess(user, id);
}

export async function createProject(
  user: AuthUser,
  input: { name: string; key: string; description: string; clientId: string; leadId?: string }
) {
  if (user.role === "DEVELOPER") throw forbidden();
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw notFound("Client");
  const exists = await prisma.project.findUnique({ where: { key: input.key } });
  if (exists) throw conflict("Project key is already in use");

  let leadUserId = user.id;
  if (input.leadId) {
    const leadUser = await prisma.user.findUnique({ where: { id: input.leadId } });
    if (!leadUser) throw notFound("Project Lead User");
    leadUserId = leadUser.id;
  }

  return prisma.project.create({
    data: {
      name: input.name,
      key: input.key,
      description: input.description,
      clientId: input.clientId,
      createdById: leadUserId,
    },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function patchProject(
  user: AuthUser,
  id: string,
  input: { name?: string; description?: string; clientId?: string; leadId?: string }
) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw notFound("Project");
  assertCanManageProject(user, project.createdById);

  if (input.clientId) {
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw notFound("Client");
  }

  let createdById = undefined;
  if (input.leadId) {
    const leadUser = await prisma.user.findUnique({ where: { id: input.leadId } });
    if (!leadUser) throw notFound("Project Lead User");
    createdById = leadUser.id;
  }

  return prisma.project.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      clientId: input.clientId,
      createdById: createdById,
    },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function deleteProject(user: AuthUser, id: string) {
  if (user.role !== "ADMIN") throw forbidden("Only Admins can delete projects");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw notFound("Project");
  return prisma.project.delete({ where: { id } });
}

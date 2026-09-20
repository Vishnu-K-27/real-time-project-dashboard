import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { formatActivityLine } from "../utils/format";
import { activityScopeWhere } from "./access";
import { serializeEvent } from "./taskService";

export async function listActivity(user: AuthUser, limit = 20, since?: string) {
  const events = await prisma.activityEvent.findMany({
    where: {
      AND: [
        activityScopeWhere(user),
        since ? { createdAt: { gt: new Date(since) } } : {},
      ],
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, key: true, name: true, createdById: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return events.map((event) => serializeEvent(event));
}

export async function listProjectActivity(user: AuthUser, projectId: string, limit = 20) {
  const events = await prisma.activityEvent.findMany({
    where: {
      AND: [activityScopeWhere(user), { projectId }],
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, key: true, name: true, createdById: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return events.map((event) => serializeEvent(event));
}

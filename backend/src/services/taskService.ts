import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { formatActivityLine, formatTaskCreatedLine, formatFieldChangeLine } from "../utils/format";
import { emitActivity, emitNotification, emitNotificationCount } from "../realtime";
import { assertCanManageProject, assertDeveloperAssigned, assertProjectAccess, isManager, taskScopeWhere } from "./access";

export type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
  projectId?: string;
};

export async function listTasks(user: AuthUser, filters: TaskFilters) {
  const where: Prisma.TaskWhereInput = {
    AND: [taskScopeWhere(user), filterClause(filters)],
  };
  const orderBy: Prisma.TaskOrderByWithRelationInput[] =
    user.role === "DEVELOPER"
      ? [{ priority: "desc" }, { dueDate: "asc" }]
      : [{ dueDate: "asc" }];

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy,
  });
}

export async function listProjectTasks(user: AuthUser, projectId: string, filters: TaskFilters) {
  await assertProjectAccess(user, projectId);
  const where: Prisma.TaskWhereInput = {
    AND: [{ projectId }, taskScopeWhere(user), filterClause(filters)],
  };
  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }],
  });
}

export async function getTask(user: AuthUser, id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      activityLogs: {
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!task) throw notFound("Task");
  await assertProjectAccess(user, task.projectId);
  assertDeveloperAssigned(user, task.assignedToId);
  return task;
}

export async function createTask(
  user: AuthUser,
  projectId: string,
  input: {
    title: string;
    description: string;
    assignedToId?: string | null;
    status?: TaskStatus;
    priority: TaskPriority;
    startDate?: string;
    dueDate: string;
  }
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project");
  assertCanManageProject(user, project.createdById);
  if (input.assignedToId) await assertDeveloper(input.assignedToId);

  const last = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { taskNumber: "desc" },
    select: { taskNumber: true },
  });
  const taskNumber = (last?.taskNumber ?? 0) + 1;
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const dueDate = new Date(input.dueDate);
  const isOverdue = dueDate.getTime() < Date.now() && input.status !== "DONE";

  const task = await prisma.task.create({
    data: {
      projectId,
      taskNumber,
      title: input.title,
      description: input.description,
      assignedToId: input.assignedToId ?? null,
      status: input.status ?? "TODO",
      priority: input.priority,
      startDate,
      dueDate,
      isOverdue,
    },
    include: taskInclude,
  });

  // ── Activity: task created ─────────────────────────────────────────────────
  const createdLine = formatTaskCreatedLine(user.name, task.taskNumber, task.title);
  const creationEvent = await prisma.activityEvent.create({
    data: {
      actorId: user.id,
      taskId: task.id,
      projectId: task.projectId,
      eventType: "CREATED",
      message: createdLine,
      fromStatus: null,
      toStatus: task.status,
      taskNumber: task.taskNumber,
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, key: true, name: true, createdById: true } },
    },
  });
  emitActivity(serializeEvent(creationEvent), {
    projectId: task.projectId,
    assigneeId: task.assignedToId,
    pmId: project.createdById,
  });

  if (task.assignedToId) {
    await notifyAssigned(user, task);
  }
  return task;
}

export async function patchTask(
  user: AuthUser,
  id: string,
  input: {
    title?: string;
    description?: string;
    assignedToId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    startDate?: string;
    dueDate?: string;
  }
) {
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { project: true, assignedTo: true },
  });
  if (!existing) throw notFound("Task");
  await assertProjectAccess(user, existing.projectId);
  assertDeveloperAssigned(user, existing.assignedToId);

  if (user.role === "DEVELOPER") {
    const keys = Object.keys(input).filter((k) => input[k as keyof typeof input] !== undefined);
    if (keys.some((k) => k !== "status")) {
      throw forbidden("Developers can only update task status");
    }
    if (!input.status) throw badRequest("Status is required");
  } else {
    assertCanManageProject(user, existing.project.createdById);
  }

  if (input.assignedToId) await assertDeveloper(input.assignedToId);

  const nextStatus = input.status ?? existing.status;
  const dueDate = input.dueDate ? new Date(input.dueDate) : existing.dueDate;
  const startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
  const isOverdue = nextStatus !== "DONE" && dueDate.getTime() < Date.now();

  // Detect detailed changed fields
  const changeDescriptions: string[] = [];
  if (input.title !== undefined && input.title !== existing.title) {
    changeDescriptions.push(`title from "${existing.title}" to "${input.title}"`);
  }
  if (input.description !== undefined && input.description !== existing.description) {
    const oldDesc = existing.description.length > 40 ? `${existing.description.slice(0, 37)}...` : existing.description;
    const newDesc = input.description.length > 40 ? `${input.description.slice(0, 37)}...` : input.description;
    changeDescriptions.push(`description from "${oldDesc}" to "${newDesc}"`);
  }
  if (input.priority !== undefined && input.priority !== existing.priority) {
    changeDescriptions.push(`priority from ${existing.priority} to ${input.priority}`);
  }
  if (input.startDate !== undefined && new Date(input.startDate).getTime() !== existing.startDate.getTime()) {
    changeDescriptions.push("start date");
  }
  if (input.dueDate !== undefined && new Date(input.dueDate).getTime() !== existing.dueDate.getTime()) {
    changeDescriptions.push("due date");
  }
  if (input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId) {
    changeDescriptions.push("assignee");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        assignedToId: input.assignedToId === undefined ? undefined : input.assignedToId,
        status: input.status,
        priority: input.priority,
        startDate: input.startDate ? startDate : undefined,
        dueDate: input.dueDate ? dueDate : undefined,
        isOverdue,
      },
      include: taskInclude,
    });

    if (input.status && input.status !== existing.status) {
      await tx.taskActivityLog.create({
        data: {
          taskId: task.id,
          actorId: user.id,
          fromStatus: existing.status,
          toStatus: input.status,
        },
      });
      const statusLine = formatActivityLine({
        actorName: user.name,
        taskNumber: task.taskNumber,
        fromStatus: existing.status,
        toStatus: input.status,
      });
      const event = await tx.activityEvent.create({
        data: {
          actorId: user.id,
          taskId: task.id,
          projectId: task.projectId,
          eventType: "STATUS_CHANGE",
          message: statusLine,
          fromStatus: existing.status,
          toStatus: input.status,
          taskNumber: task.taskNumber,
        },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
          project: { select: { id: true, key: true, name: true, createdById: true } },
        },
      });
      return { task, statusEvent: event, fieldEvent: null };
    }

    // ── Activity: field change (non-status edit) ───────────────────────────
    if (changeDescriptions.length > 0) {
      const fieldLine = `${user.name} updated Task #${task.taskNumber} · changed ${changeDescriptions.join(", ")}`;
      const event = await tx.activityEvent.create({
        data: {
          actorId: user.id,
          taskId: task.id,
          projectId: task.projectId,
          eventType: "FIELD_CHANGE",
          message: fieldLine,
          fromStatus: null,
          toStatus: task.status,
          taskNumber: task.taskNumber,
        },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
          project: { select: { id: true, key: true, name: true, createdById: true } },
        },
      });
      return { task, statusEvent: null, fieldEvent: event };
    }

    return { task, statusEvent: null, fieldEvent: null };
  });

  if (updated.statusEvent) {
    emitActivity(
      serializeEvent(updated.statusEvent),
      {
        projectId: existing.projectId,
        assigneeId: updated.task.assignedToId,
        pmId: existing.project.createdById,
      }
    );
    if (input.status === "IN_REVIEW") {
      await notifyInReview(user, updated.task, existing.project.createdById);
    }
  }

  if (updated.fieldEvent) {
    emitActivity(
      serializeEvent(updated.fieldEvent),
      {
        projectId: existing.projectId,
        assigneeId: updated.task.assignedToId,
        pmId: existing.project.createdById,
      }
    );
  }

  if (input.assignedToId && input.assignedToId !== existing.assignedToId) {
    await notifyAssigned(user, updated.task);
  }

  return updated.task;
}

async function assertDeveloper(userId: string) {
  const assignee = await prisma.user.findUnique({ where: { id: userId } });
  if (!assignee) throw notFound("User");
  if (assignee.role !== "DEVELOPER") throw badRequest("Tasks can only be assigned to developers");
}

async function notifyAssigned(actor: AuthUser, task: { id: string; title: string; taskNumber: number; assignedToId: string | null; project: { key: string } }) {
  if (!task.assignedToId || task.assignedToId === actor.id) return;
  const notification = await prisma.notification.create({
    data: {
      userId: task.assignedToId,
      type: "TASK_ASSIGNED",
      title: `${task.project.key}-${task.taskNumber} assigned to you`,
      body: `${actor.name} assigned “${task.title}” to you`,
      taskId: task.id,
    },
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: task.assignedToId, readAt: null },
  });
  emitNotification(task.assignedToId, notification);
  emitNotificationCount(task.assignedToId, unreadCount);
}

async function notifyInReview(
  actor: AuthUser,
  task: { id: string; title: string; taskNumber: number; project: { key: string } },
  pmId: string
) {
  if (pmId === actor.id) return;
  const notification = await prisma.notification.create({
    data: {
      userId: pmId,
      type: "TASK_IN_REVIEW",
      title: `${task.project.key}-${task.taskNumber} is in review`,
      body: `${actor.name} moved “${task.title}” to In Review`,
      taskId: task.id,
    },
  });
  const unreadCount = await prisma.notification.count({ where: { userId: pmId, readAt: null } });
  emitNotification(pmId, notification);
  emitNotificationCount(pmId, unreadCount);
}

function filterClause(filters: TaskFilters): Prisma.TaskWhereInput {
  let gteDate: Date | undefined = undefined;
  let lteDate: Date | undefined = undefined;

  if (filters.dueFrom) {
    const d = new Date(filters.dueFrom);
    if (!isNaN(d.getTime())) {
      gteDate = d;
    }
  }

  if (filters.dueTo) {
    const d = new Date(filters.dueTo);
    if (!isNaN(d.getTime())) {
      if (filters.dueTo.length <= 10) {
        d.setUTCHours(23, 59, 59, 999);
      }
      lteDate = d;
    }
  }

  const dateCond: Prisma.TaskWhereInput = {};
  if (gteDate || lteDate) {
    dateCond.dueDate = {
      gte: gteDate,
      lte: lteDate,
    };
  }

  return {
    status: filters.status,
    priority: filters.priority,
    projectId: filters.projectId,
    ...dateCond,
  };
}

const taskInclude = {
  project: { select: { id: true, key: true, name: true, createdById: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  activityLogs: { include: { actor: { select: { id: true, name: true, email: true, role: true } } } },
} as const;

export function serializeEvent(
  event: {
    id: string;
    createdAt: Date;
    taskNumber: number;
    fromStatus?: TaskStatus | null;
    toStatus?: TaskStatus | null;
    message?: string | null;
    eventType?: string | null;
    actor: { id: string; name: string };
    project: { id: string; key: string; name: string };
    taskId?: string | null;
  },
  overrideLine?: string
) {
  const line =
    overrideLine ||
    event.message ||
    (event.fromStatus !== undefined && event.fromStatus !== null && event.toStatus
      ? formatActivityLine({
          actorName: event.actor.name,
          taskNumber: event.taskNumber,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
        })
      : `${event.actor.name} updated Task #${event.taskNumber}`);
  return {
    id: event.id,
    taskId: event.taskId ?? null,
    projectId: event.project.id,
    projectKey: event.project.key,
    projectName: event.project.name,
    taskNumber: event.taskNumber,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus ?? null,
    eventType: event.eventType ?? null,
    actor: event.actor,
    createdAt: event.createdAt,
    message: line,
  };
}

export { isManager };

export async function deleteTask(user: AuthUser, id: string) {
  if (!isManager(user.role)) throw forbidden("Only Admins and Project Managers can delete tasks");
  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: { select: { id: true, key: true, name: true, createdById: true } } },
  });
  if (!task) throw notFound("Task");
  assertCanManageProject(user, task.project.createdById);

  const deleteMsg = `${user.name} deleted Task ${task.project.key}-${task.taskNumber} · "${task.title}"`;

  const deleteEvent = await prisma.activityEvent.create({
    data: {
      actorId: user.id,
      taskId: null,
      projectId: task.projectId,
      eventType: "DELETED",
      message: deleteMsg,
      fromStatus: task.status,
      toStatus: task.status,
      taskNumber: task.taskNumber,
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, key: true, name: true, createdById: true } },
    },
  });

  const res = await prisma.task.delete({ where: { id } });

  emitActivity(serializeEvent(deleteEvent), {
    projectId: task.projectId,
    pmId: task.project.createdById,
  });

  return res;
}

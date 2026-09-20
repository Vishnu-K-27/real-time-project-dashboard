import { TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { onlineCount } from "../realtime";
import { taskScopeWhere } from "./access";

const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(diff);
  return start;
};

const endOfWeek = () => {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return end;
};

export async function dashboard(user: AuthUser) {
  if (user.role === "ADMIN") return adminDashboard();
  if (user.role === "PROJECT_MANAGER") return pmDashboard(user);
  return developerDashboard(user);
}

async function adminDashboard() {
  const [projectCount, tasks, overdueCount] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.count({ where: { isOverdue: true, status: { not: "DONE" } } }),
  ]);
  return {
    role: "ADMIN" as const,
    projectCount,
    tasksByStatus: statusMap(tasks),
    overdueCount,
    onlineCount: onlineCount(),
  };
}

async function pmDashboard(user: AuthUser) {
  const projects = await prisma.project.findMany({
    where: { createdById: user.id },
    include: { client: true, _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
  const [priorityRows, dueThisWeek] = await Promise.all([
    prisma.task.groupBy({
      by: ["priority"],
      where: { project: { createdById: user.id } },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: {
        project: { createdById: user.id },
        dueDate: { gte: startOfWeek(), lt: endOfWeek() },
        status: { not: "DONE" },
      },
      include: {
        project: { select: { id: true, key: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  return {
    role: "PROJECT_MANAGER" as const,
    projects,
    tasksByPriority: priorityMap(priorityRows),
    dueThisWeek,
  };
}

async function developerDashboard(user: AuthUser) {
  const tasks = await prisma.task.findMany({
    where: taskScopeWhere(user),
    include: {
      project: { select: { id: true, key: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue = tasks.filter((t) => t.isOverdue && t.status !== "DONE").length;

  return {
    role: "DEVELOPER" as const,
    tasks,
    counts: {
      total: tasks.length,
      inProgress,
      overdue,
    },
  };
}

function statusMap(rows: { status: TaskStatus; _count: { _all: number } }[]) {
  const base: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  for (const row of rows) base[row.status] = row._count._all;
  return base;
}

function priorityMap(rows: { priority: TaskPriority; _count: { _all: number } }[]) {
  const base: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const row of rows) base[row.priority] = row._count._all;
  return base;
}

import { Role, TaskStatus } from "@prisma/client";

export function formatStatus(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    case "DONE":
      return "Done";
  }
}

export function formatActivityLine(input: {
  actorName: string;
  taskNumber: number;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
}) {
  const from = input.fromStatus ? formatStatus(input.fromStatus) : "New";
  const to = formatStatus(input.toStatus);
  return `${input.actorName} moved Task #${input.taskNumber} from ${from} → ${to}`;
}

export function formatTaskCreatedLine(actorName: string, taskNumber: number, title: string) {
  return `${actorName} created Task #${taskNumber} · "${title}"`;
}

export function formatFieldChangeLine(actorName: string, taskNumber: number, fields: string[]) {
  const joined = fields.join(", ");
  return `${actorName} updated Task #${taskNumber} · changed ${joined}`;
}

export function isStaffRole(role: Role) {
  return role === "ADMIN" || role === "PROJECT_MANAGER";
}

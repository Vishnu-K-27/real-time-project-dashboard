export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type User = { id: string; name: string; email: string; role: Role };
export type Client = { id: string; name: string; company: string; email: string };
export type Project = {
  id: string;
  name: string;
  key: string;
  description: string;
  createdById: string;
  client: Client;
  createdBy?: User;
  _count?: { tasks: number };
};
export type Task = {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate: string;
  isOverdue: boolean;
  assignedToId: string | null;
  assignedTo: User | null;
  project: { id: string; key: string; name: string; createdById: string };
  activityLogs?: Array<{
    id: string;
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    createdAt: string;
    actor: User;
  }>;
};
export type Activity = {
  id: string;
  message: string;
  createdAt: string;
  projectKey: string;
  taskNumber: number;
  taskId: string;
  projectId: string;
};
export type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  taskId: string | null;
};

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await fetch(`${API}/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const retry = await fetch(`${API}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
      const retryData = await retry.json().catch(() => ({}));
      if (!retry.ok) throw retryData.error ?? { message: "Request failed" };
      return retryData as T;
    }
  }
  if (!res.ok) throw data.error ?? { message: "Request failed" };
  return data as T;
}

export const api = {
  login: (email: string, password: string) => request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/auth/me"),
  dashboard: () => request<{ dashboard: Record<string, unknown> }>("/dashboard"),
  activity: () => request<{ activity: Activity[] }>("/activity?limit=20"),
  projectActivity: (id: string) => request<{ activity: Activity[] }>(`/projects/${id}/activity`),
  notifications: () => request<{ items: Notification[]; unreadCount: number }>("/notifications"),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifications/read-all", { method: "POST" }),
  projects: () => request<{ projects: Project[] }>("/projects"),
  project: (id: string) => request<{ project: Project }>(`/projects/${id}`),
  createProject: (body: unknown) => request<{ project: Project }>("/projects", { method: "POST", body: JSON.stringify(body) }),
  projectTasks: (id: string, qs: string) => request<{ tasks: Task[] }>(`/projects/${id}/tasks${qs}`),
  tasks: (qs: string) => request<{ tasks: Task[] }>(`/tasks${qs}`),
  task: (id: string) => request<{ task: Task }>(`/tasks/${id}`),
  patchTask: (id: string, body: unknown) => request<{ task: Task }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createTask: (projectId: string, body: unknown) => request<{ task: Task }>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  clients: () => request<{ clients: Client[] }>("/clients"),
  clientOptions: () => request<{ clients: Client[] }>("/projects/clients-options"),
  createClient: (body: unknown) => request<{ client: Client }>("/clients", { method: "POST", body: JSON.stringify(body) }),
  users: () => request<{ users: User[] }>("/users"),
  createUser: (body: unknown) => request<{ user: User }>("/users", { method: "POST", body: JSON.stringify(body) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
  developers: () => request<{ users: User[] }>("/directory/developers"),
  patchProject: (id: string, body: unknown) => request<{ project: Project }>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  leadOptions: () => request<{ leads: User[] }>("/projects/leads-options"),
  deleteProject: (id: string) => request(`/projects/${id}`, { method: "DELETE" }),
  deleteClient: (id: string) => request(`/clients/${id}`, { method: "DELETE" }),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: "DELETE" }),
};

export function statusLabel(status: TaskStatus) {
  return { TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done" }[status];
}

export function statusClass(status: TaskStatus) {
  return { TODO: "todo", IN_PROGRESS: "progress", IN_REVIEW: "review", DONE: "done" }[status];
}

export function priorityMarks(priority: TaskPriority) {
  return { LOW: "›", MEDIUM: "››", HIGH: "›››", CRITICAL: "››››" }[priority];
}

export function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(delta / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function formatRole(role?: Role | string) {
  if (!role) return "";
  switch (role) {
    case "ADMIN":
      return "Admin Lead";
    case "PROJECT_MANAGER":
      return "Project Manager";
    case "DEVELOPER":
      return "Developer";
    default:
      return String(role).replace(/_/g, " ");
  }
}

export function formatFeed(message: string, createdAt: string) {
  return `${message} · ${relativeTime(createdAt)}`;
}

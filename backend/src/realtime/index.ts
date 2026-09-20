import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { parse as parseCookie } from "cookie";
import { Role } from "@prisma/client";
import { config } from "../config";
import { verifyAccess } from "../utils/tokens";
import { ACCESS_COOKIE } from "../utils/cookies";
import { prisma } from "../prisma";

type SocketUser = { id: string; role: Role; name: string };

const socketsByUser = new Map<string, Set<string>>();
let ioRef: Server | null = null;

export function getIo() {
  if (!ioRef) throw new Error("Socket server not initialized");
  return ioRef;
}

export function onlineCount() {
  return socketsByUser.size;
}

export function initRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigin, credentials: true },
    transports: ["websocket"],
    allowUpgrades: false,
  });
  ioRef = io;

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = parseCookie(cookieHeader);
      const token = cookies[ACCESS_COOKIE];
      if (!token) return next(new Error("UNAUTHORIZED"));
      const payload = verifyAccess(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return next(new Error("UNAUTHORIZED"));
      socket.data.user = { id: user.id, role: user.role, name: user.name } satisfies SocketUser;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(`user:${user.id}`);
    if (user.role === "ADMIN") socket.join("admin");

    const projects = await visibleProjectIds(user);
    for (const projectId of projects) {
      socket.join(`project:${projectId}`);
    }

    addPresence(user.id, socket.id);
    emitPresence();

    socket.on("project:subscribe", async (projectId: string) => {
      if (typeof projectId !== "string") return;
      const allowed = await canViewProject(user, projectId);
      if (allowed) socket.join(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      removePresence(user.id, socket.id);
      emitPresence();
    });
  });

  return io;
}

async function visibleProjectIds(user: SocketUser) {
  if (user.role === "ADMIN") {
    const rows = await prisma.project.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
  if (user.role === "PROJECT_MANAGER") {
    const rows = await prisma.project.findMany({ where: { createdById: user.id }, select: { id: true } });
    return rows.map((r) => r.id);
  }
  const rows = await prisma.task.findMany({
    where: { assignedToId: user.id },
    select: { projectId: true },
    distinct: ["projectId"],
  });
  return rows.map((r) => r.projectId);
}

async function canViewProject(user: SocketUser, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "PROJECT_MANAGER") return project.createdById === user.id;
  const assigned = await prisma.task.findFirst({
    where: { projectId, assignedToId: user.id },
    select: { id: true },
  });
  return Boolean(assigned);
}

function addPresence(userId: string, socketId: string) {
  const set = socketsByUser.get(userId) ?? new Set<string>();
  set.add(socketId);
  socketsByUser.set(userId, set);
}

function removePresence(userId: string, socketId: string) {
  const set = socketsByUser.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) socketsByUser.delete(userId);
}

function emitPresence() {
  ioRef?.to("admin").emit("presence:count", { onlineCount: socketsByUser.size });
}

export function emitActivity(event: unknown, audience: { projectId: string; assigneeId?: string | null; pmId: string }) {
  const io = getIo();
  io.to("admin").emit("activity:new", event);
  io.to(`project:${audience.projectId}`).emit("activity:new", event);
  io.to(`user:${audience.pmId}`).emit("activity:new", event);
  if (audience.assigneeId) io.to(`user:${audience.assigneeId}`).emit("activity:new", event);
}

export function emitNotification(userId: string, payload: unknown) {
  getIo().to(`user:${userId}`).emit("notification:new", payload);
}

export function emitNotificationCount(userId: string, unreadCount: number) {
  getIo().to(`user:${userId}`).emit("notification:count", { unreadCount });
}

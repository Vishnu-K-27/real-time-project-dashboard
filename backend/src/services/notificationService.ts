import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { notFound } from "../utils/errors";
import { emitNotificationCount } from "../realtime";

export async function listNotifications(user: AuthUser) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markRead(user: AuthUser, id: string) {
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row || row.userId !== user.id) throw notFound("Notification");
  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  emitNotificationCount(user.id, unreadCount);
  return { unreadCount };
}

export async function markAllRead(user: AuthUser) {
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  emitNotificationCount(user.id, 0);
  return { unreadCount: 0 };
}

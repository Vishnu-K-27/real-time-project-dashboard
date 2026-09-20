import cron from "node-cron";
import { prisma } from "../prisma";

export function startOverdueJob() {
  cron.schedule("*/5 * * * *", () => {
    flagOverdueTasks().catch((err) => console.error("Overdue job failed", err));
  });
  flagOverdueTasks().catch((err) => console.error("Overdue job failed", err));
}

export async function flagOverdueTasks() {
  const result = await prisma.task.updateMany({
    where: {
      isOverdue: false,
      status: { not: "DONE" },
      dueDate: { lt: new Date() },
    },
    data: { isOverdue: true },
  });
  return result.count;
}

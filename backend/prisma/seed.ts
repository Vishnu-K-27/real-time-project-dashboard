import bcrypt from "bcryptjs";
import { PrismaClient, Task, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync("Password123!", 12);

async function main() {
  await prisma.notification.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.taskActivityLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { name: "Asha Menon", email: "admin@tide.local", passwordHash, role: "ADMIN" },
  });
  const pmMaya = await prisma.user.create({
    data: { name: "Maya Iyer", email: "maya@tide.local", passwordHash, role: "PROJECT_MANAGER" },
  });
  const pmRavi = await prisma.user.create({
    data: { name: "Ravi Nair", email: "ravi@tide.local", passwordHash, role: "PROJECT_MANAGER" },
  });
  const devLeah = await prisma.user.create({
    data: { name: "Leah Chen", email: "leah@tide.local", passwordHash, role: "DEVELOPER" },
  });
  const devOmar = await prisma.user.create({
    data: { name: "Omar Haddad", email: "omar@tide.local", passwordHash, role: "DEVELOPER" },
  });
  const devPriya = await prisma.user.create({
    data: { name: "Priya Shah", email: "priya@tide.local", passwordHash, role: "DEVELOPER" },
  });
  const devJonah = await prisma.user.create({
    data: { name: "Jonah Brooks", email: "jonah@tide.local", passwordHash, role: "DEVELOPER" },
  });

  const northwind = await prisma.client.create({
    data: { name: "Elena Voss", company: "Northwind Retail", email: "elena@northwind.example" },
  });
  const harbor = await prisma.client.create({
    data: { name: "Samir Cole", company: "Harbor Health", email: "samir@harbor.example" },
  });
  const lark = await prisma.client.create({
    data: { name: "Ines Duarte", company: "Lark Media", email: "ines@lark.example" },
  });

  const aurora = await prisma.project.create({
    data: {
      name: "Aurora Storefront",
      key: "AUR",
      description: "Rebuild the Northwind storefront checkout and catalog search.",
      clientId: northwind.id,
      createdById: pmMaya.id,
    },
  });
  const kelp = await prisma.project.create({
    data: {
      name: "Kelp Patient Portal",
      key: "KEL",
      description: "Patient intake, visit notes, and appointment reminders for Harbor Health.",
      clientId: harbor.id,
      createdById: pmMaya.id,
    },
  });
  const lumen = await prisma.project.create({
    data: {
      name: "Lumen Editorial Desk",
      key: "LUM",
      description: "Editorial calendar and review workflow for Lark Media.",
      clientId: lark.id,
      createdById: pmRavi.id,
    },
  });

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
  const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

  type SeedTask = {
    projectId: string;
    taskNumber: number;
    title: string;
    description: string;
    assignedToId: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    isOverdue?: boolean;
  };

  const taskDefs: SeedTask[] = [
    { projectId: aurora.id, taskNumber: 1, title: "Map checkout states", description: "Document happy path and decline paths for card payments.", assignedToId: devLeah.id, status: "DONE", priority: "HIGH", dueDate: daysAgo(12) },
    { projectId: aurora.id, taskNumber: 2, title: "Address autocomplete", description: "Wire postal lookup without blocking empty apartments.", assignedToId: devOmar.id, status: "IN_REVIEW", priority: "MEDIUM", dueDate: daysFromNow(2) },
    { projectId: aurora.id, taskNumber: 3, title: "Catalog facet search", description: "Filter by size, dye lot, and warehouse.", assignedToId: devLeah.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: daysFromNow(4) },
    { projectId: aurora.id, taskNumber: 4, title: "Gift card ledger", description: "Prevent double-spend on concurrent redemptions.", assignedToId: devPriya.id, status: "TODO", priority: "CRITICAL", dueDate: daysAgo(3), isOverdue: true },
    { projectId: aurora.id, taskNumber: 5, title: "Order email tone pass", description: "Rewrite confirmation copy to match Northwind voice.", assignedToId: devOmar.id, status: "TODO", priority: "LOW", dueDate: daysFromNow(9) },
    { projectId: aurora.id, taskNumber: 6, title: "Inventory hold TTL", description: "Release unpaid holds after twenty minutes.", assignedToId: devLeah.id, status: "IN_PROGRESS", priority: "MEDIUM", dueDate: daysFromNow(1) },
    { projectId: kelp.id, taskNumber: 1, title: "Intake form schema", description: "Capture insurance, pharmacy, and emergency contact.", assignedToId: devPriya.id, status: "DONE", priority: "HIGH", dueDate: daysAgo(20) },
    { projectId: kelp.id, taskNumber: 2, title: "Visit note templates", description: "GP, physio, and follow-up templates.", assignedToId: devJonah.id, status: "IN_PROGRESS", priority: "MEDIUM", dueDate: daysFromNow(3) },
    { projectId: kelp.id, taskNumber: 3, title: "Reminder SMS copy", description: "Keep messages under 160 characters, no PHI.", assignedToId: devPriya.id, status: "IN_REVIEW", priority: "LOW", dueDate: daysFromNow(5) },
    { projectId: kelp.id, taskNumber: 4, title: "Accessibility contrast", description: "Portal fails WCAG on the sand background.", assignedToId: devJonah.id, status: "TODO", priority: "HIGH", dueDate: daysAgo(1), isOverdue: true },
    { projectId: kelp.id, taskNumber: 5, title: "Clinician print view", description: "Quiet print stylesheet for visit notes.", assignedToId: devPriya.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(8) },
    { projectId: lumen.id, taskNumber: 1, title: "Calendar drag-drop", description: "Move stories between weeks without losing assignee.", assignedToId: devOmar.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: daysFromNow(2) },
    { projectId: lumen.id, taskNumber: 2, title: "Reviewer checklist", description: "Legal, photo rights, and headline length.", assignedToId: devJonah.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(6) },
    { projectId: lumen.id, taskNumber: 3, title: "Embargo watermark", description: "Show embargo until publish time on drafts.", assignedToId: devOmar.id, status: "IN_REVIEW", priority: "CRITICAL", dueDate: daysFromNow(1) },
    { projectId: lumen.id, taskNumber: 4, title: "Author bio block", description: "Pull bio from CMS, fallback to desk default.", assignedToId: devJonah.id, status: "DONE", priority: "LOW", dueDate: daysAgo(4) },
    { projectId: lumen.id, taskNumber: 5, title: "Slack publish ping", description: "Post to #desk-live after a story ships.", assignedToId: devOmar.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(10) },
  ];

  const tasks: Task[] = [];
  for (const def of taskDefs) {
    tasks.push(
      await prisma.task.create({
        data: {
          ...def,
          isOverdue: def.isOverdue ?? false,
        },
      })
    );
  }

  const byKey = (projectId: string, n: number) => tasks.find((t) => t.projectId === projectId && t.taskNumber === n)!;

  const moves: { task: (typeof tasks)[0]; actorId: string; from: TaskStatus | null; to: TaskStatus; hoursAgo: number }[] = [
    { task: byKey(aurora.id, 1), actorId: devLeah.id, from: "TODO", to: "IN_PROGRESS", hoursAgo: 80 },
    { task: byKey(aurora.id, 1), actorId: devLeah.id, from: "IN_PROGRESS", to: "IN_REVIEW", hoursAgo: 50 },
    { task: byKey(aurora.id, 1), actorId: pmMaya.id, from: "IN_REVIEW", to: "DONE", hoursAgo: 30 },
    { task: byKey(aurora.id, 2), actorId: devOmar.id, from: "TODO", to: "IN_PROGRESS", hoursAgo: 20 },
    { task: byKey(aurora.id, 2), actorId: devOmar.id, from: "IN_PROGRESS", to: "IN_REVIEW", hoursAgo: 4 },
    { task: byKey(aurora.id, 3), actorId: devLeah.id, from: "TODO", to: "IN_PROGRESS", hoursAgo: 6 },
    { task: byKey(kelp.id, 2), actorId: devJonah.id, from: "TODO", to: "IN_PROGRESS", hoursAgo: 12 },
    { task: byKey(kelp.id, 3), actorId: devPriya.id, from: "IN_PROGRESS", to: "IN_REVIEW", hoursAgo: 3 },
    { task: byKey(lumen.id, 1), actorId: pmRavi.id, from: "TODO", to: "IN_PROGRESS", hoursAgo: 18 },
    { task: byKey(lumen.id, 3), actorId: devOmar.id, from: "IN_PROGRESS", to: "IN_REVIEW", hoursAgo: 2 },
    { task: byKey(lumen.id, 4), actorId: pmRavi.id, from: "IN_REVIEW", to: "DONE", hoursAgo: 40 },
  ];

  for (const move of moves) {
    const createdAt = new Date(Date.now() - move.hoursAgo * 3600000);
    await prisma.taskActivityLog.create({
      data: {
        taskId: move.task.id,
        actorId: move.actorId,
        fromStatus: move.from,
        toStatus: move.to,
        createdAt,
      },
    });
    await prisma.activityEvent.create({
      data: {
        actorId: move.actorId,
        taskId: move.task.id,
        projectId: move.task.projectId,
        fromStatus: move.from,
        toStatus: move.to,
        taskNumber: move.task.taskNumber,
        createdAt,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: devOmar.id,
        type: "TASK_ASSIGNED",
        title: "AUR-2 assigned to you",
        body: "Maya Iyer assigned “Address autocomplete” to you",
        taskId: byKey(aurora.id, 2).id,
      },
      {
        userId: pmMaya.id,
        type: "TASK_IN_REVIEW",
        title: "AUR-2 is in review",
        body: "Omar Haddad moved “Address autocomplete” to In Review",
        taskId: byKey(aurora.id, 2).id,
      },
      {
        userId: pmRavi.id,
        type: "TASK_IN_REVIEW",
        title: "LUM-3 is in review",
        body: "Omar Haddad moved “Embargo watermark” to In Review",
        taskId: byKey(lumen.id, 3).id,
      },
      {
        userId: admin.id,
        type: "TASK_IN_REVIEW",
        title: "KEL-3 is in review",
        body: "Priya Shah moved “Reminder SMS copy” to In Review",
        taskId: byKey(kelp.id, 3).id,
        readAt: new Date(),
      },
    ],
  });

  console.log("Seed complete. Demo accounts use password Password123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam, projectPatchSchema, projectSchema, taskCreateSchema, taskFilterQuery } from "../validators";
import { createProject, deleteProject, getProject, listProjects, patchProject } from "../services/projectService";
import { createTask, listProjectTasks } from "../services/taskService";
import { listProjectActivity } from "../services/activityService";
import { listClients } from "../services/clientService";
import { prisma } from "../prisma";

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.get("/clients-options", requireRole("ADMIN", "PROJECT_MANAGER"), async (_req, res, next) => {
  try {
    res.json({ clients: await listClients() });
  } catch (err) {
    next(err);
  }
});

projectRouter.get("/leads-options", requireRole("ADMIN", "PROJECT_MANAGER"), async (_req, res, next) => {
  try {
    const leads = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "PROJECT_MANAGER"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json({ leads });
  } catch (err) {
    next(err);
  }
});

projectRouter.get("/", async (req, res, next) => {
  try {
    res.json({ projects: await listProjects(req.user!) });
  } catch (err) {
    next(err);
  }
});

projectRouter.post("/", requireRole("ADMIN", "PROJECT_MANAGER"), validate(projectSchema), async (req, res, next) => {
  try {
    const project = await createProject(req.user!, req.body);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

projectRouter.get("/:id", validate(idParam, "params"), async (req, res, next) => {
  try {
    const project = await getProject(req.user!, req.params.id);
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

projectRouter.patch("/:id", requireRole("ADMIN", "PROJECT_MANAGER"), validate(idParam, "params"), validate(projectPatchSchema), async (req, res, next) => {
  try {
    const project = await patchProject(req.user!, req.params.id, req.body);
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

projectRouter.get("/:id/tasks", validate(idParam, "params"), validate(taskFilterQuery, "query"), async (req, res, next) => {
  try {
    const tasks = await listProjectTasks(req.user!, req.params.id, req.query as never);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

projectRouter.post("/:id/tasks", requireRole("ADMIN", "PROJECT_MANAGER"), validate(idParam, "params"), validate(taskCreateSchema), async (req, res, next) => {
  try {
    const task = await createTask(req.user!, req.params.id, req.body);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

projectRouter.get("/:id/activity", validate(idParam, "params"), async (req, res, next) => {
  try {
    const activity = await listProjectActivity(req.user!, req.params.id, 20);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

projectRouter.delete("/:id", requireRole("ADMIN"), validate(idParam, "params"), async (req, res, next) => {
  try {
    await deleteProject(req.user!, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

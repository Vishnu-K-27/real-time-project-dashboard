import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam, taskFilterQuery, taskPatchSchema } from "../validators";
import { deleteTask, getTask, listTasks, patchTask } from "../services/taskService";

export const taskRouter = Router();

taskRouter.use(requireAuth);

taskRouter.get("/", validate(taskFilterQuery, "query"), async (req, res, next) => {
  try {
    const tasks = await listTasks(req.user!, req.query as never);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

taskRouter.get("/:id", validate(idParam, "params"), async (req, res, next) => {
  try {
    const task = await getTask(req.user!, req.params.id);
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

taskRouter.patch("/:id", validate(idParam, "params"), validate(taskPatchSchema), async (req, res, next) => {
  try {
    const task = await patchTask(req.user!, req.params.id, req.body);
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

taskRouter.delete("/:id", validate(idParam, "params"), async (req, res, next) => {
  try {
    await deleteTask(req.user!, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

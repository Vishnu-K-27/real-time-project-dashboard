import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationQuery } from "../validators";
import { listActivity } from "../services/activityService";
import { listNotifications, markAllRead, markRead } from "../services/notificationService";
import { dashboard } from "../services/dashboardService";
import { idParam } from "../validators";
import { requireRole } from "../middleware/auth";
import { listDevelopers } from "../services/userService";

export const miscRouter = Router();

miscRouter.use(requireAuth);

miscRouter.get("/directory/developers", requireRole("ADMIN", "PROJECT_MANAGER"), async (_req, res, next) => {
  try {
    res.json({ users: await listDevelopers() });
  } catch (err) {
    next(err);
  }
});

miscRouter.get("/dashboard", async (req, res, next) => {
  try {
    res.json({ dashboard: await dashboard(req.user!) });
  } catch (err) {
    next(err);
  }
});

miscRouter.get("/activity", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 20);
    const since = req.query.since as string | undefined;
    res.json({ activity: await listActivity(req.user!, limit, since) });
  } catch (err) {
    next(err);
  }
});

miscRouter.get("/notifications", async (req, res, next) => {
  try {
    res.json(await listNotifications(req.user!));
  } catch (err) {
    next(err);
  }
});

miscRouter.patch("/notifications/:id/read", validate(idParam, "params"), async (req, res, next) => {
  try {
    res.json(await markRead(req.user!, req.params.id));
  } catch (err) {
    next(err);
  }
});

miscRouter.post("/notifications/read-all", async (req, res, next) => {
  try {
    res.json(await markAllRead(req.user!));
  } catch (err) {
    next(err);
  }
});

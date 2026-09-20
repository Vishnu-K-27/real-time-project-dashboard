import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam, userCreateSchema, userPatchSchema } from "../validators";
import { createUser, deleteUser, listUsers, patchUser } from "../services/userService";
import { forbidden } from "../utils/errors";

export const userRouter = Router();

userRouter.use(requireAuth);

// List all users — ADMIN only
userRouter.get("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    res.json({ users: await listUsers(req.user!) });
  } catch (err) {
    next(err);
  }
});

// Create user — ADMIN can create any role; PROJECT_MANAGER can only create DEVELOPER
userRouter.post("/", requireRole("ADMIN", "PROJECT_MANAGER"), validate(userCreateSchema), async (req, res, next) => {
  try {
    if (req.user!.role === "PROJECT_MANAGER" && req.body.role !== "DEVELOPER") {
      return next(forbidden("Project Managers can only onboard Developers"));
    }
    const user = await createUser(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// Patch user — ADMIN only
userRouter.patch("/:id", requireRole("ADMIN"), validate(idParam, "params"), validate(userPatchSchema), async (req, res, next) => {
  try {
    const user = await patchUser(req.params.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// Delete user — ADMIN only, cannot self-delete
userRouter.delete("/:id", requireRole("ADMIN"), validate(idParam, "params"), async (req, res, next) => {
  try {
    await deleteUser(req.user!, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

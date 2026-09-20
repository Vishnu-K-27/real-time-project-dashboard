import { Router } from "express";
import { login, logout, publicUser, refresh } from "../services/authService";
import { validate } from "../middleware/validate";
import { loginSchema } from "../validators";
import { requireAuth } from "../middleware/auth";
import { REFRESH_COOKIE } from "../utils/cookies";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const user = await login(req.body.email, req.body.password, res);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const user = await refresh(req.cookies?.[REFRESH_COOKIE], res);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await logout(req.cookies?.[REFRESH_COOKIE], res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

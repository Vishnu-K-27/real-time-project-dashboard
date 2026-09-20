import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/users";
import { clientRouter } from "./routes/clients";
import { projectRouter } from "./routes/projects";
import { taskRouter } from "./routes/tasks";
import { miscRouter } from "./routes/misc";
import { errorHandler } from "./utils/errorHandler";

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", authRouter);
  app.use("/users", userRouter);
  app.use("/clients", clientRouter);
  app.use("/projects", projectRouter);
  app.use("/tasks", taskRouter);
  app.use("/", miscRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
  app.use(errorHandler);
  return app;
}

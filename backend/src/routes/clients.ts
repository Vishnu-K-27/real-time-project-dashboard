import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { clientSchema, idParam } from "../validators";
import { createClient, deleteClient, listClients, patchClient } from "../services/clientService";

export const clientRouter = Router();

clientRouter.use(requireAuth, requireRole("ADMIN"));

clientRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ clients: await listClients() });
  } catch (err) {
    next(err);
  }
});

clientRouter.post("/", validate(clientSchema), async (req, res, next) => {
  try {
    const client = await createClient(req.body);
    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
});

clientRouter.patch("/:id", validate(idParam, "params"), validate(clientSchema.partial()), async (req, res, next) => {
  try {
    const client = await patchClient(req.params.id, req.body);
    res.json({ client });
  } catch (err) {
    next(err);
  }
});

clientRouter.delete("/:id", validate(idParam, "params"), async (req, res, next) => {
  try {
    await deleteClient(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

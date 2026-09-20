import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { ACCESS_COOKIE } from "../utils/cookies";
import { verifyAccess } from "../utils/tokens";
import { forbidden, unauthorized } from "../utils/errors";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw unauthorized();
    const payload = verifyAccess(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw unauthorized();
    req.user = user;
    next();
  } catch {
    next(unauthorized());
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

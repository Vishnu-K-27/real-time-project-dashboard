import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieBase } from "../utils/cookies";
import { refreshExpiryDate, signAccessToken, signRefreshToken, verifyRefresh } from "../utils/tokens";
import { badRequest, unauthorized } from "../utils/errors";
import { Response } from "express";

const SALT_ROUNDS = 12;

export function publicUser(user: { id: string; name: string; email: string; role: Role }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function login(email: string, password: string, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw unauthorized("Invalid email or password");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid email or password");
  await issueSession(user.id, user.role, res);
  return publicUser(user);
}

export async function refresh(refreshToken: string | undefined, res: Response) {
  if (!refreshToken) throw unauthorized();
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw unauthorized();
  }
  const hash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { id: payload.tid, userId: payload.sub, tokenHash: hash },
    include: { user: true },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw unauthorized();
  }
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  await issueSession(stored.user.id, stored.user.role, res);
  return publicUser(stored.user);
}

export async function logout(refreshToken: string | undefined, res: Response) {
  if (refreshToken) {
    try {
      const payload = verifyRefresh(refreshToken);
      await prisma.refreshToken.deleteMany({ where: { id: payload.tid, userId: payload.sub } });
    } catch {
      // already invalid
    }
  }
  clearSession(res);
}

async function issueSession(userId: string, role: Role, res: Response) {
  const tokenRow = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: "pending",
      expiresAt: refreshExpiryDate(),
    },
  });
  const refreshJwt = signRefreshToken(userId, tokenRow.id);
  await prisma.refreshToken.update({
    where: { id: tokenRow.id },
    data: { tokenHash: hashToken(refreshJwt) },
  });
  const accessJwt = signAccessToken(userId, role);
  const base = cookieBase();
  res.cookie(ACCESS_COOKIE, accessJwt, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshJwt, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearSession(res: Response) {
  const base = cookieBase();
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  if (!password || password.length < 8) throw badRequest("Password must be at least 8 characters");
  return bcrypt.hash(password, SALT_ROUNDS);
}

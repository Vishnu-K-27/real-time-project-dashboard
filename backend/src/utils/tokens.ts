import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { config } from "../config";

export type AccessPayload = {
  sub: string;
  role: Role;
  typ: "access";
};

export type RefreshPayload = {
  sub: string;
  tid: string;
  typ: "refresh";
};

export function signAccessToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role, typ: "access" } satisfies AccessPayload, config.jwtAccessSecret, {
    expiresIn: config.accessTtl as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: string, tokenId: string) {
  return jwt.sign({ sub: userId, tid: tokenId, typ: "refresh" } satisfies RefreshPayload, config.jwtRefreshSecret, {
    expiresIn: config.refreshTtl as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccess(token: string) {
  const payload = jwt.verify(token, config.jwtAccessSecret) as AccessPayload;
  if (payload.typ !== "access") throw new Error("Invalid token type");
  return payload;
}

export function verifyRefresh(token: string) {
  const payload = jwt.verify(token, config.jwtRefreshSecret) as RefreshPayload;
  if (payload.typ !== "refresh") throw new Error("Invalid token type");
  return payload;
}

export function refreshExpiryDate() {
  const ms = parseDuration(config.refreshTtl);
  return new Date(Date.now() + ms);
}

function parseDuration(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * map[unit];
}

import { CookieOptions } from "express";
import { config } from "../config";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export function cookieBase(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSecure ? "none" : "lax",
    path: "/",
  };
}

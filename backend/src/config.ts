import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
};

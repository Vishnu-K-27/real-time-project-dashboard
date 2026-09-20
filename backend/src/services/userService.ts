import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { conflict, notFound } from "../utils/errors";
import { hashPassword } from "./authService";

export async function listDevelopers() {
  return prisma.user.findMany({
    where: { role: "DEVELOPER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function listUsers(_actor: AuthUser) {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function createUser(input: { name: string; email: string; password: string; role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (exists) throw conflict("A user with that email already exists");
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return user;
}

export async function patchUser(id: string, input: { name?: string; email?: string; role?: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User");
  if (input.email) {
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists && exists.id !== id) throw conflict("A user with that email already exists");
  }
  return prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email?.toLowerCase(),
      role: input.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteUser(actor: AuthUser, id: string) {
  if (actor.id === id) throw conflict("You cannot delete your own account");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User");
  return prisma.user.delete({ where: { id } });
}

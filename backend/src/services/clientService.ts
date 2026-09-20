import { prisma } from "../prisma";
import { conflict, notFound } from "../utils/errors";

export function listClients() {
  return prisma.client.findMany({ orderBy: { name: "asc" } });
}

export function createClient(input: { name: string; company: string; email: string }) {
  return prisma.client.create({ data: input });
}

export async function patchClient(id: string, input: { name?: string; company?: string; email?: string }) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw notFound("Client");
  return prisma.client.update({ where: { id }, data: input });
}

export async function deleteClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id }, include: { projects: { select: { id: true } } } });
  if (!client) throw notFound("Client");
  if (client.projects.length > 0)
    throw conflict(`Cannot delete client — ${client.projects.length} project(s) are linked to them. Delete or reassign those projects first.`);
  return prisma.client.delete({ where: { id } });
}

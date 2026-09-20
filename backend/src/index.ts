import http from "http";
import { config } from "./config";
import { createApp } from "./app";
import { initRealtime } from "./realtime";
import { startOverdueJob } from "./jobs/overdue";
import { prisma } from "./prisma";

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);
  startOverdueJob();

  server.listen(config.port, () => {
    console.log(`Tide API listening on ${config.port}`);
  });
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

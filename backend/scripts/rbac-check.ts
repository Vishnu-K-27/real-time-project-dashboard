import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function login(email: string, password: string) {
  const res = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const json = await res.json();
  return { status: res.status, json, cookie: setCookie };
}

function cookieHeader(setCookie: string) {
  return setCookie
    .split(/,(?=\s*(?:access_token|refresh_token)=)/)
    .map((part) => part.split(";")[0])
    .join("; ");
}

async function authed(path: string, cookie: string) {
  const res = await fetch(`http://localhost:4000${path}`, { headers: { Cookie: cookie } });
  return { status: res.status, json: await res.json() };
}

async function main() {
  const admin = await login("admin@tide.local", "Password123!");
  const maya = await login("maya@tide.local", "Password123!");
  const ravi = await login("ravi@tide.local", "Password123!");
  const leah = await login("leah@tide.local", "Password123!");
  if (admin.status !== 200 || maya.status !== 200 || ravi.status !== 200 || leah.status !== 200) {
    throw new Error("Login failed — is the API running and seeded?");
  }

  const adminC = cookieHeader(String(admin.cookie));
  const mayaC = cookieHeader(String(maya.cookie));
  const raviC = cookieHeader(String(ravi.cookie));
  const leahC = cookieHeader(String(leah.cookie));

  const projects = await prisma.project.findMany({ include: { tasks: true } });
  const raviProject = projects.find((p) => p.key === "LUM")!;
  const mayaProject = projects.find((p) => p.key === "AUR")!;
  const leahTask = mayaProject.tasks.find((t) => t.taskNumber === 3)!;
  const omarTask = mayaProject.tasks.find((t) => t.taskNumber === 2)!;
  const lumenTask = raviProject.tasks[0];

  const cases: { name: string; ok: boolean; detail: string }[] = [];

  const pmSeesOther = await authed(`/projects/${raviProject.id}`, mayaC);
  cases.push({
    name: "PM cannot open another PM project",
    ok: pmSeesOther.status === 403,
    detail: `status ${pmSeesOther.status}`,
  });

  const devSeesForeign = await authed(`/tasks/${lumenTask.id}`, leahC);
  cases.push({
    name: "Developer cannot open another developer's task",
    ok: devSeesForeign.status === 403,
    detail: `status ${devSeesForeign.status}`,
  });

  const devSeesOwn = await authed(`/tasks/${leahTask.id}`, leahC);
  cases.push({
    name: "Developer can open assigned task",
    ok: devSeesOwn.status === 200,
    detail: `status ${devSeesOwn.status}`,
  });

  const devSeesUnassigned = await authed(`/tasks/${omarTask.id}`, leahC);
  cases.push({
    name: "Developer cannot open teammate task on same project",
    ok: devSeesUnassigned.status === 403,
    detail: `status ${devSeesUnassigned.status}`,
  });

  const usersAsPm = await authed("/users", mayaC);
  cases.push({
    name: "PM cannot list users",
    ok: usersAsPm.status === 403,
    detail: `status ${usersAsPm.status}`,
  });

  const usersAsAdmin = await authed("/users", adminC);
  cases.push({
    name: "Admin can list users",
    ok: usersAsAdmin.status === 200 && Array.isArray(usersAsAdmin.json.users),
    detail: `status ${usersAsAdmin.status}`,
  });

  const activityDev = await authed("/activity?limit=20", leahC);
  const leak = (activityDev.json.activity ?? []).some((e: { projectKey: string }) => e.projectKey === "LUM");
  cases.push({
    name: "Developer activity does not include other projects",
    ok: activityDev.status === 200 && !leak,
    detail: leak ? "LUM events leaked" : "ok",
  });

  const failed = cases.filter((c) => !c.ok);
  for (const c of cases) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name} (${c.detail})`);
  }
  if (failed.length) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Activity, Task, TaskStatus } from "../api";
import { useAuth } from "../auth";
import { Pulse } from "../components/Pulse";
import { TaskTable } from "../components/TaskTable";
import { TaskDrawer } from "../components/TaskDrawer";

interface AdminDashboardData {
  projectCount?: number;
  totalProjects?: number;
  tasksByStatus: Record<TaskStatus, number>;
  totalTasks?: number;
  overdueCount: number;
}

interface PmDashboardData {
  projects: Array<{
    id: string;
    key: string;
    name: string;
    client: { name: string; company: string };
    taskCount?: number;
    _count?: { tasks: number };
    overdueCount?: number;
  }>;
  tasksByPriority?: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  priorityCounts?: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  dueThisWeek: Task[];
}

interface DevDashboardData {
  tasks: Task[];
  counts: { total: number; overdue: number; inProgress: number };
}

export function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [dashRes, actRes] = await Promise.all([api.dashboard(), api.activity()]);
      setData(dashRes.dashboard);
      setActivity(actRes.activity);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div style={{ padding: 32, color: "var(--muted)" }}>Loading workbench overview…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div className="err">{error}</div>
        <button className="btn ghost small" style={{ marginTop: 12 }} onClick={loadData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="content">
      <main className="workspace-main">
        {user?.role === "ADMIN" && <AdminView data={data as AdminDashboardData} onOpenTask={setActiveTask} />}
        {user?.role === "PROJECT_MANAGER" && <PmView data={data as PmDashboardData} onOpenTask={setActiveTask} />}
        {user?.role === "DEVELOPER" && <DevView data={data as DevDashboardData} onOpenTask={setActiveTask} />}
      </main>

      <Pulse
        title={user?.role === "ADMIN" ? "Studio-wide movements" : user?.role === "PROJECT_MANAGER" ? "Your projects pulse" : "Your task pulse"}
        items={activity}
        onItems={setActivity}
      />

      {activeTask && (
        <TaskDrawer
          taskId={activeTask.id}
          onClose={() => setActiveTask(null)}
          onChanged={() => {
            loadData();
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
}

function AdminView({ data }: { data: AdminDashboardData; onOpenTask: (t: Task) => void }) {
  const taskCountTotal = Object.values(data?.tasksByStatus || {}).reduce((a, b) => a + b, 0);
  const total = taskCountTotal || 1;
  const todoPct = ((data?.tasksByStatus?.TODO || 0) / total) * 100;
  const progPct = ((data?.tasksByStatus?.IN_PROGRESS || 0) / total) * 100;
  const revPct = ((data?.tasksByStatus?.IN_REVIEW || 0) / total) * 100;
  const donePct = ((data?.tasksByStatus?.DONE || 0) / total) * 100;

  return (
    <div>
      <div className="hero">
        <div className="panel">
          <h3>Active Projects</h3>
          <div className="stat">{data?.projectCount ?? data?.totalProjects ?? 0}</div>
          <div style={{ marginTop: 12 }}>
            <Link to="/projects" className="btn ghost small">View all projects &rarr;</Link>
          </div>
        </div>

        <div className="panel">
          <h3>Work in Flight</h3>
          <div className="stat">{taskCountTotal}</div>
          <div className="ink-bar">
            <span style={{ width: `${todoPct}%`, background: "var(--stone)" }} title={`To Do: ${data?.tasksByStatus?.TODO || 0}`} />
            <span style={{ width: `${progPct}%`, background: "var(--teal)" }} title={`In Progress: ${data?.tasksByStatus?.IN_PROGRESS || 0}`} />
            <span style={{ width: `${revPct}%`, background: "var(--ochre)" }} title={`In Review: ${data?.tasksByStatus?.IN_REVIEW || 0}`} />
            <span style={{ width: `${donePct}%`, background: "var(--done)" }} title={`Done: ${data?.tasksByStatus?.DONE || 0}`} />
          </div>
          <div className="legend">
            <span>&bull; To Do ({data?.tasksByStatus?.TODO || 0})</span>
            <span>&bull; In Progress ({data?.tasksByStatus?.IN_PROGRESS || 0})</span>
            <span>&bull; In Review ({data?.tasksByStatus?.IN_REVIEW || 0})</span>
            <span>&bull; Done ({data?.tasksByStatus?.DONE || 0})</span>
          </div>
        </div>

        <div className="panel">
          <h3>Overdue Tasks</h3>
          <div className="stat" style={{ color: (data?.overdueCount || 0) > 0 ? "var(--brick)" : "inherit" }}>
            {data?.overdueCount ?? 0}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Automatically flagged via scheduler
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 20, margin: 0, fontWeight: 500 }}>Desk Quick Access</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/clients" className="btn ghost small">Clients</Link>
            <Link to="/team" className="btn ghost small">Team</Link>
            <Link to="/projects" className="btn small">All Projects</Link>
          </div>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
          As desk lead, you have unrestricted visibility over all client accounts, team operations, and project delivery.
        </p>
      </div>
    </div>
  );
}

function PmView({ data, onOpenTask }: { data: PmDashboardData; onOpenTask: (t: Task) => void }) {
  const priorities = data?.tasksByPriority ?? data?.priorityCounts ?? { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

  return (
    <div>
      <div className="hero">
        <div className="panel">
          <h3>Your Projects</h3>
          <div className="stat">{data?.projects?.length ?? 0}</div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Isolated to projects you created</p>
        </div>

        <div className="panel">
          <h3>Urgent Focus</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Critical</div>
              <div style={{ fontSize: 24, fontFamily: "var(--display)", color: "var(--brick)" }}>
                {priorities.CRITICAL ?? 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>High</div>
              <div style={{ fontSize: 24, fontFamily: "var(--display)", color: "var(--copper)" }}>
                {priorities.HIGH ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Due This Week</h3>
          <div className="stat">{data?.dueThisWeek?.length ?? 0}</div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Upcoming delivery milestones</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ fontFamily: "var(--display)", fontSize: 20, margin: "0 0 14px", fontWeight: 500 }}>
          Managed Projects
        </h2>
        {(!data?.projects || data.projects.length === 0) && (
          <div className="empty">No projects created yet. Use Projects page to begin.</div>
        )}
        {data?.projects && data.projects.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Project</th>
                <th>Client</th>
                <th>Tasks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p) => (
                <tr key={p.id}>
                  <td className="key">{p.key}</td>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.client?.name} ({p.client?.company})</td>
                  <td>{p._count?.tasks ?? p.taskCount ?? 0} tasks</td>
                  <td>
                    <Link to={`/projects/${p.id}`} className="btn ghost small">Open &rarr;</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data?.dueThisWeek && data.dueThisWeek.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 20, margin: "0 0 14px", fontWeight: 500 }}>
            Due This Week
          </h2>
          <TaskTable tasks={data.dueThisWeek} onOpen={onOpenTask} />
        </div>
      )}
    </div>
  );
}

function DevView({ data, onOpenTask }: { data: DevDashboardData; onOpenTask: (t: Task) => void }) {
  const tasks = data?.tasks || [];
  const total = data?.counts?.total ?? tasks.length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue = tasks.filter((t) => t.isOverdue && t.status !== "DONE").length;

  return (
    <div>
      <div className="hero">
        <div className="panel">
          <h3>Assigned Work</h3>
          <div className="stat">{total}</div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Sorted by priority then due date</p>
        </div>

        <div className="panel">
          <h3>In Progress</h3>
          <div className="stat" style={{ color: "var(--teal)" }}>
            {inProgress}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Actively moving</p>
        </div>

        <div className="panel">
          <h3>Overdue</h3>
          <div className="stat" style={{ color: overdue > 0 ? "var(--brick)" : "inherit" }}>
            {overdue}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Needs immediate completion</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 20, margin: 0, fontWeight: 500 }}>
            Your Work Queue
          </h2>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Click any row to update status</span>
        </div>
        {tasks.length === 0 ? (
          <div className="empty">No tasks currently assigned to you.</div>
        ) : (
          <TaskTable tasks={tasks} onOpen={onOpenTask} />
        )}
      </div>
    </div>
  );
}

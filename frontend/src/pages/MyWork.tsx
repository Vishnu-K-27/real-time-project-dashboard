import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Activity, Task } from "../api";
import { Pulse } from "../components/Pulse";
import { TaskTable } from "../components/TaskTable";
import { TaskDrawer } from "../components/TaskDrawer";

export function MyWork() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const statusFilter = searchParams.get("status") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "";
  const dueFrom = searchParams.get("dueFrom") ?? "";
  const dueTo = searchParams.get("dueTo") ?? "";

  function updateFilter(key: string, val: string) {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const [taskRes, actRes] = await Promise.all([api.tasks(qs), api.activity()]);
      setTasks(taskRes.tasks);
      setActivity(actRes.activity);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load assigned work");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  return (
    <div className="content">
      <main className="workspace-main">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 32, margin: "0 0 6px", fontWeight: 500 }}>
            My Work
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Tasks assigned directly to you across all projects, ordered by urgency.
          </p>
        </div>

        {/* Shareable Filter Bar */}
        <div className="panel" style={{ padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
            Filters
          </div>
          <div className="filters">
            <select value={statusFilter} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>

            <select value={priorityFilter} onChange={(e) => updateFilter("priority", e.target.value)}>
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <input
              type="date"
              placeholder="Due from"
              value={dueFrom}
              onChange={(e) => updateFilter("dueFrom", e.target.value)}
            />

            <input
              type="date"
              placeholder="Due to"
              value={dueTo}
              onChange={(e) => updateFilter("dueTo", e.target.value)}
            />

            {(statusFilter || priorityFilter || dueFrom || dueTo) && (
              <button className="btn ghost small" onClick={() => setSearchParams(new URLSearchParams())}>
                Reset
              </button>
            )}
          </div>
        </div>

        {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="panel">
          {loading && <div style={{ color: "var(--muted)" }}>Loading work…</div>}
          {!loading && tasks.length === 0 && (
            <div className="empty">No tasks match your current filter selection.</div>
          )}
          {!loading && tasks.length > 0 && (
            <TaskTable tasks={tasks} onOpen={setActiveTask} />
          )}
        </div>
      </main>

      <Pulse title="Your Activity Pulse" items={activity} onItems={setActivity} />

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

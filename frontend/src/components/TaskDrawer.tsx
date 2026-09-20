import { FormEvent, useEffect, useState } from "react";
import { api, statusLabel, Task, TaskStatus, User } from "../api";
import { StatusTick } from "./StatusTick";
import { useAuth } from "../auth";

export function TaskDrawer({
  taskId,
  onClose,
  onChanged,
}: {
  taskId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [devs, setDevs] = useState<User[]>([]);
  const canManage = user?.role !== "DEVELOPER";

  useEffect(() => {
    api.task(taskId).then((r) => setTask(r.task)).catch((e) => setError(e.message));
    if (canManage) api.developers().then((r) => setDevs(r.users)).catch(() => undefined);
  }, [taskId, canManage]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!task) return;
    const fd = new FormData(e.currentTarget);
    try {
      const body =
        user?.role === "DEVELOPER"
          ? { status: fd.get("status") }
          : {
              title: fd.get("title"),
              description: fd.get("description"),
              status: fd.get("status"),
              priority: fd.get("priority"),
              startDate: fd.get("startDate") ? String(fd.get("startDate")) : undefined,
              dueDate: String(fd.get("dueDate")),
              assignedToId: fd.get("assignedToId") ? fd.get("assignedToId") : null,
            };
      const r = await api.patchTask(task.id, body);
      setTask(r.task);
      onChanged();
    } catch (err) {
      setError((err as { message: string }).message);
    }
  }

  if (!task) {
    return (
      <>
        <div className="drawer-back" onClick={onClose} />
        <aside className="drawer">{error || "Loading…"}</aside>
      </>
    );
  }

  return (
    <>
      <div className="drawer-back" onClick={onClose} />
      <aside className="drawer">
        <div className="crumbs">{task.project.key} / {task.project.key}-{task.taskNumber}</div>
        <h2>{task.title}</h2>
        {error && <p className="err">{error}</p>}
        <form onSubmit={save}>
          {canManage && (
            <>
              <label className="field"><span>Title</span><input name="title" defaultValue={task.title} /></label>
              <label className="field"><span>Description</span><textarea name="description" rows={4} defaultValue={task.description} /></label>
            </>
          )}
          {!canManage && <p>{task.description}</p>}
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={task.status}>
              {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </label>
          {canManage && (
            <>
              <label className="field">
                <span>Priority</span>
                <select name="priority" defaultValue={task.priority}>
                  <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label className="field">
                  <span>Start Date</span>
                  <input name="startDate" type="date" defaultValue={task.startDate ? task.startDate.slice(0, 10) : ""} />
                </label>
                <label className="field">
                  <span>Due Date</span>
                  <input name="dueDate" type="date" defaultValue={task.dueDate.slice(0, 10)} />
                </label>
              </div>
              <label className="field">
                <span>Owner</span>
                <select name="assignedToId" defaultValue={task.assignedToId ?? ""}>
                  <option value="">Unassigned</option>
                  {devs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
            </>
          )}
          <button className="btn" type="submit">Save movement</button>
        </form>
        <h3 style={{ marginTop: 28 }}>What already happened</h3>
        {(task.activityLogs ?? []).map((log) => (
          <div className="pulse-item" key={log.id}>
            <StatusTick status={log.toStatus} /> {log.actor.name}
            <time>{new Date(log.createdAt).toLocaleString()}</time>
          </div>
        ))}
      </aside>
    </>
  );
}

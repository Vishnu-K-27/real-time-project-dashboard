import { useState } from "react";
import { api, Task, TaskPriority } from "../api";
import { StatusTick } from "./StatusTick";

export function TaskTable({
  tasks,
  onOpen,
  canDelete,
  onDeleted,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  canDelete?: boolean;
  onDeleted?: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await api.deleteTask(id);
      setConfirmId(null);
      onDeleted?.(id);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to delete task";
      alert(msg);
      setConfirmId(null);
    } finally {
      setDeleting(false);
    }
  }

  const priorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "CRITICAL":
        return <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12 }}>▲▲ Critical</span>;
      case "HIGH":
        return <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>▲ High</span>;
      case "MEDIUM":
        return <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: 12 }}>▬ Medium</span>;
      case "LOW":
        return <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: 12 }}>▼ Low</span>;
    }
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th style={{ width: 90 }}>Key</th>
          <th>Task Title</th>
          <th style={{ width: 140 }}>Status</th>
          <th style={{ width: 110 }}>Priority</th>
          <th style={{ width: 120 }}>Due Date</th>
          <th style={{ width: 160 }}>Assignee</th>
          {canDelete && <th style={{ width: 48 }}></th>}
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => {
          const isLate = t.isOverdue && t.status !== "DONE";
          const assigneeInitials = t.assignedTo?.name
            ? t.assignedTo.name.split(" ").map((w) => w[0]).join("").slice(0, 2)
            : "—";

          return (
            <tr
              key={t.id}
              className={isLate ? "overdue" : ""}
              style={confirmId === t.id ? { background: "#fef2f2" } : undefined}
              onClick={() => !confirmId && onOpen(t)}
            >
              <td><span className="key">{t.project.key}-{t.taskNumber}</span></td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{t.title}</span>
                  {isLate && (
                    <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, padding: "1px 6px", borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>
                      Overdue
                    </span>
                  )}
                </div>
              </td>
              <td><StatusTick status={t.status} /></td>
              <td>{priorityBadge(t.priority)}</td>
              <td style={{ color: isLate ? "#dc2626" : "var(--text-muted)", fontSize: 13, fontWeight: isLate ? 600 : 400 }}>
                {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {t.assignedTo ? (
                    <>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e0f2fe", color: "#0369a1", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {assigneeInitials}
                      </div>
                      <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 500 }}>{t.assignedTo.name}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--text-subtle)", fontStyle: "italic" }}>Unassigned</span>
                  )}
                </div>
              </td>
              {canDelete && (
                <td onClick={(e) => e.stopPropagation()}>
                  {confirmId === t.id ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center", whiteSpace: "nowrap" }}>
                      <button
                        className="btn small"
                        style={{ background: "#dc2626", boxShadow: "none", fontSize: 11 }}
                        disabled={deleting}
                        onClick={() => handleDelete(t.id)}
                      >
                        {deleting ? "…" : "Delete"}
                      </button>
                      <button className="btn ghost small" style={{ fontSize: 11 }} onClick={() => setConfirmId(null)}>No</button>
                    </div>
                  ) : (
                    <button
                      className="btn ghost small"
                      title="Delete task"
                      style={{ color: "#dc2626", borderColor: "#fecaca" }}
                      onClick={() => setConfirmId(t.id)}
                    >
                      🗑
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

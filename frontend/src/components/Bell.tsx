import { useEffect, useState } from "react";
import { api, Notification, relativeTime } from "../api";
import { useRealtime } from "../realtime";

export function Bell() {
  const { lastNotification, unreadBump } = useRealtime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const r = await api.notifications();
    setItems(r.items);
    setUnread(r.unreadCount);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof unreadBump === "number" && unreadBump >= 0 && lastNotification) {
      setItems((prev) => [lastNotification, ...prev.filter((n) => n.id !== lastNotification.id)]);
    }
    if (typeof unreadBump === "number") setUnread(unreadBump);
  }, [unreadBump, lastNotification]);

  return (
    <div className="bell">
      <button
        className="btn ghost small"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: "var(--radius-sm)",
          position: "relative",
        }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <span style={{ fontSize: 15 }}>&#x1F514;</span>
        <span style={{ fontWeight: 600 }}>Notifications</span>
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>

      {open && (
        <div className="dropdown">
          <div className="note-header">
            <strong style={{ fontSize: 13, color: "var(--text-main)" }}>Notifications ({unread} unread)</strong>
            <button
              className="btn ghost small"
              style={{ padding: "4px 8px", fontSize: 11 }}
              onClick={() =>
                api.markAllRead().then(() => {
                  setUnread(0);
                  setItems((p) => p.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
                })
              }
            >
              Mark all read
            </button>
          </div>

          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {items.length === 0 && (
              <div className="empty" style={{ padding: "28px 12px" }}>
                All caught up! No notifications.
              </div>
            )}

            {items.map((n) => (
              <div
                key={n.id}
                className={`note ${n.readAt ? "" : "unread"}`}
                onClick={() => {
                  if (!n.readAt) {
                    api.markRead(n.id).then((r) => {
                      setUnread((r as { unreadCount: number }).unreadCount);
                      setItems((prev) =>
                        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
                      );
                    });
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                  <strong style={{ fontSize: 13, color: n.readAt ? "var(--text-main)" : "var(--primary)" }}>
                    {n.title}
                  </strong>
                  <span style={{ color: "var(--text-subtle)", fontSize: 11 }}>{relativeTime(n.createdAt)}</span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.4 }}>{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

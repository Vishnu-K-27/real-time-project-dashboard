import { useEffect } from "react";
import { Activity, formatFeed } from "../api";
import { useRealtime } from "../realtime";

export function Pulse({
  title,
  items,
  onItems,
}: {
  title: string;
  items: Activity[];
  onItems: (next: Activity[]) => void;
}) {
  const { prependActivity, livePulse } = useRealtime();

  useEffect(() => {
    if (!prependActivity) return;
    onItems([prependActivity, ...items.filter((i) => i.id !== prependActivity.id)].slice(0, 40));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prependActivity]);

  return (
    <aside className="pulse-col">
      <div className="pulse-head">
        <div>
          <h2>Pulse</h2>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{title}</div>
        </div>
        <div className="pulse-badge">
          <span className={`pip ${livePulse ? "pulse" : ""}`} />
          <span>{livePulse ? "Event In" : "Live"}</span>
        </div>
      </div>

      {items.length === 0 && (
        <div className="empty" style={{ padding: "40px 10px" }}>
          No recent activity recorded.
        </div>
      )}

      {items.map((item) => (
        <div className="pulse-item" key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
            <span className="key" style={{ fontSize: 11, padding: "2px 6px" }}>
              {item.projectKey}-{item.taskNumber}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>
              {formatFeed("", item.createdAt).replace(/^ · /, "")}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.4 }}>
            {item.message}
          </div>
        </div>
      ))}
    </aside>
  );
}

import { statusClass, statusLabel, TaskStatus } from "../api";

export function StatusTick({ status }: { status: TaskStatus }) {
  return (
    <span className={`tick ${statusClass(status)}`}>
      <i />
      {statusLabel(status)}
    </span>
  );
}

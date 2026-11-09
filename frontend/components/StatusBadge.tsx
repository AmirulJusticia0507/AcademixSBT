type Status = "valid" | "revoked" | "invalid" | "not-found" | "loading";

const LABELS: Record<Status, string> = {
  valid: "IJAZAH VALID",
  revoked: "IJAZAH DICABUT",
  invalid: "TIDAK TERKUNCI",
  "not-found": "TIDAK DITEMUKAN",
  loading: "MEMUAT…",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}

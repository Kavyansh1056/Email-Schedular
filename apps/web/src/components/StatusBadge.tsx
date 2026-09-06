import type { EmailStatus } from "@ejs/shared";

const STYLES: Record<EmailStatus, string> = {
  SCHEDULED: "bg-gray-100 text-gray-700",
  QUEUED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  RATE_LIMITED: "bg-orange-100 text-orange-700",
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

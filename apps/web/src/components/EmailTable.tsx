import type { EmailJobDTO } from "@ejs/shared";
import { StatusBadge } from "./StatusBadge";
import { TableSkeleton } from "./TableSkeleton";
import { EmptyState, ErrorState } from "./States";

interface EmailTableProps {
  emails: EmailJobDTO[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  mode: "scheduled" | "sent";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailTable({ emails, loading, error, onRetry, mode }: EmailTableProps) {
  const timeLabel = mode === "scheduled" ? "Scheduled Time" : "Sent Time";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Recipient</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Sender</th>
            <th className="px-4 py-3 font-medium">{timeLabel}</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        {loading && <TableSkeleton cols={5} />}
        {!loading && emails && emails.length > 0 && (
          <tbody>
            {emails.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3 text-gray-900">{e.recipient}</td>
                <td className="px-4 py-3 text-gray-600">{e.subject}</td>
                <td className="px-4 py-3 text-gray-600">{e.senderEmail}</td>
                <td className="px-4 py-3 text-gray-600">
                  {mode === "scheduled" ? formatDate(e.scheduledAt) : formatDate(e.sentAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>

      {!loading && !error && emails && emails.length === 0 && (
        <EmptyState
          title={mode === "scheduled" ? "No scheduled emails" : "No sent emails yet"}
          description={
            mode === "scheduled"
              ? "Compose a campaign to see scheduled sends here."
              : "Once emails go out, they'll show up here with delivery status."
          }
        />
      )}

      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
    </div>
  );
}

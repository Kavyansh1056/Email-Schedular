import { useState } from "react";
import type { SenderDTO } from "@ejs/shared";
import { api, ApiClientError } from "../lib/apiClient";
import { useToast } from "./Toast";

interface ComposeDrawerProps {
  open: boolean;
  onClose: () => void;
  senders: SenderDTO[];
  onScheduled: () => void;
}

export function ComposeDrawer({ open, onClose, senders, onScheduled }: ComposeDrawerProps) {
  const { showToast } = useToast();
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startAt, setStartAt] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState<number | "">("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [parseInfo, setParseInfo] = useState<{ valid: number; invalid: number; duplicate: number } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setFormError(null);
    try {
      const result = await api.recipients.parse(file);
      setRecipients(result.recipients);
      setParseInfo({ valid: result.validCount, invalid: result.invalidCount, duplicate: result.duplicateCount });
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  function reset() {
    setSubject("");
    setBody("");
    setStartAt("");
    setDelayMs(2000);
    setHourlyLimit("");
    setFileName(null);
    setRecipients([]);
    setParseInfo(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!senderId) return setFormError("Select a sender.");
    if (!subject.trim()) return setFormError("Subject is required.");
    if (!body.trim()) return setFormError("Body is required.");
    if (recipients.length === 0) return setFormError("Upload a CSV/TXT with at least one valid recipient.");
    if (!startAt) return setFormError("Choose a start time.");

    setSubmitting(true);
    try {
      const result = await api.campaigns.create({
        senderId,
        subject,
        body,
        recipients,
        startAt: new Date(startAt).toISOString(),
        delayMs,
        hourlyLimit: hourlyLimit === "" ? undefined : hourlyLimit,
      });
      showToast(`Scheduled ${result.totalRecipients} emails.`, "success");
      reset();
      onClose();
      onScheduled();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Failed to schedule campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Compose campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sender</label>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="" disabled>
                Select a sender
              </option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label ? `${s.label} <${s.email}>` : s.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Quarterly product update"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="HTML or plain text body"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Recipients (CSV or TXT)</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm"
            />
            {fileName && <p className="mt-1 text-xs text-gray-500">{fileName}</p>}
            {parsing && <p className="mt-1 text-xs text-gray-400">Parsing recipients…</p>}
            {parseInfo && (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                {parseInfo.valid} valid recipients detected
                {parseInfo.duplicate > 0 && ` · ${parseInfo.duplicate} duplicates removed`}
                {parseInfo.invalid > 0 && ` · ${parseInfo.invalid} invalid addresses skipped`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Start time</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Delay between emails (ms)</label>
              <input
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Hourly limit (optional)</label>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder={`Default: sender/system limit`}
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="mt-auto flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

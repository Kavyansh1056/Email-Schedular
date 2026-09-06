import { useState } from "react";
import { api, ApiClientError } from "../lib/apiClient";
import { useToast } from "./Toast";

interface AddSenderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddSenderModal({ open, onClose, onCreated }: AddSenderModalProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [maxPerHour, setMaxPerHour] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setEmail("");
    setLabel("");
    setMaxPerHour("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.senders.create({
        email: email.trim(),
        label: label.trim() || undefined,
        maxPerHour: maxPerHour === "" ? undefined : maxPerHour,
      });
      showToast(`Sender ${email} added.`, "success");
      reset();
      onClose();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add sender");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={handleClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add sender</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@yourcompany.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Marketing"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Hourly limit override (optional)
            </label>
            <input
              type="number"
              min={1}
              value={maxPerHour}
              onChange={(e) => setMaxPerHour(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Uses system default if left blank"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add sender"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

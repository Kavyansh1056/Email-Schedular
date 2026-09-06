import { useEffect, useState } from "react";
import type { SlackStatusDTO } from "@ejs/shared";
import { api } from "../lib/apiClient";
import { useToast } from "./Toast";

export function SlackConnectionCard() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<SlackStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const s = await api.slack.status();
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("slack") === "connected") {
      showToast("Slack connected successfully.", "success");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("slack") === "error" || params.get("slack") === "invalid_state") {
      showToast("Slack connection failed. Please try again.", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDisconnect() {
    await api.slack.disconnect();
    showToast("Slack disconnected.", "info");
    load();
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A154B] text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 15a2 2 0 100-4 2 2 0 000 4zM8 9a2 2 0 100-4 2 2 0 000 4zM16 9a2 2 0 100-4 2 2 0 000 4zM18 15a2 2 0 100-4 2 2 0 000 4zM12 21a2 2 0 100-4 2 2 0 000 4zM12 7a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Slack</p>
          <p className="text-xs text-gray-500">
            {loading ? "Checking…" : status?.connected ? `Connected to ${status.teamName}` : "Not connected"}
          </p>
        </div>
      </div>

      {!loading &&
        (status?.connected ? (
          <button
            onClick={handleDisconnect}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Disconnect
          </button>
        ) : (
          <a
            href={api.slack.connectUrl()}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            Connect Slack
          </a>
        ))}
    </div>
  );
}

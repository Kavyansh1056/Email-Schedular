import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { EmailJobDTO, MeDTO, SenderDTO } from "@ejs/shared";
import { api, ApiClientError } from "../lib/apiClient";
import { EmailTable } from "../components/EmailTable";
import { ComposeDrawer } from "../components/ComposeDrawer";
import { SlackConnectionCard } from "../components/SlackConnectionCard";
import { AddSenderModal } from "../components/AddSenderModal";
import { useToast } from "../components/Toast";

type Tab = "scheduled" | "sent";

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [me, setMe] = useState<MeDTO | null>(null);
  const [meError, setMeError] = useState(false);
  const [senders, setSenders] = useState<SenderDTO[]>([]);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [emails, setEmails] = useState<EmailJobDTO[] | null>(null);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [addSenderOpen, setAddSenderOpen] = useState(false);
  const [search, setSearch] = useState("");

  const loadSenders = useCallback(() => {
    api.senders
      .list()
      .then(setSenders)
      .catch(() => setSenders([]));
  }, []);

  const loadEmails = useCallback(async (activeTab: Tab) => {
    setLoadingEmails(true);
    setEmailsError(null);
    try {
      const result = activeTab === "scheduled" ? await api.emails.scheduled() : await api.emails.sent();
      setEmails(result.items);
    } catch (err) {
      setEmailsError(err instanceof ApiClientError ? err.message : "Failed to load emails");
    } finally {
      setLoadingEmails(false);
    }
  }, []);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMeError(true));
    loadSenders();
  }, [loadSenders]);

  useEffect(() => {
    if (meError) navigate("/login");
  }, [meError, navigate]);

  useEffect(() => {
    loadEmails(tab);
  }, [tab, loadEmails]);

  async function handleLogout() {
    await api.logout();
    navigate("/login");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const result = await api.emails.search(search);
      showToast(`${result.total} result(s) for "${search}"`, "info");
    } catch {
      showToast("Search failed", "error");
    }
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            E
          </div>
          <span className="text-sm font-semibold text-gray-900">Email Job Scheduler</span>
        </div>

        <div className="flex items-center gap-4">
          <img
            src={me.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(me.name)}`}
            alt={me.name}
            className="h-8 w-8 rounded-full border border-gray-200"
          />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-gray-900">{me.name}</p>
            <p className="text-xs text-gray-500">{me.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6">
          <SlackConnectionCard />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Senders</span>
            {senders.length === 0 ? (
              <span className="text-xs text-gray-400">None yet — add one to start composing.</span>
            ) : (
              senders.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                >
                  {s.label ? `${s.label} <${s.email}>` : s.email}
                  {s.maxPerHour ? ` · ${s.maxPerHour}/hr` : ""}
                </span>
              ))
            )}
          </div>
          <button
            onClick={() => setAddSenderOpen(true)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            + Add sender
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
            {(["scheduled", "sent"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition ${
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t} emails
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipient or subject…"
                className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </form>
            <button
              onClick={() => setComposeOpen(true)}
              disabled={senders.length === 0}
              title={senders.length === 0 ? "Add a sender first" : undefined}
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Compose New Email
            </button>
          </div>
        </div>

        <EmailTable
          emails={emails}
          loading={loadingEmails}
          error={emailsError}
          onRetry={() => loadEmails(tab)}
          mode={tab}
        />
      </main>

      <ComposeDrawer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        senders={senders}
        onScheduled={() => loadEmails("scheduled")}
      />

      <AddSenderModal
        open={addSenderOpen}
        onClose={() => setAddSenderOpen(false)}
        onCreated={loadSenders}
      />
    </div>
  );
}

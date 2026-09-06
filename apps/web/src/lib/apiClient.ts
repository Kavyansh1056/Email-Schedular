import type {
  CampaignDTO,
  EmailJobDTO,
  EmailStatus,
  MeDTO,
  SenderDTO,
  SlackStatusDTO,
} from "@ejs/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // ignore parse failure, use default message
    }
    throw new ApiClientError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const api = {
  loginUrl: () => `${API_URL}/auth/google`,
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<MeDTO>("/api/me"),

  senders: {
    list: () => request<SenderDTO[]>("/api/senders"),
    create: (input: { email: string; label?: string; maxPerHour?: number }) =>
      request<SenderDTO>("/api/senders", { method: "POST", body: JSON.stringify(input) }),
  },

  campaigns: {
    list: () => request<CampaignDTO[]>("/api/campaigns"),
    create: (input: {
      senderId: string;
      subject: string;
      body: string;
      recipients: string[];
      startAt: string;
      delayMs: number;
      hourlyLimit?: number;
    }) =>
      request<{ id: string; totalRecipients: number }>("/api/campaigns", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },

  recipients: {
    parse: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ validCount: number; invalidCount: number; duplicateCount: number; recipients: string[] }>(
        "/api/recipients/parse",
        { method: "POST", body: formData }
      );
    },
  },

  emails: {
    scheduled: (page = 1) => request<PaginatedResult<EmailJobDTO>>(`/api/emails/scheduled?page=${page}`),
    sent: (page = 1) => request<PaginatedResult<EmailJobDTO>>(`/api/emails/sent?page=${page}`),
    search: (q: string, page = 1) =>
      request<PaginatedResult<{ emailJobId: string; recipient: string; subject: string; status: EmailStatus }>>(
        `/api/emails/search?q=${encodeURIComponent(q)}&page=${page}`
      ),
  },

  slack: {
    status: () => request<SlackStatusDTO>("/api/slack/status"),
    connectUrl: () => `${API_URL}/api/slack/connect`,
    disconnect: () => request<{ ok: boolean }>("/api/slack/disconnect", { method: "POST" }),
  },
};

export { ApiClientError };

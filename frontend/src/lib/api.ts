function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server components / SSR talk to the Nest API directly.
    return process.env.API_URL ?? 'http://localhost:3001';
  }
  // Browser talks to the host-mapped API port.
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export type DocumentStatus = 'IN_PROGRESS' | 'APPROVED' | 'DECLINED';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
};

export type Stage = {
  id: string;
  name: string;
  approver: User;
};

export type DocumentSummary = {
  id: string;
  title: string;
  status: DocumentStatus;
  currentStageIndex: number;
  currentStageName: string;
  currentApproverName: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type DocumentDetail = {
  id: string;
  title: string;
  body: string;
  stages: Stage[];
  currentStageIndex: number;
  status: DocumentStatus;
  declineReason: string | null;
  createdBy: User | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentEventAction =
  | 'CREATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REOPENED'
  | 'UPDATED'
  | 'STAGES_UPDATED';

export type DocumentEventItem = {
  id: string;
  action: DocumentEventAction;
  documentId: string;
  actor: { id: string; name: string; email: string } | null;
  stageName: string | null;
  reason: string | null;
  createdAt: string;
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  IN_PROGRESS: 'In Progress',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function getDocuments(options: {
  page: number;
  limit: number;
  currentApproverId?: string;
  createdById?: string;
}) {
  return request<Paginated<DocumentSummary>>(
    `/documents${toQueryString({
      page: options.page,
      limit: options.limit,
      currentApproverId: options.currentApproverId,
      createdById: options.createdById,
    })}`,
  );
}

export function getDocument(id: string) {
  return request<DocumentDetail>(`/documents/${id}`);
}

export function getEvents(options: {
  documentId?: string;
  page: number;
  limit: number;
}) {
  return request<Paginated<DocumentEventItem>>(
    `/events${toQueryString({
      documentId: options.documentId,
      page: options.page,
      limit: options.limit,
    })}`,
  );
}

export function getUsers() {
  return request<User[]>('/users');
}

export type StageInput = {
  name: string;
  approverId: string;
};

export function createDocument(input: {
  title: string;
  body: string;
  createdById: string;
  stages: StageInput[];
}) {
  return request<DocumentDetail>('/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDocument(
  id: string,
  input: {
    userId: string;
    title?: string;
    body?: string;
    stages?: StageInput[];
  },
) {
  return request<DocumentDetail>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function approveDocument(id: string, userId: string) {
  return request<DocumentDetail>(`/documents/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function rejectDocument(id: string, userId: string, reason?: string) {
  return request<DocumentDetail>(`/documents/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason: reason?.trim() || undefined }),
  });
}

export function reopenDocument(id: string, userId: string) {
  return request<DocumentDetail>(`/documents/${id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

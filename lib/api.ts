export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TOKEN_KEY = 'notes.token';
const USER_KEY = 'notes.user';

export type Role = 'user' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  interests: string[];
  createdAt: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** A post in the public feed, with its author joined in by the API. */
export type FeedPost = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

export type InterestGroup = {
  interest: string;
  count: number;
  users: { id: string; name: string; email: string }[];
};

export type UserPosts = {
  user: { id: string; name: string; email: string };
  posts: { id: string; title: string; body: string; createdAt: string }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/* --- token storage (localStorage; fine for a demo client) --------- */

export const auth = {
  token: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  user: (): User | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  save: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: { field: string; message: string }[];
  constructor(status: number, message: string, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.token();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message = payload?.error?.message ?? `Request failed (${res.status})`;
    const details = payload?.error?.details;
    // An expired or invalid token should not leave a half-signed-in UI.
    if (res.status === 401 && typeof window !== 'undefined') auth.clear();
    throw new ApiClientError(res.status, message, details);
  }

  return payload as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (input: { name: string; email: string; password: string; interests: string[] }) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => request<{ user: User }>('/auth/me'),

  listNotes: (params: { page?: number; limit?: number; all?: boolean }) =>
    request<Paginated<Note>>(`/notes${qs(params)}`),

  createNote: (input: { title: string; content: string }) =>
    request<{ note: Note }>('/notes', { method: 'POST', body: JSON.stringify(input) }),

  updateNote: (id: string, input: { title?: string; content?: string }) =>
    request<{ note: Note }>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deleteNote: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),

  listUsers: (params: { page?: number; limit?: number }) =>
    request<Paginated<User>>(`/users${qs(params)}`),

  createUser: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    interests: string[];
  }) => request<{ user: User }>('/users', { method: 'POST', body: JSON.stringify(input) }),

  updateUser: (id: string, input: Record<string, unknown>) =>
    request<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),

  /** Public feed. `author` may be a user id or an email. */
  listPosts: (params: { page?: number; limit?: number; author?: string }) =>
    request<Paginated<FeedPost>>(`/posts${qs(params)}`),

  createPost: (input: { title: string; body: string }) =>
    request<{ post: FeedPost }>('/posts', { method: 'POST', body: JSON.stringify(input) }),

  usersByInterest: (params: { page?: number; limit?: number; interest?: string }) =>
    request<Paginated<InterestGroup>>(`/users/insights/by-interest${qs(params)}`),

  userPosts: (id: string, params: { page?: number; limit?: number }) =>
    request<UserPosts>(`/users/${id}/posts${qs(params)}`),
};

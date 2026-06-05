const API_BASE = "http://127.0.0.1:8000/api/v1";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

import type { Bookmark, BookmarkDetail, BookmarkFilters, PaginatedResponse,
  Category, Tag, Collection, Stats } from "./types";

export const api = {
  // Bookmarks
  createBookmark: (data: { url: string; use_ai?: boolean; title?: string; summary?: string; full_summary?: string; collection_id?: number; category_ids?: number[] }) =>
    fetchAPI<Bookmark>("/bookmarks", { method: "POST", body: JSON.stringify(data) }),

  listBookmarks: (filters: BookmarkFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== "") params.set(k, String(v)); });
    return fetchAPI<PaginatedResponse<Bookmark>>(`/bookmarks?${params}`);
  },

  getBookmark: (id: number) =>
    fetchAPI<BookmarkDetail>(`/bookmarks/${id}`),

  updateBookmark: (id: number, data: Record<string, unknown>) =>
    fetchAPI<Bookmark>(`/bookmarks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteBookmark: (id: number) =>
    fetchAPI<void>(`/bookmarks/${id}`, { method: "DELETE" }),

  retryBookmark: (id: number) =>
    fetchAPI<Bookmark>(`/bookmarks/${id}/retry`, { method: "POST" }),

  getRecommendations: (id: number, limit = 5) =>
    fetchAPI<{ items: Bookmark[]; source: string }>(`/bookmarks/${id}/recommendations?limit=${limit}`),

  // Categories & Tags
  listCategories: () => fetchAPI<Category[]>("/categories"),
  listTags: (q?: string) => fetchAPI<Tag[]>(`/tags${q ? `?q=${q}` : ""}`),

  // Collections
  listCollections: () => fetchAPI<Collection[]>("/collections"),
  createCollection: (name: string, description?: string) =>
    fetchAPI<Collection>("/collections", { method: "POST", body: JSON.stringify({ name, description }) }),
  deleteCollection: (id: number) =>
    fetchAPI<void>(`/collections/${id}`, { method: "DELETE" }),

  // Stats & Export
  getStats: () => fetchAPI<Stats>("/stats"),
  exportBookmarks: (format: "md" | "csv", collection_id?: number) => {
    const params = new URLSearchParams({ format });
    if (collection_id) params.set("collection_id", String(collection_id));
    return fetchAPI<{ format: string; data: string }>(`/export?${params}`);
  },
};

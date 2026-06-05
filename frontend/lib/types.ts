export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  bookmark_count: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  bookmark_count: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  bookmark_count: number;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string | null;
  summary: string | null;
  domain: string | null;
  favicon_url: string | null;
  categories: Category[];
  collection: Collection | null;
  tags: Tag[];
  note: string | null;
  author: string | null;
  published_at: string | null;
  word_count: number | null;
  reading_time_min: number | null;
  use_ai: boolean;
  is_pinned: boolean;
  annotations: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkDetail extends Bookmark {
  full_summary: string | null;
  content_snippet: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Stats {
  total_bookmarks: number;
  bookmarks_this_week: number;
  by_category: { category: string; slug: string; count: number }[];
  total_ai_cost: number;
}

export interface BookmarkFilters {
  status?: string;
  category?: string;
  tag?: string;
  collection?: number;
  q?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

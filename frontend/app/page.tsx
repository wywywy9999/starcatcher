"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BookmarkFilters } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BookmarkGrid from "@/components/bookmarks/BookmarkGrid";
import AddBookmarkDialog from "@/components/bookmarks/AddBookmarkDialog";
import BookmarkDrawer from "@/components/bookmarks/BookmarkDrawer";
import BatchBar from "@/components/bookmarks/BatchBar";

export default function Dashboard() {
  const [filters, setFilters] = useState<BookmarkFilters>({ page: 1, page_size: 24 });
  const [searchInput, setSearchInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks", filters],
    queryFn: () => api.listBookmarks(filters),
    refetchInterval: (query) =>
      query.state.data?.items.some((b: { status: string }) => b.status !== "ready" && b.status !== "failed") ? 2000 : false,
  });

  const handleSearch = useCallback((q: string) => {
    setSearchInput(q);
    setFilters((prev) => ({ ...prev, q: q || undefined, page: 1 }));
  }, []);

  const handleFilter = useCallback((type: "category" | "tag" | "collection", slug: string) => {
    setFilters((prev) => {
      const next = { ...prev, page: 1 };
      if (type === "category") next.category = slug || undefined;
      if (type === "collection") next.collection = slug ? Number(slug) : undefined;
      if (type === "tag") {
        // 多选：toggle tag in comma list
        const current = prev.tag ? prev.tag.split(",").map(s => s.trim()).filter(Boolean) : [];
        const idx = current.indexOf(slug);
        if (idx >= 0) current.splice(idx, 1); else if (slug) current.push(slug);
        next.tag = current.length > 0 ? current.join(",") : undefined;
      }
      return next;
    });
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setFilters((prev) => {
      const current = prev.tag ? prev.tag.split(",").map(s => s.trim()).filter(Boolean) : [];
      const idx = current.indexOf(tag);
      if (idx >= 0) current.splice(idx, 1); else current.push(tag);
      return { ...prev, tag: current.length > 0 ? current.join(",") : undefined, page: 1 };
    });
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleBatchMode = useCallback(() => {
    setBatchMode((prev) => {
      if (prev) setSelectedIds(new Set()); // 退出时清空选择
      return !prev;
    });
  }, []);

  const handleReorder = useCallback(async (ids: number[]) => {
    qc.setQueryData(["bookmarks", filters], (old: typeof data) => {
      if (!old) return old;
      const map = new Map(old.items.map((b: { id: number }) => [b.id, b]));
      const reordered = ids.map((id: number) => map.get(id)).filter(Boolean);
      return { ...old, items: reordered };
    });
    await fetch("http://127.0.0.1:8000/api/v1/bookmarks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids.map((id, idx) => ({ id, sort_order: idx }))),
    });
  }, [filters, qc]);

  return (
    <div className="flex h-full">
      <Sidebar
        onFilter={handleFilter}
        activeCategory={filters.category || null}
        activeTag={filters.tag || null}
        activeCollection={filters.collection || null}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          searchQuery={searchInput}
          onSearchChange={handleSearch}
          onAddClick={() => setShowAdd(true)}
          batchMode={batchMode}
          onBatchToggle={toggleBatchMode}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* 当前筛选提示 */}
          {(filters.category || filters.tag || filters.q) && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
              <span>当前筛选：</span>
              {filters.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  分类: {filters.category}
                  <button onClick={() => setFilters((p) => ({ ...p, category: undefined, page: 1 }))} className="hover:text-red-500">×</button>
                </span>
              )}
              {filters.tag && filters.tag.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  标签: {t}
                  <button onClick={() => {
                    setFilters((p) => {
                      const tags = (p.tag || "").split(",").map(s => s.trim()).filter(s => s !== t);
                      return { ...p, tag: tags.length > 0 ? tags.join(",") : undefined, page: 1 };
                    });
                  }} className="hover:text-red-500">×</button>
                </span>
              ))}
              {filters.q && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  搜索: {filters.q}
                  <button onClick={() => { setFilters((p) => ({ ...p, q: undefined, page: 1 })); setSearchInput(""); }} className="hover:text-red-500">×</button>
                </span>
              )}
              <button
                onClick={() => { setFilters({ page: 1, page_size: 24 }); setSearchInput(""); }}
                className="text-xs text-gray-400 hover:text-blue-500 ml-2"
              >
                清除全部
              </button>
            </div>
          )}
          <BookmarkGrid
            bookmarks={data?.items || []}
            onTagClick={handleTagClick}
            onCardClick={(id) => { batchMode ? toggleSelect(id) : setSelectedId(id); }}
            loading={isLoading}
            selectedIds={batchMode ? selectedIds : undefined}
            onToggleSelect={batchMode ? toggleSelect : undefined}
            onReorder={handleReorder}
          />

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                  className={`w-8 h-8 rounded text-sm ${p === data.page ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      <AddBookmarkDialog open={showAdd} onClose={() => setShowAdd(false)} />
      {selectedId && <BookmarkDrawer bookmarkId={selectedId} onClose={() => setSelectedId(null)} />}
      <BatchBar selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
    </div>
  );
}

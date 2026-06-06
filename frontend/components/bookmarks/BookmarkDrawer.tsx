"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BookmarkDetail, Bookmark } from "@/lib/types";
import CategoryManager from "@/components/layout/CategoryManager";
import BookmarkEditForm from "@/components/shared/BookmarkEditForm";

interface Props {
  bookmarkId: number;
  onClose: () => void;
}

export default function BookmarkDrawer({ bookmarkId, onClose }: Props) {
  const qc = useQueryClient();

  const { data: bookmark, isLoading } = useQuery({
    queryKey: ["bookmark", bookmarkId],
    queryFn: () => api.getBookmark(bookmarkId),
  });

  const { data: recs } = useQuery({
    queryKey: ["recommendations", bookmarkId],
    queryFn: () => api.getRecommendations(bookmarkId),
    enabled: !!bookmark,
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const { data: allTags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });

  // ── 状态 ──
  const [showMenu, setShowMenu] = useState(false);
  const [showCatMgr, setShowCatMgr] = useState(false);

  const [editMode, setEditMode] = useState(false);

  // 笔记编辑
  const [noteEdit, setNoteEdit] = useState(false);
  const [note, setNote] = useState("");

  const enterEditMode = () => { setEditMode(true); setShowMenu(false); };

  // ── 笔记 ──
  const startNoteEdit = () => { setNote(bookmark?.note || ""); setNoteEdit(true); };
  const saveNote = async () => {
    if (!bookmark) return;
    await api.updateBookmark(bookmark.id, { note });
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    setNoteEdit(false);
  };

  // ── 其他操作 ──
  const copyLink = () => { if (bookmark) navigator.clipboard.writeText(bookmark.url); setShowMenu(false); };

  const togglePin = async () => {
    if (!bookmark) return;
    await api.updateBookmark(bookmark.id, { is_pinned: !bookmark.is_pinned });
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    setShowMenu(false);
  };

  const exportOne = async () => {
    if (!bookmark) return;
    const { data } = await api.exportBookmarks();
    const blob = new Blob([data], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${bookmark.title || "bookmark"}.md`;
    a.click(); URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!bookmark || !confirm("确定删除此书签？")) return;
    await api.deleteBookmark(bookmark.id);
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    onClose();
  };

  const handleRetry = async () => {
    if (!bookmark) return;
    await api.retryBookmark(bookmark.id);
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  // ── 渲染 ──
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setShowMenu(false); onClose(); }} />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[90vw] max-h-[90vh] bg-white shadow-2xl z-50 rounded-2xl overflow-hidden flex flex-col"
           onClick={() => setShowMenu(false)}>

        {/* 顶部按钮组 */}
        <div className="absolute top-4 right-4 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">···</button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                <button onClick={copyLink} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">复制链接</button>
                <button onClick={togglePin} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {bookmark?.is_pinned ? "取消置顶" : "置顶"}
                </button>
                <button onClick={enterEditMode} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">编辑</button>
                <a href={`/bookmarks/${bookmarkId}`} target="_blank" onClick={() => setShowMenu(false)}
                   className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">在新页面打开</a>
                <button onClick={exportOne} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">导出这篇</button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { setShowMenu(false); handleDelete(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">删除</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>

        {isLoading && (
          <div className="p-6 animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        )}

        {bookmark && (
          <div className="p-6 overflow-y-auto flex-1">
            <h1 className="text-lg font-bold text-gray-900 pr-20 mb-2">{bookmark.title || bookmark.url}</h1>

            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
              <span>{bookmark.domain}</span>
              {bookmark.author && <span>作者: {bookmark.author}</span>}
              {bookmark.reading_time_min && <span>{bookmark.reading_time_min} 分钟</span>}
              <span>{new Date(bookmark.created_at).toLocaleDateString("zh-CN")}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-5">
              <a href={bookmark.url || `/bookmarks/${bookmarkId}`} target="_blank" className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">打开原文</a>
              {bookmark.status === "failed" && (
                <button onClick={handleRetry} className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600">重试</button>
              )}
            </div>

            {/* Status */}
            {bookmark.status === "failed" && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs">处理失败: {bookmark.error_message}</div>
            )}
            {bookmark.status !== "ready" && bookmark.status !== "failed" && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-xs">正在处理中...</div>
            )}

            {/* 编辑模式 */}
            {editMode && (
              <div className="mb-5">
                <BookmarkEditForm bookmark={bookmark as BookmarkDetail}
                  onSave={async (data) => { await api.updateBookmark(bookmark.id, data); qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] }); qc.invalidateQueries({ queryKey: ["bookmarks"] }); setEditMode(false); }}
                  onCancel={() => setEditMode(false)} />
              </div>
            )}

            {!editMode && <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {bookmark.categories.map((c) => (
                  <span key={c.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{c.icon} {c.name}</span>
                ))}
                {bookmark.tags.map((t) => (
                  <span key={t.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{t.name}</span>
                ))}
              </div>

              {bookmark.use_ai ? (
                (bookmark as BookmarkDetail).full_summary ? (
                  <div className="bg-gray-50 rounded-lg p-4 mb-5">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">AI 摘要</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{(bookmark as BookmarkDetail).full_summary}</p>
                  </div>
                ) : bookmark.summary && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-5">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">AI 摘要</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{bookmark.summary}</p>
                  </div>
                )
              ) : (
                <>
                  {bookmark.summary && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">摘要</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{bookmark.summary}</p>
                    </div>
                  )}
                  {(bookmark as BookmarkDetail).full_summary && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-5">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">正文</h3>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{(bookmark as BookmarkDetail).full_summary}</p>
                    </div>
                  )}
                </>
              )}
            </>}

            {/* 笔记 */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">笔记</h3>
              {noteEdit ? (
                <div>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveNote} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">保存</button>
                    <button onClick={() => setNoteEdit(false)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">取消</button>
                  </div>
                </div>
              ) : (
                <div onClick={startNoteEdit} className="cursor-pointer">
                  {bookmark.note ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{bookmark.note}</p>
                  ) : (
                    <p className="text-sm text-gray-300 italic">点击添加笔记...</p>
                  )}
                </div>
              )}
            </div>

            {/* Recommendations */}
            {recs && recs.items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">{recs.source}</h3>
                <div className="space-y-2">
                  {recs.items.map((b: Bookmark) => (
                    <button key={b.id} onClick={() => { qc.invalidateQueries({ queryKey: ["bookmark", b.id] }); }}
                      className="block w-full text-left p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-800">{b.title || b.url}</p>
                      {b.summary && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{b.summary}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <CategoryManager open={showCatMgr} onClose={() => setShowCatMgr(false)} />
    </>
  );
}

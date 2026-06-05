"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BookmarkDetail, Bookmark } from "@/lib/types";
import CategoryManager from "@/components/layout/CategoryManager";

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

  // 全编辑模式
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCatIds, setEditCatIds] = useState<number[]>([]);

  // 标签编辑（编辑模式下）
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<{ id: number; name: string }[]>([]);

  // 笔记编辑
  const [noteEdit, setNoteEdit] = useState(false);
  const [note, setNote] = useState("");

  // ── 进入/保存/取消编辑 ──
  const enterEditMode = () => {
    if (!bookmark) return;
    setEditTitle(bookmark.title || "");
    setEditSummary(bookmark.summary || "");
    setEditContent((bookmark as BookmarkDetail).full_summary || "");
    setEditCatIds(bookmark.categories.map((c) => c.id));
    setEditTags(bookmark.tags.map((t) => t.name));
    setTagInput("");
    setTagSuggestions([]);
    setEditMode(true);
    setShowMenu(false);
  };

  const saveEdit = async () => {
    if (!bookmark) return;
    await api.updateBookmark(bookmark.id, {
      title: editTitle,
      summary: editSummary,
      full_summary: editContent,
      category_ids: editCatIds,
      tags: editTags,
    });
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
    setEditMode(false);
  };

  const cancelEdit = () => setEditMode(false);

  // ── 编辑模式下的操作 ──
  const toggleCat = (id: number) => {
    setEditCatIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleTagInput = (val: string) => {
    setTagInput(val);
    if (val.trim() && allTags) {
      const matches = allTags.filter((t: { id: number; name: string }) =>
        t.name.toLowerCase().includes(val.toLowerCase()) && !editTags.includes(t.name)
      ).slice(0, 5);
      setTagSuggestions(matches);
    } else {
      setTagSuggestions([]);
    }
  };

  const addTag = (name: string) => {
    if (!name.trim() || editTags.includes(name.trim())) return;
    setEditTags((prev) => [...prev, name.trim()]);
    setTagInput("");
    setTagSuggestions([]);
  };

  const removeTag = (name: string) => {
    setEditTags((prev) => prev.filter((n) => n !== name));
  };

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
    const { data } = await api.exportBookmarks("md");
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

      <div className="fixed right-0 top-0 h-full w-[480px] max-w-[90vw] bg-white shadow-2xl z-50 overflow-y-auto"
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
          <div className="p-6">
            {/* 标题 */}
            {editMode ? (
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-bold text-gray-900 mb-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
            ) : (
              <h1 className="text-lg font-bold text-gray-900 pr-20 mb-2">{bookmark.title || bookmark.url}</h1>
            )}

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

            {/* 分类 */}
            {editMode ? (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">分类</label>
                <div className="flex flex-wrap gap-1">
                  {categories?.map((cat) => {
                    const checked = editCatIds.includes(cat.id);
                    return (
                      <button key={cat.id} onClick={() => toggleCat(cat.id)}
                        className={`px-2 py-1 rounded text-xs border ${checked ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                        {cat.icon} {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {bookmark.categories.map((c) => (
                  <span key={c.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{c.icon} {c.name}</span>
                ))}
                {bookmark.tags.map((t) => (
                  <span key={t.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{t.name}</span>
                ))}
              </div>
            )}

            {/* 标签（编辑模式） */}
            {editMode && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {editTags.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {name}
                      <button onClick={() => removeTag(name)} className="text-gray-400 hover:text-red-500 text-xs leading-none">×</button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input value={tagInput} onChange={(e) => handleTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) addTag(tagInput.trim()); }}
                    placeholder="输入标签，回车添加..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  {tagSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                      {tagSuggestions.map((s) => (
                        <button key={s.id} onClick={() => addTag(s.name)}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">已有: {s.name}</button>
                      ))}
                      <div className="border-t border-gray-100">
                        <button onClick={() => addTag(tagInput.trim())}
                          className="w-full text-left px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50">新建: {tagInput.trim()}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 摘要 */}
            {editMode ? (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">摘要</label>
                  <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
                {!bookmark.use_ai && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">正文</label>
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}

            {/* 编辑模式保存/取消 */}
            {editMode && (
              <div className="flex gap-2 mb-5">
                <button onClick={saveEdit} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">保存修改</button>
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
              </div>
            )}

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

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BookmarkDetail, Bookmark } from "@/lib/types";

interface Annotation {
  quote: string;
  comment: string;
  id: number;
}

export default function BookmarkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const bookmarkId = Number(id);

  const { data: bookmark, isLoading } = useQuery({
    queryKey: ["bookmark", bookmarkId],
    queryFn: () => api.getBookmark(bookmarkId),
  });

  const { data: recs } = useQuery({
    queryKey: ["recommendations", bookmarkId],
    queryFn: () => api.getRecommendations(bookmarkId),
    enabled: !!bookmark,
  });

  const [note, setNote] = useState("");
  const [noteEdit, setNoteEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // 标注模式
  const [annotating, setAnnotating] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editAnnId, setEditAnnId] = useState<number | null>(null);
  const [editAnnComment, setEditAnnComment] = useState("");

  const startNoteEdit = () => { setNote(bookmark?.note || ""); setNoteEdit(true); };
  const saveNote = async () => {
    if (!bookmark) return;
    setSaving(true);
    await api.updateBookmark(bookmark.id, { note });
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    setNoteEdit(false); setSaving(false);
  };

  if (isLoading) {
    return <div className="max-w-3xl mx-auto p-6"><div className="animate-pulse"><div className="h-6 bg-gray-200 rounded w-2/3 mb-4" /><div className="h-4 bg-gray-100 rounded w-full mb-2" /></div></div>;
  }
  if (!bookmark) return <div className="max-w-3xl mx-auto p-6 text-gray-400">书签不存在</div>;

  const handleDelete = async () => {
    if (!confirm("确定删除此书签？")) return;
    await api.deleteBookmark(bookmarkId);
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    router.push("/");
  };

  const handleRetry = async () => {
    await api.retryBookmark(bookmarkId);
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
  };

  // ── 标注逻辑 ──
  const parsedAnns: Annotation[] = (() => {
    try { return JSON.parse(bookmark.annotations || "[]"); } catch { return []; }
  })();

  const enterAnnotationMode = () => {
    setAnnotations(parsedAnns);
    setAnnotating(true);
  };

  const handleTextSelect = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
    const quote = sel.toString().trim();
    // 去重
    if (annotations.some((a) => a.quote === quote)) return;
    const newAnn: Annotation = { quote, comment: "", id: Date.now() };
    setAnnotations((prev) => [...prev, newAnn]);
    setEditAnnId(newAnn.id);
    setEditAnnComment("");
    sel.removeAllRanges();
  };

  const saveAnnotationComment = () => {
    setAnnotations((prev) => prev.map((a) => a.id === editAnnId ? { ...a, comment: editAnnComment } : a));
    setEditAnnId(null);
    setEditAnnComment("");
  };

  const deleteAnnotation = (id: number) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (editAnnId === id) { setEditAnnId(null); setEditAnnComment(""); }
  };

  const editAnnotation = (ann: Annotation) => {
    setEditAnnId(ann.id);
    setEditAnnComment(ann.comment);
  };

  const saveAnnotations = async () => {
    await api.updateBookmark(bookmarkId, { annotations: JSON.stringify(annotations) });
    qc.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
    setAnnotating(false);
    setAnnotations([]);
    setEditAnnId(null);
  };

  const cancelAnnotations = () => {
    setAnnotating(false);
    setAnnotations([]);
    setEditAnnId(null);
  };

  // ── 批注显示逻辑 ──
  const splitText = (text: string, anns: Annotation[]): { text: string; ann: Annotation | null }[] => {
    const segments: { text: string; ann: Annotation | null }[] = [];
    let remaining = text;
    anns.forEach((ann) => {
      const idx = remaining.indexOf(ann.quote);
      if (idx >= 0) {
        if (idx > 0) segments.push({ text: remaining.slice(0, idx), ann: null });
        segments.push({ text: ann.quote, ann });
        remaining = remaining.slice(idx + ann.quote.length);
      }
    });
    if (remaining) segments.push({ text: remaining, ann: null });
    return segments;
  };

  const renderAnnotatedContent = (text: string, anns: Annotation[], editable: boolean) => {
    if (anns.length === 0) {
      return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>;
    }
    const segments = splitText(text, anns);

    // 给每个标注分配序号
    let annIdx = 0;

    return (
      <div className="flex gap-4">
        {/* 正文——自然行文 + 角标序号 */}
        <div className="flex-1 min-w-0 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {segments.map((seg, i) => {
            if (seg.ann) {
              const idx = annIdx++;
              return (
                <mark key={i} className="bg-sky-100 font-bold rounded px-0.5 relative">
                  {seg.text}
                  <sup className="text-xs text-blue-500 font-bold ml-0.5">{idx + 1}</sup>
                </mark>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })}
        </div>

        {/* 批注——按序号对应 */}
        <div className="w-44 flex-shrink-0 space-y-2">
          {anns.map((ann, idx) => (
            <div key={ann.id} className="text-xs bg-blue-50 rounded px-2 py-1.5 leading-relaxed">
              <span className="text-blue-500 font-bold mr-1">{idx + 1}.</span>
              {editable && editAnnId === ann.id ? (
                <>
                  <textarea value={editAnnComment} onChange={(e) => setEditAnnComment(e.target.value)}
                    rows={2} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs resize-none mb-1"
                    onClick={(e) => e.stopPropagation()} autoFocus />
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); saveAnnotationComment(); }}
                      className="text-xs text-blue-500 hover:underline">保存</button>
                    <button onClick={(e) => { e.stopPropagation(); setEditAnnId(null); }}
                      className="text-xs text-gray-400 hover:underline">取消</button>
                  </div>
                </>
              ) : ann.comment ? (
                <div>
                  <span className="text-blue-700">{ann.comment}</span>
                  {editable && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => { e.stopPropagation(); editAnnotation(ann); }}
                        className="text-xs text-blue-500 hover:underline">编辑</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                        className="text-xs text-red-400 hover:underline">删除</button>
                    </div>
                  )}
                </div>
              ) : editable ? (
                <div>
                  <p className="text-gray-400 mb-1">无批注</p>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); editAnnotation(ann); }}
                      className="text-xs text-blue-500 hover:underline">编辑</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                      className="text-xs text-red-400 hover:underline">删除</button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const content = (bookmark as BookmarkDetail).full_summary || bookmark.summary || "";

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← 返回</button>

      <h1 className="text-xl font-bold text-gray-900 mb-2">{bookmark.title || bookmark.url}</h1>
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
        <span>{bookmark.domain || "笔记"}</span>
        <span>{new Date(bookmark.created_at).toLocaleDateString("zh-CN")}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        {bookmark.url && <a href={bookmark.url} target="_blank" className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">打开原文</a>}
        {!bookmark.url && (
          <a href={`/bookmarks/${bookmarkId}`} target="_blank" className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">在新页面打开</a>
        )}
        {bookmark.status === "failed" && (
          <button onClick={handleRetry} className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600">重试</button>
        )}
        {!bookmark.use_ai && !annotating && (
          <button onClick={enterAnnotationMode} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50">标注</button>
        )}
        <button onClick={handleDelete} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg">删除</button>
      </div>

      {/* Status */}
      {bookmark.status === "failed" && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs">处理失败: {bookmark.error_message}</div>}
      {bookmark.status !== "ready" && bookmark.status !== "failed" && <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-xs">正在处理中...</div>}

      {/* Categories & Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {bookmark.categories.map((c) => (
          <span key={c.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{c.icon} {c.name}</span>
        ))}
        {bookmark.tags.map((t) => (
          <span key={t.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{t.name}</span>
        ))}
      </div>

      {/* 标注模式 */}
      {annotating && (
        <div className="flex gap-4 mb-6">
          {/* 正文（纯文本，方便选中） */}
          <div className="flex-1 min-w-0" onMouseUp={handleTextSelect}>
            <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-yellow-300">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">选中文字添加批注</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line select-text">{content || "暂无内容"}</p>
            </div>
          </div>

          {/* 批注区（框外） */}
          <div className="w-44 flex-shrink-0 space-y-2">
            <h3 className="text-sm font-semibold text-gray-600">批注</h3>
            {annotations.length === 0 && <p className="text-xs text-gray-400">选中文字添加批注</p>}
            {annotations.map((ann) => (
              <div key={ann.id} className="text-xs bg-blue-50 rounded px-2 py-1.5 leading-relaxed">
                <span className="text-gray-800 font-medium">「{ann.quote.length > 15 ? ann.quote.slice(0, 15) + "..." : ann.quote}」</span>
                {editAnnId === ann.id ? (
                  <>
                    <textarea value={editAnnComment} onChange={(e) => setEditAnnComment(e.target.value)}
                      rows={2} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs resize-none my-1"
                      autoFocus />
                    <div className="flex gap-1">
                      <button onClick={saveAnnotationComment} className="text-xs text-blue-500 hover:underline">保存</button>
                      <button onClick={() => setEditAnnId(null)} className="text-xs text-gray-400 hover:underline">取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    {ann.comment && <p className="text-blue-700 mt-0.5">{ann.comment}</p>}
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => editAnnotation(ann)} className="text-xs text-blue-500 hover:underline">编辑</button>
                      <button onClick={() => deleteAnnotation(ann.id)} className="text-xs text-red-400 hover:underline">删除</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 标注模式按钮 */}
      {annotating && (
        <div className="flex gap-2 mb-6">
          <button onClick={saveAnnotations} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">保存标注</button>
          <button onClick={cancelAnnotations} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
        </div>
      )}

      {/* 非标注模式：正常显示 */}
      {!annotating && (
        <>
          {bookmark.summary && (
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">摘要</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{bookmark.summary}</p>
            </div>
          )}
          {content && !bookmark.use_ai && (
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">正文</h3>
              {renderAnnotatedContent(content, parsedAnns, false)}
            </div>
          )}
        </>
      )}

      {/* Note */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">笔记</h3>
        {noteEdit ? (
          <div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={saveNote} disabled={saving} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">{saving ? "保存中..." : "保存"}</button>
              <button onClick={() => setNoteEdit(false)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">取消</button>
            </div>
          </div>
        ) : (
          <div onClick={startNoteEdit} className="cursor-pointer">
            {bookmark.note ? <p className="text-sm text-gray-700 whitespace-pre-line">{bookmark.note}</p> : <p className="text-sm text-gray-300 italic">点击添加笔记...</p>}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recs && recs.items.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">{recs.source}</h3>
          <div className="space-y-2">
            {recs.items.map((b: Bookmark) => (
              <a key={b.id} href={`/bookmarks/${b.id}`} className="block p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-800">{b.title || b.url}</p>
                {b.summary && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{b.summary}</p>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

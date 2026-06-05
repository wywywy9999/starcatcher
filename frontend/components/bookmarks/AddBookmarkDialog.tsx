"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "ai" | "manual" | "batch" | "note";

export default function AddBookmarkDialog({ open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [mode, setMode] = useState<Mode>("ai");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const qc = useQueryClient();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });

  if (!open) return null;

  const toggleCat = (id: number) => {
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setError("");
    setProgress("");

    if (mode === "batch") {
      const urls = batchUrls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
      if (urls.length === 0) { setError("请输入至少一个网址"); return; }
      setSubmitting(true);
      let count = 0;
      for (const u of urls) {
        try {
          await api.createBookmark({ url: u, use_ai: true, category_ids: selectedCats.length > 0 ? selectedCats : undefined });
          count++;
          setProgress(`已添加 ${count}/${urls.length}`);
        } catch { /* skip duplicates */ }
      }
      setSubmitting(false);
      resetAndClose();
      return;
    }

    if (mode === "note") {
      if (!title.trim() || !content.trim()) { setError("标题和内容不能为空"); return; }
      setSubmitting(true);
      try {
        await api.createBookmark({
          url: "",
          use_ai: false,
          title: title.trim(),
          summary: summary.trim() || content.trim().slice(0, 100),
          full_summary: content.trim(),
          category_ids: selectedCats.length > 0 ? selectedCats : undefined,
        });
        resetAndClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "保存失败");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!url.trim()) { setError("请输入网址"); return; }
    if (mode === "manual" && (!title.trim() || !summary.trim())) {
      setError("手动模式需要填写标题和摘要"); return;
    }

    setSubmitting(true);
    try {
      await api.createBookmark({
        url: url.trim(),
        use_ai: mode === "ai",
        title: mode === "manual" ? title.trim() : undefined,
        summary: mode === "manual" ? summary.trim() : undefined,
        category_ids: selectedCats.length > 0 ? selectedCats : undefined,
      });
      resetAndClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    setUrl(""); setBatchUrls(""); setTitle(""); setSummary(""); setContent("");
    setMode("ai"); setSelectedCats([]); setSubmitting(false);
    onClose();
  };

  const modes: { key: Mode; label: string }[] = [
    { key: "ai", label: "AI 自动" },
    { key: "manual", label: "手动填写" },
    { key: "note", label: "自己写" },
    { key: "batch", label: "批量添加" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">添加书签</h2>

        {/* Mode toggle */}
        <div className="flex flex-wrap gap-2 mb-4">
          {modes.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${mode === m.key ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* AI / Manual URL */}
        {(mode === "ai" || mode === "manual") && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">网址</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4" />
          </>
        )}

        {/* Batch URLs */}
        {mode === "batch" && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">网址（每行一个，或用逗号分隔）</label>
            <textarea value={batchUrls} onChange={(e) => setBatchUrls(e.target.value)}
              placeholder="https://example.com/article1&#10;https://example.com/article2"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 resize-none" />
          </>
        )}

        {/* Manual fields */}
        {mode === "manual" && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3" />
            <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="输入摘要..." rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3 resize-none" />
          </>
        )}

        {/* Note mode */}
        {mode === "note" && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3" />
            <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="一句话概括..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3 resize-none" />
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="写下你想保存的内容..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3 resize-none" />
          </>
        )}

        {/* Category selection */}
        <label className="block text-sm font-medium text-gray-700 mb-1">分类（可多选）</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories?.map((cat) => {
            const checked = selectedCats.includes(cat.id);
            return (
              <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${checked ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                {cat.icon} {cat.name}
              </button>
            );
          })}
        </div>

        {progress && <p className="text-sm text-blue-600 mb-3">{progress}</p>}
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {submitting ? (mode === "batch" ? "添加中..." : "保存中...") : mode === "batch" ? "全部添加" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

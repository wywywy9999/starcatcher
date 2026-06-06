"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import CategoryPicker from "./CategoryPicker";
import TagInput from "./TagInput";
import type { BookmarkDetail } from "@/lib/types";

interface Props {
  bookmark: BookmarkDetail;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function BookmarkEditForm({ bookmark, onSave, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [catIds, setCatIds] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const { data: allTags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });

  useEffect(() => {
    setTitle(bookmark.title || "");
    setSummary(bookmark.summary || "");
    setContent(bookmark.full_summary || "");
    setCatIds(bookmark.categories.map((c) => c.id));
    setTags(bookmark.tags.map((t) => t.name));
  }, [bookmark]);

  const handleSave = () => {
    onSave({ title, summary, full_summary: content, category_ids: catIds, tags });
  };

  const showContent = !bookmark.use_ai;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500">标题</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500">摘要</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="w-full px-2 py-1 border rounded text-sm" />
      </div>
      {showContent && (
        <div>
          <label className="text-xs text-gray-500">正文（支持 Markdown）</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="w-full px-2 py-1 border rounded text-sm" />
        </div>
      )}
      <div>
        <label className="text-xs text-gray-500">分类</label>
        <CategoryPicker selectedIds={catIds} onToggle={(id) => setCatIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
      </div>
      <div>
        <label className="text-xs text-gray-500">标签</label>
        <TagInput tags={tags} allTags={allTags || []} onAdd={(n) => setTags((p) => [...p, n])} onRemove={(n) => setTags((p) => p.filter((x) => x !== n))} />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">保存修改</button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
      </div>
    </div>
  );
}

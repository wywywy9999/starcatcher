"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Tag } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TagManager({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });
  const [newName, setNewName] = useState("");

  if (!open) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await fetch("http://127.0.0.1:8000/api/v1/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    qc.invalidateQueries({ queryKey: ["tags"] });
    setNewName("");
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`确定删除标签「${tag.name}」？使用该标签的书签不受影响。`)) return;
    await fetch(`http://127.0.0.1:8000/api/v1/tags/${tag.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["tags"] });
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">管理标签</h2>

        {/* 新增 */}
        <div className="flex gap-2 mb-4">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="新标签名称" className="flex-1 px-2 py-1 text-sm border rounded" />
          <button onClick={handleAdd} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
            添加
          </button>
        </div>

        {/* 已有标签 */}
        <div className="flex flex-wrap gap-1 max-h-60 overflow-y-auto">
          {tags?.map((t: Tag) => (
            <span key={t.id} title={t.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs group max-w-[100px]">
              <span className="truncate">{t.name}</span>
              <button onClick={() => handleDelete(t)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs leading-none flex-shrink-0">
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">关闭</button>
        </div>
      </div>
    </div>
  );
}

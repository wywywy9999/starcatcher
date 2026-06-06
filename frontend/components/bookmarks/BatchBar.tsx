"use client";

import { useQueryClient } from "@tanstack/react-query";

interface Props { selectedIds: number[]; onClear: () => void; }
const API = "http://127.0.0.1:8000/api/v1";

export default function BatchBar({ selectedIds, onClear }: Props) {
  const qc = useQueryClient();

  if (selectedIds.length === 0) return null;

  const handleDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedIds.length} 篇书签？`)) return;
    await fetch(`${API}/bookmarks/batch/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedIds),
    });
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    onClear();
  };

  const handleExport = async () => {
    const res = await fetch(`${API}/bookmarks/batch/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedIds),
    });
    const { data } = await res.json();
    const blob = new Blob([data], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "starcatcher-export.md";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
      <span className="text-sm">已选 {selectedIds.length} 篇</span>

      <button onClick={handleExport} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-xs rounded-lg">导出选中</button>

      <button onClick={handleDelete} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-xs rounded-lg">
        删除选中
      </button>
      <button onClick={onClear} className="px-3 py-1 text-xs text-gray-400 hover:text-white">
        取消
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  selectedIds: number[];
  onClear: () => void;
}

const API = "http://127.0.0.1:8000/api/v1";

export default function BatchBar({ selectedIds, onClear }: Props) {
  const qc = useQueryClient();
  const [showExport, setShowExport] = useState(false);

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

  const handleExport = async (format: "md" | "csv") => {
    const res = await fetch(`${API}/bookmarks/batch/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, format }),
    });
    const { data } = await res.json();
    const blob = new Blob([data], { type: format === "csv" ? "text/csv" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkvault-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
      <span className="text-sm">已选 {selectedIds.length} 篇</span>

      {/* 导出下拉 */}
      <div className="relative">
        <button
          onClick={() => setShowExport(!showExport)}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-xs rounded-lg"
        >
          导出选中
        </button>
        {showExport && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[100px]">
            <button
              onClick={() => handleExport("md")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Markdown (.md)
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              CSV / Excel (.csv)
            </button>
          </div>
        )}
      </div>

      <button onClick={handleDelete} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-xs rounded-lg">
        删除选中
      </button>
      <button onClick={onClear} className="px-3 py-1 text-xs text-gray-400 hover:text-white">
        取消
      </button>
    </div>
  );
}

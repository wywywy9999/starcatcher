"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ICONS = ["💻", "🔬", "💼", "🎨", "📖", "🎬", "🛠️", "🌟", "📌", "💰", "🏠", "🎮", "🎵", "✈️", "🍔", "⚽", "📱", "🚗"];

export default function CategoryManager({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  if (!open) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await fetch("http://127.0.0.1:8000/api/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
    });
    qc.invalidateQueries({ queryKey: ["categories"] });
    setNewName(""); setNewIcon("📌");
  };

  const handleUpdate = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/v1/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, icon: editIcon }),
    });
    qc.invalidateQueries({ queryKey: ["categories"] });
    setEditingId(null);
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`确定删除分类「${cat.name}」？该分类下的书签不会删除，但会变为未分类。`)) return;
    await fetch(`http://127.0.0.1:8000/api/v1/categories/${cat.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || "📌");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">管理分类</h2>

        {/* 新增 */}
        <div className="flex gap-2 mb-4">
          <div className="flex gap-1">
            {ICONS.slice(0, 6).map((icon) => (
              <button key={icon} onClick={() => setNewIcon(icon)}
                className={`w-7 h-7 text-sm rounded ${newIcon === icon ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-gray-100"}`}>
                {icon}
              </button>
            ))}
          </div>
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="新分类名称" className="flex-1 px-2 py-1 text-sm border rounded" />
          <button onClick={handleAdd} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
            添加
          </button>
        </div>

        {/* 已有列表 */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {categories?.map((cat: Category) => (
            <div key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 group">
              {editingId === cat.id ? (
                <>
                  <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)}
                    className="w-8 text-center text-sm border rounded" />
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-0.5 text-sm border rounded" />
                  <button onClick={() => handleUpdate(cat.id)}
                    className="text-xs text-blue-500 hover:underline">保存</button>
                  <button onClick={() => setEditingId(null)}
                    className="text-xs text-gray-400 hover:underline">取消</button>
                </>
              ) : (
                <>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                  <span className="text-xs text-gray-300">{cat.bookmark_count}篇</span>
                  <button onClick={() => startEdit(cat)}
                    className="text-xs text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(cat)}
                    className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                    删除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">关闭</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category, Tag, Collection } from "@/lib/types";
import CategoryManager from "./CategoryManager";
import TagManager from "./TagManager";

interface Props {
  onFilter: (type: "category" | "tag" | "collection", slug: string) => void;
  activeCategory: string | null;
  activeTag: string | null;  // comma-separated tags
  activeCollection: number | null;
}

export default function Sidebar({ onFilter, activeCategory, activeTag, activeCollection }: Props) {
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });
  const { data: collections } = useQuery({ queryKey: ["collections"], queryFn: api.listCollections });
  const qc = useQueryClient();
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showTagMgr, setShowTagMgr] = useState(false);

  return (
    <>
    <aside className="w-60 flex-shrink-0 h-full overflow-y-auto border-r border-gray-200 bg-white p-4 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
        <span>StarCatcher</span>
      </div>

      {/* 集合 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">集合</h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => onFilter("collection", "")}
              className={`w-full text-left px-2 py-1 rounded text-sm ${activeCollection === null ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              全部
            </button>
          </li>
          {collections?.map((c: Collection) => (
            <li key={c.id}>
              <button
                onClick={() => onFilter("collection", String(c.id))}
                className={`w-full text-left px-2 py-1 rounded text-sm flex justify-between ${activeCollection === c.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <span>{c.name}</span>
                <span className="text-xs text-gray-400">{c.bookmark_count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 分类 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">分类</h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => onFilter("category", "")}
              className={`w-full text-left px-2 py-1 rounded text-sm ${!activeCategory ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              全部分类
            </button>
          </li>
          {categories?.map((cat: Category) => (
            <li key={cat.id}>
              <button
                onClick={() => onFilter("category", cat.slug)}
                className={`w-full text-left px-2 py-1 rounded text-sm flex justify-between ${activeCategory === cat.slug ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <span>{cat.icon} {cat.name}</span>
                <span className="text-xs text-gray-400">{cat.bookmark_count}</span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => setShowCatMgr(true)}
          className="mt-2 text-xs text-gray-400 hover:text-blue-500">
          + 管理分类
        </button>
      </section>

      {/* 标签 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">标签</h3>
        <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
          {tags?.sort((a, b) => b.bookmark_count - a.bookmark_count).slice(0, 20).map((t: Tag) => (
            <button
              key={t.id}
              onClick={() => onFilter("tag", t.slug)}
              title={t.name}
              className={`px-2 py-0.5 rounded text-xs max-w-[88px] truncate ${activeTag?.split(",").includes(t.slug) ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button onClick={() => setShowTagMgr(true)}
          className="mt-2 text-xs text-gray-400 hover:text-blue-500">
          {tags && tags.length > 20 ? `管理全部 ${tags.length} 个标签` : "管理标签"}
        </button>
      </section>
    </aside>
    <CategoryManager open={showCatMgr} onClose={() => setShowCatMgr(false)} />
    <TagManager open={showTagMgr} onClose={() => setShowTagMgr(false)} />
    </>
  );
}

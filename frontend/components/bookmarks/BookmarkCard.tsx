"use client";

import type { Bookmark } from "@/lib/types";

interface Props {
  bookmark: Bookmark;
  onTagClick: (tag: string) => void;
  onClick: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function BookmarkCard({ bookmark, onTagClick, onClick, isSelected, onToggleSelect }: Props) {
  const timeAgo = getTimeAgo(bookmark.created_at);

  return (
    <div
      onClick={onToggleSelect ? onToggleSelect : onClick}
      className={`h-full bg-white rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group flex flex-col justify-between ${isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"}`}
    >
      {/* 上半部分：标题 + 摘要 */}
      <div className="min-w-0 flex-1">
        {/* 标题 */}
        <div className="flex items-start gap-2 mb-1.5">
          {onToggleSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
              }`}
            >
              {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>}
            </button>
          )}
          <img
            src={bookmark.favicon_url || "/globe.svg"}
            alt=""
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = "/globe.svg"; }}
          />
          {bookmark.is_pinned && <span className="text-xs flex-shrink-0">📌</span>}
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {bookmark.title || bookmark.url}
          </h3>
        </div>

        {/* 摘要 */}
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {bookmark.summary || "暂无摘要"}
        </p>
      </div>

      {/* 下半部分：标签 + 域名 + 时间 + 状态 */}
      <div className="mt-2">
        {/* 标签 */}
        <div className="flex items-center gap-1 overflow-hidden h-5 mb-1">
          {bookmark.tags.length > 0 ? (
            <>
              {bookmark.tags.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); onTagClick(t.slug); }}
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs hover:bg-blue-100 hover:text-blue-600 cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  {t.name}
                </span>
              ))}
              {bookmark.tags.length > 3 && (
                <span className="text-xs text-gray-400 flex-shrink-0">+{bookmark.tags.length - 3}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-300">未分类</span>
          )}
        </div>

        {/* 域名 + 时间 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="truncate mr-2">{bookmark.domain}</span>
        </div>

        {/* 状态 */}
        {bookmark.status !== "ready" && (
          <div className="mt-1">
            {bookmark.status === "failed" ? (
              <span className="inline-block px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-600">失败</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {bookmark.status === "pending" && "排队中"}
                {bookmark.status === "scraping" && "抓取网页..."}
                {bookmark.status === "scraped" && "抓取网页..."}
                {bookmark.status === "summarizing" && "AI 分析..."}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

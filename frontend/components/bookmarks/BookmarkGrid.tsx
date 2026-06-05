"use client";

import { useState, useCallback, useRef } from "react";
import type { Bookmark } from "@/lib/types";
import BookmarkCard from "./BookmarkCard";

interface Props {
  bookmarks: Bookmark[];
  onTagClick: (tag: string) => void;
  onCardClick: (id: number) => void;
  loading?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onReorder?: (ids: number[]) => void;
}

export default function BookmarkGrid({ bookmarks, onTagClick, onCardClick, loading, selectedIds, onToggleSelect, onReorder }: Props) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: number) => {
    dragNode.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.4";
    setDragId(id);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDragId(null);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setDragOverId(id);
  }, [dragId]);

  const handleDrop = useCallback((e: React.DragEvent, dropId: number) => {
    e.preventDefault();
    if (!onReorder || dragId === null || dragId === dropId) return;

    const ids = bookmarks.map((b) => b.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(dropId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragId);
    onReorder(ids);
    setDragId(null);
    setDragOverId(null);
  }, [dragId, bookmarks, onReorder]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-lg">还没有书签</p>
        <p className="text-sm mt-1">点击「添加书签」开始收藏</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookmarks.map((b) => (
        <div
          key={b.id}
          draggable={!!onReorder}
          onDragStart={(e) => handleDragStart(e, b.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, b.id)}
          onDrop={(e) => handleDrop(e, b.id)}
          className={`transition-all ${dragOverId === b.id ? "border-t-2 border-blue-400" : ""}`}
        >
          <BookmarkCard bookmark={b} onTagClick={onTagClick} onClick={() => onCardClick(b.id)}
            isSelected={selectedIds?.has(b.id)}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(b.id) : undefined} />
        </div>
      ))}
    </div>
  );
}

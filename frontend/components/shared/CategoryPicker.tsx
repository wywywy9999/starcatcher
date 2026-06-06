"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Props {
  selectedIds: number[];
  onToggle: (id: number) => void;
}

export default function CategoryPicker({ selectedIds, onToggle }: Props) {
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });

  return (
    <div className="flex flex-wrap gap-1">
      {categories?.map((cat) => (
        <button key={cat.id} onClick={() => onToggle(cat.id)}
          className={`px-2 py-1 rounded text-xs border ${selectedIds.includes(cat.id) ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
}

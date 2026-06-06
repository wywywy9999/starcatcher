"use client";

import { useState } from "react";

interface Props {
  tags: string[];
  allTags: { id: number; name: string }[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}

export default function TagInput({ tags, allTags, onAdd, onRemove }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);

  const handleInput = (val: string) => {
    setInput(val);
    if (val.trim()) {
      setSuggestions(allTags.filter((t) => t.name.toLowerCase().includes(val.toLowerCase()) && !tags.includes(t.name)).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const add = (name: string) => {
    if (!name.trim() || tags.includes(name.trim())) return;
    onAdd(name.trim());
    setInput("");
    setSuggestions([]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {tags.map((n) => (
          <span key={n} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{n}
            <button onClick={() => onRemove(n)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input value={input} onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) add(input.trim()); }}
          placeholder="输入标签，回车添加" className="w-full px-2 py-1 border rounded text-sm" />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10">
            {suggestions.map((s) => (
              <button key={s.id} onClick={() => add(s.name)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">已有: {s.name}</button>
            ))}
            <div className="border-t"><button onClick={() => add(input.trim())} className="w-full text-left px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50">新建: {input.trim()}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

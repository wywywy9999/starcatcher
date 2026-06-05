"use client";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddClick: () => void;
  batchMode: boolean;
  onBatchToggle: () => void;
}

export default function TopBar({ searchQuery, onSearchChange, onAddClick, batchMode, onBatchToggle }: Props) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="搜索书签..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <button
        onClick={onBatchToggle}
        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
          batchMode ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
        }`}
      >
        {batchMode ? "完成" : "批量操作"}
      </button>
      <button
        onClick={onAddClick}
        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
      >
        + 添加书签
      </button>
    </div>
  );
}

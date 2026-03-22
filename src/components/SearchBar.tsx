import { Search, X } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { cn } from "../lib/utils";

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = usePromptStore();

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索提示词..."
        className={cn(
          "w-full pl-9 pr-8 py-2 rounded-lg text-sm",
          "bg-[var(--bg-primary)] border border-[var(--border)]",
          "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
          "outline-none focus:border-[var(--accent)] transition-colors"
        )}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

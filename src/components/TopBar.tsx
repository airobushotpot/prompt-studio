import { useState, useRef, useEffect } from "react";
import { Plus, Moon, Sun, X } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { cn } from "../lib/utils";
import SearchBar from "./SearchBar";

export default function TopBar() {
  const { isDarkMode, toggleDarkMode, addPrompt, selectPrompt, tags, addTag } = usePromptStore();

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [isAddingQuickTag, setIsAddingQuickTag] = useState(false);
  const [newQuickTagName, setNewQuickTagName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  // Focus title input when modal opens
  useEffect(() => {
    if (showQuickAdd) {
      setTimeout(() => titleRef.current?.focus(), 50);
    } else {
      setQuickTitle("");
      setQuickContent("");
      setQuickTags([]);
      setIsAddingQuickTag(false);
      setNewQuickTagName("");
    }
  }, [showQuickAdd]);

  // Focus new tag input when entering add mode
  useEffect(() => {
    if (isAddingQuickTag && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isAddingQuickTag]);

  const handleQuickTagToggle = (tagId: string) => {
    setQuickTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddQuickTag = async () => {
    const name = newQuickTagName.trim();
    if (!name) return;
    const tagId = await addTag(name, "#8b5cf6");
    handleQuickTagToggle(tagId);
    setNewQuickTagName("");
    setIsAddingQuickTag(false);
  };

  const handleQuickTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddQuickTag();
    } else if (e.key === "Escape") {
      setIsAddingQuickTag(false);
      setNewQuickTagName("");
    }
  };

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) return;
    setIsSaving(true);
    try {
      const id = await addPrompt({
        title: quickTitle.trim(),
        content: quickContent,
        description: "",
        folder_id: null,
        tags: quickTags,
        is_favorite: false,
        is_deleted: false,
      });
      selectPrompt(id);
      setShowQuickAdd(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowQuickAdd(false);
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleQuickAdd();
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <h1 className="text-base font-semibold text-[var(--text-primary)] whitespace-nowrap">
          Prompt Studio
        </h1>
        <SearchBar />

        {/* Quick add button */}
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          添加提示词
        </button>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title={isDarkMode ? "切换浅色主题" : "切换深色主题"}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Quick add modal */}
      {showQuickAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQuickAdd(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl flex flex-col"
            style={{ background: "var(--bg-primary)", maxHeight: "80vh" }}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                添加提示词
              </h2>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  标题
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="给你的提示词起个名字..."
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg text-sm",
                    "bg-[var(--bg-secondary)] text-[var(--text-primary)]",
                    "placeholder:text-[var(--text-secondary)]",
                    "outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  )}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  内容
                </label>
                <textarea
                  value={quickContent}
                  onChange={(e) => setQuickContent(e.target.value)}
                  placeholder="粘贴你的提示词内容..."
                  rows={8}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg text-sm resize-none",
                    "bg-[var(--bg-secondary)] text-[var(--text-primary)]",
                    "placeholder:text-[var(--text-secondary)]",
                    "outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  )}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  标签
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleQuickTagToggle(tag.id)}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs text-white transition-opacity",
                        quickTags.includes(tag.id) ? "opacity-100" : "opacity-40"
                      )}
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {isAddingQuickTag ? (
                    <input
                      ref={newTagInputRef}
                      type="text"
                      value={newQuickTagName}
                      onChange={(e) => setNewQuickTagName(e.target.value)}
                      onKeyDown={handleQuickTagKeyDown}
                      onBlur={() => {
                        setIsAddingQuickTag(false);
                        setNewQuickTagName("");
                      }}
                      placeholder="标签名..."
                      className="w-24 px-2 py-0.5 text-xs rounded border border-[var(--accent)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setIsAddingQuickTag(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      新标签
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex items-center justify-end gap-2 border-t border-[var(--border)]">
              <button
                onClick={() => setShowQuickAdd(false)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleQuickAdd}
                disabled={!quickTitle.trim() || isSaving}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity",
                  "bg-[var(--accent)] hover:opacity-90",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <Plus className="w-4 h-4" />
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>

            {/* Hint */}
            <p className="px-5 pb-3 text-xs text-[var(--text-secondary)] text-center opacity-60">
              ⌘ + Enter 快速保存
            </p>
          </div>
        </div>
      )}
    </>
  );
}

import { useMemo, useState } from "react";
import { Star, Folder, Trash2, RotateCcw, Copy, Shuffle } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { cn, formatDate } from "../lib/utils";

/** Extract plain text from HTML */
function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/** Get match snippet with surrounding context */
function highlightMatch(text: string, query: string): { snippet: string; hasMatch: boolean } {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    return { snippet: text.slice(0, 80), hasMatch: false };
  }
  const start = Math.max(0, idx - 25);
  const end = Math.min(text.length, idx + query.length + 25);
  const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  return { snippet, hasMatch: true };
}

/** Render snippet with highlighted query */
function SnippetWithHighlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <span>{text.slice(0, 80)}{text.length > 80 ? "…" : ""}</span>;
  }
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    return <span>{text.slice(0, 80)}{text.length > 80 ? "…" : ""}</span>;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <span>
      {before && <span>{before}</span>}
      <mark className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded px-0.5">{match}</mark>
      {after && <span>{after}</span>}
    </span>
  );
}

export default function PromptList() {
  const {
    prompts: allPrompts,
    tags,
    folders,
    selectedPromptId,
    selectedFolderId,
    selectedTagId,
    searchQuery,
    selectPrompt,
    view,
    toggleFavorite,
    deletePrompt,
    restorePrompt,
    permanentlyDeletePrompt,
    duplicatePrompt,
  } = usePromptStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const prompts = useMemo(() => {
    let filtered = allPrompts;

    if (view === "trash") {
      filtered = filtered.filter((p) => p.is_deleted);
    } else {
      filtered = filtered.filter((p) => !p.is_deleted);
      if (view === "favorites") {
        filtered = filtered.filter((p) => p.is_favorite);
      }
    }

    if (selectedFolderId) {
      filtered = filtered.filter((p) => p.folder_id === selectedFolderId);
    }

    if (selectedTagId) {
      filtered = filtered.filter((p) => p.tags.includes(selectedTagId));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          htmlToText(p.content).toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => b.updated_at - a.updated_at);
  }, [allPrompts, view, selectedFolderId, selectedTagId, searchQuery]);

  const getTag = (tagId: string) => tags.find((t) => t.id === tagId);
  const getFolder = (folderId: string | null) =>
    folderId ? folders.find((f) => f.id === folderId) : null;

  const handleRandom = () => {
    if (prompts.length === 0) return;
    const random = prompts[Math.floor(Math.random() * prompts.length)];
    if (!random.is_deleted) selectPrompt(random.id);
  };

  const handleCopy = async (e: React.MouseEvent, content: string) => {
    e.stopPropagation();
    const text = htmlToText(content);
    await navigator.clipboard.writeText(text);
    setCopiedId((e as any).currentTarget?.dataset?.id || null);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] py-12">
        <p className="text-sm">
          {view === "trash"
            ? "回收站为空"
            : view === "favorites"
            ? "暂无收藏"
            : "暂无提示词"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Random roaming bar */}
      {view !== "trash" && prompts.length > 1 && (
        <div className="px-3 py-2 border-b border-[var(--border)]">
          <button
            onClick={handleRandom}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 border border-dashed border-[var(--border)] hover:border-[var(--accent)]/30 transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            随机漫游
          </button>
        </div>
      )}

      {/* 2-column card grid */}
      <div className="p-2 grid grid-cols-2 gap-2">
        {prompts.map((prompt) => {
          const folder = getFolder(prompt.folder_id);
          const promptTags = prompt.tags
            .map((id) => getTag(id))
            .filter(Boolean)
            .slice(0, 2);

          const plainContent = htmlToText(prompt.content);
          const matchResult = searchQuery.trim()
            ? highlightMatch(plainContent, searchQuery)
            : { snippet: plainContent.slice(0, 120), hasMatch: false };
          const snippet = matchResult.snippet;

          const isCopied = copiedId === prompt.id;

          return (
            <div
              key={prompt.id}
              onClick={() => !prompt.is_deleted && selectPrompt(prompt.id)}
              className={cn(
                "group relative flex flex-col rounded-xl cursor-pointer transition-all duration-150",
                "bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]",
                selectedPromptId === prompt.id
                  ? "ring-2 ring-[var(--accent)] bg-[var(--accent)]/5"
                  : "hover:ring-1 hover:ring-[var(--border)]",
                prompt.is_deleted && "opacity-60"
              )}
            >
              {/* Card body */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                {/* Header row */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className={cn(
                          "text-sm font-semibold truncate",
                          selectedPromptId === prompt.id
                            ? "text-[var(--accent)]"
                            : "text-[var(--text-primary)]"
                        )}
                      >
                        {prompt.title}
                      </h3>
                      {prompt.is_favorite && (
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {prompt.description && !searchQuery.trim() && (
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-1">
                        {prompt.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Content preview — first 3 lines */}
                <div className="flex-1">
                  {searchQuery.trim() ? (
                    /* Show matched snippet */
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      <SnippetWithHighlight text={snippet} query={searchQuery} />
                    </p>
                  ) : (
                    /* Show first 3 lines of content */
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                      {plainContent || "（无内容）"}
                    </p>
                  )}
                </div>

                {/* Footer: folder + tags + date */}
                <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                  {folder && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <Folder className="w-3 h-3" />
                      {folder.name}
                    </span>
                  )}
                  {promptTags.map((tag) =>
                    tag ? (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ) : null
                  )}
                  <span className="ml-auto text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {formatDate(prompt.updated_at)}
                  </span>
                </div>
              </div>

              {/* Action buttons (trash view or hover) */}
              {view === "trash" ? (
                <div className="px-3 pb-3 flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); restorePrompt(prompt.id); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> 恢复
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); permanentlyDeletePrompt(prompt.id); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> 删除
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    "absolute right-2 top-2 flex items-center gap-1",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                    "bg-[var(--bg-primary]/90 dark:bg-[var(--bg-secondary)]/90 rounded-lg p-1 shadow-sm"
                  )}
                >
                  <button
                    data-id={prompt.id}
                    onClick={(e) => handleCopy(e, prompt.content)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title={isCopied ? "已复制" : "复制内容"}
                  >
                    {isCopied ? (
                      <span className="text-xs text-green-500">✓</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicatePrompt(prompt.id); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="复制"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(prompt.id); }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      prompt.is_favorite
                        ? "text-yellow-500"
                        : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                    title={prompt.is_favorite ? "取消收藏" : "收藏"}
                  >
                    <Star className={cn("w-3.5 h-3.5", prompt.is_favorite ? "fill-yellow-500" : "")} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

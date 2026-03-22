import { Star, Folder, Trash2, RotateCcw, Copy } from "lucide-react";
import { usePromptStore, selectFilteredPrompts } from "../stores/promptStore";
import { cn, formatDate } from "../lib/utils";

export default function PromptList() {
  const {
    tags,
    folders,
    selectedPromptId,
    selectPrompt,
    view,
    toggleFavorite,
    deletePrompt,
    restorePrompt,
    permanentlyDeletePrompt,
    duplicatePrompt,
  } = usePromptStore();

  const prompts = usePromptStore(selectFilteredPrompts);

  const getTag = (tagId: string) => tags.find((t) => t.id === tagId);
  const getFolder = (folderId: string | null) =>
    folderId ? folders.find((f) => f.id === folderId) : null;

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
      <div className="p-2 space-y-1">
        {prompts.map((prompt) => {
          const folder = getFolder(prompt.folder_id);
          const promptTags = prompt.tags
            .map((id) => getTag(id))
            .filter(Boolean)
            .slice(0, 2);

          return (
            <div
              key={prompt.id}
              onClick={() => !prompt.is_deleted && selectPrompt(prompt.id)}
              className={cn(
                "group relative p-3 rounded-lg cursor-pointer transition-all",
                selectedPromptId === prompt.id
                  ? "bg-[var(--accent)] bg-opacity-10 ring-1 ring-[var(--accent)]"
                  : "bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]",
                prompt.is_deleted && "opacity-60"
              )}
            >
              {/* Header */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={cn(
                        "text-sm font-medium truncate",
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

                  {/* Description */}
                  {prompt.description && (
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-1">
                      {prompt.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {/* Folder */}
                {folder && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Folder className="w-3 h-3" />
                    {folder.name}
                  </span>
                )}

                {/* Tags */}
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

                {/* Date */}
                <span className="ml-auto text-xs text-[var(--text-secondary)]">
                  {formatDate(prompt.updated_at)}
                </span>
              </div>

              {/* Action buttons (show on hover or when in trash) */}
              {(view === "trash" || (!prompt.is_deleted)) && (
                <div
                  className={cn(
                    "absolute right-2 top-2 flex items-center gap-1",
                    view === "trash" ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    "transition-opacity"
                  )}
                >
                  {view === "trash" ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restorePrompt(prompt.id);
                        }}
                        className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                        title="恢复"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          permanentlyDeletePrompt(prompt.id);
                        }}
                        className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        title="永久删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(prompt.id);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          prompt.is_favorite
                            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                            : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                        )}
                        title={prompt.is_favorite ? "取消收藏" : "收藏"}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicatePrompt(prompt.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
                        title="复制"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePrompt(prompt.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

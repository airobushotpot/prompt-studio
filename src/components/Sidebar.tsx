import { useState } from "react";
import {
  Folder,
  FolderOpen,
  Star,
  Clock,
  Trash2,
  Tags,
  Plus,
} from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { cn } from "../lib/utils";
import ImportExportPanel from "./ImportExportPanel";
import TemplatePanel from "./TemplatePanel";

export default function Sidebar() {
  const {
    folders,
    tags,
    selectedFolderId,
    selectedTagId,
    view,
    addFolder,
    selectFolder,
    selectTag,
    setView,
  } = usePromptStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  return (
    <aside className="w-56 flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Special views */}
        <button
          onClick={() => setView("all")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            view === "all" && !selectedFolderId && !selectedTagId
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Folder className="w-4 h-4" />
          <span>全部提示词</span>
        </button>

        <button
          onClick={() => setView("favorites")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            view === "favorites"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Star className="w-4 h-4" />
          <span>收藏</span>
        </button>

        <button
          onClick={() => setView("recent")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            view === "recent"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>最近</span>
        </button>

        <button
          onClick={() => setView("trash")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            view === "trash"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Trash2 className="w-4 h-4" />
          <span>回收站</span>
        </button>

        {/* Divider */}
        <div className="my-3 border-t border-[var(--border)]" />

        {/* Folders section */}
        <div className="px-3 py-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            文件夹
          </span>
          <button
            onClick={() => setShowNewFolder(true)}
            className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showNewFolder && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
              onBlur={handleAddFolder}
              placeholder="文件夹名称..."
              className="w-full px-2 py-1 text-sm rounded border border-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none"
            />
          </div>
        )}

        {folders.map((folder) => {
          const Icon = expandedFolders.has(folder.id) ? FolderOpen : Folder;
          return (
            <div key={folder.id}>
              <button
                onClick={() => selectFolder(folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleFolder(folder.id);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedFolderId === folder.id
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">{folder.name}</span>
              </button>
            </div>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-[var(--border)]" />

        {/* Tags section */}
        <div className="px-3 py-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            标签
          </span>
        </div>

        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => selectTag(tag.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              selectedTagId === tag.id
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Tags className="w-4 h-4" style={{ color: tag.color }} />
            <span className="truncate">{tag.name}</span>
          </button>
        ))}

        {/* Import/Export */}
        <ImportExportPanel />

        {/* Templates */}
        <TemplatePanel />
      </nav>
    </aside>
  );
}

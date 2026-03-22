import { useEffect, useState } from "react";
import { usePromptStore } from "../stores/promptStore";
import { X, RotateCcw, GitCompare, Clock } from "lucide-react";

interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple line-by-line diff
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === undefined) {
      result.push({ type: "added", text: newLine });
    } else if (newLine === undefined) {
      result.push({ type: "removed", text: oldLine });
    } else if (oldLine === newLine) {
      result.push({ type: "same", text: oldLine });
    } else {
      result.push({ type: "removed", text: oldLine });
      result.push({ type: "added", text: newLine });
    }
  }
  return result;
}

interface Props {
  promptId: string;
  currentContent: string;
  onClose: () => void;
}

export default function VersionPanel({ promptId, currentContent, onClose }: Props) {
  const { versions, loadVersions, restoreVersion, selectedVersionId, selectVersion } =
    usePromptStore();
  const [compareMode, setCompareMode] = useState(false);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  useEffect(() => {
    loadVersions(promptId);
  }, [promptId]);

  // Sort versions newest first
  const sortedVersions = [...versions].sort((a, b) => b.created_at - a.created_at);


  const handleCompare = async (version: (typeof sortedVersions)[0]) => {
    // Use currentContent from the version vs current prompt content
    const oldContent = version.content;
    const lines = computeDiff(oldContent, currentContent);
    setDiffLines(lines);
    selectVersion(version.id);
    setCompareMode(true);
  };

  const handleRestore = async (versionId: string) => {
    await restoreVersion(versionId);
    onClose();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const previewContent = (content: string) => {
    const stripped = content.replace(/<[^>]+>/g, "").trim();
    return stripped.length > 50 ? stripped.slice(0, 50) + "..." : stripped;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[700px] max-h-[80vh] bg-[var(--bg-primary)] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">历史版本</h2>
            <span className="text-xs text-[var(--text-secondary)] ml-1">
              ({sortedVersions.length} 个版本)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compare mode banner */}
        {compareMode && diffLines.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
            <GitCompare className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-[var(--text-secondary)]">
              对比视图 —{" "}
              <span className="text-red-500">红色</span> 为旧版本，{" "}
              <span className="text-green-600">绿色</span> 为当前版本
            </span>
            <button
              onClick={() => {
                setCompareMode(false);
                setDiffLines([]);
                selectVersion(null);
              }}
              className="ml-auto text-xs text-[var(--accent)] hover:underline"
            >
              退出对比
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {compareMode && diffLines.length > 0 ? (
            /* Diff View */
            <div className="p-4 font-mono text-sm">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`px-3 py-0.5 whitespace-pre-wrap ${
                    line.type === "same"
                      ? "text-[var(--text-primary)]"
                      : line.type === "removed"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  }`}
                >
                  {line.type === "removed" ? "- " : line.type === "added" ? "+ " : "  "}
                  {line.text}
                </div>
              ))}
            </div>
          ) : (
            /* Version List */
            <div className="p-4 space-y-2">
              {sortedVersions.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-secondary)] py-8">
                  暂无历史版本
                </p>
              ) : (
                sortedVersions.map((version, idx) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedVersionId === version.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--border)] hover:border-[var(--accent)]/50"
                    }`}
                    onClick={() => selectVersion(version.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        v{sortedVersions.length - idx} · {formatTime(version.created_at)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompare(version);
                          }}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                        >
                          <GitCompare className="w-3 h-3" />
                          对比
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version.id);
                          }}
                          className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80"
                        >
                          <RotateCcw className="w-3 h-3" />
                          恢复
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {previewContent(version.content) || "(空)"}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

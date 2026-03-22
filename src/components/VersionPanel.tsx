import { useEffect, useState, useMemo } from "react";
import { usePromptStore } from "../stores/promptStore";
import { X, RotateCcw, GitCompare, Clock, Check } from "lucide-react";
import { diffLines, type Change } from "diff";

interface Props {
  promptId: string;
  currentContent: string;
  onClose: () => void;
}

export default function VersionPanel({ promptId, currentContent, onClose }: Props) {
  const { versions, loadVersions, restoreVersion, selectedVersionId, selectVersion } =
    usePromptStore();
  const [compareMode, setCompareMode] = useState(false);
  const [leftVersionId, setLeftVersionId] = useState<string | null>(null);
  const [rightVersionId, setRightVersionId] = useState<string | null>(null);

  useEffect(() => {
    loadVersions(promptId);
  }, [promptId]);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.created_at - a.created_at),
    [versions]
  );

  const getVersionById = (id: string) => versions.find((v) => v.id === id);

  // Diff computed from the two selected versions (or current vs one version)
  const diffResult = useMemo<Change[]>(() => {
    if (compareMode && leftVersionId && rightVersionId) {
      const left = getVersionById(leftVersionId);
      const right = getVersionById(rightVersionId);
      if (left && right) {
        return diffLines(left.content, right.content);
      }
    }
    return [];
  }, [compareMode, leftVersionId, rightVersionId, versions]);

  const handleCompare = (versionId: string) => {
    if (!leftVersionId) {
      setLeftVersionId(versionId);
    } else if (!rightVersionId && versionId !== leftVersionId) {
      setRightVersionId(versionId);
      setCompareMode(true);
    }
  };

  const handleCompareWithCurrent = async (versionId: string) => {
    setLeftVersionId(versionId);
    setRightVersionId(null); // null means "current"
    selectVersion(versionId);
    setCompareMode(true);
  };

  const openCompareMode = () => {
    setCompareMode(true);
    setLeftVersionId(null);
    setRightVersionId(null);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setLeftVersionId(null);
    setRightVersionId(null);
    selectVersion(null);
  };

  const handleRestore = async (versionId: string) => {
    await restoreVersion(versionId);
    onClose();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const previewContent = (content: string) => {
    const stripped = content.replace(/<[^>]+>/g, "").trim();
    return stripped.length > 60 ? stripped.slice(0, 60) + "..." : stripped;
  };

  const leftVersion = leftVersionId ? getVersionById(leftVersionId) : null;
  // rightVersionId null means current
  const rightVersionLabel = rightVersionId
    ? getVersionById(rightVersionId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[800px] max-h-[85vh] bg-[var(--bg-primary)] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">历史版本</h2>
            <span className="text-xs text-[var(--text-secondary)] ml-1">
              ({sortedVersions.length} 个版本)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!compareMode && sortedVersions.length >= 2 && (
              <button
                onClick={openCompareMode}
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/5 transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5" />
                对比两个版本
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compare mode hint */}
        {compareMode && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800/30">
            <GitCompare className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {!leftVersionId
                ? "请选择左侧版本（较旧）"
                : !rightVersionId
                ? `已选择左侧版本，现在选择右侧版本（较新）`
                : "对比视图"}
            </span>
            <button
              onClick={exitCompareMode}
              className="ml-auto text-xs text-blue-500 hover:underline"
            >
              退出对比
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {compareMode && (leftVersionId || rightVersionId) ? (
            /* Diff View */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Diff header labels */}
              <div className="flex border-b border-[var(--border)] text-xs font-medium">
                <div className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {leftVersion
                    ? `版本 ${formatTime(leftVersion.created_at)}`
                    : "当前内容"}
                  {leftVersionId && !rightVersionId && (
                    <span className="ml-auto text-[var(--text-secondary)]">← 当前</span>
                  )}
                </div>
                <div className="w-px bg-[var(--border)]" />
                <div className="flex-1 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {rightVersionLabel
                    ? `版本 ${formatTime(rightVersionLabel.created_at)}`
                    : rightVersionId === null
                    ? "当前内容"
                    : "—"}
                </div>
              </div>

              {/* Diff content */}
              <div className="flex-1 overflow-y-auto p-0">
                {diffResult.length === 0 && leftVersionId && rightVersionId === null ? (
                  /* Comparing version vs current content */
                  <div className="p-4 font-mono text-sm">
                    {(() => {
                      const left = getVersionById(leftVersionId);
                      if (!left) return null;
                      const changes = diffLines(left.content, currentContent);
                      return changes.map((part, i) => (
                        <span
                          key={i}
                          className={
                            part.added
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                              : part.removed
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through"
                              : "text-[var(--text-primary)]"
                          }
                        >
                          {part.value}
                        </span>
                      ));
                    })()}
                  </div>
                ) : (
                  /* Two versions diff */
                  <div className="p-4 font-mono text-sm">
                    {diffResult.map((part, i) => (
                      <span
                        key={i}
                        className={
                          part.added
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : part.removed
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through"
                            : "text-[var(--text-primary)]"
                        }
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] flex gap-4">
                <span className="text-red-500">
                  −{" "}
                  {diffResult.filter((p) => p.removed).reduce(
                    (acc, p) => acc + (p.count ?? 0),
                    0
                  )}{" "}
                  行删除
                </span>
                <span className="text-green-500">
                  +{" "}
                  {diffResult.filter((p) => p.added).reduce(
                    (acc, p) => acc + (p.count ?? 0),
                    0
                  )}{" "}
                  行新增
                </span>
              </div>
            </div>
          ) : (
            /* Version List */
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sortedVersions.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-secondary)] py-8">
                  暂无历史版本
                </p>
              ) : (
                sortedVersions.map((version, idx) => {
                  const isLeftSelected = leftVersionId === version.id;
                  const isRightSelected = rightVersionId === version.id;
                  const versionNum = sortedVersions.length - idx;

                  return (
                    <div
                      key={version.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isLeftSelected
                          ? "border-red-400 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300"
                          : isRightSelected
                          ? "border-green-400 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-300"
                          : selectedVersionId === version.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/5"
                          : "border-[var(--border)] hover:border-[var(--accent)]/50"
                      }`}
                      onClick={() => {
                        if (compareMode) {
                          handleCompare(version.id);
                        } else {
                          selectVersion(version.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isLeftSelected && (
                            <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">L</span>
                            </span>
                          )}
                          {isRightSelected && (
                            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">R</span>
                            </span>
                          )}
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            v{versionNum} · {formatTime(version.created_at)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {compareMode ? (
                            <>
                              {!leftVersionId && (
                                <span className="flex items-center gap-1 text-xs text-red-500">
                                  选为左侧
                                </span>
                              )}
                              {leftVersionId && !rightVersionId && version.id !== leftVersionId && (
                                <span className="flex items-center gap-1 text-xs text-green-500">
                                  选为右侧
                                </span>
                              )}
                              {version.id === leftVersionId && (
                                <span className="flex items-center gap-1 text-xs text-red-500">
                                  <Check className="w-3 h-3" />
                                  左侧
                                </span>
                              )}
                              {version.id === rightVersionId && (
                                <span className="flex items-center gap-1 text-xs text-green-500">
                                  <Check className="w-3 h-3" />
                                  右侧
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompareWithCurrent(version.id);
                                }}
                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                              >
                                <GitCompare className="w-3 h-3" />
                                对比当前
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
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                        {previewContent(version.content) || "(空)"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Eye, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { cn } from "../lib/utils";

/** Parse variable definition: {{name}} or {{name:default}} or {{name|opt1,opt2}} */
interface ParsedVariable {
  name: string;
  defaultValue: string | null;
  options: string[] | null;
}

function parseVariable(raw: string): ParsedVariable {
  // {{name|opt1,opt2}}
  if (raw.includes("|")) {
    const [name, opts] = raw.split("|");
    return {
      name: name.trim(),
      defaultValue: null,
      options: opts.split(",").map((o) => o.trim()),
    };
  }
  // {{name:default}}
  if (raw.includes(":")) {
    const [name, def] = raw.split(":");
    return {
      name: name.trim(),
      defaultValue: def.trim() || null,
      options: null,
    };
  }
  return { name: raw.trim(), defaultValue: null, options: null };
}

function extractVariablesWithMeta(content: string): ParsedVariable[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const vars: ParsedVariable[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    const parsed = parseVariable(match[1]);
    if (!seen.has(parsed.name)) {
      seen.add(parsed.name);
      vars.push(parsed);
    }
  }
  return vars;
}

function replaceVariables(
  content: string,
  values: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}(?::[^}]*)?(?:\\|[^}]*)?\\}\\}`, "g"), value);
  }
  return result;
}

export default function VariablePanel() {
  const { prompts, selectedPromptId } = usePromptStore();
  const prompt = prompts.find((p) => p.id === selectedPromptId);

  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const variables = useMemo(
    () => (prompt ? extractVariablesWithMeta(prompt.content) : []),
    [prompt?.content]
  );

  // Initialize values with defaults when variables change
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) {
        // Keep existing value if user already typed something
        next[v.name] = prev[v.name] ?? v.defaultValue ?? "";
      }
      return next;
    });
  }, [variables]);

  // Reset when prompt changes
  useEffect(() => {
    setCopied(false);
  }, [selectedPromptId]);

  const handleValueChange = (varName: string, value: string) => {
    setValues((prev) => ({ ...prev, [varName]: value }));
  };

  const previewContent = prompt
    ? replaceVariables(prompt.content, values)
    : "";

  const filledCount = variables.filter((v) => values[v.name]?.trim()).length;

  const handleCopy = async () => {
    const plainText = previewContent.replace(/<[^>]+>/g, "");
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFillAll = () => {
    const next: Record<string, string> = {};
    for (const v of variables) {
      next[v.name] = v.defaultValue ?? `{{${v.name}}}`;
    }
    setValues(next);
  };

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] p-6">
        <Eye className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm text-center">选择一个提示词来填充变量</p>
      </div>
    );
  }

  if (variables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] p-6">
        <Wand2 className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm text-center">当前提示词没有检测到变量</p>
        <p className="text-xs mt-1 text-center opacity-60">
          使用 {"{{变量名}}"} 语法来定义变量
        </p>
        <p className="text-xs mt-1 text-center opacity-40">
          支持 {"{{name:默认值}}"} 和 {"{{name|选项1,选项2}}"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-[var(--accent)]" />
              变量魔法棒
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {filledCount}/{variables.length} 已填充
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFillAll}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent)]/80 px-2 py-1 rounded border border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition-colors"
            >
              填入默认
            </button>
            <button
              onClick={() => setShowPreview((p) => !p)}
              className={cn(
                "text-xs px-2 py-1 rounded border transition-colors",
                showPreview
                  ? "text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/5"
                  : "text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30"
              )}
            >
              {showPreview ? "隐藏预览" : "显示预览"}
            </button>
          </div>
        </div>
      </div>

      {/* Variables inputs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {variables.map((v) => (
          <div key={v.name}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                {v.name}
              </label>
              {v.options && (
                <span className="text-xs text-[var(--text-secondary)]">
                  下拉选择
                </span>
              )}
            </div>

            {v.options ? (
              /* Dropdown for options */
              <div className="relative">
                <select
                  value={values[v.name] || ""}
                  onChange={(e) => handleValueChange(v.name, e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 pr-8 rounded-lg text-sm appearance-none",
                    "bg-[var(--bg-secondary)] border border-transparent",
                    "text-[var(--text-primary)]",
                    "outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
                  )}
                >
                  <option value="">选择 {v.name}...</option>
                  {v.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
              </div>
            ) : (
              /* Text input */
              <input
                type="text"
                value={values[v.name] || ""}
                onChange={(e) => handleValueChange(v.name, e.target.value)}
                placeholder={
                  v.defaultValue ? `默认值: ${v.defaultValue}` : `输入 ${v.name}...`
                }
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm",
                  "bg-[var(--bg-secondary)] border border-transparent",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
                  "outline-none focus:border-[var(--accent)] transition-colors"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border-t border-[var(--border)] flex-shrink-0">
          <div className="px-4 py-2 bg-[var(--bg-secondary)] flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--text-secondary)]">实时预览</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] opacity-50">
                {previewContent.replace(/<[^>]+>/g, "").length} 字符
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="收起预览"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4 max-h-56 overflow-y-auto">
            {previewContent.trim() ? (
              <div
                className={cn(
                  "text-sm text-[var(--text-primary)] whitespace-pre-wrap",
                  "prose prose-sm dark:prose-invert max-w-none"
                )}
                dangerouslySetInnerHTML={{
                  __html: previewContent,
                }}
              />
            ) : (
              <p className="text-xs text-[var(--text-secondary)] italic">
                请填入变量值...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Copy button */}
      <div className="p-4 border-t border-[var(--border)] flex-shrink-0">
        <button
          onClick={handleCopy}
          disabled={!previewContent.trim()}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            copied
              ? "bg-green-500 text-white"
              : "bg-[var(--accent)] text-white hover:opacity-90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              已复制到剪贴板
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              复制最终提示词
            </>
          )}
        </button>
      </div>
    </div>
  );
}

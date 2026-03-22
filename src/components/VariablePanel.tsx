import { useState, useEffect } from "react";
import { Copy, Check, Eye } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { extractVariables, replaceVariables } from "../lib/utils";
import { cn } from "../lib/utils";

export default function VariablePanel() {
  const { prompts, selectedPromptId } = usePromptStore();
  const prompt = prompts.find((p) => p.id === selectedPromptId);

  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const variables = prompt ? extractVariables(prompt.content) : [];

  // Reset values when prompt changes
  useEffect(() => {
    setValues({});
    setCopied(false);
  }, [selectedPromptId]);

  const handleValueChange = (varName: string, value: string) => {
    setValues((prev) => ({ ...prev, [varName]: value }));
  };

  const previewContent = prompt
    ? replaceVariables(prompt.content, values)
    : "";

  const handleCopy = async () => {
    // Strip HTML tags for plain text copy
    const plainText = previewContent.replace(/<[^>]+>/g, "");
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <p className="text-sm text-center">当前提示词没有检测到变量</p>
        <p className="text-xs mt-1 text-center opacity-60">
          使用 {"{{变量名}}"} 语法来定义变量
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          变量填充
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          共 {variables.length} 个变量
        </p>
      </div>

      {/* Variables inputs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {variables.map((varName) => (
          <div key={varName}>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {varName}
            </label>
            <input
              type="text"
              value={values[varName] || ""}
              onChange={(e) => handleValueChange(varName, e.target.value)}
              placeholder={`输入 ${varName}...`}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--bg-secondary)] border border-transparent",
                "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
                "outline-none focus:border-[var(--accent)] transition-colors"
              )}
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="border-t border-[var(--border)]">
        <div className="px-4 py-2 bg-[var(--bg-secondary)]">
          <p className="text-xs font-medium text-[var(--text-secondary)]">预览</p>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          <div
            className={cn(
              "text-sm text-[var(--text-primary)] whitespace-pre-wrap",
              "prose prose-sm dark:prose-invert max-w-none"
            )}
            dangerouslySetInnerHTML={{
              __html: previewContent || "<span class='text-[var(--text-secondary)]'>请填入变量值...</span>",
            }}
          />
        </div>
      </div>

      {/* Copy button */}
      <div className="p-4 border-t border-[var(--border)]">
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

import { useState, useRef } from "react";
import { Download, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { apiExportAllData, apiImportData } from "../lib/tauri/api";
import { cn } from "../lib/utils";

export default function ImportExportPanel() {
  const { initFromBackend } = usePromptStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const json = await apiExportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-studio-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "导出成功！" });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: "error", text: `导出失败: ${e}` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await apiImportData(text);
      await initFromBackend();
      setMessage({ type: "success", text: "导入成功！" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: `导入失败: ${err}` });
      setTimeout(() => setMessage(null), 3000);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-[var(--border)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="text-xs font-semibold uppercase tracking-wider">导入/导出</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {message && (
            <div
              className={cn(
                "text-xs px-2 py-1 rounded",
                message.type === "success"
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-500"
              )}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>导出数据</span>
          </button>

          <button
            onClick={handleImportClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>导入数据</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { usePromptStore } from "./stores/promptStore";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import PromptList from "./components/PromptList";
import PromptEditor from "./components/PromptEditor";
import VariablePanel from "./components/VariablePanel";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

export default function App() {
  const { isDarkMode, selectedPromptId, prompts, view, initFromBackend } = usePromptStore();
  const [showVariablePanel, setShowVariablePanel] = useState(false);

  useEffect(() => {
    initFromBackend();
  }, []);

  // Auto-show variable panel only when content contains {{
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
  const hasVariables = selectedPrompt?.content?.includes("{{") ?? false;

  // Reset and auto-open when entering a prompt with variables
  useEffect(() => {
    if (selectedPromptId && hasVariables) {
      setShowVariablePanel(true);
    }
  }, [selectedPromptId, hasVariables]);

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Top bar */}
        <TopBar />

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Prompt list */}
          <div className="w-80 flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-[var(--border)]">
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">
                {view === "trash"
                  ? "回收站"
                  : view === "favorites"
                  ? "收藏"
                  : view === "recent"
                  ? "最近"
                  : "提示词列表"}
              </h2>
            </div>
            <PromptList />
          </div>

          {/* Editor panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedPromptId ? (
              <PromptEditor />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center text-[var(--text-secondary)]">
                  <p className="text-sm">← 选择左侧提示词开始编辑</p>
                </div>
              </div>
            )}
          </div>

          {/* Variable panel toggle + panel */}
          {selectedPromptId && view !== "trash" && (
            <>
              <button
                onClick={() => setShowVariablePanel((v) => !v)}
                className="self-start p-2 border-l border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                title={showVariablePanel ? "收起变量面板" : "展开变量面板"}
              >
                {showVariablePanel ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </button>
              {showVariablePanel && (
                <div className="w-80 flex-shrink-0 border-l border-[var(--border)] overflow-hidden flex flex-col">
                  <VariablePanel />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

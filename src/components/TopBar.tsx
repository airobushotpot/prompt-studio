import { Plus, Moon, Sun } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import SearchBar from "./SearchBar";

export default function TopBar() {
  const { isDarkMode, toggleDarkMode, addPrompt, selectPrompt } = usePromptStore();

  const handleNewPrompt = () => {
    const id = addPrompt({
      title: "新建提示词",
      content: "",
      description: "",
      folder_id: null,
      tags: [],
      is_favorite: false,
      is_deleted: false,
    });
    selectPrompt(id);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <h1 className="text-base font-semibold text-[var(--text-primary)] whitespace-nowrap">
        Prompt Studio
      </h1>
      <SearchBar />
      <button
        onClick={handleNewPrompt}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        新建
      </button>
      <button
        onClick={toggleDarkMode}
        className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
        title={isDarkMode ? "切换浅色主题" : "切换深色主题"}
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}

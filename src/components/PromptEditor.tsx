import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { usePromptStore } from "../stores/promptStore";
import { extractVariables } from "../lib/utils";
import { Tags, AlertCircle, Save, History } from "lucide-react";
import VersionPanel from "./VersionPanel";

export default function PromptEditor() {
  const {
    prompts,
    selectedPromptId,
    updatePrompt,
    tags,
  } = usePromptStore();

  const [showVersions, setShowVersions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const lastSavedContent = useRef<string>("");

  const prompt = prompts.find((p) => p.id === selectedPromptId);

  // Sync local state when switching prompts
  useEffect(() => {
    if (prompt) {
      setLocalTitle(prompt.title);
      setLocalDescription(prompt.description);
    }
  }, [selectedPromptId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "bg-yellow-200 dark:bg-yellow-800 rounded px-0.5 text-yellow-900 dark:text-yellow-100",
        },
      }),
    ],
    content: prompt?.content || "",
    onUpdate: () => {
      // Don't auto-save on every keystroke; user clicks Save explicitly
    },
  });

  // Update editor content when prompt changes
  useEffect(() => {
    if (editor && prompt) {
      const currentContent = editor.getHTML();
      if (currentContent !== prompt.content) {
        editor.commands.setContent(prompt.content || "");
      }
      lastSavedContent.current = prompt.content || "";
    }
  }, [selectedPromptId, editor]);

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
        <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">选择或创建一个提示词开始编辑</p>
      </div>
    );
  }

  const variables = extractVariables(prompt.content);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (prompt && localTitle !== prompt.title) {
      updatePrompt(prompt.id, { title: localTitle });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalDescription(e.target.value);
  };

  const handleDescriptionBlur = () => {
    if (prompt && localDescription !== prompt.description) {
      updatePrompt(prompt.id, { description: localDescription });
    }
  };

  const handleTagToggle = (tagId: string) => {
    const currentTags = prompt.tags;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    updatePrompt(prompt.id, { tags: newTags });
  };

  const handleSave = async () => {
    if (!prompt || !editor) return;
    const content = editor.getHTML();
    setIsSaving(true);
    try {
      // updatePrompt on backend will auto-create a version of the previous content
      await updatePrompt(prompt.id, { content });
      lastSavedContent.current = content;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Title */}
      <div className="p-4 border-b border-[var(--border)]">
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder="提示词标题..."
          className="w-full text-lg font-semibold bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        <textarea
          value={localDescription}
          onChange={handleDescriptionChange}
          onBlur={handleDescriptionBlur}
          placeholder="简短描述..."
          rows={2}
          className="w-full mt-2 text-sm bg-transparent text-[var(--text-secondary)] outline-none resize-none placeholder:text-[var(--text-secondary)]"
        />
      </div>

      {/* Tags */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
        <Tags className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => handleTagToggle(tag.id)}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs text-white transition-opacity ${
              prompt.tags.includes(tag.id) ? "opacity-100" : "opacity-40"
            }`}
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <EditorContent
            editor={editor}
            className="min-h-[200px] outline-none"
          />
        </div>
      </div>

      {/* Variables detection */}
      {variables.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            检测到的变量 ({variables.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <span
                key={v}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
        <button
          onClick={() => setShowVersions(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <History className="w-4 h-4" />
          历史
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* Version panel */}
      {showVersions && prompt && (
        <VersionPanel
          promptId={prompt.id}
          currentContent={editor?.getHTML() || ""}
          onClose={() => setShowVersions(false)}
        />
      )}

      {/* TipTap editor styles */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          font-weight: 600;
          margin-top: 1em;
        }
        .ProseMirror code {
          background: var(--bg-secondary);
          padding: 0.1em 0.3em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .ProseMirror pre {
          background: var(--bg-secondary);
          padding: 0.5em;
          border-radius: 4px;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 1em;
          margin-left: 0;
          color: var(--text-secondary);
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5em;
        }
      `}</style>
    </div>
  );
}

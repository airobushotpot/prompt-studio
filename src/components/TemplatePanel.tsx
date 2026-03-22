import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import { usePromptStore } from "../stores/promptStore";
import { apiGetTemplates } from "../lib/tauri/api";
import { cn } from "../lib/utils";

interface PromptTemplate {
  title: string;
  content: string;
  description: string;
  tags: string[];
  variables: string[];
}

interface TemplateCategory {
  name: string;
  icon: string;
  templates: PromptTemplate[];
}

export default function TemplatePanel() {
  const { addPrompt, selectPrompt } = usePromptStore();
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      setLoading(true);
      apiGetTemplates()
        .then((cats) => {
          setCategories(cats);
          // Auto-expand first category
          if (cats.length > 0) {
            setExpandedCats(new Set([cats[0].name]));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const toggleCat = (name: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleUseTemplate = async (template: PromptTemplate) => {
    // Replace {{variable}} placeholders with empty strings or default values
    let content = template.content;
    for (const v of template.variables) {
      content = content.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), `[${v}]`);
    }

    const id = await addPrompt({
      title: template.title,
      content,
      description: template.description,
      folder_id: null,
      tags: template.tags,
      is_favorite: false,
      is_deleted: false,
    });
    selectPrompt(id);
  };

  return (
    <div className="border-t border-[var(--border)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="text-xs font-semibold uppercase tracking-wider">模板</span>
      </button>

      {isOpen && (
        <div className="px-2 pb-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-xs text-[var(--text-secondary)] px-2 py-1">加载中...</div>
          ) : (
            categories.map((cat) => (
              <div key={cat.name} className="mb-1">
                <button
                  onClick={() => toggleCat(cat.name)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  {expandedCats.has(cat.name) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>{cat.icon}</span>
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-xs text-[var(--text-secondary)] ml-auto">
                    {cat.templates.length}
                  </span>
                </button>

                {expandedCats.has(cat.name) && (
                  <div className="ml-6 space-y-1 mt-1">
                    {cat.templates.map((t) => (
                      <button
                        key={t.title}
                        onClick={() => handleUseTemplate(t)}
                        className={cn(
                          "w-full flex items-start gap-2 px-2 py-2 rounded text-left text-sm transition-colors",
                          "text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--text-primary)]"
                        )}
                      >
                        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{t.title}</div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">
                            {t.description}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

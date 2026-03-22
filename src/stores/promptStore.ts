import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Prompt, Folder, Tag } from "../types";

interface PromptStore {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  selectedPromptId: string | null;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  searchQuery: string;
  view: "all" | "favorites" | "recent" | "trash";
  isDarkMode: boolean;

  // Prompt CRUD
  addPrompt: (prompt: Omit<Prompt, "id" | "created_at" | "updated_at">) => string;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  restorePrompt: (id: string) => void;
  permanentlyDeletePrompt: (id: string) => void;
  duplicatePrompt: (id: string) => string;
  toggleFavorite: (id: string) => void;

  // Folder CRUD
  addFolder: (name: string, parent_id?: string | null) => string;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;

  // Tag CRUD
  addTag: (name: string, color: string) => string;
  deleteTag: (id: string) => void;

  // Selection
  selectPrompt: (id: string | null) => void;
  selectFolder: (id: string | null) => void;
  selectTag: (id: string | null) => void;
  setView: (view: "all" | "favorites" | "recent" | "trash") => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
}

const now = Date.now();

const mockFolders: Folder[] = [
  { id: "folder-1", name: "工作", parent_id: null, created_at: now - 86400000 * 5 },
  { id: "folder-2", name: "学习", parent_id: null, created_at: now - 86400000 * 3 },
  { id: "folder-3", name: "创作", parent_id: null, created_at: now - 86400000 * 1 },
];

const mockTags: Tag[] = [
  { id: "tag-1", name: "AI写作", color: "#3b82f6" },
  { id: "tag-2", name: "代码", color: "#10b981" },
  { id: "tag-3", name: "角色扮演", color: "#f59e0b" },
  { id: "tag-4", name: "翻译", color: "#8b5cf6" },
];

const mockPrompts: Prompt[] = [
  {
    id: "prompt-1",
    title: "代码审查助手",
    content:
      "你是一个专业的代码审查员。请审查下面的代码，找出潜在的问题和改进建议。\n\n语言：{{language}}\n\n代码：\n{{code}}\n\n请从以下几个方面进行审查：\n1. 代码质量和可读性\n2. 性能问题\n3. 安全漏洞\n4. 最佳实践",
    description: "用于自动审查代码质量并提供改进建议的提示词",
    folder_id: "folder-1",
    tags: ["tag-2"],
    is_favorite: true,
    is_deleted: false,
    created_at: now - 86400000 * 4,
    updated_at: now - 86400000 * 2,
  },
  {
    id: "prompt-2",
    title: "专业翻译助手",
    content:
      "你是一个专业的翻译员。请将以下内容翻译成{{target_language}}。\n\n原文：\n{{text}}\n\n翻译要求：\n1. 保持原文风格和语气\n2. 准确传达原意\n3. 符合目标语言的表达习惯",
    description: "多语言翻译提示词模板",
    folder_id: "folder-2",
    tags: ["tag-4"],
    is_favorite: false,
    is_deleted: false,
    created_at: now - 86400000 * 3,
    updated_at: now - 86400000 * 1,
  },
  {
    id: "prompt-3",
    title: "角色扮演导师",
    content:
      "请扮演一位{{role}}老师，用{{style}}的方式教授{{topic}}。\n\n学生背景：{{student_background}}\n\n请确保：\n1. 内容适合学生的水平\n2. 使用生动的例子\n3. 鼓励学生提问",
    description: "用于教学的角色扮演提示词",
    folder_id: "folder-3",
    tags: ["tag-3", "tag-1"],
    is_favorite: true,
    is_deleted: false,
    created_at: now - 86400000 * 2,
    updated_at: now - 3600000,
  },
  {
    id: "prompt-4",
    title: "文章润色专家",
    content:
      "你是一位资深文字编辑。请帮我润色以下文章，使其更加流畅、专业。\n\n原文：\n{{article}}\n\n润色方向：{{direction}}",
    description: "对文章进行语言润色和风格优化",
    folder_id: "folder-3",
    tags: ["tag-1"],
    is_favorite: false,
    is_deleted: false,
    created_at: now - 86400000,
    updated_at: now - 1800000,
  },
  {
    id: "prompt-5",
    title: "已删除的提示词",
    content: "这是一条已删除的提示词示例",
    description: "用于测试回收站功能",
    folder_id: null,
    tags: [],
    is_favorite: false,
    is_deleted: true,
    created_at: now - 86400000 * 10,
    updated_at: now - 86400000 * 6,
  },
];

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: mockPrompts,
  folders: mockFolders,
  tags: mockTags,
  selectedPromptId: "prompt-1",
  selectedFolderId: null,
  selectedTagId: null,
  searchQuery: "",
  view: "all",
  isDarkMode: false,

  addPrompt: (prompt) => {
    const id = nanoid();
    const newPrompt: Prompt = {
      ...prompt,
      id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    set((state) => ({ prompts: [...state.prompts, newPrompt] }));
    return id;
  },

  updatePrompt: (id, updates) => {
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: Date.now() } : p
      ),
    }));
  },

  deletePrompt: (id) => {
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, is_deleted: true, updated_at: Date.now() } : p
      ),
    }));
  },

  restorePrompt: (id) => {
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, is_deleted: false, updated_at: Date.now() } : p
      ),
    }));
  },

  permanentlyDeletePrompt: (id) => {
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== id),
      selectedPromptId:
        state.selectedPromptId === id ? null : state.selectedPromptId,
    }));
  },

  duplicatePrompt: (id) => {
    const { prompts, addPrompt } = get();
    const original = prompts.find((p) => p.id === id);
    if (!original) return "";
    return addPrompt({
      title: `${original.title} (副本)`,
      content: original.content,
      description: original.description,
      folder_id: original.folder_id,
      tags: [...original.tags],
      is_favorite: false,
      is_deleted: false,
    });
  },

  toggleFavorite: (id) => {
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id
          ? { ...p, is_favorite: !p.is_favorite, updated_at: Date.now() }
          : p
      ),
    }));
  },

  addFolder: (name, parent_id = null) => {
    const id = nanoid();
    const newFolder: Folder = {
      id,
      name,
      parent_id,
      created_at: Date.now(),
    };
    set((state) => ({ folders: [...state.folders, newFolder] }));
    return id;
  },

  updateFolder: (id, updates) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  deleteFolder: (id) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      prompts: state.prompts.map((p) =>
        p.folder_id === id ? { ...p, folder_id: null } : p
      ),
      selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
    }));
  },

  addTag: (name, color) => {
    const id = nanoid();
    set((state) => ({ tags: [...state.tags, { id, name, color }] }));
    return id;
  },

  deleteTag: (id) => {
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
      prompts: state.prompts.map((p) => ({
        ...p,
        tags: p.tags.filter((tagId) => tagId !== id),
      })),
    }));
  },

  selectPrompt: (id) => set({ selectedPromptId: id }),
  selectFolder: (id) => set({ selectedFolderId: id, selectedTagId: null }),
  selectTag: (id) => set({ selectedTagId: id, selectedFolderId: null }),
  setView: (view) => set({ view, selectedFolderId: null, selectedTagId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));

// Selector helpers
export const selectFilteredPrompts = (state: PromptStore): Prompt[] => {
  let filtered = state.prompts;

  // Filter by view
  if (state.view === "trash") {
    filtered = filtered.filter((p) => p.is_deleted);
  } else {
    filtered = filtered.filter((p) => !p.is_deleted);
    if (state.view === "favorites") {
      filtered = filtered.filter((p) => p.is_favorite);
    }
  }

  // Filter by folder
  if (state.selectedFolderId) {
    filtered = filtered.filter((p) => p.folder_id === state.selectedFolderId);
  }

  // Filter by tag
  if (state.selectedTagId) {
    filtered = filtered.filter((p) => p.tags.includes(state.selectedTagId!));
  }

  // Filter by search query
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }

  // Sort: recent first (non-trash), trash by updated_at desc
  if (state.view === "trash") {
    filtered.sort((a, b) => b.updated_at - a.updated_at);
  } else {
    filtered.sort((a, b) => b.updated_at - a.updated_at);
  }

  return filtered;
};

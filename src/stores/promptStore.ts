import { create } from "zustand";

import type { Prompt, Folder, Tag } from "../types";
import * as api from "../lib/tauri/api";

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
  isLoading: boolean;

  // Init
  initFromBackend: () => Promise<void>;

  // Prompt CRUD
  addPrompt: (prompt: Omit<Prompt, "id" | "created_at" | "updated_at">) => Promise<string>;
  updatePrompt: (id: string, updates: Partial<Prompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  restorePrompt: (id: string) => Promise<void>;
  permanentlyDeletePrompt: (id: string) => Promise<void>;
  duplicatePrompt: (id: string) => Promise<string>;
  toggleFavorite: (id: string) => Promise<void>;

  // Folder CRUD
  addFolder: (name: string, parent_id?: string | null) => Promise<string>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // Tag CRUD
  addTag: (name: string, color: string) => Promise<string>;
  deleteTag: (id: string) => Promise<void>;

  // Selection
  selectPrompt: (id: string | null) => void;
  selectFolder: (id: string | null) => void;
  selectTag: (id: string | null) => void;
  setView: (view: "all" | "favorites" | "recent" | "trash") => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
}

// Map camelCase from Tauri to snake_case in store
function fromBackend(p: any): Prompt {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    description: p.description,
    folder_id: p.folderId,
    tags: p.tags || [],
    is_favorite: p.isFavorite || false,
    is_deleted: p.isDeleted || false,
    created_at: typeof p.createdAt === "number" ? p.createdAt : new Date(p.createdAt).getTime(),
    updated_at: typeof p.updatedAt === "number" ? p.updatedAt : new Date(p.updatedAt).getTime(),
  };
}


export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  folders: [],
  tags: [],
  selectedPromptId: null,
  selectedFolderId: null,
  selectedTagId: null,
  searchQuery: "",
  view: "all",
  isDarkMode: false,
  isLoading: false,

  initFromBackend: async () => {
    set({ isLoading: true });
    try {
      const [prompts, folders, tags] = await Promise.all([
        api.apiGetPrompts(),
        api.apiGetFolders(),
        api.apiGetTags(),
      ]);
      set({
        prompts: prompts.map(fromBackend),
        folders: (folders || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          parent_id: f.parent_id,
          created_at: typeof f.created_at === "number" ? f.created_at : new Date(f.created_at).getTime(),
        })),
        tags: (tags || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color,
        })),
        isLoading: false,
      });
    } catch (e) {
      console.error("Failed to load from backend", e);
      set({ isLoading: false });
    }
  },

  addPrompt: async (prompt) => {
    const created = await api.apiCreatePrompt({
      title: prompt.title,
      content: prompt.content,
      description: prompt.description,
      folder_id: prompt.folder_id ?? null,
      tags: prompt.tags,
    });
    const p = fromBackend(created);
    set((state) => ({ prompts: [...state.prompts, p] }));
    return p.id;
  },

  updatePrompt: async (id, updates) => {
    const current = get().prompts.find((p) => p.id === id);
    if (!current) return;
    await api.apiUpdatePrompt({
      id,
      title: updates.title ?? current.title,
      content: updates.content ?? current.content,
      description: updates.description ?? current.description,
      folder_id: updates.folder_id ?? current.folder_id ?? null,
      tags: updates.tags ?? current.tags,
    });
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: Date.now() } : p
      ),
    }));
  },

  deletePrompt: async (id) => {
    await api.apiSoftDeletePrompt(id);
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, is_deleted: true, updated_at: Date.now() } : p
      ),
    }));
  },

  restorePrompt: async (id) => {
    await api.apiRestorePrompt(id);
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, is_deleted: false, updated_at: Date.now() } : p
      ),
    }));
  },

  permanentlyDeletePrompt: async (id) => {
    await api.apiDeletePrompt(id);
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== id),
      selectedPromptId: state.selectedPromptId === id ? null : state.selectedPromptId,
    }));
  },

  duplicatePrompt: async (id) => {
    const original = get().prompts.find((p) => p.id === id);
    if (!original) return "";
    return get().addPrompt({
      title: `${original.title} (副本)`,
      content: original.content,
      description: original.description,
      folder_id: original.folder_id,
      tags: [...original.tags],
      is_favorite: false,
      is_deleted: false,
    });
  },

  toggleFavorite: async (id) => {
    const current = get().prompts.find((p) => p.id === id);
    if (!current) return;
    await api.apiToggleFavorite(id);
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === id ? { ...p, is_favorite: !p.is_favorite, updated_at: Date.now() } : p
      ),
    }));
  },

  addFolder: async (name, parent_id = null) => {
    const created = await api.apiCreateFolder(name, parent_id ?? null);
    const f: Folder = {
      id: created.id,
      name: created.name,
      parent_id: created.parentId,
      created_at: new Date(created.createdAt).getTime(),
    };
    set((state) => ({ folders: [...state.folders, f] }));
    return f.id;
  },

  updateFolder: async (id, updates) => {
    if (updates.name) {
      await api.apiRenameFolder(id, updates.name);
    }
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  deleteFolder: async (id) => {
    await api.apiDeleteFolder(id);
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      prompts: state.prompts.map((p) =>
        p.folder_id === id ? { ...p, folder_id: null } : p
      ),
      selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
    }));
  },

  addTag: async (name, color) => {
    const created = await api.apiCreateTag(name, color);
    const t: Tag = { id: created.id, name: created.name, color: created.color };
    set((state) => ({ tags: [...state.tags, t] }));
    return t.id;
  },

  deleteTag: async (id) => {
    await api.apiDeleteTag(id);
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

  if (state.view === "trash") {
    filtered = filtered.filter((p) => p.is_deleted);
  } else {
    filtered = filtered.filter((p) => !p.is_deleted);
    if (state.view === "favorites") {
      filtered = filtered.filter((p) => p.is_favorite);
    }
  }

  if (state.selectedFolderId) {
    filtered = filtered.filter((p) => p.folder_id === state.selectedFolderId);
  }

  if (state.selectedTagId) {
    filtered = filtered.filter((p) => p.tags.includes(state.selectedTagId!));
  }

  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }

  filtered.sort((a, b) => b.updated_at - a.updated_at);
  return filtered;
};

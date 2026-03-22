import { invoke } from "@tauri-apps/api/core";

// Backend response types (camelCase from Tauri)
interface BackendPrompt {
  id: string;
  title: string;
  content: string;
  description: string;
  folderId: string | null;
  tags: string[];
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface BackendTag {
  id: string;
  name: string;
  color: string;
}

interface BackendVersion {
  id: string;
  promptId: string;
  content: string;
  createdAt: string;
}

// -------------------- Prompt --------------------

export const apiGetPrompts = () => invoke<BackendPrompt[]>("get_prompts");

export const apiGetPrompt = (id: string) =>
  invoke<BackendPrompt | null>("get_prompt", { id });

export const apiCreatePrompt = (params: {
  title: string;
  content: string;
  description: string;
  folder_id: string | null;
  tags: string[];
}) =>
  invoke<BackendPrompt>("create_prompt", {
    title: params.title,
    content: params.content,
    description: params.description,
    folderId: params.folder_id,
    tags: params.tags,
  });

export const apiUpdatePrompt = (params: {
  id: string;
  title: string;
  content: string;
  description: string;
  folder_id: string | null;
  tags: string[];
}) =>
  invoke<BackendPrompt>("update_prompt", {
    id: params.id,
    title: params.title,
    content: params.content,
    description: params.description,
    folderId: params.folder_id,
    tags: params.tags,
  });

export const apiDeletePrompt = (id: string) =>
  invoke<boolean>("delete_prompt", { id });

export const apiToggleFavorite = (id: string) =>
  invoke<BackendPrompt>("toggle_favorite", { id });

export const apiSoftDeletePrompt = (id: string) =>
  invoke<BackendPrompt>("soft_delete_prompt", { id });

export const apiRestorePrompt = (id: string) =>
  invoke<BackendPrompt>("restore_prompt", { id });

// -------------------- Folder --------------------

export const apiGetFolders = () => invoke<BackendFolder[]>("get_folders");

export const apiCreateFolder = (name: string, parentId: string | null) =>
  invoke<BackendFolder>("create_folder", { name, parentId });

export const apiRenameFolder = (id: string, name: string) =>
  invoke<BackendFolder>("rename_folder", { id, name });

export const apiDeleteFolder = (id: string) =>
  invoke<boolean>("delete_folder", { id });

// -------------------- Tag --------------------

export const apiGetTags = () => invoke<BackendTag[]>("get_tags");

export const apiCreateTag = (name: string, color: string) =>
  invoke<BackendTag>("create_tag", { name, color });

export const apiDeleteTag = (id: string) =>
  invoke<boolean>("delete_tag", { id });

// -------------------- Version --------------------

export const apiGetPromptVersions = (promptId: string) =>
  invoke<BackendVersion[]>("get_prompt_versions", { promptId });

export const apiCreateVersion = (promptId: string, content: string) =>
  invoke<BackendVersion>("create_version", { promptId, content });

// -------------------- Export/Import --------------------

export const apiExportAllData = () => invoke<string>("export_all_data");

export const apiImportData = (json: string) =>
  invoke<boolean>("import_data", { json });

export const apiExportPromptMarkdown = (id: string) =>
  invoke<string>("export_prompt_markdown", { id });

// -------------------- Templates --------------------

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

export const apiGetTemplates = () =>
  invoke<TemplateCategory[]>("get_templates");

export const apiRestoreVersion = (versionId: string) =>
  invoke<BackendPrompt>("restore_version", { versionId });

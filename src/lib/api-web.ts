/**
 * Prompt Studio Web SDK
 * 
 * HTTP client for the Prompt Studio REST API (http://127.0.0.1:1847/api/v1).
 * Provides an interface compatible with the Tauri invoke API.
 * 
 * Usage:
 *   import { webApi } from '@/lib/api-web';
 *   const prompts = await webApi.getPrompts();
 */

const BASE_URL = "http://127.0.0.1:1847/api/v1";

// -------------------- Types --------------------

// PascalCase types (API responses, snake_case JSON converted to PascalCase)
export interface Prompt {
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

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  content: string;
  createdAt: string;
}

export interface PromptTemplate {
  title: string;
  content: string;
  description: string;
  tags: string[];
  variables: string[];
}

export interface TemplateCategory {
  name: string;
  icon: string;
  templates: PromptTemplate[];
}

// -------------------- JSON Helpers --------------------

/** Convert snake_case JSON object to PascalCase TypeScript type */
function toPascalCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

function toSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/** Convert snake_case JSON array to PascalCase array */
function toPascalCaseArray<T>(arr: unknown[]): T[] {
  return arr.map((item) => toPascalCase<T>(item as Record<string, unknown>));
}

// -------------------- HTTP Client --------------------

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(toSnakeCase(body as Record<string, unknown>));
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API ${method} ${path} failed (${response.status}): ${text}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return toPascalCase<T>(JSON.parse(text) as Record<string, unknown>);
  }

  private async requestList<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T[]> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(toSnakeCase(body as Record<string, unknown>));
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API ${method} ${path} failed (${response.status}): ${text}`);
    }

    const text = await response.text();
    if (!text) return [];

    const data = JSON.parse(text) as unknown[];
    return toPascalCaseArray<T>(data);
  }

  // -------------------- Prompts --------------------

  /** List all non-deleted prompts */
  async getPrompts(): Promise<Prompt[]> {
    return this.requestList<Prompt>("GET", "/prompts");
  }

  /** Get a single prompt by ID */
  async getPrompt(id: string): Promise<Prompt | null> {
    try {
      return await this.request<Prompt>("GET", `/prompts/${id}`);
    } catch {
      return null;
    }
  }

  /** Create a new prompt */
  async createPrompt(params: {
    title: string;
    content: string;
    description?: string;
    folder_id?: string | null;
    tags?: string[];
  }): Promise<Prompt> {
    return this.request<Prompt>("POST", "/prompts", params);
  }

  /** Update an existing prompt */
  async updatePrompt(params: {
    id: string;
    title: string;
    content: string;
    description?: string;
    folder_id?: string | null;
    tags?: string[];
  }): Promise<Prompt> {
    return this.request<Prompt>("PUT", `/prompts/${params.id}`, params);
  }

  /** Permanently delete a prompt */
  async deletePrompt(id: string): Promise<boolean> {
    await this.request("DELETE", `/prompts/${id}`);
    return true;
  }

  /** Toggle favorite status */
  async toggleFavorite(id: string): Promise<Prompt> {
    return this.request<Prompt>("POST", `/prompts/${id}/favorite`);
  }

  /** Soft delete (archive) a prompt */
  async softDeletePrompt(id: string): Promise<Prompt> {
    return this.request<Prompt>("DELETE", `/prompts/${id}/soft`);
  }

  /** Restore a soft-deleted prompt */
  async restorePrompt(id: string): Promise<Prompt> {
    return this.request<Prompt>("POST", `/prompts/${id}/restore`);
  }

  // -------------------- Folders --------------------

  /** List all folders */
  async getFolders(): Promise<Folder[]> {
    return this.requestList<Folder>("GET", "/folders");
  }

  /** Create a new folder */
  async createFolder(name: string, parentId?: string | null): Promise<Folder> {
    return this.request<Folder>("POST", "/folders", { name, parent_id: parentId ?? null });
  }

  /** Rename a folder */
  async renameFolder(id: string, name: string): Promise<Folder> {
    return this.request<Folder>("PUT", `/folders/${id}`, { name });
  }

  /** Delete a folder */
  async deleteFolder(id: string): Promise<boolean> {
    await this.request("DELETE", `/folders/${id}`);
    return true;
  }

  // -------------------- Tags --------------------

  /** List all tags */
  async getTags(): Promise<Tag[]> {
    return this.requestList<Tag>("GET", "/tags");
  }

  /** Create a new tag */
  async createTag(name: string, color: string): Promise<Tag> {
    return this.request<Tag>("POST", "/tags", { name, color });
  }

  /** Delete a tag */
  async deleteTag(id: string): Promise<boolean> {
    await this.request("DELETE", `/tags/${id}`);
    return true;
  }

  // -------------------- Versions --------------------

  /** List versions of a prompt */
  async getPromptVersions(promptId: string): Promise<PromptVersion[]> {
    return this.requestList<PromptVersion>("GET", `/prompts/${promptId}/versions`);
  }

  /** Create a new version (manual snapshot) */
  async createVersion(promptId: string, content: string): Promise<PromptVersion> {
    return this.request<PromptVersion>("POST", `/prompts/${promptId}/versions`, { content });
  }

  /** Restore a prompt to a specific version */
  async restoreVersion(versionId: string): Promise<Prompt> {
    return this.request<Prompt>("POST", `/versions/${versionId}/restore`);
  }

  // -------------------- Export/Import --------------------

  /** Export all data as JSON */
  async exportAllData(): Promise<string> {
    const data = await this.request<Record<string, unknown>>("GET", "/export");
    return JSON.stringify(data, null, 2);
  }

  /** Import data from JSON */
  async importData(json: string): Promise<boolean> {
    const data = JSON.parse(json);
    await this.request("POST", "/import", data);
    return true;
  }

  /** Export a single prompt as Markdown */
  async exportPromptMarkdown(id: string): Promise<string> {
    return this.request<string>("GET", `/prompts/${id}/markdown`);
  }

  // -------------------- Templates --------------------

  /** Get prompt templates */
  async getTemplates(): Promise<TemplateCategory[]> {
    return this.requestList<TemplateCategory>("GET", "/templates");
  }
}

// -------------------- Singleton Export --------------------

export const webApi = new ApiClient();

// Also export the class for custom configurations
export { ApiClient };

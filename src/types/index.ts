export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string;
  folder_id: string | null;
  tags: string[];
  is_favorite: boolean;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  content: string;
  created_at: number;
}

export interface Variable {
  id: string;
  name: string;
  default_value: string | null;
}

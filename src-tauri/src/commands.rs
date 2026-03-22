use crate::db::{self, Folder, Prompt, PromptVersion, Tag, Store};
use chrono::Utc;
use tauri::{AppHandle, Manager, State};
use std::sync::Mutex;

type AppState = Mutex<Store>;

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn nanoid() -> String {
    nanoid::generate(21)
}

// -------------------- Store Access --------------------

fn with_store<F, R>(state: &State<AppState>, f: F) -> Result<R, String>
where
    F: FnOnce(&mut Store) -> Result<R, String>,
{
    let mut store = state.lock().map_err(|e| e.to_string())?;
    f(&mut store)
}

fn with_store_ref<F, R>(state: &State<AppState>, f: F) -> Result<R, String>
where
    F: FnOnce(&Store) -> R,
{
    let store = state.lock().map_err(|e| e.to_string())?;
    Ok(f(&store))
}

// -------------------- Prompt CRUD --------------------

#[tauri::command]
pub fn get_prompts(state: State<AppState>) -> Result<Vec<Prompt>, String> {
    with_store_ref(&state, |s| {
        s.prompts.iter().filter(|p| !p.is_deleted).cloned().collect()
    })
}

#[tauri::command]
pub fn get_prompt(state: State<AppState>, id: String) -> Result<Option<Prompt>, String> {
    with_store_ref(&state, |s| {
        s.prompts.iter().find(|p| p.id == id && !p.is_deleted).cloned()
    })
}

#[tauri::command]
pub fn create_prompt(
    state: State<AppState>,
    app: AppHandle,
    title: String,
    content: String,
    description: String,
    folder_id: Option<String>,
    tags: Vec<String>,
) -> Result<Prompt, String> {
    let prompt = Prompt {
        id: nanoid(),
        title,
        content,
        description,
        folder_id,
        tags,
        is_favorite: false,
        is_deleted: false,
        created_at: now(),
        updated_at: now(),
    };
    with_store(&state, |s| { s.prompts.push(prompt.clone()); Ok(()) })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(prompt)
}

#[tauri::command]
pub fn update_prompt(
    state: State<AppState>,
    app: AppHandle,
    id: String,
    title: String,
    content: String,
    description: String,
    folder_id: Option<String>,
    tags: Vec<String>,
) -> Result<Prompt, String> {
    let result = with_store(&state, |s| {
        let prompt = s.prompts.iter_mut().find(|p| p.id == id).ok_or("Prompt not found")?;
        prompt.title = title;
        prompt.content = content;
        prompt.description = description;
        prompt.folder_id = folder_id;
        prompt.tags = tags;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(result)
}

#[tauri::command]
pub fn delete_prompt(
    state: State<AppState>,
    app: AppHandle,
    id: String,
) -> Result<bool, String> {
    with_store(&state, |s| {
        s.prompts.retain(|p| p.id != id);
        s.versions.retain(|v| v.prompt_id != id);
        Ok(true)
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(true)
}

#[tauri::command]
pub fn toggle_favorite(
    state: State<AppState>,
    app: AppHandle,
    id: String,
) -> Result<Prompt, String> {
    let result = with_store(&state, |s| {
        let prompt = s.prompts.iter_mut().find(|p| p.id == id).ok_or("Not found")?;
        prompt.is_favorite = !prompt.is_favorite;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(result)
}

#[tauri::command]
pub fn soft_delete_prompt(
    state: State<AppState>,
    app: AppHandle,
    id: String,
) -> Result<Prompt, String> {
    let result = with_store(&state, |s| {
        let prompt = s.prompts.iter_mut().find(|p| p.id == id).ok_or("Not found")?;
        prompt.is_deleted = true;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(result)
}

#[tauri::command]
pub fn restore_prompt(
    state: State<AppState>,
    app: AppHandle,
    id: String,
) -> Result<Prompt, String> {
    let result = with_store(&state, |s| {
        let prompt = s.prompts.iter_mut().find(|p| p.id == id).ok_or("Not found")?;
        prompt.is_deleted = false;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(result)
}

// -------------------- Folder CRUD --------------------

#[tauri::command]
pub fn get_folders(state: State<AppState>) -> Result<Vec<Folder>, String> {
    with_store_ref(&state, |s| s.folders.clone())
}

#[tauri::command]
pub fn create_folder(
    state: State<AppState>,
    app: AppHandle,
    name: String,
    parent_id: Option<String>,
) -> Result<Folder, String> {
    let folder = Folder {
        id: nanoid(),
        name,
        parent_id,
        created_at: now(),
    };
    with_store(&state, |s| { s.folders.push(folder.clone()); Ok(()) })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(folder)
}

#[tauri::command]
pub fn rename_folder(
    state: State<AppState>,
    app: AppHandle,
    id: String,
    name: String,
) -> Result<Folder, String> {
    let result = with_store(&state, |s| {
        let folder = s.folders.iter_mut().find(|f| f.id == id).ok_or("Not found")?;
        folder.name = name;
        Ok(folder.clone())
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(result)
}

#[tauri::command]
pub fn delete_folder(
    state: State<AppState>,
    app: AppHandle,
    id: String,
) -> Result<bool, String> {
    with_store(&state, |s| {
        for prompt in s.prompts.iter_mut() {
            if prompt.folder_id.as_ref() == Some(&id) {
                prompt.folder_id = None;
            }
        }
        s.folders.retain(|f| f.parent_id.as_ref() != Some(&id));
        s.folders.retain(|f| f.id != id);
        Ok(true)
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(true)
}

// -------------------- Tag CRUD --------------------

#[tauri::command]
pub fn get_tags(state: State<AppState>) -> Result<Vec<Tag>, String> {
    with_store_ref(&state, |s| s.tags.clone())
}

#[tauri::command]
pub fn create_tag(
    state: State<AppState>,
    app: AppHandle,
    name: String,
    color: String,
) -> Result<Tag, String> {
    let tag = Tag { id: nanoid(), name, color };
    with_store(&state, |s| { s.tags.push(tag.clone()); Ok(()) })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(tag)
}

#[tauri::command]
pub fn delete_tag(
    state: State<AppState>,
    app: AppHandle,
    id: String,
) -> Result<bool, String> {
    with_store(&state, |s| {
        for prompt in s.prompts.iter_mut() {
            prompt.tags.retain(|t| t != &id);
        }
        s.tags.retain(|t| t.id != id);
        Ok(true)
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(true)
}

// -------------------- Version --------------------

#[tauri::command]
pub fn get_prompt_versions(
    state: State<AppState>,
    prompt_id: String,
) -> Result<Vec<PromptVersion>, String> {
    with_store_ref(&state, |s| {
        s.versions
            .iter()
            .filter(|v| v.prompt_id == prompt_id)
            .cloned()
            .collect()
    })
}

#[tauri::command]
pub fn create_version(
    state: State<AppState>,
    app: AppHandle,
    prompt_id: String,
    content: String,
) -> Result<PromptVersion, String> {
    let version = PromptVersion {
        id: nanoid(),
        prompt_id,
        content,
        created_at: now(),
    };
    with_store(&state, |s| { s.versions.push(version.clone()); Ok(()) })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(version)
}

// -------------------- Init --------------------

pub fn init_state(app: &AppHandle) -> AppState {
    Mutex::new(db::load_store(app))
}

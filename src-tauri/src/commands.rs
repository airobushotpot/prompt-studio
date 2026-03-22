use crate::models::{Folder, Prompt, PromptVersion, Tag};
use chrono::Utc;
use nanoid::nanoid;
use serde_json;
use tauri_plugin_sql::Sql;

// -------------------- Prompt CRUD --------------------

#[tauri::command]
pub async fn get_prompts(
    db: tauri::State<'_, Sql>,
) -> Result<Vec<Prompt>, String> {
    let rows: Vec<serde_json::Value> = db
        .select("SELECT id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at FROM prompts WHERE is_deleted = 0")
        .await
        .map_err(|e| e.to_string())?;

    rows.into_iter()
        .map(|row| {
            let tags_str = row.get("tags").and_then(|v| v.as_str()).unwrap_or("[]");
            let tags: Vec<String> = serde_json::from_str(tags_str).unwrap_or_default();
            let is_favorite = row.get("is_favorite").and_then(|v| v.as_i64()).unwrap_or(0) != 0;
            let is_deleted = row.get("is_deleted").and_then(|v| v.as_i64()).unwrap_or(0) != 0;

            Ok(Prompt {
                id: row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                title: row.get("title").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                content: row.get("content").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                description: row.get("description").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                folder_id: row.get("folder_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(String::from),
                tags,
                is_favorite,
                is_deleted,
                created_at: row.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                updated_at: row.get("updated_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
            })
        })
        .collect()
}

#[tauri::command]
pub async fn get_prompt(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<Option<Prompt>, String> {
    let rows: Vec<serde_json::Value> = db
        .select(&format!(
            "SELECT id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at FROM prompts WHERE id = '{}'",
            id
        ))
        .await
        .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(None);
    }

    let row = &rows[0];
    let tags_str = row.get("tags").and_then(|v| v.as_str()).unwrap_or("[]");
    let tags: Vec<String> = serde_json::from_str(tags_str).unwrap_or_default();
    let is_favorite = row.get("is_favorite").and_then(|v| v.as_i64()).unwrap_or(0) != 0;
    let is_deleted = row.get("is_deleted").and_then(|v| v.as_i64()).unwrap_or(0) != 0;

    Ok(Some(Prompt {
        id: row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        title: row.get("title").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        content: row.get("content").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        description: row.get("description").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        folder_id: row.get("folder_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(String::from),
        tags,
        is_favorite,
        is_deleted,
        created_at: row.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        updated_at: row.get("updated_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
    }))
}

#[tauri::command]
pub async fn create_prompt(
    db: tauri::State<'_, Sql>,
    title: String,
    content: String,
    description: String,
    folder_id: Option<String>,
    tags: Vec<String>,
) -> Result<Prompt, String> {
    let id = nanoid!();
    let now = Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    let folder_val = folder_id.map(|f| format!("'{}'", f)).unwrap_or_else(|| "NULL".to_string());

    db.execute(&format!(
        "INSERT INTO prompts (id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at) VALUES ('{}', '{}', '{}', '{}', {}, '{}', 0, 0, '{}', '{}')",
        id, title, content, description, folder_val, tags_json, now, now
    ))
    .await
    .map_err(|e| e.to_string())?;

    Ok(Prompt {
        id,
        title,
        content,
        description,
        folder_id,
        tags,
        is_favorite: false,
        is_deleted: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_prompt(
    db: tauri::State<'_, Sql>,
    id: String,
    title: String,
    content: String,
    description: String,
    folder_id: Option<String>,
    tags: Vec<String>,
) -> Result<Prompt, String> {
    let now = Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    let folder_val = folder_id.clone().map(|f| format!("'{}'", f)).unwrap_or_else(|| "NULL".to_string());

    db.execute(&format!(
        "UPDATE prompts SET title = '{}', content = '{}', description = '{}', folder_id = {}, tags = '{}', updated_at = '{}' WHERE id = '{}'",
        title, content, description, folder_val, tags_json, now, id
    ))
    .await
    .map_err(|e| e.to_string())?;

    get_prompt(db, id).await?.ok_or_else(|| "Prompt not found".to_string())
}

#[tauri::command]
pub async fn delete_prompt(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<bool, String> {
    db.execute(&format!("DELETE FROM prompts WHERE id = '{}'", id))
        .await
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn toggle_favorite(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<Prompt, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(&format!(
        "UPDATE prompts SET is_favorite = 1 - is_favorite, updated_at = '{}' WHERE id = '{}'",
        now, id
    ))
    .await
    .map_err(|e| e.to_string())?;

    get_prompt(db, id).await?.ok_or_else(|| "Prompt not found".to_string())
}

#[tauri::command]
pub async fn soft_delete_prompt(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<Prompt, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(&format!(
        "UPDATE prompts SET is_deleted = 1, updated_at = '{}' WHERE id = '{}'",
        now, id
    ))
    .await
    .map_err(|e| e.to_string())?;

    get_prompt(db, id).await?.ok_or_else(|| "Prompt not found".to_string())
}

#[tauri::command]
pub async fn restore_prompt(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<Prompt, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(&format!(
        "UPDATE prompts SET is_deleted = 0, updated_at = '{}' WHERE id = '{}'",
        now, id
    ))
    .await
    .map_err(|e| e.to_string())?;

    get_prompt(db, id).await?.ok_or_else(|| "Prompt not found".to_string())
}

// -------------------- Folder CRUD --------------------

#[tauri::command]
pub async fn get_folders(
    db: tauri::State<'_, Sql>,
) -> Result<Vec<Folder>, String> {
    let rows: Vec<serde_json::Value> = db
        .select("SELECT id, name, parent_id, created_at FROM folders")
        .await
        .map_err(|e| e.to_string())?;

    rows.into_iter()
        .map(|row| {
            Ok(Folder {
                id: row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                name: row.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                parent_id: row.get("parent_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(String::from),
                created_at: row.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
            })
        })
        .collect()
}

#[tauri::command]
pub async fn create_folder(
    db: tauri::State<'_, Sql>,
    name: String,
    parent_id: Option<String>,
) -> Result<Folder, String> {
    let id = nanoid!();
    let now = Utc::now().to_rfc3339();
    let parent_val = parent_id.clone().map(|p| format!("'{}'", p)).unwrap_or_else(|| "NULL".to_string());

    db.execute(&format!(
        "INSERT INTO folders (id, name, parent_id, created_at) VALUES ('{}', '{}', {}, '{}')",
        id, name, parent_val, now
    ))
    .await
    .map_err(|e| e.to_string())?;

    Ok(Folder {
        id,
        name,
        parent_id,
        created_at: now,
    })
}

#[tauri::command]
pub async fn rename_folder(
    db: tauri::State<'_, Sql>,
    id: String,
    name: String,
) -> Result<Folder, String> {
    db.execute(&format!(
        "UPDATE folders SET name = '{}' WHERE id = '{}'",
        name, id
    ))
    .await
    .map_err(|e| e.to_string())?;

    let rows: Vec<serde_json::Value> = db
        .select(&format!("SELECT id, name, parent_id, created_at FROM folders WHERE id = '{}'", id))
        .await
        .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Err("Folder not found".to_string());
    }

    let row = &rows[0];
    Ok(Folder {
        id: row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        name: row.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        parent_id: row.get("parent_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(String::from),
        created_at: row.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
    })
}

#[tauri::command]
pub async fn delete_folder(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<bool, String> {
    db.execute(&format!("DELETE FROM folders WHERE id = '{}'", id))
        .await
        .map_err(|e| e.to_string())?;
    Ok(true)
}

// -------------------- Tag CRUD --------------------

#[tauri::command]
pub async fn get_tags(
    db: tauri::State<'_, Sql>,
) -> Result<Vec<Tag>, String> {
    let rows: Vec<serde_json::Value> = db
        .select("SELECT id, name, color FROM tags")
        .await
        .map_err(|e| e.to_string())?;

    rows.into_iter()
        .map(|row| {
            Ok(Tag {
                id: row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                name: row.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                color: row.get("color").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
            })
        })
        .collect()
}

#[tauri::command]
pub async fn create_tag(
    db: tauri::State<'_, Sql>,
    name: String,
    color: String,
) -> Result<Tag, String> {
    let id = nanoid!();

    db.execute(&format!(
        "INSERT INTO tags (id, name, color) VALUES ('{}', '{}', '{}')",
        id, name, color
    ))
    .await
    .map_err(|e| e.to_string())?;

    Ok(Tag { id, name, color })
}

#[tauri::command]
pub async fn delete_tag(
    db: tauri::State<'_, Sql>,
    id: String,
) -> Result<bool, String> {
    db.execute(&format!("DELETE FROM tags WHERE id = '{}'", id))
        .await
        .map_err(|e| e.to_string())?;
    Ok(true)
}

// -------------------- Version --------------------

#[tauri::command]
pub async fn get_prompt_versions(
    db: tauri::State<'_, Sql>,
    prompt_id: String,
) -> Result<Vec<PromptVersion>, String> {
    let rows: Vec<serde_json::Value> = db
        .select(&format!(
            "SELECT id, prompt_id, content, created_at FROM prompt_versions WHERE prompt_id = '{}' ORDER BY created_at DESC",
            prompt_id
        ))
        .await
        .map_err(|e| e.to_string())?;

    rows.into_iter()
        .map(|row| {
            Ok(PromptVersion {
                id: row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                prompt_id: row.get("prompt_id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                content: row.get("content").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
                created_at: row.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
            })
        })
        .collect()
}

#[tauri::command]
pub async fn create_version(
    db: tauri::State<'_, Sql>,
    prompt_id: String,
    content: String,
) -> Result<PromptVersion, String> {
    let id = nanoid!();
    let now = Utc::now().to_rfc3339();

    db.execute(&format!(
        "INSERT INTO prompt_versions (id, prompt_id, content, created_at) VALUES ('{}', '{}', '{}', '{}')",
        id, prompt_id, content, now
    ))
    .await
    .map_err(|e| e.to_string())?;

    Ok(PromptVersion {
        id,
        prompt_id,
        content,
        created_at: now,
    })
}

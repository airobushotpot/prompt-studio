// CLI-specific database operations (no Tauri dependency)
// Reuses models from the parent crate via `prompt_studio_lib::db`

use prompt_studio_lib::db::{Folder, Prompt, PromptVersion, Store, Tag};
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;

/// Get the CLI database path from env var or default location
pub fn cli_db_path() -> PathBuf {
    if let Ok(path) = std::env::var("PROMPT_STUDIO_DB") {
        PathBuf::from(path)
    } else {
        let home = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        home.join("prompt-studio").join("prompt_studio.db")
    }
}

fn init_db(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            description TEXT DEFAULT '',
            folder_id TEXT,
            tags TEXT DEFAULT '[]',
            is_favorite INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prompt_versions (
            id TEXT PRIMARY KEY,
            prompt_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_prompts_folder ON prompts(folder_id);
        CREATE INDEX IF NOT EXISTS idx_prompts_deleted ON prompts(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_versions_prompt ON prompt_versions(prompt_id);
        "
    ).map_err(|e| e.to_string())
}

pub fn load_store() -> Store {
    let path = cli_db_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let conn = match Connection::open(&path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to open database at {:?}: {}", path, e);
            return Store::default();
        }
    };

    if let Err(e) = init_db(&conn) {
        eprintln!("Failed to init database: {}", e);
        return Store::default();
    }

    let mut store = Store::default();

    // Load prompts
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at FROM prompts"
    ) {
        let rows = stmt.query_map([], |row| {
            let tags_json: String = row.get(5)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            Ok(Prompt {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                description: row.get::<_, String>(3).unwrap_or_default(),
                folder_id: row.get(4)?,
                tags,
                is_favorite: row.get::<_, i32>(6)? != 0,
                is_deleted: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        });
        if let Ok(rows) = rows {
            for row in rows.flatten() {
                store.prompts.push(row);
            }
        }
    }

    // Load folders
    if let Ok(mut stmt) = conn.prepare("SELECT id, name, parent_id, created_at FROM folders") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                created_at: row.get(3)?,
            })
        }) {
            for row in rows.flatten() {
                store.folders.push(row);
            }
        }
    }

    // Load tags
    if let Ok(mut stmt) = conn.prepare("SELECT id, name, color FROM tags") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        }) {
            for row in rows.flatten() {
                store.tags.push(row);
            }
        }
    }

    // Load versions
    if let Ok(mut stmt) = conn.prepare("SELECT id, prompt_id, content, created_at FROM prompt_versions") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok(PromptVersion {
                id: row.get(0)?,
                prompt_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
            })
        }) {
            for row in rows.flatten() {
                store.versions.push(row);
            }
        }
    }

    store
}

pub fn save_store(store: &Store) -> Result<(), String> {
    let path = cli_db_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    init_db(&conn)?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM prompt_versions", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM prompts", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM folders", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM tags", []).map_err(|e| e.to_string())?;

    for p in &store.prompts {
        let tags_json = serde_json::to_string(&p.tags).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO prompts (id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![p.id, p.title, p.content, p.description, p.folder_id, tags_json, p.is_favorite as i32, p.is_deleted as i32, p.created_at, p.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    for f in &store.folders {
        tx.execute(
            "INSERT INTO folders (id, name, parent_id, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![f.id, f.name, f.parent_id, f.created_at],
        ).map_err(|e| e.to_string())?;
    }

    for t in &store.tags {
        tx.execute(
            "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
            params![t.id, t.name, t.color],
        ).map_err(|e| e.to_string())?;
    }

    for v in &store.versions {
        tx.execute(
            "INSERT INTO prompt_versions (id, prompt_id, content, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![v.id, v.prompt_id, v.content, v.created_at],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

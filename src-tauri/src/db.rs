use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub description: String,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    pub tags: Vec<String>,
    #[serde(rename = "isFavorite")]
    pub is_favorite: bool,
    #[serde(rename = "isDeleted")]
    pub is_deleted: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptVersion {
    pub id: String,
    #[serde(rename = "promptId")]
    pub prompt_id: String,
    pub content: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Store {
    pub prompts: Vec<Prompt>,
    pub folders: Vec<Folder>,
    pub tags: Vec<Tag>,
    pub versions: Vec<PromptVersion>,
}

fn db_path(app: &tauri::AppHandle) -> PathBuf {
    let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("prompt_studio.db")
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

pub fn load_store(app: &tauri::AppHandle) -> Store {
    let path = db_path(app);
    let conn = match Connection::open(&path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to open database: {}", e);
            return Store::default();
        }
    };

    if let Err(e) = init_db(&conn) {
        eprintln!("Failed to init database: {}", e);
        return Store::default();
    }

    let mut store = Store::default();

    // Load prompts
    let mut stmt = match conn.prepare(
        "SELECT id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at FROM prompts"
    ) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to prepare prompts query: {}", e);
            return Store::default();
        }
    };

    let prompt_rows = stmt.query_map([], |row| {
        let tags_json: String = row.get::<_, String>(5)?;
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

    match prompt_rows {
        Ok(rows) => {
            for row in rows.flatten() {
                store.prompts.push(row);
            }
        }
        Err(e) => eprintln!("Failed to load prompts: {}", e),
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

pub fn save_store(app: &tauri::AppHandle, store: &Store) -> Result<(), String> {
    let path = db_path(app);
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;

    init_db(&conn)?;

    // Replace all data in a transaction
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // Clear existing data
    tx.execute("DELETE FROM prompt_versions", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM prompts", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM folders", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM tags", []).map_err(|e| e.to_string())?;

    // Insert prompts
    for p in &store.prompts {
        let tags_json = serde_json::to_string(&p.tags).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO prompts (id, title, content, description, folder_id, tags, is_favorite, is_deleted, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![p.id, p.title, p.content, p.description, p.folder_id, tags_json, p.is_favorite as i32, p.is_deleted as i32, p.created_at, p.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    // Insert folders
    for f in &store.folders {
        tx.execute(
            "INSERT INTO folders (id, name, parent_id, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![f.id, f.name, f.parent_id, f.created_at],
        ).map_err(|e| e.to_string())?;
    }

    // Insert tags
    for t in &store.tags {
        tx.execute(
            "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
            params![t.id, t.name, t.color],
        ).map_err(|e| e.to_string())?;
    }

    // Insert versions
    for v in &store.versions {
        tx.execute(
            "INSERT INTO prompt_versions (id, prompt_id, content, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![v.id, v.prompt_id, v.content, v.created_at],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

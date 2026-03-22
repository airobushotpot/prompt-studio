use actix_web::{web, App, HttpResponse, HttpServer};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};

use crate::db::{Folder, Prompt, PromptVersion, Tag, Store};
use crate::commands::{AppState, now, nanoid};

type ApiState = web::Data<AppState>;

// -------------------- Request/Response DTOs --------------------

#[derive(Debug, Deserialize)]
pub struct CreatePromptRequest {
    pub title: String,
    pub content: String,
    pub description: Option<String>,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromptRequest {
    pub title: String,
    pub content: String,
    pub description: Option<String>,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenameFolderRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateVersionRequest {
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub json: String,
}

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
}

impl From<&str> for ApiError {
    fn from(s: &str) -> Self {
        ApiError { error: s.to_string() }
    }
}

impl From<String> for ApiError {
    fn from(s: String) -> Self {
        ApiError { error: s }
    }
}

type ApiResult<T> = Result<web::Json<T>, actix_web::Error>;

fn internal_error(e: String) -> actix_web::Error {
    let err_clone = e.clone();
    actix_web::error::InternalError::from_response(
        err_clone,
        HttpResponse::InternalServerError().json(ApiError::from(e)),
    )
    .into()
}

// -------------------- Store Helpers --------------------

fn with_store<F, R>(state: &ApiState, f: F) -> Result<R, actix_web::Error>
where
    F: FnOnce(&mut Store) -> Result<R, String>,
{
    let mut store = state.lock().map_err(|e| internal_error(e.to_string()))?;
    f(&mut store).map_err(internal_error)
}

fn with_store_ref<F, R>(state: &ApiState, f: F) -> Result<R, actix_web::Error>
where
    F: FnOnce(&Store) -> Result<R, String>,
{
    let store = state.lock().map_err(|e| internal_error(e.to_string()))?;
    f(&store).map_err(internal_error)
}

// -------------------- Prompt Endpoints --------------------

async fn get_prompts(state: ApiState) -> ApiResult<Vec<Prompt>> {
    let prompts = with_store_ref(&state, |s| {
        Ok(s.prompts.iter().filter(|p| !p.is_deleted).cloned().collect())
    })?;
    Ok(web::Json(prompts))
}

async fn get_prompt(state: ApiState, path: web::Path<String>) -> ApiResult<Prompt> {
    let id = path.into_inner();
    let prompt = with_store_ref(&state, |s| {
        s.prompts
            .iter()
            .find(|p| p.id == id && !p.is_deleted)
            .cloned()
            .ok_or("Prompt not found".to_string())
    })?;
    Ok(web::Json(prompt))
}

async fn create_prompt(state: ApiState, body: web::Json<CreatePromptRequest>) -> ApiResult<Prompt> {
    let body = body.into_inner();
    let prompt = Prompt {
        id: nanoid(),
        title: body.title,
        content: body.content,
        description: body.description.unwrap_or_default(),
        folder_id: body.folder_id,
        tags: body.tags.unwrap_or_default(),
        is_favorite: false,
        is_deleted: false,
        created_at: now(),
        updated_at: now(),
    };
    with_store(&state, |s| {
        s.prompts.push(prompt.clone());
        Ok(())
    })?;
    Ok(web::Json(prompt))
}

async fn update_prompt(
    state: ApiState,
    path: web::Path<String>,
    body: web::Json<UpdatePromptRequest>,
) -> ApiResult<Prompt> {
    let id = path.into_inner();
    let body = body.into_inner();

    // Get previous content for version
    let prev_content = with_store_ref(&state, |s| {
        Ok(s.prompts
            .iter()
            .find(|p| p.id == id)
            .and_then(|p| Some(p.content.clone())))
    })?;

    let result = with_store(&state, |s| {
        let prompt = s
            .prompts
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or("Prompt not found")?;
        prompt.title = body.title;
        prompt.content = body.content.clone();
        prompt.description = body.description.unwrap_or_default();
        prompt.folder_id = body.folder_id;
        prompt.tags = body.tags.unwrap_or_default();
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;

    // Auto-save version
    if let Some(prev) = prev_content {
        if !prev.is_empty() {
            let version = PromptVersion {
                id: nanoid(),
                prompt_id: id,
                content: prev,
                created_at: now(),
            };
            let _ = with_store(&state, |s| {
                s.versions.push(version);
                Ok(())
            });
        }
    }

    Ok(web::Json(result))
}

async fn delete_prompt(state: ApiState, path: web::Path<String>) -> ApiResult<bool> {
    let id = path.into_inner();
    with_store(&state, |s| {
        s.prompts.retain(|p| p.id != id);
        s.versions.retain(|v| v.prompt_id != id);
        Ok(true)
    })?;
    Ok(web::Json(true))
}

async fn toggle_favorite(state: ApiState, path: web::Path<String>) -> ApiResult<Prompt> {
    let id = path.into_inner();
    let result = with_store(&state, |s| {
        let prompt = s
            .prompts
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or("Not found")?;
        prompt.is_favorite = !prompt.is_favorite;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;
    Ok(web::Json(result))
}

// -------------------- Folder Endpoints --------------------

async fn get_folders(state: ApiState) -> ApiResult<Vec<Folder>> {
    let folders = with_store_ref(&state, |s| Ok(s.folders.clone()))?;
    Ok(web::Json(folders))
}

async fn create_folder(
    state: ApiState,
    body: web::Json<CreateFolderRequest>,
) -> ApiResult<Folder> {
    let body = body.into_inner();
    let folder = Folder {
        id: nanoid(),
        name: body.name,
        parent_id: body.parent_id,
        created_at: now(),
    };
    with_store(&state, |s| {
        s.folders.push(folder.clone());
        Ok(())
    })?;
    Ok(web::Json(folder))
}

async fn rename_folder(
    state: ApiState,
    path: web::Path<String>,
    body: web::Json<RenameFolderRequest>,
) -> ApiResult<Folder> {
    let id = path.into_inner();
    let body = body.into_inner();
    let result = with_store(&state, |s| {
        let folder = s
            .folders
            .iter_mut()
            .find(|f| f.id == id)
            .ok_or("Not found")?;
        folder.name = body.name;
        Ok(folder.clone())
    })?;
    Ok(web::Json(result))
}

async fn delete_folder(state: ApiState, path: web::Path<String>) -> ApiResult<bool> {
    let id = path.into_inner();
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
    Ok(web::Json(true))
}

// -------------------- Tag Endpoints --------------------

async fn get_tags(state: ApiState) -> ApiResult<Vec<Tag>> {
    let tags = with_store_ref(&state, |s| Ok(s.tags.clone()))?;
    Ok(web::Json(tags))
}

async fn create_tag(state: ApiState, body: web::Json<CreateTagRequest>) -> ApiResult<Tag> {
    let body = body.into_inner();
    let tag = Tag {
        id: nanoid(),
        name: body.name,
        color: body.color,
    };
    with_store(&state, |s| {
        s.tags.push(tag.clone());
        Ok(())
    })?;
    Ok(web::Json(tag))
}

async fn delete_tag(state: ApiState, path: web::Path<String>) -> ApiResult<bool> {
    let id = path.into_inner();
    with_store(&state, |s| {
        for prompt in s.prompts.iter_mut() {
            prompt.tags.retain(|t| t != &id);
        }
        s.tags.retain(|t| t.id != id);
        Ok(true)
    })?;
    Ok(web::Json(true))
}

// -------------------- Version Endpoints --------------------

async fn get_prompt_versions(
    state: ApiState,
    path: web::Path<String>,
) -> ApiResult<Vec<PromptVersion>> {
    let prompt_id = path.into_inner();
    let versions = with_store_ref(&state, |s| {
        Ok(s
            .versions
            .iter()
            .filter(|v| v.prompt_id == prompt_id)
            .cloned()
            .collect())
    })?;
    Ok(web::Json(versions))
}

async fn create_version(
    state: ApiState,
    path: web::Path<String>,
    body: web::Json<CreateVersionRequest>,
) -> ApiResult<PromptVersion> {
    let prompt_id = path.into_inner();
    let body = body.into_inner();
    let version = PromptVersion {
        id: nanoid(),
        prompt_id,
        content: body.content,
        created_at: now(),
    };
    with_store(&state, |s| {
        s.versions.push(version.clone());
        Ok(())
    })?;
    Ok(web::Json(version))
}

async fn restore_version(state: ApiState, path: web::Path<String>) -> ApiResult<Prompt> {
    let version_id = path.into_inner();

    let (prompt_id, content) = {
        let store = state.lock().map_err(|e: std::sync::PoisonError<_>| internal_error(e.to_string()))?;
        let v = match store.versions.iter().find(|v| v.id == version_id) {
            Some(v) => v,
            None => return Err(internal_error("Version not found".to_string())),
        };
        (v.prompt_id.clone(), v.content.clone())
    };

    let result = with_store(&state, |s| {
        let prompt = s
            .prompts
            .iter_mut()
            .find(|p| p.id == prompt_id)
            .ok_or("Prompt not found")?;
        prompt.content = content;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;

    Ok(web::Json(result))
}

// -------------------- Import/Export --------------------

#[derive(Serialize)]
struct ExportData {
    version: String,
    exported_at: String,
    prompts: Vec<Prompt>,
    folders: Vec<Folder>,
    tags: Vec<Tag>,
}

async fn export_all_data(state: ApiState) -> ApiResult<String> {
    let store = state.lock().map_err(|e| internal_error(e.to_string()))?;
    let export = ExportData {
        version: "1.0".to_string(),
        exported_at: now(),
        prompts: store
            .prompts
            .iter()
            .filter(|p| !p.is_deleted)
            .cloned()
            .collect(),
        folders: store.folders.clone(),
        tags: store.tags.clone(),
    };
    drop(store);
    let json = serde_json::to_string_pretty(&export).map_err(|e| internal_error(e.to_string()))?;
    Ok(web::Json(json))
}

async fn import_data(state: ApiState, body: web::Json<ImportRequest>) -> ApiResult<bool> {
    let body = body.into_inner();
    #[derive(Deserialize)]
    #[allow(dead_code)]
    struct ImportData {
        version: Option<String>,
        exported_at: Option<String>,
        prompts: Vec<Prompt>,
        folders: Vec<Folder>,
        tags: Vec<Tag>,
    }
    let import: ImportData =
        serde_json::from_str(&body.json).map_err(|e| internal_error(e.to_string()))?;

    with_store(&state, |s| {
        for folder in import.folders {
            if !s.folders.iter().any(|f| f.id == folder.id) {
                s.folders.push(folder);
            }
        }
        for tag in import.tags {
            if !s.tags.iter().any(|t| t.id == tag.id) {
                s.tags.push(tag);
            }
        }
        for prompt in import.prompts {
            if !s.prompts.iter().any(|p| p.id == prompt.id) {
                s.prompts.push(prompt);
            }
        }
        Ok(())
    })?;

    Ok(web::Json(true))
}

// -------------------- Health Check --------------------

async fn health_check() -> &'static str {
    "OK"
}

// -------------------- Configure Routes --------------------

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            // Prompts
            .route("/prompts", web::get().to(get_prompts))
            .route("/prompts", web::post().to(create_prompt))
            .route("/prompts/{id}", web::get().to(get_prompt))
            .route("/prompts/{id}", web::put().to(update_prompt))
            .route("/prompts/{id}", web::delete().to(delete_prompt))
            .route("/prompts/{id}/favorite", web::post().to(toggle_favorite))
            // Folders
            .route("/folders", web::get().to(get_folders))
            .route("/folders", web::post().to(create_folder))
            .route("/folders/{id}", web::put().to(rename_folder))
            .route("/folders/{id}", web::delete().to(delete_folder))
            // Tags
            .route("/tags", web::get().to(get_tags))
            .route("/tags", web::post().to(create_tag))
            .route("/tags/{id}", web::delete().to(delete_tag))
            // Versions
            .route("/prompts/{id}/versions", web::get().to(get_prompt_versions))
            .route("/prompts/{id}/versions", web::post().to(create_version))
            .route("/versions/{id}/restore", web::post().to(restore_version))
            // Import/Export
            .route("/export", web::get().to(export_all_data))
            .route("/import", web::post().to(import_data)),
    )
    .route("/health", web::get().to(health_check));
}

// -------------------- Run API Server --------------------

pub async fn run_api_server(state: AppState) -> std::io::Result<()> {
    let bind_addr = "127.0.0.1:1847";
    let state_data = web::Data::new(state);

    println!("Starting REST API server at http://{}", bind_addr);
    println!("API endpoints available at /api/v1/*");

    HttpServer::new(move || {
        // Build CORS for each worker
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(state_data.clone())
            .configure(configure_routes)
    })
    .bind(bind_addr)?
    .run()
    .await
}

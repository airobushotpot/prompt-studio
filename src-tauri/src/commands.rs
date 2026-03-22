use crate::db::{self, Folder, Prompt, PromptVersion, Tag, Store};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use std::sync::{Arc, Mutex};

pub type AppState = Arc<Mutex<Store>>;

pub fn now() -> String {
    Utc::now().to_rfc3339()
}

pub fn nanoid() -> String {
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
    F: FnOnce(&Store) -> Result<R, String>,
{
    let store = state.lock().map_err(|e| e.to_string())?;
    f(&store)
}

// -------------------- Prompt CRUD --------------------

#[tauri::command]
pub fn get_prompts(state: State<AppState>) -> Result<Vec<Prompt>, String> {
    with_store_ref(&state, |s| {
        Ok(s.prompts.iter().filter(|p| !p.is_deleted).cloned().collect())
    })
}

#[tauri::command]
pub fn get_prompt(state: State<AppState>, id: String) -> Result<Option<Prompt>, String> {
    with_store_ref(&state, |s| {
        Ok(s.prompts.iter().find(|p| p.id == id && !p.is_deleted).cloned())
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
    with_store(&state, |s| {
        s.prompts.push(prompt.clone());
        Ok(())
    })?;
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
    // Get previous content for version
    let prev_content = {
        let store = state.lock().map_err(|e| e.to_string())?;
        store.prompts.iter().find(|p| p.id == id).map(|p| p.content.clone())
    };

    // Update prompt
    let result = with_store(&state, |s| {
        let prompt = s.prompts.iter_mut().find(|p| p.id == id).ok_or("Prompt not found")?;
        prompt.title = title;
        prompt.content = content.clone();
        prompt.description = description;
        prompt.folder_id = folder_id;
        prompt.tags = tags;
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
    with_store_ref(&state, |s| Ok(s.folders.clone()))
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
    with_store(&state, |s| {
        s.folders.push(folder.clone());
        Ok(())
    })?;
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
    with_store_ref(&state, |s| Ok(s.tags.clone()))
}

#[tauri::command]
pub fn create_tag(
    state: State<AppState>,
    app: AppHandle,
    name: String,
    color: String,
) -> Result<Tag, String> {
    let tag = Tag { id: nanoid(), name, color };
    with_store(&state, |s| {
        s.tags.push(tag.clone());
        Ok(())
    })?;
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
        Ok(s.versions.iter().filter(|v| v.prompt_id == prompt_id).cloned().collect())
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
    with_store(&state, |s| {
        s.versions.push(version.clone());
        Ok(())
    })?;
    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(version)
}

#[tauri::command]
pub fn restore_version(
    state: State<AppState>,
    app: AppHandle,
    version_id: String,
) -> Result<Prompt, String> {
    let (prompt_id, content) = {
        let store = state.lock().map_err(|e| e.to_string())?;
        let v = store.versions.iter().find(|v| v.id == version_id).ok_or("Version not found")?;
        (v.prompt_id.clone(), v.content.clone())
    };

    let result = with_store(&state, |s| {
        let prompt = s.prompts.iter_mut().find(|p| p.id == prompt_id).ok_or("Prompt not found")?;
        prompt.content = content;
        prompt.updated_at = now();
        Ok(prompt.clone())
    })?;

    {
        let store = state.lock().map_err(|e| e.to_string())?;
        db::save_store(&app, &store)?;
    }
    Ok(result)
}

// -------------------- Import/Export --------------------

#[derive(Serialize, Deserialize)]
struct ExportData {
    version: String,
    exported_at: String,
    prompts: Vec<Prompt>,
    folders: Vec<Folder>,
    tags: Vec<Tag>,
}

#[tauri::command]
pub fn export_all_data(state: State<AppState>) -> Result<String, String> {
    let store = state.lock().map_err(|e| e.to_string())?;
    let export = ExportData {
        version: "1.0".to_string(),
        exported_at: now(),
        prompts: store.prompts.iter().filter(|p| !p.is_deleted).cloned().collect(),
        folders: store.folders.clone(),
        tags: store.tags.clone(),
    };
    drop(store);
    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_data(
    state: State<AppState>,
    app: AppHandle,
    json: String,
) -> Result<bool, String> {
    let import: ExportData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
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
    let store = state.lock().map_err(|e| e.to_string())?;
    db::save_store(&app, &store)?;
    Ok(true)
}

#[tauri::command]
pub fn export_prompt_markdown(state: State<AppState>, id: String) -> Result<String, String> {
    let store = state.lock().map_err(|e| e.to_string())?;
    let prompt = store.prompts.iter().find(|p| p.id == id).ok_or("Prompt not found")?;
    let title = prompt.title.clone();
    let content = prompt.content.clone();
    let tags_str = if prompt.tags.is_empty() { "无".to_string() } else { prompt.tags.join(", ") };
    let folder_name = store.folders.iter()
        .find(|f| Some(&f.id) == prompt.folder_id.as_ref())
        .map(|f| f.name.clone())
        .unwrap_or_else(|| "未分类".to_string());
    let created = prompt.created_at.clone();
    let updated = prompt.updated_at.clone();
    drop(store);
    let md = format!(
        "# {}\n\n**文件夹**: {}  \n**标签**: {}  \n**创建**: {}  \n**更新**: {}\n\n---\n\n{}",
        title, folder_name, tags_str, created, updated, content
    );
    Ok(md)
}


// -------------------- Templates --------------------

#[derive(Serialize)]
pub struct PromptTemplate {
    title: String,
    content: String,
    description: String,
    tags: Vec<String>,
    variables: Vec<String>,
}

#[derive(Serialize)]
pub struct TemplateCategory {
    name: String,
    icon: String,
    templates: Vec<PromptTemplate>,
}

fn get_hardcoded_templates() -> Vec<TemplateCategory> {
    vec![
        TemplateCategory {
            name: "💡 通用".to_string(),
            icon: "lightbulb".to_string(),
            templates: vec![
                PromptTemplate {
                    title: "代码审查".to_string(),
                    content: "请审查以下{{language}}代码，找出潜在问题、性能优化建议和代码风格问题。\n\n代码：\n```{{language}}\n{{code}}\n```".to_string(),
                    description: "审查代码并提供改进建议".to_string(),
                    tags: vec!["代码".to_string(), "审查".to_string()],
                    variables: vec!["language".to_string(), "code".to_string()],
                },
                PromptTemplate {
                    title: "翻译助手".to_string(),
                    content: "请将以下{{source_lang}}文本翻译成{{target_lang}}，保持原文风格和语气：\n\n{{text}}".to_string(),
                    description: "高质量翻译文本".to_string(),
                    tags: vec!["翻译".to_string(), "语言".to_string()],
                    variables: vec!["source_lang".to_string(), "target_lang".to_string(), "text".to_string()],
                },
            ],
        },
        TemplateCategory {
            name: "✍️ AI写作".to_string(),
            icon: "pen".to_string(),
            templates: vec![
                PromptTemplate {
                    title: "文章润色".to_string(),
                    content: "你是一位资深文字编辑。请帮我润色以下文章，使其更加流畅、专业。\n\n原文：\n{{article}}\n\n润色方向：{{direction}}".to_string(),
                    description: "对文章进行语言润色和风格优化".to_string(),
                    tags: vec!["写作".to_string(), "润色".to_string()],
                    variables: vec!["article".to_string(), "direction".to_string()],
                },
                PromptTemplate {
                    title: "标题生成器".to_string(),
                    content: "你是一个爆款标题专家。请为以下文章生成5个吸引人的标题：\n\n文章主题：{{topic}}\n\n要求：\n1. 每个标题控制在20字以内\n2. 包含数字或悬念\n3. 符合{{platform}}平台风格".to_string(),
                    description: "生成吸引人的文章标题".to_string(),
                    tags: vec!["写作".to_string(), "标题".to_string()],
                    variables: vec!["topic".to_string(), "platform".to_string()],
                },
            ],
        },
        TemplateCategory {
            name: "🎭 角色扮演".to_string(),
            icon: "mask".to_string(),
            templates: vec![
                PromptTemplate {
                    title: "虚拟导师".to_string(),
                    content: "请扮演一位{{role}}老师，用{{style}}的方式教授{{topic}}。\n\n学生背景：{{student_background}}\n\n请确保：\n1. 内容适合学生的水平\n2. 使用生动的例子\n3. 鼓励学生提问".to_string(),
                    description: "教学类角色扮演提示词".to_string(),
                    tags: vec!["角色".to_string(), "教学".to_string()],
                    variables: vec!["role".to_string(), "style".to_string(), "topic".to_string(), "student_background".to_string()],
                },
                PromptTemplate {
                    title: "面试官".to_string(),
                    content: "你是一位经验丰富的{{industry}}行业面试官。请对候选人进行{{interview_type}}面试。\n\n岗位：{{position}}\n\n请从以下几个方面考察：\n1. 专业知识\n2. 解决问题的能力\n3. 沟通表达能力\n4. 文化契合度".to_string(),
                    description: "模拟面试场景".to_string(),
                    tags: vec!["角色".to_string(), "面试".to_string()],
                    variables: vec!["industry".to_string(), "interview_type".to_string(), "position".to_string()],
                },
            ],
        },
    ]
}

#[tauri::command]
pub fn get_templates() -> Vec<TemplateCategory> {
    get_hardcoded_templates()
}

// -------------------- Init --------------------

pub fn init_state(app: &AppHandle) -> AppState {
    Arc::new(Mutex::new(db::load_store(app)))
}

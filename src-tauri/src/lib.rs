mod api;
mod commands;
pub mod db;

use std::sync::Arc;

use commands::{
    create_folder, create_prompt, create_tag, create_version, delete_folder,
    delete_prompt, delete_tag, export_all_data, export_prompt_markdown,
    get_prompt, get_prompt_versions, get_prompts, get_folders, get_tags,
    get_templates, import_data, init_state, rename_folder, restore_prompt,
    restore_version, soft_delete_prompt, toggle_favorite, update_prompt,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state: Arc<std::sync::Mutex<_>> = init_state(&app.handle());

            // Spawn REST API server in background thread
            let api_state = state.clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime for API server");
                rt.block_on(async move {
                    if let Err(e) = api::run_api_server(api_state).await {
                        eprintln!("REST API server error: {}", e);
                    }
                });
            });

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_prompts,
            get_prompt,
            create_prompt,
            update_prompt,
            delete_prompt,
            toggle_favorite,
            soft_delete_prompt,
            restore_prompt,
            get_folders,
            create_folder,
            rename_folder,
            delete_folder,
            get_tags,
            create_tag,
            delete_tag,
            get_prompt_versions,
            create_version,
            restore_version,
            export_all_data,
            import_data,
            export_prompt_markdown,
            get_templates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

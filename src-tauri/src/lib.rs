mod commands;
mod db;
mod models;

use commands::{
    create_folder, create_prompt, create_tag, create_version, delete_folder,
    delete_prompt, delete_tag, get_prompt, get_prompt_versions, get_prompts,
    get_folders, get_tags, init_state, rename_folder, restore_prompt,
    soft_delete_prompt, toggle_favorite, update_prompt,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(init_state(&app.handle()));
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

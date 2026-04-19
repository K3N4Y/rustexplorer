// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod models;

use walkdir::DirEntry;
use walkdir::WalkDir;
use crate::models::file_dto::FileDTO;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![get_file, get_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
    fn get_file(search: String) -> Vec<FileDTO> {
        let mut files = Vec::new();

        for entry in WalkDir::new("C:\\Users\\kenay\\OneDrive\\Desktop")
            .into_iter()
            .filter_map(|e| e.ok()) {
                let name  = entry.file_name().to_string_lossy();

                if name.contains(&search) {
                    files.push(transform_entry(&entry));
                }
            }
        files
    }
#[tauri::command]
    fn get_files(path: String) -> Vec<FileDTO> {
        let files = WalkDir::new(path)
            .max_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
            .map(|e| transform_entry(&e))
            .collect::<Vec<FileDTO>>();
        files
    }
    
    
    fn transform_entry(entry: &DirEntry) -> FileDTO {
        let metadata = entry.metadata().unwrap();
        FileDTO {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_path_buf(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        }
        
    }
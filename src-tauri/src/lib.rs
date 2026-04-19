// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use walkdir::DirEntry;
use crate::dto::FileDTO;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
    fn get_files(search: String) -> Vec<FileDTO> {
        let mut files = Vec::new();

        for entry in walkdir::new("./")
            .into_iter()
            .filter_map(|e| e.ok()) {
                let name  = entry.file_name().to_string_lossy();

                if name.contains(&search) {
                    files.push(transform_entry(&entry));
                }
            }
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
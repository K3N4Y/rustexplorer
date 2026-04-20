// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod models;

use crate::models::file_dto::FileDTO;
use ignore::WalkBuilder;
use std::{fs, path::Path, sync::mpsc};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search_with_ignore, get_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn search_with_ignore(pattern: String) -> Result<Vec<FileDTO>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (tx, rx) = mpsc::channel();

        let buscador = WalkBuilder::new("C:\\Users\\kenay\\OneDrive\\Desktop")
            .threads(8) // evita saturar todos los nucleos
            .build_parallel();

        buscador.run(|| {
            let tx = tx.clone();
            let pattern = pattern.clone();

            Box::new(move |result| {
                if let Ok(entry) = result {
                    let nombre = entry.file_name().to_string_lossy();

                    if nombre.contains(&pattern) {
                        let info = FileDTO {
                            name: nombre.to_string(),
                            path: entry.path().to_path_buf(),
                        };

                        let _ = tx.send(info);
                    }
                }

                ignore::WalkState::Continue
            })
        });

        drop(tx);
        rx.into_iter().collect::<Vec<FileDTO>>()
    })
    .await
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn get_files(path: String) -> Result<Vec<FileDTO>, String> {
    read_one_level_files(Path::new(&path)).map_err(|err| err.to_string())
}

fn read_one_level_files(path: &Path) -> std::io::Result<Vec<FileDTO>> {
    let mut files = Vec::new();

    for entry in fs::read_dir(path)? {
        let entry = entry?;

        let file_type = entry.file_type()?;

        if file_type.is_file() || file_type.is_dir() {
            files.push(FileDTO {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path(),
            });
        }
    }

    files.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(files)
}
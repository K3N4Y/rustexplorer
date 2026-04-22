// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod models;

use crate::models::file_detail_dto::FileDetailDTO;
use chrono::{DateTime, Utc};
use ignore::WalkBuilder;
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
};
use tauri::{Emitter, Window};

const EVENT_BATCH_SIZE: usize = 64;

#[derive(Serialize, Clone)]
struct SearchResultChunkEvent {
    request_id: String,
    items: Vec<FileDetailDTO>,
}

#[derive(Serialize, Clone)]
struct SearchDoneEvent {
    request_id: String,
    total: usize,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
        search_with_ignore,
        get_files,
        rename_file,
        delete_file
    ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn search_with_ignore(
    pattern: String,
    path: String,
    threads: usize,
    request_id: String,
    window: Window,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        // Keep a safe lower/upper bound to avoid invalid or excessive thread counts.
        let thread_count = threads.clamp(1, 32);
        let search_pattern = pattern.to_lowercase();
        let (tx, rx) = mpsc::channel::<FileDetailDTO>();

        let emitter_window = window.clone();
        let emitter_request_id = request_id.clone();
        let emitter_handle = thread::spawn(move || {
            let mut total_found = 0usize;
            let mut buffer = Vec::with_capacity(EVENT_BATCH_SIZE);

            for item in rx {
                total_found += 1;
                buffer.push(item);

                if buffer.len() >= EVENT_BATCH_SIZE {
                    let chunk = std::mem::take(&mut buffer);
                    let _ = emitter_window.emit(
                        "search-results-chunk",
                        SearchResultChunkEvent {
                            request_id: emitter_request_id.clone(),
                            items: chunk,
                        },
                    );
                }
            }

            if !buffer.is_empty() {
                let _ = emitter_window.emit(
                    "search-results-chunk",
                    SearchResultChunkEvent {
                        request_id: emitter_request_id,
                        items: buffer,
                    },
                );
            }

            total_found
        });

        let buscador = WalkBuilder::new(&path)
            .threads(thread_count)
            .build_parallel();

        buscador.run(|| {
            let search_pattern = search_pattern.clone();
            let tx = tx.clone();

            Box::new(move |result| {
                if let Ok(entry) = result {
                    let nombre = entry.file_name().to_string_lossy();

                    if nombre.to_lowercase().contains(&search_pattern) {
                        if let Ok(metadata) = entry.metadata() {
                            let info = file_detail_from_parts(
                                nombre.to_string(),
                                entry.path().to_path_buf(),
                                &metadata,
                            );

                            let _ = tx.send(info);
                        }
                    }
                }

                ignore::WalkState::Continue
            })
        });

        drop(tx);

        let total_found = emitter_handle
            .join()
            .map_err(|_| "search emitter thread failed".to_string())?;

        let _ = window.emit(
            "search-done",
            SearchDoneEvent {
                request_id,
                total: total_found,
            },
        );

        Ok(())
    })
    .await
    .map_err(|err| err.to_string())??;

    Ok(())
}

#[tauri::command]
fn get_files(path: String) -> Result<Vec<FileDetailDTO>, String> {
    read_one_level_files(Path::new(&path)).map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "snake_case")]
fn rename_file(source_path: String, target_name: String) -> Result<(), String> {
    if target_name.trim().is_empty() {
        return Err("target name cannot be empty".to_string());
    }

    if target_name.contains('/') || target_name.contains('\\') {
        return Err("target name cannot contain path separators".to_string());
    }

    let source = Path::new(&source_path);
    let parent = source
        .parent()
        .ok_or_else(|| "source has no parent directory".to_string())?;
    let target = parent.join(target_name);

    if target.exists() {
        return Err("a file or folder with that name already exists".to_string());
    }

    fs::rename(source, target).map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "snake_case")]
fn delete_file(target_path: String) -> Result<(), String> {
    let target = Path::new(&target_path);

    if !target.exists() {
        return Err("target does not exist".to_string());
    }

    let metadata = fs::metadata(target).map_err(|err| err.to_string())?;

    if metadata.is_dir() {
        fs::remove_dir_all(target).map_err(|err| err.to_string())
    } else {
        fs::remove_file(target).map_err(|err| err.to_string())
    }
}

fn file_detail_from_parts(name: String, path: PathBuf, metadata: &fs::Metadata) -> FileDetailDTO {
    let modified = metadata
        .modified()
        .ok()
        .map(|time| {
            let datetime: DateTime<Utc> = time.into();
            datetime.to_rfc3339()
        });

    FileDetailDTO {
        name,
        path,
        size: metadata.len(),
        modified,
        is_dir: metadata.is_dir(),
    }
}

fn read_one_level_files(path: &Path) -> std::io::Result<Vec<FileDetailDTO>> {
    let mut files = Vec::new();

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;

        files.push(file_detail_from_parts(
            entry.file_name().to_string_lossy().to_string(),
            entry.path(),
            &metadata,
        ));
    }

    files.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_detail_from_parts_maps_metadata_into_dto() {
        let temp_dir = std::env::temp_dir().join(format!("rustexplorer-test-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let file_path = temp_dir.join("sample.txt");
        fs::write(&file_path, b"hello").unwrap();

        let metadata = fs::metadata(&file_path).unwrap();
        let detail = file_detail_from_parts("sample.txt".to_string(), file_path.clone(), &metadata);

        assert_eq!(detail.name, "sample.txt");
        assert_eq!(detail.path, file_path);
        assert_eq!(detail.size, 5);
        assert!(!detail.is_dir);
        assert!(detail.modified.is_some());

        fs::remove_file(&detail.path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }
}

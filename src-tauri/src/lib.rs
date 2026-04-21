// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod models;

use crate::models::file_detail_dto::FileDetailDTO;
use chrono::{DateTime, Utc};
use ignore::WalkBuilder;
use serde::Serialize;
use std::{fs, path::Path, sync::mpsc, thread};
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
        .invoke_handler(tauri::generate_handler![search_with_ignore, get_files])
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
                            let modified = metadata
                                .modified()
                                .ok()
                                .map(|time| {
                                    let datetime: DateTime<Utc> = time.into();
                                    datetime.to_rfc3339()
                                });

                            let info = FileDetailDTO {
                                name: nombre.to_string(),
                                path: entry.path().to_path_buf(),
                                size: metadata.len(),
                                modified,
                                is_dir: metadata.is_dir(),
                            };

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

fn read_one_level_files(path: &Path) -> std::io::Result<Vec<FileDetailDTO>> {
    let mut files = Vec::new();

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        
        let modified = metadata
            .modified()
            .ok()
            .map(|time| {
                let datetime: DateTime<Utc> = time.into();
                datetime.to_rfc3339()
            });

        files.push(FileDetailDTO {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path(),
            size: metadata.len(),
            modified,
            is_dir: metadata.is_dir(),
        });
    }

    files.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(files)
}
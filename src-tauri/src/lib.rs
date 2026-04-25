// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod models;

use crate::models::file_detail_dto::FileDetailDTO;
use chrono::{DateTime, Utc};
use ignore::WalkBuilder;
use serde::Serialize;
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
};
use tauri::{Emitter, Window};

const EVENT_BATCH_SIZE: usize = 64;
const DEFAULT_TEXT_PREVIEW_BYTES: usize = 128 * 1024;

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

#[derive(Serialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
enum PreviewPayload {
    Text {
        content: String,
        extension: Option<String>,
        truncated: bool,
        size_bytes: u64,
    },
    Markdown {
        content: String,
        truncated: bool,
        size_bytes: u64,
    },
    Image {
        path: String,
        mime_type: String,
        size_bytes: u64,
    },
    Pdf {
        path: String,
        mime_type: Option<String>,
        size_bytes: u64,
    },
    Video {
        path: String,
        mime_type: Option<String>,
        size_bytes: u64,
    },
    Audio {
        path: String,
        mime_type: Option<String>,
        size_bytes: u64,
    },
    Directory {
        entry_count: Option<usize>,
    },
    Binary {
        mime_type: Option<String>,
        size_bytes: u64,
        reason: Option<String>,
    },
    Error {
        message: String,
    },
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            search_with_ignore,
            get_files,
            rename_file,
            delete_file,
            read_file_preview
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

fn extension_for_path(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
}

fn is_markdown_extension(ext: &str) -> bool {
    matches!(ext, "md" | "markdown")
}

fn is_text_extension(ext: &str) -> bool {
    matches!(
        ext,
        "txt"
            | "rs"
            | "ts"
            | "tsx"
            | "js"
            | "jsx"
            | "json"
            | "css"
            | "html"
            | "toml"
            | "yaml"
            | "yml"
            | "csv"
    )
}

fn is_image_extension(ext: &str) -> bool {
    matches!(
        ext,
        "png"
            | "jpg"
            | "jpeg"
            | "gif"
            | "webp"
            | "bmp"
            | "svg"
            | "avif"
            | "ico"
            | "tif"
            | "tiff"
            | "heic"
            | "heif"
    )
}

fn image_mime_type_from_extension(ext: &str) -> Option<&'static str> {
    match ext {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "bmp" => Some("image/bmp"),
        "svg" => Some("image/svg+xml"),
        "avif" => Some("image/avif"),
        "ico" => Some("image/x-icon"),
        "tif" | "tiff" => Some("image/tiff"),
        "heic" => Some("image/heic"),
        "heif" => Some("image/heif"),
        _ => None,
    }
}

fn is_audio_extension(ext: &str) -> bool {
    matches!(
        ext,
        "mp3" | "wav" | "ogg" | "m4a" | "flac" | "aac" | "opus" | "weba" | "wma"
    )
}

fn is_video_extension(ext: &str) -> bool {
    matches!(
        ext,
        "mp4" | "webm" | "mov" | "mkv" | "avi" | "m4v" | "wmv" | "flv" | "3gp" | "ts"
    )
}

fn read_limited_text_preview<R: Read>(
    reader: R,
    preview_limit: usize,
) -> Result<(String, bool), String> {
    let mut bytes = Vec::new();
    let max_read_bytes = preview_limit.saturating_add(1);

    reader
        .take(max_read_bytes as u64)
        .read_to_end(&mut bytes)
        .map_err(|err| err.to_string())?;

    let truncated = bytes.len() > preview_limit;

    if truncated {
        bytes.truncate(preview_limit);
    }

    let content = String::from_utf8_lossy(&bytes).to_string();

    Ok((content, truncated))
}

fn read_text_preview(target: &Path, preview_limit: usize) -> Result<(String, bool), String> {
    let file = fs::File::open(target).map_err(|err| err.to_string())?;

    read_limited_text_preview(file, preview_limit)
}

#[tauri::command]
fn read_file_preview(path: String, max_bytes: Option<usize>) -> Result<PreviewPayload, String> {
    let target = Path::new(&path);

    if !target.exists() {
        return Err("target does not exist".to_string());
    }

    let metadata = fs::metadata(target).map_err(|err| err.to_string())?;

    if metadata.is_dir() {
        let entry_count = fs::read_dir(target)
            .ok()
            .map(|entries| entries.filter_map(Result::ok).count());

        return Ok(PreviewPayload::Directory { entry_count });
    }

    let size_bytes = metadata.len();
    let extension = extension_for_path(target);
    let extension_ref = extension.as_deref();
    let preview_limit = max_bytes.unwrap_or(DEFAULT_TEXT_PREVIEW_BYTES);
    let detected = infer::get_from_path(target).ok().flatten();
    let mime_type = detected.as_ref().map(|kind| kind.mime_type().to_string());
    let path_value = target.to_string_lossy().to_string();

    if extension_ref.is_some_and(is_markdown_extension) {
        let (content, truncated) = read_text_preview(target, preview_limit)?;

        return Ok(PreviewPayload::Markdown {
            content,
            truncated,
            size_bytes,
        });
    }

    if extension_ref.is_some_and(is_text_extension) {
        let (content, truncated) = read_text_preview(target, preview_limit)?;

        return Ok(PreviewPayload::Text {
            content,
            extension,
            truncated,
            size_bytes,
        });
    }

    if mime_type
        .as_deref()
        .is_some_and(|mime| mime.starts_with("image/"))
        || extension_ref.is_some_and(is_image_extension)
    {
        let resolved_mime = mime_type.unwrap_or_else(|| {
            extension_ref
                .and_then(image_mime_type_from_extension)
                .unwrap_or("image/*")
                .to_string()
        });

        return Ok(PreviewPayload::Image {
            path: path_value,
            mime_type: resolved_mime,
            size_bytes,
        });
    }

    if mime_type.as_deref() == Some("application/pdf") || extension_ref == Some("pdf") {
        return Ok(PreviewPayload::Pdf {
            path: path_value,
            mime_type,
            size_bytes,
        });
    }

    if mime_type
        .as_deref()
        .is_some_and(|mime| mime.starts_with("audio/"))
        || extension_ref.is_some_and(is_audio_extension)
    {
        return Ok(PreviewPayload::Audio {
            path: path_value,
            mime_type,
            size_bytes,
        });
    }

    if mime_type
        .as_deref()
        .is_some_and(|mime| mime.starts_with("video/"))
        || extension_ref.is_some_and(is_video_extension)
    {
        return Ok(PreviewPayload::Video {
            path: path_value,
            mime_type,
            size_bytes,
        });
    }

    Ok(PreviewPayload::Binary {
        mime_type,
        size_bytes,
        reason: Some("unsupported file type".to_string()),
    })
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

    fn create_temp_dir(prefix: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("{}-{}-{}", prefix, std::process::id(), nanos));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn file_detail_from_parts_maps_metadata_into_dto() {
        let temp_dir = create_temp_dir("rustexplorer-test");

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

    #[test]
    fn read_file_preview_returns_text_for_small_text_file() {
        let temp_dir = create_temp_dir("rustexplorer-preview");
        let file_path = temp_dir.join("notes.txt");
        fs::write(&file_path, b"hello preview").unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Text {
                content, truncated, ..
            } => {
                assert_eq!(content, "hello preview");
                assert!(!truncated);
            }
            other => panic!("expected text payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_returns_directory_for_folder() {
        let temp_dir = create_temp_dir("rustexplorer-dir-preview");

        let payload = read_file_preview(temp_dir.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Directory { .. } => {}
            other => panic!("expected directory payload, got {:?}", other),
        }

        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_returns_binary_for_unknown_extension() {
        let temp_dir = create_temp_dir("rustexplorer-bin-preview");
        let file_path = temp_dir.join("blob.bin");
        fs::write(&file_path, [0_u8, 159, 255, 0, 88]).unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Binary { .. } => {}
            other => panic!("expected binary payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_marks_large_text_as_truncated() {
        let temp_dir = create_temp_dir("rustexplorer-text-limit");
        let file_path = temp_dir.join("long.rs");
        fs::write(&file_path, "a".repeat(2048)).unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(128)).unwrap();

        match payload {
            PreviewPayload::Text {
                truncated, content, ..
            } => {
                assert!(truncated);
                assert_eq!(content.len(), 128);
            }
            other => panic!("expected text payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_limited_text_preview_stops_after_preview_limit_plus_one() {
        struct GuardedReader {
            emitted: usize,
            fail_after: usize,
            total: usize,
        }

        impl std::io::Read for GuardedReader {
            fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
                if self.emitted >= self.fail_after {
                    panic!("reader continued past the preview limit");
                }

                if self.emitted >= self.total {
                    return Ok(0);
                }

                buf[0] = b'a';
                self.emitted += 1;
                Ok(1)
            }
        }

        let (content, truncated) = read_limited_text_preview(
            GuardedReader {
                emitted: 0,
                fail_after: 6,
                total: 2_048,
            },
            5,
        )
        .unwrap();

        assert_eq!(content, "aaaaa");
        assert!(truncated);
    }

    #[test]
    fn read_file_preview_returns_pdf_payload_for_pdf_extension() {
        let temp_dir = create_temp_dir("rustexplorer-pdf-preview");
        let file_path = temp_dir.join("sample.pdf");
        fs::write(&file_path, b"%PDF-1.4\n%").unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Pdf { path, .. } => assert!(path.ends_with("sample.pdf")),
            other => panic!("expected pdf payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_returns_audio_payload_for_audio_extension() {
        let temp_dir = create_temp_dir("rustexplorer-audio-preview");
        let file_path = temp_dir.join("tone.mp3");
        fs::write(&file_path, b"ID3mock").unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Audio { path, .. } => assert!(path.ends_with("tone.mp3")),
            other => panic!("expected audio payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_returns_video_payload_for_video_extension() {
        let temp_dir = create_temp_dir("rustexplorer-video-preview");
        let file_path = temp_dir.join("clip.mp4");
        fs::write(&file_path, b"\x00\x00\x00\x18ftypmp42").unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Video { path, .. } => assert!(path.ends_with("clip.mp4")),
            other => panic!("expected video payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_returns_image_payload_for_png_file() {
        let temp_dir = create_temp_dir("rustexplorer-image-preview");
        let file_path = temp_dir.join("pixel.png");
        let tiny_png: [u8; 67] = [
            137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0,
            0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156,
            99, 96, 0, 0, 0, 2, 0, 1, 229, 39, 212, 162, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
            96, 130,
        ];
        fs::write(&file_path, tiny_png).unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Image {
                path,
                mime_type,
                ..
            } => {
                assert!(path.ends_with("pixel.png"));
                assert!(mime_type.starts_with("image/"));
            }
            other => panic!("expected image payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_file_preview_returns_specific_mime_for_svg_images() {
        let temp_dir = create_temp_dir("rustexplorer-svg-preview");
        let file_path = temp_dir.join("vector.svg");
        fs::write(
            &file_path,
            br#"<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>"#,
        )
        .unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(1024)).unwrap();

        match payload {
            PreviewPayload::Image {
                path,
                mime_type,
                ..
            } => {
                assert_eq!(mime_type, "image/svg+xml");
                assert!(path.ends_with("vector.svg"));
            }
            other => panic!("expected image payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }
}

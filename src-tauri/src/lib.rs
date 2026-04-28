// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod app_data;
mod models;

use crate::app_data::{AppData, AppDataManager, generate_id, is_valid_hex};
use crate::models::file_detail_dto::FileDetailDTO;
use chrono::{DateTime, Utc};
use ignore::WalkBuilder;
use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    io::{self, Read},
    path::{Path, PathBuf},
    sync::{mpsc, OnceLock},
    thread,
};
use tauri::{Emitter, Manager, Window};

const EVENT_BATCH_SIZE: usize = 64;
const DEFAULT_TEXT_PREVIEW_BYTES: usize = 128 * 1024;
const MAX_CSV_PREVIEW_ROWS: usize = 1000;
const CODE_EXTS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "py", "go", "c", "h", "cpp", "cc", "cxx", "hpp",
    "java", "cs", "rb", "php", "swift", "kt", "scala", "sh", "bash", "ps1", "sql",
    "html", "htm", "css", "scss", "sass", "xml", "yaml", "yml", "toml", "dockerfile",
];
const DEFAULT_EXCLUDED_SEARCH_DIRS: &[&str] = &[
    ".cache",
    ".git",
    ".mypy_cache",
    ".next",
    ".nuxt",
    ".pytest_cache",
    ".ruff_cache",
    ".turbo",
    ".venv",
    ".vite",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "env",
    "node_modules",
    "target",
    "venv",
];

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
        reason: Option<String>,
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
    Code {
        content: String,
        language: String,
        truncated: bool,
        size_bytes: u64,
    },
    Csv {
        headers: Vec<String>,
        rows: Vec<Vec<String>>,
        truncated: bool,
        size_bytes: u64,
    },
    Json {
        content: String,
        is_array: bool,
        truncated: bool,
        size_bytes: u64,
    },
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }
            let app_data_path = app_data_dir.join("app_data.json");
            let manager = AppDataManager::load(app_data_path);
            app.manage(manager);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search_with_ignore,
            get_files,
            rename_file,
            delete_file,
            copy_file,
            move_file,
            read_file_preview,
            get_app_data,
            create_workspace,
            rename_workspace,
            change_workspace_color,
            delete_workspace,
            add_to_workspace,
            remove_from_workspace,
            create_tag,
            rename_tag,
            change_tag_color,
            delete_tag,
            add_tag_to_path,
            remove_tag_from_path
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
    let _ = validate_path_scope(&path)?;
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
            .filter_entry(should_search_entry)
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
    let _ = validate_path_scope(&path)?;
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

    let _ = validate_path_scope(&source_path)?;

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
    let _ = validate_path_scope(&target_path)?;

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

fn get_blocked_system_roots() -> &'static Vec<PathBuf> {
    static BLOCKED: OnceLock<Vec<PathBuf>> = OnceLock::new();
    BLOCKED.get_or_init(|| {
        let mut roots = Vec::new();
        if cfg!(windows) {
            let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string());
            let systemroot = std::env::var("SYSTEMROOT").unwrap_or_else(|_| "C:\\Windows".to_string());
            let candidates = [
                windir,
                systemroot,
                "C:\\Windows".to_string(),
                "C:\\Program Files".to_string(),
                "C:\\Program Files (x86)".to_string(),
                "C:\\ProgramData".to_string(),
                "C:\\Recovery".to_string(),
                "C:\\System Volume Information".to_string(),
                "C:\\PerfLogs".to_string(),
            ];
            for c in &candidates {
                if let Ok(p) = PathBuf::from(c).canonicalize() {
                    if !roots.contains(&p) {
                        roots.push(p);
                    }
                }
            }
        } else {
            let candidates = [
                "/System", "/etc", "/usr", "/bin", "/sbin", "/proc", "/sys", "/dev",
            ];
            for c in &candidates {
                if let Ok(p) = PathBuf::from(c).canonicalize() {
                    if !roots.contains(&p) {
                        roots.push(p);
                    }
                }
            }
        }
        roots
    })
}

fn validate_path_scope(path_str: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path_str);
    let canonical = if let Ok(c) = path.canonicalize() {
        c
    } else {
        let parent = path.parent()
            .ok_or_else(|| "invalid path".to_string())?;
        let canonical_parent = parent.canonicalize()
            .map_err(|_| "path does not exist or is inaccessible".to_string())?;
        if let Some(name) = path.file_name() {
            canonical_parent.join(name)
        } else {
            canonical_parent
        }
    };
    let blocked = get_blocked_system_roots();
    for blocked_path in blocked {
        if canonical.starts_with(blocked_path) {
            return Err("access denied: system directory".to_string());
        }
    }
    Ok(canonical)
}

fn validate_transfer_paths(
    source_path: &str,
    destination_dir: &str,
) -> Result<(PathBuf, PathBuf), String> {
    let source = PathBuf::from(source_path);
    let destination_dir = PathBuf::from(destination_dir);

    if !source.exists() {
        return Err("source does not exist".to_string());
    }

    if !destination_dir.exists() {
        return Err("destination directory does not exist".to_string());
    }

    if !destination_dir.is_dir() {
        return Err("destination path is not a directory".to_string());
    }

    let file_name = source
        .file_name()
        .ok_or_else(|| "source has no file name".to_string())?;
    let destination = destination_dir.join(file_name);

    if destination.exists() {
        return Err("a file or folder with that name already exists".to_string());
    }

    if source.is_dir() {
        let source = source.canonicalize().map_err(|err| err.to_string())?;
        let destination_dir = destination_dir
            .canonicalize()
            .map_err(|err| err.to_string())?;

        if destination_dir.starts_with(&source) {
            return Err("cannot transfer a directory into itself".to_string());
        }

        return Ok((source, destination));
    }

    Ok((source, destination))
}

fn copy_file_leaf(source: &Path, destination: &Path) -> Result<(), String> {
    let mut source_file = fs::File::open(source).map_err(|err| err.to_string())?;
    let mut destination_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)
        .map_err(|err| err.to_string())?;

    io::copy(&mut source_file, &mut destination_file)
        .map(|_| ())
        .map_err(|err| err.to_string())
}

fn copy_directory_recursive(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir(destination).map_err(|err| err.to_string())?;

    for entry in fs::read_dir(source).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());

        if entry.file_type().map_err(|err| err.to_string())?.is_dir() {
            copy_directory_recursive(&source_path, &destination_path)?;
        } else {
            copy_file_leaf(&source_path, &destination_path)?;
        }
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
fn copy_file(source_path: String, destination_dir: String) -> Result<(), String> {
    let _ = validate_path_scope(&source_path)?;
    let _ = validate_path_scope(&destination_dir)?;
    let (source, destination) = validate_transfer_paths(&source_path, &destination_dir)?;

    if source.is_dir() {
        copy_directory_recursive(&source, &destination)
    } else {
        copy_file_leaf(&source, &destination)
    }
}

#[tauri::command(rename_all = "snake_case")]
fn move_file(source_path: String, destination_dir: String) -> Result<(), String> {
    let _ = validate_path_scope(&source_path)?;
    let _ = validate_path_scope(&destination_dir)?;
    let (source, destination) = validate_transfer_paths(&source_path, &destination_dir)?;

    if source.is_dir() {
        copy_directory_recursive(&source, &destination)?;
        fs::remove_dir_all(source).map_err(|err| err.to_string())
    } else {
        copy_file_leaf(&source, &destination)?;
        fs::remove_file(source).map_err(|err| err.to_string())
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
    matches!(ext, "txt" | "log" | "ini" | "conf" | "cfg")
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

        if let Err(err) = std::str::from_utf8(&bytes) {
            if err.error_len().is_none() {
                bytes.truncate(err.valid_up_to());
            }
        }
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
    let _ = validate_path_scope(&path)?;

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

    let ext = target.extension().and_then(|e| e.to_str()).unwrap_or("");
    if CODE_EXTS.iter().any(|&e| e.eq_ignore_ascii_case(ext)) {
        let (content, truncated) = read_text_preview(target, preview_limit)?;
        return Ok(PreviewPayload::Code {
            language: language_from_extension(ext).to_string(),
            content,
            truncated,
            size_bytes,
        });
    }
    if ext.eq_ignore_ascii_case("csv") {
        let (content, truncated) = read_text_preview(target, preview_limit)?;
        match parse_csv_preview(&content, MAX_CSV_PREVIEW_ROWS) {
            Ok((headers, rows, csv_truncated)) => {
                return Ok(PreviewPayload::Csv { headers, rows, truncated: truncated || csv_truncated, size_bytes });
            }
            Err(_) => {
                return Ok(PreviewPayload::Text { content, extension, truncated, size_bytes, reason: Some("CSV malformed, showing as text".to_string()) });
            }
        }
    }
    if ext.eq_ignore_ascii_case("json") {
        let (content, truncated) = read_text_preview(target, preview_limit)?;
        match parse_json_preview(&content) {
            Ok((pretty, is_array)) => {
                return Ok(PreviewPayload::Json { content: pretty, is_array, truncated, size_bytes });
            }
            Err(_) => {
                return Ok(PreviewPayload::Text { content, extension, truncated, size_bytes, reason: Some("Invalid JSON, showing as text".to_string()) });
            }
        }
    }

    if extension_ref.is_some_and(is_text_extension) {
        let (content, truncated) = read_text_preview(target, preview_limit)?;

        return Ok(PreviewPayload::Text {
            content,
            extension,
            truncated,
            size_bytes,
            reason: None,
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

fn should_search_entry(entry: &ignore::DirEntry) -> bool {
    if !entry
        .file_type()
        .is_some_and(|file_type| file_type.is_dir())
    {
        return true;
    }

    let name = entry.file_name().to_string_lossy();

    !DEFAULT_EXCLUDED_SEARCH_DIRS
        .iter()
        .any(|excluded| name.eq_ignore_ascii_case(excluded))
}

fn language_from_extension(ext: &str) -> &'static str {
    if ext.eq_ignore_ascii_case("rs") { return "rust"; }
    if ext.eq_ignore_ascii_case("ts") || ext.eq_ignore_ascii_case("tsx") { return "typescript"; }
    if ext.eq_ignore_ascii_case("js") || ext.eq_ignore_ascii_case("jsx") { return "javascript"; }
    if ext.eq_ignore_ascii_case("py") { return "python"; }
    if ext.eq_ignore_ascii_case("go") { return "go"; }
    if ext.eq_ignore_ascii_case("c") || ext.eq_ignore_ascii_case("h") { return "c"; }
    if ext.eq_ignore_ascii_case("cpp") || ext.eq_ignore_ascii_case("cc") || ext.eq_ignore_ascii_case("cxx") || ext.eq_ignore_ascii_case("hpp") { return "cpp"; }
    if ext.eq_ignore_ascii_case("java") { return "java"; }
    if ext.eq_ignore_ascii_case("cs") { return "csharp"; }
    if ext.eq_ignore_ascii_case("rb") { return "ruby"; }
    if ext.eq_ignore_ascii_case("php") { return "php"; }
    if ext.eq_ignore_ascii_case("swift") { return "swift"; }
    if ext.eq_ignore_ascii_case("kt") { return "kotlin"; }
    if ext.eq_ignore_ascii_case("scala") { return "scala"; }
    if ext.eq_ignore_ascii_case("sh") || ext.eq_ignore_ascii_case("bash") { return "bash"; }
    if ext.eq_ignore_ascii_case("ps1") { return "powershell"; }
    if ext.eq_ignore_ascii_case("sql") { return "sql"; }
    if ext.eq_ignore_ascii_case("html") || ext.eq_ignore_ascii_case("htm") { return "html"; }
    if ext.eq_ignore_ascii_case("css") { return "css"; }
    if ext.eq_ignore_ascii_case("scss") || ext.eq_ignore_ascii_case("sass") { return "scss"; }
    if ext.eq_ignore_ascii_case("xml") { return "xml"; }
    if ext.eq_ignore_ascii_case("yaml") || ext.eq_ignore_ascii_case("yml") { return "yaml"; }
    if ext.eq_ignore_ascii_case("toml") { return "toml"; }
    if ext.eq_ignore_ascii_case("dockerfile") { return "dockerfile"; }
    "plaintext"
}

fn parse_csv_preview(content: &str, max_rows: usize) -> Result<(Vec<String>, Vec<Vec<String>>, bool), csv::Error> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(content.as_bytes());
    let headers = reader.headers()?
        .iter()
        .map(|s| s.to_string())
        .collect();
    let mut rows = Vec::new();
    for result in reader.records() {
        let record = result?;
        rows.push(record.iter().map(|s| s.to_string()).collect());
        if rows.len() >= max_rows {
            return Ok((headers, rows, true));
        }
    }
    Ok((headers, rows, false))
}

fn parse_json_preview(content: &str) -> Result<(String, bool), String> {
    let value: serde_json::Value = serde_json::from_str(content)
        .map_err(|e| e.to_string())?;
    let is_array = value.is_array();
    let mut buf = Vec::new();
    let formatter = serde_json::ser::PrettyFormatter::with_indent(b"  ");
    let mut ser = serde_json::Serializer::with_formatter(&mut buf, formatter);
    value.serialize(&mut ser).map_err(|e| e.to_string())?;
    let pretty = String::from_utf8(buf).map_err(|e| e.to_string())?;
    Ok((pretty, is_array))
}

#[tauri::command]
fn get_app_data(state: tauri::State<AppDataManager>) -> Result<AppData, String> {
    state.get()
}

#[tauri::command]
fn create_workspace(
    state: tauri::State<AppDataManager>,
    name: String,
    color: Option<String>,
) -> Result<AppData, String> {
    if name.trim().is_empty() {
        return Err("workspace name cannot be empty".to_string());
    }
    if let Some(ref c) = color {
        if !is_valid_hex(c) {
            return Err("color must be a valid hex color (e.g., #ff0000)".to_string());
        }
    }
    state.mutate(|data| {
        data.workspaces.push(crate::app_data::Workspace {
            id: generate_id(),
            name: name.trim().to_string(),
            color,
            paths: vec![],
        });
        Ok(())
    })
}

#[tauri::command]
fn rename_workspace(
    state: tauri::State<AppDataManager>,
    id: String,
    name: String,
) -> Result<AppData, String> {
    if name.trim().is_empty() {
        return Err("workspace name cannot be empty".to_string());
    }
    state.mutate(|data| {
        if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == id) {
            ws.name = name.trim().to_string();
            Ok(())
        } else {
            Err("workspace not found".to_string())
        }
    })
}

fn change_workspace_color_in_data(
    data: &mut AppData,
    id: &str,
    color: Option<String>,
) -> Result<(), String> {
    if let Some(ref c) = color {
        if !is_valid_hex(c) {
            return Err("color must be a valid hex color (e.g., #ff0000)".to_string());
        }
    }

    if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == id) {
        ws.color = color;
        Ok(())
    } else {
        Err("workspace not found".to_string())
    }
}

#[tauri::command]
fn change_workspace_color(
    state: tauri::State<AppDataManager>,
    id: String,
    color: Option<String>,
) -> Result<AppData, String> {
    state.mutate(|data| change_workspace_color_in_data(data, &id, color))
}

#[tauri::command]
fn delete_workspace(state: tauri::State<AppDataManager>, id: String) -> Result<AppData, String> {
    state.mutate(|data| {
        data.workspaces.retain(|w| w.id != id);
        Ok(())
    })
}

#[tauri::command]
fn add_to_workspace(
    state: tauri::State<AppDataManager>,
    workspace_id: String,
    path: String,
) -> Result<AppData, String> {
    state.mutate(|data| {
        if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == workspace_id) {
            if !ws.paths.contains(&path) {
                ws.paths.push(path);
            }
            Ok(())
        } else {
            Err("workspace not found".to_string())
        }
    })
}

#[tauri::command]
fn remove_from_workspace(
    state: tauri::State<AppDataManager>,
    workspace_id: String,
    path: String,
) -> Result<AppData, String> {
    state.mutate(|data| {
        if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == workspace_id) {
            ws.paths.retain(|p| p != &path);
            Ok(())
        } else {
            Err("workspace not found".to_string())
        }
    })
}

#[tauri::command]
fn create_tag(
    state: tauri::State<AppDataManager>,
    name: String,
    color: String,
) -> Result<AppData, String> {
    if name.trim().is_empty() {
        return Err("tag name cannot be empty".to_string());
    }
    if !is_valid_hex(&color) {
        return Err("color must be a valid hex color (e.g., #ff0000)".to_string());
    }
    state.mutate(|data| {
        data.tags.push(crate::app_data::Tag {
            id: generate_id(),
            name: name.trim().to_string(),
            color,
        });
        Ok(())
    })
}

#[tauri::command]
fn rename_tag(
    state: tauri::State<AppDataManager>,
    id: String,
    name: String,
) -> Result<AppData, String> {
    if name.trim().is_empty() {
        return Err("tag name cannot be empty".to_string());
    }
    state.mutate(|data| {
        if let Some(tag) = data.tags.iter_mut().find(|t| t.id == id) {
            tag.name = name.trim().to_string();
            Ok(())
        } else {
            Err("tag not found".to_string())
        }
    })
}

#[tauri::command]
fn change_tag_color(
    state: tauri::State<AppDataManager>,
    id: String,
    color: String,
) -> Result<AppData, String> {
    if !is_valid_hex(&color) {
        return Err("color must be a valid hex color (e.g., #ff0000)".to_string());
    }
    state.mutate(|data| {
        if let Some(tag) = data.tags.iter_mut().find(|t| t.id == id) {
            tag.color = color;
            Ok(())
        } else {
            Err("tag not found".to_string())
        }
    })
}

#[tauri::command]
fn delete_tag(state: tauri::State<AppDataManager>, id: String) -> Result<AppData, String> {
    state.mutate(|data| {
        data.tags.retain(|t| t.id != id);
        for tags in data.path_tags.values_mut() {
            tags.retain(|t| t != &id);
        }
        data.path_tags.retain(|_, tags| !tags.is_empty());
        Ok(())
    })
}

#[tauri::command]
fn add_tag_to_path(
    state: tauri::State<AppDataManager>,
    tag_id: String,
    path: String,
) -> Result<AppData, String> {
    state.mutate(|data| {
        let tags = data.path_tags.entry(path).or_default();
        if !tags.contains(&tag_id) {
            tags.push(tag_id);
        }
        Ok(())
    })
}

#[tauri::command]
fn remove_tag_from_path(
    state: tauri::State<AppDataManager>,
    tag_id: String,
    path: String,
) -> Result<AppData, String> {
    state.mutate(|data| {
        if let Some(tags) = data.path_tags.get_mut(&path) {
            tags.retain(|t| t != &tag_id);
            if tags.is_empty() {
                data.path_tags.remove(&path);
            }
        }
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDir {
        path: PathBuf,
    }

    impl TempDir {
        fn join(&self, path: impl AsRef<Path>) -> PathBuf {
            self.path.join(path)
        }
    }

    impl AsRef<Path> for TempDir {
        fn as_ref(&self) -> &Path {
            &self.path
        }
    }

    impl std::ops::Deref for TempDir {
        type Target = Path;

        fn deref(&self) -> &Self::Target {
            &self.path
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn create_temp_dir(prefix: &str) -> TempDir {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir =
            std::env::temp_dir().join(format!("{}-{}-{}", prefix, std::process::id(), nanos));
        fs::create_dir_all(&dir).unwrap();
        TempDir { path: dir }
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
    fn copy_file_copies_file_into_destination_directory() {
        let source_dir = create_temp_dir("rustexplorer-copy-source");
        let destination_dir = create_temp_dir("rustexplorer-copy-destination");
        let source_path = source_dir.join("notes.txt");
        let destination_path = destination_dir.join("notes.txt");
        fs::write(&source_path, b"copy me").unwrap();

        copy_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        )
        .unwrap();

        assert_eq!(fs::read(&source_path).unwrap(), b"copy me");
        assert_eq!(fs::read(&destination_path).unwrap(), b"copy me");

        fs::remove_file(&source_path).unwrap();
        fs::remove_file(&destination_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn move_file_moves_file_into_destination_directory() {
        let source_dir = create_temp_dir("rustexplorer-move-source");
        let destination_dir = create_temp_dir("rustexplorer-move-destination");
        let source_path = source_dir.join("notes.txt");
        let destination_path = destination_dir.join("notes.txt");
        fs::write(&source_path, b"move me").unwrap();

        move_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        )
        .unwrap();

        assert!(!source_path.exists());
        assert_eq!(fs::read(&destination_path).unwrap(), b"move me");

        fs::remove_file(&destination_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn move_file_moves_directory_into_destination_directory() {
        let source_parent = create_temp_dir("rustexplorer-move-dir-source");
        let destination_dir = create_temp_dir("rustexplorer-move-dir-destination");
        let source_path = source_parent.join("project");
        let nested_dir = source_path.join("src");
        let nested_file = nested_dir.join("main.rs");
        fs::create_dir_all(&nested_dir).unwrap();
        fs::write(&nested_file, b"fn main() {}").unwrap();

        move_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        )
        .unwrap();

        let moved_file = destination_dir.join("project").join("src").join("main.rs");
        assert!(!source_path.exists());
        assert_eq!(fs::read(&moved_file).unwrap(), b"fn main() {}");

        fs::remove_dir_all(destination_dir.join("project")).unwrap();
        fs::remove_dir(&source_parent).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn copy_file_rejects_duplicate_destination_without_overwriting() {
        let source_dir = create_temp_dir("rustexplorer-copy-duplicate-source");
        let destination_dir = create_temp_dir("rustexplorer-copy-duplicate-destination");
        let source_path = source_dir.join("notes.txt");
        let destination_path = destination_dir.join("notes.txt");
        fs::write(&source_path, b"new content").unwrap();
        fs::write(&destination_path, b"existing content").unwrap();

        let result = copy_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert_eq!(fs::read(&destination_path).unwrap(), b"existing content");

        fs::remove_file(&source_path).unwrap();
        fs::remove_file(&destination_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn copy_file_rejects_invalid_source_path() {
        let destination_dir = create_temp_dir("rustexplorer-copy-invalid-source");
        let source_path = destination_dir.join("missing.txt");

        let result = copy_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert!(!destination_dir.join("missing.txt").exists());

        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn copy_file_rejects_missing_destination_directory() {
        let source_dir = create_temp_dir("rustexplorer-copy-missing-destination-source");
        let source_path = source_dir.join("notes.txt");
        let destination_dir = source_dir.join("missing-destination");
        fs::write(&source_path, b"copy me").unwrap();

        let result = copy_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert!(!destination_dir.exists());

        fs::remove_file(&source_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
    }

    #[test]
    fn copy_file_rejects_destination_path_that_is_not_directory() {
        let source_dir = create_temp_dir("rustexplorer-copy-file-destination-source");
        let destination_dir = create_temp_dir("rustexplorer-copy-file-destination");
        let source_path = source_dir.join("notes.txt");
        let destination_path = destination_dir.join("target.txt");
        fs::write(&source_path, b"copy me").unwrap();
        fs::write(&destination_path, b"not a directory").unwrap();

        let result = copy_file(
            source_path.to_string_lossy().to_string(),
            destination_path.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert_eq!(fs::read(&destination_path).unwrap(), b"not a directory");

        fs::remove_file(&source_path).unwrap();
        fs::remove_file(&destination_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn copy_file_copies_directory_recursively() {
        let source_parent = create_temp_dir("rustexplorer-copy-dir-source");
        let destination_dir = create_temp_dir("rustexplorer-copy-dir-destination");
        let source_path = source_parent.join("project");
        let nested_dir = source_path.join("src");
        let nested_file = nested_dir.join("main.rs");
        fs::create_dir_all(&nested_dir).unwrap();
        fs::write(&nested_file, b"fn main() {}").unwrap();

        copy_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        )
        .unwrap();

        let copied_file = destination_dir.join("project").join("src").join("main.rs");
        assert_eq!(fs::read(&nested_file).unwrap(), b"fn main() {}");
        assert_eq!(fs::read(&copied_file).unwrap(), b"fn main() {}");

        fs::remove_dir_all(&source_path).unwrap();
        fs::remove_dir_all(destination_dir.join("project")).unwrap();
        fs::remove_dir(&source_parent).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn copy_file_rejects_directory_copy_into_descendant() {
        let source_parent = create_temp_dir("rustexplorer-copy-dir-descendant-source");
        let source_path = source_parent.join("project");
        let destination_dir = source_path.join("backup");
        fs::create_dir_all(&destination_dir).unwrap();
        fs::write(source_path.join("notes.txt"), b"copy me").unwrap();

        let result = copy_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert_eq!(
            result,
            Err("cannot transfer a directory into itself".to_string())
        );
        assert!(!destination_dir.join("project").exists());
    }

    #[test]
    fn move_file_rejects_duplicate_destination_without_overwriting() {
        let source_dir = create_temp_dir("rustexplorer-move-duplicate-source");
        let destination_dir = create_temp_dir("rustexplorer-move-duplicate-destination");
        let source_path = source_dir.join("notes.txt");
        let destination_path = destination_dir.join("notes.txt");
        fs::write(&source_path, b"new content").unwrap();
        fs::write(&destination_path, b"existing content").unwrap();

        let result = move_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert_eq!(fs::read(&source_path).unwrap(), b"new content");
        assert_eq!(fs::read(&destination_path).unwrap(), b"existing content");

        fs::remove_file(&source_path).unwrap();
        fs::remove_file(&destination_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn move_file_rejects_invalid_source_path() {
        let destination_dir = create_temp_dir("rustexplorer-move-invalid-source");
        let source_path = destination_dir.join("missing.txt");

        let result = move_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert!(!destination_dir.join("missing.txt").exists());

        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn move_file_rejects_missing_destination_directory() {
        let source_dir = create_temp_dir("rustexplorer-move-missing-destination-source");
        let source_path = source_dir.join("notes.txt");
        let destination_dir = source_dir.join("missing-destination");
        fs::write(&source_path, b"move me").unwrap();

        let result = move_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert_eq!(fs::read(&source_path).unwrap(), b"move me");
        assert!(!destination_dir.exists());

        fs::remove_file(&source_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
    }

    #[test]
    fn move_file_rejects_destination_path_that_is_not_directory() {
        let source_dir = create_temp_dir("rustexplorer-move-file-destination-source");
        let destination_dir = create_temp_dir("rustexplorer-move-file-destination");
        let source_path = source_dir.join("notes.txt");
        let destination_path = destination_dir.join("target.txt");
        fs::write(&source_path, b"move me").unwrap();
        fs::write(&destination_path, b"not a directory").unwrap();

        let result = move_file(
            source_path.to_string_lossy().to_string(),
            destination_path.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
        assert_eq!(fs::read(&source_path).unwrap(), b"move me");
        assert_eq!(fs::read(&destination_path).unwrap(), b"not a directory");

        fs::remove_file(&source_path).unwrap();
        fs::remove_file(&destination_path).unwrap();
        fs::remove_dir(&source_dir).unwrap();
        fs::remove_dir(&destination_dir).unwrap();
    }

    #[test]
    fn move_file_rejects_directory_move_into_descendant() {
        let source_parent = create_temp_dir("rustexplorer-move-dir-descendant-source");
        let source_path = source_parent.join("project");
        let destination_dir = source_path.join("backup");
        fs::create_dir_all(&destination_dir).unwrap();
        fs::write(source_path.join("notes.txt"), b"move me").unwrap();

        let result = move_file(
            source_path.to_string_lossy().to_string(),
            destination_dir.to_string_lossy().to_string(),
        );

        assert_eq!(
            result,
            Err("cannot transfer a directory into itself".to_string())
        );
        assert!(source_path.exists());
        assert!(!destination_dir.join("project").exists());
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
    fn read_file_preview_marks_large_code_as_truncated() {
        let temp_dir = create_temp_dir("rustexplorer-text-limit");
        let file_path = temp_dir.join("long.rs");
        fs::write(&file_path, "a".repeat(2048)).unwrap();

        let payload = read_file_preview(file_path.to_string_lossy().to_string(), Some(128)).unwrap();

        match payload {
            PreviewPayload::Code {
                truncated, content, ..
            } => {
                assert!(truncated);
                assert_eq!(content.len(), 128);
            }
            other => panic!("expected code payload, got {:?}", other),
        }

        fs::remove_file(&file_path).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    #[test]
    fn read_limited_text_preview_truncates_at_utf8_boundary() {
        let bytes = [b'a', 0xc3, 0xa1];
        let (content, truncated) = read_limited_text_preview(bytes.as_slice(), 2).unwrap();

        assert_eq!(content, "a");
        assert!(truncated);
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

    #[test]
    fn should_search_entry_skips_default_excluded_directories() {
        let temp_dir = create_temp_dir("rustexplorer-search-exclude");
        let node_modules_dir = temp_dir.join("node_modules");
        let src_dir = temp_dir.join("src");
        fs::create_dir(&node_modules_dir).unwrap();
        fs::create_dir(&src_dir).unwrap();

        let entries: Vec<_> = ignore::WalkBuilder::new(&temp_dir)
            .max_depth(Some(1))
            .build()
            .filter_map(Result::ok)
            .collect();
        let node_modules_entry = entries
            .iter()
            .find(|entry| entry.path() == node_modules_dir)
            .unwrap();
        let src_entry = entries.iter().find(|entry| entry.path() == src_dir).unwrap();

        assert!(!should_search_entry(node_modules_entry));
        assert!(should_search_entry(src_entry));

        fs::remove_dir(&src_dir).unwrap();
        fs::remove_dir(&node_modules_dir).unwrap();
        fs::remove_dir(&temp_dir).unwrap();
    }

    mod preview_tests {
        use super::*;

        #[test]
        fn language_from_extension_maps_rs_to_rust() {
            assert_eq!(language_from_extension("rs"), "rust");
        }

        #[test]
        fn language_from_extension_maps_ts_to_typescript() {
            assert_eq!(language_from_extension("ts"), "typescript");
            assert_eq!(language_from_extension("tsx"), "typescript");
        }

        #[test]
        fn language_from_extension_maps_unknown_to_plaintext() {
            assert_eq!(language_from_extension("xyz"), "plaintext");
        }

        #[test]
        fn parse_csv_preview_parses_headers_and_rows() {
            let csv = "name,age\nAlice,30\nBob,25";
            let (headers, rows, truncated) = parse_csv_preview(csv, MAX_CSV_PREVIEW_ROWS).unwrap();
            assert_eq!(headers, vec!["name", "age"]);
            assert_eq!(rows, vec![vec!["Alice", "30"], vec!["Bob", "25"]]);
            assert!(!truncated);
        }

        #[test]
        fn parse_csv_preview_limits_to_max_rows() {
            let csv = "h1,h2\na,b\nc,d\ne,f";
            let (headers, rows, truncated) = parse_csv_preview(csv, 2).unwrap();
            assert_eq!(headers, vec!["h1", "h2"]);
            assert_eq!(rows.len(), 2);
            assert!(truncated);
        }

        #[test]
        fn parse_csv_preview_returns_err_for_malformed_csv() {
            let csv = "a,b\n\"unclosed";
            assert!(parse_csv_preview(csv, MAX_CSV_PREVIEW_ROWS).is_err());
        }

        #[test]
        fn parse_json_preview_pretty_prints_and_detects_object() {
            let json = r#"{"name":"Alice","age":30}"#;
            let (pretty, is_array) = parse_json_preview(json).unwrap();
            assert!(pretty.contains("\"name\""));
            assert!(pretty.contains("\n  \"")); // 2-space indent
            assert!(!pretty.contains("\n    \"")); // not 4-space indent
            assert!(!is_array);
        }

        #[test]
        fn parse_json_preview_pretty_prints_and_detects_array() {
            let json = r#"[1,2,3]"#;
            let (pretty, is_array) = parse_json_preview(json).unwrap();
            assert!(pretty.contains("1"));
            assert!(is_array);
        }

        #[test]
        fn parse_json_preview_returns_err_for_invalid_json() {
            let json = "not json";
            assert!(parse_json_preview(json).is_err());
        }

        #[test]
        fn read_file_preview_returns_code_for_rust_extension() {
            use std::io::Write;
            let mut temp = tempfile::NamedTempFile::with_suffix(".rs").unwrap();
            write!(temp, "fn main() {{}}").unwrap();
            let payload = read_file_preview(temp.path().to_str().unwrap().to_string(), Some(128 * 1024)).unwrap();
            match payload {
                PreviewPayload::Code { language, .. } => assert_eq!(language, "rust"),
                other => panic!("Expected Code payload, got {:?}", other),
            }
        }

        #[test]
        fn read_file_preview_returns_csv_for_csv_extension() {
            use std::io::Write;
            let mut temp = tempfile::NamedTempFile::with_suffix(".csv").unwrap();
            write!(temp, "a,b\n1,2").unwrap();
            let payload = read_file_preview(temp.path().to_str().unwrap().to_string(), Some(128 * 1024)).unwrap();
            match payload {
                PreviewPayload::Csv { headers, rows, .. } => {
                    assert_eq!(headers, vec!["a", "b"]);
                    assert_eq!(rows, vec![vec!["1", "2"]]);
                }
                other => panic!("Expected Csv payload, got {:?}", other),
            }
        }

        #[test]
        fn read_file_preview_returns_json_for_json_extension() {
            use std::io::Write;
            let mut temp = tempfile::NamedTempFile::with_suffix(".json").unwrap();
            write!(temp, r#"{{"key": "value"}}"#).unwrap();
            let payload = read_file_preview(temp.path().to_str().unwrap().to_string(), Some(128 * 1024)).unwrap();
            match payload {
                PreviewPayload::Json { is_array, .. } => assert!(!is_array),
                other => panic!("Expected Json payload, got {:?}", other),
            }
        }

        #[test]
        fn read_file_preview_returns_csv_fallback_for_malformed_csv() {
            use std::io::Write;
            let mut temp = tempfile::NamedTempFile::with_suffix(".csv").unwrap();
            write!(temp, "a,b\n\"unclosed").unwrap();
            let payload = read_file_preview(temp.path().to_str().unwrap().to_string(), Some(128 * 1024)).unwrap();
            match payload {
                PreviewPayload::Text { reason, .. } => {
                    assert_eq!(reason, Some("CSV malformed, showing as text".to_string()));
                }
                other => panic!("Expected Text fallback, got {:?}", other),
            }
        }

        #[test]
        fn read_file_preview_returns_json_fallback_for_invalid_json() {
            use std::io::Write;
            let mut temp = tempfile::NamedTempFile::with_suffix(".json").unwrap();
            write!(temp, "not json").unwrap();
            let payload = read_file_preview(temp.path().to_str().unwrap().to_string(), Some(128 * 1024)).unwrap();
            match payload {
                PreviewPayload::Text { reason, .. } => {
                    assert_eq!(reason, Some("Invalid JSON, showing as text".to_string()));
                }
                other => panic!("Expected Text fallback, got {:?}", other),
            }
        }
    }

    #[test]
    fn test_change_workspace_color_updates_existing_workspace() {
        let mut data = AppData::default();
        data.workspaces.push(crate::app_data::Workspace {
            id: "ws1".to_string(),
            name: "Project Alpha".to_string(),
            color: Some("#ff0000".to_string()),
            paths: vec![],
        });

        let result = change_workspace_color_in_data(&mut data, "ws1", Some("#00ff00".to_string()));

        assert!(result.is_ok());
        assert_eq!(data.workspaces[0].color.as_deref(), Some("#00ff00"));
    }

    #[test]
    fn test_change_workspace_color_rejects_invalid_hex() {
        let mut data = AppData::default();
        data.workspaces.push(crate::app_data::Workspace {
            id: "ws1".to_string(),
            name: "Project Alpha".to_string(),
            color: None,
            paths: vec![],
        });

        let result = change_workspace_color_in_data(&mut data, "ws1", Some("blue".to_string()));

        assert_eq!(
            result.unwrap_err(),
            "color must be a valid hex color (e.g., #ff0000)"
        );
    }

    #[test]
    fn test_change_workspace_color_clears_color_with_none() {
        let mut data = AppData::default();
        data.workspaces.push(crate::app_data::Workspace {
            id: "ws1".to_string(),
            name: "Project Alpha".to_string(),
            color: Some("#ff0000".to_string()),
            paths: vec![],
        });

        let result = change_workspace_color_in_data(&mut data, "ws1", None);

        assert!(result.is_ok());
        assert_eq!(data.workspaces[0].color, None);
    }

    #[test]
    fn test_change_workspace_color_rejects_missing_workspace() {
        let mut data = AppData::default();

        let result = change_workspace_color_in_data(&mut data, "nonexistent", Some("#ff0000".to_string()));

        assert_eq!(
            result.unwrap_err(),
            "workspace not found"
        );
    }

    #[test]
    fn test_change_workspace_color_accepts_uppercase_hex() {
        let mut data = AppData::default();
        data.workspaces.push(crate::app_data::Workspace {
            id: "ws1".to_string(),
            name: "Project Alpha".to_string(),
            color: None,
            paths: vec![],
        });

        let result = change_workspace_color_in_data(&mut data, "ws1", Some("#FF0000".to_string()));

        assert!(result.is_ok());
        assert_eq!(data.workspaces[0].color.as_deref(), Some("#FF0000"));
    }
}

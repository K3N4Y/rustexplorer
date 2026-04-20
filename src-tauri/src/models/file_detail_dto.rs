use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileDetailDTO {
    pub name: String,
    pub path: PathBuf,
    pub size: u64,                    // tamaño en bytes
    pub modified: Option<String>,      // ISO 8601 timestamp
}

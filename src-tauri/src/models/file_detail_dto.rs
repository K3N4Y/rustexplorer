use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize, Clone, Debug)]
pub struct FileDetailDTO {
    pub name: String,
    pub path: PathBuf,
    pub size: u64,               // tamano en bytes
    pub modified: Option<String>, // ISO 8601 timestamp
    pub is_dir: bool,
}

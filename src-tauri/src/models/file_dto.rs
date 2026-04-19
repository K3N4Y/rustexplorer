use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileDTO {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub size: u64,
}
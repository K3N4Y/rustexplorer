use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::Mutex,
};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub paths: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct AppData {
    pub workspaces: Vec<Workspace>,
    pub tags: Vec<Tag>,
    pub path_tags: HashMap<String, Vec<String>>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            workspaces: Vec::new(),
            tags: Vec::new(),
            path_tags: HashMap::new(),
        }
    }
}

pub struct AppDataManager {
    data: Mutex<AppData>,
    path: PathBuf,
}

impl AppDataManager {
    pub fn load(path: PathBuf) -> Self {
        let data = if path.exists() {
            match fs::read_to_string(&path) {
                Ok(contents) => match serde_json::from_str::<AppData>(&contents) {
                    Ok(data) => data,
                    Err(_) => AppData::default(),
                },
                Err(_) => AppData::default(),
            }
        } else {
            AppData::default()
        };

        Self {
            data: Mutex::new(data),
            path,
        }
    }

    pub fn get(&self) -> AppData {
        self.data.lock().unwrap().clone()
    }

    pub fn mutate<F>(&self, mutation: F) -> Result<AppData, String>
    where
        F: FnOnce(&mut AppData),
    {
        let mut data = self.data.lock().map_err(|_| "lock poisoned".to_string())?;
        mutation(&mut data);
        let json = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())?;
        Ok(data.clone())
    }
}

pub fn is_valid_hex(color: &str) -> bool {
    if !color.starts_with('#') || color.len() != 7 {
        return false;
    }
    color[1..].chars().all(|c| c.is_ascii_hexdigit())
}

pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_load_save_roundtrip() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("app_data.json");

        let manager = AppDataManager::load(path.clone());
        assert_eq!(manager.get().workspaces.len(), 0);

        manager
            .mutate(|data| {
                data.workspaces.push(Workspace {
                    id: "ws-1".to_string(),
                    name: "Test Workspace".to_string(),
                    color: Some("#ff0000".to_string()),
                    paths: vec!["/test/path".to_string()],
                });
            })
            .unwrap();

        let manager2 = AppDataManager::load(path);
        let data = manager2.get();
        assert_eq!(data.workspaces.len(), 1);
        assert_eq!(data.workspaces[0].name, "Test Workspace");
    }

    #[test]
    fn test_create_and_rename_workspace() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("app_data.json");
        let manager = AppDataManager::load(path);

        manager
            .mutate(|data| {
                data.workspaces.push(Workspace {
                    id: "ws-1".to_string(),
                    name: "Original".to_string(),
                    color: None,
                    paths: vec![],
                });
            })
            .unwrap();

        manager
            .mutate(|data| {
                if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == "ws-1") {
                    ws.name = "Renamed".to_string();
                }
            })
            .unwrap();

        let data = manager.get();
        assert_eq!(data.workspaces[0].name, "Renamed");
    }

    #[test]
    fn test_add_remove_path_from_workspace() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("app_data.json");
        let manager = AppDataManager::load(path);

        manager
            .mutate(|data| {
                data.workspaces.push(Workspace {
                    id: "ws-1".to_string(),
                    name: "Test".to_string(),
                    color: None,
                    paths: vec![],
                });
            })
            .unwrap();

        // Add path
        manager
            .mutate(|data| {
                if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == "ws-1") {
                    if !ws.paths.contains(&"/test/path".to_string()) {
                        ws.paths.push("/test/path".to_string());
                    }
                }
            })
            .unwrap();

        // Try to add duplicate - should be idempotent
        manager
            .mutate(|data| {
                if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == "ws-1") {
                    if !ws.paths.contains(&"/test/path".to_string()) {
                        ws.paths.push("/test/path".to_string());
                    }
                }
            })
            .unwrap();

        let data = manager.get();
        assert_eq!(data.workspaces[0].paths.len(), 1);

        // Remove path
        manager
            .mutate(|data| {
                if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == "ws-1") {
                    ws.paths.retain(|p| p != "/test/path");
                }
            })
            .unwrap();

        let data = manager.get();
        assert!(data.workspaces[0].paths.is_empty());
    }

    #[test]
    fn test_tag_lifecycle() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("app_data.json");
        let manager = AppDataManager::load(path);

        // Create tag
        manager
            .mutate(|data| {
                data.tags.push(Tag {
                    id: "tag-1".to_string(),
                    name: "Important".to_string(),
                    color: "#ff0000".to_string(),
                });
            })
            .unwrap();

        // Assign to path
        manager
            .mutate(|data| {
                data.path_tags
                    .entry("/test/file.txt".to_string())
                    .or_default()
                    .push("tag-1".to_string());
            })
            .unwrap();

        let data = manager.get();
        assert_eq!(data.path_tags.get("/test/file.txt").unwrap().len(), 1);

        // Delete tag
        manager
            .mutate(|data| {
                data.tags.retain(|t| t.id != "tag-1");
                for tags in data.path_tags.values_mut() {
                    tags.retain(|t| t != "tag-1");
                }
                data.path_tags.retain(|_, tags| !tags.is_empty());
            })
            .unwrap();

        let data = manager.get();
        assert!(data.tags.is_empty());
        assert!(!data.path_tags.contains_key("/test/file.txt"));
    }

    #[test]
    fn test_corrupt_file_returns_empty() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("app_data.json");
        fs::write(&path, "this is not valid json").unwrap();

        let manager = AppDataManager::load(path);
        let data = manager.get();
        assert!(data.workspaces.is_empty());
        assert!(data.tags.is_empty());
        assert!(data.path_tags.is_empty());
    }

    #[test]
    fn test_concurrent_mutations() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("app_data.json");
        let manager = Arc::new(AppDataManager::load(path));

        let mut handles = vec![];
        for i in 0..10 {
            let manager = Arc::clone(&manager);
            let handle = thread::spawn(move || {
                manager
                    .mutate(|data| {
                        data.workspaces.push(Workspace {
                            id: format!("ws-{}", i),
                            name: format!("Workspace {}", i),
                            color: None,
                            paths: vec![],
                        });
                    })
                    .unwrap();
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let data = manager.get();
        assert_eq!(data.workspaces.len(), 10);
    }

    #[test]
    fn test_is_valid_hex() {
        assert!(super::is_valid_hex("#ff0000"));
        assert!(super::is_valid_hex("#FF00AA"));
        assert!(!super::is_valid_hex("ff0000"));
        assert!(!super::is_valid_hex("#ff000"));
        assert!(!super::is_valid_hex("#ff00000"));
        assert!(!super::is_valid_hex("#gg0000"));
    }
}

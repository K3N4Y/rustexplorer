// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod models;

use crate::models::file_dto::FileDTO;
use ignore::WalkBuilder;
use std::sync::mpsc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![buscar_con_ignore])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn buscar_con_ignore(patron: &str) -> Vec<FileDTO> {
    let (tx, rx) = mpsc::channel(); // Canal para comunicar hilos
    let buscador = WalkBuilder::new("./").build_parallel(); // Carga todos los núcleos

    buscador.run(|| {
        let tx = tx.clone();
        let patron = patron.to_string();
        
        Box::new(move |result| {
            if let Ok(entry) = result {
                let nombre = entry.file_name().to_string_lossy();
                
                // Aplicamos el filtro de búsqueda
                if nombre.contains(&patron) {
                    let info = FileDTO {
                        name: nombre.to_string(),
                        path: entry.path().to_path_buf(),
                    };
                    tx.send(info).unwrap();
                }
            }
            ignore::WalkState::Continue
        })
    });

    drop(tx); // Cerramos el transmisor original para que el receptor sepa que terminamos
    rx.into_iter().collect() // Convertimos los mensajes recibidos en un Vec
}

        
    
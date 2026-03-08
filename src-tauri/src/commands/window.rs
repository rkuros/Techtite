use crate::models::editor::WindowState;

#[tauri::command]
pub fn save_state(
    _app_handle: tauri::AppHandle,
    state: WindowState,
) -> Result<(), String> {
    // Save window state using tauri-plugin-store
    let json = serde_json::to_string(&state).map_err(|e| e.to_string())?;
    // Store in app data directory
    let app_data = dirs_next::data_dir()
        .ok_or("Could not determine app data directory")?
        .join("com.miyanorococo.techtite");
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
    std::fs::write(app_data.join("window_state.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_state() -> Result<Option<WindowState>, String> {
    let app_data = dirs_next::data_dir()
        .ok_or("Could not determine app data directory")?
        .join("com.miyanorococo.techtite");
    let path = app_data.join("window_state.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let state: WindowState = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(state))
}

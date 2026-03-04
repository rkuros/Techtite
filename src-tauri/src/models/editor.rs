use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
    pub pane_layout: PaneLayout,
    pub open_tabs: Vec<TabState>,
    pub sidebar_width: u32,
    pub terminal_height: u32,
    pub active_sidebar_panel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaneLayout {
    pub direction: SplitDirection,
    pub sizes: Vec<f64>,
    pub children: Vec<PaneNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PaneNode {
    Leaf { tab_group_id: String },
    Split { layout: PaneLayout },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SplitDirection {
    Horizontal,
    Vertical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabState {
    pub id: String,
    pub file_path: String,
    pub is_dirty: bool,
    pub scroll_position: u32,
    pub cursor_line: u32,
    pub cursor_column: u32,
    pub view_mode: ViewMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ViewMode {
    LivePreview,
    Source,
    ReadOnly,
}

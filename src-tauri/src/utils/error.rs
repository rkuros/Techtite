use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum TechtiteError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Path outside vault: {0}")]
    PathOutsideVault(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Vault not open")]
    VaultNotOpen,

    #[error("Vault already open")]
    VaultAlreadyOpen,

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("{0}")]
    Other(String),
}

// Implement Serialize for Tauri IPC error responses
impl Serialize for TechtiteError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// Convert to String for Tauri command error type
impl From<TechtiteError> for String {
    fn from(err: TechtiteError) -> Self {
        err.to_string()
    }
}

use regex::Regex;
use serde::{Deserialize, Serialize};

/// A rule describing how to detect and mask sensitive data.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaskingRule {
    pub name: String,
    pub pattern: String,
    pub replacement: String,
    pub priority: u32,
    pub is_builtin: bool,
}

/// A compiled masking rule ready for application.
struct CompiledRule {
    #[allow(dead_code)]
    name: String,
    regex: Regex,
    replacement: String,
    priority: u32,
}

/// Service that applies regex-based masking rules to redact sensitive data.
///
/// Initialized with built-in rules for common secret patterns (API keys,
/// Bearer tokens, AWS keys, etc.). Rules are applied in priority order
/// (lower number = applied first).
pub struct MaskingService {
    rules: Vec<CompiledRule>,
}

impl MaskingService {
    /// Create a new MaskingService with default built-in rules.
    pub fn new() -> Self {
        let default_rules = vec![
            MaskingRule {
                name: "API Key (generic)".to_string(),
                pattern: r#"(?i)(api[_-]?key\s*[:=]\s*)['"]?([a-zA-Z0-9\-_]{20,})['"]?"#.to_string(),
                replacement: "${1}[REDACTED]".to_string(),
                priority: 10,
                is_builtin: true,
            },
            MaskingRule {
                name: "Bearer Token".to_string(),
                pattern: r#"(?i)(Bearer\s+)[a-zA-Z0-9\-_\.]+"#.to_string(),
                replacement: "${1}[REDACTED]".to_string(),
                priority: 20,
                is_builtin: true,
            },
            MaskingRule {
                name: "GitHub PAT".to_string(),
                pattern: r"(ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36,}".to_string(),
                replacement: "[REDACTED_GH_TOKEN]".to_string(),
                priority: 30,
                is_builtin: true,
            },
            MaskingRule {
                name: "AWS Access Key".to_string(),
                pattern: r#"(?i)(aws_?(?:access_?key|secret)[_\s]*[:=]\s*)['"]?([A-Za-z0-9/+=]{20,})['"]?"#.to_string(),
                replacement: "${1}[REDACTED]".to_string(),
                priority: 40,
                is_builtin: true,
            },
            MaskingRule {
                name: "AWS Key ID".to_string(),
                pattern: r"AKIA[0-9A-Z]{16}".to_string(),
                replacement: "[REDACTED_AWS_KEY]".to_string(),
                priority: 41,
                is_builtin: true,
            },
            MaskingRule {
                name: "Password field".to_string(),
                pattern: r#"(?i)(password\s*[:=]\s*)['"]?([^\s'"]+)['"]?"#.to_string(),
                replacement: "${1}[REDACTED]".to_string(),
                priority: 50,
                is_builtin: true,
            },
            MaskingRule {
                name: "URL embedded token".to_string(),
                pattern: r"(https?://[^:]+:)[^@\s]+(@)".to_string(),
                replacement: "${1}[REDACTED]${2}".to_string(),
                priority: 60,
                is_builtin: true,
            },
            MaskingRule {
                name: ".env secret value".to_string(),
                pattern: r#"(?m)(^[A-Z_]+=)['"]?([^\s'"]{8,})['"]?\s*$"#.to_string(),
                replacement: "${1}[REDACTED]".to_string(),
                priority: 70,
                is_builtin: true,
            },
        ];

        let mut compiled: Vec<CompiledRule> = default_rules
            .into_iter()
            .filter_map(|rule| {
                Regex::new(&rule.pattern).ok().map(|regex| CompiledRule {
                    name: rule.name,
                    regex,
                    replacement: rule.replacement,
                    priority: rule.priority,
                })
            })
            .collect();

        // Sort by priority (lower = applied first)
        compiled.sort_by_key(|r| r.priority);

        Self { rules: compiled }
    }

    /// Apply all masking rules to the input string.
    ///
    /// Rules are applied in priority order. Each rule processes the output
    /// of the previous rule, so higher-priority rules take precedence.
    pub fn mask(&self, input: &str) -> String {
        let mut result = input.to_string();
        for rule in &self.rules {
            result = rule.regex.replace_all(&result, &*rule.replacement).to_string();
        }
        result
    }
}

impl Default for MaskingService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn svc() -> MaskingService {
        MaskingService::new()
    }

    #[test]
    fn test_mask_api_key() {
        let s = svc();
        let input = r#"api_key = "sk-abc123def456ghi789jkl012mno345""#;
        let masked = s.mask(input);
        assert!(masked.contains("[REDACTED]"));
        assert!(!masked.contains("sk-abc123def456ghi789jkl012mno345"));
    }

    #[test]
    fn test_mask_bearer_token() {
        let s = svc();
        let input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def";
        let masked = s.mask(input);
        assert!(masked.contains("Bearer [REDACTED]"));
        assert!(!masked.contains("eyJhbGci"));
    }

    #[test]
    fn test_mask_github_pat() {
        let s = svc();
        let input = "token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn";
        let masked = s.mask(input);
        assert!(masked.contains("[REDACTED_GH_TOKEN]"));
        assert!(!masked.contains("ghp_ABCDEF"));
    }

    #[test]
    fn test_mask_aws_key_id() {
        let s = svc();
        let input = "aws_access_key_id = AKIAIOSFODNN7EXAMPLE";
        let masked = s.mask(input);
        assert!(masked.contains("[REDACTED"));
        assert!(!masked.contains("AKIAIOSFODNN7EXAMPLE"));
    }

    #[test]
    fn test_mask_password() {
        let s = svc();
        let input = "password = super_secret_pass123";
        let masked = s.mask(input);
        assert!(masked.contains("[REDACTED]"));
        assert!(!masked.contains("super_secret_pass123"));
    }

    #[test]
    fn test_mask_url_embedded_token() {
        let s = svc();
        let input = "https://user:mysecrettoken@github.com/repo.git";
        let masked = s.mask(input);
        assert!(masked.contains("[REDACTED]"));
        assert!(!masked.contains("mysecrettoken"));
    }

    #[test]
    fn test_mask_env_secret() {
        let s = svc();
        let input = "DATABASE_URL=postgres://user:pass@host/db\nPORT=3000";
        let masked = s.mask(input);
        // DATABASE_URL value should be redacted (long enough)
        assert!(masked.contains("DATABASE_URL=[REDACTED]"));
        // PORT=3000 should NOT be redacted (too short, < 8 chars)
        assert!(masked.contains("PORT=3000"));
    }

    #[test]
    fn test_no_false_positives_on_plain_text() {
        let s = svc();
        let input = "This is a normal sentence with no secrets.";
        let masked = s.mask(input);
        assert_eq!(masked, input);
    }

    #[test]
    fn test_multiple_patterns_in_one_input() {
        let s = svc();
        let input = "Bearer abc123def456ghi789 and password = my_secret_pass";
        let masked = s.mask(input);
        assert!(!masked.contains("abc123def456ghi789"));
        assert!(!masked.contains("my_secret_pass"));
    }
}

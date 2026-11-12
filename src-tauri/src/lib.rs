use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};

const API: &str = "https://labs.bible.org/api/";
const UA: &str = "NETStudySynopsis/1.0 (macOS; +https://net-study.github.io)";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Verse {
    pub book: String,
    pub chapter: u32,
    pub verse: u32,
    pub text: String,
}

fn client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .user_agent(UA)
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("client: {e}"))
}

fn cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("passages");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn digest(key: &str) -> String {
    let mut h = DefaultHasher::new();
    key.hash(&mut h);
    format!("{:016x}", h.finish())
}

fn cache_file(app: &AppHandle, reference: &str) -> Result<PathBuf, String> {
    let safe: String = reference
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();
    let dir = cache_dir(app)?;
    Ok(dir.join(format!("{}-{}.json", safe, digest(reference))))
}

fn write_atomic(path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

fn clean_reference(reference: &str) -> Result<String, String> {
    let trimmed = reference.trim();
    if trimmed.is_empty() || trimmed.len() > 64 {
        return Err("That reference doesn't look quite right.".into());
    }
    let ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || " :,;-".contains(c));
    if !ok || !trimmed.chars().any(|c| c.is_ascii_alphabetic()) {
        return Err("That reference doesn't look quite right.".into());
    }
    Ok(trimmed.to_string())
}

fn decode_entities(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let bytes: Vec<char> = input.chars().collect();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == '&' {
            let mut j = i + 1;
            while j < bytes.len() && j - i < 10 && bytes[j] != ';' {
                j += 1;
            }
            if j < bytes.len() && bytes[j] == ';' {
                let entity: String = bytes[i + 1..j].iter().collect();
                let replacement = match entity.as_str() {
                    "amp" => Some("&"),
                    "lt" => Some("<"),
                    "gt" => Some(">"),
                    "quot" => Some("\""),
                    "apos" | "#39" => Some("'"),
                    "nbsp" => Some(" "),
                    "mdash" => Some("—"),
                    "ndash" => Some("–"),
                    "rsquo" | "#8217" => Some("’"),
                    "lsquo" | "#8216" => Some("‘"),
                    "ldquo" | "#8220" => Some("“"),
                    "rdquo" | "#8221" => Some("”"),
                    _ => None,
                };
                if let Some(r) = replacement {
                    out.push_str(r);
                    i = j + 1;
                    continue;
                }
                if let Some(num) = entity.strip_prefix('#') {
                    if let Ok(code) = num.parse::<u32>() {
                        if let Some(ch) = char::from_u32(code) {
                            out.push(ch);
                            i = j + 1;
                            continue;
                        }
                    }
                }
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    out
}

fn strip_tags(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut in_tag = false;
    for ch in input.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    decode_entities(&out).split_whitespace().collect::<Vec<_>>().join(" ")
}

fn parse_verses(data: &[u8]) -> Result<Vec<Verse>, String> {
    let value: Value = serde_json::from_slice(data).map_err(|_| {
        let raw = String::from_utf8_lossy(data);
        let text = strip_tags(&raw);
        if text.is_empty() {
            "The Bible service sent something we couldn't read.".to_string()
        } else {
            format!("The Bible service said: {}", text.chars().take(160).collect::<String>())
        }
    })?;

    let list = value
        .as_array()
        .ok_or_else(|| "The Bible service sent an unexpected response.".to_string())?;

    let field = |item: &Value, key: &str| -> String {
        item.get(key)
            .and_then(|v| {
                if let Some(s) = v.as_str() {
                    Some(s.to_string())
                } else if let Some(n) = v.as_u64() {
                    Some(n.to_string())
                } else {
                    None
                }
            })
            .unwrap_or_default()
    };

    let verses: Vec<Verse> = list
        .iter()
        .filter_map(|item| {
            let book = field(item, "bookname");
            let chapter = field(item, "chapter").parse::<u32>().ok()?;
            let verse = field(item, "verse").parse::<u32>().ok()?;
            let text = strip_tags(&field(item, "text"));
            if book.is_empty() || text.is_empty() {
                return None;
            }
            Some(Verse { book, chapter, verse, text })
        })
        .collect();

    if verses.is_empty() {
        return Err("No verses came back for that reference.".into());
    }
    Ok(verses)
}

fn fetch_blocking(app: &AppHandle, reference: &str) -> Result<Vec<Verse>, String> {
    let clean = clean_reference(reference)?;
    let file = cache_file(app, &clean)?;

    let response = client()?.get(API).query(&[
        ("passage", clean.as_str()),
        ("formatting", "plain"),
        ("type", "json"),
    ]);

    let failure = match response.send() {
        Ok(resp) => {
            let status = resp.status();
            if !status.is_success() {
                format!("The Bible service replied with {status}.")
            } else {
                match resp.bytes() {
                    Ok(bytes) => match parse_verses(&bytes) {
                        Ok(verses) => {
                            if let Ok(json) = serde_json::to_vec(&verses) {
                                let _ = write_atomic(&file, &json);
                            }
                            return Ok(verses);
                        }
                        Err(e) => e,
                    },
                    Err(e) => format!("{e}"),
                }
            }
        }
        Err(_) => "Can't reach the NET Bible service right now.".to_string(),
    };

    // Offline fallback: a previously cached passage is better than a blank column.
    if let Ok(json) = fs::read(&file) {
        if let Ok(verses) = serde_json::from_slice::<Vec<Verse>>(&json) {
            if !verses.is_empty() {
                return Ok(verses);
            }
        }
    }

    Err(failure)
}

/// Fetch a passage (e.g. "Matthew 5:3-12") from the NET Bible API, cached on disk.
#[tauri::command]
async fn passage(app: AppHandle, reference: String) -> Result<Vec<Verse>, String> {
    tauri::async_runtime::spawn_blocking(move || fetch_blocking(&app, &reference))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![passage])
        .run(tauri::generate_context!())
        .expect("error while running NET Study Synopsis");
}

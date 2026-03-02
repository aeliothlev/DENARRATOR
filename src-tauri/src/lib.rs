use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;
use midir::{Ignore, MidiInput, MidiInputConnection};
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;
use tauri::Manager;

#[derive(Serialize)]
struct CliplibWriteResult {
    clip_id: String,
    path: String,
    name: String,
}

#[derive(Serialize)]
struct CliplibItem {
    clip_id: String,
    path: String,
    name: String,
}

#[derive(Serialize)]
struct BrowserClipItem {
    clip_id: String,
    path: String,
    name: String,
    mtime_ms: u128,
    size: u64,
}

#[derive(Serialize)]
struct BrowserSessionItem {
    path: String,
    name: String,
    mtime_ms: u128,
    size: u64,
}

#[derive(Serialize)]
struct BrowserPresetItem {
    path: String,
    name: String,
    module: String,
    kind: String,
    mtime_ms: u128,
    size: u64,
}

#[derive(Serialize)]
struct BrowserIndex {
    clips: Vec<BrowserClipItem>,
    sessions: Vec<BrowserSessionItem>,
    presets: Vec<BrowserPresetItem>,
}

#[derive(Serialize, Deserialize)]
struct BrowserWavePeaks {
    mins: Vec<f32>,
    maxs: Vec<f32>,
}

#[derive(Serialize, Deserialize, Default)]
struct DenarratorConfig {
    #[serde(default)]
    base_dir: Option<String>,
    #[serde(default)]
    dialog_memory: HashMap<String, String>,
}

#[derive(Serialize, Clone)]
struct PathsObject {
    base: String,
    mater: String,
    pater: String,
    infans: String,
    sesh: String,
    presets: String,
    temp: String,
    cache: String,
    logs: String,
    temp_by_module: HashMap<String, String>,
}

#[derive(Deserialize)]
struct DialogFilter {
    name: String,
    extensions: Vec<String>,
}

#[derive(Serialize)]
struct TempWriteResult {
    temp_path: String,
}

#[derive(Serialize)]
struct SessionTitleResult {
    title: String,
    path: String,
}

#[derive(Serialize, Clone)]
struct MidiInputDevice {
    id: String,
    name: String,
}

#[derive(Serialize, Clone)]
struct MidiCcMessage {
    r#type: String,
    device_id: String,
    device_name: String,
    channel: u8,
    cc: u8,
    value: u8,
    ts_ms: u128,
}

#[derive(Default)]
struct MidiState {
    conn_in: Mutex<Option<MidiInputConnection<()>>>,
}

fn midi_collect_inputs() -> Result<Vec<MidiInputDevice>, String> {
    let mut input =
        MidiInput::new("denarrator-midi-list").map_err(|e| format!("midi init failed: {e}"))?;
    input.ignore(Ignore::None);
    let ports = input.ports();
    let mut out = Vec::with_capacity(ports.len());
    for (idx, port) in ports.iter().enumerate() {
        let name = input
            .port_name(port)
            .unwrap_or_else(|_| format!("MIDI Input {}", idx + 1));
        out.push(MidiInputDevice {
            id: idx.to_string(),
            name,
        });
    }
    Ok(out)
}

fn emit_midi_devices(app: &tauri::AppHandle) {
    if let Ok(devices) = midi_collect_inputs() {
        let _ = app.emit("midi://devices", devices);
    }
}

fn denarrator_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut base_dir: PathBuf = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir unavailable: {e}"))?;
    fs::create_dir_all(&base_dir).map_err(|e| format!("app data mkdir failed: {e}"))?;
    base_dir.push("denarrator_config.json");
    Ok(base_dir)
}

fn default_base_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut p = app
        .path()
        .document_dir()
        .map_err(|e| format!("document dir unavailable: {e}"))?;
    p.push("DENARRATOR");
    Ok(p)
}

fn read_denarrator_config(app: &tauri::AppHandle) -> Result<DenarratorConfig, String> {
    let path = denarrator_config_path(app)?;
    if !path.exists() {
        return Ok(DenarratorConfig::default());
    }
    let text = fs::read_to_string(path).map_err(|e| format!("config read failed: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("config parse failed: {e}"))
}

fn write_denarrator_config(app: &tauri::AppHandle, cfg: &DenarratorConfig) -> Result<(), String> {
    let path = denarrator_config_path(app)?;
    let text = serde_json::to_string_pretty(cfg).map_err(|e| format!("config encode failed: {e}"))?;
    fs::write(path, text).map_err(|e| format!("config write failed: {e}"))
}

fn ensure_denarrator_tree(base: &PathBuf) -> Result<(), String> {
    let mater = base.join("Mater");
    let pater = base.join("Pater");
    let infans = base.join("Infans");
    let sesh = infans.join("Sesh");
    let presets = infans.join("Presets");
    let temp = infans.join("Temp");
    let cache = infans.join("Cache");
    let logs = infans.join("Logs");
    let wave_cache = cache.join("waves");

    for p in [mater, pater, sesh, presets, temp.clone(), wave_cache, logs] {
        fs::create_dir_all(&p).map_err(|e| format!("mkdir failed ({}): {e}", p.to_string_lossy()))?;
    }

    for module in ["prim", "i2", "projektor", "pictonal", "theremin", "eq", "lazy", "morphogo", "negativraum", "diff", "particles", "nuklear", "rcf_rzb"] {
        fs::create_dir_all(temp.join(module))
            .map_err(|e| format!("temp module mkdir failed ({module}): {e}"))?;
    }
    Ok(())
}

fn build_paths_object(base: &PathBuf) -> PathsObject {
    let mater = base.join("Mater");
    let pater = base.join("Pater");
    let infans = base.join("Infans");
    let sesh = infans.join("Sesh");
    let presets = infans.join("Presets");
    let temp = infans.join("Temp");
    let cache = infans.join("Cache");
    let logs = infans.join("Logs");

    let mut temp_by_module = HashMap::new();
    for module in ["prim", "i2", "projektor", "pictonal", "theremin", "eq", "lazy", "morphogo", "negativraum", "diff", "particles", "nuklear", "rcf_rzb"] {
        temp_by_module.insert(module.to_string(), temp.join(module).to_string_lossy().to_string());
    }

    PathsObject {
        base: base.to_string_lossy().to_string(),
        mater: mater.to_string_lossy().to_string(),
        pater: pater.to_string_lossy().to_string(),
        infans: infans.to_string_lossy().to_string(),
        sesh: sesh.to_string_lossy().to_string(),
        presets: presets.to_string_lossy().to_string(),
        temp: temp.to_string_lossy().to_string(),
        cache: cache.to_string_lossy().to_string(),
        logs: logs.to_string_lossy().to_string(),
        temp_by_module,
    }
}

fn resolve_base_dir(app: &tauri::AppHandle, allow_init_default: bool) -> Result<PathBuf, String> {
    let cfg = read_denarrator_config(app)?;
    if let Some(base_str) = cfg.base_dir {
        let p = PathBuf::from(base_str);
        if p.exists() {
            ensure_denarrator_tree(&p)?;
            return Ok(p);
        }
        if allow_init_default {
            ensure_denarrator_tree(&p)?;
            return Ok(p);
        }
    }
    if !allow_init_default {
        return Err("base dir not configured".to_string());
    }
    let p = default_base_dir(app)?;
    ensure_denarrator_tree(&p)?;
    write_denarrator_config(
        app,
        &DenarratorConfig {
            base_dir: Some(p.to_string_lossy().to_string()),
            dialog_memory: HashMap::new(),
        },
    )?;
    Ok(p)
}

fn cliplib_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_base_dir(app, false)?.join("Mater"))
}

fn denarrator_presets_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_base_dir(app, false)?.join("Infans").join("Presets"))
}

fn denarrator_sessions_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_base_dir(app, false)?.join("Infans").join("Sesh"))
}

fn denarrator_wave_cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_base_dir(app, false)?.join("Infans").join("Cache").join("waves"))
}

fn projektor_presets_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut p = denarrator_presets_dir(app)?;
    p.push("projektor_presets.json");
    Ok(p)
}

fn sanitize_name(input: &str) -> String {
    let filtered: String = input
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = filtered.trim_matches('_').trim_matches('.');
    if trimmed.is_empty() {
        "clip".to_string()
    } else {
        trimmed.chars().take(80).collect()
    }
}

fn sanitize_session_title(input: &str) -> String {
    let s = sanitize_name(input);
    if s.is_empty() {
        "DENARRATOR_0001".to_string()
    } else {
        s
    }
}

fn session_path_for_title(app: &tauri::AppHandle, title: &str) -> Result<PathBuf, String> {
    let mut path = denarrator_sessions_dir(app)?;
    path.push(format!("{title}.sesh"));
    Ok(path)
}

fn resolve_unique_session_title(app: &tauri::AppHandle, title_raw: &str) -> Result<SessionTitleResult, String> {
    let mut title = sanitize_session_title(title_raw);
    let base_title = title.clone();
    let mut next_n = 2u32;

    if let Some((root, num_str)) = base_title.rsplit_once('_') {
        if num_str.len() == 4 && num_str.chars().all(|c| c.is_ascii_digit()) {
            let parsed = num_str.parse::<u32>().unwrap_or(1);
            next_n = parsed.saturating_add(1);
            title = format!("{root}_{parsed:04}");
        }
    }

    loop {
        let path = session_path_for_title(app, &title)?;
        if !path.exists() {
            return Ok(SessionTitleResult {
                title,
                path: path.to_string_lossy().to_string(),
            });
        }
        let root = if let Some((r, n)) = base_title.rsplit_once('_') {
            if n.len() == 4 && n.chars().all(|c| c.is_ascii_digit()) {
                r.to_string()
            } else {
                base_title.clone()
            }
        } else {
            base_title.clone()
        };
        title = format!("{root}_{next_n:04}");
        next_n = next_n.saturating_add(1);
    }
}

fn config_get_dialog_dir(app: &tauri::AppHandle, key: &str) -> Option<String> {
    let cfg = read_denarrator_config(app).ok()?;
    cfg.dialog_memory.get(key).cloned()
}

fn config_set_dialog_dir(app: &tauri::AppHandle, key: &str, picked_path: &str) -> Result<(), String> {
    if key.trim().is_empty() || picked_path.trim().is_empty() {
        return Ok(());
    }
    let mut cfg = read_denarrator_config(app)?;
    let path = PathBuf::from(picked_path);
    let dir = if path.is_dir() {
        path
    } else {
        path.parent().unwrap_or(&path).to_path_buf()
    };
    if dir.as_os_str().is_empty() {
        return Ok(());
    }
    cfg.dialog_memory
        .insert(key.trim().to_string(), dir.to_string_lossy().to_string());
    write_denarrator_config(app, &cfg)
}

fn unix_millis_from_meta(meta: &fs::Metadata) -> u128 {
    meta.modified()
        .ok()
        .and_then(|ts| ts.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn browser_allowed_roots(app: &tauri::AppHandle) -> Result<Vec<PathBuf>, String> {
    let base = resolve_base_dir(app, false)?;
    let paths = build_paths_object(&base);
    Ok(vec![
        PathBuf::from(paths.mater),
        PathBuf::from(paths.pater),
        PathBuf::from(paths.sesh),
        PathBuf::from(paths.presets),
        PathBuf::from(paths.temp),
        PathBuf::from(paths.cache),
        PathBuf::from(paths.logs),
    ])
}

fn browser_path_allowed(app: &tauri::AppHandle, path: &PathBuf) -> Result<bool, String> {
    let roots = browser_allowed_roots(app)?;
    let candidate = if path.exists() {
        fs::canonicalize(path).map_err(|e| format!("canonicalize path failed: {e}"))?
    } else {
        let parent = path
            .parent()
            .ok_or_else(|| "invalid path parent".to_string())?
            .to_path_buf();
        fs::canonicalize(parent).map_err(|e| format!("canonicalize parent failed: {e}"))?
    };
    for root in roots {
        let canonical_root = fs::canonicalize(root).map_err(|e| format!("canonicalize root failed: {e}"))?;
        if candidate.starts_with(&canonical_root) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn read_wav_peaks(bytes: &[u8], columns: usize) -> Result<BrowserWavePeaks, String> {
    if bytes.len() < 44 {
        return Err("wav too short".to_string());
    }
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("not a RIFF/WAVE file".to_string());
    }
    let mut offset: usize = 12;
    let mut fmt_channels: usize = 1;
    let mut fmt_bits: usize = 16;
    let mut fmt_audio_format: u16 = 1;
    let mut data_offset: usize = 0;
    let mut data_size: usize = 0;

    while offset + 8 <= bytes.len() {
        let id = &bytes[offset..offset + 4];
        let chunk_size = u32::from_le_bytes([
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        ]) as usize;
        let data_start = offset + 8;
        if id == b"fmt " {
            if data_start + 16 <= bytes.len() {
                fmt_audio_format = u16::from_le_bytes([bytes[data_start], bytes[data_start + 1]]);
                fmt_channels = u16::from_le_bytes([bytes[data_start + 2], bytes[data_start + 3]]) as usize;
                fmt_bits = u16::from_le_bytes([bytes[data_start + 14], bytes[data_start + 15]]) as usize;
            }
        } else if id == b"data" {
            data_offset = data_start;
            data_size = chunk_size.min(bytes.len().saturating_sub(data_start));
            break;
        }
        let next = data_start + chunk_size + (chunk_size % 2);
        if next <= offset {
            break;
        }
        offset = next;
    }

    if data_offset == 0 || data_size == 0 {
        return Err("wav data chunk missing".to_string());
    }
    if fmt_channels == 0 {
        return Err("invalid channel count".to_string());
    }
    let bytes_per_sample = fmt_bits / 8;
    if bytes_per_sample == 0 {
        return Err("invalid bit depth".to_string());
    }
    let frame_size = bytes_per_sample * fmt_channels;
    if frame_size == 0 {
        return Err("invalid frame size".to_string());
    }
    let frame_count = data_size / frame_size;
    if frame_count == 0 {
        return Err("empty wav data".to_string());
    }

    let cols = columns.max(16).min(4096);
    let stride = (frame_count / cols).max(1);
    let mut mins = vec![0.0f32; cols];
    let mut maxs = vec![0.0f32; cols];

    for col in 0..cols {
        let start = (col * stride).min(frame_count.saturating_sub(1));
        let end = (start + stride).min(frame_count);
        let mut mn = 1.0f32;
        let mut mx = -1.0f32;
        for frame in start..end {
            let sample_off = data_offset + (frame * frame_size);
            let v = match (fmt_audio_format, fmt_bits) {
                (1, 16) => {
                    let s = i16::from_le_bytes([bytes[sample_off], bytes[sample_off + 1]]);
                    (s as f32) / 32768.0
                }
                (1, 24) => {
                    let b0 = bytes[sample_off] as i32;
                    let b1 = (bytes[sample_off + 1] as i32) << 8;
                    let b2 = (bytes[sample_off + 2] as i32) << 16;
                    let mut s = b0 | b1 | b2;
                    if s & 0x800000 != 0 {
                        s |= !0xFFFFFF;
                    }
                    (s as f32) / 8388608.0
                }
                (1, 32) => {
                    let s = i32::from_le_bytes([
                        bytes[sample_off],
                        bytes[sample_off + 1],
                        bytes[sample_off + 2],
                        bytes[sample_off + 3],
                    ]);
                    (s as f32) / 2147483648.0
                }
                (3, 32) => f32::from_le_bytes([
                    bytes[sample_off],
                    bytes[sample_off + 1],
                    bytes[sample_off + 2],
                    bytes[sample_off + 3],
                ]),
                _ => 0.0,
            };
            if v < mn {
                mn = v;
            }
            if v > mx {
                mx = v;
            }
        }
        mins[col] = mn;
        maxs[col] = mx;
    }

    Ok(BrowserWavePeaks { mins, maxs })
}

#[tauri::command]
fn paths_get_or_init(app: tauri::AppHandle) -> Result<PathsObject, String> {
    let base = resolve_base_dir(&app, true)?;
    Ok(build_paths_object(&base))
}

#[tauri::command]
fn paths_get(app: tauri::AppHandle) -> Result<Option<PathsObject>, String> {
    let cfg = read_denarrator_config(&app)?;
    let Some(base_str) = cfg.base_dir else {
        return Ok(None);
    };
    let base = PathBuf::from(base_str);
    if !base.exists() {
        return Ok(None);
    }
    ensure_denarrator_tree(&base)?;
    Ok(Some(build_paths_object(&base)))
}

#[tauri::command]
fn paths_set_base(app: tauri::AppHandle, base_dir: String) -> Result<PathsObject, String> {
    let base = PathBuf::from(base_dir);
    ensure_denarrator_tree(&base)?;
    write_denarrator_config(
        &app,
        &DenarratorConfig {
            base_dir: Some(base.to_string_lossy().to_string()),
            dialog_memory: HashMap::new(),
        },
    )?;
    Ok(build_paths_object(&base))
}

#[tauri::command]
fn paths_default_base(app: tauri::AppHandle) -> Result<String, String> {
    Ok(default_base_dir(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn dialog_pick_folder(default_dir: Option<String>) -> Result<Option<String>, String> {
    let mut dlg = FileDialog::new();
    if let Some(d) = default_dir {
        if !d.is_empty() {
            dlg = dlg.set_directory(d);
        }
    }
    Ok(dlg.pick_folder().map(|p| p.to_string_lossy().to_string()))
}

fn with_dialog_filters(mut dlg: FileDialog, filters: Option<Vec<DialogFilter>>) -> FileDialog {
    if let Some(fs) = filters {
        for f in fs {
            let exts: Vec<String> = f
                .extensions
                .iter()
                .map(|e| e.trim_start_matches('.').to_string())
                .filter(|e| !e.is_empty())
                .collect();
            if exts.is_empty() {
                continue;
            }
            let refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
            dlg = dlg.add_filter(&f.name, &refs);
        }
    }
    dlg
}

#[tauri::command]
fn dialog_open_file(
    app: tauri::AppHandle,
    default_dir: Option<String>,
    filters: Option<Vec<DialogFilter>>,
    dialog_key: Option<String>,
) -> Result<Option<String>, String> {
    let mut dlg = FileDialog::new();
    let remembered_dir = dialog_key
        .as_ref()
        .and_then(|k| config_get_dialog_dir(&app, k));
    if let Some(d) = remembered_dir.or(default_dir) {
        if !d.is_empty() {
            dlg = dlg.set_directory(d);
        }
    }
    dlg = with_dialog_filters(dlg, filters);
    let picked = dlg.pick_file().map(|p| p.to_string_lossy().to_string());
    if let (Some(key), Some(path)) = (dialog_key, picked.as_ref()) {
        let _ = config_set_dialog_dir(&app, &key, path);
    }
    Ok(picked)
}

#[tauri::command]
fn dialog_save_file(
    app: tauri::AppHandle,
    default_dir: Option<String>,
    suggested_name: Option<String>,
    filters: Option<Vec<DialogFilter>>,
    dialog_key: Option<String>,
) -> Result<Option<String>, String> {
    let mut dlg = FileDialog::new();
    let remembered_dir = dialog_key
        .as_ref()
        .and_then(|k| config_get_dialog_dir(&app, k));
    if let Some(d) = remembered_dir.or(default_dir) {
        if !d.is_empty() {
            dlg = dlg.set_directory(d);
        }
    }
    if let Some(name) = suggested_name {
        if !name.is_empty() {
            dlg = dlg.set_file_name(&name);
        }
    }
    dlg = with_dialog_filters(dlg, filters);
    let picked = dlg.save_file().map(|p| p.to_string_lossy().to_string());
    if let (Some(key), Some(path)) = (dialog_key, picked.as_ref()) {
        let _ = config_set_dialog_dir(&app, &key, path);
    }
    Ok(picked)
}

#[tauri::command]
fn dialog_memory_get(app: tauri::AppHandle, dialog_key: String) -> Result<Option<String>, String> {
    if dialog_key.trim().is_empty() {
        return Ok(None);
    }
    Ok(config_get_dialog_dir(&app, dialog_key.trim()))
}

#[tauri::command]
fn dialog_memory_set(app: tauri::AppHandle, dialog_key: String, path: String) -> Result<bool, String> {
    if dialog_key.trim().is_empty() || path.trim().is_empty() {
        return Ok(false);
    }
    config_set_dialog_dir(&app, dialog_key.trim(), &path)?;
    Ok(true)
}

#[tauri::command]
fn session_suggest_next_title(app: tauri::AppHandle, prefix: Option<String>) -> Result<SessionTitleResult, String> {
    let base_prefix = sanitize_session_title(&prefix.unwrap_or_else(|| "DENARRATOR".to_string()));
    let sessions_dir = denarrator_sessions_dir(&app)?;
    let mut max_n: u32 = 0;
    let prefix_upper = base_prefix.to_ascii_uppercase();
    let entries = fs::read_dir(&sessions_dir).map_err(|e| format!("sessions read_dir failed: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext_ok = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("sesh"))
            .unwrap_or(false);
        if !ext_ok {
            continue;
        }
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_ascii_uppercase();
        if !stem.starts_with(&format!("{prefix_upper}_")) {
            continue;
        }
        let maybe_n = stem.rsplit('_').next().unwrap_or("");
        if maybe_n.len() != 4 || !maybe_n.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let n = maybe_n.parse::<u32>().unwrap_or(0);
        if n > max_n {
            max_n = n;
        }
    }
    let next = if max_n == 0 { 1 } else { max_n.saturating_add(1) };
    resolve_unique_session_title(&app, &format!("{base_prefix}_{next:04}"))
}

#[tauri::command]
fn session_resolve_title_path(app: tauri::AppHandle, title: String) -> Result<SessionTitleResult, String> {
    resolve_unique_session_title(&app, &title)
}

#[tauri::command]
fn app_quit(app: tauri::AppHandle) -> Result<bool, String> {
    app.exit(0);
    Ok(true)
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let p = PathBuf::from(path);
    if !p.exists() {
        return Err("file does not exist".to_string());
    }
    let bytes = fs::read(&p).map_err(|e| format!("file read failed: {e}"))?;
    Ok(BASE64_STANDARD.encode(bytes))
}

#[tauri::command]
fn write_temp_wav(
    app: tauri::AppHandle,
    module_id: String,
    data_base64: String,
    suggested_name: Option<String>,
) -> Result<TempWriteResult, String> {
    let bytes = BASE64_STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("base64 decode failed: {e}"))?;
    let paths = paths_get_or_init(app.clone())?;
    let mut module_temp = PathBuf::from(paths.temp);
    let module_safe = sanitize_name(&module_id.to_ascii_lowercase());
    module_temp.push(module_safe);
    fs::create_dir_all(&module_temp).map_err(|e| format!("temp module mkdir failed: {e}"))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("time error: {e}"))?;
    let millis = now.as_millis();
    let safe = sanitize_name(&suggested_name.unwrap_or_else(|| "render".to_string()));
    let filename = format!("{}_{}_{}.wav", module_id.to_ascii_lowercase(), millis, safe);
    let full = module_temp.join(filename);
    fs::write(&full, bytes).map_err(|e| format!("temp write failed: {e}"))?;
    Ok(TempWriteResult {
        temp_path: full.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn save_blob_with_dialog(app: tauri::AppHandle, data_base64: String, suggested_name: String) -> Result<bool, String> {
    let default_dir = cliplib_dir(&app).ok();
    let mut dialog = FileDialog::new().set_file_name(&suggested_name);
    if let Some(dir) = default_dir {
        dialog = dialog.set_directory(dir);
    }
    let picked = dialog
        .save_file();

    let Some(path) = picked else {
        return Ok(false);
    };

    let bytes = BASE64_STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("base64 decode failed: {e}"))?;
    fs::write(path, bytes).map_err(|e| format!("file write failed: {e}"))?;
    Ok(true)
}

#[tauri::command]
fn save_blob_with_dialog_path(
    app: tauri::AppHandle,
    data_base64: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    let default_dir = cliplib_dir(&app).ok();
    let mut dialog = FileDialog::new().set_file_name(&suggested_name);
    if let Some(dir) = default_dir {
        dialog = dialog.set_directory(dir);
    }
    let picked = dialog.save_file();
    let Some(path) = picked else {
        return Ok(None);
    };

    let bytes = BASE64_STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("base64 decode failed: {e}"))?;
    fs::write(&path, bytes).map_err(|e| format!("file write failed: {e}"))?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_blob_to_path(data_base64: String, path: String) -> Result<bool, String> {
    let bytes = BASE64_STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("base64 decode failed: {e}"))?;
    fs::write(path, bytes).map_err(|e| format!("file write failed: {e}"))?;
    Ok(true)
}

#[tauri::command]
fn projektor_presets_read(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = projektor_presets_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(path).map_err(|e| format!("preset read failed: {e}"))?;
    Ok(Some(text))
}

#[tauri::command]
fn projektor_presets_write(app: tauri::AppHandle, text: String) -> Result<bool, String> {
    let path = projektor_presets_path(&app)?;
    fs::write(path, text).map_err(|e| format!("preset write failed: {e}"))?;
    Ok(true)
}

#[tauri::command]
fn cliplib_write_wav(
    app: tauri::AppHandle,
    data_base64: String,
    suggested_name: String,
) -> Result<CliplibWriteResult, String> {
    let bytes = BASE64_STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("base64 decode failed: {e}"))?;

    let base_dir = cliplib_dir(&app)?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("time error: {e}"))?;
    let millis = now.as_millis();
    let clip_id = format!("clip_{millis}");

    let safe = sanitize_name(&suggested_name);
    let file_name = format!("{millis}_{safe}_{clip_id}.wav");
    let mut full_path = base_dir;
    full_path.push(file_name);

    fs::write(&full_path, bytes).map_err(|e| format!("file write failed: {e}"))?;

    let full_path_str = full_path.to_string_lossy().to_string();
    Ok(CliplibWriteResult {
        clip_id,
        path: full_path_str,
        name: safe,
    })
}

#[tauri::command]
fn cliplib_list(app: tauri::AppHandle) -> Result<Vec<CliplibItem>, String> {
    let base_dir = cliplib_dir(&app)?;
    let mut items = Vec::new();
    let entries = fs::read_dir(&base_dir).map_err(|e| format!("cliplib read_dir failed: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext_ok = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("wav"))
            .unwrap_or(false);
        if !ext_ok {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "clip".to_string());
        let clip_id = format!("clip_{}", name);
        items.push(CliplibItem {
            clip_id,
            path: path.to_string_lossy().to_string(),
            name,
        });
    }
    items.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(items)
}

#[tauri::command]
fn cliplib_read_wav_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("cliplib read failed: {e}"))?;
    Ok(BASE64_STANDARD.encode(bytes))
}

#[tauri::command]
fn browser_index(app: tauri::AppHandle) -> Result<BrowserIndex, String> {
    let clip_dir = cliplib_dir(&app)?;
    let sesh_dir = denarrator_sessions_dir(&app)?;
    let preset_dir = denarrator_presets_dir(&app)?;

    let mut clips: Vec<BrowserClipItem> = Vec::new();
    let clip_entries = fs::read_dir(&clip_dir).map_err(|e| format!("cliplib read_dir failed: {e}"))?;
    for entry in clip_entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext_ok = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("wav"))
            .unwrap_or(false);
        if !ext_ok {
            continue;
        }
        let meta = entry.metadata().map_err(|e| format!("clip metadata failed: {e}"))?;
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "clip".to_string());
        clips.push(BrowserClipItem {
            clip_id: format!("clip_{name}"),
            path: path.to_string_lossy().to_string(),
            name,
            mtime_ms: unix_millis_from_meta(&meta),
            size: meta.len(),
        });
    }
    clips.sort_by(|a, b| b.mtime_ms.cmp(&a.mtime_ms));

    let mut sessions: Vec<BrowserSessionItem> = Vec::new();
    let sesh_entries = fs::read_dir(&sesh_dir).map_err(|e| format!("sessions read_dir failed: {e}"))?;
    for entry in sesh_entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext_ok = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("sesh"))
            .unwrap_or(false);
        if !ext_ok {
            continue;
        }
        let meta = entry.metadata().map_err(|e| format!("session metadata failed: {e}"))?;
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "session.sesh".to_string());
        sessions.push(BrowserSessionItem {
            path: path.to_string_lossy().to_string(),
            name,
            mtime_ms: unix_millis_from_meta(&meta),
            size: meta.len(),
        });
    }
    sessions.sort_by(|a, b| b.mtime_ms.cmp(&a.mtime_ms));

    let mut presets: Vec<BrowserPresetItem> = Vec::new();
    let preset_entries = fs::read_dir(&preset_dir).map_err(|e| format!("presets read_dir failed: {e}"))?;
    for entry in preset_entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_ascii_lowercase())
            .unwrap_or_default();
        if ext != "json" && ext != "negat" && ext != "lqrec" {
            continue;
        }
        let meta = entry.metadata().map_err(|e| format!("preset metadata failed: {e}"))?;
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "preset".to_string());
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("preset")
            .to_ascii_lowercase();
        let module = if stem.contains("projektor") {
            "projektor"
        } else if stem.contains("pictonal") {
            "pictonal"
        } else if stem.contains("izer") || stem.contains("equalizer") || stem == "eq" {
            "izer"
        } else if stem.contains("negat") {
            "negativraum"
        } else {
            "global"
        };
        presets.push(BrowserPresetItem {
            path: path.to_string_lossy().to_string(),
            name,
            module: module.to_string(),
            kind: ext,
            mtime_ms: unix_millis_from_meta(&meta),
            size: meta.len(),
        });
    }
    presets.sort_by(|a, b| b.mtime_ms.cmp(&a.mtime_ms));

    Ok(BrowserIndex {
        clips,
        sessions,
        presets,
    })
}

#[tauri::command]
fn browser_read_text(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let p = PathBuf::from(path);
    if !browser_path_allowed(&app, &p)? {
        return Err("path not allowed".to_string());
    }
    fs::read_to_string(&p).map_err(|e| format!("read text failed: {e}"))
}

#[tauri::command]
fn browser_reveal(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    let p = PathBuf::from(path);
    if !browser_path_allowed(&app, &p)? {
        return Err("path not allowed".to_string());
    }
    if !p.exists() {
        return Err("path does not exist".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&p)
            .status()
            .map_err(|e| format!("reveal failed: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(&p)
            .status()
            .map_err(|e| format!("reveal failed: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        let parent = p
            .parent()
            .ok_or_else(|| "invalid parent path".to_string())?
            .to_path_buf();
        Command::new("xdg-open")
            .arg(parent)
            .status()
            .map_err(|e| format!("reveal failed: {e}"))?;
    }
    Ok(true)
}

#[tauri::command]
fn browser_rename(app: tauri::AppHandle, path: String, new_name: String) -> Result<String, String> {
    let src = PathBuf::from(path);
    if !browser_path_allowed(&app, &src)? {
        return Err("path not allowed".to_string());
    }
    let parent = src
        .parent()
        .ok_or_else(|| "invalid parent".to_string())?
        .to_path_buf();
    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");
    let mut safe = sanitize_name(&new_name);
    if ext.is_empty() {
        // keep as-is
    } else {
        let ext_lc = format!(".{}", ext.to_ascii_lowercase());
        if !safe.to_ascii_lowercase().ends_with(&ext_lc) {
            safe.push('.');
            safe.push_str(ext);
        }
    }
    let mut dst = parent;
    dst.push(safe);
    if !browser_path_allowed(&app, &dst)? {
        return Err("target path not allowed".to_string());
    }
    fs::rename(&src, &dst).map_err(|e| format!("rename failed: {e}"))?;
    Ok(dst.to_string_lossy().to_string())
}

#[tauri::command]
fn browser_delete(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    let p = PathBuf::from(path);
    if !browser_path_allowed(&app, &p)? {
        return Err("path not allowed".to_string());
    }
    fs::remove_file(p).map_err(|e| format!("delete failed: {e}"))?;
    Ok(true)
}

#[tauri::command]
fn browser_wave_peaks(app: tauri::AppHandle, path: String, columns: Option<u32>) -> Result<BrowserWavePeaks, String> {
    let p = PathBuf::from(&path);
    if !browser_path_allowed(&app, &p)? {
        return Err("path not allowed".to_string());
    }
    let meta = fs::metadata(&p).map_err(|e| format!("metadata failed: {e}"))?;
    let mtime_ms = unix_millis_from_meta(&meta);
    let cols = columns.unwrap_or(120).max(16).min(4096) as usize;
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    mtime_ms.hash(&mut hasher);
    meta.len().hash(&mut hasher);
    cols.hash(&mut hasher);
    let key = hasher.finish();

    let mut cache_path = denarrator_wave_cache_dir(&app)?;
    cache_path.push(format!("{:016x}.json", key));
    if cache_path.exists() {
        let cached_text = fs::read_to_string(&cache_path).map_err(|e| format!("cache read failed: {e}"))?;
        let cached: BrowserWavePeaks = serde_json::from_str(&cached_text).map_err(|e| format!("cache parse failed: {e}"))?;
        return Ok(cached);
    }

    let bytes = fs::read(&p).map_err(|e| format!("wav read failed: {e}"))?;
    let peaks = read_wav_peaks(&bytes, cols)?;
    let text = serde_json::to_string(&peaks).map_err(|e| format!("cache encode failed: {e}"))?;
    fs::write(&cache_path, text).map_err(|e| format!("cache write failed: {e}"))?;
    Ok(peaks)
}

#[tauri::command]
fn midi_list_inputs() -> Result<Vec<MidiInputDevice>, String> {
    midi_collect_inputs()
}

#[tauri::command]
fn midi_open_input(app: tauri::AppHandle, state: tauri::State<MidiState>, device_id: String) -> Result<bool, String> {
    let mut input = MidiInput::new("denarrator-midi-open").map_err(|e| format!("midi init failed: {e}"))?;
    input.ignore(Ignore::None);
    let ports = input.ports();
    let idx = device_id
        .parse::<usize>()
        .map_err(|_| "invalid midi device id".to_string())?;
    let port = ports
        .get(idx)
        .ok_or_else(|| "midi device index out of range".to_string())?;
    let device_name = input
        .port_name(port)
        .unwrap_or_else(|_| format!("MIDI Input {}", idx + 1));
    let device_id_cloned = device_id.clone();
    let app_handle = app.clone();

    {
        let mut guard = state
            .conn_in
            .lock()
            .map_err(|_| "midi connection state poisoned".to_string())?;
        if guard.is_some() {
            *guard = None;
        }
    }

    let conn = input
        .connect(
            port,
            "denarrator-midi-input",
            move |_, message, _| {
                if message.len() < 3 {
                    return;
                }
                let status = message[0];
                if status & 0xF0 != 0xB0 {
                    return;
                }
                let channel = status & 0x0F;
                let cc = message[1];
                let value = message[2];
                let ts_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                let payload = MidiCcMessage {
                    r#type: "cc".to_string(),
                    device_id: device_id_cloned.clone(),
                    device_name: device_name.clone(),
                    channel,
                    cc,
                    value,
                    ts_ms,
                };
                let _ = app_handle.emit("midi://message", payload);
            },
            (),
        )
        .map_err(|e| format!("open midi input failed: {e}"))?;

    let mut guard = state
        .conn_in
        .lock()
        .map_err(|_| "midi connection state poisoned".to_string())?;
    *guard = Some(conn);
    emit_midi_devices(&app);
    Ok(true)
}

#[tauri::command]
fn midi_close_input(app: tauri::AppHandle, state: tauri::State<MidiState>) -> Result<bool, String> {
    let mut guard = state
        .conn_in
        .lock()
        .map_err(|_| "midi connection state poisoned".to_string())?;
    *guard = None;
    emit_midi_devices(&app);
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(MidiState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("denarrator://quit-requested", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            paths_get_or_init,
            paths_get,
            paths_set_base,
            paths_default_base,
            dialog_pick_folder,
            dialog_open_file,
            dialog_save_file,
            dialog_memory_get,
            dialog_memory_set,
            read_file_base64,
            write_temp_wav,
            save_blob_with_dialog,
            save_blob_with_dialog_path,
            save_blob_to_path,
            session_suggest_next_title,
            session_resolve_title_path,
            app_quit,
            projektor_presets_read,
            projektor_presets_write,
            cliplib_write_wav,
            cliplib_list,
            cliplib_read_wav_base64,
            browser_index,
            browser_read_text,
            browser_reveal,
            browser_rename,
            browser_delete,
            browser_wave_peaks,
            midi_list_inputs,
            midi_open_input,
            midi_close_input
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

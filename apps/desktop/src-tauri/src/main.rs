// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::command;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct AudioDeviceInfo {
    name: String,
    is_default: bool,
}

#[command]
fn list_audio_devices() -> Vec<AudioDeviceInfo> {
    vec![
        AudioDeviceInfo {
            name: "Default Microphone (Psychologist Voice)".to_string(),
            is_default: true,
        },
        AudioDeviceInfo {
            name: "System Loopback / Zoom Output (Client Voice)".to_string(),
            is_default: false,
        },
    ]
}

#[command]
fn start_dual_channel_recording(session_id: String) -> Result<String, String> {
    println!("Starting 2-channel audio recording for session: {}", session_id);
    Ok("Recording started successfully".to_string())
}

#[command]
fn stop_and_save_recording(session_id: String) -> Result<String, String> {
    println!("Stopping audio recording for session: {}", session_id);
    Ok("/tmp/call_analyst_session.wav".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_audio_devices,
            start_dual_channel_recording,
            stop_and_save_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Call Analyst desktop recorder application");
}

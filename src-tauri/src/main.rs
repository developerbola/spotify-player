#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{
    ActivationPolicy, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
};

#[derive(Serialize, Deserialize, Debug)]
struct SpotifyData {
    track_name: String,
    artist: String,
    album_art: String,
    is_playing: bool,
    time_played: u32,
    total_time: u32,
}

#[tauri::command]
fn get_spotify_data() -> Result<SpotifyData, String> {
    let script = r#"
        on run
            if application "Spotify" is running then
                tell application "Spotify"
                    set track_id to current track's name
                    set artist_name to artist of current track
                    set artUrl to artwork url of current track
                    set track_duration to duration of current track
                    set player_position to player position
                    set player_state to player state as string
                    return track_id & "|" & artist_name & "|" & artUrl & "|" & player_state & "|" & track_duration & "|" & (player_position * 1000 as integer)
                end tell
            else
                return "Not Running|None||stopped|0|0"
            end if
        end run
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Failed to execute AppleScript".to_string());
    }

    let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = output_str.split('|').collect();

    if parts.len() < 6 {
        return Err("Invalid output format from AppleScript".to_string());
    }

    let spotify_data = SpotifyData {
        track_name: parts[0].to_string(),
        artist: parts[1].to_string(),
        album_art: parts[2].to_string(),
        is_playing: parts[3] == "playing",
        total_time: parts[4].parse::<u32>().unwrap_or(0),
        time_played: parts[5].parse::<u32>().unwrap_or(0) / 1000,
    };

    Ok(spotify_data)
}

#[tauri::command]
fn control_spotify(action: &str) -> Result<(), String> {
    let script = match action {
        "play" => r#"tell application "Spotify" to play"#,
        "pause" => r#"tell application "Spotify" to pause"#,
        "next" => r#"tell application "Spotify" to next track"#,
        "previous" => r#"tell application "Spotify" to previous track"#,
        "quit" => r#"tell application "Spotify" to quit"#,
        _ => return Err("Invalid action".to_string()),
    };

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Failed to execute AppleScript".to_string());
    }

    Ok(())
}

fn main() {
    // Create a system tray menu with a "Quit" option
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let settings = CustomMenuItem::new("settings".to_string(), "Settings");
    let tray_menu = SystemTrayMenu::new().add_item(settings).add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        app.exit(0);
                    }
                    "settings" => {
                        let window_label = "settings";
                        if app.get_window(window_label).is_none() {
                            let _settings_window = tauri::WindowBuilder::new(
                                app,
                                window_label,
                                tauri::WindowUrl::App("settings.html".into()), // or a route if using router
                            )
                            .title("Settings")
                            .inner_size(300.0, 200.0)
                            .resizable(false)
                            .build()
                            .expect("failed to build settings window");
                        } else {
                            // Focus if already open
                            app.get_window(window_label).unwrap().show().unwrap();
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                // Set activation policy to Accessory
                app.set_activation_policy(ActivationPolicy::Accessory);
            }

            // Get the main window
            let main_window = app.get_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSMainMenuWindowLevel, NSWindow, NSWindowCollectionBehavior};
                use cocoa::base::id;

                let ns_win = main_window.ns_window().unwrap() as id;
                unsafe {
                    // Set window level just above main menu
                    ns_win.setLevel_(((NSMainMenuWindowLevel + 1) as u64).try_into().unwrap());
                    // Allow window to appear on all Spaces (virtual desktops)
                    ns_win.setCollectionBehavior_(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces,
                    );
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_spotify_data, control_spotify])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

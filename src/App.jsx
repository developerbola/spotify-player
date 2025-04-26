import "./styles/index.css";
import { useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { writeText, readText } from "@tauri-apps/api/fs";
import { SpotifyPlayer } from "./SpotifyPlayer";

const App = () => {
  useEffect(() => {
    // Track if Command key is pressed
    let isCommandPressed = false;

    // Add event listeners for key state
    const handleKeyDown = (e) => {
      // Check for Command key (metaKey on Mac)
      if (e.metaKey) {
        isCommandPressed = true;
        document.getElementById("main").style.cursor = "move";
      }
    };

    const handleKeyUp = (e) => {
      // Reset when Command key is released
      if (e.key === "Meta") {
        isCommandPressed = false;
        document.getElementById("main").style.cursor = "default";
      }
    };

    // Handle mouse down for drag behavior
    const handleMouseDown = async (e) => {
      if (isCommandPressed) {
        // Start dragging window
        await appWindow.startDragging();
        document.getElementById("main").style.cursor = "move";
      }
    };

    // Save window position when it's moved
    const saveWindowPosition = async () => {
      const position = await appWindow.outerPosition();
      // Save position in local storage or a file
      await writeText('window_position.json', JSON.stringify(position));
    };

    // Load window position on app startup
    const loadWindowPosition = async () => {
      try {
        const positionData = await readText('window_position.json');
        const position = JSON.parse(positionData);
        if (position && position.x !== undefined && position.y !== undefined) {
          // Set the saved window position
          await appWindow.setPosition({ x: position.x, y: position.y });
        }
      } catch (error) {
        // If no saved position exists, fallback to default behavior
        console.log("No saved window position, using default.");
      }
    };

    // Load the window position when the app starts
    loadWindowPosition();

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleMouseDown);

    // Save window position on app close
    appWindow.onClose(saveWindowPosition);

    // Clean up listeners on component unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return (
    <main id="main">
      <SpotifyPlayer />
    </main>
  );
};

export default App;

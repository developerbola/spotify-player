import { useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { writeTextFile, readTextFile } from "@tauri-apps/api/fs"; // Correct imports
import SpotifyPlayer from "./SpotifyPlayer";

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

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleMouseDown);

    // Read saved window position from file
    const loadWindowPosition = async () => {
      try {
        const positionData = await readTextFile("path/to/your/file.json"); // Read from file
        const position = JSON.parse(positionData);
        appWindow.setPosition(position.x, position.y); // Set window position
      } catch (error) {
        console.error("Failed to load window position:", error);
      }
    };

    loadWindowPosition();

    // Save window position to file on close
    const saveWindowPosition = async () => {
      try {
        const position = await appWindow.position();
        const positionData = JSON.stringify(position);
        await writeTextFile("path/to/your/file.json", positionData); // Save to file
      } catch (error) {
        console.error("Failed to save window position:", error);
      }
    };

    // Clean up listeners on component unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleMouseDown);

      saveWindowPosition(); // Save position on unmount
    };
  }, []);

  return (
    <main id="main">
      <SpotifyPlayer />
    </main>
  );
};

export default App;

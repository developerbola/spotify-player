import "./styles/index.css";
import { useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
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

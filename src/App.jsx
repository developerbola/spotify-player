import { useEffect, useRef, useState } from "react";
import { appWindow, PhysicalPosition } from "@tauri-apps/api/window";
import SpotifyPlayer from "./SpotifyPlayer";
import "./styles/index.css";

const App = () => {
  const lastPosition = useRef({ x: null, y: null });

  useEffect(() => {
    const storedX = localStorage.getItem("playerPositionX");
    const storedY = localStorage.getItem("playerPositionY");
    console.log({ storedX, storedY });

    if (storedX !== null && storedY !== null) {
      const x = parseInt(storedX, 10);
      const y = parseInt(storedY, 10);
      if (!isNaN(x) && !isNaN(y)) {
        // Ensure you pass a PhysicalPosition or LogicalPosition
        appWindow.setPosition(new PhysicalPosition(x, y));
      }
    }

    const checkWindowPosition = async () => {
      const position = await appWindow.innerPosition();

      if (
        position.x !== lastPosition.current.x ||
        position.y !== lastPosition.current.y
      ) {
        // Save the new position to localStorage
        localStorage.setItem("playerPositionX", position.x);
        localStorage.setItem("playerPositionY", position.y);

        // Update the lastPosition reference
        lastPosition.current = position;
      }
    };

    const interval = setInterval(checkWindowPosition, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isCommandPressed = false;

    const handleKeyDown = (e) => {
      if (e.metaKey) {
        isCommandPressed = true;
        document.getElementById("main").style.cursor = "move";
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Meta") {
        isCommandPressed = false;
        document.getElementById("main").style.cursor = "default";
      }
    };

    const handleMouseDown = async () => {
      if (isCommandPressed) {
        await appWindow.startDragging();
        document.getElementById("main").style.cursor = "move";
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return (
    <main id="main">
      <div id="drag" data-tauri-drag-region></div>
      <SpotifyPlayer />
    </main>
  );
};

export default App;

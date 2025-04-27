import { useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import SpotifyPlayer from "./SpotifyPlayer";
import "./styles/index.css";

const App = () => {
  useEffect(() => {
    const x = parseInt(localStorage.getItem("playerPositionX"));
    const y = parseInt(localStorage.getItem("playerPositionY"));

    appWindow.setPosition(x, y);

    let lastPosition = { x: null, y: null };

    const checkWindowPosition = async () => {
      const position = await appWindow.innerPosition();
      if (position.x !== lastPosition.x || position.y !== lastPosition.y) {
        localStorage.setItem("playerPositionX", position.x);
        localStorage.setItem("playerPositionY", position.y);
        lastPosition = position;
      }
    };

    const interval = setInterval(checkWindowPosition, 100);

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

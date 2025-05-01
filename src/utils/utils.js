import { invoke } from "@tauri-apps/api";

function isColorSimilar(color1, color2, threshold = 100) {
  const [r1, g1, b1] = color1.split(",").map(Number);
  const [r2, g2, b2] = color2.split(",").map(Number);

  const distance = Math.sqrt(
    2 * (r2 - r1) ** 2 + 4 * (g2 - g1) ** 2 + (b2 - b1) ** 2
  );

  return distance < threshold;
}

function adjustColorLightness(color, isBackgroundLight) {
  const [r, g, b] = color.split(",").map(Number);
  return isBackgroundLight
    ? [Math.max(r - 100, 0), Math.max(g - 100, 0), Math.max(b - 100, 0)].join(
        ","
      )
    : [
        Math.min(r + 100, 255),
        Math.min(g + 100, 255),
        Math.min(b + 100, 255),
      ].join(",");
}

function getContrastColor(color) {
  const [r, g, b] = color.split(",").map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "0,0,0" : "255,255,255";
}

function applyColorScheme(background, color) {
  const [r, g, b] = background.split(",").map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isBackgroundLight = luminance > 0.5;
  const finalColor = isColorSimilar(color, background, 120)
    ? adjustColorLightness(color, isBackgroundLight)
    : color;

  const transparentColor = `${finalColor},0.3`;

  const container = document.getElementById("spotify-container");
  if (container) {
    container.style.background = `rgb(${background})`;
    container.style.color = `rgb(${finalColor})`;
  }

  const trackname = document.getElementById("spotify-trackname");
  if (trackname) {
    trackname.style.color = `rgb(${finalColor})`;
  }

  const thumb = document.getElementById("spotify-playerthumb");
  if (thumb) {
    thumb.style.background = `rgb(${finalColor})`;
  }

  const thumbContainer = document.getElementById(
    "spotify-playerthumbcontainer"
  );
  if (thumbContainer) {
    thumbContainer.style.background = `rgba(${transparentColor})`;
  }

  document.querySelectorAll(".spotify-control").forEach((e) => {
    e.style.fill = `rgb(${finalColor})`;
  });

  const cover = document.getElementById("spotify-imageCover");
  cover.style.background = `linear-gradient(90deg, transparent, rgb(${background}))`;
}

export function getAverageRGB(e) {
  try {
    const img = e.target;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    context.drawImage(img, 0, 0, size, size);

    const { data: pixels } = context.getImageData(0, 0, size, size);
    const colorCounts = {};

    for (let i = 0; i < pixels.length; i += 4) {
      const r = Math.floor(pixels[i] / 5) * 5;
      const g = Math.floor(pixels[i + 1] / 5) * 5;
      const b = Math.floor(pixels[i + 2] / 5) * 5;
      const a = pixels[i + 3];

      if (a < 200 || (r < 15 && g < 15 && b < 15)) continue;

      const color = `${r},${g},${b}`;
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }

    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);

    const backgroundOptions = sortedColors.filter((color) => {
      const [r, g, b] = color?.split(",").map(Number);
      const variance = Math.max(
        Math.abs(r - g),
        Math.abs(r - b),
        Math.abs(g - b)
      );
      return variance > 15;
    });

    const background = backgroundOptions[0] || sortedColors[0];
    const colorOptions = sortedColors.filter(
      (color) => !isColorSimilar(color, background, 60)
    );

    const color = colorOptions[0] || getContrastColor(background);
    applyColorScheme(background, color);
  } catch (error) {
    console.error("Error in getAverageRGB:", error);
    applyColorScheme("128,128,128", "255,255,255");
  }
}

export const formatTime = (time) => {
  let minutes = Math.floor(time / 60);
  let seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const commandSpotify = async (verb) => {
  try {
    await invoke("control_spotify", { action: verb });
  } catch (error) {
    console.error(`Error controlling Spotify (${verb}):`, error);
  }
};


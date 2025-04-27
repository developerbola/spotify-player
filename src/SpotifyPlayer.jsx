import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./styles/SpotifyPlayer.css";

const SpotifyPlayer = () => {
  const [spotifyData, setSpotifyData] = useState({
    track_name: "Not Running",
    artist: "",
    album_art: "",
    is_playing: false,
    time_played: 0,
    total_time: 0,
  });
  const [perc, setPerc] = useState(0);
  const [trackChanged, setTrackChanged] = useState(false);

  const imageRef = useRef(null);
  const previousTrackRef = useRef(null);

  // Spotify data polling
  useEffect(() => {
    const getSpotifyData = async () => {
      try {
        const data = await invoke("get_spotify_data");
        if (data) {
          // Detect track change
          if (
            previousTrackRef.current &&
            previousTrackRef.current !== data.track_name
          ) {
            setTrackChanged(true);
            setTimeout(() => setTrackChanged(false), 500);
          }

          previousTrackRef.current = data.track_name;
          setSpotifyData(data);

          if (
            typeof data.time_played === "number" &&
            typeof data.total_time === "number" &&
            data.total_time > 0
          ) {
            const percentage = Math.floor(
              (data.time_played / data.total_time) * 100000
            );
            setPerc(percentage);
          } else {
            setPerc(0);
          }
        }
      } catch (error) {
        console.error("Error fetching Spotify data:", error);
      }
    };

    const interval = setInterval(getSpotifyData, 800);
    return () => clearInterval(interval);
  }, []);

  const commandSpotify = async (verb) => {
    try {
      await invoke("control_spotify", { action: verb });
    } catch (error) {
      console.error(`Error controlling Spotify (${verb}):`, error);
    }
  };

  const handleImageLoad = (e) => {
    e.target.style.filter = "blur(0px)";
    e.target.style.opacity = "1";
    getAverageRGB(e);
  };

  function getAverageRGB(e) {
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
        const [r, g, b] = color.split(",").map(Number);
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

  function isColorSimilar(color1, color2, threshold = 100) {
    const [r1, g1, b1] = color1.split(",").map(Number);
    const [r2, g2, b2] = color2.split(",").map(Number);

    const distance = Math.sqrt(
      2 * (r2 - r1) ** 2 + 4 * (g2 - g1) ** 2 + (b2 - b1) ** 2
    );

    return distance < threshold;
  }

  function getContrastColor(color) {
    const [r, g, b] = color.split(",").map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "0,0,0" : "255,255,255";
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
      if (spotifyData.track_name !== "Not Running") {
        container.style.background = `rgb(${background})`;
      }
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
    if (cover) {
      cover.style.background = `linear-gradient(90deg, transparent, rgb(${background}))`;
    }
  }

  const formatTime = (time) => {
    let minutes = Math.floor(time / 60);
    let seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleTrackChange = () => {
    if (imageRef.current) {
      imageRef.current.style.filter = "blur(10px)";
      imageRef.current.style.opacity = "0.7";
    }
  };

  useEffect(() => {
    if (trackChanged) handleTrackChange();
  }, [trackChanged]);

  return (
    <div id="spotify-container" className="spotify-container">
      <div className="spotify-cover">
        <img
          ref={imageRef}
          className={`spotify-albumImg ${trackChanged ? "spotify-blur" : ""}`}
          src={spotifyData.album_art || "default-album.jpg"}
          alt="Album Art"
          crossOrigin="anonymous"
          loading="eager"
          onLoad={handleImageLoad}
        />

        <div id="spotify-imageCover" className="spotify-imageCover"></div>
      </div>

      <div className="spotify-right">
        {/* Track Name and Controls */}
        <div className="spotify-title">
          <div
            id="spotify-trackname"
            className="spotify-trackName"
            style={{
              animation: trackChanged ? "fadeIn 0.5s ease-in-out" : "none",
            }}
          >
            {spotifyData.track_name || "Not Running"}
          </div>
          <div className="spotify-controls">
            {/* Previous Button */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="spotify-control"
              height={15}
              width={15}
              onClick={() => {
                commandSpotify("previous");
                handleTrackChange();
              }}
            >
              <path d="M459.5 440.6c9.5 7.9 22.8 9.7 34.1 4.4s18.4-16.6 18.4-29l0-320c0-12.4-7.2-23.7-18.4-29s-24.5-3.6-34.1 4.4L288 214.3l0 41.7 0 41.7L459.5 440.6zM256 352l0-96 0-128 0-32c0-12.4-7.2-23.7-18.4-29s-24.5-3.6-34.1 4.4l-192 160C4.2 237.5 0 246.5 0 256s4.2 18.5 11.5 24.6l192 160c9.5 7.9 22.8 9.7 34.1 4.4s18.4-16.6 18.4-29l0-64z" />
            </svg>

            {/* Play/Pause Button */}
            {!spotifyData.is_playing ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
                className="spotify-control"
                height={16}
                width={18}
                onClick={() => commandSpotify("play")}
              >
                <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 320 512"
                className="spotify-control"
                height={18}
                width={18}
                style={{ marginBottom: 1 }}
                onClick={() => commandSpotify("pause")}
              >
                <path d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z" />
              </svg>
            )}

            {/* Next Button */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="spotify-control"
              height={15}
              width={15}
              onClick={() => {
                commandSpotify("next");
                handleTrackChange();
              }}
            >
              <path d="M52.5 440.6c-9.5 7.9-22.8 9.7-34.1 4.4S0 428.4 0 416L0 96C0 83.6 7.2 72.3 18.4 67s24.5-3.6 34.1 4.4L224 214.3l0 41.7 0 41.7L52.5 440.6zM256 352l0-96 0-128 0-32c0-12.4 7.2-23.7 18.4-29s24.5-3.6 34.1 4.4l192 160c7.3 6.1 11.5 15.1 11.5 24.6s-4.2 18.5-11.5 24.6l-192 160c-9.5 7.9-22.8 9.7-34.1 4.4s-18.4-16.6-18.4-29l0-64z" />
            </svg>
          </div>
        </div>

        {/* Player Thumb */}
        <div className="spotify-player">
          <div
            id="spotify-playerthumbcontainer"
            className="spotify-playerThumbContainer"
          >
            <div
              id="spotify-playerthumb"
              className="spotify-playerThumb"
              style={{
                width: perc ? `${perc}%` : 0,
                opacity: perc ? "1" : "0.3",
              }}
            ></div>
          </div>
          <span className="spotify-timePlayed">
            {isNaN(spotifyData.time_played)
              ? "0:00"
              : formatTime(spotifyData.time_played) || "0:00"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpotifyPlayer;

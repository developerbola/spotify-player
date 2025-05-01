import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./styles/SpotifyPlayer.css";
import { commandSpotify, formatTime, getAverageRGB } from "./utils/utils";

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
  const prevCoverRef = useRef("");

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

          // Check if the album art has changed
          if (prevCoverRef.current !== data.album_art) {
            // If the album art has changed, apply the blur effect
            if (imageRef.current) {
              imageRef.current.style.filter = "blur(10px)";
              imageRef.current.style.opacity = "0.7";
            }
          } else {
            // If the album art is the same, remove the blur effect
            if (imageRef.current) {
              imageRef.current.style.filter = "none";
              imageRef.current.style.opacity = "1";
            }
          }

          previousTrackRef.current = data.track_name;
          prevCoverRef.current = data.album_art;
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

  const handleImageLoad = (e) => {
    e.target.style.filter = "blur(0px)";
    e.target.style.opacity = "1";
    getAverageRGB(e);
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
                height={17}
                width={17}
                onClick={() => commandSpotify("play")}
              >
                <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 320 512"
                className="spotify-control"
                height={17}
                width={17}
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

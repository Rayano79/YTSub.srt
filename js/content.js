(async () => {
  const video = document.querySelector("video");
  if (!video) return;

  const videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) return;

  const stored = await chrome.storage.local.get(videoId);
  const srtText = stored[videoId];
  if (!srtText) {
    console.log("No local subtitle for this video.");
    return;
  }

  const subtitles = parseSRT(srtText);
  let isEnabled = true;

  const playerContainer =
    document.querySelector("#movie_player") ||
    video.closest("ytd-player") ||
    video.parentElement;

  const subtitleDiv = document.createElement("div");
  subtitleDiv.id = "ytsub-srt-subtitles";
  playerContainer.appendChild(subtitleDiv);

  // Apply user settings
  const applyUserSettings = async () => {
    const { subtitleSettings } = await chrome.storage.local.get("subtitleSettings");
    if (!subtitleSettings) return;

    // Update enabled state
    if (typeof subtitleSettings.enabled !== "undefined") {
      isEnabled = subtitleSettings.enabled;
      if (!isEnabled) {
        subtitleDiv.innerHTML = "";
      }
    }

    subtitleDiv.style.fontSize = subtitleSettings.fontSize + "vw";

    // Text shadow
    if (subtitleSettings.shadow) {
      const alpha = (subtitleSettings.opacity || 80) / 100;
      subtitleDiv.style.textShadow = `2px 2px 5px rgba(0,0,0,${alpha.toFixed(2)})`;
    } else {
      subtitleDiv.style.textShadow = "none";
    }

    // Background
    subtitleDiv.dataset.bgEnabled = subtitleSettings.background ? "true" : "false";
    subtitleDiv.dataset.bgOpacity = subtitleSettings.bgOpacity || 60;
  };
  await applyUserSettings();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.subtitleSettings) applyUserSettings();
  });

  // Listen for messages from popup to control subtitles
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSubtitles") {
      isEnabled = request.enabled;
      if (!isEnabled) {
        subtitleDiv.innerHTML = "";
      }
    }
  });

  // Update subtitles based on video time
  video.addEventListener("timeupdate", () => {
    // If subtitles are disabled, do nothing
    if (!isEnabled) {
      return;
    }

    const t = video.currentTime;
    const sub = subtitles.find((s) => s.start <= t && s.end >= t);

    if (sub) {
      // Keep <font> tags to preserve colors
      const rawHTML = sub.text.trim();

      // Detect text direction based on language
      const rtlRegex = /[\u0600-\u06FF]/;
      const dir = rtlRegex.test(rawHTML) ? "rtl" : "ltr";

      // Display text inside background span
      subtitleDiv.innerHTML = `<span class="ray-bg" style="direction:${dir}; unicode-bidi:plaintext;">${rawHTML}</span>`;

      // Setup background
      const bg = subtitleDiv.querySelector(".ray-bg");
      if (subtitleDiv.dataset.bgEnabled === "true") {
        const op = subtitleDiv.dataset.bgOpacity / 100;
        bg.style.backgroundColor = `rgba(0,0,0,${op})`;
      } else {
        bg.style.background = "transparent";
      }
    } else {
      subtitleDiv.innerHTML = "";
    }
  });

  // Reposition subtitles when video size changes
  const resizeObserver = new ResizeObserver(() => positionSubtitle(subtitleDiv));
  resizeObserver.observe(video);
  
  // Also observe the player container
  if (playerContainer && playerContainer !== video) {
    resizeObserver.observe(playerContainer);
  }
  
  // Initial positioning with multiple delays to ensure video is ready
  setTimeout(() => positionSubtitle(subtitleDiv), 100);
  setTimeout(() => positionSubtitle(subtitleDiv), 300);
  setTimeout(() => positionSubtitle(subtitleDiv), 600);
  
  // Monitor fullscreen changes
  document.addEventListener("fullscreenchange", () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 50);
  });
  document.addEventListener("webkitfullscreenchange", () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 50);
  });
  
  // Monitor window resize
  window.addEventListener("resize", () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 50);
  });
  
  // Reposition when video starts playing
  video.addEventListener("play", () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 100);
  });
  
  // Reposition when video metadata is loaded
  video.addEventListener("loadedmetadata", () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 100);
  });

  function positionSubtitle(div) {
    const rect = video.getBoundingClientRect();
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    
    // Calculate safe bottom position (raised by 15px to avoid YouTube controls)
    const bottomOffset = isFullscreen ? rect.height * 0.10 : rect.height * 0.12;
    const bottomPosition = window.innerHeight - rect.bottom + bottomOffset + 15;
    
    // Calculate center position - use video's actual center
    const centerX = rect.left + (rect.width / 2);
    
    div.style.position = "fixed";
    div.style.left = `${centerX}px`;
    div.style.bottom = `${bottomPosition}px`;
    div.style.transform = "translateX(-50%)";
    div.style.width = `${rect.width * 0.95}px`;
    div.style.maxWidth = "90%";
    div.style.textAlign = "center";
    div.style.pointerEvents = "none";
    div.style.zIndex = "9999";
  }
})();

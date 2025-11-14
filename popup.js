const fileInput = document.getElementById("srtFile");
const urlInput = document.getElementById("videoUrl");
const status = document.getElementById("status");
const uploadBtn = document.getElementById("uploadBtn");
const toggleSubsCheckbox = document.getElementById("toggleSubsCheckbox");
const viewSubsBtn = document.getElementById("viewSubsBtn");
const subsModal = document.getElementById("subsModal");
const closeModal = document.querySelector(".close");
const videoList = document.getElementById("videoList");

const fontLabel = document.getElementById("fontSizeLabel");
const fontSizeSlider = document.getElementById("fontSizeSlider");
const shadowToggle = document.getElementById("shadowToggle");
const shadowSettings = document.getElementById("shadowSettings");
const shadowOpacity = document.getElementById("shadowOpacity");
const shadowOpacityLabel = document.getElementById("shadowOpacityLabel");
const bgToggle = document.getElementById("bgToggle");
const bgSettings = document.getElementById("bgSettings");
const bgOpacity = document.getElementById("bgOpacity");
const bgOpacityLabel = document.getElementById("bgOpacityLabel");

let settings = { fontSize: 1.3, shadow: true, opacity: 80, background: true, bgOpacity: 60, enabled: true };

// Extract Video ID from various sources
function extractVideoId(input) {
  if (!input) return null;
  
  // Try to extract from URL
  try {
    const url = new URL(input);
    if (url.searchParams.has("v")) {
      return url.searchParams.get("v");
    }
    // Check for youtu.be short links
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("?")[0];
    }
  } catch {}
  
  // Try regex pattern for video ID in URL
  const urlPattern = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const urlMatch = input.match(urlPattern);
  if (urlMatch) return urlMatch[1];
  
  // Try to extract from filename (if it looks like a video ID)
  const filenamePattern = /([a-zA-Z0-9_-]{11})/;
  const filenameMatch = input.match(filenamePattern);
  if (filenameMatch) return filenameMatch[1];
  
  return null;
}

// Upload Subtitle
uploadBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    showStatus("Please select an SRT file.", "error");
    return;
  }

  const file = fileInput.files[0];
  const text = await file.text();

  let videoId = "";
  const url = urlInput.value.trim();
  
  // Priority 1: Manual URL input (if provided and valid)
  if (url) {
    videoId = extractVideoId(url);
    if (!videoId) {
      showStatus("Invalid YouTube URL. Trying filename...", "error");
    }
  }
  
  // Priority 2: Extract from filename
  if (!videoId) {
    const filename = file.name.replace(".srt", "");
    videoId = extractVideoId(filename);
  }
  
  // Priority 3: Get from current active tab
  if (!videoId) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url.includes("youtube.com/watch") || tab.url.includes("youtu.be")) {
        videoId = extractVideoId(tab.url);
      }
    } catch (e) {
      console.log("Could not access current tab");
    }
  }

  if (!videoId) {
    showStatus("Unable to detect video ID. Please enter the YouTube link or name the file with video ID.", "error");
    return;
  }

  // Try to get video title
  let videoTitle = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes("youtube.com/watch") || tab.url.includes("youtu.be"))) {
      // Extract title from YouTube page title (format: "Video Title - YouTube")
      videoTitle = tab.title.replace(" - YouTube", "").trim();
    }
  } catch (e) {
    console.log("Could not get video title from tab");
  }

  // If no title from tab, try to fetch from YouTube oEmbed API
  if (!videoTitle) {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (response.ok) {
        const data = await response.json();
        videoTitle = data.title;
      }
    } catch (e) {
      console.log("Could not fetch video title from API");
    }
  }

  // Fallback to video ID if no title found
  if (!videoTitle) {
    videoTitle = videoId;
  }

  // Store subtitle with video ID and metadata
  const subsData = await chrome.storage.local.get("subtitlesList") || {};
  const subtitlesList = subsData.subtitlesList || {};
  
  subtitlesList[videoId] = {
    text: text,
    filename: file.name,
    title: videoTitle,
    date: new Date().toISOString()
  };
  
  await chrome.storage.local.set({ 
    [videoId]: text,
    subtitlesList: subtitlesList
  });
  
  showStatus(`✅ Subtitle saved successfully!<br><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">Open video</a>`, "success");
  
  // Clear inputs
  fileInput.value = "";
  urlInput.value = "";
});

// Toggle Subtitles Enable/Disable
toggleSubsCheckbox.addEventListener("change", () => {
  settings.enabled = toggleSubsCheckbox.checked;
  saveSettings();
  
  // Notify content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: "toggleSubtitles", 
        enabled: settings.enabled 
      }).catch(() => {});
    }
  });
});

// Helper function to fetch video title from YouTube
async function fetchVideoTitle(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return data.title;
    }
  } catch (e) {
    console.log("Could not fetch video title:", e);
  }
  return null;
}

// View Subtitles List
viewSubsBtn.addEventListener("click", async () => {
  const data = await chrome.storage.local.get("subtitlesList");
  const subtitlesList = data.subtitlesList || {};
  
  videoList.innerHTML = '<div class="empty-state">Loading...</div>';
  
  const videoIds = Object.keys(subtitlesList);
  
  if (videoIds.length === 0) {
    videoList.innerHTML = '<div class="empty-state">No subtitles saved yet</div>';
  } else {
    videoList.innerHTML = "";
    
    // Fetch titles for all videos
    for (const videoId of videoIds) {
      const sub = subtitlesList[videoId];
      
      // Try to get title from storage first, if not available fetch from API
      let videoTitle = sub.title;
      if (!videoTitle || videoTitle === videoId) {
        videoTitle = await fetchVideoTitle(videoId);
        
        // Update storage with fetched title
        if (videoTitle) {
          subtitlesList[videoId].title = videoTitle;
          await chrome.storage.local.set({ subtitlesList: subtitlesList });
        }
      }
      
      const li = document.createElement("li");
      li.className = "video-item";
      
      const displayTitle = videoTitle || videoId;
      const displayFilename = sub.filename || videoId;
      
      // Format date and time
      const dateObj = new Date(sub.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      const formattedTime = dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      
      li.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
          <strong title="${displayTitle}">${displayTitle}</strong><br>
          <small style="color: #777; display: block; margin-top: 3px;">${displayFilename}</small><br>
          <small style="color: #999; display: block; margin-top: 2px;">📅 ${formattedDate} • 🕐 ${formattedTime}</small>
        </a>
        <button class="delete-btn" data-id="${videoId}">🗑️ Delete</button>
      `;
      
      videoList.appendChild(li);
    }
    
    // Add delete handlers
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const videoId = btn.getAttribute("data-id");
        
        if (confirm("Are you sure you want to delete this subtitle?")) {
          const data = await chrome.storage.local.get("subtitlesList");
          const subtitlesList = data.subtitlesList || {};
          
          delete subtitlesList[videoId];
          await chrome.storage.local.remove(videoId);
          await chrome.storage.local.set({ subtitlesList: subtitlesList });
          
          // Refresh the list
          viewSubsBtn.click();
        }
      });
    });
  }
  
  subsModal.style.display = "block";
});

// Close Modal
closeModal.addEventListener("click", () => {
  subsModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === subsModal) {
    subsModal.style.display = "none";
  }
});

// Helper function to show status messages
function showStatus(message, type = "") {
  if (message) {
    status.innerHTML = message;
    status.className = type;
    setTimeout(() => {
      status.innerHTML = "";
      status.className = "";
    }, 5000);
  } else {
    status.innerHTML = "";
    status.className = "";
  }
}

// Load Settings
chrome.storage.local.get("subtitleSettings", (res) => {
  if (res.subtitleSettings) {
    settings = { ...settings, ...res.subtitleSettings };
  }
  updateUI();
  toggleSubsCheckbox.checked = settings.enabled;
});

fontSizeSlider.oninput = () => {
  const size = parseInt(fontSizeSlider.value);
  settings.fontSize = size / 10; // Convert to vw units
  fontLabel.innerText = size + "px";
  saveSettings();
};

shadowToggle.onchange = () => {
  settings.shadow = shadowToggle.checked;
  shadowSettings.style.display = settings.shadow ? "block" : "none";
  saveSettings();
};

shadowOpacity.oninput = () => {
  settings.opacity = parseInt(shadowOpacity.value);
  shadowOpacityLabel.innerText = settings.opacity + "%";
  updateSliderProgress(shadowOpacity, settings.opacity);
  saveSettings();
};

bgToggle.onchange = () => {
  settings.background = bgToggle.checked;
  bgSettings.style.display = settings.background ? "block" : "none";
  saveSettings();
};

bgOpacity.oninput = () => {
  settings.bgOpacity = parseInt(bgOpacity.value);
  bgOpacityLabel.innerText = settings.bgOpacity + "%";
  updateSliderProgress(bgOpacity, settings.bgOpacity);
  saveSettings();
};


function saveSettings() {
  chrome.storage.local.set({ subtitleSettings: settings });
}

function updateSliderProgress(slider, value) {
  const percentage = value + "%";
  slider.style.setProperty('--value', percentage);
}

function updateUI() {
  const fontSize = Math.round(settings.fontSize * 10);
  fontLabel.innerText = fontSize + "px";
  fontSizeSlider.value = fontSize;
  
  shadowToggle.checked = settings.shadow;
  shadowSettings.style.display = settings.shadow ? "block" : "none";
  shadowOpacity.value = settings.opacity;
  shadowOpacityLabel.innerText = settings.opacity + "%";
  updateSliderProgress(shadowOpacity, settings.opacity);

  bgToggle.checked = settings.background;
  bgSettings.style.display = settings.background ? "block" : "none";
  bgOpacity.value = settings.bgOpacity;
  bgOpacityLabel.innerText = settings.bgOpacity + "%";
  updateSliderProgress(bgOpacity, settings.bgOpacity);
}


// Global state to track current video and cleanup functions
let currentVideoId = null;
let cleanupFunctions = [];
let subtitleDiv = null;
let resizeObserver = null;
let timeUpdateHandler = null;
let storageListener = null;
let messageListener = null;

// Function to get current video ID from URL
function getCurrentVideoId() {
  return new URLSearchParams(window.location.search).get("v");
}

// Function to clean up previous video's resources
function cleanup() {
  // Clear subtitle display
  if (subtitleDiv) {
    subtitleDiv.innerHTML = "";
  }
  
  // Remove all event listeners
  cleanupFunctions.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  });
  cleanupFunctions = [];
  
  // Disconnect resize observer
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  // Remove storage listener
  if (storageListener) {
    chrome.storage.onChanged.removeListener(storageListener);
    storageListener = null;
  }
  
  // Remove message listener
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
    messageListener = null;
  }
  
  currentVideoId = null;
}

// Function to initialize subtitles for a video
async function initializeSubtitles() {
// Global state to track current video and cleanup functions
let currentVideoId = null;
let cleanupFunctions = [];
let subtitleDiv = null;
let resizeObserver = null;
let timeUpdateHandler = null;
let storageListener = null;
let messageListener = null;

// Function to get current video ID from URL
function getCurrentVideoId() {
  return new URLSearchParams(window.location.search).get("v");
}

// Function to clean up previous video's resources
function cleanup() {
  // Clear subtitle display
  if (subtitleDiv) {
    subtitleDiv.innerHTML = "";
  }
  
  // Remove all event listeners
  cleanupFunctions.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  });
  cleanupFunctions = [];
  
  // Disconnect resize observer
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  // Remove storage listener
  if (storageListener) {
    chrome.storage.onChanged.removeListener(storageListener);
    storageListener = null;
  }
  
  // Remove message listener
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
    messageListener = null;
  }
  
  currentVideoId = null;
}

// Function to initialize subtitles for a video
async function initializeSubtitles() {
  const video = document.querySelector("video");
  if (!video) return;

  const videoId = getCurrentVideoId();
  if (!videoId) {
    cleanup();
    return;
  }

  // If same video, don't reinitialize
  if (currentVideoId === videoId) {
    return;
  }

  // Clean up previous video
  cleanup();

  // Set current video ID
  currentVideoId = videoId;

  // Check if subtitles exist for this video
  const videoId = getCurrentVideoId();
  if (!videoId) {
    cleanup();
    return;
  }

  // If same video, don't reinitialize
  if (currentVideoId === videoId) {
    return;
  }

  // Clean up previous video
  cleanup();

  // Set current video ID
  currentVideoId = videoId;

  // Check if subtitles exist for this video
  const stored = await chrome.storage.local.get(videoId);
  const srtText = stored[videoId];
  if (!srtText) {
    console.log("No local subtitle for this video.");
    // Remove subtitle div if it exists
    const existingDiv = document.getElementById("ytsub-srt-subtitles");
    if (existingDiv) {
      existingDiv.remove();
      subtitleDiv = null;
    }
    // Remove subtitle div if it exists
    const existingDiv = document.getElementById("ytsub-srt-subtitles");
    if (existingDiv) {
      existingDiv.remove();
      subtitleDiv = null;
    }
    return;
  }

  const subtitles = parseSRT(srtText);
  let isEnabled = true;
  let originalFontSize = 1.3; // Store original font size in vw (for calculation)
  let baseFontSizePx = null; // Store base font size in pixels (constant)
  let originalFontSize = 1.3; // Store original font size in vw (for calculation)
  let baseFontSizePx = null; // Store base font size in pixels (constant)

  const playerContainer =
    document.querySelector("#movie_player") ||
    video.closest("ytd-player") ||
    video.parentElement;

  // Remove existing subtitle div if it exists
  const existingDiv = document.getElementById("ytsub-srt-subtitles");
  if (existingDiv) {
    existingDiv.remove();
  }

  subtitleDiv = document.createElement("div");
  // Remove existing subtitle div if it exists
  const existingDiv = document.getElementById("ytsub-srt-subtitles");
  if (existingDiv) {
    existingDiv.remove();
  }

  subtitleDiv = document.createElement("div");
  subtitleDiv.id = "ytsub-srt-subtitles";
  
  // Ensure player container has position relative for absolute positioning
  const containerStyle = window.getComputedStyle(playerContainer);
  if (containerStyle.position === 'static') {
    playerContainer.style.position = 'relative';
  }
  
  playerContainer.appendChild(subtitleDiv);

  // Function to calculate base font size in pixels (constant size)
  function calculateBaseFontSizePx() {
    // Use viewport width to calculate a base pixel size
    // This ensures consistent size across all video modes
    const viewportWidth = window.innerWidth;
    // Convert vw to px: 1vw = viewportWidth / 100
    return (originalFontSize * viewportWidth) / 100;
  }

  // Function to intelligently wrap long text that wasn't split in SRT file
  function smartWrapText(text, maxWidth, fontSize) {
    // Check if text already has line breaks (was split in SRT)
    // If text contains \n, it means it was already formatted in SRT file
    // We should preserve it exactly as is, without any re-wrapping
    const hasLineBreaks = text.includes('\n');
    
    if (hasLineBreaks) {
      // Text was already split/formatted in SRT file
      // Return it exactly as is to preserve the original formatting
      return text;
    }
    
    // Text wasn't split, we need to wrap it intelligently
    // Create a temporary element to measure text width with HTML
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'nowrap';
    tempDiv.style.fontSize = fontSize + 'px';
    tempDiv.style.fontFamily = subtitleDiv.style.fontFamily || 'Segoe UI, Arial, sans-serif';
    document.body.appendChild(tempDiv);
    
    // Extract plain text for word splitting
    const tempTextDiv = document.createElement('div');
    tempTextDiv.innerHTML = text;
    const plainText = tempTextDiv.textContent || tempTextDiv.innerText || '';
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    
    // If no words or single word, return as is
    if (words.length <= 1) {
      document.body.removeChild(tempDiv);
      return text;
    }
    
    // Check if text has HTML tags (like <font>)
    const hasHTML = /<[^>]+>/.test(text);
    const fontTagMatch = text.match(/<font[^>]*>/);
    const fontCloseTag = '</font>';
    
    const lines = [];
    let currentLineWords = [];
    
    // Build lines word by word
    for (let i = 0; i < words.length; i++) {
      currentLineWords.push(words[i]);
      const testText = currentLineWords.join(' ');
      
      // Measure with HTML if present
      if (hasHTML && fontTagMatch) {
        tempDiv.innerHTML = fontTagMatch[0] + testText + fontCloseTag;
      } else {
        tempDiv.textContent = testText;
      }
      
      if (tempDiv.offsetWidth > maxWidth && currentLineWords.length > 1) {
        // Current line is too long, save previous words and start new line
        const savedWords = currentLineWords.slice(0, -1); // All except last word
        lines.push(savedWords.join(' '));
        currentLineWords = [words[i]]; // Start new line with current word
      }
    }
    
    // Add remaining words as last line
    if (currentLineWords.length > 0) {
      lines.push(currentLineWords.join(' '));
    }
    
    document.body.removeChild(tempDiv);
    
    // If we only have one line, return original text (no wrapping needed)
    if (lines.length <= 1) {
      return text;
    }
    
    // Reconstruct text with HTML tags preserved on each line
    let result = '';
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) result += '\n';
      if (hasHTML && fontTagMatch) {
        result += fontTagMatch[0] + lines[i] + fontCloseTag;
      } else {
        result += lines[i];
      }
    }
    
    return result;
  }

  // Function to calculate base font size in pixels (constant size)
  function calculateBaseFontSizePx() {
    // Use viewport width to calculate a base pixel size
    // This ensures consistent size across all video modes
    const viewportWidth = window.innerWidth;
    // Convert vw to px: 1vw = viewportWidth / 100
    return (originalFontSize * viewportWidth) / 100;
  }

  // Function to intelligently wrap long text that wasn't split in SRT file
  function smartWrapText(text, maxWidth, fontSize) {
    // Check if text already has line breaks (was split in SRT)
    // If text contains \n, it means it was already formatted in SRT file
    // We should preserve it exactly as is, without any re-wrapping
    const hasLineBreaks = text.includes('\n');
    
    if (hasLineBreaks) {
      // Text was already split/formatted in SRT file
      // Return it exactly as is to preserve the original formatting
      return text;
    }
    
    // Text wasn't split, we need to wrap it intelligently
    // Create a temporary element to measure text width with HTML
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'nowrap';
    tempDiv.style.fontSize = fontSize + 'px';
    tempDiv.style.fontFamily = subtitleDiv.style.fontFamily || 'Segoe UI, Arial, sans-serif';
    document.body.appendChild(tempDiv);
    
    // Extract plain text for word splitting
    const tempTextDiv = document.createElement('div');
    tempTextDiv.innerHTML = text;
    const plainText = tempTextDiv.textContent || tempTextDiv.innerText || '';
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    
    // If no words or single word, return as is
    if (words.length <= 1) {
      document.body.removeChild(tempDiv);
      return text;
    }
    
    // Check if text has HTML tags (like <font>)
    const hasHTML = /<[^>]+>/.test(text);
    const fontTagMatch = text.match(/<font[^>]*>/);
    const fontCloseTag = '</font>';
    
    const lines = [];
    let currentLineWords = [];
    
    // Build lines word by word
    for (let i = 0; i < words.length; i++) {
      currentLineWords.push(words[i]);
      const testText = currentLineWords.join(' ');
      
      // Measure with HTML if present
      if (hasHTML && fontTagMatch) {
        tempDiv.innerHTML = fontTagMatch[0] + testText + fontCloseTag;
      } else {
        tempDiv.textContent = testText;
      }
      
      if (tempDiv.offsetWidth > maxWidth && currentLineWords.length > 1) {
        // Current line is too long, save previous words and start new line
        const savedWords = currentLineWords.slice(0, -1); // All except last word
        lines.push(savedWords.join(' '));
        currentLineWords = [words[i]]; // Start new line with current word
      }
    }
    
    // Add remaining words as last line
    if (currentLineWords.length > 0) {
      lines.push(currentLineWords.join(' '));
    }
    
    document.body.removeChild(tempDiv);
    
    // If we only have one line, return original text (no wrapping needed)
    if (lines.length <= 1) {
      return text;
    }
    
    // Reconstruct text with HTML tags preserved on each line
    let result = '';
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) result += '\n';
      if (hasHTML && fontTagMatch) {
        result += fontTagMatch[0] + lines[i] + fontCloseTag;
      } else {
        result += lines[i];
      }
    }
    
    return result;
  }

  // Apply user settings
  const applyUserSettings = async () => {
    const { subtitleSettings } = await chrome.storage.local.get("subtitleSettings");
    
    // Default settings if none exist
    const defaultSettings = { 
      fontSize: 1.3, 
      fontSize: 1.3, 
      shadow: true, 
      opacity: 80, 
      background: true, 
      bgOpacity: 60, 
      enabled: true 
    };
    
    const settings = subtitleSettings ? { ...defaultSettings, ...subtitleSettings } : defaultSettings;

    // Update enabled state
    if (typeof settings.enabled !== "undefined") {
      isEnabled = settings.enabled;
      if (!isEnabled) {
        subtitleDiv.innerHTML = "";
      }
    }

    originalFontSize = settings.fontSize;
    // Calculate base font size in pixels (constant)
    baseFontSizePx = calculateBaseFontSizePx();
    subtitleDiv.style.fontSize = baseFontSizePx + "px";
    // Calculate base font size in pixels (constant)
    baseFontSizePx = calculateBaseFontSizePx();
    subtitleDiv.style.fontSize = baseFontSizePx + "px";

    // Text shadow
    if (settings.shadow) {
      const alpha = (settings.opacity || 80) / 100;
      subtitleDiv.style.textShadow = `2px 2px 5px rgba(0,0,0,${alpha.toFixed(2)})`;
    } else {
      subtitleDiv.style.textShadow = "none";
    }

    // Background
    subtitleDiv.dataset.bgEnabled = settings.background ? "true" : "false";
    subtitleDiv.dataset.bgOpacity = settings.bgOpacity || 60;
  };
  await applyUserSettings();

  // Storage change listener
  storageListener = (changes) => {
  // Storage change listener
  storageListener = (changes) => {
    if (changes.subtitleSettings) applyUserSettings();
  };
  chrome.storage.onChanged.addListener(storageListener);
  cleanupFunctions.push(() => {
    if (storageListener) {
      chrome.storage.onChanged.removeListener(storageListener);
    }
  };
  chrome.storage.onChanged.addListener(storageListener);
  cleanupFunctions.push(() => {
    if (storageListener) {
      chrome.storage.onChanged.removeListener(storageListener);
    }
  });

  // Listen for messages from popup to control subtitles
  messageListener = (request, sender, sendResponse) => {
  messageListener = (request, sender, sendResponse) => {
    if (request.action === "toggleSubtitles") {
      isEnabled = request.enabled;
      if (!isEnabled) {
        subtitleDiv.innerHTML = "";
      }
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);
  cleanupFunctions.push(() => {
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);
  cleanupFunctions.push(() => {
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  });

  // Update subtitles based on video time
  timeUpdateHandler = () => {
  timeUpdateHandler = () => {
    // If subtitles are disabled, do nothing
    if (!isEnabled) {
      return;
    }

    const t = video.currentTime;
    const sub = subtitles.find((s) => s.start <= t && s.end >= t);

    if (sub) {
      // Keep <font> tags to preserve colors
      // Trim only leading/trailing whitespace, preserve internal line breaks
      let rawHTML = sub.text;
      // Remove leading/trailing whitespace but preserve \n in the middle
      rawHTML = rawHTML.replace(/^\s+|\s+$/g, '');

      // Get video width for smart wrapping
      const videoRect = video.getBoundingClientRect();
      const maxWidth = videoRect.width * 0.95;

      // Intelligently wrap text if it wasn't split in SRT file
      // Use baseFontSizePx if available, otherwise fallback to calculated size
      const fontSizeToUse = baseFontSizePx || calculateBaseFontSizePx();
      rawHTML = smartWrapText(rawHTML, maxWidth, fontSizeToUse);
      // Trim only leading/trailing whitespace, preserve internal line breaks
      let rawHTML = sub.text;
      // Remove leading/trailing whitespace but preserve \n in the middle
      rawHTML = rawHTML.replace(/^\s+|\s+$/g, '');

      // Get video width for smart wrapping
      const videoRect = video.getBoundingClientRect();
      const maxWidth = videoRect.width * 0.95;

      // Intelligently wrap text if it wasn't split in SRT file
      // Use baseFontSizePx if available, otherwise fallback to calculated size
      const fontSizeToUse = baseFontSizePx || calculateBaseFontSizePx();
      rawHTML = smartWrapText(rawHTML, maxWidth, fontSizeToUse);

      // Detect text direction based on language
      const rtlRegex = /[\u0600-\u06FF]/;
      const dir = rtlRegex.test(rawHTML) ? "rtl" : "ltr";

      // Split text by line breaks and display each line separately
      const lines = rawHTML.split('\n');
      const linesHTML = lines.map(line => 
        `<div class="ray-line">${line}</div>`
      ).join('');
      
      // Display text inside background span
      subtitleDiv.innerHTML = `<span class="ray-bg" style="direction:${dir}; unicode-bidi:plaintext;">${linesHTML}</span>`;

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
  };
  video.addEventListener("timeupdate", timeUpdateHandler);
  cleanupFunctions.push(() => {
    if (video && timeUpdateHandler) {
      video.removeEventListener("timeupdate", timeUpdateHandler);
    }
  };
  video.addEventListener("timeupdate", timeUpdateHandler);
  cleanupFunctions.push(() => {
    if (video && timeUpdateHandler) {
      video.removeEventListener("timeupdate", timeUpdateHandler);
    }
  });

  // Reposition subtitles when video size changes
  resizeObserver = new ResizeObserver(() => positionSubtitle(subtitleDiv));
  resizeObserver = new ResizeObserver(() => positionSubtitle(subtitleDiv));
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
  const fullscreenHandler1 = () => {
  const fullscreenHandler1 = () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 50);
  };
  const fullscreenHandler2 = () => {
  };
  const fullscreenHandler2 = () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 50);
  };
  document.addEventListener("fullscreenchange", fullscreenHandler1);
  document.addEventListener("webkitfullscreenchange", fullscreenHandler2);
  cleanupFunctions.push(() => {
    document.removeEventListener("fullscreenchange", fullscreenHandler1);
    document.removeEventListener("webkitfullscreenchange", fullscreenHandler2);
  };
  document.addEventListener("fullscreenchange", fullscreenHandler1);
  document.addEventListener("webkitfullscreenchange", fullscreenHandler2);
  cleanupFunctions.push(() => {
    document.removeEventListener("fullscreenchange", fullscreenHandler1);
    document.removeEventListener("webkitfullscreenchange", fullscreenHandler2);
  });
  
  // Monitor window resize
  const resizeHandler = () => {
  const resizeHandler = () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 50);
  };
  window.addEventListener("resize", resizeHandler);
  cleanupFunctions.push(() => {
    window.removeEventListener("resize", resizeHandler);
  });
  
  // Monitor scroll to ensure subtitles stay within video bounds
  const scrollHandler = () => {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFullscreen) {
      setTimeout(() => positionSubtitle(subtitleDiv), 10);
    }
  };
  window.addEventListener("scroll", scrollHandler, true);
  cleanupFunctions.push(() => {
    window.removeEventListener("scroll", scrollHandler, true);
  });
  
  // Reposition when video starts playing
  const playHandler = () => {
  const playHandler = () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 100);
  };
  video.addEventListener("play", playHandler);
  cleanupFunctions.push(() => {
    if (video) {
      video.removeEventListener("play", playHandler);
    }
  };
  video.addEventListener("play", playHandler);
  cleanupFunctions.push(() => {
    if (video) {
      video.removeEventListener("play", playHandler);
    }
  });
  
  // Reposition when video metadata is loaded
  const metadataHandler = () => {
  const metadataHandler = () => {
    setTimeout(() => positionSubtitle(subtitleDiv), 100);
  };
  video.addEventListener("loadedmetadata", metadataHandler);
  cleanupFunctions.push(() => {
    if (video) {
      video.removeEventListener("loadedmetadata", metadataHandler);
    }
  };
  video.addEventListener("loadedmetadata", metadataHandler);
  cleanupFunctions.push(() => {
    if (video) {
      video.removeEventListener("loadedmetadata", metadataHandler);
    }
  });

  function positionSubtitle(div) {
    if (!div || !video) return;
    if (!div || !video) return;
    const rect = video.getBoundingClientRect();
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    
    // Calculate safe bottom position (raised by 15px to avoid YouTube controls)
    const bottomOffset = isFullscreen ? rect.height * 0.10 : rect.height * 0.12;
    const bottomPosition = window.innerHeight - rect.bottom + bottomOffset + 15;
    
    // Calculate center position - use video's actual center
    const centerX = rect.left + (rect.width / 2);
    
    if (isFullscreen) {
      // In fullscreen, use fixed positioning (no scroll issues)
      div.style.position = "fixed";
      div.style.left = `${centerX}px`;
      div.style.bottom = `${bottomPosition}px`;
    } else {
      // In normal mode, use absolute positioning relative to container
      // Convert viewport coordinates to container-relative coordinates
      const containerRect = playerContainer.getBoundingClientRect();
      
      // Calculate left position relative to container
      const relativeLeft = centerX - containerRect.left;
      
      // Calculate bottom position relative to container
      // bottomPosition is distance from viewport bottom
      // We need distance from container bottom
      const viewportBottomToContainerBottom = window.innerHeight - containerRect.bottom;
      const relativeBottom = bottomPosition - viewportBottomToContainerBottom;
      
      div.style.position = "absolute";
      div.style.left = `${relativeLeft}px`;
      div.style.bottom = `${relativeBottom}px`;
    }
    
    div.style.transform = "translateX(-50%)";
    div.style.textAlign = "center";
    div.style.pointerEvents = "none";
    div.style.zIndex = "9999";
    
    // Keep font size constant in pixels (don't change based on video size)
    if (baseFontSizePx) {
      div.style.fontSize = baseFontSizePx + "px";
    }
  }
}

// Monitor URL changes (YouTube SPA navigation)
let lastUrl = window.location.href;
function checkUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Small delay to ensure video element is ready
    setTimeout(() => {
      initializeSubtitles();
    }, 500);
  }
}

// Use multiple methods to detect URL changes
window.addEventListener("popstate", checkUrlChange);
window.addEventListener("pushstate", checkUrlChange);
window.addEventListener("replacestate", checkUrlChange);

// Override history methods to catch SPA navigation
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  setTimeout(checkUrlChange, 100);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  setTimeout(checkUrlChange, 100);
};

// Also use MutationObserver to detect DOM changes that might indicate video change
const urlObserver = new MutationObserver(() => {
  checkUrlChange();
});

// Observe the document for changes
urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Keyboard shortcuts for font size adjustment
let keyboardHandler = null;

function setupKeyboardShortcuts() {
  // Remove old handler if exists
  if (keyboardHandler) {
    document.removeEventListener('keydown', keyboardHandler, true);
    window.removeEventListener('keydown', keyboardHandler, true);
    if (document.body) {
      document.body.removeEventListener('keydown', keyboardHandler, true);
    }
  }
  
  keyboardHandler = (e) => {
    // Use e.code instead of e.key for language-independent detection
    // e.code gives the same value regardless of keyboard layout (e.g., "BracketLeft", "BracketRight")
    const code = e.code;
    const isBracket = (code === 'BracketLeft' || code === 'BracketRight');
    
    if (!isBracket) return;
    // Keep font size constant in pixels (don't change based on video size)
    if (baseFontSizePx) {
      div.style.fontSize = baseFontSizePx + "px";
    }
  }
}

// Monitor URL changes (YouTube SPA navigation)
let lastUrl = window.location.href;
function checkUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Small delay to ensure video element is ready
    setTimeout(() => {
      initializeSubtitles();
    }, 500);
  }
}

// Use multiple methods to detect URL changes
window.addEventListener("popstate", checkUrlChange);
window.addEventListener("pushstate", checkUrlChange);
window.addEventListener("replacestate", checkUrlChange);

// Override history methods to catch SPA navigation
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  setTimeout(checkUrlChange, 100);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  setTimeout(checkUrlChange, 100);
};

// Also use MutationObserver to detect DOM changes that might indicate video change
const urlObserver = new MutationObserver(() => {
  checkUrlChange();
});

// Observe the document for changes
urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Keyboard shortcuts for font size adjustment
let keyboardHandler = null;

function setupKeyboardShortcuts() {
  // Remove old handler if exists
  if (keyboardHandler) {
    document.removeEventListener('keydown', keyboardHandler, true);
    window.removeEventListener('keydown', keyboardHandler, true);
    if (document.body) {
      document.body.removeEventListener('keydown', keyboardHandler, true);
    }
  }
  
  keyboardHandler = (e) => {
    // Use e.code instead of e.key for language-independent detection
    // e.code gives the same value regardless of keyboard layout (e.g., "BracketLeft", "BracketRight")
    const code = e.code;
    const isBracket = (code === 'BracketLeft' || code === 'BracketRight');
    
    if (!isBracket) return;
    
    // Check if user is typing in an input field
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.isContentEditable ||
      activeElement.closest('input') ||
      activeElement.closest('textarea') ||
      activeElement.closest('[contenteditable="true"]')
    )) {
      return;
    }
    
    // Check if modifier keys are pressed
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
      return;
    }
    
    // Prevent default and stop propagation early
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Get current settings and adjust
    chrome.storage.local.get("subtitleSettings", async (res) => {
      const currentSettings = res.subtitleSettings || { fontSize: 1.3 };
      let currentFontSize = currentSettings.fontSize || 1.3;
      
      // Convert vw to px for calculation
      const viewportWidth = window.innerWidth;
      let currentPx = (currentFontSize * viewportWidth) / 100;
      
      // Adjust size (1px steps) - use code for language-independent detection
      if (code === 'BracketLeft') {
        currentPx = Math.max(10, currentPx - 1); // Minimum 10px (decrease)
      } else if (code === 'BracketRight') {
        currentPx = Math.min(40, currentPx + 1); // Maximum 40px (increase)
      }
      
      // Convert back to vw (for storage consistency)
      const newFontSize = (currentPx * 100) / viewportWidth;
      
      // Update settings
      const newSettings = {
        ...currentSettings,
        fontSize: newFontSize
      };
      
      await chrome.storage.local.set({ subtitleSettings: newSettings });
    });
    
    return false;
  };
  
  // Add listeners with highest priority (capture phase) on multiple targets
  document.addEventListener('keydown', keyboardHandler, true);
  window.addEventListener('keydown', keyboardHandler, true);
  
  // Also add to body when available
  if (document.body) {
    document.body.addEventListener('keydown', keyboardHandler, true);
  } else {
    const observer = new MutationObserver(() => {
      if (document.body && keyboardHandler) {
        document.body.addEventListener('keydown', keyboardHandler, true);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }
}

// Setup keyboard shortcuts when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
} else {
  setupKeyboardShortcuts();
}

// Also setup after a delay to ensure YouTube is loaded
setTimeout(setupKeyboardShortcuts, 500);
setTimeout(setupKeyboardShortcuts, 2000);

// Re-setup when page changes
const originalCheckUrlChange = checkUrlChange;
checkUrlChange = function() {
  originalCheckUrlChange();
  setTimeout(() => {
    setupKeyboardShortcuts();
  }, 500);
};

// Initial initialization
initializeSubtitles();
    // Check if user is typing in an input field
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.isContentEditable ||
      activeElement.closest('input') ||
      activeElement.closest('textarea') ||
      activeElement.closest('[contenteditable="true"]')
    )) {
      return;
    }
    
    // Check if modifier keys are pressed
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
      return;
    }
    
    // Prevent default and stop propagation early
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Get current settings and adjust
    chrome.storage.local.get("subtitleSettings", async (res) => {
      const currentSettings = res.subtitleSettings || { fontSize: 1.3 };
      let currentFontSize = currentSettings.fontSize || 1.3;
      
      // Convert vw to px for calculation
      const viewportWidth = window.innerWidth;
      let currentPx = (currentFontSize * viewportWidth) / 100;
      
      // Adjust size (1px steps) - use code for language-independent detection
      if (code === 'BracketLeft') {
        currentPx = Math.max(10, currentPx - 1); // Minimum 10px (decrease)
      } else if (code === 'BracketRight') {
        currentPx = Math.min(40, currentPx + 1); // Maximum 40px (increase)
      }
      
      // Convert back to vw (for storage consistency)
      const newFontSize = (currentPx * 100) / viewportWidth;
      
      // Update settings
      const newSettings = {
        ...currentSettings,
        fontSize: newFontSize
      };
      
      await chrome.storage.local.set({ subtitleSettings: newSettings });
    });
    
    return false;
  };
  
  // Add listeners with highest priority (capture phase) on multiple targets
  document.addEventListener('keydown', keyboardHandler, true);
  window.addEventListener('keydown', keyboardHandler, true);
  
  // Also add to body when available
  if (document.body) {
    document.body.addEventListener('keydown', keyboardHandler, true);
  } else {
    const observer = new MutationObserver(() => {
      if (document.body && keyboardHandler) {
        document.body.addEventListener('keydown', keyboardHandler, true);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }
}

// Setup keyboard shortcuts when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
} else {
  setupKeyboardShortcuts();
}

// Also setup after a delay to ensure YouTube is loaded
setTimeout(setupKeyboardShortcuts, 500);
setTimeout(setupKeyboardShortcuts, 2000);

// Re-setup when page changes
const originalCheckUrlChange = checkUrlChange;
checkUrlChange = function() {
  originalCheckUrlChange();
  setTimeout(() => {
    setupKeyboardShortcuts();
  }, 500);
};

// Initial initialization
initializeSubtitles();

# YTSub.srt - Custom Subtitles for YouTube

A Chrome extension that lets you add custom SRT subtitle files to any YouTube video.

## 🎯 Features

- **Upload Custom SRT Files** - Add your own subtitle files to any YouTube video

- **Smart Video Detection** - Automatically detects the video from:
  - YouTube video link (if provided)
  - SRT filename (e.g., `VIDEO_ID.srt`)
  - Currently active YouTube tab
- **Subtitle Library** - View and manage all your saved subtitles with video titles and dates

- **Enable/Disable Toggle** - Quick on/off switch in the extension header

## 📥 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder

## 🚀 How to Use

### Adding Subtitles

1. **Prepare your SRT file**:
   - Name it with the YouTube video ID (e.g., `dQw4w9WgXcQ.srt`)
   - OR have the YouTube video open in a tab
   - OR paste the YouTube link in the extension

2. **Upload**:
   - Click the extension icon
   - Select your `.srt` file
   - (Optional) Paste YouTube video link
   - Click "Save"

## 📋 Requirements

- Google Chrome (or Chromium-based browser)
- Manifest V3 support

## 🔧 Technical Details

- **Manifest Version**: 3
- **Permissions**: `storage`, `activeTab`, `scripting`
- **Content Scripts**: Injected only on YouTube watch pages
- **Storage**: Chrome local storage for subtitles and settings

## 📝 SRT File Format

Your SRT file should follow the standard format:
```
1
00:00:01,000 --> 00:00:04,000
First subtitle line

2
00:00:05,000 --> 00:00:08,000
Second subtitle line
```

### File Structure
```
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── js/
│   ├── content.js        # YouTube page injection
│   └── srtParser.js      # SRT file parser
├── css/
│   └── style.css         # Subtitle styling
└── images/
    └── icon.png          # Extension icon
```

## 📄 License

Free to use and modify.

## 👤 Author

**Rayano79 (Abo Arwa)**

## 🤝 Contributing

Feel free to submit issues or pull requests!

---

**Enjoy your custom subtitles on YouTube! 🎬**

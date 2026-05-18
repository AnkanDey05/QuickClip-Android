# QuickClip: Universal Downloader

QuickClip is an extremely fast, completely localized, and robust offline-capable video downloading solution. Built to rival production-level apps, it features both a standalone Android Application and a powerful Chrome Extension ecosystem.

## Features

- **Blazing Fast Extraction**: Uses highly optimized yt-dlp binaries for native offline-extraction. No reliance on sketchy or rate-limited third-party APIs.
- **Cross-Platform Ecosystem**:
  - 📱 **Android Application** (React Native & Kotlin Native Modules)
  - 🌐 **Browser Extension** (Chrome/Brave support)
  - 🖥️ **Desktop Companion Server** (Local Node.js backend to bypass browser CORS)
- **Automatic High-Quality Merging**: Integrated FFmpeg processes seamlessly merge top-quality video and audio tracks.
- **Smart Directory Management**: Pick exactly where your downloads go using native OS folder pickers.
- **Material You Design**: Features a beautiful, dynamic M3 "Deep Purple" theme across both the mobile app and browser extension.
- **No Overwrite Policy**: Auto-increments duplicate downloads to protect your existing library.

## Project Structure

This is a Monorepo containing the entire ecosystem:

```text
UniversalDownloader/
├── android/                 # Native Android bridge & yt-dlp modules
├── src/                     # React Native App (UI, State, Download Managers)
└── QuickClipExtension/      # Browser Ecosystem
    ├── extension/           # Chrome Extension (Popup, Background scripts)
    └── companion/           # Local Node.js Companion Server
```

## Getting Started

### 1. Android App
1. Make sure you have Android Studio and Node.js installed.
2. Run `npm install` in the root directory.
3. Start Metro: `npm start`
4. Build the app: Run `npm run android` in a new terminal.

### 2. Chrome Extension & Companion Server
The extension requires the companion server to handle local OS operations (like FFmpeg merging and saving to disk).

1. Navigate to the companion server: `cd QuickClipExtension/companion`
2. Install dependencies: `npm install` (This will also auto-download the required FFmpeg binaries).
3. Start the server: `npm start`
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `QuickClipExtension/extension/` directory.

---
*Built with React Native, Kotlin, Node.js, and Vanilla JS.*

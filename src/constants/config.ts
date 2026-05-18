/**
 * App-wide configuration
 */

export const APP_CONFIG = {
  APP_NAME: "QuickClip",
  APP_VERSION: "2.0.0",
  MIN_ANDROID_API: 30,
  TARGET_ANDROID_API: 36,

  // Storage
  STORAGE_NAMESPACE: "com.universaldownloader.storage",
  DOWNLOAD_FOLDER: "DownloaderApp",

  // UI
  DARK_THEME_DEFAULT: true,
  TOAST_DURATION: 3000,
  ALERT_TIMEOUT: 5000,

  // Download settings
  DEFAULT_MAX_CONCURRENT_DOWNLOADS: 2,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_TIMEOUT_MS: 30000,
  CHUNK_SIZE: 1024 * 1024, // 1MB

  // Cache
  THUMBNAIL_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  CACHE_EXPIRY_DAYS: 7,

  // Limits
  MAX_URL_LENGTH: 2048,
  MAX_TITLE_LENGTH: 200,
  MAX_CONCURRENT_REQUESTS: 5,
  MAX_RETRIES: 3,

  // API
  REQUEST_TIMEOUT: 30000,
  AXIOS_TIMEOUT: 30000,

  // Feature flags
  ENABLE_YTDLP: false, // Set to true when native module is ready
  ENABLE_FFMPEG: false, // Phase 2
  ENABLE_BATCH_DOWNLOAD: false, // Phase 2
  ENABLE_SUBTITLE_DOWNLOAD: false, // Phase 2
  ENABLE_AUDIO_EXTRACTION: false, // Phase 2
};

export const QUALITY_OPTIONS = [
  { label: "2160p (4K)", value: "2160p" },
  { label: "1440p", value: "1440p" },
  { label: "1080p (Full HD)", value: "1080p" },
  { label: "720p (HD)", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
  { label: "240p", value: "240p" },
  { label: "Audio Only", value: "audio" },
];

export const SORT_OPTIONS = [
  { label: "Date (Newest)", value: "date" },
  { label: "Size (Largest)", value: "size" },
  { label: "Title (A-Z)", value: "title" },
];

export const ERROR_MESSAGES = {
  INVALID_URL: "Please enter a valid video URL",
  UNSUPPORTED_PLATFORM:
    "This platform is not currently supported",
  NETWORK_ERROR: "Network error. Please check your connection.",
  STORAGE_ERROR: "Storage error. Please check available space.",
  EXTRACTION_ERROR: "Could not extract video information",
  DOWNLOAD_ERROR: "Download failed. Please try again.",
  PERMISSION_ERROR: "Permission denied. Please enable necessary permissions.",
  GENERIC_ERROR: "An unexpected error occurred. Please try again.",
};

export const SUCCESS_MESSAGES = {
  DOWNLOAD_STARTED: "Download started",
  DOWNLOAD_COMPLETED: "Download completed successfully",
  FILE_DELETED: "File deleted successfully",
  COPIED_TO_CLIPBOARD: "Copied to clipboard",
};

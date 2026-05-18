/**
 * Platform constants and configurations
 */

import { PlatformType } from "../types";

export const SUPPORTED_PLATFORMS: PlatformType[] = [
  "youtube",
  "instagram",
  "facebook",
  "tiktok",
  "twitter",
];

export const PLATFORM_NAMES: Record<PlatformType, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  twitter: "X (Twitter)",
  generic: "Generic",
};

export const PLATFORM_URLS: Record<PlatformType, string[]> = {
  youtube: ["https://www.youtube.com", "https://youtu.be"],
  instagram: ["https://www.instagram.com"],
  facebook: ["https://www.facebook.com", "https://fb.watch"],
  tiktok: ["https://www.tiktok.com"],
  twitter: ["https://twitter.com", "https://x.com"],
  generic: [],
};

export const PLATFORM_EXAMPLE_URLS: Record<PlatformType, string> = {
  youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  instagram:
    "https://www.instagram.com/p/CabCdeLl",
  facebook:
    "https://www.facebook.com/watch/?v=123456789",
  tiktok: "https://www.tiktok.com/@tiktok/video/1234567890",
  twitter: "https://twitter.com/i/web/status/1234567890",
  generic: "https://example.com/video",
};

export const VIDEO_QUALITY_PRESETS = {
  HIGH: ["2160p", "1440p", "1080p"],
  MEDIUM: ["720p", "480p"],
  LOW: ["360p", "240p"],
  AUDIO_ONLY: ["audio", "audio-only"],
};

export const DEFAULT_DOWNLOAD_CONCURRENCY = 2;
export const MAX_CONCURRENT_DOWNLOADS = 5;
export const DOWNLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB
export const DOWNLOAD_TIMEOUT = 30000; // 30 seconds

/**
 * Platform detection utilities
 */

import { PlatformType } from "../types";

export function detectPlatform(url: string): PlatformType {
  if (!url) return "generic";

  const urlLower = url.toLowerCase();

  if (/youtu\.?be/.test(urlLower)) {
    return "youtube";
  }

  if (/instagram\.com|insta\.?gram/.test(urlLower)) {
    return "instagram";
  }

  if (/facebook\.com|fb\.watch/.test(urlLower)) {
    return "facebook";
  }

  if (/tiktok\.com|vm\.tiktok|vt\.tiktok/.test(urlLower)) {
    return "tiktok";
  }

  if (
    /twitter\.com|x\.com|tweet/.test(urlLower) ||
    /\/status\/\d+/.test(urlLower)
  ) {
    return "twitter";
  }

  return "generic";
}

export function getPlatformName(platform: PlatformType): string {
  const names: Record<PlatformType, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    twitter: "X (Twitter)",
    generic: "Generic",
  };
  return names[platform] || "Unknown";
}

export function getPlatformIcon(platform: PlatformType): string {
  const icons: Record<PlatformType, string> = {
    youtube: "🎬",
    instagram: "📷",
    facebook: "f",
    tiktok: "🎵",
    twitter: "𝕏",
    generic: "🔗",
  };
  return icons[platform] || "?";
}

export const SUPPORTED_PLATFORMS: PlatformType[] = [
  "youtube",
  "instagram",
  "facebook",
  "tiktok",
  "twitter",
  "generic",
];

export const PLATFORM_URLS: Record<PlatformType, string[]> = {
  youtube: ["https://www.youtube.com", "https://youtu.be"],
  instagram: ["https://www.instagram.com"],
  facebook: ["https://www.facebook.com", "https://fb.watch"],
  tiktok: ["https://www.tiktok.com"],
  twitter: ["https://twitter.com", "https://x.com"],
  generic: [],
};

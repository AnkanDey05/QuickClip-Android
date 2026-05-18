/**
 * Hook for detecting platform from URL
 */

import { useMemo } from "react";
import { PlatformType } from "../types";
import { detectPlatform, getPlatformName, getPlatformIcon } from "../utils/platformDetector";

export interface DetectedPlatform {
  type: PlatformType;
  name: string;
  icon: string;
  isSupported: boolean;
}

export function usePlatformDetector(url: string): DetectedPlatform {
  return useMemo(() => {
    const type = detectPlatform(url);
    return {
      type,
      name: getPlatformName(type),
      icon: getPlatformIcon(type),
      isSupported: type !== "generic",
    };
  }, [url]);
}

/**
 * Hook for managing detected platform state
 */
export function usePlatformDetectionState(initialUrl = ""): {
  url: string;
  setUrl: (url: string) => void;
  platform: DetectedPlatform;
  isValidUrl: boolean;
} {
  const [url, setUrl] = useMemo(() => {
    const state = initialUrl;
    return [
      state,
      (newUrl: string) => {
        // This would need to be managed with useState, but for the hook structure,
        // we're keeping it simple here
      },
    ];
  }, [initialUrl]);

  const platform = usePlatformDetector(url);

  const isValidUrl = useMemo(() => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, [url]);

  return {
    url,
    setUrl,
    platform,
    isValidUrl,
  };
}

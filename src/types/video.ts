/**
 * Video-related types used throughout the app
 */

import { VideoInfo, VideoFormat } from "./extractor";

export interface VideoPreview extends VideoInfo {
  estimatedFileSize: {
    [formatId: string]: number;
  };
}

export interface LibraryVideo {
  id: string;
  title: string;
  thumbnail: string;
  filePath: string;
  duration: number;
  fileSize: number;
  addedDate: number; // timestamp
  platform: string;
  uploader?: string;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
}

export type SortOption = "date" | "size" | "title";

export interface LibraryFilter {
  sortBy: SortOption;
  ascending: boolean;
  searchQuery?: string;
}

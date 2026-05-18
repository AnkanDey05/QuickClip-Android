/**
 * Video extraction interface and related types
 */

export interface VideoFormat {
  id: string;
  quality: string; // e.g., "1080p", "720p", "audio-only"
  url: string;
  filesize?: number; // exact bytes
  filesizeApprox?: number; // approximate bytes
  ext?: string; // file extension e.g. "mp4", "webm"
  hasAudio: boolean;
  hasVideo: boolean;
  codec?: string;
  fps?: number; // frames per second for video
  audioCodec?: string;
  bitrate?: number; // in kbps
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  formats: VideoFormat[];
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  platform: string;
  url: string;
}

export interface VideoExtractor {
  extract(url: string): Promise<VideoInfo>;
  canHandle(url: string): boolean;
}

export type PlatformType =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "twitter"
  | "generic";

/**
 * Download manager and progress tracking types
 */

import { VideoFormat } from "./extractor";

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

export interface DownloadItem {
  id: string;
  videoId: string;
  url: string; // Original video URL for yt-dlp
  title: string;
  thumbnail: string;
  format: VideoFormat;
  status: DownloadStatus;
  progress: number; // 0-1
  bytesDownloaded?: number;
  totalBytes?: number;
  speed: number; // MB/s
  eta?: number; // seconds remaining
  error?: string;
  filePath?: string;
  folderId?: string; // folder this download belongs to (default: 'uncategorized')
  createdAt: number; // timestamp
  completedTime?: number;
  // Clip fields (Phase 5)
  clipStart?: number; // seconds
  clipEnd?: number; // seconds
  isClip?: boolean;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  bytesDownloaded: number;
  speed: number;
  eta: number;
}

/** A video saved for later downloading */
export interface SavedItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
  platform: string;
  savedAt: number;
  formats?: VideoFormat[];
}

/** A favorited video — persists even if file is deleted */
export interface FavoriteItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
  platform: string;
  favoritedAt: number;
  downloadId?: string; // link to download entry if downloaded
  filePath?: string; // cached file path
}

/** A folder for organizing downloads */
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  isSystem?: boolean; // true for Favorites, Saved for Later
}

export interface DownloadStore {
  downloads: Record<string, DownloadItem>;
  saved: Record<string, SavedItem>;
  favorites: Record<string, FavoriteItem>;
  folders: Record<string, Folder>;
  activeDownloadId?: string;

  // Download actions
  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, partial: Partial<DownloadItem>) => void;
  setActiveDownload: (id: string | undefined) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  removeFromLibrary: (id: string) => void;
  clearCompleted: () => void;
  getDownload: (id: string) => DownloadItem | undefined;
  getAllDownloads: () => DownloadItem[];
  getActiveDownloads: () => DownloadItem[];
  getCompletedDownloads: () => DownloadItem[];
  loadFromFilesystem: () => Promise<void>;

  // Saved for Later actions
  saveForLater: (item: SavedItem) => void;
  removeSaved: (id: string) => void;
  getSavedItems: () => SavedItem[];

  // Favorites actions
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  getFavorites: () => FavoriteItem[];
  isFavorite: (url: string) => boolean;

  // Folder actions
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveToFolder: (downloadId: string, folderId: string) => Promise<void>;
  getFolders: () => Folder[];
  getDownloadsByFolder: (folderId: string) => DownloadItem[];
}


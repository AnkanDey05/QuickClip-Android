/**
 * Zustand store for managing downloads — with JSON metadata persistence.
 *
 * On launch, `loadFromFilesystem()`:
 *   1. Reads saved metadata (thumbnails, titles, etc.) from a JSON file
 *   2. Scans the download folder for actual files
 *   3. Merges: keeps metadata for files that exist, adds new files, prunes stale entries
 *
 * On every state change, completed downloads are persisted to disk.
 */

import { create } from "zustand";
import RNFS from "react-native-fs";
import { DownloadItem, DownloadStore, DownloadStatus, SavedItem, FavoriteItem, Folder } from "../types";
import useSettingsStore from "./settingsStore";
import { generateId } from "../utils/common";

/** The folder where all downloads are saved */
const DOWNLOAD_DIR = `${
  RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath
}/QuickClip`;

/** Legacy folder path (v1.x) — used for migration */
const OLD_DOWNLOAD_DIR = `${
  RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath
}/UniversalDownloader`;

/** Path to the metadata JSON file */
const METADATA_FILE = `${DOWNLOAD_DIR}/.downloads_meta.json`;

/** Legacy metadata path (v1.x) */
const OLD_METADATA_FILE = `${OLD_DOWNLOAD_DIR}/.downloads_meta.json`;

/** Persistence paths for new collections */
const SAVED_FILE = `${DOWNLOAD_DIR}/.quickclip_saved.json`;
const FAVORITES_FILE = `${DOWNLOAD_DIR}/.quickclip_favorites.json`;
const FOLDERS_FILE = `${DOWNLOAD_DIR}/.quickclip_folders.json`;

/**
 * Get the active download directory — respects user's custom path from settings.
 * Falls back to the default DOWNLOAD_DIR if no custom path is set.
 */
function getActiveDir(): string {
  try {
    const customPath = useSettingsStore.getState().downloadPath;
    return customPath || DOWNLOAD_DIR;
  } catch {
    return DOWNLOAD_DIR;
  }
}

/** Get the metadata file path in the active directory */
function getMetadataPath(): string {
  return `${getActiveDir()}/.downloads_meta.json`;
}

/**
 * Save completed download metadata to disk.
 * Only persists completed items (not active/pending/cancelled ones).
 */
async function persistMetadata(downloads: Record<string, DownloadItem>) {
  try {
    const completed = Object.values(downloads).filter(
      (d) => d.status === "completed" && d.filePath
    );
    // Save only the fields we need to restore
    const serializable = completed.map((d) => ({
      id: d.id,
      videoId: d.videoId,
      url: d.url,
      title: d.title,
      thumbnail: d.thumbnail,
      format: d.format,
      filePath: d.filePath,
      totalBytes: d.totalBytes,
      createdAt: d.createdAt,
      folderId: d.folderId,
    }));
    const dir = getActiveDir();
    const dirExists = await RNFS.exists(dir);
    if (!dirExists) {
      await RNFS.mkdir(dir);
    }
    await RNFS.writeFile(getMetadataPath(), JSON.stringify(serializable), "utf8");
  } catch (err: any) {
    console.warn("[Library] Failed to persist metadata:", err.message);
  }
}

/**
 * Load saved metadata from disk.
 * Checks both the active dir and the default dir (for migration).
 * Falls back to legacy UniversalDownloader path for v1.x migration.
 */
async function loadPersistedMetadata(): Promise<Partial<DownloadItem>[]> {
  try {
    // Try active path first
    const activePath = getMetadataPath();
    const exists = await RNFS.exists(activePath);
    if (exists) {
      const content = await RNFS.readFile(activePath, "utf8");
      return JSON.parse(content);
    }
    // Try default path (in case settings haven't migrated yet)
    const defaultExists = await RNFS.exists(METADATA_FILE);
    if (defaultExists) {
      console.log("[Library] Found metadata in default dir, migrating...");
      const content = await RNFS.readFile(METADATA_FILE, "utf8");
      return JSON.parse(content);
    }
    // Fall back to legacy path for v1.x migration
    const oldExists = await RNFS.exists(OLD_METADATA_FILE);
    if (oldExists) {
      console.log("[Library] Migrating from legacy UniversalDownloader metadata...");
      const content = await RNFS.readFile(OLD_METADATA_FILE, "utf8");
      return JSON.parse(content);
    }
    return [];
  } catch (err: any) {
    console.warn("[Library] Failed to load metadata:", err.message);
    return [];
  }
}

/** Persist saved-for-later items */
async function persistSaved(saved: Record<string, SavedItem>) {
  try {
    await ensureDir();
    const savePath = `${getActiveDir()}/.quickclip_saved.json`;
    await RNFS.writeFile(savePath, JSON.stringify(Object.values(saved)), "utf8");
  } catch (err: any) {
    console.warn("[Library] Failed to persist saved items:", err.message);
  }
}

/** Load saved-for-later items */
async function loadPersistedSaved(): Promise<SavedItem[]> {
  try {
    // Try active dir first
    const activePath = `${getActiveDir()}/.quickclip_saved.json`;
    let exists = await RNFS.exists(activePath);
    if (exists) {
      const content = await RNFS.readFile(activePath, "utf8");
      return JSON.parse(content);
    }
    // Fallback to default dir
    exists = await RNFS.exists(SAVED_FILE);
    if (exists) {
      const content = await RNFS.readFile(SAVED_FILE, "utf8");
      return JSON.parse(content);
    }
    return [];
  } catch (err: any) {
    console.warn("[Library] Failed to load saved items:", err.message);
    return [];
  }
}

/** Persist favorites */
async function persistFavorites(favorites: Record<string, FavoriteItem>) {
  try {
    await ensureDir();
    const favPath = `${getActiveDir()}/.quickclip_favorites.json`;
    await RNFS.writeFile(favPath, JSON.stringify(Object.values(favorites)), "utf8");
  } catch (err: any) {
    console.warn("[Library] Failed to persist favorites:", err.message);
  }
}

/** Load favorites */
async function loadPersistedFavorites(): Promise<FavoriteItem[]> {
  try {
    const activePath = `${getActiveDir()}/.quickclip_favorites.json`;
    let exists = await RNFS.exists(activePath);
    if (exists) {
      const content = await RNFS.readFile(activePath, "utf8");
      return JSON.parse(content);
    }
    // Fallback to default dir
    exists = await RNFS.exists(FAVORITES_FILE);
    if (exists) {
      const content = await RNFS.readFile(FAVORITES_FILE, "utf8");
      return JSON.parse(content);
    }
    return [];
  } catch (err: any) {
    console.warn("[Library] Failed to load favorites:", err.message);
    return [];
  }
}

/** Persist folders */
async function persistFolders(folders: Record<string, Folder>) {
  try {
    await ensureDir();
    // Don't persist the default 'uncategorized' folder — it's always created in code
    const userFolders = Object.values(folders).filter((f) => f.id !== "uncategorized");
    const folderPath = `${getActiveDir()}/.quickclip_folders.json`;
    await RNFS.writeFile(folderPath, JSON.stringify(userFolders), "utf8");
  } catch (err: any) {
    console.warn("[Library] Failed to persist folders:", err.message);
  }
}

/** Load folders */
async function loadPersistedFolders(): Promise<Folder[]> {
  try {
    const activePath = `${getActiveDir()}/.quickclip_folders.json`;
    let exists = await RNFS.exists(activePath);
    if (exists) {
      const content = await RNFS.readFile(activePath, "utf8");
      return JSON.parse(content);
    }
    // Fallback to default dir
    exists = await RNFS.exists(FOLDERS_FILE);
    if (exists) {
      const content = await RNFS.readFile(FOLDERS_FILE, "utf8");
      return JSON.parse(content);
    }
    return [];
  } catch (err: any) {
    console.warn("[Library] Failed to load folders:", err.message);
    return [];
  }
}

/** Ensure active download directory exists */
async function ensureDir() {
  const dir = getActiveDir();
  const exists = await RNFS.exists(dir);
  if (!exists) await RNFS.mkdir(dir);
}

const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: {},
  saved: {},
  favorites: {},
  folders: {
    uncategorized: {
      id: "uncategorized",
      name: "Uncategorized",
      createdAt: 0,
    },
  },
  activeDownloadId: undefined,

  addDownload: (item: DownloadItem) => {
    set((state) => {
      const newState = {
        downloads: {
          ...state.downloads,
          [item.id]: item,
        },
      };
      return newState;
    });
  },

  updateDownload: (id: string, partial: Partial<DownloadItem>) => {
    set((state) => {
      const newDownloads = {
        ...state.downloads,
        [id]: {
          ...state.downloads[id],
          ...partial,
        },
      };
      return { downloads: newDownloads };
    });
    
    // Auto-persist when a download completes (outside the pure set function)
    if (partial.status === "completed") {
      persistMetadata(get().downloads);
    }
  },

  setActiveDownload: (id: string | undefined) => {
    set({ activeDownloadId: id });
  },

  pauseDownload: (id: string) => {
    const download = get().downloads[id];
    if (download) {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            ...download,
            status: "paused" as DownloadStatus,
          },
        },
        activeDownloadId: undefined,
      }));
    }
  },

  resumeDownload: (id: string) => {
    const download = get().downloads[id];
    if (download) {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            ...download,
            status: "downloading" as DownloadStatus,
          },
        },
        activeDownloadId: id,
      }));
    }
  },

  cancelDownload: (id: string) => {
    const download = get().downloads[id];
    if (download) {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            ...download,
            status: "cancelled" as DownloadStatus,
          },
        },
        activeDownloadId: undefined,
      }));
    }
  },

  removeFromLibrary: (id: string) => {
    set((state) => {
      const newDownloads = { ...state.downloads };
      delete newDownloads[id];
      return {
        downloads: newDownloads,
        activeDownloadId:
          state.activeDownloadId === id ? undefined : state.activeDownloadId,
      };
    });
    // Persist after removal
    persistMetadata(get().downloads);
  },

  clearCompleted: () => {
    set((state) => {
      const newDownloads = { ...state.downloads };
      Object.keys(newDownloads).forEach((key) => {
        if (newDownloads[key].status === "completed") {
          delete newDownloads[key];
        }
      });
      return { downloads: newDownloads };
    });
    persistMetadata(get().downloads);
  },

  getDownload: (id: string) => {
    return get().downloads[id];
  },

  getAllDownloads: () => {
    return Object.values(get().downloads);
  },

  getActiveDownloads: () => {
    return Object.values(get().downloads).filter(
      (d) =>
        d.status === "downloading" ||
        d.status === "paused" ||
        d.status === "pending"
    );
  },

  getCompletedDownloads: () => {
    return Object.values(get().downloads).filter(
      (d) => d.status === "completed"
    );
  },

  /**
   * Load persisted metadata + scan filesystem, then merge:
   *  - Saved metadata provides thumbnails, titles, quality info
   *  - Filesystem scan ensures we only show files that still exist
   *  - New files found on disk (e.g. copied manually) get basic entries
   */
  loadFromFilesystem: async () => {
    try {
      console.log("[Library] Loading library...");

      const activeDownloadDir = useSettingsStore.getState().downloadPath || DOWNLOAD_DIR;

      // Ensure new directory exists
      const dirExists = await RNFS.exists(activeDownloadDir);
      if (!dirExists) {
        await RNFS.mkdir(activeDownloadDir);
      }

      // Load persisted metadata (thumbnails, titles, etc.)
      const savedMeta = await loadPersistedMetadata();
      const metaByPath = new Map<string, Partial<DownloadItem>>();
      for (const m of savedMeta) {
        if (m.filePath) metaByPath.set(m.filePath, m);
      }
      console.log(`[Library] Loaded ${savedMeta.length} saved metadata entries`);

      // Recursive directory reader
      const readDirRecursive = async (dirPath: string): Promise<RNFS.ReadDirItem[]> => {
        let results: RNFS.ReadDirItem[] = [];
        try {
          const items = await RNFS.readDir(dirPath);
          for (const item of items) {
            if (item.isDirectory()) {
              // Ignore hidden directories like .thumbnails
              if (!item.name.startsWith('.')) {
                const subItems = await readDirRecursive(item.path);
                results = results.concat(subItems);
              }
            } else {
              results.push(item);
            }
          }
        } catch (e) {
          // Ignore read errors for specific folders
        }
        return results;
      };

      // Scan both new and old directories for media files recursively
      let allFiles: RNFS.ReadDirItem[] = [];
      
      const files = await readDirRecursive(activeDownloadDir);
      allFiles = allFiles.concat(files);
      
      // Also scan legacy dir for migration
      const oldDirExists = await RNFS.exists(OLD_DOWNLOAD_DIR);
      if (oldDirExists) {
        const oldFiles = await readDirRecursive(OLD_DOWNLOAD_DIR);
        allFiles = allFiles.concat(oldFiles);
        console.log(`[Library] Found ${oldFiles.length} files in legacy UniversalDownloader folder`);
      }

      const mediaFiles = allFiles.filter(
        (f) =>
          !f.isDirectory() &&
          !f.name.startsWith(".") &&
          (f.name.endsWith(".mp4") ||
            f.name.endsWith(".mp3") ||
            f.name.endsWith(".webm") ||
            f.name.endsWith(".mkv"))
      );
      console.log(`[Library] Found ${mediaFiles.length} media files on disk`);

      const currentDownloads = get().downloads;

      // Build set of active downloads (don't overwrite these)
      const activeIds = new Set<string>();
      Object.values(currentDownloads).forEach((d) => {
        if (d.status !== "completed" && d.status !== "cancelled") {
          activeIds.add(d.id);
        }
      });

      // Merge: for each file on disk, use saved metadata or create basic entry
      const mergedDownloads: Record<string, DownloadItem> = {};

      // Keep active downloads
      Object.entries(currentDownloads).forEach(([id, d]) => {
        if (activeIds.has(id)) {
          mergedDownloads[id] = d;
        }
      });

      // Process files on disk
      for (const file of mediaFiles) {
        const meta = metaByPath.get(file.path);

        if (meta && meta.id) {
          // We have saved metadata — restore full entry
          mergedDownloads[meta.id] = {
            id: meta.id,
            videoId: meta.videoId || meta.id,
            url: meta.url || "",
            title: meta.title || file.name.replace(/\.(mp4|mp3|webm|mkv)$/, "").replace(/_/g, " "),
            thumbnail: meta.thumbnail || "",
            format: meta.format || {
              id: "unknown",
              quality: file.name.endsWith(".mp3") ? "Audio" : "Video",
              url: "",
              hasAudio: true,
              hasVideo: !file.name.endsWith(".mp3"),
            },
            status: "completed",
            progress: 1,
            speed: 0,
            filePath: file.path,
            totalBytes: parseInt(String(file.size), 10) || meta.totalBytes || 0,
            createdAt: meta.createdAt || file.mtime?.getTime() || Date.now(),
            folderId: meta.folderId,
          };
        } else {
          // No metadata — check if already in current store
          const existingEntry = Object.values(currentDownloads).find(
            (d) => d.filePath === file.path && d.status === "completed"
          );
          if (existingEntry) {
            mergedDownloads[existingEntry.id] = existingEntry;
          } else {
            // Completely new file — create basic entry
            const id = `fs_${file.name}_${file.mtime?.getTime() || Date.now()}`;
            const isAudio = file.name.endsWith(".mp3");
            mergedDownloads[id] = {
              id,
              videoId: id,
              url: "",
              title: file.name.replace(/\.(mp4|mp3|webm|mkv)$/, "").replace(/_/g, " "),
              thumbnail: "",
              format: {
                id: "unknown",
                quality: isAudio ? "Audio" : "Video",
                url: "",
                hasAudio: true,
                hasVideo: !isAudio,
              },
              status: "completed",
              progress: 1,
              speed: 0,
              filePath: file.path,
              createdAt: file.mtime?.getTime() || Date.now(),
              totalBytes: parseInt(String(file.size), 10) || 0,
            };
            console.log(`[Library] + New file on disk: ${file.name}`);
          }
        }
      }

      set({ downloads: mergedDownloads });
      console.log(`[Library] Library loaded: ${Object.keys(mergedDownloads).length} total items`);
      
      // Re-persist to keep metadata file in sync
      persistMetadata(mergedDownloads);

      // Load saved, favorites, and folders
      const [savedItems, favoriteItems, folderItems] = await Promise.all([
        loadPersistedSaved(),
        loadPersistedFavorites(),
        loadPersistedFolders(),
      ]);

      const savedMap: Record<string, SavedItem> = {};
      savedItems.forEach((s) => { savedMap[s.id] = s; });

      const favMap: Record<string, FavoriteItem> = {};
      favoriteItems.forEach((f) => { favMap[f.id] = f; });

      const folderMap: Record<string, Folder> = {
        uncategorized: { id: "uncategorized", name: "Uncategorized", createdAt: 0 },
      };
      folderItems.forEach((f) => { folderMap[f.id] = f; });

      set({ saved: savedMap, favorites: favMap, folders: folderMap });
      console.log(`[Library] Loaded ${savedItems.length} saved, ${favoriteItems.length} favorites, ${folderItems.length} folders`);
    } catch (err: any) {
      console.warn("[Library] Library load failed:", err.message);
    }
  },

  // ─── Saved for Later ───────────────────────────────────────

  saveForLater: (item: SavedItem) => {
    set((state) => ({
      saved: { ...state.saved, [item.id]: item },
    }));
    persistSaved(get().saved);
  },

  removeSaved: (id: string) => {
    set((state) => {
      const newSaved = { ...state.saved };
      delete newSaved[id];
      return { saved: newSaved };
    });
    persistSaved(get().saved);
  },

  getSavedItems: () => {
    return Object.values(get().saved).sort((a, b) => b.savedAt - a.savedAt);
  },

  // ─── Favorites ─────────────────────────────────────────────

  addFavorite: (item: FavoriteItem) => {
    set((state) => ({
      favorites: { ...state.favorites, [item.id]: item },
    }));
    persistFavorites(get().favorites);
  },

  removeFavorite: (id: string) => {
    set((state) => {
      const newFavorites = { ...state.favorites };
      delete newFavorites[id];
      return { favorites: newFavorites };
    });
    persistFavorites(get().favorites);
  },

  getFavorites: () => {
    return Object.values(get().favorites).sort((a, b) => b.favoritedAt - a.favoritedAt);
  },

  isFavorite: (url: string) => {
    return Object.values(get().favorites).some((f) => f.url === url);
  },

  // ─── Folders ───────────────────────────────────────────────

  createFolder: (name: string) => {
    const id = generateId();
    const folder: Folder = { id, name, createdAt: Date.now() };
    set((state) => ({
      folders: { ...state.folders, [id]: folder },
    }));
    // Create physical directory
    const activeDownloadDir = useSettingsStore.getState().downloadPath || DOWNLOAD_DIR;
    RNFS.mkdir(`${activeDownloadDir}/${name}`).catch((e) =>
      console.warn("[Library] Failed to create folder dir:", e.message)
    );
    persistFolders(get().folders);
    return id;
  },

  renameFolder: (id: string, name: string) => {
    set((state) => {
      const folder = state.folders[id];
      if (!folder || folder.id === "uncategorized") return state;
      return {
        folders: { ...state.folders, [id]: { ...folder, name } },
      };
    });
    persistFolders(get().folders);
  },

  deleteFolder: (id: string) => {
    if (id === "uncategorized") return;
    set((state) => {
      const newFolders = { ...state.folders };
      delete newFolders[id];
      // Move all downloads in this folder to uncategorized
      const newDownloads = { ...state.downloads };
      Object.values(newDownloads).forEach((d) => {
        if (d.folderId === id) {
          newDownloads[d.id] = { ...d, folderId: "uncategorized" };
        }
      });
      return { folders: newFolders, downloads: newDownloads };
    });
    persistFolders(get().folders);
    persistMetadata(get().downloads);
  },

  moveToFolder: async (downloadId: string, folderId: string) => {
    const download = get().downloads[downloadId];
    if (!download || !download.filePath) return;

    const folder = get().folders[folderId];
    if (!folder) return;

    try {
      const activeDownloadDir = useSettingsStore.getState().downloadPath || DOWNLOAD_DIR;

      // Determine target directory
      const targetDir = folderId === "uncategorized"
        ? activeDownloadDir
        : `${activeDownloadDir}/${folder.name}`;

      // Ensure target directory exists
      const dirExists = await RNFS.exists(targetDir);
      if (!dirExists) await RNFS.mkdir(targetDir);

      // Move the file
      const fileName = download.filePath.split("/").pop() || "";
      const newPath = `${targetDir}/${fileName}`;

      if (download.filePath !== newPath) {
        await RNFS.moveFile(download.filePath, newPath);
      }

      // Update store
      set((state) => ({
        downloads: {
          ...state.downloads,
          [downloadId]: { ...state.downloads[downloadId], folderId, filePath: newPath },
        },
      }));
      persistMetadata(get().downloads);
    } catch (err: any) {
      console.warn("[Library] Failed to move file:", err.message);
    }
  },

  getFolders: () => {
    const folders = Object.values(get().folders);
    // Sort: uncategorized last, rest alphabetically
    return folders.sort((a, b) => {
      if (a.id === "uncategorized") return 1;
      if (b.id === "uncategorized") return -1;
      return a.name.localeCompare(b.name);
    });
  },

  getDownloadsByFolder: (folderId: string) => {
    return Object.values(get().downloads).filter((d) => {
      if (d.status !== "completed") return false;
      if (folderId === "uncategorized") {
        return !d.folderId || d.folderId === "uncategorized";
      }
      return d.folderId === folderId;
    });
  },
}));

export default useDownloadStore;

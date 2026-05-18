/**
 * Settings store — Zustand store with JSON persistence for app settings.
 * Settings are stored in the app's internal document directory (always writable)
 * rather than the Downloads folder, which may not exist on first launch.
 */

import { create } from 'zustand';
import RNFS from 'react-native-fs';

/** Settings file in app-internal storage (survives app updates, always writable) */
const SETTINGS_FILE = `${RNFS.DocumentDirectoryPath}/.quickclip_settings.json`;

/** Legacy settings path — check this for migration */
const LEGACY_DOWNLOAD_DIR = `${
  RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath
}/QuickClip`;
const LEGACY_SETTINGS_FILE = `${LEGACY_DOWNLOAD_DIR}/.quickclip_settings.json`;

export interface AppSettings {
  /** Default download quality preference */
  defaultQuality: 'best' | '1080p' | '720p' | '480p' | 'audio';
  /** Whether to show download notifications */
  notificationsEnabled: boolean;
  /** Maximum concurrent downloads */
  maxConcurrentDownloads: number;
  /** Auto-start downloads when added */
  autoStartDownloads: boolean;
  /** Custom download path (empty = default) */
  downloadPath: string;
  /** Show clipboard banner automatically */
  clipboardDetection: boolean;
}

interface SettingsStore extends AppSettings {
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultQuality: 'best',
  notificationsEnabled: true,
  maxConcurrentDownloads: 2,
  autoStartDownloads: true,
  downloadPath: '',
  clipboardDetection: true,
};

async function persistSettings(settings: AppSettings) {
  try {
    await RNFS.writeFile(SETTINGS_FILE, JSON.stringify(settings), 'utf8');
    console.log('[Settings] Persisted to', SETTINGS_FILE);
  } catch (err: any) {
    console.warn('[Settings] Failed to persist:', err.message);
  }
}

async function loadPersistedSettings(): Promise<Partial<AppSettings>> {
  try {
    // Try internal storage first
    const exists = await RNFS.exists(SETTINGS_FILE);
    if (exists) {
      const content = await RNFS.readFile(SETTINGS_FILE, 'utf8');
      return JSON.parse(content);
    }
    // Check legacy path for migration
    const legacyExists = await RNFS.exists(LEGACY_SETTINGS_FILE);
    if (legacyExists) {
      console.log('[Settings] Migrating from legacy settings path...');
      const content = await RNFS.readFile(LEGACY_SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(content);
      // Re-persist to new location
      await RNFS.writeFile(SETTINGS_FILE, JSON.stringify(settings), 'utf8');
      return settings;
    }
    return {};
  } catch (err: any) {
    console.warn('[Settings] Failed to load:', err.message);
    return {};
  }
}

const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  loadSettings: async () => {
    const saved = await loadPersistedSettings();
    set({ ...DEFAULT_SETTINGS, ...saved });
    console.log('[Settings] Loaded settings');
  },

  updateSetting: (key, value) => {
    set({ [key]: value });
    // Build the settings object for persistence (exclude functions)
    const state = get();
    const settings: AppSettings = {
      defaultQuality: state.defaultQuality,
      notificationsEnabled: state.notificationsEnabled,
      maxConcurrentDownloads: state.maxConcurrentDownloads,
      autoStartDownloads: state.autoStartDownloads,
      downloadPath: state.downloadPath,
      clipboardDetection: state.clipboardDetection,
    };
    persistSettings(settings);
  },
}));

export default useSettingsStore;

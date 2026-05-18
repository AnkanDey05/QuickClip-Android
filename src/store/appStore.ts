/**
 * Zustand store for app UI state
 */

import { create } from "zustand";

export interface AppState {
  isDarkTheme: boolean;
  isLoading: boolean;
  errorMessage?: string;
  showErrorAlert: boolean;
  successMessage?: string;
  showSuccessAlert: boolean;
  /** URL pending extraction (set from Library redownload, consumed by HomeScreen) */
  pendingExtractUrl?: string;

  // Actions
  setDarkTheme: (isDark: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  showError: (message: string) => void;
  hideError: () => void;
  showSuccess: (message: string) => void;
  hideSuccess: () => void;
  setPendingExtractUrl: (url: string | undefined) => void;
}

const useAppStore = create<AppState>((set) => ({
  isDarkTheme: true,
  isLoading: false,
  showErrorAlert: false,
  showSuccessAlert: false,

  setDarkTheme: (isDark: boolean) => {
    set({ isDarkTheme: isDark });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  showError: (message: string) => {
    set({ errorMessage: message, showErrorAlert: true });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      set({ showErrorAlert: false });
    }, 3000);
  },

  hideError: () => {
    set({ showErrorAlert: false });
  },

  showSuccess: (message: string) => {
    set({ successMessage: message, showSuccessAlert: true });
    // Auto-hide after 2 seconds
    setTimeout(() => {
      set({ showSuccessAlert: false });
    }, 2000);
  },

  hideSuccess: () => {
    set({ showSuccessAlert: false });
  },

  setPendingExtractUrl: (url) => {
    set({ pendingExtractUrl: url });
  },
}));

export default useAppStore;

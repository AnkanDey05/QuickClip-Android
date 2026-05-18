/**
 * Hook for detecting shared content (share intent)
 * Intercepts URLs shared from other apps
 */

import { useEffect } from "react";
import ReceiveSharingIntent from "react-native-receive-sharing-intent";

export function useSharedContent(
  onReceive: (url: string) => void,
  onError?: (error: Error) => void
): void {
  useEffect(() => {
    const handleReceivedFiles = (files: Record<string, unknown>[] | null) => {
      if (files && files.length > 0) {
        const file = files[0] as Record<string, unknown>;
        const url = (file.weblink || file.text) as string | undefined;
        if (url) {
          onReceive(url);
        }
      }
    };

    const handleError = (error: unknown) => {
      const err =
        error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(err);
      } else {
        console.warn("useSharedContent error:", err);
      }
    };

    try {
      ReceiveSharingIntent.getReceivedFiles(
        handleReceivedFiles,
        handleError,
        "QuickClip"
      );
    } catch (error) {
      handleError(error);
    }

    return () => {
      try {
        ReceiveSharingIntent.clearReceivedFiles();
      } catch (error) {
        console.warn("Error clearing received files:", error);
      }
    };
  }, [onReceive, onError]);
}

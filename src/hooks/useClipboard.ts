/**
 * Hook for clipboard access
 */

import { useCallback, useState } from "react";
import { Clipboard } from "react-native";

export function useClipboard(): {
  clipboardText: string | null;
  hasError: boolean;
  error: Error | null;
  getClipboardText: () => Promise<string | null>;
  setClipboardText: (text: string) => Promise<void>;
} {
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getClipboardText = useCallback(async (): Promise<string | null> => {
    try {
      setHasError(false);
      setError(null);
      const text = await Clipboard.getString();
      setClipboardText(text);
      return text || null;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error(String(err));
      setError(error);
      setHasError(true);
      return null;
    }
  }, []);

  const setClipboardTextCallback = useCallback(
    async (text: string): Promise<void> => {
      try {
        setHasError(false);
        setError(null);
        await Clipboard.setString(text);
        setClipboardText(text);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(String(err));
        setError(error);
        setHasError(true);
      }
    },
    []
  );

  return {
    clipboardText,
    hasError,
    error,
    getClipboardText,
    setClipboardText: setClipboardTextCallback,
  };
}

/**
 * ShareTracker — Tracks URLs already processed by the SharePopup
 * so the main app's ClipboardBanner doesn't re-extract them.
 */

import RNFS from 'react-native-fs';

const HANDLED_FILE = `${RNFS.DocumentDirectoryPath}/.quickclip_last_share.json`;

/** Mark a URL as handled by the share popup */
export async function markShareHandled(url: string): Promise<void> {
  try {
    const data = JSON.stringify({ url, timestamp: Date.now() });
    await RNFS.writeFile(HANDLED_FILE, data, 'utf8');
  } catch (e) {
    // Ignore
  }
}

/** Check if a URL was recently handled by the share popup (within 5 minutes) */
export async function wasShareHandled(url: string): Promise<boolean> {
  try {
    const exists = await RNFS.exists(HANDLED_FILE);
    if (!exists) return false;
    const content = await RNFS.readFile(HANDLED_FILE, 'utf8');
    const data = JSON.parse(content);
    // Consider it handled if the same URL was processed within the last 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (data.url === url && Date.now() - data.timestamp < fiveMinutes) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

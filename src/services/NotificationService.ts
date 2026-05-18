/**
 * NotificationService — Download notification management.
 *
 * Uses @notifee/react-native for rich local notifications with:
 *  - Progress bars for active downloads
 *  - Action buttons (Pause, Cancel, Open, Share, Retry)
 *  - Persistent notification channel
 *
 * NOTE: Requires `@notifee/react-native` to be installed.
 *       Run: npm install @notifee/react-native
 *       Then rebuild the native Android project.
 */

import useDownloadStore from '../store/downloadStore';
import useSettingsStore from '../store/settingsStore';

// Lazy import notifee — it may not be installed yet
let notifee: any = null;
let AndroidImportance: any = null;
let EventType: any = null;

async function loadNotifee() {
  if (notifee) return true;
  try {
    const mod = require('@notifee/react-native');
    notifee = mod.default;
    AndroidImportance = mod.AndroidImportance;
    EventType = mod.EventType;
    return true;
  } catch (e) {
    console.warn('[Notifications] @notifee/react-native not installed. Notifications disabled.');
    return false;
  }
}

const CHANNEL_ID = 'quickclip-downloads';
const CHANNEL_NAME = 'Download Progress';

/** Create the notification channel (Android) */
async function createChannel() {
  const ok = await loadNotifee();
  if (!ok) return;

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    importance: AndroidImportance.DEFAULT,
    vibration: false,
  });
}

/** Show/update a download progress notification */
export async function showDownloadProgress(
  id: string,
  title: string,
  progress: number, // 0-100
) {
  if (!useSettingsStore.getState().notificationsEnabled) return;
  const ok = await loadNotifee();
  if (!ok) return;

  await createChannel();

  await notifee.displayNotification({
    id: `dl_${id}`,
    title: 'Downloading...',
    body: title,
    android: {
      channelId: CHANNEL_ID,
      ongoing: true,
      onlyAlertOnce: true,
      progress: {
        max: 100,
        current: Math.round(progress),
      },
      pressAction: { id: 'default' },
      actions: [
        { title: 'Pause', pressAction: { id: `pause_${id}` } },
        { title: 'Cancel', pressAction: { id: `cancel_${id}` } },
      ],
    },
  });
}

/** Show download complete notification */
export async function showDownloadComplete(
  id: string,
  title: string,
  filePath: string,
) {
  if (!useSettingsStore.getState().notificationsEnabled) return;
  const ok = await loadNotifee();
  if (!ok) return;

  await createChannel();

  await notifee.displayNotification({
    id: `dl_${id}`,
    title: '✅ Download Complete',
    body: title,
    android: {
      channelId: CHANNEL_ID,
      ongoing: false,
      pressAction: { id: 'default' },
      actions: [
        { title: 'Open', pressAction: { id: `open_${id}` } },
        { title: 'Share', pressAction: { id: `share_${id}` } },
      ],
    },
  });
}

/** Show download failed notification */
export async function showDownloadFailed(
  id: string,
  title: string,
  error: string,
) {
  if (!useSettingsStore.getState().notificationsEnabled) return;
  const ok = await loadNotifee();
  if (!ok) return;

  await createChannel();

  await notifee.displayNotification({
    id: `dl_${id}`,
    title: '❌ Download Failed',
    body: `${title}\n${error}`,
    android: {
      channelId: CHANNEL_ID,
      ongoing: false,
      pressAction: { id: 'default' },
      actions: [
        { title: 'Retry', pressAction: { id: `retry_${id}` } },
      ],
    },
  });
}

/** Cancel a notification */
export async function cancelNotification(id: string) {
  const ok = await loadNotifee();
  if (!ok) return;
  try {
    await notifee.cancelNotification(`dl_${id}`);
  } catch (e) {
    // Ignore
  }
}

/** Handle notification action presses */
export async function setupNotificationHandlers() {
  const ok = await loadNotifee();
  if (!ok) return;

  notifee.onForegroundEvent(({ type, detail }: { type: any; detail: any }) => {
    if (type !== EventType.ACTION_PRESS) return;

    const actionId = detail?.pressAction?.id;
    if (!actionId) return;

    // Parse action: format is "action_downloadId"
    const parts = actionId.split('_');
    const action = parts[0];
    const downloadId = parts.slice(1).join('_');

    const store = useDownloadStore.getState();

    switch (action) {
      case 'pause':
        // Kill native process then mark paused
        import('../services/extractors/ytdlpBridge').then(({ cancelDownloadNative }) => {
          cancelDownloadNative(downloadId);
        });
        store.pauseDownload(downloadId);
        cancelNotification(downloadId);
        break;

      case 'cancel':
        import('../services/extractors/ytdlpBridge').then(({ cancelDownloadNative }) => {
          cancelDownloadNative(downloadId);
        });
        store.cancelDownload(downloadId);
        cancelNotification(downloadId);
        break;

      case 'open':
        const download = store.getDownload(downloadId);
        if (download?.filePath) {
          import('../services/extractors/ytdlpBridge').then(({ openFileNative }) => {
            openFileNative(download.filePath!);
          });
        }
        break;

      case 'share':
        const dl = store.getDownload(downloadId);
        if (dl?.filePath) {
          import('../services/extractors/ytdlpBridge').then(({ shareFileNative }) => {
            shareFileNative(dl.filePath!, dl.title);
          });
        }
        break;

      case 'retry':
        store.updateDownload(downloadId, {
          status: 'pending',
          progress: 0,
          speed: 0,
          error: undefined,
        });
        break;
    }
  });

  // Also handle background events
  notifee.onBackgroundEvent(async ({ type, detail }: { type: any; detail: any }) => {
    if (type !== EventType.ACTION_PRESS) return;

    const actionId = detail?.pressAction?.id;
    if (!actionId) return;

    const parts = actionId.split('_');
    const action = parts[0];
    const downloadId = parts.slice(1).join('_');

    const store = useDownloadStore.getState();

    if (action === 'pause') {
      store.pauseDownload(downloadId);
    } else if (action === 'cancel') {
      store.cancelDownload(downloadId);
    } else if (action === 'retry') {
      store.updateDownload(downloadId, {
        status: 'pending',
        progress: 0,
        speed: 0,
        error: undefined,
      });
    }
  });
}

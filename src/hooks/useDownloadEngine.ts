/**
 * useDownloadEngine — Global download processing hook.
 *
 * Watches for pending downloads and auto-starts them via the native yt-dlp bridge.
 * This hook must be mounted at the App level so downloads continue
 * regardless of which screen/tab is active.
 */

import { useEffect, useRef, useCallback } from 'react';
import RNFS from 'react-native-fs';

import useDownloadStore from '../store/downloadStore';
import { downloadVideo, downloadVideoSection } from '../services/extractors/ytdlpBridge';
import { sanitizeFilename } from '../utils/common';
import {
  showDownloadProgress,
  showDownloadComplete,
  showDownloadFailed,
  cancelNotification,
  setupNotificationHandlers,
} from '../services/NotificationService';

const useDownloadEngine = () => {
  const downloads = useDownloadStore((s) => s.downloads);
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const activeIdsRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<Record<string, number>>({});

  const activeDownloads = Object.values(downloads).filter(
    (d) =>
      d.status === 'downloading' ||
      d.status === 'paused' ||
      d.status === 'pending',
  );

  // Setup notification action handlers once
  useEffect(() => {
    setupNotificationHandlers();
  }, []);

  useEffect(() => {
    activeDownloads.forEach((item) => {
      if (item.status === 'pending' && !activeIdsRef.current.has(item.id)) {
        activeIdsRef.current.add(item.id);
        updateDownload(item.id, { status: 'downloading' });

        const baseDir = RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath;
        const idealOutputDir = `${baseDir}/QuickClip`;
        const baseName = sanitizeFilename(item.title);
        const isAudio = item.format?.hasVideo === false;
        const fileExt = isAudio ? '.mp3' : '.mp4';
        const qualityTag = item.format?.quality
          ? `_${item.format.quality.replace(/\s+/g, '_').replace(/[()]/g, '')}`
          : '';
        const formatSelector = item.format?.url || undefined;

        console.log('=== DOWNLOAD START ===');
        console.log('  ID:', item.id);
        console.log('  Title:', item.title);
        console.log('  URL:', item.url);
        console.log('  Format selector:', formatSelector);
        console.log('  Quality:', item.format?.quality);
        console.log('  Is audio:', isAudio);
        console.log('  File extension:', fileExt);
        console.log('  Base dir:', baseDir);
        console.log('======================');

        const startDownload = async (finalDir: string) => {
          let fileName = `${baseName}${qualityTag}`;
          let ytDlpTargetPath = `${finalDir}/${fileName}${fileExt}`;

          // Handle duplicates
          let counter = 1;
          while (await RNFS.exists(ytDlpTargetPath)) {
            ytDlpTargetPath = `${finalDir}/${fileName}(${counter})${fileExt}`;
            counter++;
          }

          lastUpdateRef.current[item.id] = Date.now();
          console.log(
            `[DL:${item.id.slice(0, 6)}] Starting native download to: ${ytDlpTargetPath}${item.isClip ? ` [CLIP ${item.clipStart}-${item.clipEnd}s]` : ''}`,
          );

          // Choose download method based on clip flag
          const downloadFn = item.isClip && item.clipStart !== undefined && item.clipEnd !== undefined
            ? () => downloadVideoSection(
                item.id,
                item.url,
                ytDlpTargetPath,
                formatSelector,
                isAudio,
                item.clipStart!,
                item.clipEnd!,
                progressCallback,
              )
            : () => downloadVideo(
                item.id,
                item.url,
                ytDlpTargetPath,
                formatSelector,
                isAudio,
                progressCallback,
              );

          const progressCallback = (event: any) => {
              const now = Date.now();
              const lastUpdate = lastUpdateRef.current[item.id] || 0;

              // Throttle UI updates to every 500ms
              if (now - lastUpdate > 500 || event.progress === 100) {
                lastUpdateRef.current[item.id] = now;
                const prog = Math.max(0, event.progress || 0) / 100;

                // Parse speed from yt-dlp raw line
                let currentSpeed = 0;
                if (event.line) {
                  const speedMatch = event.line.match(
                    /at\s+([0-9.]+)\s*(KiB|MiB|GiB)\/s/,
                  );
                  if (speedMatch) {
                    const value = parseFloat(speedMatch[1]);
                    const unit = speedMatch[2];
                    if (unit === 'KiB') currentSpeed = value / 1024;
                    else if (unit === 'MiB') currentSpeed = value;
                    else if (unit === 'GiB') currentSpeed = value * 1024;
                  }
                }

                console.log(
                  `[DL:${item.id.slice(0, 6)}] Progress: ${(prog * 100).toFixed(1)}% | Speed: ${currentSpeed.toFixed(2)} MB/s | ETA: ${event.eta}s`,
                );

                updateDownload(item.id, {
                  progress: Math.min(prog, 1),
                  eta: event.eta,
                  speed: currentSpeed,
                });

                // Update notification
                showDownloadProgress(
                  item.id,
                  item.title,
                  prog * 100,
                );
              }
          };

          downloadFn()
            .then(() => {
              console.log(
                `[DL:${item.id.slice(0, 6)}] ✅ COMPLETED! File: ${ytDlpTargetPath}`,
              );
              updateDownload(item.id, {
                status: 'completed',
                progress: 1,
                filePath: ytDlpTargetPath,
              });
              showDownloadComplete(item.id, item.title, ytDlpTargetPath);
              activeIdsRef.current.delete(item.id);
              delete lastUpdateRef.current[item.id];
            })
            .catch((err) => {
              console.log(
                `[DL:${item.id.slice(0, 6)}] ❌ FAILED: ${err.message} (code: ${err.code})`,
              );
              if (
                err.message === 'Download cancelled' ||
                err.code === 'YTDLP_CANCELLED'
              ) {
                updateDownload(item.id, { status: 'cancelled' });
                cancelNotification(item.id);
              } else {
                updateDownload(item.id, {
                  status: 'error',
                  error: err.message || 'Download failed',
                });
                showDownloadFailed(
                  item.id,
                  item.title,
                  err.message || 'Download failed',
                );
              }
              activeIdsRef.current.delete(item.id);
              delete lastUpdateRef.current[item.id];
            });
        };

        RNFS.mkdir(idealOutputDir)
          .then(() => {
            console.log(
              `[DL:${item.id.slice(0, 6)}] Directory ready: ${idealOutputDir}`,
            );
            startDownload(idealOutputDir);
          })
          .catch(() => {
            console.warn(
              `[DL:${item.id.slice(0, 6)}] Could not create subfolder, falling back to: ${baseDir}`,
            );
            startDownload(baseDir);
          });
      }
    });
  }, [activeDownloads, updateDownload]);

  return { activeIdsRef };
};

export default useDownloadEngine;

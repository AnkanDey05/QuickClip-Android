/**
 * SharePopupScreen — Standalone entry point for the transparent ShareActivity.
 *
 * When a user shares a URL to QuickClip from another app, Android launches
 * ShareActivity (transparent) which renders this component. It receives the
 * shared URL via initialProps.sharedUrl (set in ShareActivity.kt).
 *
 * The UI shows a dark translucent backdrop with the VideoCard popup centered.
 * Tapping the backdrop or pressing Cancel dismisses the activity.
 */

import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
  ActivityIndicator,
  Pressable,
  ScrollView,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, Text, useTheme, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeIn, SlideInDown, FadeInDown } from 'react-native-reanimated';
import { buildDynamicTheme } from '../constants/theme';
import useDownloadStore from '../store/downloadStore';
import useSettingsStore from '../store/settingsStore';
import useDownloadEngine from '../hooks/useDownloadEngine';
import { VideoCard } from '../components/VideoCard';
import { extractVideoInfo } from '../services/extractors/ytdlpBridge';
import { VideoInfo, VideoFormat } from '../types';
import { generateId } from '../utils/common';
import { SPACING, RADIUS } from '../constants/colors';
import { markShareHandled } from '../utils/shareTracker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SharePopupProps {
  sharedUrl?: string;
}

const SharePopupApp: React.FC<SharePopupProps> = ({ sharedUrl }) => {
  const [ready, setReady] = useState(false);

  const themes = useMemo(() => {
    try {
      return buildDynamicTheme();
    } catch (e) {
      const { MD3DarkTheme } = require('react-native-paper');
      return { paperTheme: MD3DarkTheme };
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Load settings FIRST so downloadStore can resolve the active path
        await useSettingsStore.getState().loadSettings();
        await useDownloadStore.getState().loadFromFilesystem();
      } catch (e) {
        console.warn('[SharePopup] Store init failed:', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={themes.paperTheme}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SharePopupContent sharedUrl={sharedUrl} ready={ready} />
      </PaperProvider>
    </SafeAreaProvider>
  );
};

interface ContentProps {
  sharedUrl?: string;
  ready: boolean;
}

function SharePopupContent({ sharedUrl, ready }: ContentProps) {
  const theme = useTheme();
  useDownloadEngine();

  const [url, setUrl] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const addDownload = useDownloadStore((s) => s.addDownload);

  // Extract URL from props (passed from ShareActivity.kt via initialProps)
  useEffect(() => {
    if (sharedUrl && !url) {
      console.log('[SharePopup] Received URL from intent:', sharedUrl);
      const urlMatch = sharedUrl.match(/https?:\/\/\S+/i);
      const extractedUrl = urlMatch ? urlMatch[0] : sharedUrl;
      setUrl(extractedUrl);
    }
  }, [sharedUrl]);

  // Also try ReceiveSharingIntent as a fallback
  useEffect(() => {
    if (!sharedUrl && ready) {
      try {
        const ReceiveSharingIntent = require('react-native-receive-sharing-intent').default;
        ReceiveSharingIntent.getReceivedFiles(
          (files: any) => {
            if (files && files.length > 0) {
              const file = files[0];
              const link = file.weblink || file.text;
              if (link && !url) {
                const urlMatch = link.match(/https?:\/\/\S+/i);
                setUrl(urlMatch ? urlMatch[0] : link);
              }
            }
          },
          (error: any) => console.warn('[SharePopup] ReceiveSharingIntent error:', error),
          'QuickClip',
        );
      } catch (e) {
        console.warn('[SharePopup] ReceiveSharingIntent fallback failed:', e);
      }
    }
  }, [sharedUrl, ready]);

  // Start extraction when URL is available and stores are ready
  useEffect(() => {
    if (url && ready && !isLoading && !videoInfo && !errorMsg) {
      extract(url);
    }
  }, [url, ready]);

  const extract = async (targetUrl: string) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      console.log('[SharePopup] Extracting:', targetUrl);
      const info = await extractVideoInfo(targetUrl);
      setVideoInfo(info);
    } catch (e: any) {
      console.warn('[SharePopup] Extraction failed:', e);
      setErrorMsg(e.message || 'Failed to extract video info.');
    } finally {
      setIsLoading(false);
    }
  };

  const dismiss = useCallback(() => {
    BackHandler.exitApp();
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [dismiss]);

  // Drag-to-dismiss gesture on the handle bar
  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderRelease: (_, gs) => {
        // If dragged down > 80px or fast fling, dismiss
        if (gs.dy > 80 || gs.vy > 0.5) {
          BackHandler.exitApp();
        }
      },
    })
  ).current;

  const handleDownload = (format: VideoFormat, folderId?: string) => {
    if (!videoInfo) return;
    addDownload({
      id: generateId(),
      videoId: videoInfo.id,
      url: videoInfo.url,
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      progress: 0,
      status: 'pending' as const,
      speed: 0,
      format,
      folderId: folderId || 'uncategorized',
      createdAt: Date.now(),
    });
    // Mark this URL as handled so ClipboardBanner won't re-extract
    if (videoInfo.url) markShareHandled(videoInfo.url);
    dismiss();
  };

  const handleClipDownload = (format: VideoFormat, startSec: number, endSec: number) => {
    if (!videoInfo) return;
    addDownload({
      id: generateId(),
      videoId: videoInfo.id,
      url: videoInfo.url,
      title: `${videoInfo.title} [Clip]`,
      thumbnail: videoInfo.thumbnail,
      status: 'pending' as const,
      progress: 0,
      speed: 0,
      format,
      createdAt: Date.now(),
      isClip: true,
      clipStart: startSec,
      clipEnd: endSec,
    });
    // Mark this URL as handled so ClipboardBanner won't re-extract
    if (videoInfo.url) markShareHandled(videoInfo.url);
    dismiss();
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
      {/* Backdrop tap area — only the empty space above the sheet */}
      <Pressable style={styles.backdropTouchArea} onPress={dismiss} />

      {/* Bottom sheet popup */}
      <Animated.View
        entering={SlideInDown.duration(350).springify()}
        style={[styles.popupWrap, { backgroundColor: theme.colors.elevation.level2 }]}
      >
        {/* Drag handle — swipe down to dismiss */}
        <View {...dragResponder.panHandlers} style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Loading State */}
          {(isLoading || (!ready && !errorMsg)) && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.stateCard}>
              <View style={[styles.loadingBox, { backgroundColor: theme.colors.elevation.level3 }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  variant="bodyLarge"
                  style={{ color: theme.colors.onSurface, marginTop: SPACING.md, fontWeight: '600' }}
                >
                  Extracting video info...
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs }}
                >
                  This may take a moment
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Error State */}
          {errorMsg && !isLoading && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.stateCard}>
              <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Icon name="alert-circle-outline" size={40} color={theme.colors.onErrorContainer} />
                <Text
                  variant="titleSmall"
                  style={{ color: theme.colors.onErrorContainer, marginTop: SPACING.sm, fontWeight: '700' }}
                >
                  Extraction Failed
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onErrorContainer, marginTop: SPACING.xs, textAlign: 'center' }}
                >
                  {errorMsg}
                </Text>
                <View style={styles.errorActions}>
                  <Button
                    mode="contained-tonal"
                    onPress={() => url && extract(url)}
                    style={{ marginRight: SPACING.sm }}
                    icon="refresh"
                  >
                    Retry
                  </Button>
                  <Button mode="text" onPress={dismiss}>
                    Cancel
                  </Button>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Video Result */}
          {videoInfo && !isLoading && (
            <VideoCard
              video={videoInfo}
              onDownload={handleDownload}
              onClipDownload={handleClipDownload}
              onCancel={dismiss}
              compact
            />
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    flex: 1,
  },
  popupWrap: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  contentInner: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxl,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
});

export default SharePopupApp;

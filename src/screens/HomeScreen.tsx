/**
 * HomeScreen — Rich content home with URL input, platform grid,
 * recent downloads, and download stats.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Badge, IconButton } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { UrlInput } from '../components/UrlInput';
import { VideoCard } from '../components/VideoCard';
import ClipboardBanner from '../components/ClipboardBanner';
import PlatformGrid from '../components/PlatformGrid';
import RecentDownloads from '../components/RecentDownloads';
import StatsCard from '../components/StatsCard';

import { extractVideoInfo } from '../services/extractors/ytdlpBridge';
import { VideoInfo, VideoFormat } from '../types';
import useAppStore from '../store/appStore';
import useDownloadStore from '../store/downloadStore';
import { generateId } from '../utils/common';
import { useSharedContent } from '../hooks/useSharedContent';
import { SPACING, RADIUS } from '../constants/colors';

const HomeScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const { isLoading, setLoading, showError, pendingExtractUrl, setPendingExtractUrl } = useAppStore();
  const addDownload = useDownloadStore((state) => state.addDownload);
  const downloads = useDownloadStore((s) => s.downloads);

  // Compute active download stats for the progress ring
  const activeDownloads = Object.values(downloads).filter(
    (d) => d.status === 'downloading' || d.status === 'paused' || d.status === 'pending'
  );
  const hasActiveDownloads = activeDownloads.length > 0;
  const aggregateProgress = activeDownloads.length > 0
    ? activeDownloads.reduce((sum, d) => sum + (d.progress || 0), 0) / activeDownloads.length
    : 0;

  useSharedContent((url) => {
    handleExtract(url);
  });

  // Handle pendingExtractUrl from Library redownload
  React.useEffect(() => {
    if (pendingExtractUrl) {
      const url = pendingExtractUrl;
      setPendingExtractUrl(undefined);
      handleExtract(url);
    }
  }, [pendingExtractUrl]);

  const handleExtract = async (url: string) => {
    try {
      setLoading(true);
      setVideoInfo(null);
      const info = await extractVideoInfo(url);
      setVideoInfo(info);
    } catch (error: any) {
      Alert.alert('Extraction Failed', error.message || 'Could not fetch video info.');
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format: VideoFormat, folderId?: string) => {
    if (!videoInfo) return;

    const newDownload = {
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
    };

    addDownload(newDownload);
    setVideoInfo(null);
    Alert.alert(
      'Download Started',
      'Check the Downloads tab to track progress.',
      [{ text: 'OK' }],
    );
  };

  const handleClipDownload = (format: VideoFormat, startSec: number, endSec: number) => {
    if (!videoInfo) return;

    const newDownload = {
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
    };

    addDownload(newDownload);
    setVideoInfo(null);
    Alert.alert(
      'Clip Download Started',
      `Downloading ${Math.round(endSec - startSec)}s clip.`,
      [{ text: 'OK' }],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Text
                variant="headlineMedium"
                style={[styles.appTitle, { color: theme.colors.onBackground }]}
              >
                Quick
              </Text>
              <Text
                variant="headlineMedium"
                style={[styles.appTitle, { color: theme.colors.primary }]}
              >
                Clip
              </Text>
            </View>
            <View style={styles.headerActions}>
              {/* Download Progress Ring */}
              {hasActiveDownloads && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Downloads')}
                  style={[styles.progressRingWrap, { borderColor: theme.colors.primary }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.progressRingInner}>
                    <Icon name="download" size={16} color={theme.colors.primary} />
                  </View>
                  <Badge
                    size={16}
                    style={[
                      styles.downloadBadge,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    {activeDownloads.length}
                  </Badge>
                </TouchableOpacity>
              )}
              {/* Settings Gear */}
              <IconButton
                icon="cog-outline"
                size={24}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => navigation.navigate('Settings' as never)}
              />
            </View>
          </View>
        </Animated.View>

        {/* URL Input */}
        <UrlInput onSubmit={handleExtract} isLoading={isLoading} />

        {/* Clipboard Banner */}
        <ClipboardBanner onPaste={handleExtract} />

        {/* Loading State */}
        {isLoading && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.loadingWrap}
          >
            <View
              style={[
                styles.loadingCard,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginLeft: SPACING.md }}
              >
                Extracting video info...
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Video Result */}
        {videoInfo && !isLoading && (
          <View style={styles.videoSection}>
            <VideoCard video={videoInfo} onDownload={handleDownload} onClipDownload={handleClipDownload} onCancel={() => setVideoInfo(null)} />
          </View>
        )}

        {/* Content Sections (show when no video is displayed) */}
        {!videoInfo && !isLoading && (
          <View style={styles.sections}>
            <StatsCard style={styles.section} />
            <RecentDownloads style={styles.section} />
            <PlatformGrid style={styles.section} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  progressRingWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  loadingWrap: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  videoSection: {
    marginBottom: SPACING.lg,
  },
  sections: {
    gap: SPACING.lg,
  },
  section: {
    marginBottom: 0,
  },
});

export default HomeScreen;

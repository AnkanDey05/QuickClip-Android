/**
 * DownloadsScreen — Combined active downloads + completed library.
 * Active downloads on top, completed below, with filter chips.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, Share, Alert, Linking, Platform } from 'react-native';
import { Text, useTheme, ProgressBar, Chip, TouchableRipple, IconButton } from 'react-native-paper';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';

import useDownloadStore from '../store/downloadStore';
import { DownloadItem } from '../types';
import { SPACING, RADIUS } from '../constants/colors';

type FilterType = 'all' | 'active' | 'completed';

const DownloadsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [filter, setFilter] = useState<FilterType>('all');

  // Subscribe to actual state so component re-renders on changes
  const downloads = useDownloadStore((s) => s.downloads);
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const pauseDownload = useDownloadStore((s) => s.pauseDownload);
  const cancelDownload = useDownloadStore((s) => s.cancelDownload);
  const removeFromLibrary = useDownloadStore((s) => s.removeFromLibrary);

  const allDownloads = Object.values(downloads);
  const activeDownloads = allDownloads.filter(
    (d) => d.status === 'downloading' || d.status === 'paused' || d.status === 'pending',
  );
  const completedDownloads = allDownloads.filter((d) => d.status === 'completed');

  const getFilteredItems = (): DownloadItem[] => {
    switch (filter) {
      case 'active':
        return activeDownloads;
      case 'completed':
        return completedDownloads;
      default:
        return allDownloads.sort((a, b) => {
          const statusOrder = { downloading: 0, paused: 1, pending: 2, error: 3, completed: 4, cancelled: 5 };
          const aOrder = statusOrder[a.status] ?? 5;
          const bOrder = statusOrder[b.status] ?? 5;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }
  };

  const filteredItems = getFilteredItems();

  const handlePauseResume = (item: DownloadItem) => {
    if (item.status === 'downloading') {
      // Kill the native yt-dlp process before marking as paused
      import('../services/extractors/ytdlpBridge').then(({ cancelDownloadNative }) => {
        cancelDownloadNative(item.id);
      });
      pauseDownload(item.id);
    } else if (item.status === 'paused') {
      // Re-queue as pending so the global engine picks it up
      updateDownload(item.id, { status: 'pending', progress: 0, speed: 0 });
    }
  };

  const handleCancel = (item: DownloadItem) => {
    import('../services/extractors/ytdlpBridge').then(({ cancelDownloadNative }) => {
      cancelDownloadNative(item.id);
    });
    cancelDownload(item.id);
  };

  const handleDelete = (item: DownloadItem) => {
    Alert.alert(
      'Delete Download',
      `Delete "${item.title}"? This will remove the file from your device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.filePath) {
              try {
                const exists = await RNFS.exists(item.filePath);
                if (exists) {
                  await RNFS.unlink(item.filePath);
                  console.log(`[Library] Deleted file: ${item.filePath}`);
                }
              } catch (err: any) {
                console.warn('[Library] Failed to delete file:', err.message);
              }
            }
            removeFromLibrary(item.id);
          },
        },
      ],
    );
  };

  const handleOpen = async (item: DownloadItem) => {
    if (!item.filePath) return;
    try {
      const exists = await RNFS.exists(item.filePath);
      if (!exists) {
        Alert.alert('File Not Found', 'This file may have been moved or deleted.');
        removeFromLibrary(item.id);
        return;
      }
      console.log(`[File] Opening: ${item.filePath}`);
      const { openFileNative } = await import('../services/extractors/ytdlpBridge');
      await openFileNative(item.filePath);
    } catch (err: any) {
      console.warn(`[File] Open failed: ${err.message}`);
      Alert.alert(
        'Cannot Open File',
        `The file is saved at:\n${item.filePath}\n\nOpen it from your File Manager.`,
        [{ text: 'OK' }],
      );
    }
  };

  const handleShare = async (item: DownloadItem) => {
    if (!item.filePath) return;
    try {
      const exists = await RNFS.exists(item.filePath);
      if (!exists) {
        Alert.alert('File Not Found', 'This file may have been moved or deleted.');
        return;
      }
      console.log(`[File] Sharing: ${item.filePath}`);
      const { shareFileNative } = await import('../services/extractors/ytdlpBridge');
      await shareFileNative(item.filePath, item.title);
    } catch (err: any) {
      console.warn(`[File] Share failed: ${err.message}`);
      // Fallback to RN Share with just the title
      try {
        await Share.share({ message: `${item.title}\n${item.filePath}` });
      } catch (_) {}
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderItem = ({ item, index }: { item: DownloadItem; index: number }) => {
    const isActive =
      item.status === 'downloading' ||
      item.status === 'paused' ||
      item.status === 'pending';
    const isPaused = item.status === 'paused';
    const isError = item.status === 'error';
    const isCompleted = item.status === 'completed';

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).duration(300).springify()}
        layout={Layout.springify()}
      >
        <View
          style={[
            styles.itemCard,
            { backgroundColor: theme.colors.elevation.level2 },
          ]}
        >
          <View style={styles.itemRow}>
            {/* Thumbnail */}
            <View style={styles.thumbContainer}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.itemThumb} />
              ) : (
                <View
                  style={[
                    styles.itemThumb,
                    styles.placeholderThumb,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Icon name="video" size={20} color={theme.colors.onSurfaceVariant} />
                </View>
              )}
              {/* Status overlay */}
              {isActive && (
                <View style={styles.statusOverlay}>
                  <Icon
                    name={isPaused ? 'pause' : 'download'}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
              )}
              {isCompleted && (
                <View style={[styles.statusOverlay, { backgroundColor: '#4CAF5099' }]}>
                  <Icon name="check" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.itemInfo}>
              <Text
                variant="bodyMedium"
                numberOfLines={2}
                style={[styles.itemTitle, { color: theme.colors.onSurface }]}
              >
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.format?.quality || 'HD'}
                </Text>
                {isActive && item.status === 'downloading' && (
                  <>
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.primary }}
                    >
                      {' '}• {(item.speed || 0).toFixed(1)} MB/s
                    </Text>
                  </>
                )}
                {isPaused && (
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.tertiary }}
                  >
                    {' '}• Paused
                  </Text>
                )}
                {isError && (
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.error }}
                  >
                    {' '}• Failed
                  </Text>
                )}
                {isCompleted && (
                  <>
                    {item.totalBytes ? (
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {' '}• {formatFileSize(item.totalBytes)}
                      </Text>
                    ) : null}
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {' '}• {new Date(item.createdAt || 0).toLocaleDateString()}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionCol}>
              {isActive && (
                <>
                  <TouchableRipple
                    onPress={() => handlePauseResume(item)}
                    borderless
                    style={styles.actionBtn}
                    disabled={isError}
                  >
                    <Icon
                      name={isPaused ? 'play' : 'pause'}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableRipple>
                  <TouchableRipple
                    onPress={() => handleCancel(item)}
                    borderless
                    style={styles.actionBtn}
                  >
                    <Icon name="close" size={18} color={theme.colors.error} />
                  </TouchableRipple>
                </>
              )}
              {isCompleted && (
                <>
                  <TouchableRipple
                    onPress={() => handleOpen(item)}
                    borderless
                    style={styles.actionBtn}
                  >
                    <Icon name="play-circle-outline" size={20} color={theme.colors.primary} />
                  </TouchableRipple>
                  <TouchableRipple
                    onPress={() => handleShare(item)}
                    borderless
                    style={styles.actionBtn}
                  >
                    <Icon name="share-variant-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  </TouchableRipple>
                  <TouchableRipple
                    onPress={() => handleDelete(item)}
                    borderless
                    style={styles.actionBtn}
                  >
                    <Icon name="delete-outline" size={18} color={theme.colors.error} />
                  </TouchableRipple>
                </>
              )}
              {isError && (
                <TouchableRipple
                  onPress={() => handleCancel(item)}
                  borderless
                  style={styles.actionBtn}
                >
                  <Icon name="close" size={18} color={theme.colors.error} />
                </TouchableRipple>
              )}
            </View>
          </View>

          {/* Progress bar for active downloads */}
          {isActive && (
            <View style={styles.progressWrap}>
              <ProgressBar
                progress={item.progress || 0}
                color={isPaused ? theme.colors.outline : theme.colors.primary}
                style={[
                  styles.progressBar,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
              <Text
                variant="labelSmall"
                style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}
              >
                {Math.round((item.progress || 0) * 100)}%
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text
          variant="headlineMedium"
          style={[styles.headerTitle, { color: theme.colors.onBackground }]}
        >
          Downloads
        </Text>
        <IconButton
          icon="close"
          size={24}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => navigation.goBack()}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'completed'] as FilterType[]).map((f) => {
          const isSelected = filter === f;
          const count =
            f === 'all'
              ? allDownloads.length
              : f === 'active'
              ? activeDownloads.length
              : completedDownloads.length;
          return (
            <Chip
              key={f}
              mode={isSelected ? 'flat' : 'outlined'}
              selected={isSelected}
              showSelectedCheck={false}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: theme.colors.secondaryContainer },
              ]}
              textStyle={{
                color: isSelected
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.onSurfaceVariant,
                fontSize: 13,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </Chip>
          );
        })}
      </View>

      {/* Download List */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <Icon
              name="download-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
          <Text
            variant="bodyLarge"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            {filter === 'active'
              ? 'No active downloads'
              : filter === 'completed'
              ? 'No completed downloads yet'
              : 'No downloads yet'}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6 }}
          >
            Go to Home and paste a video link to start
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          extraData={downloads}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    borderRadius: RADIUS.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
    gap: SPACING.sm,
  },
  itemCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  thumbContainer: {
    position: 'relative',
  },
  itemThumb: {
    width: 64,
    height: 48,
    borderRadius: RADIUS.sm,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCol: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    minWidth: 32,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
});

export default DownloadsScreen;

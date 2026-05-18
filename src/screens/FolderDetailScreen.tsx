/**
 * FolderDetailScreen — File manager view for folder contents.
 * Features:
 *  - Long-press enters multi-select mode
 *  - Batch action bar: Share, Delete, Move
 *  - Favorites/Saved: redownload navigates to Home with URL
 *  - Individual actions: play, share, move, delete
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { Text, useTheme, TouchableRipple, Checkbox, IconButton } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import RNFS from 'react-native-fs';

import useDownloadStore from '../store/downloadStore';
import useAppStore from '../store/appStore';
import FolderPickerSheet from '../components/FolderPickerSheet';
import { DownloadItem, SavedItem, FavoriteItem } from '../types';
import { SPACING, RADIUS } from '../constants/colors';

type LibraryStackParamList = {
  LibraryMain: undefined;
  FolderDetail: { folderId: string; folderName: string; folderType: 'favorites' | 'saved' | 'user' };
};

type ListItem =
  | { kind: 'download'; data: DownloadItem }
  | { kind: 'saved'; data: SavedItem }
  | { kind: 'favorite'; data: FavoriteItem };

const FolderDetailScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LibraryStackParamList, 'FolderDetail'>>();
  const { folderId, folderName, folderType } = route.params;

  const downloads = useDownloadStore((s) => s.downloads);
  const saved = useDownloadStore((s) => s.saved);
  const favorites = useDownloadStore((s) => s.favorites);
  const removeFromLibrary = useDownloadStore((s) => s.removeFromLibrary);
  const removeSaved = useDownloadStore((s) => s.removeSaved);
  const removeFavorite = useDownloadStore((s) => s.removeFavorite);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [folderPickerIds, setFolderPickerIds] = useState<string[]>([]);
  const isSelecting = selectedIds.size > 0;

  // Build items list
  const getItems = (): ListItem[] => {
    if (folderType === 'favorites') {
      return Object.values(favorites)
        .sort((a, b) => b.favoritedAt - a.favoritedAt)
        .map((f) => ({ kind: 'favorite' as const, data: f }));
    }
    if (folderType === 'saved') {
      return Object.values(saved)
        .sort((a, b) => b.savedAt - a.savedAt)
        .map((s) => ({ kind: 'saved' as const, data: s }));
    }
    const completedDownloads = Object.values(downloads).filter((d) => {
      if (d.status !== 'completed') return false;
      if (folderId === 'uncategorized') return !d.folderId || d.folderId === 'uncategorized';
      return d.folderId === folderId;
    });
    return completedDownloads
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((d) => ({ kind: 'download' as const, data: d }));
  };

  const items = getItems();

  // Helpers
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    if (bytes < k * k) return `${(bytes / k).toFixed(0)} KB`;
    if (bytes < k * k * k) return `${(bytes / (k * k)).toFixed(1)} MB`;
    return `${(bytes / (k * k * k)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.data.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Item press: in selection mode toggles, otherwise plays/opens
  const handleItemPress = (item: ListItem) => {
    if (isSelecting) {
      toggleSelect(item.data.id);
      return;
    }
    if (item.kind === 'download') handleOpenDownload(item.data);
  };

  const handleItemLongPress = (item: ListItem) => {
    if (!isSelecting) {
      toggleSelect(item.data.id);
    }
  };

  // Individual actions
  const handleOpenDownload = async (item: DownloadItem) => {
    if (!item.filePath) return;
    try {
      const exists = await RNFS.exists(item.filePath);
      if (!exists) {
        Alert.alert('File Not Found', 'This file may have been moved or deleted.');
        removeFromLibrary(item.id);
        return;
      }
      const { openFileNative } = await import('../services/extractors/ytdlpBridge');
      await openFileNative(item.filePath);
    } catch {
      Alert.alert('Cannot Open File', `Open it from your File Manager.`);
    }
  };

  const handleShareSingle = async (filePath: string, title: string) => {
    try {
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        Alert.alert('File Not Found', 'This file may have been moved or deleted.');
        return;
      }
      const { shareFileNative } = await import('../services/extractors/ytdlpBridge');
      await shareFileNative(filePath, title);
    } catch {}
  };

  /** Navigate to Home with URL pre-filled for redownload with quality selection */
  const handleRedownload = (url: string) => {
    useAppStore.getState().setPendingExtractUrl(url);
    // Navigate up to the tab navigator and switch to Home tab
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Home' as never);
    } else {
      navigation.navigate('Home' as never);
    }
  };

  // BATCH actions
  const handleBatchDelete = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Delete Selected',
      `Delete ${count} ${count === 1 ? 'item' : 'items'}?${
        folderType === 'user' ? '\nFiles will be removed from your device.' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              if (folderType === 'favorites') {
                removeFavorite(id);
              } else if (folderType === 'saved') {
                removeSaved(id);
              } else {
                const dl = downloads[id];
                if (dl?.filePath) {
                  try {
                    const exists = await RNFS.exists(dl.filePath);
                    if (exists) await RNFS.unlink(dl.filePath);
                  } catch {}
                }
                removeFromLibrary(id);
              }
            }
            clearSelection();
          },
        },
      ],
    );
  };

  const handleBatchShare = async () => {
    // Share files one by one (Android doesn't support multi-file share natively via yt-dlp bridge)
    const filesToShare = items
      .filter((i) => selectedIds.has(i.data.id) && i.kind === 'download')
      .map((i) => (i.data as DownloadItem));

    if (filesToShare.length === 0) {
      Alert.alert('No Files', 'Selected items have no downloadable files to share.');
      return;
    }

    for (const dl of filesToShare) {
      if (dl.filePath) {
        await handleShareSingle(dl.filePath, dl.title);
      }
    }
    clearSelection();
  };

  const handleBatchMove = () => {
    const downloadIds = Array.from(selectedIds);
    setFolderPickerIds(downloadIds);
  };

  // Render
  const renderItem = ({ item: listItem, index }: { item: ListItem; index: number }) => {
    const title = listItem.data.title;
    const thumbnail = listItem.data.thumbnail;
    const isSelected = selectedIds.has(listItem.data.id);

    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 30, 300)).duration(200).springify()}
        layout={Layout.springify()}
      >
        <TouchableRipple
          onPress={() => handleItemPress(listItem)}
          onLongPress={() => handleItemLongPress(listItem)}
          borderless
          style={[
            styles.itemCard,
            {
              backgroundColor: isSelected
                ? theme.colors.primaryContainer + '33'
                : theme.colors.elevation.level2,
            },
          ]}
        >
          <View style={styles.itemRow}>
            {/* Checkbox in selection mode */}
            {isSelecting && (
              <Checkbox
                status={isSelected ? 'checked' : 'unchecked'}
                onPress={() => toggleSelect(listItem.data.id)}
                color={theme.colors.primary}
              />
            )}

            {/* Thumbnail */}
            <View style={styles.thumbContainer}>
              {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.itemThumb} />
              ) : (
                <View
                  style={[
                    styles.itemThumb,
                    styles.placeholderThumb,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Icon name="video" size={18} color={theme.colors.onSurfaceVariant} />
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
                {title}
              </Text>
              <View style={styles.metaRow}>
                {listItem.kind === 'download' && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {listItem.data.format?.quality || 'HD'}
                    {listItem.data.totalBytes ? ` • ${formatFileSize(listItem.data.totalBytes)}` : ''}
                  </Text>
                )}
                {(listItem.kind === 'saved' || listItem.kind === 'favorite') && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {listItem.data.platform}
                    {listItem.data.duration > 0 ? ` • ${formatDuration(listItem.data.duration)}` : ''}
                  </Text>
                )}
              </View>
            </View>

            {/* Actions (hidden in selection mode) */}
            {!isSelecting && (
              <View style={styles.actionCol}>
                {listItem.kind === 'download' && (
                  <IconButton
                    icon="play-circle-outline"
                    size={20}
                    iconColor={theme.colors.primary}
                    onPress={() => handleOpenDownload(listItem.data)}
                    style={styles.actionBtn}
                  />
                )}
                {listItem.kind === 'saved' && (
                  <IconButton
                    icon="download"
                    size={20}
                    iconColor={theme.colors.primary}
                    onPress={() => handleRedownload(listItem.data.url)}
                    style={styles.actionBtn}
                  />
                )}
                {listItem.kind === 'favorite' && (
                  <IconButton
                    icon="download"
                    size={20}
                    iconColor={theme.colors.primary}
                    onPress={() => handleRedownload(listItem.data.url)}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            )}
          </View>
        </TouchableRipple>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        {isSelecting ? (
          // Selection mode header
          <>
            <IconButton
              icon="close"
              size={24}
              iconColor={theme.colors.onBackground}
              onPress={clearSelection}
              style={styles.headerBtn}
            />
            <Text
              variant="titleLarge"
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              {selectedIds.size} selected
            </Text>
            <TouchableRipple
              onPress={selectedIds.size === items.length ? clearSelection : selectAll}
              borderless
              style={styles.selectAllBtn}
            >
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.primary, fontWeight: '600' }}
              >
                {selectedIds.size === items.length ? 'None' : 'All'}
              </Text>
            </TouchableRipple>
          </>
        ) : (
          // Normal header
          <>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={theme.colors.onBackground}
              onPress={() => navigation.goBack()}
              style={styles.headerBtn}
            />
            <Text
              variant="titleLarge"
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              {folderName}
            </Text>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>
          </>
        )}
      </View>

      {/* List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[styles.emptyIcon, { backgroundColor: theme.colors.elevation.level2 }]}
          >
            <Icon
              name={
                folderType === 'favorites'
                  ? 'heart-outline'
                  : folderType === 'saved'
                  ? 'clock-outline'
                  : 'folder-open'
              }
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
          <Text
            variant="bodyLarge"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            {folderType === 'favorites'
              ? 'No favorites yet'
              : folderType === 'saved'
              ? 'Nothing saved for later'
              : 'This folder is empty'}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6, textAlign: 'center' }}
          >
            {folderType === 'favorites'
              ? 'Heart a video to add it here'
              : folderType === 'saved'
              ? 'Save videos for later to find them here'
              : 'Downloads in this folder will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.data.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isSelecting ? 100 : 40 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Batch Action Bar */}
      {isSelecting && (
        <Animated.View
          entering={FadeInUp.duration(250).springify()}
          style={[
            styles.batchBar,
            {
              backgroundColor: theme.colors.elevation.level3,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {folderType === 'user' && (
            <>
              <TouchableRipple
                onPress={handleBatchShare}
                borderless
                style={styles.batchBtn}
              >
                <View style={styles.batchBtnInner}>
                  <Icon name="share-variant-outline" size={22} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    Share
                  </Text>
                </View>
              </TouchableRipple>
              <TouchableRipple
                onPress={handleBatchMove}
                borderless
                style={styles.batchBtn}
              >
                <View style={styles.batchBtnInner}>
                  <Icon name="folder-move-outline" size={22} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Move
                  </Text>
                </View>
              </TouchableRipple>
            </>
          )}
          <TouchableRipple
            onPress={handleBatchDelete}
            borderless
            style={styles.batchBtn}
          >
            <View style={styles.batchBtnInner}>
              <Icon name="delete-outline" size={22} color={theme.colors.error} />
              <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                Delete
              </Text>
            </View>
          </TouchableRipple>
        </Animated.View>
      )}

      {/* Folder Picker Sheet */}
      <FolderPickerSheet
        visible={folderPickerIds.length > 0}
        downloadIds={folderPickerIds}
        currentFolderId={folderId}
        onDismiss={() => {
          setFolderPickerIds([]);
          clearSelection();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerBtn: {
    margin: 0,
  },
  headerTitle: {
    fontWeight: '700',
    flex: 1,
  },
  selectAllBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  itemCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  thumbContainer: {},
  itemThumb: {
    width: 56,
    height: 42,
    borderRadius: RADIUS.sm,
  },
  placeholderThumb: {
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
  },
  actionBtn: {
    margin: 0,
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
  batchBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingTop: SPACING.md,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  batchBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  batchBtnInner: {
    alignItems: 'center',
    gap: 4,
  },
});

export default FolderDetailScreen;

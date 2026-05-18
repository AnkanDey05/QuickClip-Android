/**
 * VideoCard — Premium M3 card for extracted video info with list-based quality selector.
 * Shows each format as a row with resolution, codec, fps, and file size.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Image, Modal, FlatList, Pressable } from 'react-native';
import { Text, useTheme, Button, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VideoInfo, VideoFormat, SavedItem, FavoriteItem } from '../types';
import { SPACING, RADIUS, PLATFORM_COLORS } from '../constants/colors';
import useDownloadStore from '../store/downloadStore';
import useSettingsStore from '../store/settingsStore';
import { generateId } from '../utils/common';
import ClipSelector from './ClipSelector';
import FolderPickerSheet from './FolderPickerSheet';

interface VideoCardProps {
  video: VideoInfo;
  onDownload: (format: VideoFormat, folderId?: string) => void;
  onClipDownload?: (format: VideoFormat, startSec: number, endSec: number) => void;
  onCancel?: () => void;
  /** Compact mode for popup — icon-only quick actions + dropdown quality selector */
  compact?: boolean;
}

/** Format bytes into a human-readable string */
const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  if (bytes < k * k) return `${(bytes / k).toFixed(0)} KB`;
  if (bytes < k * k * k) return `${(bytes / (k * k)).toFixed(1)} MB`;
  return `${(bytes / (k * k * k)).toFixed(2)} GB`;
};

const MIN_CLIP_DURATION = 30; // seconds

export const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload, onClipDownload, onCancel, compact = false }) => {
  const theme = useTheme();
  const settings = useSettingsStore();

  const getInitialFormat = () => {
    if (!video.formats || video.formats.length === 0) return null;
    const pref = settings.defaultQuality;
    
    if (pref === 'audio') {
      const audioOnly = video.formats.find(f => f.quality === 'Audio');
      if (audioOnly) return audioOnly;
    } else if (pref !== 'best') {
      const target = video.formats.find(f => f.quality.includes(pref));
      if (target) return target;
    }
    // Fallback to best (which is usually the first item in the list)
    return video.formats[0];
  };

  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(getInitialFormat());
  const [clipMode, setClipMode] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const folders = useDownloadStore((s) => s.folders);

  // Quick action state
  const isFav = useDownloadStore((s) => s.isFavorite(video.url));
  const addFavorite = useDownloadStore((s) => s.addFavorite);
  const removeFavoriteByUrl = (url: string) => {
    const fav = Object.values(useDownloadStore.getState().favorites).find(
      (f) => f.url === url
    );
    if (fav) useDownloadStore.getState().removeFavorite(fav.id);
  };
  const saveForLater = useDownloadStore((s) => s.saveForLater);
  const saved = useDownloadStore((s) => s.saved);
  const isSaved = Object.values(saved).some((s) => s.url === video.url);

  const handleToggleFavorite = () => {
    if (isFav) {
      removeFavoriteByUrl(video.url);
    } else {
      const item: FavoriteItem = {
        id: generateId(),
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.duration,
        platform: video.platform,
        favoritedAt: Date.now(),
      };
      addFavorite(item);
    }
  };

  const handleSaveForLater = () => {
    if (isSaved) return;
    const item: SavedItem = {
      id: generateId(),
      url: video.url,
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      platform: video.platform,
      savedAt: Date.now(),
      formats: video.formats,
    };
    saveForLater(item);
  };

  const platformColor =
    PLATFORM_COLORS[video.platform]?.bg || theme.colors.primary;

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Separate video and audio formats
  const videoFormats = video.formats.filter((f) => f.hasVideo);
  const audioFormats = video.formats.filter((f) => !f.hasVideo && f.hasAudio);

  // Precompute download button label
  const getDownloadLabel = (): string => {
    if (!selectedFormat) return 'Download';
    const size = selectedFormat.filesize || selectedFormat.filesizeApprox;
    const sizeStr = formatBytes(size);
    const approxPrefix = !selectedFormat.filesize && selectedFormat.filesizeApprox ? '~' : '';
    return sizeStr
      ? `Download ${selectedFormat.quality} · ${approxPrefix}${sizeStr}`
      : `Download ${selectedFormat.quality}`;
  };

  const renderFormatRow = (format: VideoFormat, index: number) => {
    const isSelected = selectedFormat?.id === format.id;
    const sizeStr = formatBytes(format.filesize || format.filesizeApprox);
    const isApprox = !format.filesize && !!format.filesizeApprox;

    return (
      <Animated.View
        key={format.id}
        entering={FadeInDown.delay(index * 40).duration(250)}
      >
        <TouchableRipple
          onPress={() => setSelectedFormat(format)}
          borderless
          style={[
            styles.formatRow,
            {
              backgroundColor: isSelected
                ? theme.colors.primaryContainer
                : theme.colors.elevation.level1,
              borderColor: isSelected
                ? theme.colors.primary
                : theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.formatRowInner}>
            {/* Radio indicator */}
            <View
              style={[
                styles.radio,
                {
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.outline,
                },
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    styles.radioFill,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
            </View>

            {/* Quality + codec info */}
            <View style={styles.formatInfo}>
              <View style={styles.qualityRow}>
                <Text
                  variant="titleSmall"
                  style={[
                    styles.qualityText,
                    {
                      color: isSelected
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    },
                  ]}
                >
                  {format.quality}
                </Text>
                {format.ext && (
                  <View
                    style={[
                      styles.extBadge,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary + '22'
                          : theme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.extText,
                        {
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {format.ext}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                variant="bodySmall"
                style={{
                  color: isSelected
                    ? theme.colors.onPrimaryContainer + 'BB'
                    : theme.colors.onSurfaceVariant,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {[
                  format.codec,
                  format.fps ? `${format.fps}fps` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || (format.hasVideo ? 'Video' : 'Audio')}
              </Text>
            </View>

            {/* File size */}
            <View style={styles.sizeCol}>
              {sizeStr ? (
                <Text
                  variant="labelMedium"
                  style={[
                    styles.sizeText,
                    {
                      color: isSelected
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {isApprox ? '~' : ''}{sizeStr}
                </Text>
              ) : (
                <Icon
                  name="help-circle-outline"
                  size={16}
                  color={theme.colors.outlineVariant}
                />
              )}
            </View>
          </View>
        </TouchableRipple>
      </Animated.View>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(500).springify()}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.elevation.level2 },
        ]}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailWrap}>
          {video.thumbnail ? (
            <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
          ) : (
            <View
              style={[
                styles.thumbnail,
                styles.placeholderThumb,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Icon name="video" size={40} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          {/* Gradient overlay */}
          <View style={styles.thumbOverlay} />
          {/* Duration badge */}
          {video.duration > 0 && (
            <View style={styles.durationBadge}>
              <Text variant="labelSmall" style={styles.durationText}>
                {formatDuration(video.duration)}
              </Text>
            </View>
          )}
          {/* Platform badge */}
          <View style={[styles.platformBadge, { backgroundColor: platformColor }]}>
            <Text variant="labelSmall" style={styles.platformText}>
              {video.platform.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {video.title}
          </Text>

          {video.uploader && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.md }}
            >
              {video.uploader}
            </Text>
          )}

          {/* Quality Selector */}
          {compact ? (
            /* ─── Compact: Dropdown selector ─── */
            <>
              <TouchableRipple
                onPress={() => setShowQualityDropdown(true)}
                borderless
                style={[
                  styles.dropdownBtn,
                  { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.outlineVariant },
                ]}
              >
                <View style={styles.dropdownInner}>
                  <Icon name="tune" size={16} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Quality
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      {selectedFormat ? `${selectedFormat.quality}${selectedFormat.ext ? ` • ${selectedFormat.ext.toUpperCase()}` : ''}` : 'Select'}
                    </Text>
                  </View>
                  {selectedFormat && (() => {
                    const sz = formatBytes(selectedFormat.filesize || selectedFormat.filesizeApprox);
                    return sz ? (
                      <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        {!selectedFormat.filesize && selectedFormat.filesizeApprox ? '~' : ''}{sz}
                      </Text>
                    ) : null;
                  })()}
                  <Icon name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>

              {/* Dropdown Modal */}
              <Modal
                visible={showQualityDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQualityDropdown(false)}
              >
                <Pressable style={styles.dropdownOverlay} onPress={() => setShowQualityDropdown(false)}>
                  <View style={[styles.dropdownSheet, { backgroundColor: theme.colors.elevation.level3 }]}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: SPACING.sm }}>
                      Select Quality
                    </Text>
                    <FlatList
                      data={[...videoFormats, ...audioFormats]}
                      keyExtractor={(f) => f.id}
                      style={{ maxHeight: 300 }}
                      renderItem={({ item: format }) => {
                        const isSelected = selectedFormat?.id === format.id;
                        const sizeStr = formatBytes(format.filesize || format.filesizeApprox);
                        return (
                          <TouchableRipple
                            onPress={() => { setSelectedFormat(format); setShowQualityDropdown(false); }}
                            borderless
                            style={[
                              styles.dropdownItem,
                              { backgroundColor: isSelected ? theme.colors.primaryContainer : 'transparent' },
                            ]}
                          >
                            <View style={styles.dropdownItemInner}>
                              <View style={[
                                styles.radio,
                                { borderColor: isSelected ? theme.colors.primary : theme.colors.outline },
                              ]}>
                                {isSelected && <View style={[styles.radioFill, { backgroundColor: theme.colors.primary }]} />}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text variant="bodyMedium" style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface, fontWeight: '600' }}>
                                  {format.quality}
                                  {format.ext ? ` • ${format.ext.toUpperCase()}` : ''}
                                </Text>
                                <Text variant="bodySmall" style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                                  {[format.codec, format.fps ? `${format.fps}fps` : null].filter(Boolean).join(' · ') || (format.hasVideo ? 'Video' : 'Audio')}
                                </Text>
                              </View>
                              {sizeStr ? (
                                <Text variant="labelMedium" style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                                  {!format.filesize && format.filesizeApprox ? '~' : ''}{sizeStr}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableRipple>
                        );
                      }}
                    />
                  </View>
                </Pressable>
              </Modal>
            </>
          ) : (
            /* ─── Full: List selector ─── */
            <>
              <View style={styles.selectorHeader}>
                <Icon name="tune" size={16} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="labelLarge"
                  style={[styles.qualityLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  Select Quality
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.outline, marginLeft: 'auto' }}
                >
                  {video.formats.length} options
                </Text>
              </View>

              <View style={styles.formatList}>
                {videoFormats.map((format, index) => renderFormatRow(format, index))}
                {audioFormats.length > 0 && videoFormats.length > 0 && (
                  <View style={styles.sectionDivider}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
                    <Icon name="music" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: SPACING.sm }}
                    >
                      Audio Only
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
                  </View>
                )}
                {audioFormats.map((format, index) =>
                  renderFormatRow(format, videoFormats.length + index)
                )}
              </View>
            </>
          )}

          {/* Quick Actions Row */}
          <View style={[styles.quickActions, compact && styles.quickActionsCompact]}>
            <TouchableRipple
              onPress={handleToggleFavorite}
              borderless
              style={[
                compact ? styles.quickActionBtnCompact : styles.quickActionBtn,
                {
                  backgroundColor: isFav
                    ? '#EF535022'
                    : theme.colors.elevation.level1,
                },
              ]}
            >
              <View style={compact ? styles.quickActionInnerCompact : styles.quickActionInner}>
                <Icon
                  name={isFav ? 'heart' : 'heart-outline'}
                  size={compact ? 22 : 20}
                  color={isFav ? '#EF5350' : theme.colors.onSurfaceVariant}
                />
                {!compact && (
                  <Text
                    variant="labelSmall"
                    style={{
                      color: isFav ? '#EF5350' : theme.colors.onSurfaceVariant,
                      fontWeight: '500',
                    }}
                  >
                    {isFav ? 'Favorited' : 'Favorite'}
                  </Text>
                )}
              </View>
            </TouchableRipple>

            {/* Clip Button */}
            {video.duration >= MIN_CLIP_DURATION && onClipDownload && (
              <TouchableRipple
                onPress={() => setClipMode(!clipMode)}
                borderless
                style={[
                  compact ? styles.quickActionBtnCompact : styles.quickActionBtn,
                  {
                    backgroundColor: clipMode
                      ? theme.colors.primaryContainer
                      : theme.colors.elevation.level1,
                  },
                ]}
              >
                <View style={compact ? styles.quickActionInnerCompact : styles.quickActionInner}>
                  <Icon
                    name="content-cut"
                    size={compact ? 22 : 20}
                    color={clipMode ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
                  />
                  {!compact && (
                    <Text
                      variant="labelSmall"
                      style={{
                        color: clipMode ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                        fontWeight: '500',
                      }}
                    >
                      Clip
                    </Text>
                  )}
                </View>
              </TouchableRipple>
            )}
          </View>

          {/* Folder Selector Card (Always visible) */}
          <TouchableRipple
            onPress={() => setShowFolderPicker(true)}
            style={[
              styles.folderCard,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <View style={styles.folderCardInner}>
              <View style={[styles.folderIconWrapper, { backgroundColor: theme.colors.primary + '22' }]}>
                <Icon name="folder-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.folderCardText}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Download Location
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                  {selectedFolderId && folders[selectedFolderId]
                    ? folders[selectedFolderId].name
                    : 'Uncategorized'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableRipple>

          {/* Clip Selector (when clip mode is active) */}
          {clipMode && video.duration >= MIN_CLIP_DURATION && (
            <ClipSelector
              duration={video.duration}
              onConfirm={(startSec, endSec) => {
                if (selectedFormat && onClipDownload) {
                  onClipDownload(selectedFormat, startSec, endSec);
                  setClipMode(false);
                }
              }}
              onCancel={() => setClipMode(false)}
            />
          )}

          {/* Download Section */}
          {!clipMode && (
            <View style={styles.mainActions}>
              <Button
                mode="contained"
                onPress={() => selectedFormat && onDownload(selectedFormat, selectedFolderId)}
                disabled={!selectedFormat}
                style={styles.downloadBtn}
                contentStyle={styles.downloadBtnContent}
                labelStyle={styles.downloadBtnLabel}
                icon={({ size, color }) => (
                  <Icon name="download" size={size} color={color} />
                )}
              >
                {getDownloadLabel()}
              </Button>

              <Button
                mode="contained-tonal"
                onPress={() => {
                  handleSaveForLater();
                  if (onCancel) onCancel();
                }}
                disabled={isSaved}
                style={[styles.downloadBtn, { marginTop: SPACING.sm }]}
                contentStyle={styles.downloadBtnContent}
                labelStyle={styles.downloadBtnLabel}
                icon={({ size, color }) => (
                  <Icon name="clock-outline" size={size} color={color} />
                )}
              >
                {isSaved ? 'Saved for Later' : 'Save for Later'}
              </Button>
            </View>
          )}

          {/* Cancel Button */}
          {onCancel && (
            <Button
              mode="text"
              onPress={onCancel}
              style={styles.cancelBtn}
              labelStyle={styles.cancelBtnLabel}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>
          )}
        </View>
      </View>

      {/* Folder Picker Sheet (for choosing download folder) */}
      <FolderPickerSheet
        visible={showFolderPicker}
        downloadIds={[]}
        onDismiss={() => setShowFolderPicker(false)}
        onFolderSelected={(folderId: string) => {
          setSelectedFolderId(folderId);
          setShowFolderPicker(false);
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 200,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  platformBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  platformText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    padding: SPACING.md,
  },
  title: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  qualityLabel: {
    fontWeight: '500',
  },
  formatList: {
    gap: 6,
    marginBottom: SPACING.lg,
  },
  formatRow: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formatRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: SPACING.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  formatInfo: {
    flex: 1,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  qualityText: {
    fontWeight: '600',
  },
  extBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  extText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sizeCol: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  sizeText: {
    fontWeight: '600',
    fontSize: 13,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  folderCard: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  folderCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  folderIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderCardText: {
    flex: 1,
    justifyContent: 'center',
  },
  downloadBtn: {
    borderRadius: RADIUS.full,
  },
  downloadBtnContent: {
    paddingVertical: 4,
  },
  downloadBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  mainActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  cancelBtn: {
    marginTop: SPACING.xs,
  },
  cancelBtnLabel: {
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.md,
  },
  quickActionsCompact: {
    justifyContent: 'center',
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  quickActionBtnCompact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionInnerCompact: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Compact Dropdown ───
  dropdownBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  dropdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  dropdownSheet: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    maxHeight: 420,
  },
  dropdownItem: {
    borderRadius: RADIUS.md,
    marginBottom: 4,
    overflow: 'hidden',
  },
  dropdownItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.md,
  },
});

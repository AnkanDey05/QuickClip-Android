/**
 * RecentDownloads — Horizontal carousel of last completed downloads.
 */

import React from 'react';
import { View, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { Text, useTheme, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import useDownloadStore from '../store/downloadStore';
import { SPACING, RADIUS } from '../constants/colors';

interface RecentDownloadsProps {
  style?: any;
}

const RecentDownloads: React.FC<RecentDownloadsProps> = ({ style }) => {
  const theme = useTheme();
  // Subscribe to actual state (not getter) so component re-renders on changes
  const downloads = useDownloadStore((s) => s.downloads);
  const removeFromLibrary = useDownloadStore((s) => s.removeFromLibrary);
  const completed = Object.values(downloads)
    .filter((d) => d.status === 'completed')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8);

  const handleOpen = async (item: any) => {
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
    } catch (err: any) {
      Alert.alert(
        'Cannot Open File',
        `The file is saved at:\n${item.filePath}\n\nOpen it from your File Manager.`,
        [{ text: 'OK' }],
      );
    }
  };

  if (completed.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
      >
        Recent Downloads
      </Text>
      <FlatList
        data={completed}
        extraData={downloads}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInRight.delay(index * 80).duration(400).springify()}
          >
            <TouchableRipple
              onPress={() => handleOpen(item)}
              style={[
                styles.card,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
              borderless
            >
              <View>
                <View style={styles.thumbnailWrap}>
                  {item.thumbnail ? (
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <View
                      style={[
                        styles.thumbnail,
                        styles.placeholderThumb,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                    >
                      <Icon
                        name="video"
                        size={28}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  )}
                  <View style={[styles.qualityBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onPrimary, fontSize: 9 }}>
                      {item.format?.quality || 'HD'}
                    </Text>
                  </View>
                  {/* Play overlay */}
                  <View style={styles.playOverlay}>
                    <Icon name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={[styles.title, { color: theme.colors.onSurface }]}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableRipple>
          </Animated.View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  sectionTitle: {
    fontWeight: '600',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  card: {
    width: 148,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    position: 'relative',
  },
  thumbnail: {
    width: 148,
    height: 90,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  title: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    lineHeight: 16,
  },
});

export default RecentDownloads;

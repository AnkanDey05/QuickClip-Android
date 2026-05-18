/**
 * LibraryScreen — Folder-based media library.
 * Shows system folders (Favorites, Saved for Later) pinned at top,
 * followed by user-created folders and Uncategorized.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, TouchableRipple, FAB } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useDownloadStore from '../store/downloadStore';
import CreateFolderDialog from '../components/CreateFolderDialog';
import { SPACING, RADIUS } from '../constants/colors';

type LibraryStackParamList = {
  LibraryMain: undefined;
  FolderDetail: { folderId: string; folderName: string; folderType: 'favorites' | 'saved' | 'user' };
};

const LibraryScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Subscribe to reactive state
  const downloads = useDownloadStore((s) => s.downloads);
  const saved = useDownloadStore((s) => s.saved);
  const favorites = useDownloadStore((s) => s.favorites);
  const folders = useDownloadStore((s) => s.folders);
  const createFolder = useDownloadStore((s) => s.createFolder);

  // Count items
  const favoritesCount = Object.keys(favorites).length;
  const savedCount = Object.keys(saved).length;

  // System folders (always pinned)
  const systemFolders = [
    {
      id: 'favorites',
      name: 'Favorites',
      icon: 'heart',
      color: '#EF5350',
      count: favoritesCount,
      type: 'favorites' as const,
    },
    {
      id: 'saved',
      name: 'Saved for Later',
      icon: 'clock-outline',
      color: '#FFA726',
      count: savedCount,
      type: 'saved' as const,
    },
  ];

  // User folders from store
  const userFolderList = Object.values(folders)
    .sort((a, b) => {
      if (a.id === 'uncategorized') return 1;
      if (b.id === 'uncategorized') return -1;
      return a.name.localeCompare(b.name);
    })
    .map((folder) => {
      // Count completed downloads in each folder
      const count = Object.values(downloads).filter((d) => {
        if (d.status !== 'completed') return false;
        if (folder.id === 'uncategorized') {
          return !d.folderId || d.folderId === 'uncategorized';
        }
        return d.folderId === folder.id;
      }).length;

      return {
        id: folder.id,
        name: folder.name,
        icon: 'folder',
        color: theme.colors.primary,
        count,
        type: 'user' as const,
      };
    });

  const handleFolderPress = (folder: typeof systemFolders[0] | typeof userFolderList[0]) => {
    navigation.navigate('FolderDetail', {
      folderId: folder.id,
      folderName: folder.name,
      folderType: folder.type,
    });
  };

  const handleFolderLongPress = (folder: typeof userFolderList[0]) => {
    if (folder.id === 'uncategorized') return;
    Alert.alert(folder.name, 'Choose an action', [
      {
        text: 'Rename',
        onPress: () => {
          // Simple prompt using Alert (React Native doesn't have a native prompt)
          Alert.prompt?.(
            'Rename Folder',
            `Enter new name for "${folder.name}"`,
            (newName: string) => {
              if (newName?.trim()) {
                useDownloadStore.getState().renameFolder(folder.id, newName.trim());
              }
            },
            'plain-text',
            folder.name,
          );
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete Folder',
            `Delete "${folder.name}"? Files inside will be moved to Uncategorized.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => useDownloadStore.getState().deleteFolder(folder.id),
              },
            ],
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCreateFolder = (name: string) => {
    createFolder(name);
  };

  const renderFolderCard = (
    folder: { id: string; name: string; icon: string; color: string; count: number; type: string },
    index: number,
    isUserFolder: boolean = false,
  ) => (
    <Animated.View
      key={folder.id}
      entering={FadeInDown.delay(index * 60).duration(300).springify()}
    >
      <TouchableRipple
        onPress={() => handleFolderPress(folder as any)}
        onLongPress={isUserFolder ? () => handleFolderLongPress(folder as any) : undefined}
        borderless
        style={[
          styles.folderCard,
          { backgroundColor: theme.colors.elevation.level2 },
        ]}
      >
        <View style={styles.folderRow}>
          <View style={[styles.folderIcon, { backgroundColor: folder.color + '22' }]}>
            <Icon name={folder.icon} size={24} color={folder.color} />
          </View>
          <View style={styles.folderInfo}>
            <Text
              variant="bodyLarge"
              style={[styles.folderName, { color: theme.colors.onSurface }]}
            >
              {folder.name}
            </Text>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {folder.count} {folder.count === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>
    </Animated.View>
  );

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
          <Text
            variant="headlineMedium"
            style={[styles.headerTitle, { color: theme.colors.onBackground }]}
          >
            Library
          </Text>
        </Animated.View>

        {/* System Folders */}
        <View style={styles.section}>
          {systemFolders.map((folder, i) => renderFolderCard(folder, i))}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

        {/* User Folders */}
        <View style={styles.section}>
          {userFolderList.map((folder, i) =>
            renderFolderCard(folder, i + systemFolders.length, true)
          )}
        </View>
      </ScrollView>

      {/* FAB for creating new folder */}
      <FAB
        icon="folder-plus"
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primaryContainer, bottom: insets.bottom + 90 },
        ]}
        color={theme.colors.onPrimaryContainer}
        onPress={() => setShowCreateDialog(true)}
        label="New Folder"
      />

      <CreateFolderDialog
        visible={showCreateDialog}
        onDismiss={() => setShowCreateDialog(false)}
        onCreate={handleCreateFolder}
      />
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
    paddingBottom: 160,
  },
  header: {
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  section: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    opacity: 0.4,
  },
  folderCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    borderRadius: RADIUS.lg,
  },
});

export default LibraryScreen;

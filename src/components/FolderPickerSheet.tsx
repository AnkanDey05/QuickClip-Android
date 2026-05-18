/**
 * FolderPickerSheet — Bottom sheet to pick a folder for downloads.
 * Supports both single and batch move operations.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { Text, useTheme, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import useDownloadStore from '../store/downloadStore';
import CreateFolderDialog from './CreateFolderDialog';
import { SPACING, RADIUS } from '../constants/colors';

interface FolderPickerSheetProps {
  visible: boolean;
  /** Single download ID or array of IDs for batch move */
  downloadIds: string | string[];
  currentFolderId?: string;
  onDismiss: () => void;
  /** If provided, called with selected folderId instead of moving files */
  onFolderSelected?: (folderId: string) => void;
}

const FolderPickerSheet = ({
  visible,
  downloadIds,
  currentFolderId,
  onDismiss,
  onFolderSelected,
}: FolderPickerSheetProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const folders = useDownloadStore((s) => s.folders);
  const moveToFolder = useDownloadStore((s) => s.moveToFolder);
  const createFolder = useDownloadStore((s) => s.createFolder);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const ids = Array.isArray(downloadIds) ? downloadIds : [downloadIds];
  const isBatch = ids.length > 1;

  const sortedFolders = Object.values(folders).sort((a, b) => {
    if (a.id === 'uncategorized') return 1;
    if (b.id === 'uncategorized') return -1;
    return a.name.localeCompare(b.name);
  });

  const handleSelect = async (folderId: string) => {
    if (onFolderSelected) {
      onFolderSelected(folderId);
      return;
    }
    for (const id of ids) {
      await moveToFolder(id, folderId);
    }
    onDismiss();
  };

  const handleCreateFolder = (name: string) => {
    const newId = createFolder(name);
    handleSelect(newId);
  };

  const handleShowCreateDialog = () => {
    // Close the picker sheet first, then show dialog after a tick
    // This prevents the dialog from appearing behind the Modal
    setShowCreatePending(true);
    onDismiss();
  };

  const [showCreatePending, setShowCreatePending] = useState(false);

  React.useEffect(() => {
    if (showCreatePending && !visible) {
      // Sheet has closed, now show dialog
      const timer = setTimeout(() => {
        setShowCreateDialog(true);
        setShowCreatePending(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showCreatePending, visible]);

  if (!visible && !showCreateDialog) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={onDismiss}>
          <Pressable style={{ width: '100%' }} onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={SlideInDown.duration(300).springify()}
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.elevation.level3,
                  paddingBottom: Math.max(insets.bottom, 24),
                },
              ]}
            >
              {/* Handle */}
              <View style={styles.handleRow}>
                <View
                  style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]}
                />
              </View>

              {/* Title */}
              <View style={styles.titleRow}>
                <Icon name="folder-move" size={22} color={theme.colors.primary} />
                <Text
                  variant="titleMedium"
                  style={[styles.title, { color: theme.colors.onSurface }]}
                >
                  {isBatch ? `Move ${ids.length} items` : 'Move to Folder'}
                </Text>
              </View>

              {/* Folder List */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {sortedFolders.map((folder, index) => {
                  const isSelected = folder.id === (currentFolderId || 'uncategorized');
                  return (
                    <Animated.View
                      key={folder.id}
                      entering={FadeInDown.delay(index * 40).duration(200)}
                    >
                      <TouchableRipple
                        onPress={() => handleSelect(folder.id)}
                        borderless
                        style={[
                          styles.folderItem,
                          isSelected && {
                            backgroundColor: theme.colors.primaryContainer + '44',
                          },
                        ]}
                      >
                        <View style={styles.folderRow}>
                          <View
                            style={[
                              styles.folderIcon,
                              {
                                backgroundColor: isSelected
                                  ? theme.colors.primary + '22'
                                  : theme.colors.surfaceVariant,
                              },
                            ]}
                          >
                            <Icon
                              name={isSelected ? 'folder-check' : 'folder'}
                              size={20}
                              color={
                                isSelected
                                  ? theme.colors.primary
                                  : theme.colors.onSurfaceVariant
                              }
                            />
                          </View>
                          <Text
                            variant="bodyLarge"
                            style={{
                              flex: 1,
                              color: isSelected
                                ? theme.colors.primary
                                : theme.colors.onSurface,
                              fontWeight: isSelected ? '600' : '400',
                            }}
                          >
                            {folder.name}
                          </Text>
                          {isSelected && (
                            <Icon
                              name="check"
                              size={20}
                              color={theme.colors.primary}
                            />
                          )}
                        </View>
                      </TouchableRipple>
                    </Animated.View>
                  );
                })}

                {/* New Folder button */}
                <TouchableRipple
                  onPress={handleShowCreateDialog}
                  borderless
                  style={styles.folderItem}
                >
                  <View style={styles.folderRow}>
                    <View
                      style={[
                        styles.folderIcon,
                        { backgroundColor: theme.colors.primary + '1A' },
                      ]}
                    >
                      <Icon
                        name="folder-plus-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Text
                      variant="bodyLarge"
                      style={{ flex: 1, color: theme.colors.primary, fontWeight: '500' }}
                    >
                      New Folder
                    </Text>
                  </View>
                </TouchableRipple>
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      <CreateFolderDialog
        visible={showCreateDialog}
        onDismiss={() => setShowCreateDialog(false)}
        onCreate={handleCreateFolder}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    minHeight: 200,
    maxHeight: '65%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontWeight: '700',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: 4,
  },
  folderItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FolderPickerSheet;

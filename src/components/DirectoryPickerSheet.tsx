import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, BackHandler, TouchableOpacity, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Modal, Portal, Text, useTheme, Button, TouchableRipple, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';

interface DirectoryPickerSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (path: string) => void;
}

const DirectoryPickerSheet = ({ visible, onDismiss, onSelect }: DirectoryPickerSheetProps) => {
  const theme = useTheme();
  
  const rootPath = RNFS.ExternalStorageDirectoryPath || RNFS.DownloadDirectoryPath;
  
  const [currentPath, setCurrentPath] = useState<string>(rootPath);
  const [directories, setDirectories] = useState<RNFS.ReadDirItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPath(rootPath);
      loadDirectories(rootPath);
    }
  }, [visible, rootPath]);

  const loadDirectories = async (path: string) => {
    setLoading(true);
    try {
      const items = await RNFS.readDir(path);
      const dirs = items
        .filter(item => item.isDirectory() && !item.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setDirectories(dirs);
    } catch (e) {
      console.warn("Could not read directory", path, e);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    loadDirectories(path);
  };

  const navigateUp = () => {
    if (currentPath === rootPath) return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (parentPath.length >= rootPath.length) {
      navigateTo(parentPath);
    } else {
      navigateTo(rootPath);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onDismiss();
  };

  const pathSegments = currentPath.replace(rootPath, 'Internal Storage').split('/');
  const displayPath = pathSegments.slice(-2).join('/'); // Show last two segments for brevity

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
            Select Folder
          </Text>
          <TouchableOpacity onPress={onDismiss}>
            <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <View style={[styles.pathHeader, { backgroundColor: theme.colors.elevation.level2 }]}>
          <TouchableOpacity onPress={navigateUp} disabled={currentPath === rootPath} style={{ opacity: currentPath === rootPath ? 0.3 : 1 }}>
            <Icon name="arrow-up" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.pathTextContainer}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Current Path</Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1} ellipsizeMode="head">
              {displayPath}
            </Text>
          </View>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={directories}
              keyExtractor={(item) => item.path}
              renderItem={({ item }) => (
                <TouchableRipple onPress={() => navigateTo(item.path)}>
                  <View style={styles.dirItem}>
                    <Icon name="folder" size={24} color={theme.colors.primary} />
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 16 }}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableRipple>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No subfolders found.
                </Text>
              }
            />
          )}
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
          <Button mode="text" onPress={onDismiss} textColor={theme.colors.onSurfaceVariant}>
            Cancel
          </Button>
          <Button mode="contained" onPress={handleSelect}>
            Use This Folder
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    borderRadius: 24,
    height: SCREEN_HEIGHT * 0.8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  pathTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  listContainer: {
    flex: 1,
    minHeight: 200,
  },
  dirItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
});

export default DirectoryPickerSheet;

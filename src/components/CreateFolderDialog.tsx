/**
 * CreateFolderDialog — Modal dialog for creating a new folder.
 */

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, TextInput, Button, useTheme } from 'react-native-paper';
import { SPACING, RADIUS } from '../constants/colors';

interface CreateFolderDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onCreate: (name: string) => void;
}

const CreateFolderDialog = ({ visible, onDismiss, onCreate }: CreateFolderDialogProps) => {
  const theme = useTheme();
  const [folderName, setFolderName] = useState('');

  const handleCreate = () => {
    const trimmed = folderName.trim();
    if (trimmed.length === 0) return;
    onCreate(trimmed);
    setFolderName('');
    onDismiss();
  };

  const handleDismiss = () => {
    setFolderName('');
    onDismiss();
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        style={[styles.dialog, { backgroundColor: theme.colors.elevation.level3 }]}
      >
        <Dialog.Title style={{ color: theme.colors.onSurface }}>
          New Folder
        </Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label="Folder name"
            value={folderName}
            onChangeText={setFolderName}
            autoFocus
            maxLength={50}
            style={styles.input}
            outlineStyle={{ borderRadius: RADIUS.md }}
            onSubmitEditing={handleCreate}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss} textColor={theme.colors.onSurfaceVariant}>
            Cancel
          </Button>
          <Button
            onPress={handleCreate}
            disabled={folderName.trim().length === 0}
            mode="contained"
            style={styles.createBtn}
          >
            Create
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: RADIUS.xl,
  },
  input: {
    marginTop: 4,
  },
  createBtn: {
    borderRadius: RADIUS.md,
  },
});

export default CreateFolderDialog;

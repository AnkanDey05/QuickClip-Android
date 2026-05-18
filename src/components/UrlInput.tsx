/**
 * UrlInput — Material 3 search bar style input.
 * Pill-shaped, with paste and clear icons, integrated submit button.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Keyboard, TextInput as RNTextInput } from 'react-native';
import { useTheme, TouchableRipple, ActivityIndicator } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SPACING, RADIUS } from '../constants/colors';

// Safe clipboard access
let ClipboardModule: any = null;
try {
  ClipboardModule = require('@react-native-clipboard/clipboard').default;
} catch {
  try {
    const { Clipboard } = require('react-native');
    ClipboardModule = Clipboard;
  } catch { /* */ }
}

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const theme = useTheme();

  const handleSubmit = () => {
    if (url.trim()) {
      Keyboard.dismiss();
      onSubmit(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      if (!ClipboardModule) return;
      const content = await (ClipboardModule.getString
        ? ClipboardModule.getString()
        : '');
      if (content) {
        setUrl(content.trim());
      }
    } catch { /* */ }
  };

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.elevation.level3 },
        ]}
      >
        {/* Paste / Search icon */}
        <TouchableRipple
          onPress={url.length > 0 ? undefined : handlePaste}
          borderless
          style={styles.iconBtn}
          rippleColor={theme.colors.primary + '33'}
        >
          <Icon
            name={url.length > 0 ? 'link-variant' : 'clipboard-plus-outline'}
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableRipple>

        {/* Text Input */}
        <RNTextInput
          placeholder="Paste video URL..."
          placeholderTextColor={theme.colors.onSurfaceVariant + '88'}
          value={url}
          onChangeText={setUrl}
          style={[styles.input, { color: theme.colors.onSurface }]}
          editable={!isLoading}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          selectionColor={theme.colors.primary}
        />

        {/* Clear button */}
        {url.length > 0 && !isLoading && (
          <TouchableRipple
            onPress={() => setUrl('')}
            borderless
            style={styles.iconBtn}
          >
            <Icon name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableRipple>
        )}

        {/* Submit / Loading */}
        <TouchableRipple
          onPress={handleSubmit}
          disabled={!url.trim() || isLoading}
          borderless
          style={[
            styles.submitBtn,
            {
              backgroundColor: url.trim() && !isLoading
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
            },
          ]}
          rippleColor={theme.colors.onPrimary + '33'}
        >
          {isLoading ? (
            <ActivityIndicator size={18} color={theme.colors.onSurfaceVariant} />
          ) : (
            <Icon
              name="arrow-right"
              size={20}
              color={
                url.trim()
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant
              }
            />
          )}
        </TouchableRipple>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.full,
    height: 52,
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    paddingHorizontal: SPACING.sm,
    letterSpacing: 0.2,
  },
  submitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

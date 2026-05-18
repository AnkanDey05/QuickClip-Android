/**
 * ClipboardBanner — Auto-detects URLs on the clipboard and offers one-tap paste.
 * Slides in with animation when a valid URL is detected.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { Text, useTheme, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SPACING, RADIUS } from '../constants/colors';
import { wasShareHandled } from '../utils/shareTracker';

// Safe clipboard access
let ClipboardModule: any = null;
try {
  ClipboardModule = require('@react-native-clipboard/clipboard').default;
} catch {
  try {
    // Fallback: RN's built-in deprecated Clipboard
    const { Clipboard } = require('react-native');
    ClipboardModule = Clipboard;
  } catch {
    // No clipboard available
  }
}

interface ClipboardBannerProps {
  onPaste: (url: string) => void;
}

const URL_REGEX = /^https?:\/\/.+/i;

const ClipboardBanner: React.FC<ClipboardBannerProps> = ({ onPaste }) => {
  const theme = useTheme();
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkClipboard = useCallback(async () => {
    try {
      if (!ClipboardModule) return;
      const content = await (ClipboardModule.getString
        ? ClipboardModule.getString()
        : ClipboardModule.getStringAsync?.() || '');
      if (content && URL_REGEX.test(content.trim())) {
        const url = content.trim();
        // Skip if this URL was already handled by the share popup
        const alreadyHandled = await wasShareHandled(url);
        if (alreadyHandled) {
          setClipUrl(null);
          return;
        }
        setClipUrl(url);
        setDismissed(false);
      } else {
        setClipUrl(null);
      }
    } catch {
      // Clipboard access denied or unavailable
    }
  }, []);

  useEffect(() => {
    checkClipboard();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkClipboard();
      }
    });
    return () => sub.remove();
  }, [checkClipboard]);

  if (!clipUrl || dismissed) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutUp.duration(200)}
    >
      <TouchableRipple
        onPress={() => {
          onPaste(clipUrl);
          setDismissed(true);
        }}
        style={[
          styles.container,
          { backgroundColor: theme.colors.primaryContainer },
        ]}
        borderless
        rippleColor={theme.colors.primary + '33'}
      >
        <View style={styles.inner}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary }]}>
            <Icon name="clipboard-text" size={18} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.textWrap}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onPrimaryContainer }}
              numberOfLines={1}
            >
              Link detected on clipboard
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}
              numberOfLines={1}
            >
              {clipUrl}
            </Text>
          </View>
          <Icon name="arrow-right" size={20} color={theme.colors.onPrimaryContainer} />
        </View>
      </TouchableRipple>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
});

export default ClipboardBanner;

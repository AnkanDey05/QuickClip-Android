/**
 * PlatformGrid — Grid of supported platforms.
 * Tapping opens the platform's native app or website.
 */

import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, useTheme, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SPACING, RADIUS } from '../constants/colors';

interface PlatformItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  appUrl: string;
  webUrl: string;
}

const PLATFORMS: PlatformItem[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    appUrl: 'vnd.youtube://',
    webUrl: 'https://www.youtube.com',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E1306C',
    appUrl: 'instagram://',
    webUrl: 'https://www.instagram.com',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    appUrl: 'fb://',
    webUrl: 'https://www.facebook.com',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#E60023',
    appUrl: 'pinterest://',
    webUrl: 'https://www.pinterest.com',
  },
  {
    id: 'twitter',
    name: 'X',
    icon: 'twitter',
    color: '#AAAAAA',
    appUrl: 'twitter://',
    webUrl: 'https://x.com',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    appUrl: 'reddit://',
    webUrl: 'https://www.reddit.com',
  },
];

interface PlatformGridProps {
  style?: any;
}

const PlatformGrid: React.FC<PlatformGridProps> = ({ style }) => {
  const theme = useTheme();

  const handlePress = async (platform: PlatformItem) => {
    try {
      const canOpen = await Linking.canOpenURL(platform.appUrl);
      if (canOpen) {
        await Linking.openURL(platform.appUrl);
      } else {
        await Linking.openURL(platform.webUrl);
      }
    } catch {
      await Linking.openURL(platform.webUrl);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
      >
        Browse Platforms
      </Text>
      <View style={styles.grid}>
        {PLATFORMS.map((platform, index) => (
          <Animated.View
            key={platform.id}
            entering={FadeInUp.delay(index * 60).duration(400).springify()}
            style={styles.gridItem}
          >
            <TouchableRipple
              onPress={() => handlePress(platform)}
              style={[
                styles.card,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
              borderless
              rippleColor={platform.color + '33'}
            >
              <View style={styles.cardInner}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: platform.color + '22' },
                  ]}
                >
                  <Icon name={platform.icon} size={24} color={platform.color} />
                </View>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurface, marginTop: 8 }}
                  numberOfLines={1}
                >
                  {platform.name}
                </Text>
              </View>
            </TouchableRipple>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  gridItem: {
    width: '30%',
    flexGrow: 1,
  },
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cardInner: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PlatformGrid;

/**
 * StatsCard — Beautiful gradient-tinted card showing download statistics.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import useDownloadStore from '../store/downloadStore';
import { SPACING, RADIUS } from '../constants/colors';

interface StatsCardProps {
  style?: any;
}

const StatsCard: React.FC<StatsCardProps> = ({ style }) => {
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  // Subscribe directly to the downloads state so the component re-renders on change
  const downloads = useDownloadStore((s) => s.downloads);

  const all = Object.values(downloads);
  const completed = all.filter((d) => d.status === 'completed');
  const active = all.filter(
    (d) =>
      d.status === 'downloading' ||
      d.status === 'paused' ||
      d.status === 'pending'
  );

  const stats = [
    {
      icon: 'check-circle',
      label: 'Completed',
      value: completed.length.toString(),
      color: theme.colors.primary,
    },
    {
      icon: 'download',
      label: 'Active',
      value: active.length.toString(),
      color: theme.colors.tertiary,
    },
    {
      icon: 'sigma',
      label: 'Total',
      value: all.length.toString(),
      color: theme.colors.secondary,
    },
  ];

  return (
    <Animated.View
      entering={FadeInUp.duration(500).springify()}
      style={[style]}
    >
      <View style={styles.outerWrap}>
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Overview
        </Text>
        <View style={styles.row}>
          {stats.map((stat, i) => (
            <TouchableRipple
              key={i}
              onPress={() => navigation.navigate('Downloads')}
              borderless
              style={[
                styles.statCard,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
            >
              <View style={styles.statCardInner}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '22' }]}>
                  <Icon name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text
                  variant="headlineSmall"
                  style={[styles.statValue, { color: theme.colors.onSurface }]}
                >
                  {stat.value}
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {stat.label}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  statCardInner: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontWeight: '700',
  },
});

export default StatsCard;

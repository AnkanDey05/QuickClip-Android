/**
 * SettingsScreen — Full-screen settings page.
 * Design matches the reference: large title, grouped card sections,
 * icon badges, value+chevron or toggle switches.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, Switch, TouchableRipple, Portal, Dialog, RadioButton, ActivityIndicator, Button } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';

import useSettingsStore from '../store/settingsStore';
import useDownloadStore from '../store/downloadStore';
import { SPACING, RADIUS } from '../constants/colors';
import DirectoryPickerSheet from '../components/DirectoryPickerSheet';

const QUALITY_OPTIONS = [
  { label: 'Best Available', short: 'Best', value: 'best' as const },
  { label: '1080p (Full HD)', short: '1080p', value: '1080p' as const },
  { label: '720p (HD)', short: '720p', value: '720p' as const },
  { label: '480p', short: '480p', value: '480p' as const },
  { label: 'Audio Only', short: 'Audio', value: 'audio' as const },
];

const CONCURRENT_OPTIONS = [1, 2, 3, 4, 5];

const SettingsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const settings = useSettingsStore();
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');

  // Calculate cache size on mount
  React.useEffect(() => {
    (async () => {
      try {
        const cacheDir = RNFS.CachesDirectoryPath;
        const items = await RNFS.readDir(cacheDir);
        let total = 0;
        for (const item of items) {
          total += parseInt(String(item.size), 10) || 0;
        }
        if (total < 1024 * 1024) {
          setCacheSize(`${(total / 1024).toFixed(0)} KB`);
        } else {
          setCacheSize(`${(total / (1024 * 1024)).toFixed(0)} MB`);
        }
      } catch {
        setCacheSize('Unknown');
      }
    })();
  }, []);

  const downloadDir = settings.downloadPath || `${RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath}/QuickClip`;
  const shortPath = downloadDir.length > 28
    ? '...' + downloadDir.slice(-25)
    : downloadDir;

  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showConcurrentDialog, setShowConcurrentDialog] = useState(false);
  
  const [showDirPicker, setShowDirPicker] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleQualityPicker = () => {
    setShowQualityDialog(true);
  };

  const handleConcurrentPicker = () => {
    setShowConcurrentDialog(true);
  };

  const handlePathSelected = async (newPath: string) => {
    if (newPath === downloadDir) return; // No change

    setIsMigrating(true);
    try {
      // Create new directory if it doesn't exist
      const exists = await RNFS.exists(newPath);
      if (!exists) {
        await RNFS.mkdir(newPath);
      }

      // Read current files
      const items = await RNFS.readDir(downloadDir);
      
      // Move each item (this is a simplified migration; a robust one might need to read recursive folders)
      for (const item of items) {
        if (!item.name.startsWith('.')) { // Skip metadata files or handle them if needed
           const dest = `${newPath}/${item.name}`;
           try {
             await RNFS.moveFile(item.path, dest);
           } catch (e) {
             console.warn(`Failed to move ${item.name}`, e);
           }
        }
      }

      // Update setting
      settings.updateSetting('downloadPath', newPath);
      
      // We should ideally reload library here, but app restart or tab switch usually handles it
      useDownloadStore.getState().loadFromFilesystem();
      
    } catch (e) {
      Alert.alert('Migration Failed', 'Could not move files to the new directory.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      `Free up ${cacheSize} of cached data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const cacheDir = RNFS.CachesDirectoryPath;
              const items = await RNFS.readDir(cacheDir);
              for (const item of items) {
                try { await RNFS.unlink(item.path); } catch {}
              }
              setCacheSize('0 KB');
            } catch {}
          },
        },
      ],
    );
  };

  /** Icon badge — rounded square with tinted background */
  const IconBadge = ({
    name,
    color,
    bg,
  }: {
    name: string;
    color: string;
    bg: string;
  }) => (
    <View style={[styles.iconBadge, { backgroundColor: bg }]}>
      <Icon name={name} size={20} color={color} />
    </View>
  );

  /** A setting row with icon, title, subtitle, and right content */
  const SettingRow = ({
    icon,
    iconColor,
    iconBg,
    title,
    subtitle,
    right,
    onPress,
    isLast = false,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    subtitle: string;
    right?: React.ReactNode;
    onPress?: () => void;
    isLast?: boolean;
  }) => {
    const content = (
      <View style={[styles.settingRow, !isLast && styles.settingRowBorder]}>
        <IconBadge name={icon} color={iconColor} bg={iconBg} />
        <View style={styles.settingInfo}>
          <Text
            variant="bodyLarge"
            style={[styles.settingTitle, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {subtitle}
          </Text>
        </View>
        {right}
      </View>
    );

    if (onPress) {
      return (
        <TouchableRipple onPress={onPress} borderless>
          {content}
        </TouchableRipple>
      );
    }
    return content;
  };

  /** Value + chevron for tappable rows */
  const ValueChevron = ({ value }: { value: string }) => (
    <View style={styles.valueChevron}>
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}
      >
        {value}
      </Text>
      <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.headerSection}>
          <TouchableRipple
            onPress={() => navigation.goBack()}
            borderless
            style={styles.backBtn}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableRipple>

          <Text
            variant="displaySmall"
            style={[styles.pageTitle, { color: theme.colors.onBackground }]}
          >
            Settings
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.pageSubtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Manage preferences and application behavior.
          </Text>
        </Animated.View>

        {/* General Section */}
        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
          <Text
            variant="titleSmall"
            style={[styles.sectionHeader, { color: theme.colors.primary }]}
          >
            General
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <SettingRow
              icon="quality-high"
              iconColor={theme.colors.primary}
              iconBg={theme.colors.primary + '1A'}
              title="Download Quality"
              subtitle="Default resolution for media"
              right={
                <ValueChevron
                  value={
                    QUALITY_OPTIONS.find((q) => q.value === settings.defaultQuality)
                      ?.short || 'Best'
                  }
                />
              }
              onPress={handleQualityPicker}
            />
            <SettingRow
              icon="layers-outline"
              iconColor={theme.colors.secondary || theme.colors.primary}
              iconBg={(theme.colors.secondary || theme.colors.primary) + '1A'}
              title="Concurrent Downloads"
              subtitle="Maximum active tasks"
              right={
                <ValueChevron value={String(settings.maxConcurrentDownloads)} />
              }
              onPress={handleConcurrentPicker}
            />
            <SettingRow
              icon="flash"
              iconColor="#FFA726"
              iconBg="#FFA72622"
              title="Auto-Start Downloads"
              subtitle="Begin when link is added"
              right={
                <Switch
                  value={settings.autoStartDownloads}
                  onValueChange={(v) =>
                    settings.updateSetting('autoStartDownloads', v)
                  }
                />
              }
              isLast
            />
          </View>
        </Animated.View>

        {/* Storage Section */}
        <Animated.View entering={FadeInDown.delay(160).duration(300)}>
          <Text
            variant="titleSmall"
            style={[styles.sectionHeader, { color: theme.colors.primary }]}
          >
            Storage
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <SettingRow
              icon="folder-outline"
              iconColor={theme.colors.onSurfaceVariant}
              iconBg={theme.colors.onSurfaceVariant + '1A'}
              title="Download Location"
              subtitle={shortPath}
              right={
                <Icon
                  name="chevron-right"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              }
              onPress={() => setShowDirPicker(true)}
            />
            <SettingRow
              icon="delete-sweep-outline"
              iconColor="#EF5350"
              iconBg="#EF535022"
              title="Clear Cache"
              subtitle={`Free up ${cacheSize}`}
              onPress={handleClearCache}
              isLast
            />
          </View>
        </Animated.View>

        {/* Notifications Section */}
        <Animated.View entering={FadeInDown.delay(240).duration(300)}>
          <Text
            variant="titleSmall"
            style={[styles.sectionHeader, { color: theme.colors.primary }]}
          >
            Notifications
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <SettingRow
              icon="bell-outline"
              iconColor="#42A5F5"
              iconBg="#42A5F522"
              title="Download Notifications"
              subtitle="Progress and completion alerts"
              right={
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(v) =>
                    settings.updateSetting('notificationsEnabled', v)
                  }
                />
              }
              isLast
            />
          </View>
        </Animated.View>

        {/* App Section */}
        <Animated.View entering={FadeInDown.delay(320).duration(300)}>
          <Text
            variant="titleSmall"
            style={[styles.sectionHeader, { color: theme.colors.primary }]}
          >
            App
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
          >
            <SettingRow
              icon="clipboard-text-outline"
              iconColor="#66BB6A"
              iconBg="#66BB6A22"
              title="Clipboard Detection"
              subtitle="Show banner when link is copied"
              right={
                <Switch
                  value={settings.clipboardDetection}
                  onValueChange={(v) =>
                    settings.updateSetting('clipboardDetection', v)
                  }
                />
              }
            />
            <SettingRow
              icon="information-outline"
              iconColor={theme.colors.onSurfaceVariant}
              iconBg={theme.colors.onSurfaceVariant + '1A'}
              title="About QuickClip"
              subtitle="Version 2.0"
              isLast
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Migration Loading Overlay */}
      {isMigrating && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 16, color: 'white', fontWeight: 'bold' }}>Migrating files...</Text>
          </View>
        </View>
      )}

      {/* Dialogs */}
      <Portal>
        <Dialog visible={showQualityDialog} onDismiss={() => setShowQualityDialog(false)} style={{ backgroundColor: theme.colors.elevation.level3 }}>
          <Dialog.Title>Download Quality</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={value => {
                settings.updateSetting('defaultQuality', value as any);
                setShowQualityDialog(false);
              }}
              value={settings.defaultQuality}
            >
              {QUALITY_OPTIONS.map(opt => (
                <RadioButton.Item key={opt.value} label={opt.label} value={opt.value} color={theme.colors.primary} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowQualityDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showConcurrentDialog} onDismiss={() => setShowConcurrentDialog(false)} style={{ backgroundColor: theme.colors.elevation.level3 }}>
          <Dialog.Title>Concurrent Downloads</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={value => {
                settings.updateSetting('maxConcurrentDownloads', parseInt(value, 10));
                setShowConcurrentDialog(false);
              }}
              value={String(settings.maxConcurrentDownloads)}
            >
              {CONCURRENT_OPTIONS.map(n => (
                <RadioButton.Item key={n} label={`${n} Downloads`} value={String(n)} color={theme.colors.primary} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConcurrentDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <DirectoryPickerSheet
        visible={showDirPicker}
        onDismiss={() => setShowDirPicker(false)}
        onSelect={handlePathSelected}
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
    paddingHorizontal: SPACING.md,
  },
  headerSection: {
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  pageTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    opacity: 0.7,
  },
  sectionHeader: {
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: SPACING.md,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '500',
  },
  valueChevron: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsScreen;

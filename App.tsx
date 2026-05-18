/**
 * QuickClip — App Entry Point
 * Material You dynamic dark theme with wallpaper accent colors.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { StatusBar, View, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, Text, ActivityIndicator } from 'react-native-paper';
import { buildDynamicTheme } from './src/constants/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { updateYtDlp } from './src/services/extractors/ytdlpBridge';
import useDownloadStore from './src/store/downloadStore';
import useSettingsStore from './src/store/settingsStore';
import useDownloadEngine from './src/hooks/useDownloadEngine';

function App() {
  const [updating, setUpdating] = useState(true);

  const themes = useMemo(() => {
    try {
      return buildDynamicTheme();
    } catch (e) {
      console.error('Theme build failed:', e);
      const { MD3DarkTheme } = require('react-native-paper');
      const { DarkTheme } = require('@react-navigation/native');
      return { paperTheme: MD3DarkTheme, navTheme: DarkTheme };
    }
  }, []);

  // Load library + update yt-dlp on app startup
  useEffect(() => {
    (async () => {
      try {
        // Load settings FIRST — downloadStore needs the custom path from settings
        console.log('Loading settings...');
        await useSettingsStore.getState().loadSettings();
        console.log('Settings loaded!');

        // Load download library (uses settings.downloadPath)
        console.log('Loading download library...');
        await useDownloadStore.getState().loadFromFilesystem();
        console.log('Download library loaded!');

        // Request notification permission on Android 13+ (API 33)
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          try {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
              {
                title: 'QuickClip Notifications',
                message: 'QuickClip needs notification access to show download progress.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              },
            );
            console.log('Notification permission:', granted);
          } catch (e) {
            console.warn('Notification permission request failed:', e);
          }
        }

        // Then update yt-dlp (don't block the UI)
        console.log('Updating yt-dlp...');
        updateYtDlp().then(result => console.log('yt-dlp update:', result)).catch(e => console.warn(e));
      } catch (e: any) {
        console.warn('Startup task failed:', e.message);
      } finally {
        setUpdating(false);
      }
    })();
  }, []);

  if (updating) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={themes.paperTheme}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themes.paperTheme.colors.background }}>
            <ActivityIndicator size="large" color={themes.paperTheme.colors.primary} />
            <Text
              variant="bodyMedium"
              style={{ color: themes.paperTheme.colors.onSurfaceVariant, marginTop: 16 }}
            >
              QuickClip
            </Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={themes.paperTheme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <AppContent navTheme={themes.navTheme} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

/** Inner component that mounts the global download engine */
function AppContent({ navTheme }: { navTheme: any }) {
  // Mount download engine at the top level so downloads
  // process regardless of which tab/screen is active
  useDownloadEngine();

  return <RootNavigator navTheme={navTheme} />;
}

export default App;

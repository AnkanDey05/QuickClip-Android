/**
 * Root Navigator — 2-tab Material 3 bottom navigation
 * Home + Library, with DownloadsScreen accessible via header
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import FolderDetailScreen from '../screens/FolderDetailScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const LibraryStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

interface RootNavigatorProps {
  navTheme: any;
}

/** Library tab with folder drill-down */
const LibraryStackScreen = () => (
  <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
    <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
    <LibraryStack.Screen name="FolderDetail" component={FolderDetailScreen} />
  </LibraryStack.Navigator>
);

/** Bottom tab navigator */
const TabNavigator = () => {
  const theme = useTheme();

  const renderTabIcon = (
    name: string,
    focusedName: string,
    focused: boolean,
    color: string,
  ) => {
    if (focused) {
      return (
        <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]}>
          <Icon name={focusedName} size={24} color={theme.colors.background} />
        </View>
      );
    }
    return <Icon name={name} size={24} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level2,
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          letterSpacing: 0.5,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon('home-outline', 'home', focused, color),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon('folder-multiple-outline', 'folder-multiple', focused, color),
        }}
      />
    </Tab.Navigator>
  );
};

/** Root stack: Tabs + modal screens */
export const RootNavigator = ({ navTheme }: RootNavigatorProps) => {
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={TabNavigator} />
        <RootStack.Screen
          name="Downloads"
          component={DownloadsScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <RootStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  activeIndicator: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

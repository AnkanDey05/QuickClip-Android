const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [],
  watcher: {
    additionalExclusions: [
      // Exclude android build dirs that crash Metro's watcher on Windows
      /node_modules\/.*\/android\/build\/.*/,
      /node_modules\/.*\/android\/\.cxx\/.*/,
      /android\/app\/build\/.*/,
      /android\/build\/.*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

module.exports = {
  dependencies: {
    // These libraries don't support RN 0.85 New Architecture codegen,
    // so we exclude them from native autolinking to prevent CMake errors.
    // They still work via the JS bridge / old architecture compatibility layer.
    'react-native-material-you-colors': {
      platforms: {
        android: null, // Exclude from Android native autolinking
      },
    },
    'react-native-worklets-core': {
      platforms: {
        android: null, // Exclude — react-native-worklets (without -core) handles this
      },
    },
  },
};

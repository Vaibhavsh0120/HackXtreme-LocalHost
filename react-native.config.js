/**
 * React Native configuration for RunAnywhere
 *
 * NOTE: the postinstall fixer normalizes installed package metadata for RN 0.83.
 * automaticPodsInstallation stays disabled so pod installation remains explicit:
 * cd ios && pod install && cd ..
 */
module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: false,
    },
  },
  dependencies: {
    // Disable packages with New Architecture compatibility issues on iOS
    'react-native-sound': {
      platforms: {
        ios: null,
      },
    },
    'react-native-audio-recorder-player': {
      platforms: {
        ios: null,
      },
    },
    // CRITICAL: react-native-screens crashes with New Architecture in RN 0.83
    // Error: -[RCTView setColor:] and -[RCTView setSheetExpandsWhenScrolledToEdge:]
    'react-native-screens': {
      platforms: {
        ios: null,
      },
    },
  },
};

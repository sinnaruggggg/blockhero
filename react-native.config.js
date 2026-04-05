const android = require('@react-native-community/cli-config-android');
const baseConfig = require('./node_modules/react-native/react-native.config');

const androidProject = {
  sourceDir: './android',
  appName: 'app',
  packageName: 'com.blockhero.game',
};

module.exports = {
  ...baseConfig,
  project: {
    android: androidProject,
  },
  platforms: {
    ...baseConfig.platforms,
    android: {
      projectConfig: (root, userConfig) =>
        android.projectConfig(root, {
          ...androidProject,
          ...userConfig,
        }),
      dependencyConfig: android.dependencyConfig,
    },
  },
};

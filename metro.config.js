const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Add resolver for better dependency handling
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
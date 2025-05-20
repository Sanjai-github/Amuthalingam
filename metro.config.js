const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add support for CJS files
config.resolver.sourceExts.push('cjs');

// Disable package exports to fix Firebase auth issues
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { 
  input: './global.css',
  projectRoot: __dirname
})
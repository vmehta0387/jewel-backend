const { withInfoPlist } = require('@expo/config-plugins');

module.exports = function withIosPrivacyPermissions(config) {
  return withInfoPlist(config, (config) => {
    delete config.modResults.NSMicrophoneUsageDescription;
    delete config.modResults.NSFaceIDUsageDescription;
    return config;
  });
};

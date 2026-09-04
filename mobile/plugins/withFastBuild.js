const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withFastBuild(config) {
  return withGradleProperties(config, (config) => {
    const propsToSet = {
      'org.gradle.jvmargs': '-Xmx6144m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC',
      'org.gradle.parallel': 'true',
      'org.gradle.caching': 'true',
      'org.gradle.daemon': 'true',
      'org.gradle.vfs.watch': 'true',
      'android.enablePngCrunchInReleaseBuilds': 'false',
      'reactNativeArchitectures': 'armeabi-v7a,arm64-v8a',
    };

    for (const [key, value] of Object.entries(propsToSet)) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === key
      );

      if (existing) {
        existing.value = value;
      } else {
        config.modResults.push({ type: 'property', key, value });
      }
    }

    return config;
  });
};
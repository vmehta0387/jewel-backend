# Android Studio Build

Open this folder in Android Studio:

```text
D:\MobeDevlopProject\jwlApp\jewel-backend\mobile\android
```

Use this Gradle JDK if Android Studio asks:

```text
C:\Users\Jagmeet\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2
```

The Android SDK path is already set in `android/local.properties`:

```text
D:\MobeDevlop_sof\InstalledSoftware\Android\Sdk
```

API calls are configured from `.env`:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.blitznyc.com/api
EXPO_PUBLIC_WEB_API_BASE_URL=https://api.blitznyc.com/api
```

Build commands from the `mobile` folder:

```powershell
npm run android:bundle
npm run android:apk
```

These npm scripts set `JAVA_HOME` automatically because the machine-level `JAVA_HOME` currently points to an invalid JDK path.

Release AAB output:

```text
android\app\build\outputs\bundle\release\app-release.aab
```

Release APK output:

```text
android\app\build\outputs\apk\release\app-release.apk
```

Note: release signing currently uses the debug keystore in `android/app/build.gradle`. Configure a real upload/release keystore before Play Store upload.

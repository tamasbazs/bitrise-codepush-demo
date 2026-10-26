# Bitrise CodePush Demo (React Native 0.88, New Architecture)

A bare React Native app wired to **Bitrise CodePush** for over-the-air (OTA) JS updates, with a
`bitrise.yml` that publishes updates from CI.

| Piece | Where |
|---|---|
| SDK | `@bitrise/code-push-sdk` (Bitrise's maintained CodePush fork) |
| iOS bundle resolution | `ios/BitriseCodePushDemo/SceneDelegate.swift` → `CodePush.bundleURL()` in Release |
| iOS config | `Info.plist` → `CodePushDeploymentKey`, `CodePushServerURL`; Podfile/target at iOS 15.5 |
| Android bundle resolution | `MainApplication.kt` → `jsBundleFilePath = CodePush.getJSBundleFile()` |
| Android config | `res/values/strings.xml` → `CodePushDeploymentKey`, `CodePushServerUrl`; `codepush.gradle` applied in `app/build.gradle` |
| Update lifecycle | `App.tsx` – silent sync on launch + on resume, manual "Check for update" button |
| CI | `bitrise.yml` – `ci`, `codepush_staging`, `codepush_production`, `codepush_staging_cli` |

> RN 0.88's template moved the React Native factory into `SceneDelegate.swift`, so that is where
> the `bundleURL()` override lives (the Bitrise docs show it in `AppDelegate.swift`, which is where
> it sits on RN 0.76–0.8x).

## 1. One-time Bitrise setup

1. **Release Management → add two apps**: one iOS (bundle ID `io.bitrise.codepushdemo`) and one
   Android (package `io.bitrise.codepushdemo`). Rename the IDs first if you need different ones.
2. **Create CodePush deployments** (e.g. `Staging`, `Production`) on *both* apps and copy the
   deployment keys.
3. Note your **workspace slug** and each app's **connected app ID**.

## 2. Configure the app

Either edit the placeholders directly (`YOUR_IOS_DEPLOYMENT_KEY`, `YOUR_ANDROID_DEPLOYMENT_KEY`,
`YOUR_WORKSPACE_SLUG`), or inject them:

```bash
export CODEPUSH_WORKSPACE_SLUG=...
export IOS_CODEPUSH_DEPLOYMENT_KEY=...       # Staging key for test builds
export ANDROID_CODEPUSH_DEPLOYMENT_KEY=...
npm run codepush:configure
```

Deployment keys aren't secrets (they ship in the binary), but they are workspace-specific.

## 3. Build and run a release binary

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios:release        # or: npm run android:release
```

CodePush only affects **release** builds; debug builds keep loading JS from Metro.

## 4. Ship an OTA update

1. Change `APP_MESSAGE` in `App.tsx`.
2. Publish:
   - **From CI**: open a PR and add the `release-update` label → `codepush_staging` runs.
     Run `codepush_production` manually for a 25% staged rollout to Production.
   - **Locally** (with the CLI plugin installed and `BITRISE_API_TOKEN` exported):
     ```bash
     bitrise plugin install https://github.com/bitrise-io/bitrise-plugins-codepush-cli.git
     IOS_CONNECTED_APP_ID=... npm run codepush:ios
     ANDROID_CONNECTED_APP_ID=... npm run codepush:android
     ```
3. Relaunch / foreground the app. The status card shows the CodePush label once it's running.

## 5. Bitrise CI configuration

In the Workflow Editor:

- **Env Vars**: `IOS_CONNECTED_APP_ID`, `ANDROID_CONNECTED_APP_ID`, `CODEPUSH_DEPLOYMENT`,
  `APP_TARGET_VERSIONS` (exact `1.0.0` or a range like `>=1.0.0`).
- **Secret**: `BITRISE_API_TOKEN` (personal or workspace API token).
- **Stack**: choose the latest macOS/Xcode stack.

`APP_TARGET_VERSIONS` is your call: only target binary versions whose native code is compatible
with the JS you're shipping. Bump `MARKETING_VERSION` (iOS) / `versionName` (Android) whenever native
code changes.

## Docs

- Configuring the app: https://docs.bitrise.io/en/release-management/codepush/configuring-your-app-for-codepush
- Releasing from CI: https://docs.bitrise.io/en/release-management/codepush/codepush-updates-with-bitrise-ci
- JS API reference: https://github.com/bitrise-io/react-native-code-push/blob/master/docs/api-js.md

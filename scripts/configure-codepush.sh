#!/usr/bin/env bash
# Injects Bitrise CodePush deployment keys + server URL into the native projects.
# Used by CI so the same repo can produce Staging and Production binaries.
#
# Required env vars:
#   CODEPUSH_WORKSPACE_SLUG       Bitrise workspace slug
#   IOS_CODEPUSH_DEPLOYMENT_KEY   iOS deployment key (e.g. Staging or Production)
#   ANDROID_CODEPUSH_DEPLOYMENT_KEY Android deployment key
set -euo pipefail
cd "$(dirname "$0")/.."

: "${CODEPUSH_WORKSPACE_SLUG:?missing}"
: "${IOS_CODEPUSH_DEPLOYMENT_KEY:?missing}"
: "${ANDROID_CODEPUSH_DEPLOYMENT_KEY:?missing}"

SERVER_URL="https://${CODEPUSH_WORKSPACE_SLUG}.codepush.bitrise.io"
PLIST="ios/BitriseCodePushDemo/Info.plist"
STRINGS="android/app/src/main/res/values/strings.xml"

if command -v /usr/libexec/PlistBuddy >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Set :CodePushDeploymentKey ${IOS_CODEPUSH_DEPLOYMENT_KEY}" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :CodePushServerURL ${SERVER_URL}" "$PLIST"
else
  # Linux fallback (e.g. Android-only stacks)
  sed -i.bak \
    -e "s|YOUR_IOS_DEPLOYMENT_KEY|${IOS_CODEPUSH_DEPLOYMENT_KEY}|" \
    -e "s|https://YOUR_WORKSPACE_SLUG.codepush.bitrise.io|${SERVER_URL}|" "$PLIST" && rm -f "$PLIST.bak"
fi

sed -i.bak \
  -e "s|<string name=\"CodePushDeploymentKey\" translatable=\"false\">[^<]*</string>|<string name=\"CodePushDeploymentKey\" translatable=\"false\">${ANDROID_CODEPUSH_DEPLOYMENT_KEY}</string>|" \
  -e "s|<string name=\"CodePushServerUrl\" translatable=\"false\">[^<]*</string>|<string name=\"CodePushServerUrl\" translatable=\"false\">${SERVER_URL}</string>|" \
  "$STRINGS" && rm -f "$STRINGS.bak"

echo "CodePush configured for ${SERVER_URL}"

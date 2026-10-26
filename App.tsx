/**
 * Bitrise CodePush demo app.
 *
 * - Silently syncs on launch and whenever the app returns to the foreground.
 * - Shows the currently running bundle (binary vs. CodePush label).
 * - Lets you trigger a manual, interactive check from the UI.
 *
 * Bump APP_MESSAGE, publish a CodePush update, and relaunch a release build
 * to see the OTA update land.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import codePush, { LocalPackage } from '@bitrise/code-push-sdk';

// Change this, then publish a CodePush update to see it delivered OTA.
const APP_MESSAGE = 'Hello from the binary bundle 👋';

const STATUS_LABELS: Record<number, string> = {
  [codePush.SyncStatus.UP_TO_DATE]: 'Up to date',
  [codePush.SyncStatus.UPDATE_INSTALLED]: 'Update installed — applies on next resume/restart',
  [codePush.SyncStatus.UPDATE_IGNORED]: 'Update ignored',
  [codePush.SyncStatus.UNKNOWN_ERROR]: 'Sync failed (see logs)',
  [codePush.SyncStatus.SYNC_IN_PROGRESS]: 'Sync already in progress',
  [codePush.SyncStatus.CHECKING_FOR_UPDATE]: 'Checking for update…',
  [codePush.SyncStatus.AWAITING_USER_ACTION]: 'Waiting for your decision…',
  [codePush.SyncStatus.DOWNLOADING_PACKAGE]: 'Downloading update…',
  [codePush.SyncStatus.INSTALLING_UPDATE]: 'Installing update…',
};

const BACKGROUND_SYNC_OPTIONS = {
  installMode: codePush.InstallMode.ON_NEXT_RESUME,
  mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
};

function App() {
  const isDark = useColorScheme() === 'dark';
  const [status, setStatus] = useState<string>('Idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [current, setCurrent] = useState<LocalPackage | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshMetadata = useCallback(async () => {
    try {
      setCurrent(await codePush.getUpdateMetadata());
    } catch (e) {
      console.warn('[CodePush] getUpdateMetadata failed', e);
    }
  }, []);

  const runSync = useCallback(
    async (options: object) => {
      setBusy(true);
      try {
        await codePush.sync(
          options,
          s => setStatus(STATUS_LABELS[s] ?? `Status ${s}`),
          ({ receivedBytes, totalBytes }) =>
            setProgress(totalBytes ? receivedBytes / totalBytes : null),
        );
      } catch (e) {
        console.warn('[CodePush] sync failed', e);
        setStatus('Sync failed (see logs)');
      } finally {
        setProgress(null);
        setBusy(false);
        refreshMetadata();
      }
    },
    [refreshMetadata],
  );

  useEffect(() => {
    // Tell CodePush this bundle started fine, so it won't roll it back.
    codePush.notifyAppReady();
    refreshMetadata();
    runSync(BACKGROUND_SYNC_OPTIONS);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        runSync(BACKGROUND_SYNC_OPTIONS);
      }
    });
    return () => sub.remove();
  }, [refreshMetadata, runSync]);

  const checkNow = () =>
    runSync({ updateDialog: true, installMode: codePush.InstallMode.IMMEDIATE });

  const c = isDark ? dark : light;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: c.text }]}>Bitrise CodePush Demo</Text>
          <Text style={[styles.message, { color: c.accent }]}>{APP_MESSAGE}</Text>

          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Row label="Running bundle" value={current ? `CodePush ${current.label}` : 'Binary (no OTA update yet)'} c={c} />
            <Row label="App version" value={current?.appVersion ?? '—'} c={c} />
            <Row label="Description" value={current?.description || '—'} c={c} />
            <Row label="Status" value={status} c={c} />
            {progress !== null && (
              <Row label="Download" value={`${Math.round(progress * 100)}%`} c={c} />
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={checkNow}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: c.accent, opacity: busy || pressed ? 0.6 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Check for update now</Text>
            )}
          </Pressable>

          <Text style={[styles.hint, { color: c.muted }]}>
            OTA updates only apply to release builds. Debug builds load JS from Metro.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type Palette = typeof light;

function Row({ label, value, c }: { label: string; value: string; c: Palette }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const light = { bg: '#f6f4fb', card: '#ffffff', text: '#1b1530', muted: '#6b6480', accent: '#7a2fd6' };
const dark = { bg: '#120d1f', card: '#1f1833', text: '#f2eefb', muted: '#a49cba', accent: '#a875ff' };

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  message: { fontSize: 18, fontWeight: '600' },
  card: { borderRadius: 14, padding: 16, gap: 12 },
  row: { gap: 2 },
  rowLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  rowValue: { fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, textAlign: 'center' },
});

// Check on start is handled manually above, so disable the HOC's own check.
export default codePush({ checkFrequency: codePush.CheckFrequency.MANUAL })(App);

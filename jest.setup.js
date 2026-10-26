/* eslint-env jest */
// The CodePush native module isn't available under Jest — mock it.
jest.mock('@bitrise/code-push-sdk', () => {
  const codePush = () => Component => Component;
  Object.assign(codePush, {
    sync: jest.fn(() => Promise.resolve(0)),
    notifyAppReady: jest.fn(() => Promise.resolve()),
    getUpdateMetadata: jest.fn(() => Promise.resolve(null)),
    CheckFrequency: { ON_APP_START: 0, ON_APP_RESUME: 1, MANUAL: 2 },
    InstallMode: { IMMEDIATE: 0, ON_NEXT_RESTART: 1, ON_NEXT_RESUME: 2, ON_NEXT_SUSPEND: 3 },
    SyncStatus: {
      UP_TO_DATE: 0, UPDATE_INSTALLED: 1, UPDATE_IGNORED: 2, UNKNOWN_ERROR: 3,
      SYNC_IN_PROGRESS: 4, CHECKING_FOR_UPDATE: 5, AWAITING_USER_ACTION: 6,
      DOWNLOADING_PACKAGE: 7, INSTALLING_UPDATE: 8,
    },
  });
  return { __esModule: true, default: codePush };
});

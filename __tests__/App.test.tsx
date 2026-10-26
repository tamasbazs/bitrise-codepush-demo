/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import codePush from '@bitrise/code-push-sdk';
import App from '../App';

test('renders and kicks off a CodePush sync on launch', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });

  expect(codePush.notifyAppReady).toHaveBeenCalled();
  expect(codePush.sync).toHaveBeenCalledWith(
    expect.objectContaining({ installMode: codePush.InstallMode.ON_NEXT_RESUME }),
    expect.any(Function),
    expect.any(Function),
  );
});

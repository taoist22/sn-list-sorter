// Execute SDK 0.1.65's real JS validators; only the Android bridge is substituted.
jest.mock('../node_modules/sn-plugin-lib/src/module/NativePluginAPI', () => ({
  __esModule: true,
  default: {insertElements: jest.fn(async () => ({success: true, result: [1]}))},
}));
const PluginFileAPI = require('../node_modules/sn-plugin-lib/src/sdk/PluginFileAPI').default;
const NativePluginAPI = require('../node_modules/sn-plugin-lib/src/module/NativePluginAPI').default;

test('A14: old release-test element fixtures are rejected by real SDK validation', async () => {
  const response = await PluginFileAPI.insertElements('/note', 0, [{textBox: {textContentFull: 'Apple'}}]);
  expect(response).toMatchObject({success: false, error: {code: 107}});
  expect(NativePluginAPI.insertElements).not.toHaveBeenCalled();
});

test('A15: SDK accepts supported text-element fields but cannot enforce manifest permission', async () => {
  const response = await PluginFileAPI.insertElements('/note', 0, [{
    type: 500, uuid: 'test', pageNum: 0, layerNum: 0,
    textBox: {fontSize: 32, textContentFull: 'Apple', textRect: {left: 40, top: 40, right: 300, bottom: 100}, textEditable: 1},
  }]);
  expect(response).toMatchObject({success: true});
  expect(NativePluginAPI.insertElements).toHaveBeenCalledTimes(1);
});

/* eslint-env jest */
// Real SDK JavaScript + simulated Android boundary. This is not a device test.
jest.mock('../node_modules/sn-plugin-lib/src/module/NativePluginAPI', () => ({
  __esModule: true,
  default: Object.fromEntries(
    [
      'getCurrentFilePath',
      'getCurrentPageNum',
      'getPageSize',
      'getLassoRect',
      'getLassoElements',
      'createElement',
      'recycleElement',
      'getElements',
      'saveCurrentNote',
      'insertElements',
      'modifyElements',
      'reloadFile',
      'recognizeElements',
      'cancelRecognize',
    ].map(name => [name, jest.fn()]),
  ),
}));
jest.mock(
  '../node_modules/sn-plugin-lib/src/module/NativePluginManager',
  () => ({
    __esModule: true,
    default: Object.fromEntries(
      [
        'onMounted',
        'reportSdkVersion',
        'onPluginLifeState',
        'registerButtonRes',
        'registerConfigButton',
        'getButtonState',
        'hasPermission',
        'requestPermission',
        'closePluginView',
      ].map(name => [name, jest.fn()]),
    ),
  }),
);
jest.mock('sn-plugin-lib', () => ({
  PluginManager: require('../node_modules/sn-plugin-lib/src/PluginManager')
    .default,
  PluginCommAPI: require('../node_modules/sn-plugin-lib/src/sdk/PluginCommAPI')
    .default,
  PluginFileAPI: require('../node_modules/sn-plugin-lib/src/sdk/PluginFileAPI')
    .default,
  PluginNoteAPI: require('../node_modules/sn-plugin-lib/src/sdk/PluginNoteAPI')
    .default,
}));
const api =
  require('../node_modules/sn-plugin-lib/src/module/NativePluginAPI').default;
const manager =
  require('../node_modules/sn-plugin-lib/src/module/NativePluginManager').default;
const config = require('../PluginConfig.json');
const state = {
  permissions: new Set(),
  declared: [],
  filePath: '/Note/list.note',
  pageNum: 0,
  selected: [],
  page: [],
  cache: new Set(),
  created: [],
  deny: false,
};
function element(uuid = 'selected', text = 'Banana\nApple', userData = '') {
  return {
    uuid,
    type: 500,
    pageNum: 0,
    numInPage: 1,
    layerNum: 0,
    userData,
    textBox: {
      fontSize: 32,
      textContentFull: text,
      textRect: {left: 40, top: 40, right: 300, bottom: 150},
      textBold: 0,
      textAlign: 0,
      textEditable: 0,
    },
  };
}
function permission(kind) {
  if (!state.permissions.has(`plugin.permission.FILE:${kind}`)) {
    throw Object.assign(new Error('Permission missing'), {
      code: kind === 'READ' ? 1503 : 1501,
    });
  }
}
function ok(result) {
  return {success: true, result};
}
function reset() {
  jest.clearAllMocks();
  state.permissions = new Set();
  state.declared = [...config['uses-permissions']];
  state.filePath = '/Note/list.note';
  state.pageNum = 0;
  state.selected = [element()];
  state.page = [];
  state.cache = new Set();
  state.created = [];
  state.deny = false;
  manager.hasPermission.mockImplementation(async name => {
    if (!state.declared.includes(name)) {
      throw Object.assign(new Error('Permission not declared'), {code: 1500});
    }
    return state.permissions.has(name) ? 1 : 0;
  });
  manager.requestPermission.mockImplementation(async name => {
    if (!state.declared.includes(name)) {
      throw Object.assign(new Error('Permission not declared'), {code: 1500});
    }
    if (state.deny) {
      return 0;
    }
    state.permissions.add(name);
    return 2;
  });
  manager.registerButtonRes.mockResolvedValue(true);
  manager.registerConfigButton.mockResolvedValue(true);
  manager.getButtonState.mockResolvedValue(true);
  manager.closePluginView.mockResolvedValue(true);
  api.getCurrentFilePath.mockImplementation(async () => ok(state.filePath));
  api.getCurrentPageNum.mockImplementation(async () => ok(state.pageNum));
  api.getPageSize.mockImplementation(async () => {
    permission('READ');
    return ok({width: 1404, height: 1872});
  });
  api.getLassoRect.mockResolvedValue(
    ok({left: 40, top: 40, right: 300, bottom: 150}),
  );
  api.getLassoElements.mockImplementation(async () => {
    permission('READ');
    state.selected.forEach(el => state.cache.add(el.uuid));
    return ok(state.selected);
  });
  api.getElements.mockImplementation(async () => {
    permission('READ');
    state.page.forEach(el => state.cache.add(el.uuid));
    return ok(state.page);
  });
  api.createElement.mockImplementation(async () => {
    const el = element(`created-${state.created.length}`, '');
    state.created.push(el);
    state.cache.add(el.uuid);
    return ok(el);
  });
  api.recycleElement.mockImplementation(uuid => state.cache.delete(uuid));
  api.saveCurrentNote.mockImplementation(async () => {
    permission('WRITE');
    return ok(true);
  });
  api.insertElements.mockImplementation(async (_path, _page, elements) => {
    permission('WRITE');
    return ok(elements.every(el => state.cache.has(el.uuid)));
  });
  api.modifyElements.mockImplementation(async (_path, _page, elements) => {
    permission('WRITE');
    return ok(
      elements.filter(el => state.cache.has(el.uuid)).map(el => el.numInPage),
    );
  });
  api.reloadFile.mockResolvedValue(ok(true));
  api.recognizeElements.mockResolvedValue(ok('Banana\nApple'));
  api.cancelRecognize.mockResolvedValue(ok(true));
}
beforeEach(reset);
module.exports = {api, manager, state, element, ok};

import {
  requireFileReadPermission,
  requireFileWritePermission,
} from '../src/pluginPermissions';
import {
  cancelRecognition,
  detectLassoMode,
  insertSortedList,
  realignList,
  formatGroup,
} from '../src/listOps';
import type {GroupData, InsertOptions, LassoData} from '../src/types';
const {api, manager, state, element, ok} = require('../test/host');
const options: InsertOptions = {
  format: 'none',
  alignment: 'left',
  fontSize: 32,
  bold: false,
  outputMode: 'single',
  fit: false,
};
const data: LassoData = {
  mode: 'typed',
  filePath: '/Note/list.note',
  pageNum: 0,
  pageSize: {width: 1404, height: 1872},
  lassoRect: {left: 40, top: 40, right: 300, bottom: 150},
  items: ['Apple', 'Banana'],
};
const group: GroupData = {
  filePath: data.filePath,
  pageNum: 0,
  groupId: 'g1234567',
  count: 2,
  fontSize: 32,
  bold: false,
};
function members() {
  const a = element(
    'a',
    'Apple',
    JSON.stringify({gid: group.groupId, idx: 0, fs: 32}),
  );
  const b = element(
    'b',
    'Banana',
    JSON.stringify({gid: group.groupId, idx: 1, fs: 32}),
  );
  b.numInPage = 2;
  b.textBox.textRect = {left: 80, top: 300, right: 400, bottom: 380};
  return [a, b];
}
test('source manifest declares exactly the permissions requested by the SDK flow', async () => {
  expect(state.declared.sort()).toEqual([
    'plugin.permission.FILE:READ',
    'plugin.permission.FILE:WRITE',
  ]);
  await requireFileReadPermission();
  await requireFileWritePermission();
  expect(state.permissions.size).toBe(2);
});
test('undeclared permission error 1500 is retained, not relabeled as denial', async () => {
  state.declared = [];
  await expect(requireFileReadPermission()).rejects.toThrow(
    '[1500] Permission not declared',
  );
});
test.each([1, 2])('accepts grant status %i', async status => {
  manager.requestPermission.mockResolvedValue(status);
  await expect(requireFileReadPermission()).resolves.toBeUndefined();
});
test.each([0, -1])(
  'denial status %i prevents selection reads',
  async status => {
    manager.requestPermission.mockResolvedValue(status);
    await expect(detectLassoMode()).rejects.toThrow('access was not allowed');
    expect(api.getLassoElements).not.toHaveBeenCalled();
  },
);
test('coalesces permission requests and rechecks revoked grants', async () => {
  await Promise.all([requireFileReadPermission(), requireFileReadPermission()]);
  expect(manager.requestPermission).toHaveBeenCalledTimes(1);
  state.permissions.clear();
  state.deny = true;
  await expect(requireFileReadPermission()).rejects.toThrow(
    'access was not allowed',
  );
});
test('ordinary text reads only selected objects and releases them', async () => {
  state.page = [element('other', 'Other', '{"gid":"unselected"}')];
  const found = await detectLassoMode();
  expect(found).toMatchObject({
    kind: 'sort',
    data: {items: ['Banana', 'Apple'], filePath: data.filePath},
  });
  expect(api.getElements).not.toHaveBeenCalled();
  expect(api.saveCurrentNote).not.toHaveBeenCalled();
  expect(state.cache.size).toBe(0);
});
test('recognizes ink and keeps handles alive until recognition completes', async () => {
  state.selected = [{uuid: 'ink', type: 100, numInPage: 1, layerNum: 0}];
  api.recognizeElements.mockImplementation(async () => {
    expect(state.cache.has('ink')).toBe(true);
    return ok('Pear\nApple');
  });
  await expect(detectLassoMode()).resolves.toMatchObject({
    kind: 'sort',
    data: {mode: 'handwriting', items: ['Pear', 'Apple']},
  });
  expect(state.cache.size).toBe(0);
});
test('cancellation releases recognition handles without inserting', async () => {
  state.selected = [{uuid: 'ink', type: 100, numInPage: 1, layerNum: 0}];
  let finish!: (value: unknown) => void;
  let began!: () => void;
  const started = new Promise<void>(resolve => {
    began = resolve;
  });
  api.recognizeElements.mockImplementation(() => {
    began();
    return new Promise(resolve => {
      finish = resolve;
    });
  });
  const token = {cancelled: false};
  const detecting = detectLassoMode(token);
  await started;
  token.cancelled = true;
  await cancelRecognition();
  finish(ok('Apple'));
  await expect(detecting).rejects.toThrow('cancelled');
  expect(api.cancelRecognize).toHaveBeenCalledTimes(1);
  expect(state.cache.size).toBe(0);
  expect(api.insertElements).not.toHaveBeenCalled();
});
test('recognition errors release native handles', async () => {
  state.selected = [{uuid: 'ink', type: 100, numInPage: 1, layerNum: 0}];
  api.recognizeElements.mockResolvedValue({
    success: false,
    error: {code: 900, message: 'Recognition failed'},
  });
  await expect(detectLassoMode()).rejects.toThrow('[900]');
  expect(state.cache.size).toBe(0);
});
test('selected legacy groups load all their members and preserve mixed styles', async () => {
  state.page = members();
  state.page[1].textBox.textBold = 1;
  state.selected = [state.page[0]];
  await expect(detectLassoMode()).resolves.toMatchObject({
    kind: 'group',
    data: {count: 2, fontSize: 32, bold: null},
  });
  expect(state.cache.size).toBe(0);
});
test('rejects mixed group selections without scanning the page', async () => {
  state.selected = [members()[0], element('plain')];
  await expect(detectLassoMode()).rejects.toThrow('one list group');
  expect(api.getElements).not.toHaveBeenCalled();
  expect(state.cache.size).toBe(0);
});
test.each(['single', 'individual'] as const)(
  'inserts %s with real SDK validation and releases the created handles',
  async outputMode => {
    await insertSortedList(data, {
      ...options,
      outputMode,
      format: 'lettered',
      alignment: 'right',
    });
    expect(api.insertElements).toHaveBeenCalledTimes(1);
    const boxes = api.insertElements.mock.calls[0][2];
    expect(boxes).toHaveLength(outputMode === 'single' ? 1 : 2);
    expect(boxes[0].textBox).toMatchObject({
      textFrameWidthType: 0,
      textEditable: 0,
      textAlign: 2,
    });
    expect(JSON.parse(boxes[0].userData)).toMatchObject({
      owner: 'ListSorter',
      schema: 1,
    });
    expect(
      boxes.every(
        (el: any) => el.type === 500 && el.pageNum === 0 && el.layerNum === 0,
      ),
    ).toBe(true);
    expect(state.cache.size).toBe(0);
    expect(api.reloadFile).toHaveBeenCalledTimes(1);
  },
);
test('denied write never saves or inserts', async () => {
  state.permissions.add('plugin.permission.FILE:READ');
  state.deny = true;
  await expect(insertSortedList(data, options)).rejects.toThrow(
    'File write access',
  );
  expect(api.saveCurrentNote).not.toHaveBeenCalled();
  expect(api.createElement).not.toHaveBeenCalled();
});
test('changed context never inserts', async () => {
  state.filePath = '/Note/different.note';
  await expect(insertSortedList(data, options)).rejects.toThrow('changed');
  expect(api.insertElements).not.toHaveBeenCalled();
});
test('context changes during creation abort before writing and release handles', async () => {
  api.createElement.mockImplementation(async () => {
    state.filePath = '/Note/different.note';
    const el = element('new');
    state.cache.add(el.uuid);
    return ok(el);
  });
  await expect(insertSortedList(data, options)).rejects.toThrow('changed');
  expect(api.insertElements).not.toHaveBeenCalled();
  expect(state.cache.size).toBe(0);
});
test('invalid page size fails rather than assuming device dimensions', async () => {
  api.getPageSize.mockResolvedValue({
    success: false,
    error: {code: 90, message: 'No page'},
  });
  await expect(insertSortedList(data, options)).rejects.toThrow(
    'Read page size',
  );
  expect(api.createElement).not.toHaveBeenCalled();
});
test('oversized lists fail without creating elements', async () => {
  await expect(
    insertSortedList(
      {...data, items: Array(500).fill('Apple')},
      {...options, fit: true},
    ),
  ).rejects.toThrow('cannot fit');
  expect(api.createElement).not.toHaveBeenCalled();
});
test('failed insert reports possible write and releases handles', async () => {
  api.insertElements.mockResolvedValue(ok(false));
  await expect(insertSortedList(data, options)).rejects.toThrow(
    'may already have changed',
  );
  expect(api.reloadFile).not.toHaveBeenCalled();
  expect(state.cache.size).toBe(0);
});
test('deduplicates group handles and migrates legacy metadata', async () => {
  state.page = members();
  state.page.push({...state.page[0]});
  await realignList(group);
  const written = api.modifyElements.mock.calls[0][2];
  expect(written).toHaveLength(2);
  expect(new Set(written.map((el: any) => el.uuid)).size).toBe(2);
  expect(
    written[0].textBox.textRect.right - written[0].textBox.textRect.left,
  ).toBe(320);
  expect(JSON.parse(written[0].userData).owner).toBe('ListSorter');
  expect(state.cache.size).toBe(0);
});
test.each([[], [1], [1, 1], [1, 99]].map(changed => ({changed})))(
  'partial or incorrect modification result %j is an error',
  async ({changed}) => {
    state.page = members();
    api.modifyElements.mockResolvedValue(ok(changed));
    await expect(formatGroup(group, 24, null)).rejects.toThrow(
      'part of the list',
    );
    expect(api.reloadFile).not.toHaveBeenCalled();
    expect(state.cache.size).toBe(0);
  },
);
test('format preserves mixed styles when no replacement is selected', async () => {
  state.page = members();
  state.page[1].textBox.textBold = 1;
  await formatGroup(group, null, null);
  const written = api.modifyElements.mock.calls[0][2];
  expect(written.map((el: any) => el.textBox.textBold)).toEqual([0, 1]);
});

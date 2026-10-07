import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {DeviceEventEmitter, Pressable, TextInput} from 'react-native';
import App from '../App';
import SortPanel from '../src/SortPanel';
import GroupPanel from '../src/GroupPanel';
import {initializePlugin} from '../src/pluginRouter';
const {api, manager, state, ok} = require('../test/host');
function content(node: renderer.ReactTestInstance | string): string {
  return typeof node === 'string' ? node : node.children.map(content).join('');
}
const trees: renderer.ReactTestRenderer[] = [];
function create(node: React.ReactElement) {
  const tree = renderer.create(node);
  trees.push(tree);
  return tree;
}
afterEach(async () => {
  await act(async () => {
    trees.splice(0).forEach(tree => tree.unmount());
  });
});
function button(tree: renderer.ReactTestRenderer, label: string) {
  return tree.root
    .findAllByType(Pressable)
    .reverse()
    .find(node => content(node).includes(label))!;
}
async function start() {
  await initializePlugin('file:///list.png');
}
test('real SDK initialization reports its version and registers ink, text, sidebar, and settings entries', async () => {
  await start();
  expect(manager.reportSdkVersion).toHaveBeenCalledWith('0.1.65');
  expect(manager.registerButtonRes).toHaveBeenCalledWith(
    2,
    ['NOTE'],
    expect.objectContaining({editDataTypes: [0, 3]}),
  );
  expect(manager.registerButtonRes).toHaveBeenCalledWith(
    1,
    ['NOTE'],
    expect.objectContaining({id: 100}),
  );
  expect(manager.registerConfigButton).toHaveBeenCalled();
});
test('cold mount is usable setup and its permission action reaches real SDK bridge', async () => {
  await start();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('1.1.0-beta');
  await act(async () => {
    await button(tree, 'Allow read').props.onPress();
  });
  expect(state.permissions.size).toBe(2);
  await act(async () => {
    tree.unmount();
  });
});
test('SDK button event opens selection; pause/resume preserves preview', async () => {
  await start();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  await act(async () => {
    DeviceEventEmitter.emit('plugin_button_event', {id: 200});
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Insert sorted list');
  await act(async () => {
    DeviceEventEmitter.emit('plugin_life', {data: {state: 3}});
    DeviceEventEmitter.emit('plugin_life', {data: {state: 2}});
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Insert sorted list');
  await act(async () => {
    tree.unmount();
  });
});
test('config entry is independent of lasso and never reads selected elements', async () => {
  await start();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
    DeviceEventEmitter.emit('plugin_config_event', {});
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Read current selection');
  expect(api.getLassoElements).not.toHaveBeenCalled();
  await act(async () => {
    tree.unmount();
  });
});
test('read errors show settings and close controls with native error codes', async () => {
  await start();
  state.declared = [];
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  await act(async () => {
    DeviceEventEmitter.emit('plugin_button_event', {id: 200});
  });
  expect(JSON.stringify(tree.toJSON())).toContain('1500');
  expect(button(tree, 'Permissions and settings')).toBeDefined();
  await act(async () => {
    tree.unmount();
  });
});
test('edited preview is the exact list submitted to insertion', async () => {
  const confirm = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  const data = {
    mode: 'typed' as const,
    items: ['Pear'],
    filePath: '/Note/list.note',
    pageNum: 0,
    pageSize: {width: 1404, height: 1872},
    lassoRect: {left: 40, top: 40, right: 300, bottom: 200},
  };
  await act(async () => {
    tree = create(
      <SortPanel
        data={data}
        onConfirm={confirm}
        onCancel={jest.fn()}
        busy={false}
      />,
    );
  });
  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('Item 10\nItem 2');
  });
  await act(async () => {
    button(tree, 'Insert sorted list').props.onPress();
  });
  expect(confirm).toHaveBeenCalledWith(expect.anything(), [
    'Item 2',
    'Item 10',
  ]);
  await act(async () => {
    tree.unmount();
  });
});
test('single box groups hide realign and retain existing bold and font size', async () => {
  const format = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  const data = {
    filePath: '/Note/list.note',
    pageNum: 0,
    groupId: 'group',
    count: 1,
    fontSize: 24,
    bold: true,
  };
  await act(async () => {
    tree = create(
      <GroupPanel
        data={data}
        onRealign={jest.fn()}
        onFormat={format}
        onCancel={jest.fn()}
        busy={false}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Realign');
  await act(async () => {
    button(tree, 'Format Group').props.onPress();
  });
  await act(async () => {
    button(tree, 'Apply Format').props.onPress();
  });
  expect(format).toHaveBeenCalledWith(24, true);
  await act(async () => {
    tree.unmount();
  });
});
test('repeated tap cannot start duplicate insertion', async () => {
  await start();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  await act(async () => {
    DeviceEventEmitter.emit('plugin_button_event', {id: 200});
  });
  api.insertElements.mockResolvedValue(ok(true));
  const insert = button(tree, 'Insert sorted list');
  await act(async () => {
    insert.props.onPress();
    insert.props.onPress();
  });
  expect(api.insertElements).toHaveBeenCalledTimes(1);
  await act(async () => {
    tree.unmount();
  });
});

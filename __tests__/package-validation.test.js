const fs = require('fs');
const path = require('path');
const os = require('os');
const {execFileSync, spawnSync} = require('child_process');
const validator = path.resolve(
  __dirname,
  '../tools/validate-plugin-package.js',
);
let root;
function write(file, value) {
  fs.writeFileSync(
    path.join(root, file),
    typeof value === 'string' ? value : JSON.stringify(value),
  );
}
function validate() {
  return spawnSync(process.execPath, [validator], {
    cwd: root,
    encoding: 'utf8',
  });
}
let source;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'list-sorter-package-test-'));
  fs.mkdirSync(path.join(root, 'build/generated'), {recursive: true});
  fs.mkdirSync(path.join(root, 'build/outputs'));
  source = {
    name: 'ListSorter',
    desc: 'List sorter',
    iconPath: 'list.png',
    pluginID: 'm4r7x2p9nk1w8czq',
    pluginKey: 'ListSorter',
    jsMainPath: 'index',
    versionName: '1.1.0-beta',
    versionCode: '3',
    'uses-permissions': [
      'plugin.permission.FILE:READ',
      'plugin.permission.FILE:WRITE',
    ],
  };
  write('PluginConfig.json', source);
  write('package.json', {name: 'ListSorter', version: source.versionName});
  write('package-lock.json', {
    version: source.versionName,
    packages: {'': {version: source.versionName}},
  });
  write('app.json', {name: 'ListSorter'});
  write('build/generated/ListSorter.bundle', 'bundle');
  write('build/generated/list.png', 'icon');
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
function pack(config = source, omitBundle = false) {
  write('build/generated/PluginConfig.json', config);
  const files = [
    'PluginConfig.json',
    'list.png',
    ...(omitBundle ? [] : ['ListSorter.bundle']),
  ];
  execFileSync(
    'zip',
    ['-q', path.join(root, 'build/outputs/ListSorter.snplg'), ...files],
    {cwd: path.join(root, 'build/generated')},
  );
}
test('accepts a consistent archive', () => {
  pack();
  expect(validate().status).toBe(0);
});
test('rejects the audited missing permission declaration', () => {
  delete source['uses-permissions'];
  write('PluginConfig.json', source);
  pack();
  expect(validate().stderr).toContain('uses-permissions');
});
test('rejects missing permissions in archive even if source is corrected', () => {
  pack({...source, 'uses-permissions': []});
  expect(validate().stderr).toContain('Packaged manifest');
});
test('rejects stale packaged version', () => {
  pack({...source, versionName: '1.0.1-beta'});
  expect(validate().stderr).toContain('versionName');
});
test('rejects missing bundle', () => {
  pack(source, true);
  expect(validate().stderr).toContain('Missing ListSorter.bundle');
});
test('rejects stale bundle bytes', () => {
  pack();
  write('build/generated/ListSorter.bundle', 'changed');
  expect(validate().stderr).toContain('differs');
});
test('rejects registration mismatch', () => {
  pack();
  write('app.json', {name: 'Other'});
  expect(validate().stderr).toContain('identity');
});
test('rejects missing required native package', () => {
  source.nativeCodePackage = '/app.npk';
  write('PluginConfig.json', source);
  pack();
  expect(validate().stderr).toContain('native package');
});

test('validates bundles larger than the child-process default buffer', () => {
  write('build/generated/ListSorter.bundle', 'x'.repeat(2 * 1024 * 1024));
  pack();
  expect(validate().status).toBe(0);
});

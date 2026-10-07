#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {createHash} = require('crypto');
const root = process.cwd();
function fail(message) {
  throw new Error(`Package validation failed: ${message}`);
}
function json(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}
try {
  const source = json('PluginConfig.json');
  const pkg = json('package.json');
  const lock = json('package-lock.json');
  const app = json('app.json');
  for (const key of [
    'name',
    'desc',
    'iconPath',
    'pluginID',
    'pluginKey',
    'jsMainPath',
    'versionName',
    'versionCode',
  ]) {
    if (typeof source[key] !== 'string' || !source[key]) {
      fail(`Missing manifest field ${key}`);
    }
  }
  if (source.pluginKey !== app.name || source.name !== pkg.name) {
    fail('Plugin registration identity does not match package/app metadata');
  }
  if (
    source.versionName !== pkg.version ||
    lock.version !== pkg.version ||
    lock.packages[''].version !== pkg.version
  ) {
    fail('Source version metadata is inconsistent');
  }
  if (!/^\d+$/.test(source.versionCode) || Number(source.versionCode) < 1) {
    fail('Invalid versionCode');
  }
  const required = [
    'plugin.permission.FILE:READ',
    'plugin.permission.FILE:WRITE',
  ];
  function permissions(config, label) {
    if (
      !Array.isArray(config['uses-permissions']) ||
      JSON.stringify([...config['uses-permissions']].sort()) !==
        JSON.stringify(required)
    ) {
      fail(
        `${label} must declare exactly FILE:READ and FILE:WRITE in uses-permissions`,
      );
    }
  }
  permissions(source, 'Source manifest');
  const archive = path.join(root, 'build', 'outputs', `${pkg.name}.snplg`);
  execFileSync('unzip', ['-t', archive], {stdio: 'pipe'});
  const entries = execFileSync('unzip', ['-Z1', archive], {encoding: 'utf8'})
    .trim()
    .split('\n');
  if (new Set(entries).size !== entries.length) {
    fail('Archive contains duplicate entries');
  }
  const bundleName = `${pkg.name}.bundle`;
  for (const entry of ['PluginConfig.json', bundleName]) {
    if (!entries.includes(entry)) {
      fail(`Missing ${entry}`);
    }
  }
  const packed = JSON.parse(
    execFileSync('unzip', ['-p', archive, 'PluginConfig.json'], {
      encoding: 'utf8',
    }),
  );
  permissions(packed, 'Packaged manifest');
  for (const key of [
    'name',
    'desc',
    'pluginID',
    'pluginKey',
    'jsMainPath',
    'versionName',
    'versionCode',
  ]) {
    if (packed[key] !== source[key]) {
      fail(`Packaged ${key} does not match source`);
    }
  }
  if (!entries.includes(packed.iconPath.replace(/^\//, ''))) {
    fail('Packaged icon is missing');
  }
  const bundle = execFileSync('unzip', ['-p', archive, bundleName], {
    maxBuffer: 64 * 1024 * 1024,
  });
  if (
    !bundle.length ||
    !bundle.equals(
      fs.readFileSync(path.join(root, 'build', 'generated', bundleName)),
    )
  ) {
    fail('Packaged bundle differs from generated bundle');
  }
  const native =
    process.argv.includes('--native') ||
    !!source.nativeCodePackage ||
    !!source.reactPackages?.length;
  if (
    native &&
    (!entries.includes('app.npk') || packed.nativeCodePackage !== '/app.npk')
  ) {
    fail('Required native package app.npk is missing');
  }
  console.log(`Package validation passed: ${archive}`);
  console.log(
    `Version ${packed.versionName} (${packed.versionCode}); read/write declarations verified in source and archive.`,
  );
  console.log(
    `SHA256 ${createHash('sha256')
      .update(fs.readFileSync(archive))
      .digest('hex')}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

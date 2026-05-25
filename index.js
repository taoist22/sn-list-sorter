import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginManager} from 'sn-plugin-lib';
import {installPluginRouter} from './src/pluginRouter';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();
installPluginRouter();

// Lasso toolbar button — appears when strokes (0) or text boxes (3) are selected
PluginManager.registerButton(2, ['NOTE'], {
  id: 200,
  name: JSON.stringify({
    en: 'Sort List',
    zh_CN: '排序列表',
    zh_TW: '排序清單',
    ja: 'リスト並替',
  }),
  icon: Image.resolveAssetSource(require('./assets/list.png')).uri,
  showType: 1,
  editDataTypes: [3],
});

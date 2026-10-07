import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {initializePlugin} from './src/pluginRouter';
AppRegistry.registerComponent(appName, () => App);
initializePlugin(Image.resolveAssetSource(require('./assets/list.png')).uri);

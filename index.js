/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import SharePopupScreen from './src/screens/SharePopupScreen';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('SharePopup', () => SharePopupScreen);

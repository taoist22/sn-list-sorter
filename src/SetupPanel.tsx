import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {
  permissionStatus,
  requireFileReadPermission,
  requireFileWritePermission,
  errorMessage,
} from './pluginPermissions';
import {
  BUTTON_ID_LASSO,
  getStartupStatus,
  subscribeToStartup,
} from './pluginRouter';
import {versionName} from '../PluginConfig.json';
export default function SetupPanel({
  onRead,
  onClose,
}: {
  onRead: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState('Checking permissions…');
  const [startup, setStartup] = useState(getStartupStatus());
  const [button, setButton] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      setStatus(await permissionStatus());
    } catch (error) {
      setStatus(errorMessage(error));
    }
    try {
      setButton(
        `Lasso button: ${
          (await PluginManager.getButtonState(BUTTON_ID_LASSO))
            ? 'enabled'
            : 'disabled'
        }`,
      );
    } catch (error) {
      setButton(`Button state: ${errorMessage(error)}`);
    }
  }
  useEffect(() => {
    refresh();
    return subscribeToStartup(() => {
      setStartup(getStartupStatus());
      refresh();
    });
  }, []);
  async function grant() {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await requireFileReadPermission();
      await requireFileWritePermission();
      await refresh();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.center}>
      <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
        <Text style={styles.title}>ListSorter {versionName}</Text>
        <Text style={styles.text}>
          Select handwriting or text in a note, then tap Sort List in the lasso
          menu. Review or correct the recognized lines before inserting.
        </Text>
        <Text style={styles.text}>
          Chauvet 3.29.43 beta permission API · SDK 0.1.65
        </Text>
        <Text selectable style={styles.text}>
          {status}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={grant}
          style={styles.button}>
          <Text>
            {busy ? 'Waiting for permission…' : 'Allow read and write access'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onRead}
          style={styles.button}>
          <Text>Read current selection</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={refresh}
          style={styles.button}>
          <Text>Refresh status</Text>
        </Pressable>
        <Text selectable style={styles.small}>
          {startup}
          {'\n'}
          {button}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={styles.button}>
          <Text>Close</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  panel: {
    maxHeight: '90%',
    width: '92%',
    maxWidth: 520,
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: 12,
  },
  content: {padding: 24, gap: 16},
  title: {fontSize: 22, fontWeight: 'bold', color: 'black'},
  text: {fontSize: 16, color: 'black'},
  small: {fontSize: 13, color: '#333'},
  button: {padding: 14, borderWidth: 1, borderRadius: 6, alignItems: 'center'},
});

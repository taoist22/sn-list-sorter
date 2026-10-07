import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {
  BUTTON_ID_LASSO,
  consumeLastButtonEvent,
  subscribeToButtonEvents,
} from './src/pluginRouter';
import {
  cancelRecognition,
  CancelledError,
  detectLassoMode,
  formatGroup,
  insertSortedList,
  realignList,
} from './src/listOps';
import {errorMessage} from './src/pluginPermissions';
import {versionName} from './PluginConfig.json';
import SortPanel from './src/SortPanel';
import GroupPanel from './src/GroupPanel';
import SetupPanel from './src/SetupPanel';
import type {AppScreen, InsertOptions, OperationToken} from './src/types';
export default function App() {
  const [screen, setScreen] = useState<AppScreen>({kind: 'setup'});
  const [busy, setBusy] = useState(false);
  const active = useRef<OperationToken | null>(null);
  const mounted = useRef(true);
  const run = useCallback(
    async (
      kind: 'read' | 'write',
      action: (token: OperationToken) => Promise<AppScreen>,
    ) => {
      if (active.current) {
        return;
      }
      const token: OperationToken = {cancelled: false};
      active.current = token;
      setBusy(true);
      setScreen(
        kind === 'read'
          ? {kind: 'detecting'}
          : {kind: 'working', message: 'Updating list…'},
      );
      try {
        const next = await action(token);
        if (mounted.current && !token.cancelled) {
          setScreen(next);
          if (kind === 'write' && !(await PluginManager.closePluginView())) {
            throw new Error(
              'The list was updated, but the view could not close. Close it manually to inspect the note.',
            );
          }
        }
      } catch (error) {
        if (
          mounted.current &&
          !token.cancelled &&
          !(error instanceof CancelledError)
        ) {
          setScreen({kind: 'error', message: errorMessage(error)});
        }
      } finally {
        if (active.current === token) {
          active.current = null;
        }
        if (mounted.current) {
          setBusy(false);
          if (token.cancelled) {
            setScreen({kind: 'setup'});
          }
        }
      }
    },
    [],
  );
  const read = useCallback(
    () => run('read', token => detectLassoMode(token)),
    [run],
  );
  useEffect(() => {
    mounted.current = true;
    const handle = (event: {id: number}) => {
      if (active.current) {
        return;
      }
      if (event.id === BUTTON_ID_LASSO) {
        read();
      } else {
        setScreen({kind: 'setup'});
      }
    };
    const unsub = subscribeToButtonEvents(handle);
    const pending = consumeLastButtonEvent();
    if (pending) {
      handle(pending);
    }
    const life = PluginManager.registerPluginLifeListener({
      onMsg(message: {state?: number}) {
        // Do not discard UI on pause: permission dialogs may temporarily cover it.
        // A new lasso event replaces the selection; a cold mount starts at setup.
        if (
          message.state === 5 &&
          active.current &&
          !active.current.committing
        ) {
          active.current.cancelled = true;
        }
      },
    });
    return () => {
      mounted.current = false;
      if (active.current && !active.current.committing) {
        active.current.cancelled = true;
      }
      unsub();
      life.remove();
    };
  }, [read]);
  const close = () => {
    if (active.current) {
      return;
    }
    setScreen({kind: 'setup'});
    PluginManager.closePluginView().catch(error =>
      setScreen({kind: 'error', message: errorMessage(error)}),
    );
  };
  async function cancel() {
    const token = active.current;
    if (!token || token.committing) {
      return;
    }
    token.cancelled = true;
    try {
      await cancelRecognition();
    } catch (error) {
      console.error('[ListSorter]', errorMessage(error));
    }
  }
  if (screen.kind === 'setup') {
    return <SetupPanel onRead={() => read()} onClose={close} />;
  }
  if (screen.kind === 'sort') {
    const data = screen.data;
    return (
      <SortPanel
        data={data}
        busy={busy}
        onCancel={close}
        onConfirm={(options: InsertOptions, items: string[]) => {
          run('write', async token => {
            await insertSortedList({...data, items}, options, token);
            return {kind: 'setup'};
          });
        }}
      />
    );
  }
  if (screen.kind === 'group') {
    const data = screen.data;
    return (
      <GroupPanel
        data={data}
        busy={busy}
        onCancel={close}
        onRealign={() =>
          run('write', async token => {
            await realignList(data, token);
            return {kind: 'setup'};
          })
        }
        onFormat={(size, bold) =>
          run('write', async token => {
            await formatGroup(data, size, bold, token);
            return {kind: 'setup'};
          })
        }
      />
    );
  }
  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={styles.title}>ListSorter {versionName}</Text>
        {screen.kind === 'error' ? (
          <>
            <Text selectable style={styles.text}>
              {screen.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setScreen({kind: 'setup'})}
              style={styles.button}>
              <Text>Permissions and settings</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={styles.button}>
              <Text>Close</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="black" />
            <Text style={styles.text}>
              {screen.kind === 'detecting'
                ? 'Reading or recognizing selection…'
                : screen.message}
            </Text>
            {screen.kind === 'detecting' && (
              <Pressable
                accessibilityRole="button"
                onPress={cancel}
                style={styles.button}>
                <Text>Cancel</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  card: {
    width: '90%',
    maxWidth: 520,
    padding: 24,
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: 12,
    gap: 16,
  },
  title: {fontSize: 20, fontWeight: 'bold', color: 'black'},
  text: {fontSize: 16, color: 'black'},
  button: {padding: 14, borderWidth: 1, borderRadius: 6, alignItems: 'center'},
});

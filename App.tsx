import React, {useEffect, useState, useCallback} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {installPluginRouter, getLastButtonEvent, subscribeToButtonEvents} from './src/pluginRouter';
import SortPanel from './src/SortPanel';
import GroupPanel from './src/GroupPanel';
import {
  detectLassoMode,
  insertSortedList,
  realignList,
  formatGroup,
} from './src/listOps';
import type {AppScreen, InsertOptions} from './src/types';

installPluginRouter();

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({kind: 'detecting'});
  const [busy, setBusy] = useState(false);

  // Run detection whenever the lasso button fires
  const runDetect = useCallback(async () => {
    setScreen({kind: 'detecting'});
    try {
      const result = await detectLassoMode();
      if (result.kind === 'sort') {
        setScreen({kind: 'sort', data: result.data});
      } else if (result.kind === 'group') {
        setScreen({kind: 'group', data: result.data});
      } else {
        setScreen({kind: 'error', message: result.reason});
      }
    } catch (e) {
      setScreen({kind: 'error', message: e instanceof Error ? e.message : 'Detection failed'});
    }
  }, []);

  useEffect(() => {
    // Consume button that fired before this component mounted
    const pending = getLastButtonEvent();
    if (pending) runDetect();

    // Listen for buttons fired while mounted
    const unsub = subscribeToButtonEvents(() => runDetect());

    const lifeSub = PluginManager.addPluginLifeListener({
      onStart() {},
      onStop() {
        setScreen({kind: 'detecting'});
        setBusy(false);
      },
    });

    return () => {
      unsub();
      lifeSub.remove();
    };
  }, [runDetect]);

  // ── Handlers ──

  const handleConfirmSort = useCallback(
    async (options: InsertOptions) => {
      if (screen.kind !== 'sort' || busy) return;
      const data = screen.data;
      setBusy(true);
      setScreen({kind: 'working', message: 'Inserting sorted list…'});
      try {
        await insertSortedList(data, options);
        PluginManager.closePluginView();
      } catch (e) {
        setScreen({kind: 'error', message: e instanceof Error ? e.message : 'Insert failed'});
      } finally {
        setBusy(false);
      }
    },
    [screen, busy],
  );

  const handleRealign = useCallback(async () => {
    if (screen.kind !== 'group' || busy) return;
    const data = screen.data;
    setBusy(true);
    setScreen({kind: 'working', message: 'Realigning…'});
    try {
      await realignList(data);
      PluginManager.closePluginView();
    } catch (e) {
      setScreen({kind: 'error', message: e instanceof Error ? e.message : 'Realign failed'});
    } finally {
      setBusy(false);
    }
  }, [screen, busy]);

  const handleFormat = useCallback(
    async (fontSize: number, bold: boolean) => {
      if (screen.kind !== 'group' || busy) return;
      const data = screen.data;
      setBusy(true);
      setScreen({kind: 'working', message: 'Formatting group…'});
      try {
        await formatGroup(data, fontSize, bold);
        PluginManager.closePluginView();
      } catch (e) {
        setScreen({kind: 'error', message: e instanceof Error ? e.message : 'Format failed'});
      } finally {
        setBusy(false);
      }
    },
    [screen, busy],
  );

  const handleCancel = useCallback(() => {
    PluginManager.closePluginView();
  }, []);

  // ── Render ──

  if (screen.kind === 'detecting' || screen.kind === 'working') {
    const message =
      screen.kind === 'detecting' ? 'Reading selection…' : screen.message;
    return (
      <View style={styles.centered}>
        <View style={styles.busyCard}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.busyText}>{message}</Text>
        </View>
      </View>
    );
  }

  if (screen.kind === 'error') {
    return (
      <View style={styles.centered}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not process selection</Text>
          <Text style={styles.errorMessage}>{screen.message}</Text>
        </View>
      </View>
    );
  }

  if (screen.kind === 'sort') {
    return (
      <SortPanel
        data={screen.data}
        onConfirm={handleConfirmSort}
        onCancel={handleCancel}
        busy={busy}
      />
    );
  }

  if (screen.kind === 'group') {
    return (
      <GroupPanel
        data={screen.data}
        onRealign={handleRealign}
        onFormat={handleFormat}
        onCancel={handleCancel}
        busy={busy}
      />
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  busyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 240,
  },
  busyText: {fontSize: 16, color: '#555555'},
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 28,
    alignItems: 'center',
    gap: 10,
    maxWidth: 380,
  },
  errorTitle: {fontSize: 17, fontWeight: '700', color: '#CC0000'},
  errorMessage: {fontSize: 15, color: '#555555', textAlign: 'center'},
});

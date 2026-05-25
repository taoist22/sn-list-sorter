import React, {useState, useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {GroupData} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 460;
const PANEL_PADDING = 20;
const FONT_SIZES = [24, 28, 32, 36, 40];
const DEFAULT_FONT_SIZE = 32;

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  data: GroupData;
  onRealign: () => void;
  onFormat: (fontSize: number, bold: boolean) => void;
  onCancel: () => void;
  busy: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroupPanel({
  data: _data,
  onRealign,
  onFormat,
  onCancel,
  busy,
}: Props) {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [bold, setBold] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  const handleFormat = useCallback(() => {
    if (busy) return;
    onFormat(fontSize, bold);
  }, [busy, onFormat, fontSize, bold]);

  return (
    <Pressable style={styles.overlay} onPress={onCancel}>
      <Pressable style={styles.panel} onPress={e => e.stopPropagation()}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>List Group</Text>
          <Pressable
            onPress={onCancel}
            style={({pressed}) => [styles.closeBtn, pressed && styles.pressed]}>
            <Text style={styles.closeText}>{'✕'}</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />

        <View style={styles.body}>

          {/* Realign */}
          <ActionRow
            label="Realign"
            description="Snap items to same left edge, normalize spacing"
            onPress={onRealign}
            busy={busy}
          />
          <View style={styles.rowDivider} />

          {/* Format Group */}
          <Pressable
            onPress={() => setFormatOpen(o => !o)}
            style={({pressed}) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Format Group</Text>
              <Text style={styles.actionDesc}>Change font size and bold for all items</Text>
            </View>
            <Text style={styles.chevron}>{formatOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {formatOpen && (
            <View style={styles.formatExpanded}>
              {/* Font size */}
              <Text style={styles.subLabel}>FONT SIZE</Text>
              <View style={styles.chipRow}>
                {FONT_SIZES.map(sz => (
                  <Pressable
                    key={sz}
                    onPress={() => setFontSize(sz)}
                    style={({pressed}) => [
                      styles.chip,
                      fontSize === sz && styles.chipActive,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.chipText, fontSize === sz && styles.chipTextActive]}>
                      {sz}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Bold */}
              <Text style={styles.subLabel}>STYLE</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setBold(b => !b)}
                  style={({pressed}) => [
                    styles.chip,
                    styles.chipWide,
                    bold && styles.chipActive,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.chipBold, bold && styles.chipTextActive]}>Bold</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleFormat}
                disabled={busy}
                style={({pressed}) => [
                  styles.applyBtn,
                  busy && styles.applyBtnDisabled,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.applyText, busy && styles.applyTextDisabled]}>
                  {busy ? 'Applying…' : 'Apply Format'}
                </Text>
              </Pressable>
            </View>
          )}


        </View>

        {/* Cancel bar */}
        <View style={styles.divider} />
        <View style={styles.cancelBar}>
          <Pressable
            onPress={onCancel}
            style={({pressed}) => [styles.cancelBtn, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

      </Pressable>
    </Pressable>
  );
}

// ─── ActionRow ────────────────────────────────────────────────────────────────

function ActionRow({
  label,
  description,
  onPress,
  busy,
  destructive,
}: {
  label: string;
  description: string;
  onPress: () => void;
  busy: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { if (!busy) onPress(); }}
      style={({pressed}) => [styles.actionRow, pressed && styles.pressed]}>
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, destructive && styles.actionLabelDestructive]}>
          {label}
        </Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <Text style={styles.arrow}>{'›'}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: PANEL_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PANEL_PADDING,
    paddingVertical: 16,
  },
  title: {flex: 1, fontSize: 22, fontWeight: 'bold', color: '#000000'},
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: {fontSize: 16, fontWeight: 'bold', color: '#000000'},
  divider: {height: 1, backgroundColor: '#000000'},
  rowDivider: {height: 1, backgroundColor: '#E8E8E8', marginHorizontal: PANEL_PADDING},
  body: {},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PANEL_PADDING,
    paddingVertical: 16,
    gap: 12,
  },
  actionText: {flex: 1},
  actionLabel: {fontSize: 17, fontWeight: '600', color: '#000000', marginBottom: 2},
  actionLabelDestructive: {color: '#CC0000'},
  actionDesc: {fontSize: 13, color: '#888888'},
  arrow: {fontSize: 22, color: '#AAAAAA'},
  chevron: {fontSize: 14, color: '#AAAAAA'},
  formatExpanded: {
    paddingHorizontal: PANEL_PADDING,
    paddingBottom: 16,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  subLabel: {
    fontSize: 11, fontWeight: '700', color: '#888888',
    letterSpacing: 1, marginTop: 14, marginBottom: 8,
  },
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4},
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 6, borderWidth: 1.5, borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  chipWide: {flex: 1, alignItems: 'center'},
  chipActive: {borderColor: '#000000', backgroundColor: '#000000'},
  chipText: {fontSize: 15, color: '#333333'},
  chipBold: {fontSize: 15, color: '#333333', fontWeight: 'bold'},
  chipTextActive: {color: '#FFFFFF'},
  applyBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 6,
    backgroundColor: '#000000', alignItems: 'center',
  },
  applyBtnDisabled: {backgroundColor: '#CCCCCC'},
  applyText: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
  applyTextDisabled: {color: '#FFFFFF'},
  pressed: {backgroundColor: '#E8E8E8'},
  cancelBar: {
    paddingHorizontal: PANEL_PADDING,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  cancelBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 6, borderWidth: 1.5, borderColor: '#AAAAAA',
  },
  cancelText: {fontSize: 16, color: '#555555'},
});

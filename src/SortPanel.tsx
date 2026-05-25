import React, {useState, useCallback} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {LassoData, InsertOptions, SortFormat, SortAlignment} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 500;
const PANEL_PADDING = 20;
const FONT_SIZES = [24, 28, 32, 36, 40];
const DEFAULT_FONT_SIZE = 32;

const FORMAT_OPTIONS: {value: SortFormat; label: string; preview: string}[] = [
  {value: 'none',     label: 'None',     preview: 'Item'},
  {value: 'bullet',   label: 'Bullet',   preview: '• Item'},
  {value: 'checkbox', label: 'Checkbox', preview: '☐ Item'},
  {value: 'numbered', label: 'Numbered', preview: '1. Item'},
  {value: 'lettered', label: 'Lettered', preview: 'A. Item'},
];

function previewPrefix(format: SortFormat, index: number): string {
  switch (format) {
    case 'bullet':   return '• ';
    case 'checkbox': return '☐ ';
    case 'numbered': return `${index + 1}. `;
    case 'lettered': return `${String.fromCharCode(65 + index)}. `;
    default:         return '';
  }
}

const ALIGN_OPTIONS: {value: SortAlignment; label: string}[] = [
  {value: 'left',   label: 'Left'},
  {value: 'center', label: 'Center'},
  {value: 'right',  label: 'Right'},
];

const OUTPUT_OPTIONS: {value: 'single' | 'individual'; label: string}[] = [
  {value: 'single',     label: 'Single box'},
  {value: 'individual', label: 'Individual items'},
];

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  data: LassoData;
  onConfirm: (options: InsertOptions) => void;
  onCancel: () => void;
  busy: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SortPanel({data, onConfirm, onCancel, busy}: Props) {
  const [format, setFormat] = useState<SortFormat>('none');
  const [alignment, setAlignment] = useState<SortAlignment>('left');
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [bold, setBold] = useState(false);
  const [outputMode, setOutputMode] = useState<'single' | 'individual'>('single');

  const handleConfirm = useCallback(() => {
    if (busy) return;
    onConfirm({format, alignment, fontSize, bold, outputMode});
  }, [busy, onConfirm, format, alignment, fontSize, bold, outputMode]);

  const modeLabel = 'Text ready to sort';

  return (
    <Pressable style={styles.overlay} onPress={onCancel}>
      <Pressable style={styles.panel} onPress={e => e.stopPropagation()}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sort List</Text>
          <Pressable
            onPress={onCancel}
            style={({pressed}) => [styles.closeBtn, pressed && styles.pressed]}>
            <Text style={styles.closeText}>{'✕'}</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />

        {/* Mode badge */}
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>
            {modeLabel} · {data.items.length} item{data.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.divider} />

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Item preview */}
          <Text style={styles.sectionLabel}>SORTED ITEMS</Text>
          <View style={styles.previewBox}>
            {data.items.map((item, i) => (
              <Text key={i} style={styles.previewItem} numberOfLines={1}>
                {previewPrefix(format, i)}{item}
              </Text>
            ))}
          </View>

          {/* Format */}
          <Text style={styles.sectionLabel}>FORMAT</Text>
          <View style={styles.chipRow}>
            {FORMAT_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => setFormat(opt.value)}
                style={({pressed}) => [
                  styles.chip,
                  format === opt.value && styles.chipActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, format === opt.value && styles.chipTextActive]}>
                  {opt.preview}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Alignment */}
          <Text style={styles.sectionLabel}>ALIGNMENT</Text>
          <View style={styles.chipRow}>
            {ALIGN_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => setAlignment(opt.value)}
                style={({pressed}) => [
                  styles.chip,
                  styles.chipWide,
                  alignment === opt.value && styles.chipActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, alignment === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Font size */}
          <Text style={styles.sectionLabel}>FONT SIZE</Text>
          <View style={styles.chipRow}>
            {FONT_SIZES.map(sz => (
              <Pressable
                key={sz}
                onPress={() => setFontSize(sz)}
                style={({pressed}) => [
                  styles.chip,
                  styles.chipWide,
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
          <Text style={styles.sectionLabel}>STYLE</Text>
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

          {/* Output mode */}
          <Text style={styles.sectionLabel}>INSERT AS</Text>
          <View style={styles.chipRow}>
            {OUTPUT_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => setOutputMode(opt.value)}
                style={({pressed}) => [
                  styles.chip,
                  styles.chipWide,
                  outputMode === opt.value && styles.chipActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, outputMode === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.outputNote}>
            {outputMode === 'single'
              ? 'Enables native highlighting, events & tasks'
              : 'Each item moves independently — Realign available'}
          </Text>

        </ScrollView>

        {/* Action bar */}
        <View style={styles.divider} />
        <View style={styles.actionBar}>
          <Pressable
            onPress={onCancel}
            style={({pressed}) => [styles.cancelBtn, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={busy}
            style={({pressed}) => [
              styles.confirmBtn,
              busy && styles.confirmBtnDisabled,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.confirmText, busy && styles.confirmTextDisabled]}>
              {busy ? 'Inserting…' : 'Insert Sorted'}
            </Text>
          </Pressable>
        </View>

      </Pressable>
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
    maxHeight: 780,
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
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {fontSize: 16, fontWeight: 'bold', color: '#000000'},
  divider: {height: 1, backgroundColor: '#000000'},
  modeBadge: {
    paddingHorizontal: PANEL_PADDING,
    paddingVertical: 8,
    backgroundColor: '#F4F4F4',
  },
  modeText: {fontSize: 13, color: '#555555'},
  scroll: {paddingHorizontal: PANEL_PADDING},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  previewItem: {
    fontSize: 15,
    color: '#222222',
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  chipWide: {
    flex: 1,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  chipText: {fontSize: 15, color: '#333333'},
  chipBold: {fontSize: 15, color: '#333333', fontWeight: 'bold'},
  chipTextActive: {color: '#FFFFFF'},
  outputNote: {fontSize: 12, color: '#888888', marginBottom: 8, fontStyle: 'italic'},
  pressed: {backgroundColor: '#E8E8E8'},
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PANEL_PADDING,
    paddingVertical: 14,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#AAAAAA',
  },
  cancelText: {fontSize: 16, color: '#555555'},
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  confirmBtnDisabled: {backgroundColor: '#CCCCCC'},
  confirmText: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
  confirmTextDisabled: {color: '#FFFFFF'},
});

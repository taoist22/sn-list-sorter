import React, {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {planLayout} from './layout';
import {sortItems} from './sorting';
import type {InsertOptions, LassoData, SortOptions} from './types';
import {errorMessage} from './pluginPermissions';
export default function SortPanel({
  data,
  onConfirm,
  onCancel,
  busy,
}: {
  data: LassoData;
  onConfirm: (options: InsertOptions, items: string[]) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState(data.items.join('\n'));
  const [sorting, setSorting] = useState<SortOptions>({
    direction: 'ascending',
    natural: true,
    stripPrefixes: false,
    removeDuplicates: false,
  });
  const [options, setOptions] = useState<InsertOptions>({
    format: 'none',
    alignment: 'left',
    fontSize: 32,
    bold: false,
    outputMode: 'single',
    fit: false,
  });
  const items = useMemo(() => sortItems(text, sorting), [text, sorting]);
  const planned = useMemo(() => {
    try {
      return {layout: planLayout(data, items, options), error: ''};
    } catch (error) {
      return {layout: null, error: errorMessage(error)};
    }
  }, [data, items, options]);
  const scale = Math.min(240 / data.pageSize.width, 240 / data.pageSize.height);
  return (
    <View style={styles.center}>
      <View style={styles.panel}>
        <Text style={styles.title}>Sort List · {items.length} items</Text>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>
            {data.mode === 'handwriting'
              ? 'Review recognized handwriting'
              : 'Edit list'}{' '}
            — one item per line
          </Text>
          <TextInput
            accessibilityLabel="List items"
            multiline
            value={text}
            onChangeText={setText}
            style={styles.input}
            textAlignVertical="top"
          />
          <View style={styles.row}>
            {(['ascending', 'descending'] as const).map(direction => (
              <Choice
                key={direction}
                active={sorting.direction === direction}
                label={direction === 'ascending' ? 'A–Z' : 'Z–A'}
                onPress={() => setSorting({...sorting, direction})}
              />
            ))}
          </View>
          <View style={styles.row}>
            <Choice
              active={sorting.natural}
              label="Natural numbers"
              onPress={() =>
                setSorting({...sorting, natural: !sorting.natural})
              }
            />
            <Choice
              active={sorting.stripPrefixes}
              label="Remove old prefixes"
              onPress={() =>
                setSorting({...sorting, stripPrefixes: !sorting.stripPrefixes})
              }
            />
            <Choice
              active={sorting.removeDuplicates}
              label="Remove duplicates"
              onPress={() =>
                setSorting({
                  ...sorting,
                  removeDuplicates: !sorting.removeDuplicates,
                })
              }
            />
          </View>
          <Text style={styles.label}>Format</Text>
          <View style={styles.row}>
            {(
              ['none', 'bullet', 'checkbox', 'numbered', 'lettered'] as const
            ).map(format => (
              <Choice
                key={format}
                active={options.format === format}
                label={format}
                onPress={() => setOptions({...options, format})}
              />
            ))}
          </View>
          <Text style={styles.label}>Alignment</Text>
          <View style={styles.row}>
            {(['left', 'center', 'right'] as const).map(alignment => (
              <Choice
                key={alignment}
                active={options.alignment === alignment}
                label={alignment}
                onPress={() => setOptions({...options, alignment})}
              />
            ))}
          </View>
          <Text style={styles.label}>Font size</Text>
          <View style={styles.row}>
            {[16, 20, 24, 28, 32, 36, 40].map(fontSize => (
              <Choice
                key={fontSize}
                active={options.fontSize === fontSize}
                label={String(fontSize)}
                onPress={() => setOptions({...options, fontSize})}
              />
            ))}
          </View>
          <View style={styles.row}>
            <Choice
              active={options.bold}
              label="Bold"
              onPress={() => setOptions({...options, bold: !options.bold})}
            />
            <Choice
              active={options.fit}
              label="Fit to space (min 16)"
              onPress={() => setOptions({...options, fit: !options.fit})}
            />
          </View>
          <Text style={styles.label}>Insert as</Text>
          <View style={styles.row}>
            {(['single', 'individual'] as const).map(outputMode => (
              <Choice
                key={outputMode}
                active={options.outputMode === outputMode}
                label={
                  outputMode === 'single' ? 'Single box' : 'Individual items'
                }
                onPress={() => setOptions({...options, outputMode})}
              />
            ))}
          </View>
          {planned.layout ? (
            <>
              <Text style={styles.label}>
                Layout preview · {planned.layout.fontSize} px ·{' '}
                {planned.layout.boxes.length} boxes
              </Text>
              <Text style={styles.note}>
                The outlined region is your original selection. Spacing is
                estimated; review the inserted text on the device.
              </Text>
              <View
                style={[
                  styles.page,
                  {
                    width: data.pageSize.width * scale,
                    height: data.pageSize.height * scale,
                  },
                ]}>
                <View
                  style={[
                    styles.selection,
                    {
                      left: data.lassoRect.left * scale,
                      top: data.lassoRect.top * scale,
                      width:
                        (data.lassoRect.right - data.lassoRect.left) * scale,
                      height:
                        (data.lassoRect.bottom - data.lassoRect.top) * scale,
                    },
                  ]}
                />
                {planned.layout.boxes.map((box, index) => (
                  <View
                    key={index}
                    style={[
                      styles.output,
                      {
                        left: box.rect.left * scale,
                        top: box.rect.top * scale,
                        width: (box.rect.right - box.rect.left) * scale,
                        height: (box.rect.bottom - box.rect.top) * scale,
                      },
                    ]}
                  />
                ))}
              </View>
              {planned.layout.boxes.map((box, index) => (
                <Text
                  key={index}
                  style={[
                    styles.preview,
                    {textAlign: options.alignment},
                    options.bold && styles.bold,
                  ]}>
                  {box.text}
                </Text>
              ))}
            </>
          ) : (
            <Text accessibilityRole="alert" style={styles.note}>
              {planned.error}
            </Text>
          )}
          <Text style={styles.note}>
            Your original selection stays on the page.
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            disabled={busy}
            style={styles.button}>
            <Text>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onConfirm(options, items)}
            disabled={busy || !planned.layout}
            style={[
              styles.button,
              (!planned.layout || busy) && styles.disabled,
            ]}>
            <Text>Insert sorted list</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
export function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={[styles.button, active && styles.active]}>
      <Text style={active ? styles.white : styles.black}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  panel: {
    maxHeight: '94%',
    width: '94%',
    maxWidth: 560,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  title: {fontSize: 22, fontWeight: 'bold', padding: 18, color: 'black'},
  body: {padding: 18, gap: 12},
  label: {fontSize: 16, fontWeight: 'bold', color: 'black'},
  input: {
    borderWidth: 1,
    padding: 12,
    minHeight: 130,
    maxHeight: 220,
    fontSize: 17,
    color: 'black',
  },
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  button: {padding: 12, borderWidth: 1, borderRadius: 6},
  bold: {fontWeight: 'bold'},
  active: {backgroundColor: 'black'},
  white: {color: 'white'},
  black: {color: 'black'},
  disabled: {opacity: 0.4},
  footer: {flexDirection: 'row', gap: 14, padding: 16, borderTopWidth: 1},
  note: {fontSize: 14, color: '#333'},
  preview: {fontSize: 16, color: 'black', borderWidth: 1, padding: 12},
  page: {borderWidth: 1, alignSelf: 'center'},
  selection: {position: 'absolute', borderWidth: 1, borderStyle: 'dashed'},
  output: {position: 'absolute', backgroundColor: '#888'},
});

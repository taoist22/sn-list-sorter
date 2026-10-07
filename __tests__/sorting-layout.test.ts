import {formatPrefix, sortItems} from '../src/sorting';
import {planLayout, validateRect, wrapText} from '../src/layout';
import type {InsertOptions, LassoData, SortOptions} from '../src/types';
const sort: SortOptions = {
  direction: 'ascending',
  natural: true,
  stripPrefixes: false,
  removeDuplicates: false,
};
const data: LassoData = {
  filePath: '/Note/list.note',
  pageNum: 0,
  pageSize: {width: 1404, height: 1872},
  mode: 'typed',
  items: [],
  lassoRect: {left: 40, top: 40, right: 400, bottom: 400},
};
const options: InsertOptions = {
  format: 'none',
  alignment: 'left',
  fontSize: 32,
  bold: false,
  fit: false,
  outputMode: 'individual',
};
test.each([
  [0, 'A. '],
  [25, 'Z. '],
  [26, 'AA. '],
  [51, 'AZ. '],
  [52, 'BA. '],
  [701, 'ZZ. '],
  [702, 'AAA. '],
])('letter %i is %s', (index, label) => {
  expect(formatPrefix('lettered', Number(index))).toBe(label);
});
test('natural sorting preserves duplicates by default and supports reverse order', () => {
  expect(sortItems('Item 10\nItem 2\nItem 2', sort)).toEqual([
    'Item 2',
    'Item 2',
    'Item 10',
  ]);
  expect(
    sortItems('Item 10\nItem 2', {...sort, direction: 'descending'}),
  ).toEqual(['Item 10', 'Item 2']);
});
test('prefix removal and duplicate removal require explicit selection', () => {
  expect(
    sortItems('1. Pear\n2. Apple\n• Apple', {
      ...sort,
      stripPrefixes: true,
      removeDuplicates: true,
    }),
  ).toEqual(['Apple', 'Pear']);
  expect(sortItems('1. Pear', sort)).toEqual(['1. Pear']);
});
test.each(['single', 'individual'] as const)(
  'long words are wrapped within %s boxes',
  outputMode => {
    const plan = planLayout(data, ['W'.repeat(180), 'Apple'], {
      ...options,
      outputMode,
    });
    expect(plan.boxes[0].text).toContain('\n');
    plan.boxes.forEach(box =>
      expect(() => validateRect(box.rect, data.pageSize)).not.toThrow(),
    );
    expect(
      new Set(plan.boxes.map(box => box.rect.right - box.rect.left)).size,
    ).toBe(1);
  },
);
test('overflow returns a smaller font only when fit is enabled', () => {
  const items = Array(25).fill('A');
  expect(() => planLayout(data, items, options)).toThrow('does not fit');
  const fit = planLayout(data, items, {...options, fit: true});
  expect(fit.fontSize).toBeLessThan(32);
  expect(fit.fontSize).toBeGreaterThanOrEqual(16);
});
test('impossibly large lists are rejected before insertion', () => {
  expect(() =>
    planLayout(data, Array(500).fill('A'), {...options, fit: true}),
  ).toThrow('cannot fit');
});
test('wrapping preserves Unicode codepoints and existing line breaks', () => {
  const text = '🙂'.repeat(20);
  expect(wrapText(text, 150, 32).replace(/\n/g, '')).toBe(text);
  expect(wrapText('A\nB', 150, 32)).toBe('A\nB');
});
test('layout uses alternate space without overlapping original selection', () => {
  const bottom = {
    ...data,
    lassoRect: {left: 40, top: 1600, right: 400, bottom: 1800},
  };
  const plan = planLayout(bottom, ['Apple'], options);
  const box = plan.boxes[0].rect;
  expect(
    box.left >= bottom.lassoRect.right || box.bottom <= bottom.lassoRect.top,
  ).toBe(true);
});

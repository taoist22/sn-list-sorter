import type {SortFormat, SortOptions} from './types';
export function formatPrefix(format: SortFormat, index: number): string {
  if (format === 'bullet') {
    return '• ';
  }
  if (format === 'checkbox') {
    return '☐ ';
  }
  if (format === 'numbered') {
    return `${index + 1}. `;
  }
  if (format !== 'lettered') {
    return '';
  }
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value--;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return `${label}. `;
}
export function sortItems(text: string, options: SortOptions): string[] {
  let items = text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
  if (options.stripPrefixes) {
    items = items
      .map(s =>
        s
          .replace(/^(?:[-*•☐☑✓]|\[[ xX]\]|\d+[.)]|[A-Za-z]+[.)])\s+/, '')
          .trim(),
      )
      .filter(Boolean);
  }
  if (options.removeDuplicates) {
    items = [...new Set(items)];
  }
  const compare = new Intl.Collator(undefined, {
    numeric: options.natural,
    sensitivity: 'base',
  }).compare;
  return items.sort((a, b) =>
    options.direction === 'descending' ? compare(b, a) : compare(a, b),
  );
}

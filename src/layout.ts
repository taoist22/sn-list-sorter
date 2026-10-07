import type {InsertOptions, LassoData, Rect, Size} from './types';
import {formatPrefix} from './sorting';
export const MARGIN = 40;
export const GAP = 20;
export type BoxLayout = {text: string; rect: Rect};
export type ListLayout = {
  boxes: BoxLayout[];
  fontSize: number;
  width: number;
  height: number;
};

export function validateRect(rect: Rect, size: Size): void {
  if (
    ![
      rect.left,
      rect.top,
      rect.right,
      rect.bottom,
      size.width,
      size.height,
    ].every(Number.isFinite) ||
    rect.left < MARGIN ||
    rect.top < MARGIN ||
    rect.right > size.width - MARGIN ||
    rect.bottom > size.height - MARGIN ||
    rect.right <= rect.left ||
    rect.bottom <= rect.top
  ) {
    throw new Error(
      'The list does not fit inside the page margins. Use smaller text or fewer items.',
    );
  }
}
// Deliberately conservative width budget: one em per code point plus padding.
// Explicit line breaks bound output; native font rendering still needs device QA.
export function wrapText(
  text: string,
  width: number,
  fontSize: number,
): string {
  const capacity = Math.floor((width - 32) / (fontSize * 1.1));
  if (capacity < 2) {
    throw new Error('Not enough horizontal space for text.');
  }
  return text
    .split('\n')
    .flatMap(line => {
      const chars = Array.from(line);
      const lines: string[] = [];
      while (chars.length > capacity) {
        const segment = chars.slice(0, capacity + 1).join('');
        const space = segment.lastIndexOf(' ');
        const count = space > capacity / 2 ? space : capacity;
        lines.push(chars.splice(0, count).join(''));
        if (chars[0] === ' ') {
          chars.shift();
        }
      }
      lines.push(chars.join(''));
      return lines;
    })
    .join('\n');
}
export function textHeight(text: string, fontSize: number): number {
  return text.split('\n').length * Math.ceil(fontSize * 1.6) + 24;
}
export function planLayout(
  data: LassoData,
  items: string[],
  options: InsertOptions,
): ListLayout {
  if (!items.length) {
    throw new Error('Enter at least one list item.');
  }
  if (
    !Number.isFinite(options.fontSize) ||
    options.fontSize < 16 ||
    options.fontSize > 72
  ) {
    throw new Error('Choose a font size between 16 and 72.');
  }
  const {width, height} = data.pageSize;
  const r = data.lassoRect;
  const regions: Rect[] = [
    {
      left: MARGIN,
      top: Math.max(MARGIN, r.bottom + GAP),
      right: width - MARGIN,
      bottom: height - MARGIN,
    },
    {
      left: Math.max(MARGIN, r.right + GAP),
      top: MARGIN,
      right: width - MARGIN,
      bottom: height - MARGIN,
    },
    {
      left: MARGIN,
      top: MARGIN,
      right: width - MARGIN,
      bottom: Math.min(height - MARGIN, r.top - GAP),
    },
    {
      left: MARGIN,
      top: MARGIN,
      right: Math.min(width - MARGIN, r.left - GAP),
      bottom: height - MARGIN,
    },
  ];
  const sizes = options.fit
    ? Array.from(
        {length: options.fontSize - 15},
        (_, i) => options.fontSize - i,
      )
    : [options.fontSize];
  for (const fontSize of sizes) {
    for (const region of regions) {
      if (
        region.right - region.left < fontSize * 3 + 32 ||
        region.bottom <= region.top
      ) {
        continue;
      }
      const text = items.map((item, i) =>
        wrapText(
          formatPrefix(options.format, i) + item,
          region.right - region.left,
          fontSize,
        ),
      );
      const contents =
        options.outputMode === 'single' ? [text.join('\n')] : text;
      let top = region.top;
      const boxes = contents.map(content => {
        const rect = {
          left: region.left,
          top,
          right: region.right,
          bottom: top + textHeight(content, fontSize),
        };
        top = rect.bottom + GAP;
        return {text: content, rect};
      });
      if (boxes[boxes.length - 1].rect.bottom > region.bottom) {
        continue;
      }
      boxes.forEach(box => validateRect(box.rect, data.pageSize));
      return {boxes, fontSize, width, height};
    }
  }
  throw new Error(
    options.fit
      ? 'This list cannot fit beside the selection even at 16 px. Shorten the list or select fewer items.'
      : 'This list does not fit beside the selection. Enable Fit to space, reduce the font size, or use fewer items.',
  );
}

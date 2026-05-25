import {PluginCommAPI, PluginFileAPI, PluginNoteAPI} from 'sn-plugin-lib';
import type {LassoData, GroupData, InsertOptions, SortFormat, SortAlignment} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const V_GAP = 20;
const INSERT_GAP = 140; // px to the right of original lasso for sorted output

// The SDK types return `Object` — use this alias for casting
type Res<T> = {success: boolean; result?: T; error?: {message?: string}} | null | undefined;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Rect = {left: number; top: number; right: number; bottom: number};

function boxHeight(fontSize: number): number {
  return Math.ceil(fontSize * 1.4);
}

function stride(fontSize: number): number {
  return boxHeight(fontSize) + V_GAP;
}

function alignValue(a: SortAlignment): number {
  return a === 'left' ? 0 : a === 'center' ? 1 : 2;
}

function formatPrefix(format: SortFormat, index: number): string {
  switch (format) {
    case 'bullet':   return '• ';
    case 'checkbox': return '☐ ';
    case 'numbered': return `${index + 1}. `;
    case 'lettered': return `${String.fromCharCode(65 + index)}. `;
    default:         return '';
  }
}

function generateGroupId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseGroupId(userData: string | null | undefined): string | null {
  if (!userData) return null;
  try {
    const d = JSON.parse(userData);
    return typeof d?.gid === 'string' ? d.gid : null;
  } catch {
    return null;
  }
}

function parseFontSize(userData: string | null | undefined): number | null {
  if (!userData) return null;
  try {
    const d = JSON.parse(userData);
    return typeof d?.fs === 'number' ? d.fs : null;
  } catch {
    return null;
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function getContext(): Promise<{filePath: string; pageNum: number}> {
  const pathRes = (await PluginCommAPI.getCurrentFilePath()) as Res<string>;
  const pageRes = (await PluginCommAPI.getCurrentPageNum()) as Res<number>;
  if (!pathRes?.success || !pathRes.result) throw new Error('Cannot read file path');
  if (!pageRes?.success || pageRes.result == null) throw new Error('Cannot read page number');
  return {filePath: pathRes.result, pageNum: pageRes.result};
}

async function getAllPageElements(pageNum: number, filePath: string): Promise<any[]> {
  const res = (await (PluginFileAPI as any).getElements(pageNum, filePath)) as Res<any[]>;
  return res?.result ?? [];
}

// ─── Mode Detection ───────────────────────────────────────────────────────────

export type DetectResult =
  | {kind: 'sort'; data: LassoData}
  | {kind: 'group'; data: GroupData}
  | {kind: 'unknown'; reason: string};

export async function detectLassoMode(): Promise<DetectResult> {
  const rectRes = (await PluginCommAPI.getLassoRect() as unknown) as Res<Rect>;

  if (!rectRes?.success || !rectRes.result) {
    return {kind: 'unknown', reason: 'Could not read lasso bounds'};
  }

  const lassoRect = rectRes.result;
  const ctx = await getContext();

  // ── Group detection via direct file scan ──────────────────────────────────
  const allEls = await getAllPageElements(ctx.pageNum, ctx.filePath);
  for (const el of allEls) {
    const gid = parseGroupId(el?.userData);
    if (!gid) continue;
    const r: Rect | undefined = el?.textBox?.textRect;
    if (!r) continue;
    const safeR: Rect = {...r, right: Math.min(r.right, r.left + 800)};
    if (rectsOverlap(safeR, lassoRect)) {
      return {kind: 'group', data: {groupId: gid, ...ctx}};
    }
  }

  // ── Sort mode: read text boxes (includes device-recognized handwriting) ───
  const textRes = (await PluginNoteAPI.getLassoText()) as Res<any[]>;
  if (!textRes?.success) {
    return {kind: 'unknown', reason: 'Cannot read text boxes'};
  }

  const items = (textRes.result ?? [])
    .flatMap((tb: any) =>
      ((tb.textContentFull as string) ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean)
    )
    .sort((a: string, b: string) => a.localeCompare(b));

  if (items.length === 0) {
    return {kind: 'unknown', reason: 'No text found — use Recognize as Text first'};
  }
  return {kind: 'sort', data: {mode: 'typed', items, lassoRect}};
}

// ─── Insert Sorted List ───────────────────────────────────────────────────────

export async function insertSortedList(
  data: LassoData,
  options: InsertOptions,
): Promise<void> {
  const {items, lassoRect} = data;
  const {format, alignment, fontSize, bold, outputMode} = options;
  const bh = boxHeight(fontSize);
  const st = stride(fontSize);

  const ctx = await getContext();

  // Get page size to determine insert position
  const sizeRes = (await (PluginFileAPI as any).getPageSize(ctx.filePath, ctx.pageNum)) as Res<{width: number; height: number}>;
  const pageWidth  = sizeRes?.result?.width  ?? 1404;
  const pageHeight = sizeRes?.result?.height ?? 1872;
  const pageMargin = 40;

  // Insert below by default; fall back to right if near page bottom
  const totalListHeight = (items.length - 1) * st + bh;
  let insertLeft = lassoRect.left;
  let insertTop  = lassoRect.bottom + INSERT_GAP;

  if (insertTop + totalListHeight > pageHeight - pageMargin) {
    const proposedLeft = lassoRect.right + INSERT_GAP;
    if (proposedLeft + 200 <= pageWidth - pageMargin) {
      insertLeft = proposedLeft;
      insertTop  = lassoRect.top;
    }
  }

  insertTop = Math.min(insertTop, pageHeight - pageMargin - totalListHeight);
  insertTop = Math.max(insertTop, pageMargin);

  const charRatio = bold ? 0.70 : 0.60;
  const longestLen = Math.max(...items.map((item, i) => (formatPrefix(format, i) + item).length));
  const estimatedWidth = Math.max(150, Math.round(longestLen * fontSize * charRatio) + 40);

  // Save before file-level operations to avoid cache/file inconsistency
  await PluginNoteAPI.saveCurrentNote();

  const groupId = generateGroupId();

  if (outputMode === 'single') {
    const elRes = (await PluginCommAPI.createElement(500)) as Res<any>;
    if (!elRes?.success || !elRes.result) throw new Error('createElement failed');
    const el = elRes.result;

    el.userData = JSON.stringify({gid: groupId, idx: 0, fs: fontSize, lc: items.length});

    const text = items.map((item, i) => formatPrefix(format, i) + item).join('\n');
    const totalHeight = (items.length - 1) * st + bh;

    if (el.textBox) {
      el.textBox.textContentFull    = text;
      el.textBox.textRect           = {left: insertLeft, top: insertTop, right: insertLeft + estimatedWidth, bottom: insertTop + totalHeight};
      el.textBox.fontSize           = fontSize;
      el.textBox.textBold           = bold ? 1 : 0;
      el.textBox.textItalics        = 0;
      el.textBox.textAlign          = alignValue(alignment);
      el.textBox.textFrameWidthType = 1;
      el.textBox.textFrameStyle     = 0;
      el.textBox.textEditable       = 1;
    }

    await (PluginFileAPI as any).insertElements(ctx.filePath, ctx.pageNum, [el]);
  } else {
    const elements: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const elRes = (await PluginCommAPI.createElement(500)) as Res<any>;
      if (!elRes?.success || !elRes.result) throw new Error('createElement failed');
      const el = elRes.result;

      el.userData = JSON.stringify({gid: groupId, idx: i, fs: fontSize});

      const text = formatPrefix(format, i) + items[i];
      const top  = insertTop + i * st;
      const itemWidth = Math.max(150, Math.round(text.length * fontSize * charRatio) + 40);

      if (el.textBox) {
        el.textBox.textContentFull    = text;
        el.textBox.textRect           = {left: insertLeft, top, right: insertLeft + itemWidth, bottom: top + bh};
        el.textBox.fontSize           = fontSize;
        el.textBox.textBold           = bold ? 1 : 0;
        el.textBox.textItalics        = 0;
        el.textBox.textAlign          = alignValue(alignment);
        el.textBox.textFrameWidthType = 1;
        el.textBox.textFrameStyle     = 0;
        el.textBox.textEditable       = 1;
      }

      elements.push(el);
    }

    await (PluginFileAPI as any).insertElements(ctx.filePath, ctx.pageNum, elements);
  }

  await PluginCommAPI.reloadFile();
}

// ─── Group: Realign ───────────────────────────────────────────────────────────

export async function realignList(groupData: GroupData): Promise<void> {
  const {groupId, filePath, pageNum} = groupData;
  const elements = await getGroupElements(groupId, filePath, pageNum);
  if (elements.length === 0) throw new Error('No group elements found');

  elements.sort(
    (a: any, b: any) => (a.textBox?.textRect?.top ?? 0) - (b.textBox?.textRect?.top ?? 0),
  );

  const rects = elements.map((el: any) => el.textBox?.textRect as Rect);
  const anchorLeft = Math.min(...rects.map(r => r.left));
  const anchorTop  = rects[0].top;

  const inferredFontSize = parseFontSize((elements[0] as any).userData) ?? 32;
  const bh = boxHeight(inferredFontSize);
  const st = stride(inferredFontSize);

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as any;
    const top = anchorTop + i * st;
    const lc = elements.length === 1
      ? ((el.textBox?.textContentFull as string) ?? '').split('\n').filter(Boolean).length
      : 1;
    el.textBox.textRect = {
      left:   anchorLeft,
      top,
      right:  anchorLeft + 600,
      bottom: top + (lc > 1 ? (lc - 1) * st + bh : bh),
    };
  }

  await (PluginFileAPI as any).modifyElements(filePath, pageNum, elements);
  await PluginCommAPI.reloadFile();
}

// ─── Group: Format ────────────────────────────────────────────────────────────

export async function formatGroup(
  groupData: GroupData,
  fontSize: number,
  bold: boolean,
): Promise<void> {
  const {groupId, filePath, pageNum} = groupData;
  const elements = await getGroupElements(groupId, filePath, pageNum);
  if (elements.length === 0) throw new Error('No group elements found');

  elements.sort(
    (a: any, b: any) => (a.textBox?.textRect?.top ?? 0) - (b.textBox?.textRect?.top ?? 0),
  );

  const anchorLeft = Math.min(...elements.map((el: any) => el.textBox?.textRect?.left ?? 0));
  let anchorTop    = (elements[0] as any).textBox?.textRect?.top ?? 0;
  const bh = boxHeight(fontSize);
  const st = stride(fontSize);

  const sizeRes = (await (PluginFileAPI as any).getPageSize(filePath, pageNum)) as Res<{width: number; height: number}>;
  const pageHeight = sizeRes?.result?.height ?? 1872;
  const lineCount = elements.length === 1
    ? ((elements[0] as any).textBox?.textContentFull as string ?? '').split('\n').filter(Boolean).length
    : elements.length;
  const totalListHeight = (lineCount - 1) * st + bh;
  anchorTop = Math.min(anchorTop, pageHeight - 40 - totalListHeight);
  anchorTop = Math.max(anchorTop, 40);

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as any;
    el.userData = JSON.stringify({gid: groupId, idx: i, fs: fontSize});
    el.textBox.fontSize = fontSize;
    el.textBox.textBold = bold ? 1 : 0;
    const top = anchorTop + i * st;
    const elLc = elements.length === 1 ? lineCount : 1;
    el.textBox.textRect = {
      left:   anchorLeft,
      top,
      right:  anchorLeft + 600,
      bottom: top + (elLc > 1 ? (elLc - 1) * st + bh : bh),
    };
  }

  await (PluginFileAPI as any).modifyElements(filePath, pageNum, elements);
  await PluginCommAPI.reloadFile();
}

// ─── Internal: find all elements in a group ───────────────────────────────────

async function getGroupElements(
  groupId: string,
  filePath: string,
  pageNum: number,
): Promise<any[]> {
  await PluginNoteAPI.saveCurrentNote();
  const all = await getAllPageElements(pageNum, filePath);
  return all.filter(
    (el: any) => el?.textBox != null && parseGroupId(el.userData) === groupId,
  );
}

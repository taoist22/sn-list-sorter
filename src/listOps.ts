import {PluginCommAPI, PluginFileAPI, PluginNoteAPI} from 'sn-plugin-lib';
import type {Element} from 'sn-plugin-lib';
import {
  errorMessage,
  requireFileReadPermission,
  requireFileWritePermission,
} from './pluginPermissions';
import {GAP, planLayout, textHeight, validateRect, wrapText} from './layout';
import type {
  GroupData,
  InsertOptions,
  LassoData,
  NoteContext,
  OperationToken,
  Rect,
  Size,
} from './types';

type Response<T> = {
  success: boolean;
  result?: T;
  error?: {code?: number; message?: string};
};
type Metadata = {
  owner: 'ListSorter';
  schema: 1;
  gid: string;
  idx: number;
  fs: number;
};
let active = false;
let recognizing = false;
export class CancelledError extends Error {
  constructor() {
    super('Operation cancelled.');
  }
}
function check(token?: OperationToken) {
  if (token?.cancelled) {
    throw new CancelledError();
  }
}
function confirmed(response: unknown, operation: string): void {
  if (result<unknown>(response, operation) !== true) {
    throw new Error(`${operation}: The device returned an unexpected result`);
  }
}
function result<T>(response: unknown, operation: string): T {
  const res = response as Response<T> | null;
  if (!res?.success || res.result == null || res.result === false) {
    throw new Error(
      `${operation}: ${
        res?.error
          ? errorMessage(res.error)
          : 'The device did not confirm success'
      }`,
    );
  }
  return res.result;
}
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (active) {
    throw new Error(
      'Another list operation is still finishing. Please retry when it completes.',
    );
  }
  active = true;
  try {
    return await fn();
  } finally {
    active = false;
  }
}
function unique(elements: Element[]): Element[] {
  const seen = new Set<string>();
  return elements.filter(el => {
    if (!el.uuid || seen.has(el.uuid)) {
      return false;
    }
    seen.add(el.uuid);
    return true;
  });
}
function release(elements: Element[]) {
  for (const el of unique(elements)) {
    try {
      PluginCommAPI.recycleElement(el.uuid);
    } catch (error) {
      console.error('[ListSorter] recycle', errorMessage(error));
    }
  }
}
function metadata(el: Element): Metadata | null {
  if (el.type !== 500 || !el.textBox || !el.userData) {
    return null;
  }
  try {
    const m = JSON.parse(el.userData);
    if (
      typeof m.gid !== 'string' ||
      !Number.isInteger(m.idx) ||
      m.idx < 0 ||
      !Number.isFinite(m.fs) ||
      m.fs < 1
    ) {
      return null;
    }
    if (m.owner === 'ListSorter' && m.schema === 1) {
      return m;
    }
    // Migrate the exact shape written by 1.0.x; arbitrary `gid` is not enough.
    if (
      Object.keys(m).every(k => ['gid', 'idx', 'fs', 'lc'].includes(k)) &&
      /^[a-z0-9]{1,8}$/.test(m.gid)
    ) {
      return {...m, owner: 'ListSorter', schema: 1};
    }
  } catch {
    /* Ordinary text may have unrelated userData. */
  }
  return null;
}
async function context(): Promise<NoteContext> {
  const filePath = result<string>(
    await PluginCommAPI.getCurrentFilePath(),
    'Read current file',
  );
  const pageNum = result<number>(
    await PluginCommAPI.getCurrentPageNum(),
    'Read current page',
  );
  if (
    !filePath.toLowerCase().endsWith('.note') ||
    !Number.isInteger(pageNum) ||
    pageNum < 0
  ) {
    throw new Error('Open a Supernote note before using ListSorter.');
  }
  return {filePath, pageNum};
}
async function assertContext(expected: NoteContext, token?: OperationToken) {
  check(token);
  const current = await context();
  check(token);
  if (
    current.filePath !== expected.filePath ||
    current.pageNum !== expected.pageNum
  ) {
    throw new Error(
      'The current note or page changed. Reselect the list on its original page.',
    );
  }
}
async function pageSize(ctx: NoteContext): Promise<Size> {
  const size = result<Size>(
    await PluginFileAPI.getPageSize(ctx.filePath, ctx.pageNum),
    'Read page size',
  );
  if (![size.width, size.height].every(n => Number.isFinite(n) && n > 80)) {
    throw new Error('The device returned an invalid page size.');
  }
  return size;
}
async function groupElements(
  group: NoteContext & {groupId: string},
  token?: OperationToken,
): Promise<Element[]> {
  await assertContext(group, token);
  confirmed(await PluginNoteAPI.saveCurrentNote(), 'Save current note');
  await assertContext(group, token);
  return result<Element[]>(
    await PluginFileAPI.getElements(group.pageNum, group.filePath),
    'Read list group',
  );
}
function groupSummary(
  groupId: string,
  ctx: NoteContext,
  elements: Element[],
): GroupData {
  const sizes = new Set(elements.map(el => el.textBox!.fontSize));
  const weights = new Set(elements.map(el => el.textBox!.textBold === 1));
  return {
    groupId,
    ...ctx,
    count: elements.length,
    fontSize: sizes.size === 1 ? [...sizes][0] : null,
    bold: weights.size === 1 ? [...weights][0] : null,
  };
}
export type DetectResult =
  | {kind: 'sort'; data: LassoData}
  | {kind: 'group'; data: GroupData};
export async function detectLassoMode(
  token?: OperationToken,
): Promise<DetectResult> {
  return exclusive(async () => {
    await requireFileReadPermission();
    check(token);
    const ctx = await context();
    const size = await pageSize(ctx);
    check(token);
    const rect = result<Rect>(
      await PluginCommAPI.getLassoRect(),
      'Read selection bounds',
    );
    if (
      ![rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite) ||
      rect.right <= rect.left ||
      rect.bottom <= rect.top
    ) {
      throw new Error(
        'Select handwriting or text in the note, then open Sort List.',
      );
    }
    const selected = result<Element[]>(
      await PluginCommAPI.getLassoElements(),
      'Read selected elements',
    );
    let groupId: string | undefined;
    try {
      check(token);
      const elements = unique(selected);
      if (!elements.length) {
        throw new Error('Select handwriting or text first.');
      }
      const groups = new Set(
        elements
          .map(el => metadata(el)?.gid)
          .filter((id): id is string => !!id),
      );
      if (groups.size) {
        if (groups.size > 1 || elements.some(el => !metadata(el))) {
          throw new Error(
            'Select items from one list group without other objects.',
          );
        }
        groupId = [...groups][0];
      } else {
        if (elements.some(el => ![100, 500, 501, 502].includes(el.type))) {
          throw new Error(
            'Select only handwriting and text. Images, links, and shapes cannot be sorted.',
          );
        }
        const ink = elements.some(el => el.type === 100);
        let text: string;
        if (ink) {
          recognizing = true;
          try {
            text = result<string>(
              await PluginCommAPI.recognizeElements(elements, size),
              'Recognize handwriting',
            );
          } finally {
            recognizing = false;
          }
        } else {
          text = elements
            .map(el => el.textBox?.textContentFull ?? '')
            .join('\n');
        }
        await assertContext(ctx, token);
        const items = text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);
        if (!items.length) {
          throw new Error(
            'No text was recognized. Try a clearer selection or use Recognize as Text on the device.',
          );
        }
        return {
          kind: 'sort',
          data: {
            ...ctx,
            mode: ink ? 'handwriting' : 'typed',
            items,
            lassoRect: rect,
            pageSize: size,
          },
        };
      }
    } finally {
      release(selected);
    }
    // A page scan is reserved for an identified list group, never ordinary sorting.
    await requireFileWritePermission();
    check(token);
    const all = await groupElements({...ctx, groupId: groupId!}, token);
    try {
      const members = unique(all).filter(el => metadata(el)?.gid === groupId);
      if (!members.length) {
        throw new Error(
          'This list group is no longer on the page. Reselect it.',
        );
      }
      check(token);
      return {kind: 'group', data: groupSummary(groupId!, ctx, members)};
    } finally {
      release(all);
    }
  });
}
export async function cancelRecognition(): Promise<void> {
  if (recognizing) {
    confirmed(await PluginCommAPI.cancelRecognize(), 'Cancel recognition');
  }
}
async function commit(
  ctx: NoteContext,
  elements: Element[],
  inserting: boolean,
  token?: OperationToken,
) {
  await assertContext(ctx, token);
  if (token) {
    token.committing = true;
  }
  try {
    if (inserting) {
      confirmed(
        await PluginFileAPI.insertElements(ctx.filePath, ctx.pageNum, elements),
        'Insert list',
      );
    } else {
      const changed = result<number[]>(
        await PluginFileAPI.modifyElements(ctx.filePath, ctx.pageNum, elements),
        'Update list',
      );
      const expected = new Set(elements.map(el => el.numInPage));
      if (
        !Array.isArray(changed) ||
        changed.length !== expected.size ||
        new Set(changed).size !== expected.size ||
        changed.some(num => !expected.has(num))
      ) {
        throw new Error(
          'The device updated only part of the list. Inspect the note before trying again.',
        );
      }
    }
    // The write may already have succeeded: never automatically repeat it.
    await assertContext(ctx);
    confirmed(await PluginCommAPI.reloadFile(), 'Reload updated note');
  } catch (error) {
    throw new Error(
      `${errorMessage(
        error,
      )} The note may already have changed; inspect it before retrying.`,
    );
  } finally {
    if (token) {
      token.committing = false;
    }
  }
}
export async function insertSortedList(
  data: LassoData,
  options: InsertOptions,
  token?: OperationToken,
): Promise<void> {
  return exclusive(async () => {
    await requireFileReadPermission();
    await requireFileWritePermission();
    await assertContext(data, token);
    const size = await pageSize(data);
    const layout = planLayout({...data, pageSize: size}, data.items, options);
    await assertContext(data, token);
    confirmed(await PluginNoteAPI.saveCurrentNote(), 'Save current note');
    const elements: Element[] = [];
    const gid = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}`;
    try {
      for (const [idx, box] of layout.boxes.entries()) {
        check(token);
        const el = result<Element>(
          await PluginCommAPI.createElement(500),
          'Create text element',
        );
        elements.push(el);
        if (!el.textBox || !el.uuid) {
          throw new Error('The device did not create a usable text element.');
        }
        el.pageNum = data.pageNum;
        el.layerNum = 0;
        el.userData = JSON.stringify({
          owner: 'ListSorter',
          schema: 1,
          gid,
          idx,
          fs: layout.fontSize,
        });
        Object.assign(el.textBox, {
          textContentFull: box.text,
          textRect: box.rect,
          fontSize: layout.fontSize,
          textBold: options.bold ? 1 : 0,
          textAlign:
            options.alignment === 'left'
              ? 0
              : options.alignment === 'center'
              ? 1
              : 2,
          textFrameWidthType: 0,
        });
      }
      await commit(data, elements, true, token);
    } finally {
      release(elements);
    }
  });
}
async function editGroup(
  group: GroupData,
  fontSize: number | null,
  bold: boolean | null,
  token?: OperationToken,
) {
  return exclusive(async () => {
    await requireFileReadPermission();
    await requireFileWritePermission();
    const all = await groupElements(group, token);
    try {
      check(token);
      const members = unique(all)
        .filter(el => metadata(el)?.gid === group.groupId)
        .sort(
          (a, b) =>
            a.textBox!.textRect.top - b.textBox!.textRect.top ||
            a.textBox!.textRect.left - b.textBox!.textRect.left,
        );
      if (!members.length) {
        throw new Error('No list group remains on this page.');
      }
      const size = await pageSize(group);
      const left = Math.min(...members.map(el => el.textBox!.textRect.left));
      const width = Math.max(
        ...members.map(
          el => el.textBox!.textRect.right - el.textBox!.textRect.left,
        ),
      );
      let top = members[0].textBox!.textRect.top;
      for (const [idx, el] of members.entries()) {
        const tb = el.textBox!;
        const fs = fontSize ?? tb.fontSize;
        if (!Number.isFinite(fs) || fs < 16 || fs > 72) {
          throw new Error('Choose a font size between 16 and 72.');
        }
        const text = wrapText(tb.textContentFull ?? '', width, fs);
        const rect = {
          left,
          top,
          right: left + width,
          bottom: top + textHeight(text, fs),
        };
        validateRect(rect, size);
        Object.assign(tb, {
          textContentFull: text,
          textRect: rect,
          fontSize: fs,
          textFrameWidthType: 0,
        });
        if (bold != null) {
          tb.textBold = bold ? 1 : 0;
        }
        el.userData = JSON.stringify({
          owner: 'ListSorter',
          schema: 1,
          gid: group.groupId,
          idx,
          fs,
        });
        top = rect.bottom + GAP;
      }
      await commit(group, members, false, token);
    } finally {
      release(all);
    }
  });
}
export const realignList = (group: GroupData, token?: OperationToken) =>
  editGroup(group, null, null, token);
export const formatGroup = (
  group: GroupData,
  fontSize: number | null,
  bold: boolean | null,
  token?: OperationToken,
) => editGroup(group, fontSize, bold, token);

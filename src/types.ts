export type SortFormat =
  | 'none'
  | 'bullet'
  | 'checkbox'
  | 'numbered'
  | 'lettered';
export type SortAlignment = 'left' | 'center' | 'right';
export type Rect = {left: number; top: number; right: number; bottom: number};
export type Size = {width: number; height: number};
export type NoteContext = {filePath: string; pageNum: number};
export interface SortOptions {
  direction: 'ascending' | 'descending';
  natural: boolean;
  stripPrefixes: boolean;
  removeDuplicates: boolean;
}
export interface InsertOptions {
  format: SortFormat;
  alignment: SortAlignment;
  fontSize: number;
  bold: boolean;
  outputMode: 'single' | 'individual';
  fit: boolean;
}
export interface LassoData extends NoteContext {
  mode: 'typed' | 'handwriting';
  items: string[];
  lassoRect: Rect;
  pageSize: Size;
}
export interface GroupData extends NoteContext {
  groupId: string;
  count: number;
  fontSize: number | null;
  bold: boolean | null;
}
export type AppScreen =
  | {kind: 'setup'}
  | {kind: 'detecting'}
  | {kind: 'sort'; data: LassoData}
  | {kind: 'group'; data: GroupData}
  | {kind: 'working'; message: string}
  | {kind: 'error'; message: string};
export interface OperationToken {
  cancelled: boolean;
  committing?: boolean;
}

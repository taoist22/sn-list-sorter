export type SortFormat = 'none' | 'bullet' | 'checkbox' | 'numbered' | 'lettered';
export type SortAlignment = 'left' | 'center' | 'right';

export interface InsertOptions {
  format: SortFormat;
  alignment: SortAlignment;
  fontSize: number;
  bold: boolean;
  outputMode: 'single' | 'individual';
}

export interface LassoData {
  mode: 'typed';
  items: string[];
  lassoRect: {left: number; top: number; right: number; bottom: number};
}

export interface GroupData {
  groupId: string;
  filePath: string;
  pageNum: number;
}

export type AppScreen =
  | {kind: 'detecting'}
  | {kind: 'sort'; data: LassoData}
  | {kind: 'group'; data: GroupData}
  | {kind: 'working'; message: string}
  | {kind: 'error'; message: string};

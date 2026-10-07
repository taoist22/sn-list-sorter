import {PluginManager} from 'sn-plugin-lib';
export const REQUIRED_PERMISSIONS = [
  'plugin.permission.FILE:READ',
  'plugin.permission.FILE:WRITE',
] as const;
const pending = new Map<string, Promise<void>>();
export function errorMessage(error: unknown): string {
  const e = error as {code?: string | number; message?: string};
  return `${e?.code != null ? `[${e.code}] ` : ''}${
    e?.message ?? String(error)
  }`;
}
export async function permissionStatus(): Promise<string> {
  const statuses: string[] = [];
  for (const permission of REQUIRED_PERMISSIONS) {
    const state = await PluginManager.hasPermission(permission);
    statuses.push(
      `${permission.endsWith('READ') ? 'Read' : 'Write'}: ${
        state > 0 ? 'allowed' : 'not granted'
      }`,
    );
  }
  return statuses.join(' · ');
}
async function requirePermission(kind: 'READ' | 'WRITE'): Promise<void> {
  const permission = `plugin.permission.FILE:${kind}`;
  const existing = pending.get(permission);
  if (existing) {
    return existing;
  }
  const request = (async () => {
    let result: number;
    try {
      if ((await PluginManager.hasPermission(permission)) > 0) {
        return;
      }
      result = await PluginManager.requestPermission(
        permission,
        kind === 'READ'
          ? 'Read the selected list and its group on the current page.'
          : 'Insert and format lists in the current note.',
      );
    } catch (error) {
      throw new Error(
        `File ${kind.toLowerCase()} permission request failed: ${errorMessage(
          error,
        )}`,
      );
    }
    if (result !== 1 && result !== 2) {
      throw new Error(
        `File ${kind.toLowerCase()} access was not allowed. Allow access in the device’s plugin permissions, then retry.`,
      );
    }
  })();
  pending.set(permission, request);
  try {
    await request;
  } finally {
    pending.delete(permission);
  }
}
export const requireFileReadPermission = () => requirePermission('READ');
export const requireFileWritePermission = () => requirePermission('WRITE');

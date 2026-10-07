import {PluginManager} from 'sn-plugin-lib';
import {errorMessage} from './pluginPermissions';
export const BUTTON_ID_LASSO = 200;
export const BUTTON_ID_SETUP = 100;
export type ButtonEvent = {id: number; name?: string; icon?: string};
let pending: ButtonEvent | null = null;
const subscribers = new Set<(event: ButtonEvent) => void>();
const statusSubscribers = new Set<() => void>();
let installed = false;
let startup: Promise<void> | undefined;
let startupStatus = 'Starting ListSorter…';
function dispatch(event: ButtonEvent) {
  if (![BUTTON_ID_LASSO, BUTTON_ID_SETUP].includes(event.id)) {
    return;
  }
  if (subscribers.size === 0) {
    pending = event;
  } else {
    pending = null;
    for (const callback of subscribers) {
      callback(event);
    }
  }
}
export function installPluginRouter() {
  if (installed) {
    return;
  }
  PluginManager.registerButtonListener({onButtonPress: dispatch});
  PluginManager.registerConfigButtonListener({
    onClick: () => dispatch({id: BUTTON_ID_SETUP}),
  });
  installed = true;
}
export function consumeLastButtonEvent() {
  const event = pending;
  pending = null;
  return event;
}
// Retained for reading historical audit fixtures only.
export function getLastButtonEvent() {
  return pending;
}
export function subscribeToButtonEvents(fn: (event: ButtonEvent) => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
export function getStartupStatus() {
  return startupStatus;
}
export function subscribeToStartup(fn: () => void) {
  statusSubscribers.add(fn);
  return () => {
    statusSubscribers.delete(fn);
  };
}
export function initializePlugin(icon: string): Promise<void> {
  if (startup) {
    return startup;
  }
  startup = (async () => {
    const problems: string[] = [];
    try {
      await PluginManager.init();
      // A settings/sidebar entry remains available without a lasso selection.
      for (const [type, button] of [
        [1, {id: BUTTON_ID_SETUP, name: 'ListSorter', icon, showType: 1}],
        [
          2,
          {
            id: BUTTON_ID_LASSO,
            name: 'Sort List',
            icon,
            showType: 1,
            editDataTypes: [0, 3],
          },
        ],
      ] as const) {
        try {
          if (!(await PluginManager.registerButton(type, ['NOTE'], button))) {
            throw new Error('Registration returned false');
          }
        } catch (error) {
          problems.push(`Button ${button.id}: ${errorMessage(error)}`);
        }
      }
      installPluginRouter();
      try {
        if (!(await PluginManager.registerConfigButton())) {
          throw new Error('Registration returned false');
        }
      } catch (error) {
        problems.push(`Settings: ${errorMessage(error)}`);
      }
    } catch (error) {
      problems.push(`Startup: ${errorMessage(error)}`);
    }
    startupStatus = problems.length
      ? problems.join('\n')
      : 'Buttons and settings registered.';
    for (const fn of statusSubscribers) {
      fn();
    }
    if (problems.length) {
      console.error('[ListSorter]', startupStatus);
    }
  })();
  return startup;
}

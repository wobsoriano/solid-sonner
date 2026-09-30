import { createStore, flush, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type {
  ExternalToast,
  PromiseData,
  PromiseIExtendedResult,
  PromiseT,
  ToastContent,
  ToastT,
  ToastTypes,
} from './types';

let toastsCounter = 1;

// `custom` needs the same id `create` would pick, as it hands it to the JSX callback.
function getToastId(data?: { id?: number | string }): number | string {
  return typeof data?.id === 'number' || (typeof data?.id === 'string' && data.id.length > 0)
    ? data.id
    : toastsCounter++;
}

interface UpdateToastProps {
  id: number | string;
  data: Partial<ToastT>;
  type: ToastTypes | undefined;
  message: ToastContent | undefined;
  dismissible: boolean;
}

/**
 * The source of truth. Components read `toasts` directly, so there is no
 * subscriber list, no publish, and no second copy inside the Toaster.
 */
const [toasts, setToasts] = createStore<ToastT[]>([]);
export { toasts };

// Removals whose exit animation is running but whose entry isn't gone yet
const pendingRemovals = new Map<number | string, ReturnType<typeof setTimeout>>();

export function addToast(data: ToastT): void {
  setToasts((list) => {
    list.unshift(data);
  });
}

export function updateToast({ id, data, type, message, dismissible }: UpdateToastProps): void {
  setToasts((list) => {
    const entry = list.find((toast) => toast.id === id);
    if (!entry) return;

    Object.assign(entry, {
      ...data,
      id,
      title: message,
      type,
      dismissible,
      // A dismissal that hasn't been processed yet gets cancelled: the toast
      // is still on screen, so this is an update of it, not a new toast.
      dismiss: false,
    });
  });
}

/**
 * Flags a toast dismissed from inside the Toast component (close button,
 * swipe, action click, auto-close) so `create` treats an id reuse as a new
 * toast instead of merging the old props into it.
 */
export function markDismissed(id: number | string): void {
  setToasts((list) => {
    const entry = list.find((toast) => toast.id === id);
    if (!entry) return;

    entry.dismiss = true;
  });
}

export function scheduleRemoval(id: number | string, delay: number): void {
  cancelRemoval(id);
  pendingRemovals.set(
    id,
    setTimeout(() => {
      pendingRemovals.delete(id);
      remove(id);
    }, delay),
  );
}

export function cancelRemoval(id: number | string): void {
  const timeout = pendingRemovals.get(id);
  if (timeout === undefined) return;

  clearTimeout(timeout);
  pendingRemovals.delete(id);
}

export function create(
  data: ExternalToast & {
    message?: ToastContent;
    type?: ToastTypes;
    promise?: PromiseT;
    jsx?: JSX.Element;
  },
): number | string {
  const { message, ...rest } = data;
  const id = getToastId(data);
  const dismissible = data.dismissible ?? true;
  const type = data.type;

  // Reads here are bookkeeping, not dependencies.
  untrack(() => {
    // A removal that hasn't run yet gets cancelled: this create supersedes
    // it, otherwise the old toast's timeout would remove the new one.
    cancelRemoval(id);

    const existing = toasts.find((toast) => toast.id === id);

    if (existing?.dismiss) {
      // Drop the old instead of merging, otherwise its props (e.g. `action`)
      // leak in. The fresh object also gives `For` a new identity, so the
      // replacement mounts with a fresh auto-close timer.
      remove(id);
      addToast({ ...rest, id, title: message, dismissible, type });
    } else if (existing) {
      updateToast({ id, data, type, message, dismissible });
    } else {
      addToast({ ...rest, id, title: message, dismissible, type });
    }
  });

  // Solid 2 batches writes: without this the caller would not see the toast.
  flush();

  return id;
}

export function dismiss(id?: number | string): number | string | undefined {
  untrack(() => {
    if (id === undefined || id === null) {
      setToasts((list) => {
        list.forEach((toast) => {
          toast.dismiss = true;
        });
      });
      return;
    }

    setToasts((list) => {
      const entry = list.find((toast) => toast.id === id);
      if (entry) entry.dismiss = true;
    });
  });
  flush();

  return id;
}

export function remove(id?: number | string): number | string | undefined {
  if (id === undefined) {
    setToasts(() => []);
    return;
  }

  cancelRemoval(id);
  setToasts((list) => list.filter((toast) => toast.id !== id));

  return id;
}

export function message(message: ToastContent, data?: ExternalToast) {
  // `type: undefined` resets the type when this updates a toast that had one,
  // e.g. turning a loading toast into a plain one.
  return create({ ...data, message, type: undefined });
}

export function error(message: ToastContent, data?: ExternalToast) {
  return create({ ...data, message, type: 'error' });
}

export function success(message: ToastContent, data?: ExternalToast) {
  return create({ ...data, type: 'success', message });
}

export function info(message: ToastContent, data?: ExternalToast) {
  return create({ ...data, type: 'info', message });
}

export function warning(message: ToastContent, data?: ExternalToast) {
  return create({ ...data, type: 'warning', message });
}

export function loading(message: ToastContent, data?: ExternalToast) {
  return create({ ...data, type: 'loading', message });
}

export function promise<ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData>) {
  if (!data) return;

  let id: string | number | undefined;

  if (data.loading !== undefined) {
    id = create({
      ...data,
      promise,
      type: 'loading',
      message: data.loading,
      description: typeof data.description !== 'function' ? data.description : undefined,
    });
  }

  const p = Promise.resolve(typeof promise === 'function' ? promise() : promise);

  let shouldDismiss = id !== undefined;
  let result: ['resolve', ToastData] | ['reject', unknown];

  // Resolves the `success` / `error` shorthand into toast settings.
  const settle = async (
    type: ToastTypes,
    value: unknown,
    source: PromiseData<ToastData>['success'] | PromiseData<ToastData>['error'],
  ) => {
    shouldDismiss = false;

    const promiseData = typeof source === 'function' ? await source(value as never) : source;
    const description =
      typeof data.description === 'function'
        ? await data.description(value as never)
        : data.description;

    const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
      ? (promiseData as PromiseIExtendedResult)
      : { message: promiseData as JSX.Element };

    create({ id, type, description, ...toastSettings });
  };

  const originalPromise = p
    .then(async (response) => {
      result = ['resolve', response];

      if (isValidElement(response)) {
        shouldDismiss = false;
        create({ id, type: 'default', message: response });
      } else if (isHttpResponse(response) && !response.ok) {
        await settle('error', `HTTP error! status: ${response.status}`, data.error);
      } else if (response instanceof Error) {
        await settle('error', response, data.error);
      } else if (data.success !== undefined) {
        await settle('success', response, data.success);
      }
    })
    .catch(async (error) => {
      result = ['reject', error];

      if (data.error !== undefined) await settle('error', error, data.error);
    })
    .finally(() => {
      if (shouldDismiss) {
        dismiss(id);
        id = undefined;
      }

      data.finally?.();
    });

  const unwrap = () =>
    new Promise<ToastData>((resolve, reject) => {
      originalPromise
        .then(() => {
          if (result[0] === 'reject') reject(result[1]);
          else resolve(result[1]);
        })
        .catch(reject);
    });

  if (typeof id !== 'string' && typeof id !== 'number') return { unwrap };

  return Object.assign(id as unknown as Record<string, unknown>, { unwrap });
}

export function custom(jsx: (id: number | string) => JSX.Element, data?: ExternalToast) {
  const id = getToastId(data);
  // A custom toast has no type, so it resets the one of the toast it replaces
  create({ ...data, jsx: jsx(id), id, type: undefined });
  return id;
}

function isHttpResponse(data: any): data is Response {
  return (
    data &&
    typeof data === 'object' &&
    'ok' in data &&
    typeof data.ok === 'boolean' &&
    'status' in data &&
    typeof data.status === 'number'
  );
}

function isExtendedResult(value: unknown): value is PromiseIExtendedResult {
  return typeof value === 'object' && value !== null && 'message' in value;
}

function isValidElement(value: unknown): value is JSX.Element {
  return typeof Node !== 'undefined' && value instanceof Node;
}

export const toast = Object.assign(message, {
  success,
  info,
  warning,
  error,
  custom,
  message,
  promise,
  dismiss,
  loading,
  /** Reactive: the live toasts. Replaces `useSonner()` and `getToasts()`. */
  get toasts() {
    return toasts;
  },
});

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
 * The store is the source of truth. Components read `toastState.toasts`
 * directly, so there is no subscriber list, no publish, and no second copy of
 * the array inside the Toaster.
 */
class ToastState {
  // Solid's store is read-only, so the array is exposed through a getter and
  // every mutation goes through the setter.
  #toasts;
  #setToasts;
  // Removals whose exit animation is running but whose entry isn't gone yet
  #pendingRemovals = new Map<number | string, ReturnType<typeof setTimeout>>();

  constructor() {
    const [toasts, setToasts] = createStore<ToastT[]>([]);
    this.#toasts = toasts;
    this.#setToasts = setToasts;
  }

  /** Reactive. Read it in JSX and it tracks. */
  get toasts() {
    return this.#toasts;
  }

  #findToastIdx = (id: number | string): number | null => {
    const idx = this.#toasts.findIndex((toast) => toast.id === id);
    return idx === -1 ? null : idx;
  };

  addToast = (data: ToastT): void => {
    this.#setToasts((list) => {
      list.unshift(data);
    });
  };

  updateToast = ({ id, data, type, message, dismissible }: UpdateToastProps): void => {
    this.#setToasts((list) => {
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
        delete: false,
        updated: true,
      });
    });
  };

  /**
   * Flags a toast dismissed from inside the Toast component (close button,
   * swipe, action click, auto-close) so `create` treats an id reuse as a new
   * toast instead of merging the old props into it.
   */
  markDismissed = (id: number | string): void => {
    this.#setToasts((list) => {
      const entry = list.find((toast) => toast.id === id);
      if (!entry) return;

      entry.dismiss = true;
      entry.delete = true;
    });
  };

  scheduleRemoval = (id: number | string, delay: number): void => {
    this.cancelRemoval(id);
    this.#pendingRemovals.set(
      id,
      setTimeout(() => {
        this.#pendingRemovals.delete(id);
        this.remove(id);
      }, delay),
    );
  };

  cancelRemoval = (id: number | string): void => {
    const timeout = this.#pendingRemovals.get(id);
    if (timeout === undefined) return;

    clearTimeout(timeout);
    this.#pendingRemovals.delete(id);
  };

  create = (
    data: ExternalToast & {
      message?: ToastContent;
      type?: ToastTypes;
      promise?: PromiseT;
      jsx?: JSX.Element;
    },
  ): number | string => {
    const { message, ...rest } = data;
    const id = getToastId(data);
    const dismissible = data.dismissible ?? true;
    const type = data.type;

    // Reads here are bookkeeping, not dependencies.
    untrack(() => {
      // A removal that hasn't run yet gets cancelled: this create supersedes
      // it, otherwise the old toast's timeout would remove the new one.
      this.cancelRemoval(id);

      const idx = this.#findToastIdx(id);
      const existing = idx === null ? undefined : this.#toasts[idx];

      if (existing?.dismiss || existing?.delete) {
        // The previous toast with this id is gone, so this is a brand new one.
        // Drop the old instead of merging, otherwise its props (e.g. `action`)
        // leak into the new toast. `updated` makes a still-mounted component
        // reset its auto-close timer.
        this.remove(id);
        this.addToast({ ...rest, id, title: message, dismissible, type, updated: true });
      } else if (existing) {
        this.updateToast({ id, data, type, message, dismissible });
      } else {
        this.addToast({ ...rest, id, title: message, dismissible, type });
      }
    });

    // Solid 2 batches writes, so without this neither the caller nor a Toaster
    // that hasn't rendered yet would see the toast.
    flush();

    return id;
  };

  dismiss = (id?: number | string): number | string | undefined => {
    untrack(() => {
      if (id === undefined || id === null) {
        this.#setToasts((list) => {
          list.forEach((toast) => {
            toast.dismiss = true;
          });
        });
        return;
      }

      this.#setToasts((list) => {
        const entry = list.find((toast) => toast.id === id);
        if (entry) entry.dismiss = true;
      });
    });
    flush();

    return id;
  };

  remove = (id?: number | string): number | string | undefined => {
    if (id === undefined) {
      this.#setToasts(() => []);
      return;
    }

    this.cancelRemoval(id);
    this.#setToasts((list) => list.filter((toast) => toast.id !== id));

    return id;
  };

  message = (message: ToastContent, data?: ExternalToast) => {
    // `type: undefined` resets the type when this updates a toast that had one,
    // e.g. turning a loading toast into a plain one.
    return this.create({ ...data, message, type: undefined });
  };

  error = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, message, type: 'error' });
  };

  success = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'success', message });
  };

  info = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'info', message });
  };

  warning = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'warning', message });
  };

  loading = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'loading', message });
  };

  promise = <ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData>) => {
    if (!data) return;

    let id: string | number | undefined;

    if (data.loading !== undefined) {
      id = this.create({
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

    // Resolves the `success` / `error` shorthand into toast settings. Upstream
    // repeats this four times; it is the same shape every time.
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

      this.create({ id, type, description, ...toastSettings });
    };

    const originalPromise = p
      .then(async (response) => {
        result = ['resolve', response];

        if (isValidElement(response)) {
          shouldDismiss = false;
          this.create({ id, type: 'default', message: response });
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
          this.dismiss(id);
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
  };

  custom = (jsx: (id: number | string) => JSX.Element, data?: ExternalToast) => {
    const id = getToastId(data);
    // A custom toast has no type, so it resets the one of the toast it replaces
    this.create({ ...data, jsx: jsx(id), id, type: undefined });
    return id;
  };
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

export const toastState = new ToastState();

function toastFunction(message: ToastContent, data?: ExternalToast) {
  return toastState.message(message, data);
}

export const toast = Object.assign(toastFunction, {
  success: toastState.success,
  info: toastState.info,
  warning: toastState.warning,
  error: toastState.error,
  custom: toastState.custom,
  message: toastState.message,
  promise: toastState.promise,
  dismiss: toastState.dismiss,
  loading: toastState.loading,
  /** Reactive: the live toasts. Replaces `useSonner()` and `getToasts()`. */
  get toasts() {
    return toastState.toasts;
  },
});

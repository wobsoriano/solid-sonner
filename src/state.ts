import type { JSX } from 'solid-js';
import {
  type ExternalToast,
  type PromiseData,
  type PromiseIExtendedResult,
  type PromiseT,
  type ToastContent,
  type ToastT,
  type ToastToDismiss,
  type ToastTypes,
} from './types';

let toastsCounter = 1;

// Amount of toasts kept in `toast.getHistory()`. Dismissed toasts above this
// limit are dropped so long-running apps don't hold on to them forever.
const MAX_HISTORY_SIZE = 100;

// A toast keeps the id it was given, otherwise it gets the next one from the
// counter. `custom` needs the same id `create` would pick, as it hands it to
// the JSX callback.
function getToastId(data?: { id?: number | string }): number | string {
  return typeof data?.id === 'number' || (typeof data?.id === 'string' && data.id.length > 0)
    ? data.id
    : toastsCounter++;
}

class Observer {
  subscribers: Array<(toast: ToastT | ToastToDismiss) => void>;
  toasts: Array<ToastT | ToastToDismiss>;
  dismissedToasts: Set<string | number>;
  // Dismissals that have been requested but not handed to the subscribers yet
  private pendingDismissals: Map<string | number, number>;

  constructor() {
    this.subscribers = [];
    this.toasts = [];
    this.dismissedToasts = new Set();
    this.pendingDismissals = new Map();
  }

  subscribe = (subscriber: (toast: ToastT | ToastToDismiss) => void) => {
    this.subscribers.push(subscriber);

    // A toast can be created before the `Toaster` had a chance to subscribe,
    // e.g. when it's called above the `Toaster` in the tree. Replay whatever
    // is still active so it doesn't get lost.
    this.getActiveToasts().forEach((toast) => subscriber(toast));

    return () => {
      const index = this.subscribers.indexOf(subscriber);
      this.subscribers.splice(index, 1);
    };
  };

  publish = (data: ToastT) => {
    this.subscribers.forEach((subscriber) => subscriber(data));
  };

  addToast = (data: ToastT) => {
    this.publish(data);
    this.toasts = [...this.toasts, data];
    this.trimHistory();
  };

  // Keeps the history bounded without ever dropping a toast that's still on screen.
  private trimHistory = () => {
    let toRemove = this.toasts.length - MAX_HISTORY_SIZE;
    if (toRemove <= 0) return;

    this.toasts = this.toasts.filter((toast) => {
      if (toRemove > 0 && this.dismissedToasts.has(toast.id)) {
        this.dismissedToasts.delete(toast.id);
        toRemove--;
        return false;
      }

      return true;
    });
  };

  create = (
    data: ExternalToast & {
      message?: ToastContent;
      type?: ToastTypes;
      promise?: PromiseT;
      jsx?: JSX.Element;
    },
  ) => {
    const { message, ...rest } = data;
    const id = getToastId(data);

    // A dismissal that hasn't reached the subscribers yet gets cancelled: the
    // toast is still on screen, so this is an update of it rather than a new
    // toast. Without this, creating a toast right after dismissing the same id
    // would have the pending dismissal remove the toast that just got created.
    const pendingDismissal = this.pendingDismissals.get(id);
    if (pendingDismissal !== undefined) {
      cancelAnimationFrame(pendingDismissal);
      this.pendingDismissals.delete(id);
      this.dismissedToasts.delete(id);
    }

    const wasDismissed = this.dismissedToasts.has(id);
    const dismissible = data.dismissible === undefined ? true : data.dismissible;

    if (wasDismissed) {
      this.dismissedToasts.delete(id);
      // The previous toast with this id is gone, so this is a brand new toast.
      // Drop the old one instead of merging into it, otherwise its props (e.g.
      // `action`) leak into the new one.
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    }

    const alreadyExists = wasDismissed
      ? undefined
      : this.toasts.find((toast) => {
          return toast.id === id;
        });

    if (alreadyExists) {
      this.toasts = this.toasts.map((toast) => {
        if (toast.id === id) {
          this.publish({ ...toast, ...data, id, title: message, dismissible } as ToastT);
          return {
            ...toast,
            ...data,
            id,
            dismissible,
            title: message,
          };
        }

        return toast;
      });
    } else {
      this.addToast({ title: message, ...rest, dismissible, id });
    }

    return id;
  };

  dismiss = (id?: number | string) => {
    if (id === undefined || id === null) {
      this.getActiveToasts().forEach((toast) => {
        this.dismissedToasts.add(toast.id);
        this.subscribers.forEach((subscriber) => subscriber({ id: toast.id, dismiss: true }));
      });

      return id;
    }

    this.dismissedToasts.add(id);

    const alreadyPending = this.pendingDismissals.get(id);
    if (alreadyPending !== undefined) {
      cancelAnimationFrame(alreadyPending);
    }

    this.pendingDismissals.set(
      id,
      requestAnimationFrame(() => {
        this.pendingDismissals.delete(id);
        this.subscribers.forEach((subscriber) => subscriber({ id, dismiss: true }));
      }),
    );

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

    const originalPromise = p
      .then(async (response) => {
        result = ['resolve', response];

        if (isValidElement(response)) {
          shouldDismiss = false;
          this.create({ id, type: 'default', message: response });
        } else if (isHttpResponse(response) && !response.ok) {
          shouldDismiss = false;

          const promiseData =
            typeof data.error === 'function'
              ? await data.error(`HTTP error! status: ${response.status}`)
              : data.error;
          const description =
            typeof data.description === 'function'
              ? await data.description(`HTTP error! status: ${response.status}`)
              : data.description;

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? (promiseData as PromiseIExtendedResult)
            : { message: promiseData as JSX.Element };

          this.create({ id, type: 'error', description, ...toastSettings });
        } else if (response instanceof Error) {
          shouldDismiss = false;

          const promiseData =
            typeof data.error === 'function' ? await data.error(response) : data.error;
          const description =
            typeof data.description === 'function'
              ? await data.description(response)
              : data.description;

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? (promiseData as PromiseIExtendedResult)
            : { message: promiseData as JSX.Element };

          this.create({ id, type: 'error', description, ...toastSettings });
        } else if (data.success !== undefined) {
          shouldDismiss = false;

          const promiseData =
            typeof data.success === 'function' ? await data.success(response) : data.success;
          const description =
            typeof data.description === 'function'
              ? await data.description(response)
              : data.description;

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? (promiseData as PromiseIExtendedResult)
            : { message: promiseData as JSX.Element };

          this.create({ id, type: 'success', description, ...toastSettings });
        }
      })
      .catch(async (error) => {
        result = ['reject', error];

        if (data.error !== undefined) {
          shouldDismiss = false;

          const promiseData =
            typeof data.error === 'function' ? await data.error(error) : data.error;
          const description =
            typeof data.description === 'function'
              ? await data.description(error)
              : data.description;

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? (promiseData as PromiseIExtendedResult)
            : { message: promiseData as JSX.Element };

          this.create({ id, type: 'error', description, ...toastSettings });
        }
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

  getActiveToasts = () => {
    return this.toasts.filter((toast) => !this.dismissedToasts.has(toast.id)) as ToastT[];
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

export const ToastState = new Observer();

function toastFunction(message: ToastContent, data?: ExternalToast) {
  return ToastState.message(message, data);
}

const basicToast = toastFunction;

const getHistory = () => ToastState.toasts;
const getToasts = () => ToastState.getActiveToasts();

export const toast = Object.assign(
  basicToast,
  {
    success: ToastState.success,
    info: ToastState.info,
    warning: ToastState.warning,
    error: ToastState.error,
    custom: ToastState.custom,
    message: ToastState.message,
    promise: ToastState.promise,
    dismiss: ToastState.dismiss,
    loading: ToastState.loading,
  },
  {
    getHistory,
    getToasts,
  },
);

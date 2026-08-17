/**
 * Sketch B: keep the `ToastState` class, back it with Solid primitives.
 *
 * Mirrors svelte-sonner's `toast-state.svelte.ts` field for field and method
 * for method, with `$state` swapped for a store. Components read
 * `toastState.toasts` directly, so the subscriber list, `publish` and the
 * Toaster-side mirror of the array all go away, but every method still lines
 * up with upstream's Observer.
 *
 * Written for Solid 2. See the README for the Solid 1 delta.
 */
import { createStore, flush, untrack } from 'solid-js';
import type { ExternalToast, ToastContent, ToastId, ToastT, ToastTypes } from './types';

let toastsCounter = 0;

// `custom` needs the same id `create` would pick, as it hands it to the JSX callback.
function getToastId(data?: { id?: ToastId }): ToastId {
  return typeof data?.id === 'number' || (typeof data?.id === 'string' && data.id.length > 0)
    ? data.id
    : toastsCounter++;
}

interface UpdateToastProps {
  id: ToastId;
  data: Partial<ToastT>;
  type: ToastTypes | undefined;
  message: ToastContent | undefined;
  dismissible: boolean;
}

class ToastState {
  // In Svelte this is `toasts = $state<ToastT[]>([])`. Solid's store is
  // read-only, so the array is exposed through a getter and every mutation
  // goes through the setter.
  #toasts;
  #setToasts;
  // Removals whose exit animation is running but whose entry isn't gone yet
  #pendingRemovals = new Map<ToastId, ReturnType<typeof setTimeout>>();

  constructor() {
    const [toasts, setToasts] = createStore<ToastT[]>([]);
    this.#toasts = toasts;
    this.#setToasts = setToasts;
  }

  /** Reactive. Read it in JSX and it tracks. */
  get toasts() {
    return this.#toasts;
  }

  #findToastIdx = (id: ToastId): number | null => {
    const idx = this.#toasts.findIndex((toast) => toast.id === id);
    return idx === -1 ? null : idx;
  };

  addToast = (data: ToastT): void => {
    this.#setToasts((list) => {
      list.unshift(data);
    });
  };

  updateToast = ({ id, data, type, message, dismissible }: UpdateToastProps): void => {
    const idx = this.#findToastIdx(id);
    if (idx === null) return;

    this.#setToasts((list) => {
      Object.assign(list[idx]!, {
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
  markDismissed = (id: ToastId): void => {
    const idx = this.#findToastIdx(id);
    if (idx === null) return;

    this.#setToasts((list) => {
      list[idx]!.dismiss = true;
      list[idx]!.delete = true;
    });
  };

  scheduleRemoval = (id: ToastId, delay: number): void => {
    this.cancelRemoval(id);
    this.#pendingRemovals.set(
      id,
      setTimeout(() => {
        this.#pendingRemovals.delete(id);
        this.remove(id);
      }, delay),
    );
  };

  cancelRemoval = (id: ToastId): void => {
    const timeout = this.#pendingRemovals.get(id);
    if (timeout === undefined) return;

    clearTimeout(timeout);
    this.#pendingRemovals.delete(id);
  };

  create = (
    data: ExternalToast & {
      message?: ToastContent;
      type?: ToastTypes;
      jsx?: ToastT['jsx'];
    },
  ): ToastId => {
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
        this.addToast({ ...rest, id, title: message, dismissible, type, updated: true } as ToastT);
      } else if (existing) {
        this.updateToast({ id, data, type, message, dismissible });
      } else {
        this.addToast({ ...rest, id, title: message, dismissible, type } as ToastT);
      }
    });

    // Solid 2 batches writes, so without this the caller (and a Toaster that
    // hasn't rendered yet) would not see the toast.
    flush();

    return id;
  };

  dismiss = (id?: ToastId): ToastId | undefined => {
    untrack(() => {
      if (id === undefined || id === null) {
        this.#setToasts((list) => {
          list.forEach((toast) => {
            toast.dismiss = true;
          });
        });
        return;
      }

      const idx = this.#findToastIdx(id);
      if (idx === null) return;

      this.#setToasts((list) => {
        list[idx]!.dismiss = true;
      });
    });
    flush();

    return id;
  };

  remove = (id?: ToastId): ToastId | undefined => {
    if (id === undefined) {
      this.#setToasts(() => []);
      return;
    }

    this.cancelRemoval(id);
    this.#setToasts((list) => list.filter((toast) => toast.id !== id));

    return id;
  };

  message = (message: ToastContent, data?: ExternalToast) =>
    this.create({ ...data, message, type: undefined });

  success = (message: ToastContent, data?: ExternalToast) =>
    this.create({ ...data, message, type: 'success' });

  info = (message: ToastContent, data?: ExternalToast) =>
    this.create({ ...data, message, type: 'info' });

  warning = (message: ToastContent, data?: ExternalToast) =>
    this.create({ ...data, message, type: 'warning' });

  error = (message: ToastContent, data?: ExternalToast) =>
    this.create({ ...data, message, type: 'error' });

  loading = (message: ToastContent, data?: ExternalToast) =>
    this.create({ ...data, message, type: 'loading' });

  custom = (jsx: (id: ToastId) => ToastT['jsx'], data?: ExternalToast) => {
    const id = getToastId(data);
    // A custom toast has no type, so it resets the one of the toast it replaces.
    this.create({ ...data, jsx: jsx(id), id, type: undefined });
    return id;
  };

  // promise() is unchanged from src/state.ts and omitted here. Its four
  // duplicated result-resolution blocks should be factored while porting.
}

export const toastState = new ToastState();

export const toast = Object.assign(toastState.message, {
  success: toastState.success,
  info: toastState.info,
  warning: toastState.warning,
  error: toastState.error,
  loading: toastState.loading,
  message: toastState.message,
  custom: toastState.custom,
  dismiss: toastState.dismiss,
});

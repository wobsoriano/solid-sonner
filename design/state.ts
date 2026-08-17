/**
 * Sketch: solid-sonner state on Solid 2, written for Solid rather than ported
 * from React. Not wired into the build.
 *
 * The store IS the source of truth. There is no Observer, no subscriber list,
 * no publish, and no component-side mirror of the toast array. Components read
 * `toasts` directly.
 */
import { createStore, flush } from 'solid-js';
import type { ExternalToast, ToastContent, ToastId, ToastT, ToastTypes } from './types';

/** Matches the CSS exit animation. */
const EXIT_DURATION = 200;

const [toasts, setToasts] = createStore<ToastT[]>([]);
export { toasts };

let counter = 1;
function nextId(data?: { id?: ToastId }): ToastId {
  // `custom` needs the same id `create` would pick, as it hands it to the JSX callback.
  return typeof data?.id === 'number' || (typeof data?.id === 'string' && data.id.length > 0)
    ? data.id
    : counter++;
}

const indexOf = (id: ToastId) => toasts.findIndex((t) => t.id === id);

const exitTimers = new Map<ToastId, ReturnType<typeof setTimeout>>();

function cancelExit(id: ToastId) {
  const timer = exitTimers.get(id);
  if (timer === undefined) return;

  clearTimeout(timer);
  exitTimers.delete(id);
}

function remove(id: ToastId) {
  cancelExit(id);
  setToasts((list) => list.filter((t) => t.id !== id));
}

type CreateInput = ExternalToast & {
  message?: ToastContent;
  type?: ToastTypes;
  jsx?: ToastT['jsx'];
};

function create(data: CreateInput): ToastId {
  const { message, ...rest } = data;
  const id = nextId(data);

  // A toast on its way out is coming back, so the scheduled removal is void.
  // This is the whole of upstream's pendingDismissals dance.
  cancelExit(id);

  const index = indexOf(id);

  setToasts((list) => {
    const next: ToastT = {
      ...rest,
      id,
      phase: 'visible',
      title: message,
      dismissible: data.dismissible ?? true,
    };

    // Updating a live toast merges; replacing an exiting one starts clean, so
    // stale props such as `action` cannot leak into the new toast.
    if (index === -1) list.unshift(next);
    else if (list[index]!.phase === 'exiting') list[index] = next;
    else Object.assign(list[index]!, next);
  });

  // Solid 2 batches writes: without this, a toast created before the Toaster
  // first renders is still invisible to it. Verified against 2.0.0-rc.0, where
  // the unflushed case also crashes `For`.
  flush();

  return id;
}

function dismiss(id?: ToastId): ToastId | undefined {
  if (id === undefined || id === null) {
    toasts.forEach((t) => dismiss(t.id));
    return id;
  }

  const index = indexOf(id);
  if (index === -1 || toasts[index]!.phase === 'exiting') return id;

  toasts[index]!.onDismiss?.(toasts[index]!);
  setToasts((list) => {
    list[index]!.phase = 'exiting';
  });
  exitTimers.set(
    id,
    setTimeout(() => remove(id), EXIT_DURATION),
  );

  return id;
}

const typed = (type: ToastTypes) => (message: ToastContent, data?: ExternalToast) =>
  create({ ...data, message, type });

function message(msg: ToastContent, data?: ExternalToast) {
  // `type: undefined` resets the type, e.g. a loading toast becoming plain.
  return create({ ...data, message: msg, type: undefined });
}

function custom(jsx: (id: ToastId) => ToastT['jsx'], data?: ExternalToast) {
  const id = nextId(data);
  create({ ...data, jsx: jsx(id), id, type: undefined });
  return id;
}

export const toast = Object.assign(message, {
  success: typed('success'),
  info: typed('info'),
  warning: typed('warning'),
  error: typed('error'),
  loading: typed('loading'),
  message,
  custom,
  dismiss,
  /** Reactive: read it in JSX and it tracks. Replaces useSonner(). */
  toasts,
});

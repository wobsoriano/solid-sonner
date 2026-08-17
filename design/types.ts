// Trimmed types for the sketch. The real port keeps src/types.ts, with JSX
// re-sourced from @solidjs/web (Solid 2 moves the JSX namespace out of solid-js).
import type { JSX } from '@solidjs/web';

export type ToastTypes = 'success' | 'info' | 'warning' | 'error' | 'loading';
export type ToastContent = (() => JSX.Element) | JSX.Element;
export type ToastId = number | string;

/** Replaces the `delete` flag, the dismissedToasts set and the pendingDismissals map. */
export type ToastPhase = 'visible' | 'exiting';

export interface Action {
  label: JSX.Element;
  onClick: (event: MouseEvent) => void;
}

export interface ToastT {
  id: ToastId;
  phase: ToastPhase;
  toasterId?: string;
  title?: ToastContent;
  description?: ToastContent;
  type?: ToastTypes;
  icon?: JSX.Element | null;
  jsx?: JSX.Element;
  duration?: number;
  dismissible: boolean;
  action?: Action | JSX.Element;
  cancel?: Action | JSX.Element;
  onDismiss?: (toast: ToastT) => void;
  onAutoClose?: (toast: ToastT) => void;
  promise?: Promise<unknown> | (() => Promise<unknown>);
}

export type ExternalToast = Partial<Omit<ToastT, 'id' | 'phase' | 'title' | 'jsx' | 'type'>> & {
  id?: ToastId;
};

/*!
 * Original code by Emil Kowalski
 * MIT Licensed, Copyright 2023 Emil Kowalski, see https://github.com/emilkowalski/sonner/blob/main/LICENSE.md for details
 *
 * Credits:
 * https://github.com/emilkowalski/sonner/blob/main/src/index.tsx
 */
import cssText from './styles.css?inline';
import type { JSX } from '@solidjs/web';
import type { Accessor } from 'solid-js';
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createStore,
  onSettled,
  reconcile,
  untrack,
} from 'solid-js';
import { CloseIcon, Loader, getAsset } from './assets';
import { useIsDocumentHidden } from './primitives';
import { ToastState, toast } from './state';
import {
  type Action,
  type ExternalToast,
  type HeightT,
  type Offset,
  type Position,
  type SwipeDirection,
  type ToastClassnames,
  type ToastContent,
  type ToastIcons,
  type ToastOptions,
  type ToastProps,
  type ToastT,
  type ToastToDismiss,
  type ToasterProps,
  isAction,
} from './types';

// Injected on import, the same way the React original ships them. The attribute
// stops a second import stacking a duplicate tag.
if (typeof document !== 'undefined' && !document.querySelector('style[data-sonner]')) {
  const styleTag = document.createElement('style');
  styleTag.setAttribute('data-sonner', '');
  styleTag.textContent = cssText;
  document.head.appendChild(styleTag);
}

const VISIBLE_TOASTS_AMOUNT = 3;
const VIEWPORT_OFFSET = '24px';
const MOBILE_VIEWPORT_OFFSET = '16px';
const TOAST_LIFETIME = 4000;
const TOAST_WIDTH = 356;
const GAP = 14;
const SWIPE_THRESHOLD = 45;
const TIME_BEFORE_UNMOUNT = 200;

function cn(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// Solid 2 renders `true` as a valueless attribute and drops `false`, but the
// stylesheet matches `[data-*='true']` and `[data-*='false']`.
function boolAttr(value: boolean | undefined) {
  return value === undefined ? undefined : String(value);
}

function resolveContent(content?: ToastContent) {
  return typeof content === 'function' ? content() : content;
}

function getDefaultSwipeDirections(position: string): SwipeDirection[] {
  const [y, x] = position.split('-');
  const directions: SwipeDirection[] = [];

  if (y) directions.push(y as SwipeDirection);

  if (x) directions.push(x as SwipeDirection);

  return directions;
}

function measureUnstackedHeight(element: HTMLElement) {
  const originalHeight = element.style.height;
  element.style.height = 'auto';
  // The computed height is `auto` when nothing is laid out (jsdom, `display: none`).
  const height =
    Number.parseFloat(window.getComputedStyle(element).height) ||
    element.getBoundingClientRect().height;
  element.style.height = originalHeight;
  return height;
}

function getDocumentDirection(): ToasterProps['dir'] {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'ltr';

  const dirAttribute = document.documentElement.getAttribute('dir');

  if (dirAttribute === 'auto' || !dirAttribute)
    return window.getComputedStyle(document.documentElement).direction as ToasterProps['dir'];

  return dirAttribute as ToasterProps['dir'];
}

function assignOffset(defaultOffset?: Offset, mobileOffset?: Offset): JSX.CSSProperties {
  const styles: Record<string, string> = {};

  [defaultOffset, mobileOffset].forEach((offset, index) => {
    const isMobile = index === 1;
    const prefix = isMobile ? '--mobile-offset' : '--offset';
    const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;

    const assignAll = (value: string | number) => {
      for (const key of ['top', 'right', 'bottom', 'left'])
        styles[`${prefix}-${key}`] = typeof value === 'number' ? `${value}px` : value;
    };

    if (typeof offset === 'number' || typeof offset === 'string') {
      assignAll(offset);
      return;
    }

    if (typeof offset === 'object' && offset !== null) {
      for (const key of ['top', 'right', 'bottom', 'left'] as const) {
        const value = offset[key];
        styles[`${prefix}-${key}`] =
          value === undefined ? defaultValue : typeof value === 'number' ? `${value}px` : value;
      }
      return;
    }

    assignAll(defaultValue);
  });

  return styles as JSX.CSSProperties;
}

function mergeClassNames(classNames?: ToastClassnames, legacy?: ToastClassnames) {
  return classNames ?? legacy;
}

function mergeDescriptionClassName(descriptionClassName?: string, legacy?: string) {
  return descriptionClassName ?? legacy ?? '';
}

function mergeClassName(className?: string, legacy?: string) {
  return className ?? legacy ?? '';
}

function useSonner(): { toasts: Accessor<ToastT[]> } {
  // Starts empty: subscribing replays whatever is already active.
  const [activeToasts, setActiveToasts] = createSignal<ToastT[]>([]);

  onSettled(() =>
    ToastState.subscribe((toastItem) => {
      if ((toastItem as ToastToDismiss).dismiss) {
        requestAnimationFrame(() => {
          setActiveToasts((toasts) => toasts.filter((t) => t.id !== toastItem.id));
        });
        return;
      }

      const nextToast = toastItem as ToastT;

      setActiveToasts((toasts) => {
        const indexOfExistingToast = toasts.findIndex((t) => t.id === nextToast.id);

        if (indexOfExistingToast !== -1) {
          return [
            ...toasts.slice(0, indexOfExistingToast),
            { ...toasts[indexOfExistingToast], ...nextToast },
            ...toasts.slice(indexOfExistingToast + 1),
          ];
        }

        return [nextToast, ...toasts];
      });
    }),
  );

  return {
    toasts: activeToasts,
  };
}

function createToastTheme(theme: ToasterProps['theme']) {
  return theme !== 'system'
    ? theme
    : typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}

function Toast(props: ToastProps) {
  const [mounted, setMounted] = createSignal(false);
  const [removed, setRemoved] = createSignal(false);
  const [swiping, setSwiping] = createSignal(false);
  const [swipeOut, setSwipeOut] = createSignal(false);
  const [isSwiped, setIsSwiped] = createSignal(false);
  const [swipeOutDirection, setSwipeOutDirection] = createSignal<
    'left' | 'right' | 'up' | 'down' | null
  >(null);
  const [offsetBeforeRemove, setOffsetBeforeRemove] = createSignal(0);
  const [initialHeight, setInitialHeight] = createSignal(0);
  let toastRef: HTMLLIElement | undefined;
  let dragStartTime: Date | null = null;
  let closeTimerStartTimeRef = 0;
  let lastCloseTimerStartTimeRef = 0;
  let remainingTime = TOAST_LIFETIME;
  let pointerStart: { x: number; y: number } | null = null;
  let swipeDirection: 'x' | 'y' | null = null;

  const isFront = () => props.index === 0;
  const isVisible = () => props.index + 1 <= props.visibleToasts;
  const toastType = () => props.toast.type;
  const dismissible = () => props.toast.dismissible !== false;
  const classNames = () => mergeClassNames(props.classNames, props.classes);
  const className = () => mergeClassName(props.className, props.class);
  const descriptionClassName = () =>
    mergeDescriptionClassName(props.descriptionClassName, props.descriptionClass);
  const toastClassName = () => mergeClassName(props.toast.className, props.toast.class);
  const toastDescriptionClassName = () =>
    mergeDescriptionClassName(props.toast.descriptionClassName, props.toast.descriptionClass);
  const toastClassNames = () => mergeClassNames(props.toast.classNames, props.toast.classes);
  const closeButton = () => props.toast.closeButton ?? props.closeButton;
  const duration = () => props.toast.duration ?? props.duration ?? TOAST_LIFETIME;
  const invert = () => props.toast.invert ?? props.invert;
  const disabled = () => toastType() === 'loading';
  // Toasts created with `toast()` have no type, `classNames.default` is the key for those.
  const toastTypeKey = () => (toastType() ?? 'default') as keyof ToastClassnames;
  const swipeDirections = () => props.swipeDirections ?? getDefaultSwipeDirections(props.position);
  const y = createMemo(() => props.position.split('-')[0]);
  const x = createMemo(() => props.position.split('-')[1]);
  const heightIndex = createMemo(() =>
    Math.max(
      0,
      props.heights.findIndex((height) => height.toastId === props.toast.id),
    ),
  );
  const toastsHeightBefore = createMemo(() => {
    return props.heights.reduce((prev, curr, reducerIndex) => {
      if (reducerIndex >= heightIndex()) return prev;

      return prev + curr.height;
    }, 0);
  });
  const offset = createMemo(() => heightIndex() * (props.gap ?? GAP) + toastsHeightBefore());
  const isDocumentHidden = useIsDocumentHidden();
  const title = createMemo(() => resolveContent(props.toast.title));
  const description = createMemo(() => resolveContent(props.toast.description));

  createEffect(duration, (value) => {
    remainingTime = value;
  });

  function deleteToast() {
    setRemoved(true);
    setOffsetBeforeRemove(offset());
    props.setHeights((heights) => heights.filter((height) => height.toastId !== props.toast.id));

    window.setTimeout(() => {
      props.removeToast(props.toast);
    }, TIME_BEFORE_UNMOUNT);
  }

  function getLoadingIcon() {
    if (props.icons?.loading) {
      return (
        <div
          class={cn(classNames()?.loader, toastClassNames()?.loader, 'sonner-loader')}
          data-visible={boolAttr(toastType() === 'loading')}
        >
          {props.icons.loading}
        </div>
      );
    }

    return (
      <Loader
        class={cn(classNames()?.loader, toastClassNames()?.loader)}
        visible={toastType() === 'loading'}
      />
    );
  }

  const icon = () =>
    props.toast.icon ?? props.icons?.[toastType() as keyof ToastIcons] ?? getAsset(toastType());

  const heightEntry = () => ({
    toastId: props.toast.id,
    toasterId: props.toast.toasterId,
    position: props.toast.position,
  });

  createEffect(heightEntry, (entry) => {
    setMounted(true);

    if (!toastRef) return;

    const height = measureUnstackedHeight(toastRef);
    setInitialHeight(height);
    props.setHeights((h) => [{ ...entry, height }, ...h]);

    return () => {
      props.setHeights((h) => h.filter((height) => height.toastId !== entry.toastId));
    };
  });

  createEffect(
    () => {
      title();
      description();
      return mounted() ? heightEntry() : undefined;
    },
    (entry) => {
      if (!entry || !toastRef) return;

      const nextHeight = measureUnstackedHeight(toastRef);
      setInitialHeight(nextHeight);

      props.setHeights((heights) => {
        if (!heights.some((height) => height.toastId === entry.toastId))
          return [{ ...entry, height: nextHeight }, ...heights];

        return heights.map((height) =>
          height.toastId === entry.toastId ? { ...height, height: nextHeight } : height,
        );
      });
    },
  );

  createEffect(
    () => ({
      shouldPause:
        props.expanded ||
        props.interacting ||
        ((props.pauseWhenPageIsHidden ?? true) && isDocumentHidden()),
      hasTimer: toastType() !== 'loading' && props.toast.duration !== Number.POSITIVE_INFINITY,
      duration: duration(),
    }),
    ({ shouldPause, hasTimer }) => {
      if (!hasTimer) return;

      if (shouldPause) {
        if (lastCloseTimerStartTimeRef < closeTimerStartTimeRef) {
          const elapsedTime = new Date().getTime() - closeTimerStartTimeRef;
          remainingTime -= elapsedTime;
        }

        lastCloseTimerStartTimeRef = new Date().getTime();
        return;
      }

      if (remainingTime === Number.POSITIVE_INFINITY) return;

      closeTimerStartTimeRef = new Date().getTime();
      const timeoutId = setTimeout(() => {
        props.toast.onAutoClose?.(props.toast);
        deleteToast();
      }, remainingTime);

      return () => clearTimeout(timeoutId);
    },
  );

  createEffect(
    () => props.toast.delete,
    (shouldDelete) => {
      if (!shouldDelete) return;
      untrack(() => {
        deleteToast();
        props.toast.onDismiss?.(props.toast);
      });
    },
  );

  return (
    <li
      tabindex={0}
      ref={(el) => (toastRef = el)}
      class={cn(
        className(),
        toastClassName(),
        classNames()?.toast,
        toastClassNames()?.toast,
        classNames()?.[toastTypeKey()],
        toastClassNames()?.[toastTypeKey()],
      )}
      data-sonner-toast=""
      data-rich-colors={boolAttr(props.toast.richColors ?? props.defaultRichColors)}
      data-styled={boolAttr(!(props.toast.jsx || props.toast.unstyled || props.unstyled))}
      data-mounted={boolAttr(mounted())}
      data-promise={boolAttr(Boolean(props.toast.promise))}
      data-swiped={boolAttr(isSwiped())}
      data-removed={boolAttr(removed())}
      data-visible={boolAttr(isVisible())}
      data-y-position={y()}
      data-x-position={x()}
      data-index={props.index}
      data-front={boolAttr(isFront())}
      data-swiping={boolAttr(swiping())}
      data-dismissible={boolAttr(dismissible())}
      data-type={toastType()}
      data-invert={boolAttr(invert())}
      data-swipe-out={boolAttr(swipeOut())}
      data-swipe-direction={swipeOutDirection()}
      data-expanded={boolAttr(Boolean(props.expanded || (props.expandByDefault && mounted())))}
      data-testid={props.toast.testId}
      style={{
        '--index': props.index,
        '--toasts-before': props.index,
        '--z-index': props.toasts.length - props.index,
        '--offset': `${removed() ? offsetBeforeRemove() : offset()}px`,
        '--initial-height': props.expandByDefault ? 'auto' : `${initialHeight()}px`,
        ...props.style,
        ...props.toast.style,
      }}
      onDragEnd={() => {
        setSwiping(false);
        swipeDirection = null;
        pointerStart = null;
      }}
      onPointerDown={(event) => {
        if (event.button === 2) return;
        if (disabled() || !dismissible()) return;
        if ((event.target as HTMLElement).closest('button')) return;
        dragStartTime = new Date();
        setOffsetBeforeRemove(offset());
        event.currentTarget.setPointerCapture(event.pointerId);
        setSwiping(true);
        pointerStart = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => {
        if (swipeOut() || !dismissible()) return;

        pointerStart = null;

        const swipeAmountX = Number(
          toastRef?.style.getPropertyValue('--swipe-amount-x').replace('px', '') || 0,
        );
        const swipeAmountY = Number(
          toastRef?.style.getPropertyValue('--swipe-amount-y').replace('px', '') || 0,
        );
        const timeTaken = Math.max(1, new Date().getTime() - (dragStartTime?.getTime() ?? 0));
        const swipeAmount = swipeDirection === 'x' ? swipeAmountX : swipeAmountY;
        const velocity = Math.abs(swipeAmount) / timeTaken;

        // Movement towards a direction that isn't allowed is dampened, not
        // blocked, so a fast flick can still pass the velocity check. Only
        // dismiss if the direction is allowed.
        const isAllowedDirection =
          swipeDirection === 'x'
            ? swipeDirections().includes(swipeAmountX > 0 ? 'right' : 'left')
            : swipeDirections().includes(swipeAmountY > 0 ? 'bottom' : 'top');

        if (isAllowedDirection && (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11)) {
          setOffsetBeforeRemove(offset());
          props.toast.onDismiss?.(props.toast);

          if (swipeDirection === 'x') setSwipeOutDirection(swipeAmountX > 0 ? 'right' : 'left');
          else setSwipeOutDirection(swipeAmountY > 0 ? 'down' : 'up');

          deleteToast();
          setSwipeOut(true);
          return;
        }

        toastRef?.style.setProperty('--swipe-amount-x', '0px');
        toastRef?.style.setProperty('--swipe-amount-y', '0px');
        setIsSwiped(false);
        setSwiping(false);
        swipeDirection = null;
      }}
      onPointerMove={(event) => {
        if (!pointerStart || !dismissible()) return;

        if ((window.getSelection()?.toString().length ?? 0) > 0) return;

        const yDelta = event.clientY - pointerStart.y;
        const xDelta = event.clientX - pointerStart.x;

        if (!swipeDirection && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1))
          swipeDirection = Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y';

        const swipeAmount = { x: 0, y: 0 };

        const getDampening = (delta: number) => {
          const factor = Math.abs(delta) / 20;
          return 1 / (1.5 + factor);
        };

        if (swipeDirection === 'y') {
          if (swipeDirections().includes('top') || swipeDirections().includes('bottom')) {
            if (
              (swipeDirections().includes('top') && yDelta < 0) ||
              (swipeDirections().includes('bottom') && yDelta > 0)
            )
              swipeAmount.y = yDelta;
            else {
              // Ensure we don't jump when transitioning to dampened movement
              const dampenedDelta = yDelta * getDampening(yDelta);
              swipeAmount.y = Math.abs(dampenedDelta) < Math.abs(yDelta) ? dampenedDelta : yDelta;
            }
          }
        } else if (swipeDirection === 'x') {
          if (swipeDirections().includes('left') || swipeDirections().includes('right')) {
            if (
              (swipeDirections().includes('left') && xDelta < 0) ||
              (swipeDirections().includes('right') && xDelta > 0)
            )
              swipeAmount.x = xDelta;
            else {
              // Ensure we don't jump when transitioning to dampened movement
              const dampenedDelta = xDelta * getDampening(xDelta);
              swipeAmount.x = Math.abs(dampenedDelta) < Math.abs(xDelta) ? dampenedDelta : xDelta;
            }
          }
        }

        if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) setIsSwiped(true);

        toastRef?.style.setProperty('--swipe-amount-x', `${swipeAmount.x}px`);
        toastRef?.style.setProperty('--swipe-amount-y', `${swipeAmount.y}px`);
      }}
    >
      <Show when={closeButton() && !props.toast.jsx && toastType() !== 'loading'}>
        <button
          aria-label={props.closeButtonAriaLabel ?? 'Close toast'}
          data-disabled={boolAttr(disabled())}
          data-close-button
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={() => {
            if (disabled() || !dismissible()) return;
            deleteToast();
            props.toast.onDismiss?.(props.toast);
          }}
          class={cn(classNames()?.closeButton, toastClassNames()?.closeButton)}
        >
          {props.icons?.close ?? <CloseIcon />}
        </button>
      </Show>

      <Show
        when={
          (toastType() || props.toast.icon || props.toast.promise) &&
          props.toast.icon !== null &&
          (props.icons?.[toastType() as keyof ToastIcons] !== null || props.toast.icon)
        }
      >
        <div data-icon="" class={cn(classNames()?.icon, toastClassNames()?.icon)}>
          {/* Promise toasts keep the loader mounted after they settle so it can animate out */}
          {toastType() === 'loading'
            ? props.toast.icon || getLoadingIcon()
            : props.toast.promise
              ? getLoadingIcon()
              : null}
          {toastType() !== 'loading' ? icon() : null}
        </div>
      </Show>

      <div data-content="" class={cn(classNames()?.content, toastClassNames()?.content)}>
        <div data-title="" class={cn(classNames()?.title, toastClassNames()?.title)}>
          {props.toast.jsx ? props.toast.jsx : title()}
        </div>
        <Show when={props.toast.description}>
          <div
            data-description=""
            class={cn(
              descriptionClassName(),
              toastDescriptionClassName(),
              classNames()?.description,
              toastClassNames()?.description,
            )}
          >
            {description()}
          </div>
        </Show>
      </div>

      <Show when={props.toast.cancel}>
        {(cancel) => (
          <Show
            when={!isAction(cancel())}
            fallback={
              <button
                data-button
                data-cancel
                style={props.toast.cancelButtonStyle ?? props.cancelButtonStyle}
                onClick={(event) => {
                  const currentCancel = cancel() as Action;
                  if (!dismissible()) return;
                  currentCancel.onClick?.(event);
                  deleteToast();
                }}
                class={cn(classNames()?.cancelButton, toastClassNames()?.cancelButton)}
              >
                {(cancel() as Action).label}
              </button>
            }
          >
            {cancel() as JSX.Element}
          </Show>
        )}
      </Show>

      <Show when={props.toast.action}>
        {(action) => (
          <Show
            when={!isAction(action())}
            fallback={
              <button
                data-button
                data-action
                style={props.toast.actionButtonStyle ?? props.actionButtonStyle}
                onClick={(event) => {
                  const currentAction = action() as Action;
                  currentAction.onClick?.(event);
                  if (event.defaultPrevented) return;
                  deleteToast();
                }}
                class={cn(classNames()?.actionButton, toastClassNames()?.actionButton)}
              >
                {(action() as Action).label}
              </button>
            }
          >
            {action() as JSX.Element}
          </Show>
        )}
      </Show>
    </li>
  );
}

function Toaster(props: ToasterProps) {
  const documentDirection = getDocumentDirection();
  const position = () => props.position ?? 'bottom-right';
  const hotkey = () => props.hotkey ?? ['altKey', 'KeyT'];
  const theme = () => props.theme ?? 'light';
  const gap = () => props.gap ?? GAP;
  const visibleToasts = () => props.visibleToasts ?? VISIBLE_TOASTS_AMOUNT;
  const dir = () => props.dir ?? documentDirection;
  const containerAriaLabel = () => props.containerAriaLabel ?? 'Notifications';

  const [toastsStore, setToastsStore] = createStore<{ oldestFirst: ToastT[] }>({ oldestFirst: [] });
  const filteredToasts = createMemo(() => {
    const toasts = toastsStore.oldestFirst;
    const visible = props.id
      ? toasts.filter((toast) => toast.toasterId === props.id)
      : toasts.filter((toast) => !toast.toasterId);

    return visible.reverse();
  });
  const possiblePositions = createMemo(() => {
    return Array.from(
      new Set([
        position(),
        ...filteredToasts()
          .filter((toast) => toast.position)
          .map((toast) => toast.position as Position),
      ]),
    );
  });
  const [heights, setHeights] = createSignal<HeightT[]>([]);
  const [expanded, setExpanded] = createSignal(false);
  const [interacting, setInteracting] = createSignal(false);
  const [actualTheme, setActualTheme] = createSignal(() => createToastTheme(theme()));
  let lastFocusedElement: HTMLElement | null = null;
  let isFocusWithin = false;
  let listRef: HTMLOListElement | undefined;

  const hotkeyLabel = () => hotkey().join('+').replace(/Key/g, '').replace(/Digit/g, '');
  const className = () => mergeClassName(props.className, props.class);
  const toastOptions = () => props.toastOptions as ToastOptions | undefined;
  const toastClassNames = () =>
    mergeClassNames(toastOptions()?.classNames, toastOptions()?.classes);
  const toastDescriptionClassName = () =>
    mergeDescriptionClassName(
      toastOptions()?.descriptionClassName,
      toastOptions()?.descriptionClass,
    );
  const toastClassName = () => mergeClassName(toastOptions()?.className, toastOptions()?.class);

  const removeToast = (toastToRemove: ToastT) => {
    setToastsStore((draft) => {
      const index = draft.oldestFirst.findIndex((toast) => toast.id === toastToRemove.id);
      if (index === -1) return;
      if (!draft.oldestFirst[index]!.delete) ToastState.dismiss(toastToRemove.id);
      draft.oldestFirst.splice(index, 1);
    });
  };

  onSettled(() =>
    ToastState.subscribe((toastItem) => {
      if ((toastItem as ToastToDismiss).dismiss) {
        requestAnimationFrame(() => {
          setToastsStore((draft) => {
            for (const toast of draft.oldestFirst)
              if (toast.id === toastItem.id) toast.delete = true;
          });
        });
        return;
      }

      const nextToast = toastItem as ToastT;
      // `toast()` may run while a component renders, where Solid 2 rejects writes.
      // Upstream defers the same write with setTimeout.
      queueMicrotask(() =>
        setToastsStore((draft) => {
          const existing = draft.oldestFirst.find((toast) => toast.id === nextToast.id);
          if (existing) reconcile(nextToast)(existing);
          else draft.oldestFirst.push(nextToast);
        }),
      );
    }),
  );

  createEffect(theme, (current) => {
    if (current !== 'system') return;

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = ({ matches }: MediaQueryListEvent | MediaQueryList) => {
      setActualTheme(matches ? 'dark' : 'light');
    };

    try {
      darkMediaQuery.addEventListener('change', updateTheme);
      return () => darkMediaQuery.removeEventListener('change', updateTheme);
    } catch {
      darkMediaQuery.addListener(updateTheme);
      return () => darkMediaQuery.removeListener(updateTheme);
    }
  });

  createEffect(
    () => filteredToasts().length <= 1,
    (collapse) => {
      if (collapse) setExpanded(false);
    },
  );

  onSettled(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed =
        hotkey().length > 0 && hotkey().every((key) => (event as any)[key] || event.code === key);

      if (isHotkeyPressed) {
        setExpanded(true);
        listRef?.focus();
      }

      if (
        event.code === 'Escape' &&
        (document.activeElement === listRef || listRef?.contains(document.activeElement))
      )
        setExpanded(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Firefox fires no focusout when the focused toast is removed, so focus also
  // returns when the list unmounts with its last toast.
  createEffect(
    () => filteredToasts().length > 0,
    (hasToasts) => {
      if (!hasToasts) return;
      return () => {
        if (lastFocusedElement) {
          lastFocusedElement.focus({ preventScroll: true });
          lastFocusedElement = null;
          isFocusWithin = false;
        }
      };
    },
  );

  return (
    <section
      aria-label={props.customAriaLabel ?? `${containerAriaLabel()} ${hotkeyLabel()}`}
      tabindex={-1}
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      data-react-aria-top-layer
    >
      <For each={possiblePositions()}>
        {(position, index) => {
          const [y, x] = position.split('-');
          const toastsByPosition = createMemo(() =>
            filteredToasts().filter(
              (toast) => (!toast.position && index() === 0) || toast.position === position,
            ),
          );
          const heightsByPosition = createMemo(() => {
            const byToastId = new Map(heights().map((height) => [height.toastId, height]));
            return toastsByPosition().flatMap((toast) => byToastId.get(toast.id) ?? []);
          });

          return (
            <Show when={filteredToasts().length > 0}>
              <ol
                tabindex={-1}
                ref={(el) => (listRef = el)}
                dir={dir() === 'auto' ? getDocumentDirection() : dir()}
                class={className()}
                data-sonner-toaster
                data-sonner-theme={actualTheme()}
                data-y-position={y}
                data-x-position={x}
                style={{
                  '--front-toast-height': `${heightsByPosition()[0]?.height ?? 0}px`,
                  '--width': `${TOAST_WIDTH}px`,
                  '--gap': `${gap()}px`,
                  ...props.style,
                  ...assignOffset(props.offset, props.mobileOffset),
                }}
                onFocusOut={(event) => {
                  if (
                    isFocusWithin &&
                    !event.currentTarget.contains(event.relatedTarget as Node | null)
                  ) {
                    isFocusWithin = false;
                    if (lastFocusedElement) {
                      lastFocusedElement.focus({ preventScroll: true });
                      lastFocusedElement = null;
                    }
                  }
                }}
                onFocusIn={(event) => {
                  const isNotDismissible =
                    event.target instanceof HTMLElement &&
                    event.target.dataset.dismissible === 'false';
                  if (isNotDismissible) return;

                  if (!isFocusWithin) {
                    isFocusWithin = true;
                    lastFocusedElement = event.relatedTarget as HTMLElement | null;
                  }
                }}
                onMouseEnter={() => setExpanded(true)}
                onMouseMove={() => setExpanded(true)}
                onMouseLeave={() => {
                  if (!interacting()) setExpanded(false);
                }}
                onDragEnd={() => setExpanded(false)}
                onPointerDown={(event) => {
                  const isNotDismissible =
                    event.target instanceof HTMLElement &&
                    event.target.dataset.dismissible === 'false';
                  if (isNotDismissible) return;
                  setInteracting(true);
                }}
                onPointerUp={() => setInteracting(false)}
              >
                <For each={toastsByPosition()}>
                  {(toastItem, toastIndex) => (
                    <Toast
                      icons={props.icons}
                      index={toastIndex()}
                      toast={toastItem}
                      defaultRichColors={props.richColors}
                      duration={toastOptions()?.duration ?? props.duration}
                      class={toastClassName()}
                      descriptionClassName={toastDescriptionClassName()}
                      invert={Boolean(props.invert)}
                      visibleToasts={visibleToasts()}
                      closeButton={toastOptions()?.closeButton ?? props.closeButton ?? false}
                      interacting={interacting()}
                      position={position as Position}
                      style={toastOptions()?.style}
                      unstyled={toastOptions()?.unstyled}
                      classNames={toastClassNames()}
                      cancelButtonStyle={toastOptions()?.cancelButtonStyle}
                      actionButtonStyle={toastOptions()?.actionButtonStyle}
                      closeButtonAriaLabel={toastOptions()?.closeButtonAriaLabel}
                      removeToast={removeToast}
                      toasts={toastsByPosition()}
                      heights={heightsByPosition()}
                      setHeights={setHeights}
                      expandByDefault={Boolean(props.expand)}
                      gap={gap()}
                      expanded={expanded()}
                      swipeDirections={props.swipeDirections}
                      pauseWhenPageIsHidden={props.pauseWhenPageIsHidden}
                    />
                  )}
                </For>
              </ol>
            </Show>
          );
        }}
      </For>
    </section>
  );
}

export { toast, Toaster, useSonner };
export type { Action, ExternalToast, ToastClassnames, ToastT, ToastToDismiss, ToasterProps };

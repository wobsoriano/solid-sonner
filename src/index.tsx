/*!
 * Original code by Emil Kowalski
 * MIT Licensed, Copyright 2023 Emil Kowalski, see https://github.com/emilkowalski/sonner/blob/main/LICENSE.md for details
 *
 * Credits:
 * https://github.com/emilkowalski/sonner/blob/main/src/index.tsx
 */
import cssText from './styles.css?inline';
import type { JSX } from 'solid-js';
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  onMount,
} from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
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

// Styles ship inside the bundle and are injected on import, the same way the
// React original does it. The attribute keeps a second import from stacking a
// duplicate tag; `./styles.css` is also exported for consumers who'd rather
// bring their own.
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

function useSonner() {
  // Starts empty: subscribing replays whatever is already active.
  const [activeToasts, setActiveToasts] = createSignal<ToastT[]>([]);

  onMount(() => {
    const unsubscribe = ToastState.subscribe((toastItem) => {
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
    });

    onCleanup(unsubscribe);
  });

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

/* eslint-disable solid/reactivity */
function Toast(props: ToastProps) {
  const [mounted, setMounted] = createSignal(false);
  const [removed, setRemoved] = createSignal(false);
  const [swiping, setSwiping] = createSignal(false);
  const [swipeOut, setSwipeOut] = createSignal(false);
  const [isSwiped, setIsSwiped] = createSignal(false);
  const [swipeDirection, setSwipeDirection] = createSignal<'x' | 'y' | null>(null);
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
  const [pointerStartRef, setPointerStartRef] = createSignal<{ x: number; y: number } | null>(null);

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

  createEffect(() => {
    remainingTime = duration();
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
          data-visible={toastType() === 'loading'}
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

  onMount(() => {
    setMounted(true);

    if (!toastRef) return;

    const height = toastRef.getBoundingClientRect().height;
    setInitialHeight(height);
    props.setHeights((h) => [
      {
        toastId: props.toast.id,
        toasterId: props.toast.toasterId,
        height,
        position: props.toast.position,
      },
      ...h,
    ]);

    onCleanup(() => {
      props.setHeights((h) => h.filter((height) => height.toastId !== props.toast.id));
    });
  });

  createEffect(() => {
    if (!mounted() || !toastRef) return;

    resolveContent(props.toast.title);
    resolveContent(props.toast.description);

    const originalHeight = toastRef.style.height;
    toastRef.style.height = 'auto';
    const nextHeight = toastRef.getBoundingClientRect().height;
    toastRef.style.height = originalHeight;

    setInitialHeight(nextHeight);

    props.setHeights((heights) => {
      const alreadyExists = heights.find((height) => height.toastId === props.toast.id);
      if (!alreadyExists)
        return [
          {
            toastId: props.toast.id,
            toasterId: props.toast.toasterId,
            height: nextHeight,
            position: props.toast.position,
          },
          ...heights,
        ];

      return heights.map((height) =>
        height.toastId === props.toast.id ? { ...height, height: nextHeight } : height,
      );
    });
  });

  createEffect(
    on(
      () =>
        [
          props.expanded,
          props.interacting,
          props.toast,
          toastType(),
          isDocumentHidden(),
          duration(),
        ] as const,
      ([expanded, interacting, currentToast, currentType]) => {
        if (
          (currentToast.promise && currentType === 'loading') ||
          currentToast.duration === Number.POSITIVE_INFINITY ||
          currentType === 'loading'
        )
          return;

        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const pauseTimer = () => {
          if (lastCloseTimerStartTimeRef < closeTimerStartTimeRef) {
            const elapsedTime = new Date().getTime() - closeTimerStartTimeRef;
            remainingTime -= elapsedTime;
          }

          lastCloseTimerStartTimeRef = new Date().getTime();
        };

        const startTimer = () => {
          if (remainingTime === Number.POSITIVE_INFINITY) return;

          closeTimerStartTimeRef = new Date().getTime();
          timeoutId = setTimeout(() => {
            currentToast.onAutoClose?.(currentToast);
            deleteToast();
          }, remainingTime);
        };

        const shouldPause =
          expanded || interacting || ((props.pauseWhenPageIsHidden ?? true) && isDocumentHidden());

        if (shouldPause) pauseTimer();
        else startTimer();

        onCleanup(() => {
          if (timeoutId) clearTimeout(timeoutId);
        });
      },
    ),
  );

  createEffect(
    on(
      () => props.toast.delete,
      (shouldDelete) => {
        if (shouldDelete) {
          deleteToast();
          props.toast.onDismiss?.(props.toast);
        }
      },
    ),
  );

  return (
    <li
      tabIndex={0}
      ref={toastRef}
      class={cn(
        className(),
        toastClassName(),
        classNames()?.toast,
        toastClassNames()?.toast,
        classNames()?.[toastTypeKey()],
        toastClassNames()?.[toastTypeKey()],
      )}
      data-sonner-toast=""
      data-rich-colors={props.toast.richColors ?? props.defaultRichColors}
      data-styled={!(props.toast.jsx || props.toast.unstyled || props.unstyled)}
      data-mounted={mounted()}
      data-promise={Boolean(props.toast.promise)}
      data-swiped={isSwiped()}
      data-removed={removed()}
      data-visible={isVisible()}
      data-y-position={y()}
      data-x-position={x()}
      data-index={props.index}
      data-front={isFront()}
      data-swiping={swiping()}
      data-dismissible={dismissible()}
      data-type={toastType()}
      data-invert={invert()}
      data-swipe-out={swipeOut()}
      data-swipe-direction={swipeOutDirection()}
      data-expanded={Boolean(props.expanded || (props.expandByDefault && mounted()))}
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
        setSwipeDirection(null);
        setPointerStartRef(null);
      }}
      onPointerDown={(event) => {
        if (event.button === 2) return;
        if (disabled() || !dismissible()) return;
        if ((event.target as HTMLElement).closest('button')) return;
        dragStartTime = new Date();
        setOffsetBeforeRemove(offset());
        event.currentTarget.setPointerCapture(event.pointerId);
        setSwiping(true);
        setPointerStartRef({ x: event.clientX, y: event.clientY });
      }}
      onPointerUp={() => {
        if (swipeOut() || !dismissible()) return;

        setPointerStartRef(null);

        const swipeAmountX = Number(
          toastRef?.style.getPropertyValue('--swipe-amount-x').replace('px', '') || 0,
        );
        const swipeAmountY = Number(
          toastRef?.style.getPropertyValue('--swipe-amount-y').replace('px', '') || 0,
        );
        const timeTaken = Math.max(1, new Date().getTime() - (dragStartTime?.getTime() ?? 0));
        const swipeAmount = swipeDirection() === 'x' ? swipeAmountX : swipeAmountY;
        const velocity = Math.abs(swipeAmount) / timeTaken;

        // Movement towards a direction that isn't allowed is dampened, not
        // blocked, so a fast flick can still pass the velocity check. Only
        // dismiss if the direction is allowed.
        const isAllowedDirection =
          swipeDirection() === 'x'
            ? swipeDirections().includes(swipeAmountX > 0 ? 'right' : 'left')
            : swipeDirections().includes(swipeAmountY > 0 ? 'bottom' : 'top');

        if (isAllowedDirection && (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11)) {
          setOffsetBeforeRemove(offset());
          props.toast.onDismiss?.(props.toast);

          if (swipeDirection() === 'x') setSwipeOutDirection(swipeAmountX > 0 ? 'right' : 'left');
          else setSwipeOutDirection(swipeAmountY > 0 ? 'down' : 'up');

          deleteToast();
          setSwipeOut(true);
          return;
        }

        toastRef?.style.setProperty('--swipe-amount-x', '0px');
        toastRef?.style.setProperty('--swipe-amount-y', '0px');
        setIsSwiped(false);
        setSwiping(false);
        setSwipeDirection(null);
      }}
      onPointerMove={(event) => {
        if (!pointerStartRef() || !dismissible()) return;

        if ((window.getSelection()?.toString().length ?? 0) > 0) return;

        const yDelta = event.clientY - pointerStartRef()!.y;
        const xDelta = event.clientX - pointerStartRef()!.x;

        if (!swipeDirection() && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1))
          setSwipeDirection(Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y');

        const swipeAmount = { x: 0, y: 0 };

        const getDampening = (delta: number) => {
          const factor = Math.abs(delta) / 20;
          return 1 / (1.5 + factor);
        };

        if (swipeDirection() === 'y') {
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
        } else if (swipeDirection() === 'x') {
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
          data-disabled={disabled()}
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
          {props.toast.jsx ? props.toast.jsx : resolveContent(props.toast.title)}
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
            {resolveContent(props.toast.description)}
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

/* eslint-enable solid/reactivity */

function Toaster(props: ToasterProps) {
  /* eslint-disable solid/reactivity */
  const propsWithDefaults = mergeProps(
    {
      position: 'bottom-right' as Position,
      hotkey: ['altKey', 'KeyT'],
      theme: 'light' as const,
      gap: GAP,
      visibleToasts: VISIBLE_TOASTS_AMOUNT,
      dir: getDocumentDirection(),
      containerAriaLabel: 'Notifications',
    },
    props,
  );
  const initialTheme = createToastTheme(propsWithDefaults.theme);

  const [toastsStore, setToastsStore] = createStore<{ toasts: ToastT[] }>({ toasts: [] });
  const filteredToasts = createMemo(() => {
    const toasts = toastsStore.toasts;
    if (propsWithDefaults.id)
      return toasts.filter((toast) => toast.toasterId === propsWithDefaults.id);

    return toasts.filter((toast) => !toast.toasterId);
  });
  const possiblePositions = createMemo(() => {
    return Array.from(
      new Set([
        propsWithDefaults.position,
        ...filteredToasts()
          .filter((toast) => toast.position)
          .map((toast) => toast.position as Position),
      ]),
    );
  });
  const [heights, setHeights] = createSignal<HeightT[]>([]);
  const [expanded, setExpanded] = createSignal(false);
  const [interacting, setInteracting] = createSignal(false);
  const [actualTheme, setActualTheme] = createSignal(initialTheme);
  const [lastFocusedElementRef, setLastFocusedElementRef] = createSignal<HTMLElement | null>(null);
  const [isFocusWithinRef, setIsFocusWithinRef] = createSignal(false);
  let listRef: HTMLOListElement | undefined;

  const hotkeyLabel = () =>
    propsWithDefaults.hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');
  const className = () => mergeClassName(propsWithDefaults.className, propsWithDefaults.class);
  const toastOptions = () => propsWithDefaults.toastOptions as ToastOptions | undefined;
  const toastClassNames = () =>
    mergeClassNames(toastOptions()?.classNames, toastOptions()?.classes);
  const toastDescriptionClassName = () =>
    mergeDescriptionClassName(
      toastOptions()?.descriptionClassName,
      toastOptions()?.descriptionClass,
    );
  const toastClassName = () => mergeClassName(toastOptions()?.className, toastOptions()?.class);

  const removeToast = (toastToRemove: ToastT) => {
    setToastsStore('toasts', (toasts) => {
      if (!toasts.find((toast) => toast.id === toastToRemove.id)?.delete)
        ToastState.dismiss(toastToRemove.id);

      return toasts.filter(({ id }) => id !== toastToRemove.id);
    });
  };

  onMount(() => {
    const unsubscribe = ToastState.subscribe((toastItem) => {
      if ((toastItem as ToastToDismiss).dismiss) {
        requestAnimationFrame(() => {
          setToastsStore(
            'toasts',
            produce((toasts) => {
              toasts.forEach((toast) => {
                if (toast.id === toastItem.id) toast.delete = true;
              });
            }),
          );
        });
        return;
      }

      const nextToast = toastItem as ToastT;
      const indexOfExistingToast = toastsStore.toasts.findIndex((t) => t.id === nextToast.id);

      if (indexOfExistingToast !== -1) {
        setToastsStore('toasts', indexOfExistingToast, reconcile(nextToast));
        return;
      }

      setToastsStore(
        'toasts',
        produce((toasts) => {
          toasts.unshift(nextToast);
        }),
      );
    });

    onCleanup(unsubscribe);
  });

  createEffect(() => {
    const theme = propsWithDefaults.theme;
    if (theme !== 'system') {
      setActualTheme(theme);
      return;
    }

    if (typeof window === 'undefined') return;

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = ({ matches }: MediaQueryListEvent | MediaQueryList) => {
      setActualTheme(matches ? 'dark' : 'light');
    };

    updateTheme(darkMediaQuery);

    try {
      darkMediaQuery.addEventListener('change', updateTheme);
      onCleanup(() => darkMediaQuery.removeEventListener('change', updateTheme));
    } catch {
      darkMediaQuery.addListener(updateTheme);
      onCleanup(() => darkMediaQuery.removeListener(updateTheme));
    }
  });

  createEffect(() => {
    if (filteredToasts().length <= 1) setExpanded(false);
  });

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed =
        propsWithDefaults.hotkey.length > 0 &&
        propsWithDefaults.hotkey.every((key) => (event as any)[key] || event.code === key);

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
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  onCleanup(() => {
    if (lastFocusedElementRef()) {
      lastFocusedElementRef()?.focus({ preventScroll: true });
      setLastFocusedElementRef(null);
      setIsFocusWithinRef(false);
    }
  });

  return (
    <section
      aria-label={
        propsWithDefaults.customAriaLabel ??
        `${propsWithDefaults.containerAriaLabel} ${hotkeyLabel()}`
      }
      tabIndex={-1}
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
          const heightsByPosition = createMemo(() =>
            heights().filter(
              (height) => (index() === 0 && !height.position) || height.position === position,
            ),
          );

          return (
            <Show when={filteredToasts().length > 0}>
              <ol
                tabIndex={-1}
                ref={listRef}
                dir={
                  propsWithDefaults.dir === 'auto' ? getDocumentDirection() : propsWithDefaults.dir
                }
                class={className()}
                data-sonner-toaster
                data-sonner-theme={actualTheme()}
                data-y-position={y}
                data-x-position={x}
                style={{
                  '--front-toast-height': `${heightsByPosition()[0]?.height ?? 0}px`,
                  '--width': `${TOAST_WIDTH}px`,
                  '--gap': `${propsWithDefaults.gap}px`,
                  ...propsWithDefaults.style,
                  ...assignOffset(propsWithDefaults.offset, propsWithDefaults.mobileOffset),
                }}
                onBlur={(event) => {
                  if (
                    isFocusWithinRef() &&
                    !event.currentTarget.contains(event.relatedTarget as Node | null)
                  ) {
                    setIsFocusWithinRef(false);
                    if (lastFocusedElementRef()) {
                      lastFocusedElementRef()?.focus({ preventScroll: true });
                      setLastFocusedElementRef(null);
                    }
                  }
                }}
                onFocus={(event) => {
                  const isNotDismissible =
                    event.target instanceof HTMLElement &&
                    event.target.dataset.dismissible === 'false';
                  if (isNotDismissible) return;

                  if (!isFocusWithinRef()) {
                    setIsFocusWithinRef(true);
                    setLastFocusedElementRef(event.relatedTarget as HTMLElement | null);
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
                      icons={propsWithDefaults.icons}
                      index={toastIndex()}
                      toast={toastItem}
                      defaultRichColors={propsWithDefaults.richColors}
                      duration={toastOptions()?.duration ?? propsWithDefaults.duration}
                      class={toastClassName()}
                      descriptionClassName={toastDescriptionClassName()}
                      invert={Boolean(propsWithDefaults.invert)}
                      visibleToasts={propsWithDefaults.visibleToasts}
                      closeButton={
                        toastOptions()?.closeButton ?? propsWithDefaults.closeButton ?? false
                      }
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
                      expandByDefault={Boolean(propsWithDefaults.expand)}
                      gap={propsWithDefaults.gap}
                      expanded={expanded()}
                      swipeDirections={propsWithDefaults.swipeDirections}
                      pauseWhenPageIsHidden={propsWithDefaults.pauseWhenPageIsHidden}
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

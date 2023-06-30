import './styles.css';
import { getAsset, Loader } from './assets';
import { HeightT, Position, ToastT, ToastToDismiss, ExternalToast, ToasterProps } from './types';
import { ToastState, toast } from './state';
import { Component, createComputed, createEffect, createMemo, createSignal, For, mergeProps, onCleanup, onMount, Setter, Show } from 'solid-js';

// Visible toasts amount
const VISIBLE_TOASTS_AMOUNT = 3;

// Viewport padding
const VIEWPORT_OFFSET = '32px';

// Default lifetime of a toasts (in ms)
const TOAST_LIFETIME = 4000;

// Default toast width
const TOAST_WIDTH = 356;

// Default gap between toasts
const GAP = 14;

const SWIPE_TRESHOLD = 20;

const TIME_BEFORE_UNMOUNT = 200;

interface ToastProps {
  toast: ToastT;
  toasts: ToastT[];
  index: number;
  expanded: boolean;
  invert: boolean;
  heights: HeightT[];
  setHeights: Setter<HeightT[]>;
  removeToast: (toast: ToastT) => void;
  position: Position;
  visibleToasts: number;
  expandByDefault: boolean;
  closeButton: boolean;
  interacting: boolean;
  style?: Record<string, any>;
  duration?: number;
  className?: string;
  descriptionClassName?: string;
}

const Toast: Component<ToastProps> = (props) => {
  const [mounted, setMounted] = createSignal(false);
  const [removed, setRemoved] = createSignal(false);
  const [swiping, setSwiping] = createSignal(false);
  const [swipeOut, setSwipeOut] = createSignal(false);
  const [offsetBeforeRemove, setOffsetBeforeRemove] = createSignal(0);
  const [initialHeight, setInitialHeight] = createSignal(0);
  let toastRef: HTMLLIElement
  const isFront = props.index === 0;
  const isVisible = props.index + 1 <= props.visibleToasts;
  const toastType = props.toast.type;
  const toastClassname = props.toast.className || '';
  const toastDescriptionClassname = props.toast.descriptionClassName || '';

  // Height index is used to calculate the offset as it gets updated before the toast array, which means we can calculate the new layout faster.
  const heightIndex = createMemo(() => props.heights.findIndex((height) => height.toastId === props.toast.id) || 0);
  const duration = createMemo(() => props.toast.duration || props.duration || TOAST_LIFETIME);
  let closeTimerStartTimeRef = 0
  let closeTimerRemainingTimeRef = duration()
  let lastCloseTimerStartTimeRef = 0
  const [pointerStartRef, setPointerStartRef] = createSignal<{ x: number; y: number } | null>(null)
  const [y, x] = props.position.split('-');
  const toastsHeightBefore = createMemo(() => {
    return props.heights.reduce((prev, curr, reducerIndex) => {
      // Calculate offset up untill current  toast
      if (reducerIndex >= heightIndex()) {
        return prev;
      }

      return prev + curr.height;
    }, 0);
  });
  const offset = createMemo(() => heightIndex() * GAP + toastsHeightBefore());
  const invert = props.toast.invert || props.invert;
  const disabled = toastType === 'loading';

  onMount(() => {
    setMounted(true)
    const toastNode = toastRef;
    const originalHeight = toastNode.style.height;
    toastNode.style.height = 'auto';
    const newHeight = toastNode.getBoundingClientRect().height;
    toastNode.style.height = originalHeight;

    setInitialHeight(newHeight);

    const alreadyExists = props.heights.find((height) => height.toastId === props.toast.id);

    if (!alreadyExists) {
      props.setHeights((h) => [{ toastId: props.toast.id, height: newHeight }, ...h]);
    } else {
      props.setHeights((h) => h.map((height) => (height.toastId === props.toast.id ? { ...height, height: newHeight } : height)));
    }
  })

  const deleteToast = () => {
    // Save the offset for the exit swipe animation
    setRemoved(true);
    setOffsetBeforeRemove(offset());
    props.setHeights((h) => h.filter((height) => height.toastId !== props.toast.id));

    setTimeout(() => {
      props.removeToast(props.toast);
    }, TIME_BEFORE_UNMOUNT);
  };

  createComputed(() => {
    if ((props.toast.promise && toastType === 'loading') || props.toast.duration === Infinity) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Pause the timer on each hover
    const pauseTimer = () => {
      if (lastCloseTimerStartTimeRef < closeTimerStartTimeRef) {
        // Get the elapsed time since the timer started
        const elapsedTime = new Date().getTime() - closeTimerStartTimeRef;

        closeTimerRemainingTimeRef = closeTimerRemainingTimeRef - elapsedTime;
      }

      lastCloseTimerStartTimeRef = new Date().getTime();
    };

    const startTimer = () => {
      closeTimerStartTimeRef = new Date().getTime();
      // Let the toast know it has started
      timeoutId = setTimeout(() => {
        props.toast.onAutoClose?.(props.toast);
        deleteToast();
      }, closeTimerRemainingTimeRef);
    };

    if (props.expanded || props.interacting) {
      pauseTimer();
    } else {
      startTimer();
    }

    onCleanup(() => {
      clearTimeout(timeoutId)
    })
  });

  createComputed(() => {
    const toastNode = toastRef;

    if (toastNode) {
      const height = toastNode.getBoundingClientRect().height;

      // Add toast height tot heights array after the toast is mounted
      setInitialHeight(height);
      props.setHeights((h) => [{ toastId: props.toast.id, height }, ...h]);

      onCleanup(() => {
        props.setHeights((h) => h.filter((height) => height.toastId !== props.toast.id))
      })
    }
  });

  createComputed(() => {
    if (props.toast.delete) {
      deleteToast();
    }
  });

  return (
    <li
      aria-live={props.toast.important ? 'assertive' : 'polite'}
      aria-atomic="true"
      role="status"
      tabIndex={0}
      ref={toastRef!}
      class={props.className + ' ' + toastClassname}
      data-sonner-toast=""
      data-styled={!Boolean(props.toast.jsx)}
      data-mounted={mounted()}
      data-promise={Boolean(toast.promise)}
      data-removed={removed}
      data-visible={isVisible}
      data-y-position={y}
      data-x-position={x}
      data-index={props.index}
      data-front={isFront}
      data-swiping={swiping()}
      data-type={toastType}
      data-invert={invert}
      data-swipe-out={swipeOut()}
      data-expanded={Boolean(props.expanded || (props.expandByDefault && mounted()))}
      style={
        {
          '--index': props.index,
          '--toasts-before': props.index,
          '--z-index': props.toasts.length - props.index,
          '--offset': `${removed() ? offsetBeforeRemove : offset()}px`,
          '--initial-height': props.expandByDefault ? 'auto' : `${initialHeight}px`,
          ...props.style,
          ...props.toast.style,
        } as Record<string, any>
      }
      onPointerDown={(event) => {
        if (disabled) return;
        setOffsetBeforeRemove(offset());
        // Ensure we maintain correct pointer capture even when going outside of the toast (e.g. when swiping)
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        if ((event.target as HTMLElement).tagName === 'BUTTON') return;
        setSwiping(true);
        setPointerStartRef({ x: event.clientX, y: event.clientY })
      }}
      onPointerUp={() => {
        if (swipeOut()) return;

        setPointerStartRef(null)
        const swipeAmount = Number(toastRef?.style.getPropertyValue('--swipe-amount').replace('px', '') || 0);

        // Remove only if treshold is met
        if (Math.abs(swipeAmount) >= SWIPE_TRESHOLD) {
          setOffsetBeforeRemove(offset());
          props.toast.onDismiss?.(props.toast);
          deleteToast();
          setSwipeOut(true);
          return;
        }

        toastRef?.style.setProperty('--swipe-amount', '0px');
        setSwiping(false);
      }}
      onPointerMove={(event) => {
        if (!pointerStartRef()) return;

        const yPosition = event.clientY - pointerStartRef()!.y;
        const xPosition = event.clientX - pointerStartRef()!.x;

        const clamp = y === 'top' ? Math.min : Math.max;
        const clampedY = clamp(0, yPosition);
        const swipeStartThreshold = event.pointerType === 'touch' ? 10 : 2;
        const isAllowedToSwipe = clampedY > swipeStartThreshold;

        if (isAllowedToSwipe) {
          toastRef?.style.setProperty('--swipe-amount', `${yPosition}px`);
        } else if (Math.abs(xPosition) > swipeStartThreshold) {
          // User is swiping in wrong direction so we disable swipe gesture
          // for the current pointer down interaction
          setPointerStartRef(null)
        }
      }}
    >
      <Show when={props.closeButton && !props.toast.jsx}>
        <button
            aria-label="Close toast"
            data-disabled={disabled}
            data-close-button
            onClick={
              disabled
                ? undefined
                : () => {
                    deleteToast();
                    props.toast.onDismiss?.(props.toast);
                  }
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
      </Show>
      <Show
        when={props.toast.jsx || props.toast.title instanceof Element}
        fallback={
          <>
            <Show when={toastType || props.toast.icon || toast.promise}>
              <div data-icon="">
                <Show when={toast.promise}>
                  <Loader visible={toastType === 'loading'} />
                  {props.toast.icon || getAsset(toastType!)}
                </Show>
              </div>
            </Show>

            <div data-content="">
              <div data-title="">{props.toast.title}</div>
              <Show when={props.toast.description}>
                <div data-description="" class={props.descriptionClassName + toastDescriptionClassname}>
                  {props.toast.description}
                </div>
              </Show>
            </div>
            <Show when={props.toast.cancel}>
              <button
                  data-button
                  data-cancel
                  onClick={() => {
                    deleteToast();
                    if (props.toast.cancel?.onClick) {
                      props.toast.cancel.onClick();
                    }
                  }}
                >
                  {props.toast.cancel!.label}
                </button>
            </Show>
            <Show when={props.toast.action}>
              <button
                  data-button=""
                  onClick={(event) => {
                    props.toast.action?.onClick(event);
                    if (event.defaultPrevented) return;
                    deleteToast();
                  }}
                >
                  {props.toast.action!.label}
                </button>
            </Show>
          </>
        }
      >
        {props.toast.jsx || props.toast.title}
      </Show>
    </li>
  );
};

const Toaster: Component<ToasterProps> = (props) => {
  const propsWithDefaults = mergeProps({
    position: 'bottom-right',
    hotkey: ['altKey', 'KeyT'],
    theme: 'light',
    visibleToasts: VISIBLE_TOASTS_AMOUNT,
  }, props) as ToasterProps & { position: Position; hotkey: string[]; visibleToasts: number }

  const [toasts, setToasts] = createSignal<ToastT[]>([]);
  const [heights, setHeights] = createSignal<HeightT[]>([]);
  const [expanded, setExpanded] = createSignal(false);
  const [interacting, setInteracting] = createSignal(false);
  const [y, x] = propsWithDefaults.position.split('-');
  let listRef: HTMLOListElement
  const hotkeyLabel = propsWithDefaults.hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');

  const removeToast = (toast: ToastT) => setToasts((toasts) => toasts.filter(({ id }) => id !== toast.id));

  onMount(() => {
    const unsub = ToastState.subscribe((toast) => {
      if ((toast as ToastToDismiss).dismiss) {
        setToasts((toasts) => toasts.map((t) => (t.id === toast.id ? { ...t, delete: true } : t)));
        return;
      }

      setToasts((toasts) => {
        const indexOfExistingToast = toasts.findIndex((t) => t.id === toast.id);

        // Update the toast if it already exists
        if (indexOfExistingToast !== -1) {
          return [
            ...toasts.slice(0, indexOfExistingToast),
            { ...toasts[indexOfExistingToast], ...toast },
            ...toasts.slice(indexOfExistingToast + 1),
          ];
        }

        return [toast, ...toasts];
      });
    });

    onCleanup(() => {
      unsub()
    })
  });

  createEffect(() => {
    console.log(toasts())
  })

  createComputed(() => {
    // Ensure expanded is always false when no toasts are present / only one left
    if (toasts().length <= 1) {
      setExpanded(false);
    }
  });

  createComputed(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed = propsWithDefaults.hotkey.every((key) => (event as any)[key] || event.code === key);

      if (isHotkeyPressed) {
        setExpanded(true);
        listRef?.focus();
      }

      if (
        event.code === 'Escape' &&
        (document.activeElement === listRef || listRef?.contains(document.activeElement))
      ) {
        setExpanded(false);
      }
    };
  
    document.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
    })
  });

  return (
    <Show when={toasts().length > 0}>
      {/* Remove item from normal navigation flow, only available via hotkey */}
      <section aria-label={`Notifications ${hotkeyLabel}`} tabIndex={-1}>
        <ol
          tabIndex={-1}
          ref={listRef!}
          class={propsWithDefaults.className}
          data-sonner-toaster
          data-theme={propsWithDefaults.theme}
          data-rich-colors={propsWithDefaults.richColors}
          data-y-position={y}
          data-x-position={x}
          style={
            {
              '--front-toast-height': `${heights()[0]?.height}px`,
              '--offset': typeof propsWithDefaults.offset === 'number' ? `${propsWithDefaults.offset}px` : propsWithDefaults.offset || VIEWPORT_OFFSET,
              '--width': `${TOAST_WIDTH}px`,
              '--gap': `${GAP}px`,
              ...propsWithDefaults.style,
            } as Record<string, any>
          }
          onMouseEnter={() => setExpanded(true)}
          onMouseMove={() => setExpanded(true)}
          onMouseLeave={() => {
            // Avoid setting expanded to false when interacting with a toast, e.g. swiping
            if (!interacting) {
              setExpanded(false);
            }
          }}
          onPointerDown={() => {
            setInteracting(true);
          }}
          onPointerUp={() => setInteracting(false)}
        >
          <For each={toasts()}>
            {(toast, index) => (
              <Toast
                index={index()}
                toast={toast}
                duration={propsWithDefaults.duration}
                className={propsWithDefaults.toastOptions?.className}
                descriptionClassName={propsWithDefaults.toastOptions?.descriptionClassName}
                invert={Boolean(propsWithDefaults.invert)}
                visibleToasts={propsWithDefaults.visibleToasts}
                closeButton={Boolean(propsWithDefaults.closeButton)}
                interacting={interacting()}
                position={propsWithDefaults.position}
                style={propsWithDefaults.toastOptions?.style}
                removeToast={removeToast}
                toasts={toasts()}
                heights={heights()}
                setHeights={setHeights}
                expandByDefault={Boolean(propsWithDefaults.expand)}
                expanded={expanded()}
              />
            )}
          </For>
        </ol>
      </section>
    </Show>
  )
};

export { toast, Toaster };
export type { ToastT, ExternalToast };

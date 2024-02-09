/*!
 * Original code by Emil Kowalski
 * MIT Licensed, Copyright 2023 Emil Kowalski, see https://github.com/emilkowalski/sonner/blob/main/LICENSE.md for details
 *
 * Credits:
 * https://github.com/emilkowalski/sonner/blob/main/src/index.tsx
 */
import './styles.css'
import type { Component, ValidComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { For, Show, createComputed, createMemo, createSignal, mergeProps, onCleanup, onMount } from 'solid-js'
import { Loader, getAsset } from './assets'
import type { ExternalToast, HeightT, Position, ToastProps, ToastT, ToastToDismiss, ToasterProps } from './types'
import { ToastState, toast } from './state'

// Visible toasts amount
const VISIBLE_TOASTS_AMOUNT = 3

// Viewport padding
const VIEWPORT_OFFSET = '32px'

// Default lifetime of a toasts (in ms)
const TOAST_LIFETIME = 4000

// Default toast width
const TOAST_WIDTH = 356

// Default gap between toasts
const GAP = 14

const SWIPE_TRESHOLD = 20

const TIME_BEFORE_UNMOUNT = 200

const Toast: Component<ToastProps> = (props) => {
  const [mounted, setMounted] = createSignal(false)
  const [removed, setRemoved] = createSignal(false)
  const [swiping, setSwiping] = createSignal(false)
  const [swipeOut, setSwipeOut] = createSignal(false)
  const [offsetBeforeRemove, setOffsetBeforeRemove] = createSignal(0)
  const [initialHeight, setInitialHeight] = createSignal(0)
  let toastRef: HTMLLIElement
  const isFront = createMemo(() => props.index === 0)
  const isVisible = createMemo(() => props.index + 1 <= props.visibleToasts)
  const toastType = createMemo(() => props.toast.type)
  const toastClassname = createMemo(() => props.toast.class || '')
  const toastDescriptionClassname = createMemo(() => props.toast.descriptionClass || '')

  // Height index is used to calculate the offset as it gets updated before the toast array, which means we can calculate the new layout faster.
  const heightIndex = createMemo(() => props.heights.findIndex(height => height.toastId === props.toast.id) || 0)
  const duration = createMemo(() => props.toast.duration || props.duration || TOAST_LIFETIME)
  const [offset, setOffset] = createSignal(0)
  const [closeTimerStartTimeRef, setCloseTimerStartTimeRef] = createSignal(0)
  const [closeTimerRemainingTimeRef, setCloseTimerRemainingTimeRef] = createSignal(duration())
  const [lastCloseTimerStartTimeRef, setLastCloseTimerStartTimeRef] = createSignal(0)
  const [pointerStartRef, setPointerStartRef] = createSignal<{ x: number; y: number } | null>(null)
  const coords = createMemo(() => props.position.split('-'))
  const toastsHeightBefore = createMemo(() => {
    return props.heights.reduce((prev, curr, reducerIndex) => {
      // Calculate offset up untill current  toast
      if (reducerIndex >= heightIndex())
        return prev

      return prev + curr.height
    }, 0)
  })
  const invert = createMemo(() => props.toast.invert || props.invert)
  const disabled = createMemo(() => toastType() === 'loading')

  function getLoadingIcon() {
    if (props.icons?.loading) {
      return (
        <div class="loader" data-visible={toastType() === 'loading'}>
          {props.icons.loading}
        </div>
      )
    }

    return <Loader visible={toastType() === 'loading'} />
  }

  createComputed(() => {
    setOffset(heightIndex() * GAP + toastsHeightBefore())
  })

  onMount(() => {
    setMounted(true)
  })

  const deleteToast = () => {
    // Save the offset for the exit swipe animation
    setRemoved(true)
    setOffsetBeforeRemove(offset())
    props.setHeights(h => h.filter(height => height.toastId !== props.toast.id))

    setTimeout(() => {
      props.removeToast(props.toast)
    }, TIME_BEFORE_UNMOUNT)
  }

  createComputed(() => {
    if ((props.toast.promise && toastType() === 'loading') || props.toast.duration === Number.POSITIVE_INFINITY)
      return
    let timeoutId: ReturnType<typeof setTimeout>

    // Pause the timer on each hover
    const pauseTimer = () => {
      if (lastCloseTimerStartTimeRef() < closeTimerStartTimeRef()) {
        // Get the elapsed time since the timer started
        const elapsedTime = new Date().getTime() - closeTimerStartTimeRef()

        setCloseTimerRemainingTimeRef(prev => prev - elapsedTime)
      }

      setLastCloseTimerStartTimeRef(new Date().getTime())
    }

    const startTimer = () => {
      setCloseTimerStartTimeRef(new Date().getTime())
      // Let the toast know it has started
      timeoutId = setTimeout(() => {
        props.toast.onAutoClose?.(props.toast)
        deleteToast()
      }, closeTimerRemainingTimeRef())
    }

    if (props.expanded || props.interacting)
      pauseTimer()
    else
      startTimer()

    onCleanup(() => {
      clearTimeout(timeoutId)
    })
  })

  onMount(() => {
    const height = toastRef.getBoundingClientRect().height

    // Add toast height tot heights array after the toast is mounted
    setInitialHeight(height)
    props.setHeights(h => [{ toastId: props.toast.id, height }, ...h])

    onCleanup(() => {
      props.setHeights(h => h.filter(height => height.toastId !== props.toast.id))
    })
  })

  createComputed(() => {
    if (props.toast.delete)
      deleteToast()
  })

  return (
    <li
      aria-live={props.toast.important ? 'assertive' : 'polite'}
      aria-atomic="true"
      role="status"
      tabIndex={0}
      ref={toastRef!}
      class={`${props.class} ${toastClassname()}`}
      data-sonner-toast=""
      data-styled={!props.toast.jsx}
      data-mounted={mounted()}
      data-promise={Boolean(props.toast.promise)}
      data-removed={removed()}
      data-visible={isVisible()}
      data-y-position={coords()[0]}
      data-x-position={coords()[1]}
      data-index={props.index}
      data-front={isFront()}
      data-swiping={swiping()}
      data-type={toastType()}
      data-invert={invert()}
      data-swipe-out={swipeOut()}
      data-expanded={Boolean(props.expanded || (props.expandByDefault && mounted()))}
      style={
        {
          '--index': props.index,
          '--toasts-before': props.index,
          '--z-index': props.toasts.length - props.index,
          '--offset': `${removed() ? offsetBeforeRemove() : offset()}px`,
          '--initial-height': props.expandByDefault ? 'auto' : `${initialHeight()}px`,
          ...props.style,
          ...props.toast.style,
        }
      }
      onPointerDown={(event) => {
        if (disabled())
          return
        setOffsetBeforeRemove(offset());
        // Ensure we maintain correct pointer capture even when going outside of the toast (e.g. when swiping)
        (event.target as HTMLElement).setPointerCapture(event.pointerId)
        if ((event.target as HTMLElement).tagName === 'BUTTON')
          return
        setSwiping(true)
        setPointerStartRef({ x: event.clientX, y: event.clientY })
      }}
      onPointerUp={() => {
        if (swipeOut())
          return

        setPointerStartRef(null)
        const swipeAmount = Number(toastRef?.style.getPropertyValue('--swipe-amount').replace('px', '') || 0)

        // Remove only if treshold is met
        if (Math.abs(swipeAmount) >= SWIPE_TRESHOLD) {
          setOffsetBeforeRemove(offset())
          props.toast.onDismiss?.(props.toast)
          deleteToast()
          setSwipeOut(true)
          return
        }

        toastRef?.style.setProperty('--swipe-amount', '0px')
        setSwiping(false)
      }}
      onPointerMove={(event) => {
        if (!pointerStartRef())
          return

        const yPosition = event.clientY - pointerStartRef()!.y
        const xPosition = event.clientX - pointerStartRef()!.x

        const clamp = coords()[0] === 'top' ? Math.min : Math.max
        const clampedY = clamp(0, yPosition)
        const swipeStartThreshold = event.pointerType === 'touch' ? 10 : 2
        const isAllowedToSwipe = Math.abs(clampedY) > swipeStartThreshold

        if (isAllowedToSwipe) {
          toastRef?.style.setProperty('--swipe-amount', `${yPosition}px`)
        }
        else if (Math.abs(xPosition) > swipeStartThreshold) {
          // User is swiping in wrong direction so we disable swipe gesture
          // for the current pointer down interaction
          setPointerStartRef(null)
        }
      }}
    >
      <Show when={props.closeButton && !props.toast.jsx}>
        <button
            aria-label="Close toast"
            data-disabled={disabled()}
            data-close-button
            onClick={
              disabled()
                ? undefined
                : () => {
                    deleteToast()
                    props.toast.onDismiss?.(props.toast)
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
      </Show>
      <Show
        when={props.toast.jsx || props.toast.title instanceof Element}
        fallback={
          <>
            <Show when={toastType() || props.toast.icon || props.toast.promise}>
              <div data-icon="">
                <Show
                  when={props.toast.promise || toastType() === 'loading'}
                  fallback={<Dynamic component={getAsset(toastType()!)!} />}
                >
                  <Dynamic component={(props.toast.icon || props.icons?.loading || getLoadingIcon()) as ValidComponent} />
                </Show>
              </div>
            </Show>

            <div data-content="">
              <div data-title="">{props.toast.title}</div>
              <Show when={props.toast.description}>
                <div data-description="" class={props.descriptionClass + toastDescriptionClassname()}>
                  {props.toast.description}
                </div>
              </Show>
            </div>
            <Show when={props.toast.cancel}>
              <button
                  data-button
                  data-cancel
                  onClick={() => {
                    deleteToast()
                    if (props.toast.cancel?.onClick)
                      props.toast.cancel.onClick()
                  }}
                >
                  {props.toast.cancel!.label}
                </button>
            </Show>
            <Show when={props.toast.action}>
              <button
                  data-button=""
                  onClick={(event) => {
                    props.toast.action?.onClick(event)
                    if (event.defaultPrevented)
                      return
                    deleteToast()
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
  )
}

function getDocumentDirection(): ToasterProps['dir'] {
  if (typeof window === 'undefined')
    return 'ltr'
  if (typeof document === 'undefined')
    return 'ltr' // For Fresh purpose

  const dirAttribute = document.documentElement.getAttribute('dir')

  if (dirAttribute === 'auto' || !dirAttribute)
    return window.getComputedStyle(document.documentElement).direction as ToasterProps['dir']

  return dirAttribute as ToasterProps['dir']
}

const Toaster: Component<ToasterProps> = (props) => {
  const propsWithDefaults = mergeProps({
    position: 'bottom-right',
    hotkey: ['altKey', 'KeyT'],
    theme: 'light',
    visibleToasts: VISIBLE_TOASTS_AMOUNT,
    dir: getDocumentDirection(),
  }, props) as ToasterProps & { position: Position; hotkey: string[]; visibleToasts: number }

  const [toasts, setToasts] = createSignal<ToastT[]>([])
  const possiblePositions = createMemo(() => {
    return Array.from(
      new Set([propsWithDefaults.position].concat(toasts().filter(toast => toast.position).map(toast => toast.position as Position))),
    )
  })
  const [heights, setHeights] = createSignal<HeightT[]>([])
  const [expanded, setExpanded] = createSignal(false)
  const [interacting, setInteracting] = createSignal(false)
  const coords = createMemo(() => propsWithDefaults.position.split('-'))
  let listRef: HTMLOListElement
  const hotkeyLabel = createMemo(() => propsWithDefaults.hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, ''))
  const [lastFocusedElementRef, setLastFocusedElementRef] = createSignal<HTMLElement | null>(null)
  const [isFocusedWithinRef, setIsFocusedWithinRef] = createSignal(false)
  const [actualTheme, setActualTheme] = createSignal(
    propsWithDefaults.theme !== 'system'
      ? propsWithDefaults.theme
      : typeof window !== 'undefined'
        ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : 'light',
  )
  const removeToast = (toast: ToastT) => setToasts(toasts => toasts.filter(({ id }) => id !== toast.id))

  onMount(() => {
    const unsub = ToastState.subscribe((toast) => {
      if ((toast as ToastToDismiss).dismiss) {
        setToasts(toasts => toasts.map(t => (t.id === toast.id ? { ...t, delete: true } : t)))
        return
      }

      setToasts((toasts) => {
        const indexOfExistingToast = toasts.findIndex(t => t.id === toast.id)

        // Update the toast if it already exists
        if (indexOfExistingToast !== -1) {
          return [
            ...toasts.slice(0, indexOfExistingToast),
            { ...toasts[indexOfExistingToast], ...toast },
            ...toasts.slice(indexOfExistingToast + 1),
          ]
        }

        return [toast, ...toasts]
      })
    })

    onCleanup(() => {
      unsub()
    })
  })

  createComputed(() => {
    if (propsWithDefaults.theme !== 'system') {
      setActualTheme(propsWithDefaults.theme)
      return
    }

    if (typeof window === 'undefined')
      return

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({ matches }) => {
      if (matches)
        setActualTheme('dark')

      else
        setActualTheme('light')
    })
  })

  createComputed(() => {
    // Ensure expanded is always false when no toasts are present / only one left
    if (toasts().length <= 1)
      setExpanded(false)
  })

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed = propsWithDefaults.hotkey.every(key => (event as any)[key] || event.code === key)

      if (isHotkeyPressed) {
        setExpanded(true)
        listRef?.focus()
      }

      if (
        event.code === 'Escape'
        && (document.activeElement === listRef || listRef?.contains(document.activeElement))
      )
        setExpanded(false)
    }

    document.addEventListener('keydown', handleKeyDown)

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown)
    })
  })

  createComputed(() => {
    if (listRef) {
      onCleanup(() => {
        if (lastFocusedElementRef()) {
          lastFocusedElementRef()?.focus({ preventScroll: true })
          setLastFocusedElementRef(null)
          setIsFocusedWithinRef(false)
        }
      })
    }
  })

  return (
    <Show when={toasts().length > 0}>
      {/* Remove item from normal navigation flow, only available via hotkey */}
      <section aria-label={`Notifications ${hotkeyLabel()}`} tabIndex={-1}>
        <For each={possiblePositions()}>
          {(position) => {
            const [y, x] = position.split('-')
            return (
              <ol
              tabIndex={-1}
              ref={listRef!}
              dir={propsWithDefaults.dir === 'auto' ? getDocumentDirection() : propsWithDefaults.dir}
              class={propsWithDefaults.class}
              data-sonner-toaster
              data-theme={actualTheme()}
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
                }
              }
              onBlur={(event) => {
                if (isFocusedWithinRef() && !event.currentTarget.contains(event.relatedTarget as HTMLElement)) {
                  setIsFocusedWithinRef(false)
                  if (lastFocusedElementRef()) {
                    lastFocusedElementRef()?.focus({ preventScroll: true })
                    setLastFocusedElementRef(null)
                  }
                }
              }}
              onFocus={(event) => {
                if (!isFocusedWithinRef()) {
                  setIsFocusedWithinRef(true)
                  setLastFocusedElementRef(event.relatedTarget as HTMLElement)
                }
              }}
              onMouseEnter={() => setExpanded(true)}
              onMouseMove={() => setExpanded(true)}
              onMouseLeave={() => {
                // Avoid setting expanded to false when interacting with a toast, e.g. swiping
                if (!interacting())
                  setExpanded(false)
              }}
              onPointerDown={() => {
                setInteracting(true)
              }}
              onPointerUp={() => setInteracting(false)}
            >
              <For each={toasts()}>
                {(toast, index) => (
                  <Toast
                    index={index()}
                    icons={propsWithDefaults.icons}
                    toast={toast}
                    duration={propsWithDefaults.duration}
                    class={propsWithDefaults.toastOptions?.class}
                    descriptionClass={propsWithDefaults.toastOptions?.descriptionClass}
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
            )
          }}
        </For>
      </section>
    </Show>
  )
}

export { toast, Toaster }
export type { ToastT, ExternalToast }

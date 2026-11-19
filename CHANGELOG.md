# solid-sonner

## 1.0.0

### Major Changes

- 64ed1f6: Support Solid 2. `solid-js@^2.0.0` and `@solidjs/web@^2.0.0` are now peer dependencies, and Solid 1 is no longer supported. The public API and rendered output are unchanged. A toast now reaches the DOM a microtask after `toast()` instead of synchronously, so a unit test that queries for it right away needs to wait a tick first.

### Patch Changes

- 0bfb1dc: Return focus to the previously focused element once the last toast closes, as sonner does. React's `onFocus` and `onBlur` bubble and Solid's do not, so the toaster never saw focus move into a toast.

## 0.3.3

### Patch Changes

- 880988c: Fix the `solid` export (`dist/index.jsx`) shipping with its element refs compiled away. Toasts no longer collapse on hover, swipe-to-dismiss works again, and the hotkey and Escape handlers reach the toaster.

## 0.3.2

### Patch Changes

- 442c3e9: Fix a batch of issues, ported from upstream sonner#777:

  - `toast()` no longer appends a duplicate history entry when called with the id of an existing toast, and now honours the `dismissible` default
  - `toast()` and `toast.custom()` clear the loading state when called with the id of a loading toast
  - `toast.custom()` keeps an id of `0`, and `toast.dismiss(0)` dismisses that toast rather than every toast
  - A toast recreated right after being dismissed is no longer removed by the dismissal still in flight
  - A new toast reusing the id of a dismissed toast no longer inherits its props, such as `action`
  - Toasts created before `<Toaster>` mounts are no longer lost
  - `toast.getHistory()` is capped at 100 entries, only ever dropping already-dismissed toasts
  - A fast flick no longer dismisses a toast in a direction that is not in `swipeDirections`
  - Decorative icons are hidden from assistive technology
  - Toast content is no longer limited to the width of its text
  - `classNames.default` is only applied to toasts created without a type, matching upstream. If you relied on it applying to every toast, move those styles to the individual type keys.

## 0.3.1

### Patch Changes

- 8bedc2a: Export styles

## 0.3.0

### Minor Changes

- e9ff142: Align with current Sonner updates

# solid-sonner

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

---
'solid-sonner': patch
---

Fix a batch of issues ported from upstream [sonner#777](https://github.com/emilkowalski/sonner/pull/777):

- `toast()` no longer appends a duplicate history entry when called with the id of an existing toast, and now honours the `dismissible` default. It went straight to `addToast()` instead of through `create()`. This one was specific to solid-sonner.
- `toast()` and `toast.custom()` reset the toast type, so calling either with the id of a loading toast clears the spinner (sonner#401, sonner#652).
- `toast.custom()` keeps an id of `0` instead of replacing it with a generated one.
- A toast recreated right after being dismissed is no longer removed by the dismissal still in flight (sonner#592).
- A new toast reusing the id of a dismissed toast no longer inherits its props, such as `action` (sonner#692).
- Toasts created before `<Toaster>` mounts are no longer lost (sonner#723).
- `toast.getHistory()` is capped at 100 entries, only ever dropping already-dismissed toasts (sonner#729).
- `toast.dismiss(0)` dismisses that toast rather than every toast.
- A fast flick no longer dismisses a toast in a direction that is not in `swipeDirections` (sonner#762).
- Decorative icons are hidden from assistive technology with `aria-hidden` (sonner#713).
- Toast content is no longer limited to the width of its text (sonner#683).
- `classNames.default` is only applied to toasts created without a type, matching upstream (sonner#744). Previously it was applied to every toast alongside the type-specific class, so a `classNames.default` that relied on that will now need to move to the individual type keys.

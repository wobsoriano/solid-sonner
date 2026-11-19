---
'solid-sonner': patch
---

Return focus to the previously focused element once the last toast closes, as sonner does. React's `onFocus` and `onBlur` bubble and Solid's do not, so the toaster never saw focus move into a toast.

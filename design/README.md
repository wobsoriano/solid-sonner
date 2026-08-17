# Design sketch: Solid-native state on Solid 2

Not wired into the build. `design/state.ts` is a working sketch of what
`src/state.ts` becomes when written for Solid instead of ported from React.

Verified against `solid-js@2.0.0-rc.0`, `@solidjs/web@2.0.0-rc.0`,
`vite-plugin-solid@3.0.0-next.27`, TypeScript 6.0.3.

## The idea

Upstream's `Observer` is a React workaround. React has no module-level reactive
primitive, so sonner hand-rolls `useSyncExternalStore`: a subscriber list,
`publish`, and a plain array that each component mirrors into its own state.

Solid's reactivity works outside components, so the module-level store can be
the source of truth:

```ts
const [toasts, setToasts] = createStore<ToastT[]>([]);
export { toasts };
```

Components read `toasts` directly. There is nothing to subscribe to.

## What that removes

| Upstream machinery                                    | Why it goes                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `subscribers`, `subscribe`, `publish`                 | Components read the store                                          |
| The Toaster's `onMount` subscription and store mirror | No second copy of the array                                        |
| Subscribe-time replay (sonner#723)                    | The store predates any component                                   |
| `dismissedToasts` set                                 | An exiting toast has `phase: 'exiting'`; a gone one is spliced out |
| `pendingDismissals` + rAF cancellation (sonner#592)   | Recreating cancels the exit timer                                  |
| Drop-instead-of-merge branch (sonner#692)             | Replacing an `exiting` row is one branch of `create`               |
| `trimHistory` / `MAX_HISTORY_SIZE`                    | Live toasts only; history is a separate concern                    |
| `useSonner()`                                         | `toast.toasts` is already reactive                                 |

126 lines against 372 today, and four upstream bug classes stop being
expressible rather than being fixed.

## Behaviour, actually run

Driven through the sketch in a browser against the RC. All passed, no errors:

| Step                          | Result                                                 |
| ----------------------------- | ------------------------------------------------------ |
| `toast()` before first render | visible (sonner#723)                                   |
| `toast.success(msg, { id })`  | typed                                                  |
| `toast(msg, { id })` on it    | merges, keeps position, type reset (sonner#401)        |
| dismiss                       | `phase: 'exiting'`, stays in the DOM for the animation |
| recreate mid-exit             | revived, stale `action` gone (sonner#592 + #692)       |
| dismiss, wait past 200ms      | removed                                                |
| `toast.dismiss()`             | clears all                                             |

## Two Solid 2 findings worth keeping

**Writes are invisible until flush.** Solid 2 batches on microtasks, so a
setter does not change what a read returns until `flush()`. Every mutation that
must be visible to an imperative caller needs one.

**A pre-render store write without `flush()` crashes `For` in the RC.**
Reduced to three variants:

| Variant                             | Result                                                    |
| ----------------------------------- | --------------------------------------------------------- |
| No write before `render()`          | works                                                     |
| Write before `render()`, no flush   | throws `Cannot read properties of undefined` inside `For` |
| Write before `render()` + `flush()` | works                                                     |

That is exactly the "toast fired before the Toaster mounts" path, so it matters
here. Probably worth an upstream report.

Also confirmed: `StoreSetter` takes **only** a function (`(draft) => void | T`).
Passing an array throws `t is not a function`. Mutate the draft, or return a new
array for removals (`s => s.filter(...)`).

## Not covered yet

- The `Toaster` / `Toast` components. Heights, offsets, swipe, timers.
- `toast.promise`, which the sketch omits. Its shape barely changes, but the
  four duplicated result-resolution blocks should be factored while porting.
- `getHistory()`. Either a separate bounded array or drop it.
- Whether `For` should be `keyed={t => t.id}` (used here, stable rows across
  reorder) or `keyed={false}`. Both work; keyed matches toast semantics.

## The trade-off, restated

This ends the 1:1 correspondence with upstream. Porting the next sonner batch
stops being mechanical translation and becomes re-derivation. That is the real
cost, not the rewrite itself.

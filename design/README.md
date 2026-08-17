# Design sketch: Solid-native state

Not wired into the build. Two sketches of what `src/state.ts` becomes when the
React plumbing comes out, so they can be compared side by side.

Verified against `solid-js@2.0.0-rc.0`, `@solidjs/web@2.0.0-rc.0`,
`vite-plugin-solid@3.0.0-next.27`, TypeScript 6.0.3.

- **`state.ts`** — sketch A, full rewrite. Module-level store, `phase` enum, no class.
- **`toast-state.ts`** — sketch B, keeps the `ToastState` class and mirrors
  svelte-sonner's `toast-state.svelte.ts` field for field, with `$state`
  swapped for a Solid store.

**Recommendation: sketch B.** See the trade-off at the bottom.

## The shared idea

Upstream's `Observer` is a React workaround. React has no module-level reactive
primitive, so sonner hand-rolls `useSyncExternalStore`: a subscriber list,
`publish`, and a plain array each component mirrors into its own state.

Solid's reactivity works outside components, so the state can be read directly.
Both sketches drop the same things:

| Upstream machinery                                    | Why it goes                        |
| ----------------------------------------------------- | ---------------------------------- |
| `subscribers`, `subscribe`, `publish`                 | Components read the state          |
| The Toaster's `onMount` subscription and store mirror | No second copy of the array        |
| Subscribe-time replay (sonner#723)                    | The state predates any component   |
| `useSonner()`                                         | The toast list is already reactive |

## A vs B

|                                                                  | A `state.ts`                       | B `toast-state.ts`                     |
| ---------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| Shape                                                            | free functions over a module store | `class ToastState` singleton           |
| Lifecycle                                                        | `phase: 'visible' \| 'exiting'`    | `dismiss` / `delete` / `updated` flags |
| Who removes the toast                                            | state owns the exit timer          | component calls `scheduleRemoval`      |
| Lines                                                            | 129                                | 234                                    |
| Diffs against svelte-sonner                                      | no                                 | yes, method for method                 |
| Diffs against upstream Observer                                  | no                                 | mostly, same method names              |
| Also drops `dismissedToasts`, `pendingDismissals`, `trimHistory` | yes                                | keeps `#pendingRemovals`               |

A is cleaner read cold. B is better for this repo, because the same person
maintains svelte-sonner and both track upstream. B removes only the actual
React artifact and leaves `create` / `dismiss` / `addToast` / `updateToast`
lined up with both siblings, so a future upstream batch stays translatable
rather than needing re-derivation.

## Behaviour, actually run

Both sketches driven in a browser against the RC. All passed, no errors.

| Step                              | A                            | B                               |
| --------------------------------- | ---------------------------- | ------------------------------- |
| `toast()` before first render     | visible                      | visible                         |
| `toast.success(msg, { id })`      | typed                        | typed                           |
| `toast(msg, { id })` on it        | merges, type reset           | merges, type reset              |
| dismiss                           | `phase: 'exiting'`           | `dismiss: true`, still rendered |
| recreate mid-exit                 | revived, stale `action` gone | revived, stale `action` gone    |
| survives past the old exit window | yes                          | yes, `cancelRemoval`            |
| full dismissal cycle              | removed                      | removed                         |
| dismiss / remove all              | empty                        | empty                           |

The revive case is the one worth noting: it covers sonner#592 and #692 together,
without upstream's rAF cancellation or its drop-instead-of-merge special case.

## Solid 2 findings

**Writes are invisible until flush.** Solid 2 batches on microtasks, so a setter
does not change what a read returns until `flush()`. Both sketches call it at
the end of `create` and `dismiss` so imperative callers see the result.

**A pre-render store write without `flush()` crashes `For` in the RC.**
Reduced to three variants:

| Variant                             | Result                                                    |
| ----------------------------------- | --------------------------------------------------------- |
| No write before `render()`          | works                                                     |
| Write before `render()`, no flush   | throws `Cannot read properties of undefined` inside `For` |
| Write before `render()` + `flush()` | works                                                     |

That is exactly the toast-before-Toaster path, so it matters here. Worth an
upstream report.

**`StoreSetter` takes only a function** (`(draft) => void | T`). Passing an
array throws `t is not a function`. Mutate the draft, or return a new array for
removals (`s => s.filter(...)`).

**Solid's store is read-only**, unlike Svelte's `$state`. So where svelte-sonner
writes `this.toasts.unshift(data)`, sketch B writes
`this.#setToasts(list => { list.unshift(data) })` and exposes the array through
a getter. That is the whole translation.

## Solid 1 delta

Sketch B works on Solid 1 too. `createStore` moves to `solid-js/store`, the
setter takes paths rather than a draft (or wrap mutations in `produce`), and the
`flush()` calls come out since Solid 1 writes are synchronous.

## Not covered

- The `Toaster` / `Toast` components. Heights, offsets, swipe, timers.
- `toast.promise`, unchanged in shape. Its four duplicated result-resolution
  blocks should be factored while porting.
- `getHistory()`. Either a separate bounded array or drop it.
- Whether `heights` moves onto the singleton, as svelte-sonner does.
  solid-sonner currently keeps them per-Toaster, which is safer for multiple
  toasters. Decide before porting.

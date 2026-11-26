---
'solid-sonner': patch
---

Gate the toaster's derived lists on equality. `filteredToasts`, `possiblePositions`, `toastsByPosition` and `heightsByPosition` rebuilt their arrays on every toast-store publish and committed a referentially new but identical list, so each publish re-ran the `<For>` over the positions, the per-position lists and the offset arithmetic below them even when nothing they show had changed. The members are store proxies, height records and position strings, which keep their identity while unchanged, so the memos now compare element by element.

import { For, createSignal } from 'solid-js';
import { toast } from 'src/';

const LOADING_ID = 'loading-fixed-id';
const REUSED_ID = 'reused-id';

// Long enough to outlive TIME_BEFORE_UNMOUNT (200ms), so the toast is fully
// gone before the id gets reused.
const AFTER_UNMOUNT = 400;

function CustomSuccessIcon() {
  return (
    <span data-testid="custom-promise-icon" role="img" aria-label="done">
      ✅
    </span>
  );
}

export function Regressions(props: { remountToaster: (fire: () => void) => void }) {
  const [historySize, setHistorySize] = createSignal<number | null>(null);

  const cases = [
    {
      name: 'Promise with custom icon',
      testId: 'promise-custom-icon',
      // sonner#718: the icon must not be drawn twice once the promise settles.
      action: () =>
        toast.promise(() => new Promise((resolve) => setTimeout(resolve, 100)), {
          loading: 'Loading...',
          success: 'Settled',
          icon: <CustomSuccessIcon />,
        }),
    },
    {
      name: 'Toast before Toaster mounts',
      testId: 'premount-toast',
      // sonner#723: created while nothing is subscribed, replayed on subscribe.
      action: () => props.remountToaster(() => toast('Fired while unmounted')),
    },
    {
      name: 'Loading toast (fixed id)',
      testId: 'loading-fixed-id',
      action: () => toast.loading('Loading...', { id: LOADING_ID }),
    },
    {
      name: 'toast() over loading',
      testId: 'default-over-loading',
      // sonner#401: reusing a loading toast's id must clear the loading state.
      action: () => toast('Plain now', { id: LOADING_ID }),
    },
    {
      name: 'toast.custom() over loading',
      testId: 'custom-over-loading',
      // sonner#652: same, through custom().
      action: () => toast.custom(() => <div>Custom now</div>, { id: LOADING_ID }),
    },
    {
      name: 'Reused id with action',
      testId: 'reused-id-with-action',
      // Typed, so it goes through create() rather than the plain toast() path.
      action: () =>
        toast.success('Has an action', {
          id: REUSED_ID,
          action: { label: 'Undo', onClick: () => {} },
        }),
    },
    {
      name: 'Reuse id after dismiss',
      testId: 'reused-id-without-action',
      // sonner#692: the recreated toast must not inherit the old `action`.
      action: () => {
        toast.dismiss(REUSED_ID);
        setTimeout(() => {
          toast.success('No action', { id: REUSED_ID });
        }, AFTER_UNMOUNT);
      },
    },
    {
      name: 'Dismiss and recreate',
      testId: 'dismiss-and-recreate',
      // sonner#592: the in-flight dismissal must not remove the new toast.
      action: () => {
        const id = toast('Recreated toast');
        toast.dismiss(id);
        toast('Recreated toast', { id });
      },
    },
    {
      name: 'Short content',
      testId: 'short-content',
      // sonner#683: content fills the toast rather than hugging its text.
      action: () => toast('Hi'),
    },
    {
      name: 'Custom with id 0',
      testId: 'custom-zero-id',
      // A falsy-but-valid id used to be replaced by the counter.
      action: () => toast.custom(() => <div>Zero id toast</div>, { id: 0 }),
    },
    {
      name: 'Replace id 0',
      testId: 'replace-zero-id',
      // Only updates the toast above if custom() actually kept the id 0,
      // otherwise this is a second, unrelated toast.
      action: () => toast('Replaced id 0', { id: 0 }),
    },
    {
      name: 'Flood history',
      testId: 'history-flood',
      // sonner#729: dismissed toasts must not pile up forever.
      action: () => {
        for (let i = 0; i < 150; i++) {
          toast.dismiss(toast(`Flood ${i}`));
        }
        setHistorySize(toast.getHistory().length);
      },
    },
  ];

  return (
    <div>
      <h2>Regressions</h2>
      <p>Buttons backing the regression tests for fixes ported from upstream sonner.</p>
      <div class="buttons">
        <For each={cases}>
          {(testCase) => (
            <button class="button" data-testid={testCase.testId} onClick={testCase.action}>
              {testCase.name}
            </button>
          )}
        </For>
      </div>
      <p data-testid="history-size">{historySize() ?? ''}</p>
    </div>
  );
}

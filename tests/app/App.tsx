// Port of https://github.com/emilkowalski/sonner/blob/main/test/src/app/page.tsx
import { Show, createSignal, onSettled } from 'solid-js';
import { Toaster, type ToasterProps, toast } from 'solid-sonner';

const promise = () => new Promise((resolve) => setTimeout(resolve, 2000));

// Rendered above the <Toaster />, so it settles before the Toaster subscribes.
function ToastDuringRender() {
  toast('Toast created during render');

  return null;
}

function ToastOnMount() {
  onSettled(() => {
    toast('Toast rendered on mount', { id: 'toast-on-mount' });
  });

  return null;
}

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const [showAutoClose, setShowAutoClose] = createSignal(false);
  const [showDismiss, setShowDismiss] = createSignal(false);
  const [theme, setTheme] = createSignal(
    (searchParams.get('theme') ?? 'light') as ToasterProps['theme'],
  );
  const [showAriaLabels, setShowAriaLabels] = createSignal(false);
  const [historySize, setHistorySize] = createSignal<number | null>(null);
  const [showToastDuringRender, setShowToastDuringRender] = createSignal(false);

  return (
    <>
      <Show when={searchParams.get('toastOnMount') === ''}>
        <ToastOnMount />
      </Show>
      <button data-testid="theme-button" onClick={() => setTheme('dark')}>
        Change theme
      </button>
      <button data-testid="default-button" onClick={() => toast('My Toast')}>
        Render Toast
      </button>
      <button data-testid="success" onClick={() => toast.success('My Success Toast')}>
        Render Success Toast
      </button>
      <button data-testid="error" onClick={() => toast.error('My Error Toast')}>
        Render Error Toast
      </button>
      <button
        data-testid="action"
        onClick={() =>
          toast('My Message', {
            action: {
              label: 'Action',
              onClick: () => console.log('Action'),
            },
          })
        }
      >
        Render Action Toast
      </button>
      <button
        data-testid="action-prevent"
        onClick={() =>
          toast('My Message', {
            action: {
              label: 'Action',
              onClick: (event) => {
                event.preventDefault();
                console.log('Action');
              },
            },
          })
        }
      >
        Render Action Toast
      </button>
      <button
        data-testid="promise"
        onClick={() =>
          toast.promise(promise, {
            loading: 'Loading...',
            success: 'Loaded',
            error: 'Error',
          })
        }
      >
        Render Promise Toast
      </button>
      <button
        data-testid="custom"
        onClick={() =>
          toast.custom((t) => (
            <div>
              <h1>jsx</h1>
              <button data-testid="dismiss-button" onClick={() => toast.dismiss(t)}>
                Dismiss
              </button>
            </div>
          ))
        }
      >
        Render Custom Toast
      </button>
      <button
        data-testid="custom-cancel-button-toast"
        onClick={() =>
          toast('My Custom Cancel Button', {
            cancel: {
              label: 'Cancel',
              onClick: () => console.log('Cancel'),
            },
          })
        }
      >
        Render Custom Cancel Button
      </button>
      <button
        data-testid="custom-with-empty-id"
        onClick={() =>
          toast.custom(
            (t) => (
              <div>
                <h1>jsx</h1>
                <button data-testid="dismiss-button" onClick={() => toast.dismiss(t)}>
                  Dismiss
                </button>
              </div>
            ),
            {
              id: undefined,
            },
          )
        }
      >
        Render Custom Toast with empty id
      </button>
      <button
        data-testid="infinity-toast"
        onClick={() => toast('My Toast', { duration: Number.POSITIVE_INFINITY })}
      >
        Render Infinity Toast
      </button>
      <button
        data-testid="auto-close-toast-callback"
        onClick={() =>
          toast('My Toast', {
            onAutoClose: () => setShowAutoClose(true),
          })
        }
      >
        Render Toast With onAutoClose callback
      </button>
      <button
        data-testid="dismiss-toast-callback"
        onClick={() =>
          toast('My Toast', {
            onDismiss: () => {
              setShowDismiss(true);
            },
          })
        }
      >
        Dismiss toast callback
      </button>
      <button
        data-testid="non-dismissible-toast"
        onClick={() =>
          toast('My Toast', {
            dismissible: false,
          })
        }
      >
        Non-dismissible Toast
      </button>
      <button
        data-testid="update-toast"
        onClick={() => {
          const toastId = toast('My Unupdated Toast', {
            duration: 10000,
          });
          toast('My Updated Toast', {
            id: toastId,
            duration: 10000,
          });
        }}
      >
        Updated Toast
      </button>
      <button
        data-testid="update-toast-duration"
        onClick={() => {
          const toastId = toast('My Unupdated Toast, Updated After 3 Seconds', {
            duration: 10000,
          });
          setTimeout(() => {
            toast('My Updated Toast, Close After 1 Second', {
              id: toastId,
              duration: 1000,
            });
          }, 3000);
        }}
      >
        Updated Toast Duration
      </button>
      <button
        data-testid="string-description"
        onClick={() => toast('Custom Description', { description: 'string description' })}
      >
        String Description
      </button>
      <button
        data-testid="close-button"
        onClick={() => toast('Toast with close button', { closeButton: true })}
      >
        Render close button
      </button>
      <button
        data-testid="extended-promise"
        onClick={() =>
          toast.promise(
            new Promise<{ name: string }>((resolve) => {
              setTimeout(() => {
                resolve({ name: 'Sonner' });
              }, 2000);
            }),
            {
              loading: 'Loading...',
              success: (data) => ({
                message: `${data.name} toast has been added`,
                description: 'Custom description for the Success state',
              }),
              error: {
                message: 'An error occurred',
                description: undefined,
                action: {
                  label: 'Retry',
                  onClick: () => {
                    console.log('retrying');
                  },
                },
              },
              description: 'Global description',
            },
          )
        }
      >
        Extended Promise Toast
      </button>
      <button
        data-testid="extended-promise-error"
        onClick={() =>
          toast.promise(
            new Promise<{ name: string }>((_, reject) => {
              setTimeout(() => {
                reject(new Error('Simulated error'));
              }, 2000);
            }),
            {
              loading: 'Loading...',
              success: (data) => ({
                message: `${data.name} toast has been added`,
                description: 'Custom description for the Success state',
              }),
              error: {
                message: 'An error occurred',
                description: undefined,
                action: {
                  label: 'Retry',
                  onClick: (event) => {
                    event.preventDefault();
                    console.log('retrying');
                  },
                },
              },
              description: 'Global description',
            },
          )
        }
      >
        Extended Promise Error Toast
      </button>
      <button
        data-testid="error-promise"
        onClick={() => {
          const whatWillHappen = async (): Promise<{ ok?: boolean; error?: string }> => {
            throw new Error('Not implemented');
          };

          toast.promise(whatWillHappen, {
            loading: 'Saving project...',
            success: (result) => {
              if (result?.ok) {
                return 'Project saved';
              } else {
                return `${result?.error}`;
              }
            },
            error: (e) => `Error Raise: ${e}`,
          });
        }}
      >
        Error Promise Toast
      </button>
      <button
        onClick={() => {
          setShowAriaLabels(true);
          toast('Toast with custom ARIA labels', {
            closeButton: true,
            onAutoClose: () => setShowAriaLabels(false),
          });
        }}
      >
        With custom ARIA labels
      </button>
      <button
        data-testid="toast-secondary"
        onClick={() => toast('Secondary Toaster Toast', { toasterId: 'secondary' })}
      >
        Render Toast in Secondary Toaster
      </button>
      <button data-testid="toast-global" onClick={() => toast('Global Toaster Toast')}>
        Render Toast in Global Toaster
      </button>
      <button
        data-testid="testid-toast-button"
        onClick={() => toast('Toast with test ID', { testId: 'my-test-toast' })}
      >
        Toast with testId
      </button>
      <button
        data-testid="testid-promise-toast-button"
        onClick={() =>
          toast.promise(promise, {
            loading: 'Loading...',
            success: 'Loaded',
            error: 'Error',
            testId: 'promise-test-toast',
          })
        }
      >
        Promise Toast with testId
      </button>
      <button
        data-testid="promise-custom-icon"
        onClick={() =>
          toast.promise(promise, {
            loading: 'Loading...',
            success: () => ({
              message: 'Loaded',
              icon: <span data-testid="custom-success-icon">✓</span>,
            }),
            error: 'Error',
          })
        }
      >
        Promise Toast with custom success icon
      </button>
      <button
        data-testid="reused-id-with-action"
        onClick={() =>
          toast.error('Toast with action', {
            id: 'reused-id',
            duration: 1000,
            action: {
              label: 'Action',
              onClick: () => console.log('Action'),
            },
          })
        }
      >
        Toast with action and a fixed id
      </button>
      <button
        data-testid="reused-id-without-action"
        onClick={() => toast.success('Toast without action', { id: 'reused-id', duration: 10000 })}
      >
        Toast without action and the same fixed id
      </button>
      <button
        data-testid="history-flood"
        onClick={() => {
          for (let i = 0; i < 120; i++) {
            toast.dismiss(toast(`Flood ${i}`, { duration: 1 }));
          }
          setHistorySize(toast.getHistory().length);
        }}
      >
        Create and dismiss a lot of toasts
      </button>
      <Show when={historySize() !== null}>
        <div data-testid="history-size">{historySize()}</div>
      </Show>
      <button
        data-testid="loading-toast-fixed-id"
        onClick={() => toast.loading('Loading', { id: 'fixed-id' })}
      >
        Loading toast with a fixed id
      </button>
      <button
        data-testid="default-toast-fixed-id"
        onClick={() => toast('Done', { id: 'fixed-id', duration: 10000 })}
      >
        Default toast with the same fixed id
      </button>
      <button
        data-testid="custom-toast-fixed-id"
        onClick={() =>
          toast.custom(() => <div>Custom done</div>, { id: 'fixed-id', duration: 10000 })
        }
      >
        Custom toast with the same fixed id
      </button>
      <button
        data-testid="dismiss-and-recreate"
        onClick={() => {
          toast.warning('Remounted toast', { id: 'remounted', duration: 10000 });
          toast.dismiss('remounted');
          toast.warning('Remounted toast', { id: 'remounted', duration: 10000 });
        }}
      >
        Dismiss and recreate a toast synchronously
      </button>
      <button
        data-testid="react-node-description-wide"
        onClick={() =>
          toast('Title', {
            duration: 10000,
            description: (
              <div data-testid="wide-description" style={{ width: '100%', height: '8px' }} />
            ),
          })
        }
      >
        ReactNode description that fills the width
      </button>
      {/* The rest are solid-sonner's own, for regressions sonner's suite does not cover. */}
      <button
        data-testid="stacked-toasts"
        onClick={() => {
          toast('First stacked toast', { duration: 10000 });
          toast('Second stacked toast', {
            duration: 10000,
            description: 'A description makes this one taller',
          });
          toast('Third stacked toast', { duration: 10000 });
        }}
      >
        Render three toasts at once
      </button>
      <button data-testid="toast-during-render" onClick={() => setShowToastDuringRender(true)}>
        Render a component that creates a toast
      </button>
      <Show when={showToastDuringRender()}>
        <ToastDuringRender />
      </Show>
      <Show when={showAutoClose()}>
        <div data-testid="auto-close-el" />
      </Show>
      <Show when={showDismiss()}>
        <div data-testid="dismiss-el" />
      </Show>
      <Toaster
        offset={32}
        position={(searchParams.get('position') ?? 'bottom-right') as ToasterProps['position']}
        swipeDirections={
          searchParams.get('swipeDirections')?.split(',') as ToasterProps['swipeDirections']
        }
        toastOptions={{
          actionButtonStyle: { 'background-color': 'rgb(219, 239, 255)' },
          cancelButtonStyle: { 'background-color': 'rgb(254, 226, 226)' },
          closeButtonAriaLabel: showAriaLabels() ? 'Yeet the notice' : undefined,
          classNames: {
            default: 'default-toast-classname',
            success: 'success-toast-classname',
          },
        }}
        theme={theme()}
        dir={(searchParams.get('dir') ?? 'auto') as ToasterProps['dir']}
        containerAriaLabel={showAriaLabels() ? 'Notices' : undefined}
      />
      <Toaster id="secondary" position="top-left" />
    </>
  );
}

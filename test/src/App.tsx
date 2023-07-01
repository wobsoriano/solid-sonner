import { Show, createSignal } from 'solid-js'
import { Toaster, toast } from 'solid-sonner'

const promise = () => new Promise(resolve => setTimeout(resolve, 2000))

export default function App() {
  const [showAutoClose, setShowAutoClose] = createSignal(false)
  const [showDismiss, setShowDismiss] = createSignal(false)

  return (
    <>
      <button data-testid="default-button" class="button" onClick={() => toast('My Toast')}>
        Render Toast
      </button>
      <button data-testid="success" class="button" onClick={() => toast.success('My Success Toast')}>
        Render Success Toast
      </button>
      <button data-testid="error" class="button" onClick={() => toast.error('My Error Toast')}>
        Render Error Toast
      </button>
      <button
        data-testid="action"
        class="button"
        onClick={() =>
          toast('My Message', {
            action: {
              label: 'Action',
              // eslint-disable-next-line no-console
              onClick: () => console.log('Action'),
            },
          })
        }
      >
        Render Action Toast
      </button>
      <button
        data-testid="action-prevent"
        class="button"
        onClick={() =>
          toast('My Message', {
            action: {
              label: 'Action',
              onClick: (event) => {
                event.preventDefault()
                // eslint-disable-next-line no-console
                console.log('Action')
              },
            },
          })
        }
      >
        Render Action Toast
      </button>
      <button
        data-testid="promise"
        class="button"
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
        class="button"
        onClick={() =>
          toast.custom(t => (
            <div>
              <h1>jsx</h1>
              <button onClick={() => toast.dismiss(t)}>Dismiss</button>
            </div>
          ))
        }
      >
        Render Custom Toast
      </button>
      <button data-testid="infinity-toast" class="button" onClick={() => toast('My Toast', { duration: Number.POSITIVE_INFINITY })}>
        Render Infinity Toast
      </button>
      <button
        data-testid="auto-close-toast-callback"
        class="button"
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
        class="button"
        onClick={() =>
          toast('My Toast', {
            onDismiss: () => setShowDismiss(true),
          })
        }
      >
        Render Toast With onAutoClose callback
      </button>
      <Show when={showAutoClose()}>
        <div data-testid="auto-close-el" />
      </Show>
      <Show when={showDismiss()}>
        <div data-testid="dismiss-el" />
      </Show>
      <Toaster richColors />
    </>
  )
}

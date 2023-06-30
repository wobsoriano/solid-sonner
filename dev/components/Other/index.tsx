import type { Setter } from 'solid-js'
import { For, createMemo, createSignal } from 'solid-js'
import { toast } from 'solid-sonner'
import { CodeBlock } from '../CodeBlock'
import styles from './other.module.css'

export function Other(props: {
  setRichColors: Setter<boolean>
  setCloseButton: Setter<boolean>
}) {
  const allTypes = [
    {
      name: 'Rich Colors Success',
      snippet: 'toast.success(\'Event has been created\')',
      action: () => {
        toast.success('Event has been created')
        props.setRichColors(true)
      },
    },
    {
      name: 'Rich Colors Error',
      snippet: 'toast.error(\'Event has not been created\')',
      action: () => {
        toast.error('Event has not been created')
        props.setRichColors(true)
      },
    },
    {
      name: 'Close Button',
      snippet: `toast('Event has been created', {
  description: 'Monday, January 3rd at 6:00pm',
})`,
      action: () => {
        toast('Event has been created', {
          description: 'Monday, January 3rd at 6:00pm',
        })
        props.setCloseButton(t => !t)
      },
    },
    {
      name: 'Headless',
      snippet: `toast.custom((t) => (
  <div>
    <h1>Custom toast</h1>
     <button onClick={() => toast.dismiss(t)}>Dismiss</button>
  </div>
));`,
      action: () => {
        toast.custom(
          t => (
              <div class={styles.headless}>
                <p class={styles.headlessTitle}>Event Created</p>
                <p class={styles.headlessDescription}>Today at 4:00pm - "Louvre Museum"</p>
                <button class={styles.headlessClose} onClick={() => toast.dismiss(t)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.96967 2.96967C3.26256 2.67678 3.73744 2.67678 4.03033 2.96967L8 6.939L11.9697 2.96967C12.2626 2.67678 12.7374 2.67678 13.0303 2.96967C13.3232 3.26256 13.3232 3.73744 13.0303 4.03033L9.061 8L13.0303 11.9697C13.2966 12.2359 13.3208 12.6526 13.1029 12.9462L13.0303 13.0303C12.7374 13.3232 12.2626 13.3232 11.9697 13.0303L8 9.061L4.03033 13.0303C3.73744 13.3232 3.26256 13.3232 2.96967 13.0303C2.67678 12.7374 2.67678 12.2626 2.96967 11.9697L6.939 8L2.96967 4.03033C2.7034 3.76406 2.6792 3.3474 2.89705 3.05379L2.96967 2.96967Z" />
                  </svg>
                </button>
              </div>
          ),
          { duration: 999999 },
        )
        props.setCloseButton(t => !t)
      },
    },
  ]

  const [activeType, setActiveType] = createSignal(allTypes[0])

  const richColorsActive = createMemo(() => activeType()?.name?.includes('Rich'))
  const closeButtonActive = createMemo(() => activeType()?.name?.includes('Close'))

  return (
    <div>
      <h2>Other</h2>
      <div class="buttons">
        <For each={allTypes}>{type => (
          <button
            class="button"
            onClick={() => {
              type.action()
              setActiveType(type)
            }}

          >
            {type.name}
          </button>
        )}</For>
      </div>
      <CodeBlock>
        {`${activeType()?.snippet || ''}

// ...

<Toaster ${richColorsActive() ? 'richColors ' : ''} ${closeButtonActive() ? 'closeButton ' : ''}/>`}
      </CodeBlock>
    </div>
  )
}

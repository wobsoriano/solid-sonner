import { toast } from 'solid-sonner'
import type { Setter } from 'solid-js'
import { CodeBlock } from '../CodeBlock'

export function ExpandModes(props: {
  expand: boolean
  setExpand: Setter<boolean>
}) {
  return (
    <div>
      <h2>Expand</h2>
      <p>
        You can change the amount of toasts visible through the <code>visibleToasts</code> prop.
      </p>
      <div class="buttons">
        <button
          data-active={props.expand}
          class="button"
          onClick={() => {
            toast('Event has been created', {
              description: 'Monday, January 3rd at 6:00pm',
            })
            props.setExpand(true)
          }}
        >
          Expand
        </button>
        <button
          data-active={!props.expand}
          class="button"
          onClick={() => {
            toast('Event has been created', {
              description: 'Monday, January 3rd at 6:00pm',
            })
            props.setExpand(false)
          }}
        >
          Default
        </button>
      </div>
      <CodeBlock>{`<Toaster expand={${props.expand}} />`}</CodeBlock>
    </div>
  )
}

import type { Component, Setter } from 'solid-js'
import { For } from 'solid-js'
import { toast } from 'solid-sonner'

const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const

// export type Position = (typeof positions)[number]

export const Position: Component<{
  position: (typeof positions)[number]
  setPosition: Setter<(typeof positions)[number]>
}> = (props) => {
  return (
    <div>
      <h2>Position</h2>
      <p>Swipe direction changes depending on the position.</p>
      <div class="buttons">
        <For each={positions}>{position => (
          <button
            data-active={props.position === position}
            class="button"
            onClick={() => {
              const toastsAmount = document.querySelectorAll('[data-sonner-toast]').length
              props.setPosition(position)
              // No need to show a toast when there is already one
              if (toastsAmount > 0 && position !== props.position)
                return

              toast('Event has been created', {
                description: 'Monday, January 3rd at 6:00pm',
              })
            }}

          >
            {position}
          </button>
        )}</For>
      </div>
    </div>
  )
}

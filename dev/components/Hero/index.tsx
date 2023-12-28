import { toast } from 'src/'

import styles from './hero.module.css'

export function Hero() {
  return (
    <div class={styles.wrapper}>
      <div class={styles.toastWrapper}>
        <div class={styles.toast} />
        <div class={styles.toast} />
        <div class={styles.toast} />
      </div>
      <h1 class={styles.heading}>Solid Sonner</h1>
      <p style={{ 'margin-top': 0, 'font-size': '18px' }}>An opinionated toast component for Solid.</p>
      <div class={styles.buttons}>
        <button
          data-testid="default-button"
          data-primary=""
          onClick={() => {
            toast('Sonner', {
              description: 'An opinionated toast component for Solid.',
            })
          }}
          class={styles.button}
        >
          Render a toast
        </button>
        <a class={styles.button} href="https://github.com/wobsoriano/solid-sonner" target="_blank">
          GitHub
        </a>
      </div>
    </div>
  )
}

import styles from './footer.module.css'

export function Footer() {
  return (
    <footer class={styles.wrapper}>
      <div class="container">
        <p class={styles.p}>
          <img src="" alt="" />
          <span>
            Made by{' '}
            <a href="https://twitter.com/wobsoriano" target="_blank">
              wobsoriano.
            </a>
          </span>
        </p>
      </div>
    </footer>
  )
}

import { createSignal, onCleanup, onMount } from 'solid-js'

export function useIsDocumentHidden() {
  const [isDocumentHidden, setIsDocumentHidden] = createSignal(typeof document !== 'undefined' ? document.hidden : false)

  onMount(() => {
    const callback = () => {
      setIsDocumentHidden(document.hidden)
    }
    document.addEventListener('visibilitychange', callback)

    onCleanup(() => {
      document.removeEventListener('visibilitychange', callback)
    })
  })

  return isDocumentHidden
}

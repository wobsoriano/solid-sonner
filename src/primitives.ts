import { createSignal, onCleanup, onMount } from 'solid-js'

export function useIsDocumentHidden() {
  const [isDocumentHidden, setIsDocumentHidden] = createSignal(false)

  onMount(() => {
    const callback = () => {
      setIsDocumentHidden(document.hidden)
    }
    document.addEventListener('visibilitychange', callback)

    onCleanup(() => {
      window.removeEventListener('visibilitychange', callback)
    })
  })

  return isDocumentHidden
}

import { createSignal, onSettled } from 'solid-js';

export function useIsDocumentHidden() {
  const [isDocumentHidden, setIsDocumentHidden] = createSignal(
    typeof document !== 'undefined' ? document.hidden : false,
  );

  onSettled(() => {
    const callback = () => {
      setIsDocumentHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', callback);

    return () => {
      document.removeEventListener('visibilitychange', callback);
    };
  });

  return isDocumentHidden;
}

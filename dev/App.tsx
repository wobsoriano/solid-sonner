import { Show, createSignal } from 'solid-js';
import { Toaster } from 'src/';

import { Hero } from './components/Hero';
import { Types } from './components/Types';
import { ExpandModes } from './components/ExpandModes';
import { Footer } from './components/Footer';
import { Position } from './components/Position';
import { Installation } from './components/Installation';
import { Usage } from './components/Usage';
import { Other } from './components/Other';
import { Regressions } from './components/Regressions';

// The regression harness exists only to drive the Playwright suite, and this
// app is what gets deployed as the docs site, so it stays hidden unless it is
// explicitly asked for with `?regressions`. Note it cannot key off
// `import.meta.env.DEV`: the plugin in vite.config.ts rewrites that to `true`
// in production builds too.
function regressionsRequested() {
  if (typeof window === 'undefined') return false;

  return new URLSearchParams(window.location.search).has('regressions');
}

export default function Home() {
  const [expand, setExpand] = createSignal(false);
  const [position, setPosition] = createSignal<
    'bottom-right' | 'top-left' | 'top-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  >('bottom-right');
  const [richColors, setRichColors] = createSignal(false);
  const [closeButton, setCloseButton] = createSignal(false);
  const [toasterMounted, setToasterMounted] = createSignal(true);

  // Unmounts the Toaster, runs `fire` while nothing is subscribed, then mounts
  // it again. Backs the "toast created before the Toaster mounts" test.
  const remountToaster = (fire: () => void) => {
    setToasterMounted(false);
    fire();
    setToasterMounted(true);
  };

  return (
    <>
      <Show when={toasterMounted()}>
        <Toaster
          offset={32}
          richColors={richColors()}
          closeButton={closeButton()}
          expand={expand()}
          position={position()}
          toastOptions={{ classNames: { default: 'toast-default', success: 'toast-success' } }}
        />
      </Show>

      <main class="container">
        <Hero />
        <div class="content">
          <Installation />
          <Usage />
          <Types />
          <Position position={position()} setPosition={setPosition} />
          <ExpandModes expand={expand()} setExpand={setExpand} />
          <Other setCloseButton={setCloseButton} setRichColors={setRichColors} />
          <Show when={regressionsRequested()}>
            <Regressions remountToaster={remountToaster} />
          </Show>
        </div>
      </main>
      <Footer />
    </>
  );
}

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
          <Regressions remountToaster={remountToaster} />
        </div>
      </main>
      <Footer />
    </>
  );
}

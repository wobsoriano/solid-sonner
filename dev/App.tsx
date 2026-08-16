import { Show, createSignal, onMount } from 'solid-js';
import { Toaster, toast } from 'src/';

import { Hero } from './components/Hero';
import { Types } from './components/Types';
import { ExpandModes } from './components/ExpandModes';
import { Footer } from './components/Footer';
import { Position } from './components/Position';
import { Installation } from './components/Installation';
import { Usage } from './components/Usage';
import { Other } from './components/Other';

export default function Home() {
  const [expand, setExpand] = createSignal(false);
  const [position, setPosition] = createSignal<
    'bottom-right' | 'top-left' | 'top-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  >('bottom-right');
  const [richColors, setRichColors] = createSignal(false);
  const [closeButton, setCloseButton] = createSignal(false);
  const [toasterMounted, setToasterMounted] = createSignal(true);

  // Unmounts the Toaster, runs `fire` while nothing is subscribed, then mounts
  // it again, so the Playwright suite can check that toasts created before the
  // Toaster subscribes are replayed.
  const remountToaster = (fire: () => void) => {
    setToasterMounted(false);
    fire();
    setToasterMounted(true);
  };

  // The Playwright suite drives the library through this rather than through
  // buttons, which keeps test-only sections off the deployed docs site. It
  // renders nothing.
  onMount(() => {
    Object.assign(window, { __sonnerTest: { toast, remountToaster } });
  });

  return (
    <>
      <Show when={toasterMounted()}>
        <Toaster
          offset={32}
          richColors={richColors()}
          closeButton={closeButton()}
          expand={expand()}
          position={position()}
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
        </div>
      </main>
      <Footer />
    </>
  );
}

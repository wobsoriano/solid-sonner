import { render } from '@solidjs/web';
import { attribution } from 'solid-js/attribution';

import App from './App';

// Solid's development build reports the mistakes it can see on its own, but the
// ones about wasted reactive work — a memo whose equality gate never closes
// among them — come from the attribution engine, which the dev build leaves
// uninstalled. The page installs it so `tests/support/fixtures.ts` sees those
// too. Everything a clock decides stays off: the suite drives hundreds of
// toasts in a loop and waits on real timers, so those findings would report the
// fixture rather than the library.
attribution.enable({
  hotRuns: false,
  hotTime: false,
  wastedRecompute: false,
  wideDeps: false,
  fanOut: false,
  holds: false,
  longHolds: false,
  waterfalls: false,
  stackedHolds: false,
  abandonedFlights: false,
});

render(() => <App />, document.getElementById('root')!);

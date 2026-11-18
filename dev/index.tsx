import { render } from '@solidjs/web';
import { OBSERVE } from 'solid-js';
import './styles.css';

import App from './App';

const solidDiagnostics: string[] = [];
OBSERVE?.diagnostics.subscribe((event) => {
  if (event.severity !== 'info') solidDiagnostics.push(`${event.code}: ${event.message}`);
});
Object.assign(window, { __solidDiagnostics: solidDiagnostics });

render(() => <App />, document.getElementById('root')!);

import { useSyncExternalStore } from 'react';
import Admin from './Admin';
import Viewer from './Viewer';

// The admin only exists on your own machine; GitHub Pages always gets the viewer.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export default function App() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  // On localhost, open #/viewer to preview the public page.
  return isLocal && hash !== '#/viewer' ? <Admin /> : <Viewer />;
}

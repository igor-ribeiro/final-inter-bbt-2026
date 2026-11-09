import Admin from './Admin';
import Viewer from './Viewer';

// Append ?viewer on localhost to preview the public view.
const isAdmin = location.hostname === 'localhost' && !location.search.includes('viewer');

export default function App() {
  return isAdmin ? <Admin /> : <Viewer />;
}

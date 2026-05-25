import { createRoot } from 'react-dom/client';
import App from './App';
import { initPreviewMode } from './lib/preview-mode';
import './styles.css';

// Must run before the first render so Strapi fetches see the preview flag.
initPreviewMode();

createRoot(document.getElementById('root')!).render(<App />);

import { createRoot } from 'react-dom/client';
import App from './App';
import { initPreviewMode } from './lib/preview-mode';
import './styles.css';

// Must run before the first render so Strapi fetches see the preview flag.
initPreviewMode();

const MEDIA_TAGS = new Set(['IMG', 'PICTURE', 'VIDEO', 'SOURCE', 'SVG']);
const isMedia = (target: EventTarget | null) =>
  target instanceof Element && MEDIA_TAGS.has(target.tagName.toUpperCase());

window.addEventListener('contextmenu', (event) => {
  if (isMedia(event.target)) event.preventDefault();
});
window.addEventListener('dragstart', (event) => {
  if (isMedia(event.target)) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(<App />);

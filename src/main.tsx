import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const preconnect = document.createElement('link');
preconnect.rel = 'preconnect';
preconnect.href = 'https://cms.e-do.studio';
document.head.appendChild(preconnect);

createRoot(document.getElementById('root')!).render(<App />);

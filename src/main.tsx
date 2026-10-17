import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './assets/styles/theme.css';
import './assets/styles/animations.css';
import './app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

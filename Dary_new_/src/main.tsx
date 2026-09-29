import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { setupAntiDoubleSubmit } from './utils/antiDoubleSubmit';

// Activate site-wide protection against rapid double-clicks and duplicate submissions
setupAntiDoubleSubmit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

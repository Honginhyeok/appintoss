import './polyfill';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import VConsole from 'vconsole'
import './index.css'
import App from './App.tsx'

try {
  new VConsole();
} catch (e) { }

console.log('Force deploy version 0.0.46');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

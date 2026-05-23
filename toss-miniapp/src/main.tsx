import './polyfill';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import VConsole from 'vconsole'
import './index.css'
import App from './App.tsx'

try {
  new VConsole();
} catch (e) { }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

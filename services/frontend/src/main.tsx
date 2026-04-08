import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warmAtlasRuntime } from './data/sqlite/connection'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

window.requestAnimationFrame(() => {
  window.setTimeout(() => {
    void warmAtlasRuntime()
  }, 0)
})

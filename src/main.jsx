import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PaintApp from './PaintApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PaintApp />
  </StrictMode>,
)

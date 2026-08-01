import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import GoogleMapsDock from './GoogleMapsDock'
import './styles.css'
import './google-maps.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <GoogleMapsDock />
  </StrictMode>,
)

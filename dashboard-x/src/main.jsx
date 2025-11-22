import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-resizable/css/styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

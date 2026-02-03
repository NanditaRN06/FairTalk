import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode removed to prevent double-invocation of useEffect/WebSocket in dev
  // which causes immediate connect->disconnect->cleanup cycles on the server.
  <App />
)

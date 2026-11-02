import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { assertEnv } from './utils/env'
import ErrorBoundary from './components/common/ErrorBoundary'

assertEnv();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Sello estático de index.html, solo para crawlers sin JS (ver comentario allá).
document.getElementById('static-badges')?.remove()

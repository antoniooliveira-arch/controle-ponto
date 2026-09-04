import { createRoot } from 'react-dom/client'
import App from './App'

const container = document.getElementById('root')
if (!container) {
  console.error('Root element not found')
  process.exit(1)
}

const app = createRoot(container)
app.render(<App />)
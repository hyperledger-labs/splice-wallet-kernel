import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorProvider } from './ErrorContext.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorProvider>
            <App />
        </ErrorProvider>
    </StrictMode>
)

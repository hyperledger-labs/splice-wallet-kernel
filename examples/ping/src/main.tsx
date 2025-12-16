import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorContext } from './ErrorContext.ts'

export function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [errorMsg, setErrorMsg] = useState('')

    return (
        <ErrorContext.Provider value={{ errorMsg, setErrorMsg }}>
            {children}
        </ErrorContext.Provider>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorProvider>
            <App />
        </ErrorProvider>
    </StrictMode>
)

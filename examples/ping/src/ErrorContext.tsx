import { createContext, useState } from 'react'

export interface ErrorContextType {
    errorMsg: string
    setErrorMsg: (msg: string) => void
}

export const ErrorContext = createContext<ErrorContextType>({
    errorMsg: '',
    setErrorMsg: () => {},
})

export function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [errorMsg, setErrorMsg] = useState('')

    return (
        <ErrorContext.Provider value={{ errorMsg, setErrorMsg }}>
            {children}
        </ErrorContext.Provider>
    )
}

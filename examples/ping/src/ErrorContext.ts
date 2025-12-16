import { createContext } from 'react'

export interface ErrorContextType {
    errorMsg: string
    setErrorMsg: (msg: string) => void
}

export const ErrorContext = createContext<ErrorContextType>({
    errorMsg: '',
    setErrorMsg: () => {},
})

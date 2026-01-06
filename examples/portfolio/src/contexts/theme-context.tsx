import { createContext, useContext } from 'react'

interface ThemeContextType {
    isDarkMode: boolean
    toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
    undefined
)

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a AppThemeProvider')
    }
    return context
}

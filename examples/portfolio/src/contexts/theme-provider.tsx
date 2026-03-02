import React, { useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { ThemeContext } from '../contexts/theme-context'
import { darkTheme, lightTheme } from '../lib/theme'

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme')
        return savedTheme ? savedTheme === 'dark' : true
    })

    const toggleTheme = () => {
        setIsDarkMode((prev) => {
            const newMode = !prev
            localStorage.setItem('theme', newMode ? 'dark' : 'light')
            return newMode
        })
    }

    const theme = isDarkMode ? darkTheme : lightTheme

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    )
}

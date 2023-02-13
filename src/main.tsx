import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import { LoginScreen } from './auth/LoginScreen'
import { createTheme, ThemeProvider } from '@mui/material'

const theme = createTheme()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <LoginScreen />
        </ThemeProvider>
    </React.StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeContext, useThemeState } from '@/hooks/useTheme'
import { ToastProvider } from '@/hooks/useToast'
import { ToastViewport } from '@/components/ToastViewport'
import './index.css'

function Root() {
  const themeValue = useThemeState()
  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ToastViewport />
      </ToastProvider>
    </ThemeContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)

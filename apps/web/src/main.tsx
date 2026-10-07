import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/app.css';
import { App } from './App';
import { AuthProvider } from './auth';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { applyPrefs, prefsStore } from './state/prefs';

applyPrefs(prefsStore.get());
prefsStore.subscribe(() => applyPrefs(prefsStore.get()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

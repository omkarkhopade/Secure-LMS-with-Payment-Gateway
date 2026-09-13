import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-400-italic.css';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SavedProvider } from './contexts/SavedContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './styles.css';
import './styles/responsive.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SavedProvider>
              <App />
            </SavedProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

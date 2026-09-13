import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timer = useRef();
  const toast = useCallback((value) => {
    clearTimeout(timer.current);
    setMessage(value);
    timer.current = setTimeout(() => setMessage(''), 5000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div className="toast">
            <CheckCircle2 size={19} />
            <span>{message}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setMessage('')}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

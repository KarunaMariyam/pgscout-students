import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const showToast = useCallback((text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

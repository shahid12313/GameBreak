import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((text, kind = 'ok') => {
    const id = ++idRef.current;
    setItems(list => [...list, { id, text, kind }]);
    setTimeout(() => setItems(list => list.filter(x => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 80, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(t => (
          <div key={t.id} style={{
            background: '#0f1c21', border: `1px solid ${t.kind === 'err' ? 'rgba(255,107,107,.5)' : 'rgba(47,245,165,.4)'}`,
            color: '#e7f2ef', padding: '9px 16px', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,.5)', fontSize: 13
          }}>{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() { return useContext(ToastContext); }

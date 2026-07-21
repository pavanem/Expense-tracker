import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'success' });

  const notify = useCallback((message, severity = 'success') => {
    setState({ open: true, message, severity });
  }, []);

  const notifyError = useCallback((error, fallback = 'Something went wrong') => {
    const message = error?.friendlyMessage || error?.message || fallback;
    setState({ open: true, message, severity: 'error' });
  }, []);

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setState((prev) => ({ ...prev, open: false }));
  };

  const value = useMemo(() => ({ notify, notifyError }), [notify, notifyError]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within a NotificationProvider');
  return ctx;
}

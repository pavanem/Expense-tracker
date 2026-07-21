import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import theme from './theme/theme';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './router/AppRouter';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <NotificationProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </NotificationProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
